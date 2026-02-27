// ──────────────────────────────────────────────────────────────
// SilentSurge — Constants & Type Definitions
// ──────────────────────────────────────────────────────────────

/** A single social media post/mention with a link */
export interface SocialMention {
    platform: "twitter" | "reddit" | "telegram";
    title: string;
    url: string;
    author?: string;
    timestamp?: string;
}

/** Status classification for each screened stock */
export type StockStatus = "alert" | "watch" | "filtered";

/** Shape of a screened stock returned by the /api/screen endpoint */
export interface StockData {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    volume: number;
    marketCap: number;
    /** Number of mentions found on Twitter */
    twitterMentions: number;
    /** Number of mentions found on Reddit */
    redditMentions: number;
    /** Number of mentions found on Telegram */
    telegramMentions: number;
    /** Total social mentions across all platforms */
    totalMentions: number;
    /** Silence score — higher means fewer mentions relative to the pump */
    silenceScore: number;
    /** Actual social media posts/mentions with links */
    mentions: SocialMention[];

    // ─── New advanced fields ──────────────────────────────────
    /** Delivery % from NSE (< 30% = speculative). -1 if unavailable. */
    deliveryPercent: number;
    /** R2 pivot resistance level price */
    pivotR2: number;
    /** How close (%) the current price is to R2. -1 if unavailable. */
    r2Proximity: number;
    /** Whether the price is within 1% of R2 */
    nearR2: boolean;
    /** How much (%) the stock outperforms the Nifty 50 index */
    sectorOutperformance: number;
    /** Classification: alert = all criteria pass, watch = partial, filtered = none */
    status: StockStatus;
    /** Whether a WhatsApp alert was sent for this stock */
    alertSent: boolean;
}

/** Full API response shape from /api/screen */
export interface ScreenResponse {
    stocks: StockData[];
    scannedAt: string;
    totalScanned: number;
    /** Number of WhatsApp alerts sent in this scan */
    alertsSent: number;
    /** Nifty 50 index change % used as benchmark */
    niftyChangePercent: number;
    error?: string;
}

/**
 * Criteria thresholds for the SilentSurge strategy.
 */
export const CRITERIA = {
    /** Minimum intraday pump % */
    MIN_PUMP_PERCENT: 4,
    /** Maximum delivery % (below this = speculative) */
    MAX_DELIVERY_PERCENT: 30,
    /** Maximum R2 proximity % (within this = near resistance) */
    MAX_R2_PROXIMITY: 1,
    /** Minimum sector outperformance % */
    MIN_SECTOR_OUTPERFORMANCE: 2,
    /** Must have zero social mentions */
    MAX_MENTIONS: 0,
} as const;

/** Nifty 50 index symbol for sector benchmark */
export const NIFTY_50_SYMBOL = "^NSEI";

/**
 * Curated Nifty 200 symbols (NSE).
 * yahoo-finance2 requires the `.NS` suffix for NSE-listed stocks.
 */
export const NIFTY_200_SYMBOLS: string[] = [
    // ─── Nifty 50 ────────────────────────────────────────────
    "RELIANCE.NS",
    "TCS.NS",
    "HDFCBANK.NS",
    "INFY.NS",
    "ICICIBANK.NS",
    "HINDUNILVR.NS",
    "BHARTIARTL.NS",
    "SBIN.NS",
    "ITC.NS",
    "KOTAKBANK.NS",
    "LT.NS",
    "AXISBANK.NS",
    "BAJFINANCE.NS",
    "ASIANPAINT.NS",
    "MARUTI.NS",
    "HCLTECH.NS",
    "TITAN.NS",
    "SUNPHARMA.NS",
    "WIPRO.NS",
    "ULTRACEMCO.NS",
    "NTPC.NS",
    "POWERGRID.NS",
    "NESTLEIND.NS",
    "TATAMOTORS.NS",
    "TECHM.NS",
    "BAJAJFINSV.NS",
    "ADANIENT.NS",
    "ADANIPORTS.NS",
    "ONGC.NS",
    "TATASTEEL.NS",
    "JSWSTEEL.NS",
    "COALINDIA.NS",
    "HDFCLIFE.NS",
    "SBILIFE.NS",
    "GRASIM.NS",
    "M&M.NS",
    "DIVISLAB.NS",
    "BPCL.NS",
    "BAJAJ-AUTO.NS",
    "DRREDDY.NS",
    "CIPLA.NS",
    "EICHERMOT.NS",
    "APOLLOHOSP.NS",
    "HEROMOTOCO.NS",
    "UPL.NS",
    "TATACONSUM.NS",
    "BRITANNIA.NS",
    "INDUSINDBK.NS",
    "HINDALCO.NS",
    "VEDL.NS",

    // ─── Nifty Next 50 ──────────────────────────────────────
    "ADANIGREEN.NS",
    "AMBUJACEM.NS",
    "AUROPHARMA.NS",
    "BANDHANBNK.NS",
    "BANKBARODA.NS",
    "BERGEPAINT.NS",
    "BIOCON.NS",
    "BOSCHLTD.NS",
    "CHOLAFIN.NS",
    "COLPAL.NS",
    "CONCOR.NS",
    "CUMMINSIND.NS",
    "DLF.NS",
    "DABUR.NS",
    "GAIL.NS",
    "GMRINFRA.NS",
    "GODREJCP.NS",
    "HAVELLS.NS",
    "HINDPETRO.NS",
    "IDFCFIRSTB.NS",
    "IGL.NS",
    "INDUSTOWER.NS",
    "IRCTC.NS",
    "JUBLFOOD.NS",
    "LICI.NS",
    "LUPIN.NS",
    "MARICO.NS",
    "MUTHOOTFIN.NS",
    "NAUKRI.NS",
    "OBEROIRLTY.NS",
    "OFSS.NS",
    "PEL.NS",
    "PETRONET.NS",
    "PIDILITIND.NS",
    "PNB.NS",
    "POLYCAB.NS",
    "SBICARD.NS",
    "SHREECEM.NS",
    "SIEMENS.NS",
    "SRF.NS",
    "TORNTPHARM.NS",
    "TRENT.NS",
    "VOLTAS.NS",
    "ZOMATO.NS",
    "PIIND.NS",
    "PAGEIND.NS",
    "MPHASIS.NS",
    "LTIM.NS",
    "DMART.NS",
    "HAL.NS",

    // ─── Additional Nifty 200 ───────────────────────────────
    "ABB.NS",
    "ACC.NS",
    "ALKEM.NS",
    "ASHOKLEY.NS",
    "ATUL.NS",
    "BALKRISIND.NS",
    "BEL.NS",
    "BHARATFORG.NS",
    "BHEL.NS",
    "CANFINHOME.NS",
    "CHAMBLFERT.NS",
    "CROMPTON.NS",
    "CANBK.NS",
    "DEEPAKNTR.NS",
    "DELTACORP.NS",
    "DIXON.NS",
    "ESCORTS.NS",
    "EXIDEIND.NS",
    "FEDERALBNK.NS",
    "GLENMARK.NS",
    "GNFC.NS",
    "GSPL.NS",
    "HDFCAMC.NS",
    "HONAUT.NS",
    "ICICIPRULI.NS",
    "ICICIGI.NS",
    "IDEA.NS",
    "IDBI.NS",
    "INDHOTEL.NS",
    "IOC.NS",
    "IPCALAB.NS",
    "JINDALSTEL.NS",
    "JKCEMENT.NS",
    "KPITTECH.NS",
    "LAURUSLABS.NS",
    "LICHSGFIN.NS",
    "LTTS.NS",
    "MANAPPURAM.NS",
    "MCX.NS",
    "METROPOLIS.NS",
    "MFSL.NS",
    "MGL.NS",
    "MOTHERSON.NS",
    "NAM-INDIA.NS",
    "NATIONALUM.NS",
    "NAVINFLUOR.NS",
    "NMDC.NS",
    "PERSISTENT.NS",
    "PFC.NS",
    "PVRINOX.NS",
    "RAMCOCEM.NS",
    "RECLTD.NS",
    "SAIL.NS",
    "SONACOMS.NS",
    "STARHEALTH.NS",
    "SUNTV.NS",
    "SYNGENE.NS",
    "TATACHEM.NS",
    "TATACOMM.NS",
    "TATAPOWER.NS",
    "TORNTPOWER.NS",
    "TVSMOTOR.NS",
    "UBL.NS",
    "UNIONBANK.NS",
    "UNITDSPR.NS",
    "VBL.NS",
    "ZEEL.NS",
    "ZYDUSLIFE.NS",
    "COFORGE.NS",
    "MAXHEALTH.NS",
    "ASTRAL.NS",
    "BATAINDIA.NS",
    "CAMS.NS",
    "CLEAN.NS",
    "CYIENT.NS",
    "DELHIVERY.NS",
    "DEVYANI.NS",
    "EMAMILTD.NS",
    "FORTIS.NS",
    "HAPPSTMNDS.NS",
    "INDIAMART.NS",
    "IRFC.NS",
    "KALYANKJIL.NS",
    "KEI.NS",
    "LALPATHLAB.NS",
    "LODHA.NS",
    "MRF.NS",
    "NHPC.NS",
    "PHOENIXLTD.NS",
    "POONAWALLA.NS",
    "PRESTIGE.NS",
    "RAJESHEXPO.NS",
    "RELAXO.NS",
    "SJVN.NS",
    "SUNDARMFIN.NS",
    "SUPREMEIND.NS",
    "THERMAX.NS",
    "TIINDIA.NS",
    "TRIDENT.NS",
    "WHIRLPOOL.NS",
];

/**
 * Extracts the bare ticker from a yahoo-finance symbol.
 * e.g. "RELIANCE.NS" → "RELIANCE"
 */
export function tickerFromSymbol(symbol: string): string {
    return symbol.replace(/\.(NS|BO)$/, "");
}
