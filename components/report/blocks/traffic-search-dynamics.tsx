"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { SearchEnginesDynamicsResult, TrafficChannelsResult } from "@/lib/services/metrika";
import { getEngineColor } from "@/lib/utils/engine-colors";

interface TableRow {
  id?: string;
  name: string;
  visits: number;
  bounceRate?: number;
  pageDepth?: number;
  avgDuration?: number;
  prevVisits?: number;
  prevBounceRate?: number;
  prevPageDepth?: number;
  prevAvgDuration?: number;
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
      <span style={{ fontSize: 9, fontWeight: 700, color: "var(--r-green)", marginLeft: 3, verticalAlign: "super", lineHeight: 1 }}>↑100%</span>
    );
  }
  const d = pctDiff(cur, prev);
  if (d == null) return null;
  const up = d > 0;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, color: up ? "var(--r-green)" : "var(--r-red)", marginLeft: 3, verticalAlign: "super", lineHeight: 1 }}>
      {up ? "↑" : "↓"}{Math.abs(d).toFixed(1)}%
    </span>
  );
}

interface Props {
  data: SearchEnginesDynamicsResult;
  tableData?: TrafficChannelsResult | null;
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

const CHART_TOOLTIP_STYLE = {
  background: "var(--r-bg-card-2)",
  border: "1px solid var(--r-hairline-2)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--r-ink)",
};

export function TrafficSearchDynamicsBlock({ data, tableData }: Props) {
  if (!data || data.dates.length === 0) {
    return (
      <div style={{
        background: "var(--r-bg-card)",
        border: "1px solid var(--r-hairline)",
        borderRadius: "var(--r-radius-s)",
        padding: "24px",
        textAlign: "center",
        color: "var(--r-ink-mute)",
        fontStyle: "italic",
        fontSize: 14,
      }}>
        Данные недоступны
      </div>
    );
  }

  const chartData = data.dates.map((date, i) => {
    const parsed = new Date(date);
    const label = !isNaN(parsed.getTime())
      ? parsed.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })
      : date;
    const point: Record<string, string | number> = { label };
    for (const s of data.series) {
      point[s.name] = s.data[i] ?? 0;
    }
    return point;
  });

  const rawRows = tableData?.rows ?? [];
  const TOP = 6;
  const topRows = rawRows.slice(0, TOP);
  const otherRows = rawRows.slice(TOP);
  const hasCompare = rawRows.some((r) => r.prevVisits != null);

  let tableRows: TableRow[] = topRows;
  if (otherRows.length > 0) {
    const otherVisits = otherRows.reduce((s, r) => s + r.visits, 0);
    const otherPrevVisits = hasCompare ? otherRows.reduce((s, r) => s + (r.prevVisits ?? 0), 0) : undefined;
    const otherBounce = otherRows.every((r) => r.bounceRate != null)
      ? otherRows.reduce((s, r) => s + r.bounceRate! * r.visits, 0) / Math.max(otherVisits, 1)
      : undefined;
    const otherPrevBounce = hasCompare && otherRows.every((r) => r.prevBounceRate != null)
      ? otherRows.reduce((s, r) => s + r.prevBounceRate! * (r.prevVisits ?? 0), 0) / Math.max(otherPrevVisits ?? 1, 1)
      : undefined;
    const otherDepth = otherRows.every((r) => r.pageDepth != null)
      ? otherRows.reduce((s, r) => s + r.pageDepth! * r.visits, 0) / Math.max(otherVisits, 1)
      : undefined;
    const otherPrevDepth = hasCompare && otherRows.every((r) => r.prevPageDepth != null)
      ? otherRows.reduce((s, r) => s + r.prevPageDepth! * (r.prevVisits ?? 0), 0) / Math.max(otherPrevVisits ?? 1, 1)
      : undefined;
    const otherDuration = otherRows.every((r) => r.avgDuration != null)
      ? otherRows.reduce((s, r) => s + r.avgDuration! * r.visits, 0) / Math.max(otherVisits, 1)
      : undefined;
    const otherPrevDuration = hasCompare && otherRows.every((r) => r.prevAvgDuration != null)
      ? otherRows.reduce((s, r) => s + r.prevAvgDuration! * (r.prevVisits ?? 0), 0) / Math.max(otherPrevVisits ?? 1, 1)
      : undefined;

    tableRows = [
      ...topRows,
      {
        id: "other",
        name: "Другие",
        visits: otherVisits,
        bounceRate: otherBounce,
        pageDepth: otherDepth,
        avgDuration: otherDuration,
        prevVisits: otherPrevVisits,
        prevBounceRate: otherPrevBounce,
        prevPageDepth: otherPrevDepth,
        prevAvgDuration: otherPrevDuration,
      },
    ];
  }

  const hasExtended = tableRows.some((r) => r.bounceRate != null);

  return (
    <div>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 20 }}>
        {data.series.map((s, i) => (
          <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: getEngineColor(s.name, i), flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "var(--r-ink-dim)", fontFamily: "var(--r-f-body)" }}>{s.name}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div style={{ height: 280, marginBottom: 40 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--r-hairline)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--r-ink-mute)", fontFamily: "var(--r-f-mono)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--r-ink-mute)", fontFamily: "var(--r-f-mono)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
            {data.series.map((s, i) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={getEngineColor(s.name, i)}
                strokeWidth={2}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary table */}
      {tableRows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={TH}>Поисковая система</th>
                <th style={{ ...TH, textAlign: "right" }}>Визиты</th>
                {hasExtended && <th style={{ ...TH, textAlign: "right" }}>Отказы</th>}
                {hasExtended && <th style={{ ...TH, textAlign: "right" }}>Глубина</th>}
                {hasExtended && <th style={{ ...TH, textAlign: "right" }}>Время</th>}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                  <td style={TD}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                        background: r.name === "Другие" ? "var(--r-ink-mute)" : getEngineColor(r.id ?? r.name, i),
                      }} />
                      {r.name}
                    </div>
                  </td>
                  <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)", color: "var(--r-ink)", fontWeight: 500 }}>
                    {r.visits.toLocaleString("ru-RU")}
                    <DiffBadge cur={r.visits} prev={r.prevVisits} hasCompare={hasCompare} />
                  </td>
                  {hasExtended && (
                    <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)" }}>
                      {r.bounceRate != null ? (
                        <>{r.bounceRate.toFixed(1)}%<DiffBadge cur={r.bounceRate} prev={r.prevBounceRate} hasCompare={hasCompare} /></>
                      ) : "—"}
                    </td>
                  )}
                  {hasExtended && (
                    <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)" }}>
                      {r.pageDepth != null ? (
                        <>{r.pageDepth.toFixed(2)}<DiffBadge cur={r.pageDepth} prev={r.prevPageDepth} hasCompare={hasCompare} /></>
                      ) : "—"}
                    </td>
                  )}
                  {hasExtended && (
                    <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)" }}>
                      {r.avgDuration != null ? (
                        <>{fmtTime(r.avgDuration)}<DiffBadge cur={r.avgDuration} prev={r.prevAvgDuration} hasCompare={hasCompare} /></>
                      ) : "—"}
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
