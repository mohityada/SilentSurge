// ──────────────────────────────────────────────────────────────
// SilentSurge — Delivery % Analysis
// Fetches delivery quantity data from NSE to determine if a
// stock's volume is speculative (< 30%) or institutional.
// ──────────────────────────────────────────────────────────────

import { NseIndia } from "stock-nse-india";

const nseIndia = new NseIndia();

/** Cached results to avoid hammering NSE within a scan cycle */
const _cache: Map<string, { value: number; fetchedAt: number }> = new Map();
const CACHE_TTL_MS = 3 * 60 * 1000;

/**
 * Returns the delivery percentage for a given NSE ticker.
 * Delivery % = (deliveryQuantity / totalTradedQuantity) * 100
 *
 * Returns -1 if data is unavailable (so the frontend can show "N/A").
 */
export async function getDeliveryPercent(ticker: string): Promise<number> {
    const cached = _cache.get(ticker);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.value;
    }

    try {
        const tradeInfo = await nseIndia.getEquityTradeInfo(ticker);

        // The trade info has securityWiseDP with deliveryQuantity and quantityTraded
        const dp = tradeInfo?.securityWiseDP;
        if (!dp) {
            console.warn(`[Delivery] No securityWiseDP for ${ticker}`);
            return -1;
        }

        const deliveryQty = parseFloat(String(dp.deliveryQuantity ?? 0).replace(/,/g, ""));
        const totalQty = parseFloat(String(dp.quantityTraded ?? 0).replace(/,/g, ""));

        if (totalQty === 0) return -1;

        const pct = Math.round((deliveryQty / totalQty) * 10000) / 100;

        _cache.set(ticker, { value: pct, fetchedAt: Date.now() });
        return pct;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[Delivery] Failed for ${ticker}: ${message}`);
        return -1;
    }
}
