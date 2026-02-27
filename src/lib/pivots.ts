// ──────────────────────────────────────────────────────────────
// SilentSurge — Pivot Point Calculator
// Calculates standard daily pivot points (P, R1, R2) from the
// previous trading day's OHLC data and determines R2 proximity.
// ──────────────────────────────────────────────────────────────

import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export interface PivotData {
    /** Previous day high */
    prevHigh: number;
    /** Previous day low */
    prevLow: number;
    /** Previous day close */
    prevClose: number;
    /** Pivot point */
    pivot: number;
    /** First resistance */
    r1: number;
    /** Second resistance */
    r2: number;
    /** How close (%) the current price is to R2. 0 = exactly at R2. */
    r2Proximity: number;
    /** Whether price is within 1% of R2 */
    nearR2: boolean;
}

/**
 * Fetches previous day OHLC for the given symbol and computes
 * standard daily pivot points. Returns R2 proximity relative to
 * the current price.
 *
 * Returns null if historical data is unavailable.
 */
export async function getPivotData(
    symbol: string,
    currentPrice: number,
): Promise<PivotData | null> {
    try {
        // Fetch ~5 days of daily candles to ensure we get at least 1 completed day
        const now = new Date();
        const fiveDaysAgo = new Date(now);
        fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 7);

        const chart = await yahooFinance.chart(symbol, {
            period1: fiveDaysAgo,
            period2: now,
            interval: "1d",
        });

        const quotes = chart?.quotes;
        if (!quotes || quotes.length < 2) {
            console.warn(`[Pivots] Not enough daily bars for ${symbol}`);
            return null;
        }

        // The second-to-last bar is "yesterday" (last completed day)
        // The last bar is today's partial candle
        const prevDay = quotes[quotes.length - 2];

        const high = prevDay.high;
        const low = prevDay.low;
        const close = prevDay.close;

        if (!high || !low || !close) {
            console.warn(`[Pivots] Incomplete OHLC for ${symbol}`);
            return null;
        }

        // Standard pivot point formulas
        const pivot = (high + low + close) / 3;
        const r1 = 2 * pivot - low;
        const r2 = pivot + (high - low);

        // R2 proximity: how close the current price is to R2 in percentage terms
        const r2Proximity = Math.abs(currentPrice - r2) / r2 * 100;
        const nearR2 = r2Proximity <= 1.0;

        return {
            prevHigh: round2(high),
            prevLow: round2(low),
            prevClose: round2(close),
            pivot: round2(pivot),
            r1: round2(r1),
            r2: round2(r2),
            r2Proximity: round2(r2Proximity),
            nearR2,
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[Pivots] Failed for ${symbol}: ${message}`);
        return null;
    }
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}
