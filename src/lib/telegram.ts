// ──────────────────────────────────────────────────────────────
// SilentSurge — Telegram Integration
// Uses the Telegram Bot API to read recent messages from a
// target channel and returns matching posts with links.
// ──────────────────────────────────────────────────────────────

import type { SocialMention } from "./constants";

const TELEGRAM_API_BASE = "https://api.telegram.org";

interface TelegramChat {
    id: number;
    title?: string;
    username?: string;
}

interface TelegramMessage {
    message_id: number;
    text?: string;
    date: number;
    chat?: TelegramChat;
    from?: { username?: string; first_name?: string };
}

interface TelegramUpdate {
    update_id: number;
    channel_post?: TelegramMessage;
    message?: TelegramMessage;
}

interface TelegramGetUpdatesResponse {
    ok: boolean;
    result: TelegramUpdate[];
}

/**
 * Returns recent Telegram messages in the configured channel that
 * mention the given stock ticker, each with a link.
 *
 * Returns [] if the Telegram Bot API is not configured.
 */
export async function searchTelegramMentions(
    ticker: string,
): Promise<SocialMention[]> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken || botToken === "your_telegram_bot_token_here") return [];

    try {
        const url = `${TELEGRAM_API_BASE}/bot${botToken}/getUpdates?limit=100&allowed_updates=["channel_post","message"]`;

        const res = await fetch(url, {
            next: { revalidate: 120 },
        });

        if (!res.ok) {
            console.warn(`[Telegram] HTTP ${res.status}`);
            return [];
        }

        const json: TelegramGetUpdatesResponse = await res.json();
        if (!json.ok) return [];

        const pattern = new RegExp(
            `(?:^|[\\s$#])${escapeRegex(ticker)}(?=[\\s,;.!?)\\]]|$)`,
            "gi",
        );

        const mentions: SocialMention[] = [];

        for (const update of json.result) {
            const msg = update.channel_post ?? update.message;
            if (!msg?.text) continue;

            if (pattern.test(msg.text)) {
                // Build the link: if channel has a username, we can link directly
                const chat = msg.chat;
                let postUrl = "";
                if (chat?.username) {
                    postUrl = `https://t.me/${chat.username}/${msg.message_id}`;
                } else if (chat?.id) {
                    // For private channels, use the numeric chat id format
                    // Remove the -100 prefix if present for link format
                    const channelId = String(chat.id).replace(/^-100/, "");
                    postUrl = `https://t.me/c/${channelId}/${msg.message_id}`;
                }

                mentions.push({
                    platform: "telegram",
                    title: msg.text.slice(0, 200),
                    url: postUrl,
                    author: msg.from?.username
                        ? `@${msg.from.username}`
                        : msg.from?.first_name ?? chat?.title ?? undefined,
                    timestamp: new Date(msg.date * 1000).toISOString(),
                });
            }
            pattern.lastIndex = 0;
        }

        return mentions;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[Telegram] Fetch failed: ${message}`);
        return [];
    }
}

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
