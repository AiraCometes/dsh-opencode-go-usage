// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { en } from './locales.ts'
import { OcgoDockEntry, type OcgoDockEntryProps } from './OcgoDockEntry.tsx'

let root: Root
let container: HTMLDivElement
let provider: string | undefined
const sample = { updatedAt: 1, rolling: { kind: 'rolling', percent: 23, resetInSec: 3600, status: 'ok' } }
beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.useFakeTimers()
  provider = 'opencode-go'
  container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => sample })))
})
afterEach(async () => {
  await act(async () => { root.unmount() })
  container.remove()
  vi.restoreAllMocks()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
async function mount(t: (key: string) => string = key => key, selection?: () => Promise<{ provider: string; model: string } | undefined>) {
  await act(async () => {
    root.render(createElement(OcgoDockEntry, {
      provider: async () => provider, t, selection,
    } as unknown as OcgoDockEntryProps))
  })
}
describe('rendered usage entry', () => {
  it('renders usage for OpenCode Go', async () => {
    await mount()
    expect(container.querySelector('[data-testid="ocgo-chip"]')).not.toBeNull()
    expect(container.textContent).toContain('23%')
    expect(container.querySelector('button')?.getAttribute('aria-label')).toBe('5h 23%')
  })
  it('opens usage details from the compact button', async () => {
    await mount()
    await act(async () => { container.querySelector('button')?.click() })
    expect(container.textContent).toContain('ocgo.resetsIn')
    expect(container.textContent).toContain('ocgo.rolling')
  })
  it('does not invent a reset countdown when the Console omits its timestamp', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ rolling: { kind: 'rolling', percent: 0, status: 'ok' } }) })))
    await mount()
    await act(async () => { container.querySelector('button')?.click() })
    expect(container.textContent).toContain('0%')
    expect(container.textContent).not.toContain('ocgo.resetsIn')
  })
  it('hides other providers and returns after switching back', async () => {
    await mount()
    provider = 'deepseek'
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
    expect(container.textContent).toBe('')
    provider = 'opencode-go'
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
    expect(container.textContent).toContain('23%')
  })
  it('renders missing configuration as an error rather than hiding', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ error: 'noconfig' }) })))
    await mount()
    expect(container.textContent).toContain('<err:noconfig>')
    expect(container.querySelector('button')?.getAttribute('aria-label')).toContain('ocgo.set')
  })
})


async function editCookie(value: string) {
  const input = container.querySelector<HTMLInputElement>('input[placeholder="__Host-console_session=…"]')!
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function confirmEditor(trigger: string) {
  await act(async () => {
    if (trigger === 'outside') document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    else if (trigger === 'escape') document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    else Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Save')!.click()
  })
}
const masked = { cookie: { set: false, tail: '' }, workspaceID: { set: true, tail: 'mple' } }
const translate = (key: string) => (en as Record<string, string>)[key] ?? key

describe('configuration save feedback', () => {
  it.each(['error', 'usage'].flatMap(mode => ['save', 'outside', 'escape'].map(trigger => ({ mode, trigger }))))
    ('keeps $mode editor open after failed $trigger, then closes after a successful retry', async ({ mode, trigger }) => {
      let fail = true
      const writes: unknown[] = []
      vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
        if (init?.method === 'POST') {
          writes.push(JSON.parse(init.body as string))
          return { ok: !fail, status: fail ? 400 : 200, json: async () => fail ? { code: 'invalid-console-cookie' } : masked }
        }
        return { ok: true, json: async () => path.endsWith('/config') ? masked : mode === 'error' ? { error: 'noconfig' } : sample }
      }))
      await mount(translate)
      await act(async () => { container.querySelector('button')!.click() })
      if (mode === 'usage') {
        await act(async () => { Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Set')!.click() })
      }
      await editCookie('auth=example-legacy')
      await confirmEditor(trigger)
      expect(writes).toEqual([{ cookie: 'auth=example-legacy' }])
      expect(container.querySelector('[role="alert"]')?.textContent).toContain('__Host-console_session')
      expect(container.querySelector<HTMLInputElement>('input[placeholder="__Host-console_session=…"]')?.value).toBe('auth=example-legacy')
      fail = false
      await editCookie('__Host-console_session=example-corrected')
      expect(container.querySelector('[role="alert"]')).toBeNull()
      await confirmEditor('save')
      expect(writes).toHaveLength(2)
      expect(container.querySelector('input')).toBeNull()
    })
  it('waits for the pending write and does not submit it twice', async () => {
    let rejectWrite!: (error: Error) => void
    const writes = vi.fn(() => new Promise((_resolve, reject) => { rejectWrite = reject }))
    vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
      if (init?.method === 'POST') return writes()
      return { ok: true, json: async () => path.endsWith('/config') ? masked : { error: 'noconfig' } }
    }))
    await mount(translate)
    await act(async () => { container.querySelector('button')!.click() })
    await editCookie('example-session')
    await confirmEditor('outside')
    expect(container.querySelector('input')?.disabled).toBe(true)
    await confirmEditor('escape')
    expect(writes).toHaveBeenCalledTimes(1)
    await act(async () => { rejectWrite(new Error('example-network-failure')) })
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Could not save')
    expect(container.querySelector('[role="alert"]')?.textContent).not.toContain('__Host-console_session')
    expect(container.querySelector('input')?.disabled).toBe(false)
    expect(container.querySelector<HTMLInputElement>('input[placeholder="__Host-console_session=…"]')?.value).toBe('example-session')
  })
})


describe('cancel and save error classification', () => {
  async function openEditor(mode: string) {
    await mount(translate)
    await act(async () => { container.querySelector('button')!.click() })
    if (mode === 'usage') {
      await act(async () => { Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Set')!.click() })
    }
  }
  it.each(['error', 'usage'].flatMap(mode => [false, true].map(failFirst => ({ mode, failFirst }))))
    ('cancels $mode edits without a write, including after failure=$failFirst', async ({ mode, failFirst }) => {
      const writes = vi.fn()
      vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
        if (init?.method === 'POST') { writes(); throw new Error('offline') }
        return { ok: true, json: async () => path.endsWith('/config') ? masked : mode === 'error' ? { error: 'noconfig' } : sample }
      }))
      await openEditor(mode)
      await editCookie('example-unsaved-draft')
      if (failFirst) await confirmEditor('save')
      await act(async () => { Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Cancel')!.click() })
      expect(writes).toHaveBeenCalledTimes(failFirst ? 1 : 0)
      expect(container.querySelector('input')).toBeNull()
      await act(async () => { container.querySelector('button')!.click() })
      if (mode === 'usage') {
        await act(async () => { Array.from(container.querySelectorAll('button')).find(b => b.textContent === 'Set')!.click() })
      }
      expect(container.querySelector<HTMLInputElement>('input[placeholder="__Host-console_session=…"]')?.value).toBe('')
      expect(container.querySelector('[role="alert"]')).toBeNull()
    })
  it.each([
    { status: 400, code: 'invalid-console-cookie', cookieHint: true },
    { status: 400, code: undefined, cookieHint: false },
    { status: 400, code: 'config-save-failed', cookieHint: false },
    { status: 500, code: 'invalid-console-cookie', cookieHint: false },
    { status: 403, code: undefined, cookieHint: false },
  ])('uses cookie guidance only for a recognized validation error: $status/$code', async ({ status, code, cookieHint }) => {
    vi.stubGlobal('fetch', vi.fn(async (path: string, init?: RequestInit) => {
      if (init?.method === 'POST') return { ok: false, status, json: async () => ({ code, error: 'example-private-body' }) }
      return { ok: true, json: async () => path.endsWith('/config') ? masked : { error: 'noconfig' } }
    }))
    await openEditor('error')
    await editCookie('example-session')
    await confirmEditor('save')
    const message = container.querySelector('[role="alert"]')?.textContent ?? ''
    expect(message.includes('__Host-console_session')).toBe(cookieHint)
    expect(message).not.toContain('example-private-body')
    expect(message.length).toBeGreaterThan(0)
  })
})


describe('UTC price period indicator', () => {
  it('changes at a UTC boundary without another usage request', async () => {
    vi.setSystemTime(new Date('2026-10-19T00:59:59Z'))
    await mount(translate, async () => ({ provider: 'opencode-go', model: 'deepseek-v4.1-flash' }))
    expect(container.querySelector('[data-testid="price-period-dot"]')?.getAttribute('data-period')).toBe('off-peak')
    const before = vi.mocked(fetch).mock.calls.length
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(container.querySelector('[data-testid="price-period-dot"]')?.getAttribute('data-period')).toBe('peak')
    expect(container.querySelector('button')?.getAttribute('aria-label')).toContain('Peak')
    expect(vi.mocked(fetch).mock.calls.length).toBe(before)
  })
  it('refreshes the clock after returning to a background tab', async () => {
    vi.setSystemTime(new Date('2026-10-19T01:00:00Z'))
    await mount(translate, async () => ({ provider: 'opencode-go', model: 'deepseek-v4-pro' }))
    vi.setSystemTime(new Date('2026-10-24T01:00:00Z'))
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(container.querySelector('[data-testid="price-period-dot"]')?.getAttribute('data-period')).toBe('off-peak')
  })
  it('removes the label when switching to a model without documented time pricing', async () => {
    vi.setSystemTime(new Date('2026-10-24T01:00:00Z'))
    let model = 'deepseek-v4.1-flash'
    await mount(translate, async () => ({ provider: 'opencode-go', model }))
    expect(container.textContent).toContain('Off-Peak')
    model = 'kimi-k2.7-code'
    await act(async () => { await vi.advanceTimersByTimeAsync(10000) })
    expect(container.querySelector('[data-testid="price-period-dot"]')).toBeNull()
    expect(container.textContent).not.toContain('Off-Peak')
  })
  it.each([{ error: 'noconfig' }, {}])('shows clock pricing even without usage data %j', async view => {
    vi.setSystemTime(new Date('2026-10-24T01:00:00Z'))
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => view })))
    await mount(translate, async () => ({ provider: 'opencode-go', model: 'deepseek-v4-pro' }))
    expect(container.querySelector('[data-testid="price-period-dot"]')?.getAttribute('data-period')).toBe('off-peak')
    expect(container.querySelector('button')?.getAttribute('aria-label')).toContain('Off-Peak')
  })
  it('shows the UTC rule in the expanded details', async () => {
    vi.setSystemTime(new Date('2026-10-24T01:00:00Z'))
    await mount(translate, async () => ({ provider: 'opencode-go', model: 'deepseek-v4-pro' }))
    await act(async () => { container.querySelector('button')!.click() })
    expect(container.querySelector('[data-testid="price-period-details"]')?.textContent).toContain('UTC schedule')
  })
})
