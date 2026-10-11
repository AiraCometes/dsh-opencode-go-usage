/**
 * dsh-ocgo-usage browser half — registers the OpenCode Go usage chip into
 * the composer dock (`conversation.composer.dock`, above the input) and reads
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
import type { Context as ClientContext } from '@deepseek-ai/cordis';
import { type OcgoKey } from './locales.ts';
export { OCGO_PROVIDER } from '../provider.ts';
export { OcgoDockEntry, formatDuration } from './OcgoDockEntry.tsx';
export type { OcgoDockEntryProps } from './OcgoDockEntry.tsx';
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** dsh-ocgo-usage chip copy. */
        ocgo: OcgoKey;
    }
}
/** Required services: slots for the composer tool-row entry, locale for the copy. */
export declare const inject: string[];
/** The injected business face: the tool row's owning session plus a live provider read. */
export interface OcgoInjected {
    /** The session this dock entry renders for (slot inject factory arg). */
    dockSessionId: string | undefined;
    /**
     * Resolve the CURRENT model provider of the dock's session from the live
     * shared model-directory snapshot. Undefined when the
     * session has no selection yet.
     */
    provider(): Promise<string | undefined>;
}
/**
 * Register the usage chip into the composer dock above the input.
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map