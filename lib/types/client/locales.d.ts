/**
 * dsh-ocgo-usage locale dictionaries (zh/en).
 * @module dsh-ocgo-usage/client/locales
 */
/** Dictionary namespace this package registers. */
export declare const NS = "ocgo";
/** Chinese copy. */
export declare const zh: {
    readonly 'ocgo.unavailable': "用量不可用";
    readonly 'ocgo.error': "查询失败：{code}";
    readonly 'ocgo.noconfig': "请设置 Console __Host-console_session cookie 与 org_ 工作区 ID（或 $DSH_HOME/ocgo-usage.json）";
    readonly 'ocgo.refresh': "刷新";
    readonly 'ocgo.fetchedAt': "upd {time}";
    readonly 'ocgo.rolling': "5h 滚动";
    readonly 'ocgo.weekly': "每周";
    readonly 'ocgo.monthly': "每月";
    readonly 'ocgo.rateLimited': "已限流";
    readonly 'ocgo.resetsIn': "剩余 {duration}";
    readonly 'ocgo.expand': "展开用量详情";
    readonly 'ocgo.collapse': "收起";
    readonly 'ocgo.sep': "·";
    readonly 'ocgo.set': "设置";
    readonly 'ocgo.save': "保存";
    readonly 'ocgo.saveFailed': "保存失败。请检查连接和设置后重试，或取消更改。";
    readonly 'ocgo.saveFailedCookie': "Cookie 无效。请使用 Console 的 __Host-console_session cookie，然后重试。";
    readonly 'ocgo.cancel': "取消";
    readonly 'ocgo.offPeak': "Off-Peak";
    readonly 'ocgo.peak': "Peak";
    readonly 'ocgo.utcSchedule': "UTC：周一至周五 01:00–04:00、06:00–10:00 为 Peak；JST（日本时间）：周一至周五 10:00–13:00、15:00–19:00。其余为 Off-Peak。";
    readonly 'ocgo.workspaceID': "工作区 / 组织 ID";
    readonly 'ocgo.cookie': "Console 会话 cookie";
    readonly 'ocgo.setHint': "点击外部或按 Esc 保存";
};
/** English copy. */
export declare const en: {
    readonly 'ocgo.unavailable': "usage unavailable";
    readonly 'ocgo.error': "Query failed: {code}";
    readonly 'ocgo.noconfig': "Set the Console __Host-console_session cookie and org_ workspace ID (or $DSH_HOME/ocgo-usage.json)";
    readonly 'ocgo.refresh': "Refresh";
    readonly 'ocgo.fetchedAt': "upd {time}";
    readonly 'ocgo.rolling': "5h Rolling";
    readonly 'ocgo.weekly': "Weekly";
    readonly 'ocgo.monthly': "Monthly";
    readonly 'ocgo.rateLimited': "rate-limited";
    readonly 'ocgo.resetsIn': "resets in {duration}";
    readonly 'ocgo.expand': "Show usage details";
    readonly 'ocgo.collapse': "Collapse";
    readonly 'ocgo.sep': "·";
    readonly 'ocgo.set': "Set";
    readonly 'ocgo.save': "Save";
    readonly 'ocgo.saveFailed': "Could not save. Check the connection and settings, then retry or cancel your changes.";
    readonly 'ocgo.saveFailedCookie': "Invalid cookie. Use the Console __Host-console_session cookie and try again.";
    readonly 'ocgo.cancel': "Cancel";
    readonly 'ocgo.offPeak': "Off-Peak";
    readonly 'ocgo.peak': "Peak";
    readonly 'ocgo.utcSchedule': "UTC schedule: Mon–Fri 01:00–04:00 and 06:00–10:00 are Peak. JST (Japan): Mon–Fri 10:00–13:00 and 15:00–19:00. All other times are Off-Peak.";
    readonly 'ocgo.workspaceID': "workspace / organization id";
    readonly 'ocgo.cookie': "Console session cookie";
    readonly 'ocgo.setHint': "click outside or press Esc to save";
};
/** Key type of the dictionary (for the LocaleNamespaceMap merge). */
export type OcgoKey = keyof typeof zh;
//# sourceMappingURL=locales.d.ts.map