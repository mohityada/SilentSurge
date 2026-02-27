// ──────────────────────────────────────────────────────────────
// SilentSurge — Twitter (X) Integration
// Searches recent tweets from trusted finance accounts for a
// given stock ticker using the v2 API.
// ──────────────────────────────────────────────────────────────

import { TwitterApi } from "twitter-api-v2";
import type { SocialMention } from "./constants";

let _client: TwitterApi | null = null;

function getClient(): TwitterApi | null {
    if (_client) return _client;
    const token = process.env.TWITTER_BEARER_TOKEN;
    if (!token || token === "your_twitter_bearer_token_here") return null;
    _client = new TwitterApi(token);
    return _client;
}

/**
 * Returns recent tweets mentioning `ticker` from trusted user IDs,
 * each with a direct link to the tweet.
 *
 * Returns [] if the Twitter API is not configured.
 */
export async function searchTwitterMentions(
    ticker: string,
): Promise<SocialMention[]> {
    const client = getClient();
    if (!client) return [];

    const trustedIds = (process.env.TWITTER_TRUSTED_USER_IDS ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

    // Build query: match $TICKER or #TICKER (case-insensitive via Twitter search)
    const tickerQuery = `($${ticker} OR #${ticker})`;

    // If we have trusted IDs, restrict search to those accounts
    const fromClause =
        trustedIds.length > 0
            ? ` (${trustedIds.map((id) => `from:${id}`).join(" OR ")})`
            : "";

    const query = `${tickerQuery}${fromClause} -is:retweet lang:en`;

    try {
        const roClient = client.readOnly;
        const result = await roClient.v2.search(query, {
            max_results: 10,
            "tweet.fields": ["created_at", "author_id", "text"],
        });

        const mentions: SocialMention[] = [];
        if (result.data?.data) {
            for (const tweet of result.data.data) {
                mentions.push({
                    platform: "twitter",
                    title: tweet.text?.slice(0, 200) ?? "",
                    url: `https://x.com/i/status/${tweet.id}`,
                    author: tweet.author_id ?? undefined,
                    timestamp: tweet.created_at ?? undefined,
                });
            }
        }

        return mentions;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[Twitter] Search failed for ${ticker}: ${message}`);
        return [];
    }
}
