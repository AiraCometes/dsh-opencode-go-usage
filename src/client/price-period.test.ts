import { describe, expect, it } from 'vitest'
import { pricePeriod } from './price-period.ts'

const selection = { provider: 'opencode-go', model: 'deepseek-v4.1-flash' }
describe('OpenCode Go UTC pricing schedule', () => {
  it.each([
    ['2026-10-19T00:59:59.999Z', 'off-peak'],
    ['2026-10-19T01:00:00.000Z', 'peak'],
    ['2026-10-19T03:59:59.999Z', 'peak'],
    ['2026-10-19T04:00:00.000Z', 'off-peak'],
    ['2026-10-19T05:59:59.999Z', 'off-peak'],
    ['2026-10-19T06:00:00.000Z', 'peak'],
    ['2026-10-19T09:59:59.999Z', 'peak'],
    ['2026-10-19T10:00:00.000Z', 'off-peak'],
    ['2026-10-23T23:59:59.999Z', 'off-peak'],
    ['2026-10-24T01:00:00.000Z', 'off-peak'],
    ['2026-10-24T06:00:00.000Z', 'off-peak'],
    ['2026-10-25T01:00:00.000Z', 'off-peak'],
    ['2026-10-26T01:00:00.000Z', 'peak'],
    ['2026-10-19T10:00:00+09:00', 'peak'],
    ['2026-10-19T13:00:00+09:00', 'off-peak'],
    ['2026-10-19T15:00:00+09:00', 'peak'],
    ['2026-10-19T19:00:00+09:00', 'off-peak'],
  ])('%s is %s', (time, expected) => {
    expect(pricePeriod(selection, new Date(time))).toBe(expected)
  })
  it.each(['deepseek-v4.1-flash', 'deepseek-v4-pro'])('recognizes the documented model %s', model => {
    expect(pricePeriod({ ...selection, model }, new Date('2026-10-19T01:00:00Z'))).toBe('peak')
  })
  it.each(['deepseek-v4-flash', 'deepseek-v4.1-pro', 'kimi-k2.7-code', 'example'])('does not invent a discount for %s', model => {
    expect(pricePeriod({ ...selection, model }, new Date('2026-10-24T01:00:00Z'))).toBeUndefined()
  })
  it('does not apply the Go schedule to other providers or unknown selections/times', () => {
    expect(pricePeriod({ ...selection, provider: 'deepseek' }, new Date())).toBeUndefined()
    expect(pricePeriod(undefined, new Date())).toBeUndefined()
    expect(pricePeriod(selection, new Date('invalid'))).toBeUndefined()
  })
})
