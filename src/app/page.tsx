"use client";

import { useState, useEffect, useCallback } from "react";
import type { ScreenResponse, StockData, SocialMention } from "@/lib/constants";

/** Format large numbers as compact strings: 1,23,456 → 1.23L */
function formatIndianCompact(n: number): string {
  if (n >= 1e7) return (n / 1e7).toFixed(2) + " Cr";
  if (n >= 1e5) return (n / 1e5).toFixed(2) + " L";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + " K";
  return n.toLocaleString("en-IN");
}

function formatPrice(n: number): string {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function scoreTier(score: number): "high" | "medium" | "low" {
  if (score >= 5) return "high";
  if (score >= 2) return "medium";
  return "low";
}

const platformMeta: Record<string, { icon: string; label: string; color: string }> = {
  twitter: { icon: "𝕏", label: "Twitter / X", color: "#1da1f2" },
  reddit: { icon: "R", label: "Reddit", color: "#ff4500" },
  telegram: { icon: "T", label: "Telegram", color: "#0088cc" },
};

const statusConfig: Record<string, { icon: string; label: string; className: string }> = {
  alert: { icon: "🚨", label: "ALERT", className: "status-alert" },
  watch: { icon: "👁", label: "WATCH", className: "status-watch" },
  filtered: { icon: "⏸", label: "FILTERED", className: "status-filtered" },
};

// ─── Icons ───────────────────────────────────────────────────
function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ width: 14, height: 14, transition: "transform 0.2s ease", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

// ─── Stat Card ───────────────────────────────────────────────
function StatCard({ label, value, variant = "default" }: {
  label: string; value: string | number; variant?: "default" | "green" | "red";
}) {
  return (
    <div className="stat-card fade-in">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${variant}`}>{value}</div>
    </div>
  );
}

// ─── Mention Card ────────────────────────────────────────────
function MentionCard({ mention }: { mention: SocialMention }) {
  const meta = platformMeta[mention.platform];
  return (
    <a href={mention.url} target="_blank" rel="noopener noreferrer" className="mention-card"
      style={{ "--platform-color": meta.color } as React.CSSProperties}>
      <div className="mention-card-header">
        <span className="mention-platform-badge" style={{ background: meta.color }}>
          <span className="mention-platform-icon">{meta.icon}</span>
          {meta.label}
        </span>
        <span className="mention-external-link"><ExternalLinkIcon /> Open</span>
      </div>
      <p className="mention-card-title">{mention.title}</p>
      <div className="mention-card-footer">
        {mention.author && <span className="mention-author">{mention.author}</span>}
        {mention.timestamp && <span className="mention-time">{timeAgo(mention.timestamp)}</span>}
      </div>
    </a>
  );
}

// ─── Mentions Panel ──────────────────────────────────────────
function MentionsPanel({ mentions }: { mentions: SocialMention[] }) {
  if (mentions.length === 0) return null;
  return (
    <div className="mentions-panel">
      <div className="mentions-panel-header">
        <span className="mentions-panel-title">📎 Social Media Posts</span>
        <span className="mentions-panel-count">{mentions.length} post{mentions.length !== 1 ? "s" : ""} found</span>
      </div>
      <div className="mentions-grid">
        {mentions.map((mention, i) => (
          <MentionCard key={`${mention.platform}-${i}`} mention={mention} />
        ))}
      </div>
    </div>
  );
}

// ─── Stock Row ───────────────────────────────────────────────
function StockRow({ stock, rank }: { stock: StockData; rank: number }) {
  const [expanded, setExpanded] = useState(false);
  const tier = scoreTier(stock.silenceScore);
  const isSilent = stock.totalMentions === 0;
  const hasLinks = stock.mentions && stock.mentions.length > 0;
  const sc = statusConfig[stock.status] ?? statusConfig.filtered;

  return (
    <>
      <tr
        className={`fade-in ${hasLinks ? "clickable-row" : ""} ${expanded ? "expanded-row" : ""} ${stock.status === "alert" ? "alert-row" : ""}`}
        style={{ animationDelay: `${rank * 40}ms` }}
        onClick={() => hasLinks && setExpanded(!expanded)}
      >
        {/* Rank */}
        <td className="right">
          <span style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-mono)", fontSize: "12px" }}>
            #{rank}
          </span>
        </td>
        {/* Symbol */}
        <td>
          <div className="cell-symbol">
            <span className="symbol-name">{stock.symbol.replace(".NS", "")}</span>
            <span className="symbol-fullname">{stock.name}</span>
          </div>
        </td>
        {/* Change % */}
        <td className="right">
          <span className={`change-badge ${stock.changePercent >= 0 ? "positive" : "negative"}`}>
            {stock.changePercent >= 0 ? "▲" : "▼"} {stock.changePercent.toFixed(2)}%
          </span>
        </td>
        {/* Delivery % */}
        <td className="right">
          {stock.deliveryPercent >= 0 ? (
            <span className={`delivery-cell ${stock.deliveryPercent < 30 ? "speculative" : "institutional"}`}>
              {stock.deliveryPercent.toFixed(1)}%
            </span>
          ) : (
            <span className="delivery-cell na">N/A</span>
          )}
        </td>
        {/* R2 Proximity */}
        <td className="right">
          {stock.r2Proximity >= 0 ? (
            <span className={`r2-cell ${stock.nearR2 ? "near" : "far"}`}>
              {stock.r2Proximity.toFixed(2)}%
              {stock.nearR2 && <span className="r2-indicator">⚡</span>}
            </span>
          ) : (
            <span className="r2-cell na">N/A</span>
          )}
        </td>
        {/* Social Mentions */}
        <td>
          <div className="social-breakdown">
            <span className="social-chip">
              <span className="icon">𝕏</span>
              <span className={`count ${stock.twitterMentions === 0 ? "zero" : ""}`}>{stock.twitterMentions}</span>
            </span>
            <span className="social-chip">
              <span className="icon">R</span>
              <span className={`count ${stock.redditMentions === 0 ? "zero" : ""}`}>{stock.redditMentions}</span>
            </span>
            <span className="social-chip">
              <span className="icon">T</span>
              <span className={`count ${stock.telegramMentions === 0 ? "zero" : ""}`}>{stock.telegramMentions}</span>
            </span>
            {hasLinks && (
              <span className="expand-toggle"><ChevronIcon open={expanded} /></span>
            )}
          </div>
        </td>
        {/* Status */}
        <td>
          <span className={`status-badge ${sc.className}`}>
            <span className="status-icon">{sc.icon}</span>
            {sc.label}
            {stock.alertSent && <span className="alert-sent-dot" title="WhatsApp alert sent" />}
          </span>
        </td>
      </tr>
      {/* Expandable mentions panel */}
      {expanded && hasLinks && (
        <tr className="mentions-row">
          <td colSpan={7}>
            <MentionsPanel mentions={stock.mentions} />
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Loading / Empty / Error ─────────────────────────────────
function LoadingState() {
  return (
    <div className="loading-container">
      <div className="loading-spinner" />
      <div>
        <div className="loading-text">Scanning NSE markets…</div>
        <div className="loading-sub">
          Fetching quotes • Delivery % • Pivot Points • Social Media • Sector Benchmark
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">📊</div>
      <div className="empty-title">No Silent Surges Detected</div>
      <div className="empty-desc">
        No stocks in the Nifty 200 have pumped ≥4% today, or the market may be
        closed. Try again during trading hours (9:15 AM – 3:30 PM IST).
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="error-container">
      <div className="error-icon">⚠️</div>
      <div className="error-title">Scan Failed</div>
      <div className="error-message">{message}</div>
      <button className="btn-refresh" onClick={onRetry} style={{ marginTop: 8 }}>
        <RefreshIcon /> Try Again
      </button>
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────
export default function Dashboard() {
  const [data, setData] = useState<ScreenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/screen");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ScreenResponse = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const alertCount = data?.stocks.filter((s) => s.status === "alert").length ?? 0;
  const watchCount = data?.stocks.filter((s) => s.status === "watch").length ?? 0;
  const topPump = data?.stocks.length
    ? Math.max(...data.stocks.map((s) => s.changePercent))
    : 0;
  const avgScore = data?.stocks.length
    ? data.stocks.reduce((sum, s) => sum + s.silenceScore, 0) / data.stocks.length
    : 0;

  return (
    <div className="app-container">
      {/* ── Header ────────────────────────────────────────── */}
      <header className="header">
        <div className="header-left">
          <div className="logo">S</div>
          <div>
            <h1 className="header-title">SilentSurge</h1>
            <p className="header-subtitle">
              Mean-Reversion Screener — NSE Stocks Pumping Without Social Chatter
            </p>
          </div>
        </div>
        <div className="header-right">
          {data && (
            <div className="scan-info">
              <div className="scan-time">Last scan: {formatTime(data.scannedAt)}</div>
              <div className="scan-count">
                {data.totalScanned} screened • Nifty 50: {data.niftyChangePercent >= 0 ? "+" : ""}{data.niftyChangePercent.toFixed(2)}%
              </div>
            </div>
          )}
          <button className={`btn-refresh ${loading ? "loading" : ""}`} onClick={fetchData} disabled={loading}>
            <RefreshIcon />
            {loading ? "Scanning…" : "Refresh"}
          </button>
        </div>
      </header>

      {/* ── Stats Bar ─────────────────────────────────────── */}
      {data && !loading && (
        <div className="stats-bar">
          <StatCard label="Gainers Found (≥ 4%)" value={data.stocks.length} />
          <StatCard label="🚨 Alerts (All Criteria)" value={alertCount} variant="red" />
          <StatCard label="👁 Watch (Partial)" value={watchCount} variant="green" />
          <StatCard label="Top Pump" value={`+${topPump.toFixed(2)}%`} variant="green" />
          <StatCard label="Avg Silence Score" value={avgScore.toFixed(1)} />
          <StatCard label="WhatsApp Alerts Sent" value={data.alertsSent} />
        </div>
      )}

      {/* ── Data Table ────────────────────────────────────── */}
      <div className="table-container">
        <div className="table-header-bar">
          <span className="table-title">📡 Screened Stocks</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {data && data.stocks.some(s => s.totalMentions > 0) && (
              <span className="table-hint">Click a row with mentions to view posts</span>
            )}
            {data && (
              <span className="table-badge">
                {data.stocks.length} result{data.stocks.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {loading && <LoadingState />}
        {error && !loading && <ErrorState message={error} onRetry={fetchData} />}
        {!loading && !error && data && data.stocks.length === 0 && <EmptyState />}

        {!loading && !error && data && data.stocks.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th className="right">#</th>
                  <th>Ticker</th>
                  <th className="right">% Change</th>
                  <th className="right">Delivery %</th>
                  <th className="right">R2 Proximity</th>
                  <th>Social Mentions</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.stocks.map((stock, i) => (
                  <StockRow key={stock.symbol} stock={stock} rank={i + 1} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="footer">
        <span className="footer-text">SilentSurge v2.0 — Built for mean-reversion traders</span>
        <span className="footer-disclaimer">
          For educational and research purposes only. Not financial advice.
          Always do your own due diligence before trading.
        </span>
      </footer>
    </div>
  );
}
