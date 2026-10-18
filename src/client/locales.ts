/**
 * dsh-ocgo-usage locale dictionaries (zh/en).
 * @module dsh-ocgo-usage/client/locales
 */

/** Dictionary namespace this package registers. */
export const NS = 'ocgo'

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
  'ocgo.workspaceID': '工作区 / 组织 ID',
  'ocgo.cookie': 'Console 会话 cookie',
  'ocgo.setHint': '点击外部或按 Esc 保存',
} as const

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
  'ocgo.workspaceID': 'workspace / organization id',
  'ocgo.cookie': 'Console session cookie',
  'ocgo.setHint': 'click outside or press Esc to save',
} as const

/** Key type of the dictionary (for the LocaleNamespaceMap merge). */
export type OcgoKey = keyof typeof zh
