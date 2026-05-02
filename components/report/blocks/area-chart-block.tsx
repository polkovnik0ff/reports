"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DynamicsResult } from "@/lib/services/metrika";

interface AreaChartBlockProps {
  data: DynamicsResult;
  currentLabel?: string;
  compareLabel?: string;
}

function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function pctDiff(cur: number, cmp: number): number | null {
  if (cmp === 0) return null;
  return ((cur - cmp) / Math.abs(cmp)) * 100;
}

function KpiCard({
  label, cur, cmp, fmt, invertSign = false,
}: {
  label: string;
  cur: number;
  cmp?: number;
  fmt: (v: number) => string;
  invertSign?: boolean;
}) {
  const diff = cmp != null ? pctDiff(cur, cmp) : null;
  const isGood = diff == null ? null : invertSign ? diff < 0 : diff > 0;
  const isBad = diff == null ? null : invertSign ? diff > 0 : diff < 0;
  const arrow = diff == null ? null : diff > 0 ? "↑" : "↓";

  return (
    <div style={{
      background: "var(--r-bg-card)",
      border: "1px solid var(--r-hairline)",
      borderRadius: "var(--r-radius-s)",
      padding: "20px 24px",
    }}>
      <p style={{
        fontFamily: "var(--r-f-mono)",
        fontSize: 11,
        letterSpacing: "1px",
        textTransform: "uppercase",
        color: "var(--r-ink-mute)",
        marginBottom: 10,
      }}>{label}</p>
      <p style={{
        fontFamily: "var(--r-f-display)",
        fontWeight: 700,
        fontSize: 28,
        letterSpacing: "-0.02em",
        color: "var(--r-ink)",
        lineHeight: 1,
        marginBottom: diff != null ? 8 : 0,
      }}>
        {fmt(cur)}
        {diff != null && arrow && (
          <span style={{
            fontSize: 12,
            fontFamily: "var(--r-f-mono)",
            fontWeight: 600,
            marginLeft: 6,
            color: isGood ? "var(--r-green)" : isBad ? "var(--r-red)" : "var(--r-ink-mute)",
          }}>
            {arrow}{Math.abs(diff).toFixed(1)}%
          </span>
        )}
      </p>
      {cmp != null && (
        <p style={{ fontSize: 12, color: "var(--r-ink-mute)", fontFamily: "var(--r-f-mono)" }}>
          {fmt(cmp)}
        </p>
      )}
    </div>
  );
}

const CHART_TOOLTIP_STYLE = {
  background: "var(--r-bg-card-2)",
  border: "1px solid var(--r-hairline-2)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--r-ink)",
};

export function AreaChartBlock({
  data,
  currentLabel = "Текущий период",
  compareLabel = "Период сравнения",
}: AreaChartBlockProps) {
  const { current, comparison, currentKpi, comparisonKpi } = data ?? {};

  const labels = (current?.data ?? []).map((d) => {
    const raw = d.dimensions[0]?.name ?? "";
    const parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    }
    return raw;
  });

  const chartData = labels.map((label, i) => {
    const row    = current?.data?.[i];
    const cmpRow = comparison?.data?.[i];
    return {
      label,
      current: row?.metrics[0] ?? 0,
      compare: cmpRow?.metrics[0] ?? undefined,
    };
  });

  const hasComparison = comparison != null && chartData.some((d) => d.compare != null);
  const hasKpi = currentKpi != null;

  return (
    <div>
      <div style={{ height: 280, marginBottom: 32 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradCurrent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--r-accent)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--r-accent)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradCompare" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--r-yellow)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--r-yellow)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
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
            {hasComparison && (
              <Legend
                wrapperStyle={{ fontSize: 12, color: "var(--r-ink-dim)", fontFamily: "var(--r-f-mono)" }}
              />
            )}
            <Area
              type="monotone"
              dataKey="current"
              name={currentLabel}
              stroke="var(--r-accent)"
              strokeWidth={2}
              fill="url(#gradCurrent)"
              dot={false}
            />
            {hasComparison && (
              <Area
                type="monotone"
                dataKey="compare"
                name={compareLabel}
                stroke="var(--r-yellow)"
                strokeWidth={2}
                fill="url(#gradCompare)"
                dot={false}
                strokeDasharray="5 3"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {hasKpi && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
          <KpiCard
            label="Посетители"
            cur={currentKpi!.users}
            cmp={comparisonKpi?.users}
            fmt={(v) => v.toLocaleString("ru-RU")}
          />
          <KpiCard
            label="Визиты"
            cur={currentKpi!.visits}
            cmp={comparisonKpi?.visits}
            fmt={(v) => v.toLocaleString("ru-RU")}
          />
          <KpiCard
            label="Отказы"
            cur={currentKpi!.bounceRate}
            cmp={comparisonKpi?.bounceRate}
            fmt={(v) => `${v.toFixed(1)}%`}
            invertSign
          />
          <KpiCard
            label="Время на сайте"
            cur={currentKpi!.avgDuration}
            cmp={comparisonKpi?.avgDuration}
            fmt={fmtTime}
          />
        </div>
      )}
    </div>
  );
}
