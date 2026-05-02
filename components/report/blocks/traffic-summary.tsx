"use client";

import { TrafficSummaryResult } from "@/lib/services/metrika";

function fmtNum(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + " М";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + " К";
  return Math.round(n).toLocaleString("ru-RU");
}

function fmtDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pctDiff(cur: number, prev: number) {
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

interface KpiCardProps {
  label: string;
  value: string;
  diff?: number | null;
  invertDiff?: boolean;
}

function KpiCard({ label, value, diff, invertDiff = false }: KpiCardProps) {
  const isGood = diff != null && (invertDiff ? diff < 0 : diff > 0);
  const isBad  = diff != null && (invertDiff ? diff > 0 : diff < 0);

  return (
    <div style={{
      background: "var(--r-bg-card)",
      border: "1px solid var(--r-hairline)",
      borderRadius: "var(--r-radius-s)",
      padding: "24px 28px",
      flex: "1 1 160px",
      minWidth: 0,
    }}>
      <p style={{
        fontFamily: "var(--r-f-mono)",
        fontSize: 11,
        letterSpacing: "1px",
        textTransform: "uppercase",
        color: "var(--r-ink-mute)",
        marginBottom: 12,
      }}>
        {label}
      </p>
      <p style={{
        fontFamily: "var(--r-f-display)",
        fontWeight: 700,
        fontSize: "clamp(28px, 3vw, 40px)",
        lineHeight: 1,
        letterSpacing: "-0.02em",
        color: "var(--r-ink)",
        marginBottom: diff != null ? 12 : 0,
      }}>
        {value}
      </p>
      {diff != null && (
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontFamily: "var(--r-f-mono)",
          fontSize: 12,
          fontWeight: 600,
          color: isGood ? "var(--r-green)" : isBad ? "var(--r-red)" : "var(--r-ink-mute)",
          background: isGood ? "rgba(74,222,128,0.1)" : isBad ? "rgba(255,89,99,0.1)" : "transparent",
          borderRadius: 4,
          padding: "2px 6px",
        }}>
          <span>{isGood ? "↑" : isBad ? "↓" : "—"}</span>
          <span>{Math.abs(diff).toFixed(1)}%</span>
        </div>
      )}
    </div>
  );
}

export function TrafficSummaryBlock({ data }: { data: TrafficSummaryResult }) {
  const c = data?.current;
  const p = data?.previous;

  if (!c) return (
    <p style={{ color: "var(--r-ink-mute)", fontStyle: "italic", fontSize: 14 }}>Нет данных</p>
  );

  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      <KpiCard
        label="Посетители"
        value={fmtNum(c.users)}
        diff={p ? pctDiff(c.users, p.users) : null}
      />
      <KpiCard
        label="Визиты"
        value={fmtNum(c.visits)}
        diff={p ? pctDiff(c.visits, p.visits) : null}
      />
      <KpiCard
        label="Просмотры"
        value={fmtNum(c.pageviews)}
        diff={p ? pctDiff(c.pageviews, p.pageviews) : null}
      />
      <KpiCard
        label="Глубина просмотра"
        value={c.pageDepth.toFixed(2)}
        diff={p ? pctDiff(c.pageDepth, p.pageDepth) : null}
      />
      <KpiCard
        label="Длительность визита"
        value={fmtDuration(c.avgDuration)}
        diff={p ? pctDiff(c.avgDuration, p.avgDuration) : null}
      />
      <KpiCard
        label="Показатель отказов"
        value={c.bounceRate.toFixed(1) + "%"}
        diff={p ? pctDiff(c.bounceRate, p.bounceRate) : null}
        invertDiff
      />
    </div>
  );
}
