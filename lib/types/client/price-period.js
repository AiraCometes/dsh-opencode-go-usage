import { isOpenCodeGo } from "../provider.js";
/** OpenCode Go schedule verified 2026-10-24; no price assumptions for other models. */
export function pricePeriod(selection, now) {
    if (!selection || !isOpenCodeGo(selection.provider) || !Number.isFinite(now.getTime()))
        return undefined;
    if (!['deepseek-v4.1-flash', 'deepseek-v4-pro'].includes(selection.model))
        return undefined;
    const weekday = now.getUTCDay();
    const hour = now.getUTCHours();
    const peak = weekday >= 1 && weekday <= 5 && ((hour >= 1 && hour < 4) || (hour >= 6 && hour < 10));
    return peak ? 'peak' : 'off-peak';
}
