"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { TrafficChannelsResult } from "@/lib/services/metrika";

const CHANNEL_COLORS: Record<string, string> = {
  organic:   "#22c55e",
  direct:    "#3b82f6",
  referral:  "#f59e0b",
  ad:        "#f97316",
  social:    "#a855f7",
  recommend: "#ec4899",
  internal:  "#14b8a6",
  email:     "#0ea5e9",
  messenger: "#eab308",
  saved:     "#6b7280",
};

function getChannelColor(id: string, idx: number): string {
  if (CHANNEL_COLORS[id]) return CHANNEL_COLORS[id];
  const fallbacks = ["#9ca3af", "#d97706", "#7c3aed", "#be185d"];
  return fallbacks[idx % fallbacks.length];
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pctDiff(cur: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((cur - prev) / prev) * 100;
}

function DiffBadge({ cur, prev, hasCompare, invertSign = false }: { cur: number; prev?: number; hasCompare?: boolean; invertSign?: boolean }) {
  if (prev == null) {
    if (!hasCompare) return null;
    const good = !invertSign;
    return <span style={{ fontSize: 9, fontWeight: 700, color: good ? "var(--r-green)" : "var(--r-red)", marginLeft: 3, verticalAlign: "super", lineHeight: 1 }}>↑100%</span>;
  }
  const d = pctDiff(cur, prev);
  if (d == null) return null;
  const up = d > 0;
  const good = invertSign ? !up : up;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, color: good ? "var(--r-green)" : "var(--r-red)", marginLeft: 3, verticalAlign: "super", lineHeight: 1 }}>
      {up ? "↑" : "↓"}{Math.abs(d).toFixed(1)}%
    </span>
  );
}

const TH: React.CSSProperties = {
  fontFamily: "var(--r-f-mono)",
  fontSize: 11,
  letterSpacing: "0.8px",
  textTransform: "uppercase",
  color: "var(--r-ink-mute)",
  fontWeight: 500,
  padding: "10px 14px",
  borderBottom: "1px solid var(--r-hairline)",
  whiteSpace: "nowrap",
};

const TD: React.CSSProperties = {
  fontFamily: "var(--r-f-body)",
  fontSize: 13,
  color: "var(--r-ink-dim)",
  padding: "11px 14px",
  borderBottom: "1px solid var(--r-hairline)",
};

interface Row {
  id: string;
  name: string;
  visits: number;
  bounceRate?: number;
  pageDepth?: number;
  avgDuration?: number;
  prevVisits?: number;
  prevBounceRate?: number;
  prevPageDepth?: number;
  prevAvgDuration?: number;
  color: string;
  pct: number;
}

export function TestBlock({ data }: { data: TrafficChannelsResult }) {
  const rawRows = data?.rows ?? [];
  const total = rawRows.reduce((s, r) => s + r.visits, 0);

  const rows: Row[] = rawRows.map((item, i) => ({
    id:              item.id,
    name:            item.name,
    visits:          item.visits,
    bounceRate:      item.bounceRate,
    pageDepth:       item.pageDepth,
    avgDuration:     item.avgDuration,
    prevVisits:      item.prevVisits,
    prevBounceRate:  item.prevBounceRate,
    prevPageDepth:   item.prevPageDepth,
    prevAvgDuration: item.prevAvgDuration,
    color:           getChannelColor(item.id, i),
    pct:             total > 0 ? (item.visits / total) * 100 : 0,
  }));

  // Donut: top 6 + rest
  const donutSlices = rows.length <= 6 ? rows : [
    ...rows.slice(0, 6),
    {
      id: "other", name: "Остальное",
      visits: rows.slice(6).reduce((s, r) => s + r.visits, 0),
      pct: rows.slice(6).reduce((s, r) => s + r.pct, 0),
      color: "var(--r-ink-mute)",
    } as Row,
  ];

  const hasCompare = rows.some((r) => r.prevVisits != null);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "start" }}>

      {/* LEFT — donut chart */}
      <div style={{
        padding: "32px 40px",
        background: "var(--r-bg-card)",
        border: "1px solid var(--r-hairline)",
        borderRadius: "var(--r-radius-s)",
        display: "flex",
        flexDirection: "column",
        gap: 32,
      }}>
        <div style={{
          fontFamily: "var(--r-f-mono)",
          fontSize: 11,
          letterSpacing: "1px",
          textTransform: "uppercase",
          color: "var(--r-ink-mute)",
        }}>
          Доли каналов
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
          {/* Donut */}
          <div style={{ position: "relative", width: 200, height: 200, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutSlices}
                  dataKey="visits"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={96}
                  strokeWidth={0}
                  labelLine={false}
                >
                  {donutSlices.map((r, i) => (
                    <Cell key={i} fill={r.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--r-bg-card-2)",
                    border: "1px solid var(--r-hairline-2)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--r-ink)",
                  }}
                  formatter={(value) => [Number(value).toLocaleString("ru-RU"), "Визиты"]}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}>
              <span style={{
                fontFamily: "var(--r-f-display)",
                fontWeight: 700,
                fontSize: 22,
                color: "var(--r-ink)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}>
                {total.toLocaleString("ru-RU")}
              </span>
              <span style={{
                fontFamily: "var(--r-f-mono)",
                fontSize: 9,
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: "var(--r-ink-mute)",
                marginTop: 4,
              }}>
                визитов
              </span>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {donutSlices.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, background: r.color }} />
                <span style={{ fontSize: 13, color: "var(--r-ink-dim)", minWidth: 120 }}>{r.name}</span>
                <span style={{ fontFamily: "var(--r-f-mono)", fontSize: 13, fontWeight: 600, color: "var(--r-ink)", marginLeft: "auto", paddingLeft: 12 }}>
                  {r.visits.toLocaleString("ru-RU")}
                </span>
                <span style={{ fontFamily: "var(--r-f-mono)", fontSize: 12, color: "var(--r-ink-mute)", minWidth: 40, textAlign: "right" }}>
                  {r.pct.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — behavior table */}
      <div style={{
        background: "var(--r-bg-card)",
        border: "1px solid var(--r-hairline)",
        borderRadius: "var(--r-radius-s)",
        overflow: "hidden",
        paddingTop: 32,
      }}>
        <div style={{
          fontFamily: "var(--r-f-mono)",
          fontSize: 11,
          letterSpacing: "1px",
          textTransform: "uppercase",
          color: "var(--r-ink-mute)",
          padding: "0 24px 20px",
        }}>
          Поведение по каналам
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...TH, padding: "10px 24px 10px 24px" }}>Канал</th>
                <th style={{ ...TH, textAlign: "right" }}>Визиты</th>
                <th style={{ ...TH, textAlign: "right" }}>Δ</th>
                <th style={{ ...TH, textAlign: "right" }}>Отказы</th>
                <th style={{ ...TH, textAlign: "right" }}>Глубина</th>
                <th style={{ ...TH, textAlign: "right", padding: "10px 24px 10px 14px" }}>Время</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                  <td style={{ ...TD, padding: "11px 14px 11px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: r.color }} />
                      {r.name}
                    </div>
                  </td>
                  <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)", color: "var(--r-ink)", fontWeight: 500 }}>
                    {r.visits.toLocaleString("ru-RU")}
                  </td>
                  <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)", fontSize: 12 }}>
                    {hasCompare ? (
                      r.prevVisits != null ? (
                        <DiffBadge cur={r.visits} prev={r.prevVisits} hasCompare={hasCompare} />
                      ) : (
                        <span style={{ fontSize: 9, fontWeight: 700, color: "var(--r-green)", verticalAlign: "super" }}>↑100%</span>
                      )
                    ) : "—"}
                  </td>
                  <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)", color: r.bounceRate != null && r.bounceRate >= 50 ? "var(--r-red)" : "var(--r-ink-dim)" }}>
                    {r.bounceRate != null ? (
                      <>{r.bounceRate.toFixed(1)}%<DiffBadge cur={r.bounceRate} prev={r.prevBounceRate} hasCompare={hasCompare} invertSign /></>
                    ) : "—"}
                  </td>
                  <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)" }}>
                    {r.pageDepth != null ? (
                      <>{r.pageDepth.toFixed(2)}<DiffBadge cur={r.pageDepth} prev={r.prevPageDepth} hasCompare={hasCompare} /></>
                    ) : "—"}
                  </td>
                  <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)", padding: "11px 24px 11px 14px" }}>
                    {r.avgDuration != null ? (
                      <>{fmtTime(r.avgDuration)}<DiffBadge cur={r.avgDuration} prev={r.prevAvgDuration} hasCompare={hasCompare} /></>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
