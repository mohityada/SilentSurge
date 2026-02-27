// ──────────────────────────────────────────────────────────────
// SilentSurge — API Route: GET /api/screen
// Orchestrates all data sources, computes advanced metrics,
// classifies stocks, and triggers WhatsApp alerts.
// ──────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { getTopGainers, getNiftyChangePercent } from "@/lib/yahoo";
import { searchTwitterMentions } from "@/lib/twitter";
import { searchRedditMentions } from "@/lib/reddit";
import { searchTelegramMentions } from "@/lib/telegram";
import { getDeliveryPercent } from "@/lib/delivery";
import { getPivotData } from "@/lib/pivots";
import { sendWhatsAppAlert } from "@/lib/whatsapp";
import {
    tickerFromSymbol,
    CRITERIA,
    type StockData,
    type StockStatus,
    type ScreenResponse,
} from "@/lib/constants";

export const dynamic = "force-dynamic"; // never cache this route
export const maxDuration = 60; // allow up to 60s on Vercel (Pro plan)

/** Track which tickers already received alerts this session to avoid spam */
const _alertedTickers = new Set<string>();

export async function GET() {
    try {
        // ── Step 1: Fetch Nifty 50 benchmark and top gainers in parallel ─
        const [gainers, niftyChangePercent] = await Promise.all([
            getTopGainers(CRITERIA.MIN_PUMP_PERCENT),
            getNiftyChangePercent(),
        ]);

        if (gainers.length === 0) {
            const response: ScreenResponse = {
                stocks: [],
                scannedAt: new Date().toISOString(),
                totalScanned: 0,
                alertsSent: 0,
                niftyChangePercent,
            };
            return NextResponse.json(response);
        }

        // ── Step 2: Enrich each gainer with all data sources ──────────
        let alertsSent = 0;

        const enriched: StockData[] = await Promise.all(
            gainers.map(async (stock) => {
                const ticker = tickerFromSymbol(stock.symbol);

                // Fire all lookups in parallel for speed
                const [
                    twitterResults,
                    redditResults,
                    telegramResults,
                    deliveryPercent,
                    pivotData,
                ] = await Promise.all([
                    searchTwitterMentions(ticker),
                    searchRedditMentions(ticker),
                    searchTelegramMentions(ticker),
                    getDeliveryPercent(ticker),
                    getPivotData(stock.symbol, stock.price),
                ]);

                // ── Social mentions ──
                const twitterMentions = twitterResults.length;
                const redditMentions = redditResults.length;
                const telegramMentions = telegramResults.length;
                const totalMentions =
                    twitterMentions + redditMentions + telegramMentions;
                const mentions = [
                    ...twitterResults,
                    ...redditResults,
                    ...telegramResults,
                ];

                // ── Silence Score ──
                const silenceScore =
                    Math.round(
                        (stock.changePercent / (1 + totalMentions)) * 100,
                    ) / 100;

                // ── Pivot data ──
                const pivotR2 = pivotData?.r2 ?? 0;
                const r2Proximity = pivotData?.r2Proximity ?? -1;
                const nearR2 = pivotData?.nearR2 ?? false;

                // ── Sector outperformance ──
                const sectorOutperformance =
                    Math.round(
                        (stock.changePercent - niftyChangePercent) * 100,
                    ) / 100;

                // ── Status classification ──
                const passesDelivery =
                    deliveryPercent >= 0 &&
                    deliveryPercent < CRITERIA.MAX_DELIVERY_PERCENT;
                const passesR2 = nearR2;
                const passesSector =
                    sectorOutperformance >= CRITERIA.MIN_SECTOR_OUTPERFORMANCE;
                const passesMentions =
                    totalMentions <= CRITERIA.MAX_MENTIONS;

                let status: StockStatus;
                let alertSent = false;

                if (
                    passesDelivery &&
                    passesR2 &&
                    passesSector &&
                    passesMentions
                ) {
                    status = "alert";

                    // Send WhatsApp alert (only once per ticker per session)
                    if (!_alertedTickers.has(ticker)) {
                        const sent = await sendWhatsAppAlert(
                            ticker,
                            stock.changePercent,
                            deliveryPercent,
                            r2Proximity,
                        );
                        if (sent) {
                            _alertedTickers.add(ticker);
                            alertsSent++;
                            alertSent = true;
                        }
                    }
                } else if (
                    // At least 2 of the 4 criteria pass → watch
                    [passesDelivery, passesR2, passesSector, passesMentions]
                        .filter(Boolean).length >= 2
                ) {
                    status = "watch";
                } else {
                    status = "filtered";
                }

                return {
                    ...stock,
                    twitterMentions,
                    redditMentions,
                    telegramMentions,
                    totalMentions,
                    silenceScore,
                    mentions,
                    deliveryPercent,
                    pivotR2,
                    r2Proximity,
                    nearR2,
                    sectorOutperformance,
                    status,
                    alertSent,
                };
            }),
        );

        // ── Step 3: Sort — alerts first, then by silence score ────────
        const statusPriority: Record<StockStatus, number> = {
            alert: 0,
            watch: 1,
            filtered: 2,
        };
        enriched.sort((a, b) => {
            const p = statusPriority[a.status] - statusPriority[b.status];
            if (p !== 0) return p;
            return b.silenceScore - a.silenceScore;
        });

        const response: ScreenResponse = {
            stocks: enriched,
            scannedAt: new Date().toISOString(),
            totalScanned: gainers.length,
            alertsSent,
            niftyChangePercent,
        };

        return NextResponse.json(response);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[/api/screen] Error:", message);

        const errorResponse: ScreenResponse = {
            stocks: [],
            scannedAt: new Date().toISOString(),
            totalScanned: 0,
            alertsSent: 0,
            niftyChangePercent: 0,
            error: message,
        };

        return NextResponse.json(errorResponse, { status: 500 });
    }
}
