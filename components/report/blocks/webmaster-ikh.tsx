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
import { WebmasterIkhData } from "@/lib/services/webmaster";

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

interface Props {
  data: WebmasterIkhData;
}

const CHART_TOOLTIP_STYLE = {
  background: "var(--r-bg-card-2)",
  border: "1px solid var(--r-hairline-2)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--r-ink)",
};

export function WebmasterIkhBlock({ data }: Props) {
  if (!data.points || data.points.length === 0) {
    return (
      <p style={{ fontSize: 14, color: "var(--r-ink-mute)", fontStyle: "italic" }}>
        Нет данных об ИКС за выбранный период
      </p>
    );
  }

  const last = data.points[data.points.length - 1];

  return (
    <div>
      {/* KPI */}
      <div style={{ marginBottom: 32 }}>
        <p style={{
          fontFamily: "var(--r-f-mono)",
          fontSize: 11,
          letterSpacing: "1px",
          textTransform: "uppercase",
          color: "var(--r-ink-mute)",
          marginBottom: 10,
        }}>Текущий ИКС</p>
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
            width={50}
            tickFormatter={(v) => v.toLocaleString("ru-RU")}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(iso: any) => fmtDate(String(iso))}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any) => [Number(v).toLocaleString("ru-RU"), "ИКС"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--r-cyan)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "var(--r-cyan)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
