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
import { DonutRow } from "./donut-table";
import { getEngineColor } from "@/lib/utils/engine-colors";

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
  const diff = pctDiff(cur, prev);
  if (diff == null) return null;
  const up = diff > 0;
  return (
    <span style={{ fontSize: 9, fontWeight: 700, color: up ? "var(--r-green)" : "var(--r-red)", marginLeft: 3, verticalAlign: "super", lineHeight: 1 }}>
      {up ? "↑" : "↓"}{Math.abs(diff).toFixed(1)}%
    </span>
  );
}

interface Props {
  dynamicsData: SearchEnginesDynamicsResult | null;
  tableData: TrafficChannelsResult | null;
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

export function SearchEnginesDynamicsBlock({ dynamicsData, tableData }: Props) {
  const hasDynamics = dynamicsData && dynamicsData.dates.length > 0 && dynamicsData.series.length > 0;
  const hasTable = tableData && (tableData.rows?.length ?? 0) > 0;

  if (!hasDynamics && !hasTable) {
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

  const chartData = hasDynamics
    ? dynamicsData.dates.map((date, i) => {
        const raw = new Date(date);
        const label = !isNaN(raw.getTime())
          ? raw.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })
          : date;
        const point: Record<string, string | number> = { label };
        for (const s of dynamicsData.series) {
          point[s.name] = s.data[i] ?? 0;
        }
        return point;
      })
    : [];

  const tableRows: DonutRow[] = hasTable
    ? (tableData.rows ?? []).map((item, i) => ({
        name:            item.name,
        visits:          item.visits,
        bounceRate:      item.bounceRate,
        pageDepth:       item.pageDepth,
        avgDuration:     item.avgDuration,
        prevVisits:      item.prevVisits,
        prevBounceRate:  item.prevBounceRate,
        prevPageDepth:   item.prevPageDepth,
        prevAvgDuration: item.prevAvgDuration,
        color:           getEngineColor(item.id, i),
      }))
    : [];

  const hasCompare = tableRows.some((r) => r.prevVisits != null);

  return (
    <div>
      {hasDynamics && (
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 20 }}>
            {dynamicsData.series.map((s) => (
              <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: "var(--r-ink-dim)" }}>{s.name}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 280 }}>
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
                {dynamicsData.series.map((s) => (
                  <Line
                    key={s.name}
                    type="monotone"
                    dataKey={s.name}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {hasTable && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ ...TH, textAlign: "center", width: 44 }}>№</th>
                <th style={TH}>Поисковая система</th>
                <th style={{ ...TH, textAlign: "right" }}>Посетители</th>
                <th style={{ ...TH, textAlign: "right" }}>Отказы</th>
                <th style={{ ...TH, textAlign: "right" }}>Глубина</th>
                <th style={{ ...TH, textAlign: "right" }}>Время</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                  <td style={{ ...TD, textAlign: "center", fontFamily: "var(--r-f-mono)", fontSize: 12, color: "var(--r-ink-mute)" }}>{i + 1}</td>
                  <td style={TD}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                      {r.name}
                    </div>
                  </td>
                  <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)", color: "var(--r-ink)", fontWeight: 500 }}>
                    {r.visits.toLocaleString("ru-RU")}
                    <DiffBadge cur={r.visits} prev={r.prevVisits} hasCompare={hasCompare} />
                  </td>
                  <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)" }}>
                    {r.bounceRate != null ? (
                      <>{r.bounceRate.toFixed(1)}%<DiffBadge cur={r.bounceRate} prev={r.prevBounceRate} hasCompare={hasCompare} /></>
                    ) : "—"}
                  </td>
                  <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)" }}>
                    {r.pageDepth != null ? (
                      <>{r.pageDepth.toFixed(2)}<DiffBadge cur={r.pageDepth} prev={r.prevPageDepth} hasCompare={hasCompare} /></>
                    ) : "—"}
                  </td>
                  <td style={{ ...TD, textAlign: "right", fontFamily: "var(--r-f-mono)" }}>
                    {r.avgDuration != null ? (
                      <>{fmtTime(r.avgDuration)}<DiffBadge cur={r.avgDuration} prev={r.prevAvgDuration} hasCompare={hasCompare} /></>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
