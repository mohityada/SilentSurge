// ──────────────────────────────────────────────────────────────
// SilentSurge — Yahoo Finance Integration
// Fetches live/delayed market data for NSE stocks.
// ──────────────────────────────────────────────────────────────

import YahooFinance from "yahoo-finance2";
import { NIFTY_200_SYMBOLS, NIFTY_50_SYMBOL } from "./constants";

// yahoo-finance2 v3 requires instantiation
const yahooFinance = new YahooFinance();

export interface GainerStock {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    marketCap: number;
}

/**
 * Fetches quotes for the Nifty 200 watchlist and returns only those
 * stocks that have pumped ≥ minChangePercent in today's session.
 *
 * Queries are batched to avoid hammering the API.
 */
export async function getTopGainers(
    minChangePercent = 4,
): Promise<GainerStock[]> {
    const BATCH_SIZE = 50;
    const allQuotes: GainerStock[] = [];

    for (let i = 0; i < NIFTY_200_SYMBOLS.length; i += BATCH_SIZE) {
        const batch = NIFTY_200_SYMBOLS.slice(i, i + BATCH_SIZE);

        const results = await Promise.allSettled(
            batch.map((sym) =>
                yahooFinance.quote(sym).catch(() => null),
            ),
        );

        for (const result of results) {
            if (result.status !== "fulfilled" || !result.value) continue;
            const q = result.value;

            const changePercent = q.regularMarketChangePercent ?? 0;
            if (changePercent < minChangePercent) continue;

            allQuotes.push({
                symbol: q.symbol ?? "",
                name: q.shortName ?? q.longName ?? q.symbol ?? "",
                price: q.regularMarketPrice ?? 0,
                change: q.regularMarketChange ?? 0,
                changePercent,
                volume: q.regularMarketVolume ?? 0,
                marketCap: q.marketCap ?? 0,
            });
        }
    }

    // Sort descending by change %
    allQuotes.sort((a, b) => b.changePercent - a.changePercent);
    return allQuotes;
}

/**
 * Fetches the Nifty 50 index's current day change %.
 * Used as the sector benchmark for outperformance calculation.
 *
 * Returns 0 if the index data is unavailable.
 */
export async function getNiftyChangePercent(): Promise<number> {
    try {
        const q = await yahooFinance.quote(NIFTY_50_SYMBOL).catch(() => null);
        if (!q) return 0;
        return q.regularMarketChangePercent ?? 0;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[Yahoo] Failed to fetch Nifty 50 change: ${message}`);
        return 0;
    }
}
