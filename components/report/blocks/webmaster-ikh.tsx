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

export function WebmasterIkhBlock({ data }: Props) {
  if (!data.points || data.points.length === 0) {
    return <p className="text-sm text-muted-foreground">Нет данных об ИКС за выбранный период</p>;
  }

  const last = data.points[data.points.length - 1];
  const prev = data.points[0];
  const delta = last.value - prev.value;

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="flex items-end gap-4">
        <div>
          <p className="text-xs text-muted-foreground">Текущий ИКС</p>
          <p className="text-3xl font-bold tabular-nums">{last.value.toLocaleString("ru-RU")}</p>
        </div>
        {delta !== 0 && (
          <p className={`text-sm font-medium mb-1 ${delta > 0 ? "text-green-600" : "text-red-500"}`}>
            {delta > 0 ? "+" : ""}{delta.toLocaleString("ru-RU")} за период
          </p>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data.points} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tickFormatter={fmtDate}
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={50}
            tickFormatter={(v) => v.toLocaleString("ru-RU")}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(iso: any) => fmtDate(String(iso))}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any) => [Number(v).toLocaleString("ru-RU"), "ИКС"]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
