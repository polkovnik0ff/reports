"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { WebmasterIndexingData } from "@/lib/services/webmaster";

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

interface Props {
  data: WebmasterIndexingData;
}

const CHART_TOOLTIP_STYLE = {
  background: "var(--r-bg-card-2)",
  border: "1px solid var(--r-hairline-2)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--r-ink)",
};

export function WebmasterIndexingBlock({ data }: Props) {
  if (!data.points && data.currentIndexed == null) {
    return (
      <p style={{ fontSize: 14, color: "var(--r-ink-mute)", fontStyle: "italic" }}>
        Нет данных об индексировании
      </p>
    );
  }

  const points = data.points ?? [];
  const last = points[points.length - 1];
  const kpiIndexed  = data.currentIndexed  ?? last?.indexed  ?? 0;
  const kpiExcluded = data.currentExcluded ?? last?.excluded ?? 0;

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 24, marginBottom: 40 }}>
        <div style={{
          background: "var(--r-bg-card)",
          border: "1px solid var(--r-hairline)",
          borderRadius: "var(--r-radius-s)",
          padding: "20px 28px",
          flex: "1 1 160px",
        }}>
          <p style={{
            fontFamily: "var(--r-f-mono)",
            fontSize: 11,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "var(--r-ink-mute)",
            marginBottom: 10,
          }}>Страниц в поиске</p>
          <p style={{
            fontFamily: "var(--r-f-display)",
            fontWeight: 700,
            fontSize: 44,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: "var(--r-green)",
          }}>
            {kpiIndexed.toLocaleString("ru-RU")}
          </p>
        </div>
        <div style={{
          background: "var(--r-bg-card)",
          border: "1px solid var(--r-hairline)",
          borderRadius: "var(--r-radius-s)",
          padding: "20px 28px",
          flex: "1 1 160px",
        }}>
          <p style={{
            fontFamily: "var(--r-f-mono)",
            fontSize: 11,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "var(--r-ink-mute)",
            marginBottom: 10,
          }}>Исключено</p>
          <p style={{
            fontFamily: "var(--r-f-display)",
            fontWeight: 700,
            fontSize: 44,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            color: "var(--r-red)",
          }}>
            {kpiExcluded.toLocaleString("ru-RU")}
          </p>
        </div>
      </div>

      {points.length > 0 && (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={points} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="gradIndexed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--r-green)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--r-green)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradExcluded" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--r-red)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--r-red)" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              width={55}
              tickFormatter={(v) => v.toLocaleString("ru-RU")}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              labelFormatter={(iso: any) => fmtDate(String(iso))}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any, name: any) => [
                Number(v).toLocaleString("ru-RU"),
                name === "indexed" ? "В поиске" : "Исключено",
              ]}
            />
            <Legend
              formatter={(v) => v === "indexed" ? "В поиске" : "Исключено"}
              wrapperStyle={{ fontSize: 12, fontFamily: "var(--r-f-mono)", color: "var(--r-ink-dim)" }}
            />
            <Area
              type="monotone"
              dataKey="indexed"
              stroke="var(--r-green)"
              strokeWidth={2}
              fill="url(#gradIndexed)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="excluded"
              stroke="var(--r-red)"
              strokeWidth={2}
              fill="url(#gradExcluded)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
