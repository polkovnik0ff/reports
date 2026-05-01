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

export function WebmasterIndexingBlock({ data }: Props) {
  if (!data.points && data.currentIndexed == null) {
    return <p className="text-sm text-muted-foreground">Нет данных об индексировании</p>;
  }

  // KPI: prefer summary values (actual index), fall back to last history point
  const points = data.points ?? [];
  const last = points[points.length - 1];
  const kpiIndexed = data.currentIndexed ?? last?.indexed ?? 0;
  const kpiExcluded = data.currentExcluded ?? last?.excluded ?? 0;

  return (
    <div className="space-y-4">
      {/* KPI */}
      <div className="flex flex-wrap gap-6">
        <div>
          <p className="text-xs text-muted-foreground">Страниц в поиске</p>
          <p className="text-3xl font-bold tabular-nums text-green-600">
            {kpiIndexed.toLocaleString("ru-RU")}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Исключено</p>
          <p className="text-3xl font-bold tabular-nums text-red-500">
            {kpiExcluded.toLocaleString("ru-RU")}
          </p>
        </div>
      </div>

      {/* Chart — показываем только если есть исторические точки */}
      {points.length > 0 && <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={points} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gradIndexed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradExcluded" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
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
            width={55}
            tickFormatter={(v) => v.toLocaleString("ru-RU")}
          />
          <Tooltip
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
            wrapperStyle={{ fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="indexed"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#gradIndexed)"
            dot={false}
          />
          <Area
            type="monotone"
            dataKey="excluded"
            stroke="#ef4444"
            strokeWidth={2}
            fill="url(#gradExcluded)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>}
    </div>
  );
}
