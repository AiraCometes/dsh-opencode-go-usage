import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchViaCookie, fromConsoleJSON } from './api.ts'
import type { OcgoConfig } from './types.ts'

const NOW = Date.parse('2026-10-19T00:00:00Z')
const config: OcgoConfig = {
  cookie: '__Host-console_session=example-session; oc_locale=en',
  workspaceID: 'org_example', baseUrl: 'https://opencode.ai', cacheTTL: 300, timeoutMs: 1000,
}
function payload() {
  return { access: { endsAt: '2026-11-19T00:00:00Z', meters: {
    fiveHour: { usedMicroCents: '2500', limitMicroCents: '10000', resetsAt: '2026-10-19T03:00:00Z' },
    week: { usedMicroCents: '4000', limitMicroCents: '10000', resetsAt: '2026-10-20T00:00:00Z' },
    month: { usedMicroCents: '12000', limitMicroCents: '10000' },
  } } }
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers() })

describe('Console meters', () => {
  it('maps micro-cent ratios and only explicit reset timestamps', () => {
    const result = fromConsoleJSON(payload(), NOW)
    expect(result.rolling).toEqual({ kind: 'rolling', percent: 25, resetInSec: 10800, status: 'ok' })
    expect(result.weekly).toEqual({ kind: 'weekly', percent: 40, resetInSec: 86400, status: 'ok' })
    expect(result.monthly).toEqual({ kind: 'monthly', percent: 100, status: 'rate-limited' })
  })
  it('does not invent missing reset timestamps or optional windows', () => {
    const result = fromConsoleJSON({ access: { meters: { fiveHour: {
      usedMicroCents: 0, limitMicroCents: 100, resetsAt: null,
    } } } }, NOW)
    expect(result).toEqual({ rolling: { kind: 'rolling', percent: 0, status: 'ok' } })
  })
  it.each([undefined, null])('keeps weekly/monthly windows when fiveHour is %j', fiveHour => {
    const p = payload()
    const result = fromConsoleJSON({ access: { ...p.access, endsAt: '2027-11-19T00:00:00Z', meters: { ...p.access.meters, fiveHour } } }, NOW)
    expect(result.rolling).toBeUndefined()
    expect(result.weekly?.percent).toBe(40)
    expect(result.monthly?.percent).toBe(100)
    expect(result.monthly).not.toHaveProperty('resetInSec')
  })
  it('uses precise integer arithmetic for large micro-cent amounts', () => {
    const value = { usedMicroCents: '25000000000000000001', limitMicroCents: '100000000000000000000' }
    expect(fromConsoleJSON({ access: { meters: { fiveHour: value } } }, NOW).rolling?.percent).toBe(25)
  })
  it('keeps explicit monthly resets and clamps expired timestamps to zero', () => {
    const p = payload()
    const month = { ...p.access.meters.month, resetsAt: '2026-10-18T00:00:00Z' }
    const result = fromConsoleJSON({ access: { ...p.access, meters: { ...p.access.meters, month } } }, NOW)
    expect(result.monthly?.resetInSec).toBe(0)
  })
  it('classifies an absent subscription separately from authentication', () => {
    expect(() => fromConsoleJSON({ access: null }, NOW)).toThrow(expect.objectContaining({ code: 'nosubscription' }))
  })
  it.each([null, [], {}, { access: {} }, { access: { meters: {} } }, { access: { meters: { fiveHour: {} } } }])('rejects malformed status %j', value => {
    expect(() => fromConsoleJSON(value, NOW)).toThrow(expect.objectContaining({ code: 'parse' }))
  })
  it.each([
    { usedMicroCents: '-1', limitMicroCents: '100' },
    { usedMicroCents: '1', limitMicroCents: '0' },
    { usedMicroCents: '1.5', limitMicroCents: '100' },
    { usedMicroCents: 1, limitMicroCents: Number.POSITIVE_INFINITY },
    { usedMicroCents: 1, limitMicroCents: Number.MAX_SAFE_INTEGER + 1 },
    { usedMicroCents: '1', limitMicroCents: '100', resetsAt: 'invalid' },
  ])('rejects invalid meter %j', meter => {
    expect(() => fromConsoleJSON({ access: { meters: { fiveHour: meter } } }, NOW))
      .toThrow(expect.objectContaining({ code: 'parse' }))
  })
})

describe('Console HTTP transport', () => {
  it.each(['org_example', 'wrk_example'])('sends %s unchanged as x-org-id', async workspaceID => {
    const mock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload())))
    const result = await fetchViaCookie({ ...config, workspaceID })
    expect(result.rolling?.percent).toBe(25)
    expect(mock).toHaveBeenCalledWith('https://opencode.ai/console/api/go/status', expect.objectContaining({
      redirect: 'manual', headers: { Cookie: config.cookie, 'x-org-id': workspaceID, Accept: 'application/json' },
    }))
  })
  it.each([401, 403, 302, 500])('reports HTTP %i without interpreting it as a login page', async status => {
    const response = new Response('example-private-body', { status })
    const cancel = vi.spyOn(response.body!, 'cancel')
    const mock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
    await expect(fetchViaCookie(config)).rejects.toMatchObject({ code: `http${status}` })
    expect(mock).toHaveBeenCalledTimes(1)
    expect(cancel).toHaveBeenCalledTimes(1)
  })
  it.each([
    { cookie: undefined }, { workspaceID: undefined }, { cookie: 'auth=example-legacy' },
  ])('rejects missing Console credentials before any request', async partial => {
    const mock = vi.spyOn(globalThis, 'fetch')
    await expect(fetchViaCookie({ ...config, ...partial })).rejects.toMatchObject({ code: 'noconfig' })
    expect(mock).not.toHaveBeenCalled()
  })
  it.each(['https://opencode.ai/console/org_example/go', 'org_example\r\nx-test: x'])('rejects invalid organization field %j', async workspaceID => {
    const mock = vi.spyOn(globalThis, 'fetch')
    await expect(fetchViaCookie({ ...config, workspaceID }))
      .rejects.toMatchObject({ code: 'workspace' })
    expect(mock).not.toHaveBeenCalled()
  })
  it('normalizes a locale-first cookie and trims the direct-call workspace ID', async () => {
    const mock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload())))
    await fetchViaCookie({ ...config, cookie: 'OC_LOCALE=ja; example-session', workspaceID: ' org_example \r' })
    expect(mock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ headers: {
      Cookie: '__Host-console_session=example-session; oc_locale=ja', 'x-org-id': 'org_example', Accept: 'application/json',
    } }))
  })
  it.each([400, 401, 403])('provides ID and session guidance for a rejected legacy ID (HTTP %i)', async status => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status }))
    await expect(fetchViaCookie({ ...config, workspaceID: 'wrk_example' })).rejects.toMatchObject({
      code: 'workspace', message: expect.stringContaining(`HTTP ${status}`),
    })
  })
  it('does not expose response text or raw network errors', async () => {
    const mock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('example-session-private'))
    await expect(fetchViaCookie(config)).rejects.toMatchObject({ code: 'parse' })
    mock.mockRejectedValue(new Error('example-session-private'))
    await expect(fetchViaCookie(config)).rejects.toMatchObject({ code: 'fetch', message: 'OpenCode Console request failed' })
  })
  it('aborts stalled requests at the configured timeout', async () => {
    vi.useFakeTimers()
    vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    }))
    const check = expect(fetchViaCookie({ ...config, timeoutMs: 10 })).rejects.toMatchObject({ code: 'timeout' })
    await vi.advanceTimersByTimeAsync(10)
    await check
  })
  it('reads a real HTTP JSON response and never follows a credential-bearing redirect', async () => {
    const requests: { path: string; cookie: string | undefined; org: string | string[] | undefined }[] = []
    let redirect = false
    const server = createServer((req, res) => {
      requests.push({ path: req.url!, cookie: req.headers.cookie, org: req.headers['x-org-id'] })
      if (redirect) { res.writeHead(302, { location: '/unexpected' }); res.end(); return }
      res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify(payload()))
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
    try {
      expect((await fetchViaCookie({ ...config, baseUrl })).rolling?.percent).toBe(25)
      redirect = true
      await expect(fetchViaCookie({ ...config, baseUrl })).rejects.toMatchObject({ code: 'http302' })
      expect(requests).toHaveLength(2)
      expect(requests[0]).toEqual({ path: '/console/api/go/status', cookie: config.cookie, org: 'org_example' })
    } finally {
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
    }
  })
})
