/**
 * Unit tests for the configuration loader.
 * @module dsh-ocgo-usage/config.test
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_BASE_URL,
  DEFAULT_CACHE_TTL,
  DEFAULT_TIMEOUT_MS,
  ENV_BASE_URL,
  ENV_CACHE_TTL,
  ENV_COOKIE,
  ENV_TIMEOUT_MS,
  ENV_WORKSPACE_ID,
  loadConfig,
  maskSecret,
  maskedConfigView,
  normalizeCookie,
  writeConfigFile,
} from './config.ts'

const ENV_KEYS = [ENV_COOKIE, ENV_WORKSPACE_ID, ENV_BASE_URL, ENV_CACHE_TTL, ENV_TIMEOUT_MS, 'DSH_HOME']

/** Clear every env var the config reads, remembering the previous values. */
function clearEnv(): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {}
  for (const key of ENV_KEYS) {
    saved[key] = process.env[key]
    delete process.env[key]
  }
  return saved
}

function restoreEnv(saved: Record<string, string | undefined>): void {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key]
    else process.env[key] = saved[key]
  }
}

describe('normalizeCookie', () => {
  it('passes through a full header and preserves its locale', () => {
    expect(normalizeCookie('__Host-console_session=Fe26.2*abc; oc_locale=zh')).toBe('__Host-console_session=Fe26.2*abc; oc_locale=zh')
    expect(normalizeCookie('__Host-console_session=Fe26.2*abc')).toBe('__Host-console_session=Fe26.2*abc; oc_locale=en')
  })

  it('prefixes the Console cookie name onto a bare session value', () => {
    expect(normalizeCookie('Fe26.2*abc')).toBe('__Host-console_session=Fe26.2*abc; oc_locale=en')
  })

  it('preserves a pasted locale (zh stays zh, ja stays ja)', () => {
    expect(normalizeCookie('Fe26.2*abc; oc_locale=zh')).toBe('__Host-console_session=Fe26.2*abc; oc_locale=zh')
    expect(normalizeCookie('Fe26.2*abc; oc_locale=ja')).toBe('__Host-console_session=Fe26.2*abc; oc_locale=ja')
  })

  it('falls back to en when the locale is absent or malformed', () => {
    expect(normalizeCookie('__Host-console_session=Fe26.2*abc')).toBe('__Host-console_session=Fe26.2*abc; oc_locale=en')
    expect(normalizeCookie('__Host-console_session=Fe26.2*abc; oc_locale=')).toBe('__Host-console_session=Fe26.2*abc; oc_locale=en')
    expect(normalizeCookie('__Host-console_session=Fe26.2*abc; oc_locale=verylonglocale')).toBe(
      '__Host-console_session=Fe26.2*abc; oc_locale=en',
    )
  })

  it('is order-independent and never corrupts locale-first cookies (regression)', () => {
    // The old code turned "oc_locale=zh; ...; __Host-console_session=..." into
    // "__Host-console_session=oc_locale=zh; ...". This must never happen.
    expect(normalizeCookie('oc_locale=zh; __Host-console_session=Fe26.2*abc')).toBe('__Host-console_session=Fe26.2*abc; oc_locale=zh')
    expect(normalizeCookie('oc_locale=en; desktop_promo_dismissed=1; __Host-console_session=Fe26.2*abc')).toBe(
      '__Host-console_session=Fe26.2*abc; oc_locale=en',
    )
  })

  it('accepts comma-separated cookies (Set-Cookie style)', () => {
    expect(normalizeCookie('oc_locale=zh, desktop_promo_dismissed=1, __Host-console_session=Fe26.2*abc')).toBe(
      '__Host-console_session=Fe26.2*abc; oc_locale=zh',
    )
  })

  it('accepts a quoted auth value', () => {
    expect(normalizeCookie('__Host-console_session="Fe26.2*quoted"; oc_locale=en')).toBe(
      '__Host-console_session=Fe26.2*quoted; oc_locale=en',
    )
  })

  it('rejects input with no real auth token (no fake __Host-console_session=)', () => {
    // Regression: the old code fabricated "__Host-console_session=oc_locale=zh; ..." from a
    // locale-only paste. Now it refuses instead.
    expect(normalizeCookie('oc_locale=zh')).toBeUndefined()
    expect(normalizeCookie('zh')).toBeUndefined()
    expect(normalizeCookie('desktop_promo_dismissed=1; __Host-console_session=')).toBeUndefined()
  })

  it('normalizes whitespace and rejects empty input', () => {
    expect(normalizeCookie('  __Host-console_session=Fe26.2*abc ;  oc_locale=zh  ')).toBe('__Host-console_session=Fe26.2*abc; oc_locale=zh')
    expect(normalizeCookie('   ')).toBeUndefined()
    expect(normalizeCookie(undefined)).toBeUndefined()
  })
})

describe('loadConfig', () => {
  let savedEnv: Record<string, string | undefined>
  let tmp: string

  beforeEach(() => {
    savedEnv = clearEnv()
    tmp = mkdtempSync(join(tmpdir(), 'dsh-ocgo-usage-test-'))
    process.env.DSH_HOME = tmp
  })

  afterEach(() => {
    restoreEnv(savedEnv)
    rmSync(tmp, { recursive: true, force: true })
  })

  it('returns defaults when nothing is configured', () => {
    const cfg = loadConfig()
    expect(cfg.cookie).toBeUndefined()
    expect(cfg.workspaceID).toBeUndefined()
    expect(cfg.baseUrl).toBe(DEFAULT_BASE_URL)
    expect(cfg.cacheTTL).toBe(DEFAULT_CACHE_TTL)
    expect(cfg.timeoutMs).toBe(DEFAULT_TIMEOUT_MS)
  })

  it('reads env vars and normalizes the cookie', () => {
    process.env[ENV_COOKIE] = 'Fe26.2*env'
    process.env[ENV_WORKSPACE_ID] = 'wrk_env'
    process.env[ENV_BASE_URL] = 'https://example.com'
    process.env[ENV_CACHE_TTL] = '120'
    process.env[ENV_TIMEOUT_MS] = '5000'
    const cfg = loadConfig()
    expect(cfg.cookie).toBe('__Host-console_session=Fe26.2*env; oc_locale=en')
    expect(cfg.workspaceID).toBe('wrk_env')
    expect(cfg.baseUrl).toBe('https://example.com')
    expect(cfg.cacheTTL).toBe(120)
    expect(cfg.timeoutMs).toBe(5000)
  })

  it('env wins over the config file', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), JSON.stringify({
      cookie: '__Host-console_session=Fe26.2*file; oc_locale=zh',
      workspaceID: 'wrk_file',
      cacheTTL: 9999,
    }))
    process.env[ENV_COOKIE] = '__Host-console_session=Fe26.2*env; oc_locale=zh'
    const cfg = loadConfig()
    expect(cfg.cookie).toBe('__Host-console_session=Fe26.2*env; oc_locale=zh')
    expect(cfg.workspaceID).toBe('wrk_file')
  })

  it('falls back to the config file and clamps cacheTTL', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), JSON.stringify({
      cookie: '__Host-console_session=example-file',
      workspaceID: 'wrk_file',
      cacheTTL: 9999,
    }))
    const cfg = loadConfig()
    expect(cfg.cookie).toBe('__Host-console_session=example-file; oc_locale=en')
    expect(cfg.workspaceID).toBe('wrk_file')
    expect(cfg.cacheTTL).toBe(3600)
    expect(cfg.timeoutMs).toBe(DEFAULT_TIMEOUT_MS)
  })

  it('trims workspace IDs read from environment and file', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), JSON.stringify({ workspaceID: ' org_example \r\n' }))
    expect(loadConfig().workspaceID).toBe('org_example')
    process.env[ENV_WORKSPACE_ID] = ' org_env \r'
    expect(loadConfig().workspaceID).toBe('org_env')
  })

  it('tolerates a broken config file', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), '{not json')
    const cfg = loadConfig()
    expect(cfg.cookie).toBeUndefined()
    expect(cfg.baseUrl).toBe(DEFAULT_BASE_URL)
  })
})

describe('masked config view + write', () => {
  let savedEnv: Record<string, string | undefined>
  let tmp: string

  beforeEach(() => {
    savedEnv = clearEnv()
    tmp = mkdtempSync(join(tmpdir(), 'dsh-ocgo-usage-mask-'))
    process.env.DSH_HOME = tmp
  })

  afterEach(() => {
    restoreEnv(savedEnv)
    rmSync(tmp, { recursive: true, force: true })
  })

  it('masks the tail of a secret', () => {
    expect(maskSecret(undefined)).toEqual({ set: false, tail: '' })
    expect(maskSecret('abcd')).toEqual({ set: true, tail: 'abcd' })
    expect(maskSecret('Fe26.2*long-value-xyz1')).toEqual({ set: true, tail: 'xyz1' })
  })

  it('exposes only masked values in the view', () => {
    const cookie = '__Host-console_session=Fe26.2*secret-cookie-9abc; oc_locale=zh'
    const ws = 'wrk_01XXXXXXXXXXXXXXXXXXXX8q2w'
    process.env[ENV_COOKIE] = cookie
    process.env[ENV_WORKSPACE_ID] = ws
    const view = maskedConfigView()
    // The env cookie is normalized on load: locale is preserved as zh.
    const normalized = '__Host-console_session=Fe26.2*secret-cookie-9abc; oc_locale=zh'
    expect(view.cookie).toEqual({ set: true, tail: normalized.slice(-4) })
    expect(view.workspaceID).toEqual({ set: true, tail: ws.slice(-4) })
    expect(JSON.stringify(view)).not.toContain('secret-cookie')
  })

  it('writes new values to the config file and normalizes the cookie', () => {
    const view = writeConfigFile({ cookie: 'example-session', workspaceID: 'wrk_new' })
    // The written cookie is normalized to "__Host-console_session=example-session; oc_locale=en";
    // its tail is the whole header's last 4 chars.
    expect(view.cookie).toEqual({ set: true, tail: '__Host-console_session=example-session; oc_locale=en'.slice(-4) })
    expect(view.workspaceID).toEqual({ set: true, tail: 'wrk_new'.slice(-4) })
    // loadConfig now reads the written file (normalized cookie with __Host-console_session=).
    const cfg = loadConfig()
    expect(cfg.workspaceID).toBe('wrk_new')
    expect(cfg.cookie).toBe('__Host-console_session=example-session; oc_locale=en')
  })

  it('preserves other fields and clears a field with null', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), JSON.stringify({
      cookie: '__Host-console_session=Fe26.2*old; oc_locale=zh',
      workspaceID: 'wrk_old',
      baseUrl: 'https://example.com',
      cacheTTL: 120,
    }))
    const view = writeConfigFile({ cookie: null, workspaceID: 'wrk_new2' })
    expect(view.cookie).toEqual({ set: false, tail: '' })
    expect(view.workspaceID).toEqual({ set: true, tail: 'wrk_new2'.slice(-4) })
    const raw = JSON.parse(readFileSync(join(tmp, 'ocgo-usage.json'), 'utf8'))
    expect(raw.baseUrl).toBe('https://example.com')
    expect(raw.cacheTTL).toBe(120)
    expect(raw.cookie).toBeUndefined()
  })

  it('rejects invalid nonempty writes without changing any saved fields', () => {
    writeConfigFile({ cookie: 'example-session', workspaceID: 'org_example' })
    const before = readFileSync(join(tmp, 'ocgo-usage.json'), 'utf8')
    expect(() => writeConfigFile({ cookie: 'auth=example-legacy', workspaceID: 'org_other' }))
      .toThrow('Console __Host-console_session')
    expect(readFileSync(join(tmp, 'ocgo-usage.json'), 'utf8')).toBe(before)
    expect(maskedConfigView().cookie.set).toBe(true)
  })

  it('does not report success if the configuration file cannot be written', () => {
    mkdirSync(join(tmp, 'ocgo-usage.json'))
    expect(() => writeConfigFile({ cookie: 'example-session' })).toThrow('Could not write')
  })

  it('keeps fields absent from the write untouched (no accidental clear)', () => {
    writeFileSync(join(tmp, 'ocgo-usage.json'), JSON.stringify({
      cookie: '__Host-console_session=Fe26.2*keepme; oc_locale=zh',
      workspaceID: 'wrk_keep',
    }))
    // Only workspaceID is present in the partial; cookie must survive.
    const view = writeConfigFile({ workspaceID: 'wrk_new3' })
    expect(view.workspaceID).toEqual({ set: true, tail: 'wrk_new3'.slice(-4) })
    expect(view.cookie).toEqual({ set: true, tail: 'oc_locale=zh'.slice(-4) })
    const raw = JSON.parse(readFileSync(join(tmp, 'ocgo-usage.json'), 'utf8'))
    expect(raw.cookie).toBe('__Host-console_session=Fe26.2*keepme; oc_locale=zh')
    expect(raw.workspaceID).toBe('wrk_new3')
  })
})


describe('Console session cookie normalization', () => {
  it('preserves Console sessions even without legacy auth and drops unrelated cookies', () => {
    expect(normalizeCookie('preference=example; __Host-console_session=example-session; oc_locale=ja'))
      .toBe('__Host-console_session=example-session; oc_locale=ja')
  })
  it('finds bare sessions after locale and canonicalizes pasted cookie names', () => {
    expect(normalizeCookie('OC_LOCALE=ZH; example-session'))
      .toBe('__Host-console_session=example-session; oc_locale=zh')
    expect(normalizeCookie('__HOST-CONSOLE_SESSION=example-session; OC_LOCALE=JA; AUTH=example-legacy'))
      .toBe('__Host-console_session=example-session; oc_locale=ja')
    expect(normalizeCookie('AUTH=example-legacy; OC_LOCALE=zh')).toBeUndefined()
  })
  it('treats bare values as Console sessions', () => {
    expect(normalizeCookie('example-session')).toBe('__Host-console_session=example-session; oc_locale=en')
  })
  it('rejects explicitly named legacy auth instead of fabricating a Console session', () => {
    expect(normalizeCookie('auth=example-legacy; oc_locale=zh')).toBeUndefined()
  })
  it('does not accept header injection or unrelated preferences as sessions', () => {
    expect(normalizeCookie('__Host-console_session=example\r\nx-extra: value')).toBeUndefined()
    expect(normalizeCookie('oc_locale=ja; preference=example')).toBeUndefined()
  })
})
