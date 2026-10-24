/**
 * dsh-ocgo-usage browser half — registers the OpenCode Go usage chip into
 * the input toolbar (`conversation.input.right`) and reads
 * the host's same-origin `/api/ocgo-usage` JSON endpoints:
 * poll the host snapshot (every 10 s),
 * refresh on demand. The chip shows the three usage windows (rolling 5h /
 * weekly / monthly) in a compact form; while the host reports no usable data
 * (missing config, cookie error, or provider failure) it renders a compact
 * `<err:code>` state with a manual refresh action.
 *
 * Provider visibility is decided CLIENT-side from the live model selection:
 * The shared model directory reads the Session's live selection projection,
 * so model changes are reflected on the next poll without a model-list RPC.
 * The chip renders nothing while the current provider is not `opencode-go`, mirroring
 * pi-ocgo-usage.
 * @module dsh-ocgo-usage/client
 */

import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the ui-conversation SlotMap merge (the composer dock entry).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { ModelSelection } from './price-period.ts'
import { OCGO_PROVIDER } from '../provider.ts'
import { OcgoDockEntry, type OcgoDockEntryProps } from './OcgoDockEntry.tsx'
import { en, zh, type OcgoKey } from './locales.ts'

export { OCGO_PROVIDER } from '../provider.ts'

export { OcgoDockEntry, formatDuration } from './OcgoDockEntry.tsx'
export type { OcgoDockEntryProps } from './OcgoDockEntry.tsx'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-ocgo-usage chip copy. */
    ocgo: OcgoKey
  }
}

/** Dictionary namespace owned by this plugin. */
const NS = 'ocgo'

/** Required services: slots for the composer tool-row entry, locale for the copy. */
export const inject = ['slots', 'locale']

/** The injected business face: the tool row's owning session plus a live provider read. */
export interface OcgoInjected {
  /** The session this dock entry renders for (slot inject factory arg). */
  dockSessionId: string | undefined
  /**
   * Resolve the CURRENT model provider of the dock's session from the live
   * shared model-directory snapshot. Undefined when the
   * session has no selection yet.
   */
  provider(): Promise<string | undefined>
  /** Provider and model captured from the same live snapshot. */
  selection(): Promise<ModelSelection | undefined>
}

/**
 * Register the usage chip into the input toolbar.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'dsh-ocgo-usage: dictionaries')

  ctx.inject(['slots', 'modelDirectories'], (scope: ClientContext) => {
    scope.slots.inject('conversation.input.right', () => scope.slots.register({
      name: 'conversation.input.right',
      id: 'ocgo-usage',
      order: 110,
      locale: NS,
      inject: (sessionId): OcgoInjected => {
        const selection = async (): Promise<ModelSelection | undefined> => {
          try {
            const current = scope.modelDirectories.directoryFor(sessionId).store.getSnapshot().current
            return current ? { provider: current.provider, model: current.model } : undefined
          } catch { return undefined }
        }
        return { dockSessionId: sessionId, selection, provider: async () => (await selection())?.provider }
      },
    }, OcgoDockEntry))
  })
}
