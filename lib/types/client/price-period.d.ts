export interface ModelSelection {
    readonly provider: string;
    readonly model: string;
}
export type PricePeriod = 'peak' | 'off-peak';
/** OpenCode Go schedule verified 2026-10-24; no price assumptions for other models. */
export declare function pricePeriod(selection: ModelSelection | undefined, now: Date): PricePeriod | undefined;
//# sourceMappingURL=price-period.d.ts.map