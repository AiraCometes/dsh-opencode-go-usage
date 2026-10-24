/**
 * dsh-ocgo-usage locale dictionaries (zh/en).
 * @module dsh-ocgo-usage/client/locales
 */
/** Dictionary namespace this package registers. */
export const NS = 'ocgo';
/** Chinese copy. */
export const zh = {
    'ocgo.unavailable': '用量不可用',
    'ocgo.error': '查询失败：{code}',
    'ocgo.noconfig': '请设置 Console __Host-console_session cookie 与 org_ 工作区 ID（或 $DSH_HOME/ocgo-usage.json）',
    'ocgo.refresh': '刷新',
    'ocgo.fetchedAt': 'upd {time}',
    'ocgo.rolling': '5h 滚动',
    'ocgo.weekly': '每周',
    'ocgo.monthly': '每月',
    'ocgo.rateLimited': '已限流',
    'ocgo.resetsIn': '剩余 {duration}',
    'ocgo.expand': '展开用量详情',
    'ocgo.collapse': '收起',
    'ocgo.sep': '·',
    'ocgo.set': '设置',
    'ocgo.save': '保存',
    'ocgo.saveFailed': '保存失败。请检查连接和设置后重试，或取消更改。',
    'ocgo.saveFailedCookie': 'Cookie 无效。请使用 Console 的 __Host-console_session cookie，然后重试。',
    'ocgo.cancel': '取消',
    'ocgo.offPeak': 'Off-Peak',
    'ocgo.peak': 'Peak',
    'ocgo.utcSchedule': '按 UTC 时间表：周一至周五 01:00–04:00、06:00–10:00 为 Peak，其余为 Off-Peak。',
    'ocgo.workspaceID': '工作区 / 组织 ID',
    'ocgo.cookie': 'Console 会话 cookie',
    'ocgo.setHint': '点击外部或按 Esc 保存',
};
/** English copy. */
export const en = {
    'ocgo.unavailable': 'usage unavailable',
    'ocgo.error': 'Query failed: {code}',
    'ocgo.noconfig': 'Set the Console __Host-console_session cookie and org_ workspace ID (or $DSH_HOME/ocgo-usage.json)',
    'ocgo.refresh': 'Refresh',
    'ocgo.fetchedAt': 'upd {time}',
    'ocgo.rolling': '5h Rolling',
    'ocgo.weekly': 'Weekly',
    'ocgo.monthly': 'Monthly',
    'ocgo.rateLimited': 'rate-limited',
    'ocgo.resetsIn': 'resets in {duration}',
    'ocgo.expand': 'Show usage details',
    'ocgo.collapse': 'Collapse',
    'ocgo.sep': '·',
    'ocgo.set': 'Set',
    'ocgo.save': 'Save',
    'ocgo.saveFailed': 'Could not save. Check the connection and settings, then retry or cancel your changes.',
    'ocgo.saveFailedCookie': 'Invalid cookie. Use the Console __Host-console_session cookie and try again.',
    'ocgo.cancel': 'Cancel',
    'ocgo.offPeak': 'Off-Peak',
    'ocgo.peak': 'Peak',
    'ocgo.utcSchedule': 'UTC schedule: Mon–Fri 01:00–04:00 and 06:00–10:00 are Peak; all other times are Off-Peak.',
    'ocgo.workspaceID': 'workspace / organization id',
    'ocgo.cookie': 'Console session cookie',
    'ocgo.setHint': 'click outside or press Esc to save',
};
