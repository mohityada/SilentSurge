// ──────────────────────────────────────────────────────────────
// SilentSurge — Reddit Integration
// Pulls the latest posts from r/IndianStreetBets and returns
// matching posts with direct links.
// ──────────────────────────────────────────────────────────────

import type { SocialMention } from "./constants";

const SUBREDDIT_JSON_URL =
    "https://www.reddit.com/r/IndianStreetBets/new.json?limit=100";

interface RedditPost {
    data: {
        title: string;
        selftext: string;
        permalink: string;
        author: string;
        created_utc: number;
        id: string;
    };
}

interface RedditListing {
    data: {
        children: RedditPost[];
    };
}

/** Cached posts – refreshed at most once every 2 minutes */
let _cache: { posts: RedditPost[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 2 * 60 * 1000;

async function fetchPosts(): Promise<RedditPost[]> {
    if (_cache && Date.now() - _cache.fetchedAt < CACHE_TTL_MS) {
        return _cache.posts;
    }

    const userAgent =
        process.env.REDDIT_USER_AGENT ?? "SilentSurge/1.0 (stock screener)";

    try {
        const res = await fetch(SUBREDDIT_JSON_URL, {
            headers: { "User-Agent": userAgent },
            next: { revalidate: 120 },
        });

        if (!res.ok) {
            console.warn(`[Reddit] HTTP ${res.status} from Reddit`);
            return [];
        }

        const json: RedditListing = await res.json();
        const posts = json.data?.children ?? [];

        _cache = { posts, fetchedAt: Date.now() };
        return posts;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[Reddit] Fetch failed: ${message}`);
        return [];
    }
}

/**
 * Returns recent r/IndianStreetBets posts that mention the given
 * ticker, each with a direct Reddit link.
 */
export async function searchRedditMentions(
    ticker: string,
): Promise<SocialMention[]> {
    const posts = await fetchPosts();

    // Build case-insensitive regex that matches the ticker as a whole word
    // Handles common formats: RELIANCE, $RELIANCE, #RELIANCE
    const pattern = new RegExp(`(?:^|[\\s$#])${escapeRegex(ticker)}(?=[\\s,;.!?)\\]]|$)`, "gi");

    const mentions: SocialMention[] = [];
    for (const post of posts) {
        const text = `${post.data.title} ${post.data.selftext}`;
        if (pattern.test(text)) {
            mentions.push({
                platform: "reddit",
                title: post.data.title.slice(0, 200),
                url: `https://www.reddit.com${post.data.permalink}`,
                author: post.data.author ? `u/${post.data.author}` : undefined,
                timestamp: post.data.created_utc
                    ? new Date(post.data.created_utc * 1000).toISOString()
                    : undefined,
            });
        }
        // Reset lastIndex since we reuse the regex with the g flag
        pattern.lastIndex = 0;
    }

    return mentions;
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
