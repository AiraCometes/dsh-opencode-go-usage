/**
 * OpenCode Console JSON transport and usage normalization.
 * Legacy SSR parsing exports remain available to existing consumers, but no
 * authenticated request is sent to the retired /workspace/<id>/go page.
 * @module dsh-ocgo-usage/api
 */
import { normalizeCookie } from "./config.js";
// ============================================================================
// Errors
// ============================================================================
/** Error thrown by the HTTP / parsing layer; carries a short code for the UI. */
export class UsageError extends Error {
    code;
    name = 'UsageError';
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
/** Fetch the Console JSON without following redirects carrying session credentials. */
async function fetchConsoleJSON(cfg) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
    try {
        const res = await fetch(`${cfg.baseUrl.replace(/\/+$/, '')}/console/api/go/status`, {
            method: 'GET',
            headers: { Cookie: cfg.cookie, 'x-org-id': cfg.workspaceID, Accept: 'application/json' },
            redirect: 'manual',
            signal: controller.signal,
        });
        if (!res.ok) {
            await res.body?.cancel().catch(() => { });
            if (cfg.workspaceID?.startsWith('wrk_') && [400, 401, 403].includes(res.status)) {
                throw new UsageError(`Console returned HTTP ${res.status} for a legacy wrk_ ID; verify the current org_ ID in the Console URL and the Console session cookie`, 'workspace');
            }
            throw new UsageError(`OpenCode Console returned HTTP ${res.status}`, `http${res.status}`);
        }
        const text = await res.text();
        try {
            return JSON.parse(text);
        }
        catch {
            throw new UsageError('OpenCode Console did not return valid usage JSON', 'parse');
        }
    }
    catch (error) {
        if (controller.signal.aborted)
            throw new UsageError('OpenCode Console request timed out', 'timeout');
        if (error instanceof UsageError)
            throw error;
        // Fetch errors can contain header values; never forward their raw messages.
        throw new UsageError('OpenCode Console request failed', 'fetch');
    }
    finally {
        clearTimeout(timer);
    }
}
function record(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        ? value : undefined;
}
function parseError() {
    throw new UsageError('OpenCode Console usage payload has invalid or missing meters', 'parse');
}
function microCents(value) {
    if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0)
        return BigInt(value);
    if (typeof value === 'string' && /^\d+$/.test(value))
        return BigInt(value);
    return parseError();
}
function resetSeconds(value, now) {
    if (value === undefined || value === null)
        return undefined;
    if (typeof value !== 'string')
        return parseError();
    const at = Date.parse(value);
    if (!Number.isFinite(at))
        return parseError();
    return Math.max(0, Math.ceil((at - now) / 1000));
}
/** Normalize Console access.meters; missing optional windows remain absent. */
export function fromConsoleJSON(payload, now = Date.now()) {
    const root = record(payload);
    if (root?.access === null) {
        throw new UsageError('No active OpenCode Go subscription was reported for this workspace', 'nosubscription');
    }
    const access = record(root?.access);
    const meters = record(access?.meters);
    if (!meters)
        return parseError();
    const result = {};
    for (const [key, kind] of [['fiveHour', 'rolling'], ['week', 'weekly'], ['month', 'monthly']]) {
        const value = meters[key];
        if (value === undefined || value === null)
            continue;
        const meter = record(value);
        if (!meter)
            return parseError();
        const used = microCents(meter.usedMicroCents);
        const limit = microCents(meter.limitMicroCents);
        if (limit === 0n)
            return parseError();
        const resetInSec = resetSeconds(meter.resetsAt, now);
        result[kind] = {
            kind,
            percent: Number(used >= limit ? 100n : used * 100n / limit),
            ...(resetInSec === undefined ? {} : { resetInSec }),
            status: used >= limit ? 'rate-limited' : 'ok',
        };
    }
    if (Object.keys(result).length === 0)
        return parseError();
    return result;
}
/** Read the current Console using its session cookie and organization header. */
export async function fetchViaCookie(cfg) {
    const cookie = normalizeCookie(cfg.cookie);
    const workspaceID = cfg.workspaceID?.trim();
    if (!cookie || !workspaceID) {
        throw new UsageError('Set the Console __Host-console_session cookie and workspace / organization ID', 'noconfig');
    }
    if (!/^(?:org|wrk)_[A-Za-z0-9_-]+$/.test(workspaceID)) {
        throw new UsageError('Workspace / organization ID must start with org_ or wrk_', 'workspace');
    }
    return fromConsoleJSON(await fetchConsoleJSON({ ...cfg, cookie, workspaceID }));
}
/**
 * @deprecated Legacy parser export retained for existing consumers only.
 * Parse the opencode console SSR HTML page and extract the three usage
 * windows. Reset times are emitted as English phrases inside
 * `data-slot="reset-time"` (e.g. "Resets in 2 hours 29 minutes"). We parse
 * them into a coarse `resetInSec` estimate; precise second-level resets are
 * not needed for display.
 */
export function fromSSRHTML(html) {
    // Each usage-item is a `<div data-slot="usage-item">...</div>` block, but
    // the markup inside may itself contain nested divs (usage-header,
    // progress bar, ...). Instead of trying to find the block's closing tag
    // with a regex, we slice between consecutive item start tags — that keeps
    // the whole block (including any nested divs) in one piece.
    const itemStartRe = /<div[^>]*data-slot="usage-item"/g;
    const starts = [];
    let startMatch = itemStartRe.exec(html);
    while (startMatch !== null) {
        starts.push(startMatch.index);
        startMatch = itemStartRe.exec(html);
    }
    const items = [];
    for (let i = 0; i < starts.length; i++) {
        const block = html.slice(starts[i], starts[i + 1] ?? html.length);
        const labelMatch = block.match(/data-slot="usage-label"[^>]*>([^<]+)</);
        const valueMatch = block.match(/data-slot="usage-value"[\s\S]*?<!--\$-->\s*(\d+)\s*<!--\/-->/);
        // The page renders the reset phrase in the UI locale — "Resets in"
        // (en) or "重置于" (zh) — so accept both.
        const resetMatch = block.match(/data-slot="reset-time"[\s\S]*?(?:Resets in|重置于)(?:<!--\/-->\s*)?([\s\S]*?)(?:<!--\/-->|<\/span>)/);
        if (!labelMatch || !valueMatch)
            continue;
        const label = labelMatch[1]?.trim() ?? '';
        const percent = Number.parseInt(valueMatch[1] ?? '0', 10);
        const resetsIn = resetMatch ? stripHtmlComments(resetMatch[1] ?? '').trim() : '';
        items.push({ label, percent, resetsIn });
    }
    const result = {};
    for (const item of items) {
        const kind = labelToKind(item.label);
        if (!kind)
            continue;
        result[kind] = {
            kind,
            percent: clampPercent(item.percent),
            resetInSec: parseDurationToSec(item.resetsIn),
            status: item.percent >= 100 ? 'rate-limited' : 'ok',
        };
    }
    return result;
}
function labelToKind(label) {
    const lower = label.toLowerCase();
    // English labels ("Rolling Usage", "Weekly Usage", "Monthly Usage").
    if (lower.startsWith('rolling'))
        return 'rolling';
    if (lower.startsWith('weekly'))
        return 'weekly';
    if (lower.startsWith('monthly'))
        return 'monthly';
    // Chinese labels rendered for zh locale ("滚动用量", "每周用量", "每月用量").
    if (lower.startsWith('滚动'))
        return 'rolling';
    if (lower.startsWith('每周'))
        return 'weekly';
    if (lower.startsWith('每月'))
        return 'monthly';
    return undefined;
}
/** Strip SolidStart HTML comments `<!-- ... -->` from a string. */
function stripHtmlComments(s) {
    return s.replace(/<!--[\s\S]*?-->/g, '').trim();
}
/**
 * Parse a human duration phrase into seconds. Examples (English plus the
 * Chinese renderings used by the zh locale):
 *   "2 hours 29 minutes" → 8940      "2 小时 29 分钟" → 8940
 *   "45 minutes"          → 2700     "45 分钟"         → 2700
 *   "5 days"              → 432000   "5 天"            → 432000
 *   "30 seconds"          → 30       "30 秒"           → 30
 *   "1 week"              → 604800   "1 周"            → 604800
 *   "1 month"             → 2592000  "1 个月"          → 2592000
 *   "1 year"              → 31536000 "1 年"            → 31536000
 *
 * Returns 0 on unrecognized input.
 */
export function parseDurationToSec(phrase) {
    if (!phrase)
        return 0;
    // Defensive: SolidStart may leave `<!--/-->` markers inside the captured
    // reset phrase; strip them before matching (see stripHtmlComments).
    const cleaned = phrase.replace(/<!--[\s\S]*?-->/g, ' ');
    const p = cleaned.trim().replace(/\s+/g, ' ').toLowerCase();
    if (!p)
        return 0;
    const re = /(\d+)\s*(?:个\s*)?(second|minute|hour|day|week|month|year|秒|分钟|小时|天|周|月|年)s?/g;
    let total = 0;
    let matched = false;
    let m = re.exec(p);
    while (m !== null) {
        const n = Number.parseInt(m[1] ?? '0', 10);
        const unit = m[2] ?? '';
        matched = true;
        switch (unit) {
            case 'second':
            case '秒':
                total += n;
                break;
            case 'minute':
            case '分钟':
                total += n * 60;
                break;
            case 'hour':
            case '小时':
                total += n * 3600;
                break;
            case 'day':
            case '天':
                total += n * 86400;
                break;
            case 'week':
            case '周':
                total += n * 604800;
                break;
            case 'month':
            case '月':
                total += n * 2592000; // 30 days; coarse but adequate for display
                break;
            case 'year':
            case '年':
                total += n * 31536000;
                break;
        }
        m = re.exec(p);
    }
    return matched ? total : 0;
}
// ============================================================================
// Orchestrator
// ============================================================================
/**
 * Fetch usage with the current Console session config and stamp
 * the fetch timestamp so the UI can show data freshness.
 */
export async function fetchUsage(cfg) {
    const data = await fetchViaCookie(cfg);
    return { ...data, updatedAt: Date.now() };
}
// ============================================================================
// Internal helpers
// ============================================================================
function clampPercent(n) {
    if (n === undefined)
        return 0;
    return Math.max(0, Math.min(100, Math.floor(n)));
}
