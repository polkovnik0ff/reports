"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

export interface DonutRow {
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
}

interface DonutTableProps {
  rows: DonutRow[];
  firstColLabel?: string;
  metricLabel?: string;
  hideTable?: boolean;
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

function DiffBadge({ cur, prev, hasCompare }: { cur: number; prev?: number; hasCompare?: boolean }) {
  if (prev == null) {
    if (!hasCompare) return null;
    return (
      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--r-green)", marginLeft: 4 }}>↑100%</span>
    );
  }
  const d = pctDiff(cur, prev);
  if (d == null) return null;
  const up = d > 0;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: up ? "var(--r-green)" : "var(--r-red)", marginLeft: 4 }}>
      {up ? "↑" : "↓"}{Math.abs(d).toFixed(1)}%
    </span>
  );
}

function toDonutSlices(rows: DonutRow[]): DonutRow[] {
  if (rows.length <= 6) return rows;
  const top = rows.slice(0, 6);
  const rest = rows.slice(6);
  const otherVisits = rest.reduce((s, r) => s + r.visits, 0);
  return [...top, { name: "Другие", visits: otherVisits, color: "var(--r-ink-mute)" }];
}

const TH: React.CSSProperties = {
  fontFamily: "var(--r-f-mono)",
  fontSize: 11,
  letterSpacing: "0.8px",
  textTransform: "uppercase",
  color: "var(--r-ink-mute)",
  fontWeight: 500,
  padding: "10px 14px",
  textAlign: "left",
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

export function DonutTable({ rows, firstColLabel = "Источник", metricLabel = "Визиты", hideTable = false }: DonutTableProps) {
  const slices = toDonutSlices(rows);
  const hasExtended = rows[0]?.bounceRate != null;
  const hasCompare = rows.some((r) => r.prevVisits != null);

  return (
    <div>
      {/* Donut + Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 40, alignItems: "center", marginBottom: 40 }}>
        <div style={{ width: 220, height: 220, flexShrink: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="visits"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={66}
                outerRadius={100}
                labelLine={false}
                strokeWidth={0}
              >
                {slices.map((r, i) => (
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
                formatter={(value) => [Number(value).toLocaleString("ru-RU"), metricLabel]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {slices.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{
                width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                background: r.color,
              }} />
              <span style={{ fontSize: 13, color: "var(--r-ink-dim)", minWidth: 120 }}>{r.name}</span>
              <span style={{
                fontFamily: "var(--r-f-mono)",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--r-ink)",
                marginLeft: "auto",
                paddingLeft: 16,
              }}>
                {r.visits.toLocaleString("ru-RU")}
                <DiffBadge cur={r.visits} prev={r.prevVisits} hasCompare={hasCompare} />
              </span>
            </div>
          ))}
        </div>
      </div>

      {!hideTable && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={TH}>{firstColLabel}</th>
                <th style={{ ...TH, textAlign: "right" }}>{metricLabel}</th>
                {hasExtended && <th style={{ ...TH, textAlign: "right" }}>Отказы</th>}
                {hasExtended && <th style={{ ...TH, textAlign: "right" }}>Глубина</th>}
                {hasExtended && <th style={{ ...TH, textAlign: "right" }}>Время</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                  <td style={TD}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: r.color }} />
                      {r.name}
                    </div>
                  </td>
                  <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)", color: "var(--r-ink)", fontWeight: 500 }}>
                    {r.visits.toLocaleString("ru-RU")}
                    <DiffBadge cur={r.visits} prev={r.prevVisits} hasCompare={hasCompare} />
                  </td>
                  {r.bounceRate != null && (
                    <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)" }}>
                      {r.bounceRate.toFixed(1)}%
                      <DiffBadge cur={r.bounceRate} prev={r.prevBounceRate} hasCompare={hasCompare} />
                    </td>
                  )}
                  {r.pageDepth != null && (
                    <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)" }}>
                      {r.pageDepth.toFixed(2)}
                      <DiffBadge cur={r.pageDepth} prev={r.prevPageDepth} hasCompare={hasCompare} />
                    </td>
                  )}
                  {r.avgDuration != null && (
                    <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)" }}>
                      {fmtTime(r.avgDuration)}
                      <DiffBadge cur={r.avgDuration} prev={r.prevAvgDuration} hasCompare={hasCompare} />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
