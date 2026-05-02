"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { WebmasterBacklinksData } from "@/lib/services/webmaster";

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

interface Props {
  data: WebmasterBacklinksData;
}

const CHART_TOOLTIP_STYLE = {
  background: "var(--r-bg-card-2)",
  border: "1px solid var(--r-hairline-2)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--r-ink)",
};

export function WebmasterBacklinksBlock({ data }: Props) {
  if (!data.points || data.points.length === 0) {
    return (
      <p style={{ fontSize: 14, color: "var(--r-ink-mute)", fontStyle: "italic" }}>
        Нет данных о внешних ссылках за выбранный период
      </p>
    );
  }

  const last  = data.points[data.points.length - 1];
  const first = data.points[0];
  const delta = last.value - first.value;

  return (
    <div>
      {/* KPI */}
      <div style={{ marginBottom: 32, display: "flex", alignItems: "flex-end", gap: 20 }}>
        <div>
          <p style={{
            fontFamily: "var(--r-f-mono)",
            fontSize: 11,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "var(--r-ink-mute)",
            marginBottom: 10,
          }}>Внешних ссылок</p>
          <p style={{
            fontFamily: "var(--r-f-display)",
            fontWeight: 700,
            fontSize: 56,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            color: "var(--r-ink)",
          }}>
            {last.value.toLocaleString("ru-RU")}
          </p>
        </div>
        {delta !== 0 && (
          <div style={{
            fontFamily: "var(--r-f-mono)",
            fontSize: 13,
            fontWeight: 600,
            color: delta > 0 ? "var(--r-green)" : "var(--r-red)",
            background: delta > 0 ? "rgba(74,222,128,0.1)" : "rgba(255,89,99,0.1)",
            borderRadius: 6,
            padding: "4px 10px",
            marginBottom: 6,
          }}>
            {delta > 0 ? "+" : ""}{delta.toLocaleString("ru-RU")} за период
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data.points} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--r-hairline)" />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fontSize: 11, fill: "var(--r-ink-mute)", fontFamily: "var(--r-f-mono)" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--r-ink-mute)", fontFamily: "var(--r-f-mono)" }}
            tickLine={false}
            axisLine={false}
            width={60}
            tickFormatter={(v) => v.toLocaleString("ru-RU")}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(iso: any) => fmtDate(String(iso))}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any) => [Number(v).toLocaleString("ru-RU"), "Ссылок"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--r-accent)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "var(--r-accent)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
