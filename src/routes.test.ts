import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeOcgoRoutes } from './routes.ts'
import type { OcgoUsageService } from './service.ts'

let server: Server
let temp: string
let url: string
let savedHome: string | undefined
const invalidate = vi.fn()
beforeEach(async () => {
  savedHome = process.env.DSH_HOME
  temp = mkdtempSync(join(tmpdir(), 'dsh-example-routes-'))
  process.env.DSH_HOME = temp
  invalidate.mockClear()
  const routes = makeOcgoRoutes({ invalidateCache: invalidate } as unknown as OcgoUsageService)
  server = createServer((req, res) => { void routes.find(r => r.path === req.url)!.handler(req, res) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/ocgo-usage/config`
})
afterEach(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  if (savedHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = savedHome
  rmSync(temp, { recursive: true, force: true })
})
describe('configuration API error codes', () => {
  it('identifies invalid Console cookies explicitly', async () => {
    const res = await fetch(url, { method: 'POST', body: JSON.stringify({ cookie: 'auth=example-legacy' }) })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'invalid-console-cookie' })
    expect(invalidate).not.toHaveBeenCalled()
  })
  it('does not label malformed JSON as a cookie error', async () => {
    const res = await fetch(url, { method: 'POST', body: '{invalid' })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ code: 'config-save-failed' })
  })
  it('reports filesystem failures as server errors without secret details', async () => {
    mkdirSync(join(temp, 'ocgo-usage.json'))
    const res = await fetch(url, { method: 'POST', body: JSON.stringify({ cookie: 'example-session' }) })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body).toMatchObject({ code: 'config-save-failed' })
    expect(JSON.stringify(body)).not.toContain('example-session')
    expect(invalidate).not.toHaveBeenCalled()
  })
})
