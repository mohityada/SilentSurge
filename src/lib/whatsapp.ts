// ──────────────────────────────────────────────────────────────
// SilentSurge — WhatsApp Alert via Twilio
// Sends formatted WhatsApp messages when a stock passes ALL
// SilentSurge criteria (pump + low delivery + near R2 +
// sector outperformance + zero news).
// ──────────────────────────────────────────────────────────────

/**
 * Sends a WhatsApp alert via Twilio's REST API.
 * Uses native fetch — no Twilio SDK required.
 *
 * Returns true if the message was sent successfully, false otherwise.
 * Returns false silently if Twilio env vars are not configured.
 */
export async function sendWhatsAppAlert(
    ticker: string,
    changePercent: number,
    deliveryPercent: number,
    r2Proximity: number,
): Promise<boolean> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM; // e.g. "whatsapp:+14155238886"
    const to = process.env.WHATSAPP_TO; // e.g. "whatsapp:+919876543210"

    if (!accountSid || !authToken || !from || !to) {
        return false;
    }

    // Skip placeholder values
    if (
        accountSid === "your_twilio_account_sid" ||
        authToken === "your_twilio_auth_token"
    ) {
        return false;
    }

    const body = [
        `🚨 SilentSurge Alert: ${ticker} up +${changePercent.toFixed(2)}% at R2 resistance with zero news and low delivery.`,
        ``,
        `📊 Details:`,
        `• Change: +${changePercent.toFixed(2)}%`,
        `• Delivery %: ${deliveryPercent.toFixed(1)}% (speculative)`,
        `• R2 Proximity: ${r2Proximity.toFixed(2)}%`,
        `• Social Mentions: 0`,
        ``,
        `⚡ Mean-reversion short candidate identified by SilentSurge.`,
    ].join("\n");

    try {
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

        const params = new URLSearchParams();
        params.set("From", from);
        params.set("To", to);
        params.set("Body", body);

        const res = await fetch(url, {
            method: "POST",
            headers: {
                Authorization: `Basic ${credentials}`,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: params.toString(),
        });

        if (!res.ok) {
            const errText = await res.text();
            console.warn(`[WhatsApp] Twilio HTTP ${res.status}: ${errText}`);
            return false;
        }

        console.log(`[WhatsApp] ✅ Alert sent for ${ticker}`);
        return true;
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`[WhatsApp] Send failed for ${ticker}: ${message}`);
        return false;
    }
}
