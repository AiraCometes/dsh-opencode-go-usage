import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
//#region src/config.ts
/**
* Configuration loader for dsh-ocgo-usage
*
* Priority: env vars > config file ($DSH_HOME/ocgo-usage.json) > built-in defaults
*
* The cookie is NEVER logged. If the config file is missing or unparseable,
* we silently fall back to env vars + defaults — the browser readout shows a
* clean `noconfig` error if neither source provides a usable value.
*
* Env var names match the pi-ocgo-usage extension so one shell profile works
* for both agents.
*
* The browser config editor (`/api/ocgo-usage/config`) reads a MASKED view
* (never the full cookie) and writes back through {@link writeConfigFile}.
* @module dsh-ocgo-usage/config
*/
const ENV_COOKIE = "OPENCODE_GO_COOKIE";
const ENV_CACHE_TTL = "OPENCODE_GO_CACHE_TTL";
const ENV_TIMEOUT_MS = "OPENCODE_GO_TIMEOUT_MS";
const DEFAULT_BASE_URL = "https://opencode.ai";
const DEFAULT_TIMEOUT_MS = 1e4;
const MAX_CACHE_TTL = 3600;
/** Resolve the DSH home directory ($DSH_HOME or ~/.dsh). */
function dshHome() {
	const explicit = process.env.DSH_HOME;
	if (typeof explicit === "string" && explicit.length > 0) return explicit;
	return join(homedir(), ".dsh");
}
/** Resolved location of the plugin config file. */
function configFilePath() {
	return join(dshHome(), "ocgo-usage.json");
}
/**
* Load and merge config from file + env vars.
* Returns a fully resolved OcgoConfig; never throws.
*/
function loadConfig() {
	const fileConfig = readFileConfig();
	return {
		cookie: normalizeCookie(pickString(process.env[ENV_COOKIE], asString(fileConfig?.cookie))),
		workspaceID: pickString(process.env["OPENCODE_GO_WORKSPACE_ID"], asString(fileConfig?.workspaceID))?.trim() || void 0,
		baseUrl: pickString(process.env["OPENCODE_GO_BASE_URL"], asString(fileConfig?.baseUrl)) || "https://opencode.ai",
		cacheTTL: clamp(pickNumber(process.env[ENV_CACHE_TTL], asNumber(fileConfig?.cacheTTL), 300), 60, MAX_CACHE_TTL),
		timeoutMs: Math.max(0, pickNumber(process.env[ENV_TIMEOUT_MS], asNumber(fileConfig?.timeoutMs), DEFAULT_TIMEOUT_MS))
	};
}
/** Mask the last 4 characters of a secret for the browser (full value when ≤ 4 chars). */
function maskSecret(value) {
	if (value === void 0 || value.length === 0) return {
		set: false,
		tail: ""
	};
	return {
		set: true,
		tail: value.length <= 4 ? value : value.slice(-4)
	};
}
/** The browser-facing masked config view (never reveals the full cookie). */
function maskedConfigView() {
	const cfg = loadConfig();
	return {
		workspaceID: maskSecret(cfg.workspaceID),
		cookie: maskSecret(cfg.cookie)
	};
}
/** Invalid input has an explicit identity for the host API; no secret is included. */
var InvalidConsoleCookieError = class extends Error {
	constructor() {
		super("Use the OpenCode Console __Host-console_session cookie; the old auth cookie is insufficient");
		this.name = "InvalidConsoleCookieError";
	}
};
/**
* Write cookie / workspaceID into the config file (preserving any other
* fields), chmod 600, and return the updated masked view. Values are
* normalized like env input (bare cookie gets `__Host-console_session=` prefixed when pasted bare).
* Empty/absent fields are left untouched; pass `null` to clear a field.
*/
function writeConfigFile(partial) {
	const next = { ...readFileConfig() ?? {} };
	if (partial.workspaceID !== void 0) {
		const v = typeof partial.workspaceID === "string" ? partial.workspaceID.trim() : "";
		if (v.length > 0) next.workspaceID = v;
		else delete next.workspaceID;
	}
	if (partial.cookie !== void 0) {
		const raw = typeof partial.cookie === "string" ? partial.cookie.trim() : "";
		const v = normalizeCookie(raw);
		if (raw.length > 0 && v === void 0) throw new InvalidConsoleCookieError();
		if (v !== void 0) next.cookie = v;
		else delete next.cookie;
	}
	const path = configFilePath();
	try {
		writeFileSync(path, `${JSON.stringify(next, null, 2)}\n`, { mode: 384 });
	} catch {
		throw new Error("Could not write the usage configuration");
	}
	return {
		workspaceID: maskSecret(typeof next.workspaceID === "string" ? next.workspaceID : void 0),
		cookie: maskSecret(typeof next.cookie === "string" ? next.cookie : void 0)
	};
}
function readFileConfig() {
	const path = configFilePath();
	if (!existsSync(path)) return null;
	try {
		const raw = readFileSync(path, "utf8");
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === "object") return parsed;
		return null;
	} catch {
		return null;
	}
}
function pickString(envVal, fileVal) {
	if (envVal && envVal.length > 0) return envVal;
	if (fileVal && fileVal.length > 0) return fileVal;
}
/** Canonical Console cookie normalization shared by load, save and transport. */
function normalizeCookie(input) {
	if (!input || /[\r\n]/.test(input)) return void 0;
	const segments = input.trim().split(/[;,]/).map((s) => s.trim()).filter(Boolean);
	const pair = segments.find((s) => s.toLowerCase().startsWith("__host-console_session="));
	let value = pair?.slice(pair.indexOf("=") + 1).trim().replace(/^"|"$/g, "");
	if (pair === void 0) value = segments.find((s) => !s.includes("=") && s.length >= 8);
	if (!value || !/^[\x21\x23-\x2B\x2D-\x3A\x3C-\x5B\x5D-\x7E]+$/.test(value)) return void 0;
	const localePair = segments.find((s) => s.toLowerCase().startsWith("oc_locale="));
	const rawLocale = localePair?.slice(localePair.indexOf("=") + 1) ?? "";
	const locale = /^[A-Za-z]{2,3}$/.test(rawLocale) ? rawLocale.toLowerCase() : "en";
	return `__Host-console_session=${value}; oc_locale=${locale}`;
}
function pickNumber(envVal, fileVal, fallback) {
	const fromEnv = envVal ? Number.parseInt(envVal, 10) : NaN;
	if (Number.isFinite(fromEnv)) return fromEnv;
	if (fileVal !== void 0 && Number.isFinite(fileVal)) return fileVal;
	return fallback;
}
function asString(v) {
	return typeof v === "string" && v.length > 0 ? v : void 0;
}
function asNumber(v) {
	if (typeof v === "number" && Number.isFinite(v)) return v;
	if (typeof v === "string") {
		const n = Number.parseInt(v, 10);
		if (Number.isFinite(n)) return n;
	}
}
function clamp(n, min, max) {
	return Math.max(min, Math.min(max, n));
}
//#endregion
export { loadConfig as a, writeConfigFile as c, configFilePath as i, DEFAULT_TIMEOUT_MS as n, maskedConfigView as o, InvalidConsoleCookieError as r, normalizeCookie as s, DEFAULT_BASE_URL as t };
