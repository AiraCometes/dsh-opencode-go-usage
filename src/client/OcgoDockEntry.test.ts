// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  vi.useRealTimers()
  vi.unstubAllGlobals()
})
async function mount() {
  await act(async () => {
    root.render(createElement(OcgoDockEntry, {
      provider: async () => provider, t: (key: string) => key,
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
