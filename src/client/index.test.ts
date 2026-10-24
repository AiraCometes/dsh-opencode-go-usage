import { describe, expect, it, vi } from 'vitest'
import { apply, type OcgoInjected } from './index.ts'
import { isOpenCodeGo } from '../provider.ts'

vi.mock('./OcgoDockEntry.tsx', () => ({ OcgoDockEntry: () => null, formatDuration: () => '' }))

function harness() {
  const current = new Map<string, { provider: string; model?: string } | null>()
  let entry: { name: string; inject: (sessionId: string) => OcgoInjected } | undefined
  const register = vi.fn((options) => { entry = options; return () => {} })
  const slotInject = vi.fn((_name, callback) => callback())
  const directoryFor = vi.fn((id: string) => {
    if (!current.has(id)) throw new Error('session disposed')
    return { store: { getSnapshot: () => ({ current: current.get(id) }) } }
  })
  const scope = { slots: { inject: slotInject, register }, modelDirectories: { directoryFor } }
  const inject = vi.fn((_services, callback) => callback(scope))
  const ctx = { locale: { register: vi.fn(() => () => {}) },
    effect: (callback: () => unknown) => callback(), inject }
  apply(ctx as unknown as Parameters<typeof apply>[0])
  return { current, inject, slotInject, register, directoryFor,
    entry: () => { if (!entry) throw new Error('entry not registered'); return entry } }
}

describe('current Harness model directory integration', () => {
  it('registers the input toolbar through its owner lifecycle', () => {
    const h = harness()
    expect(h.inject.mock.calls[0]?.[0]).toEqual(['slots', 'modelDirectories'])
    expect(h.slotInject.mock.calls[0]?.[0]).toBe('conversation.input.right')
    expect(h.entry().name).toBe('conversation.input.right')
  })
  it('reads the current provider without the removed connection API', async () => {
    const h = harness(); h.current.set('example', { provider: 'opencode-go' })
    const entry = h.entry().inject('example')
    expect(await entry.provider()).toBe('opencode-go')
    expect(isOpenCodeGo(await entry.provider())).toBe(true)
  })
  it('tracks model switches from the same injected reader', async () => {
    const h = harness(); h.current.set('example', { provider: 'opencode-go' })
    const entry = h.entry().inject('example')
    h.current.set('example', { provider: 'deepseek' })
    expect(isOpenCodeGo(await entry.provider())).toBe(false)
    h.current.set('example', { provider: 'opencode-go' })
    expect(isOpenCodeGo(await entry.provider())).toBe(true)
  })
  it('keeps providers isolated between sessions', async () => {
    const h = harness(); h.current.set('example', { provider: 'opencode-go' })
    h.current.set('sample', { provider: 'deepseek' })
    expect(await h.entry().inject('example').provider()).toBe('opencode-go')
    expect(await h.entry().inject('sample').provider()).toBe('deepseek')
  })
  it('captures provider and model from the same snapshot and tracks model switches', async () => {
    const h = harness(); h.current.set('example', { provider: 'opencode-go', model: 'deepseek-v4.1-flash' })
    const entry = h.entry().inject('example')
    expect(await entry.selection()).toEqual({ provider: 'opencode-go', model: 'deepseek-v4.1-flash' })
    h.current.set('example', { provider: 'opencode-go', model: 'kimi-k2.7-code' })
    expect((await entry.selection())?.model).toBe('kimi-k2.7-code')
    h.current.delete('example')
    expect(await entry.selection()).toBeUndefined()
  })
  it('handles unset and disposed sessions without throwing', async () => {
    const h = harness(); h.current.set('example', null)
    const entry = h.entry().inject('example')
    expect(await entry.provider()).toBeUndefined()
    h.current.delete('example')
    expect(await entry.provider()).toBeUndefined()
  })
})
