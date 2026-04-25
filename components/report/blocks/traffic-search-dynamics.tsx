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
import { SearchEnginesDynamicsResult } from "@/lib/services/metrika";

// Same color logic as traffic-search-engines.tsx
function getEngineColor(name: string, idx: number): string {
  const lower = name.toLowerCase();
  if (lower.includes("яндекс") || lower.includes("yandex")) return "#FF7A00";
  if (lower.includes("google")) return "#4285F4";
  if (lower.includes("bing")) return "#008373";
  if (lower.includes("mail") || lower.includes("мейл") || lower.includes("mail.ru")) return "#005FF9";
  const fallbacks = ["#6b7280", "#a855f7", "#22c55e", "#14b8a6", "#eab308"];
  return fallbacks[idx % fallbacks.length];
}

export function TrafficSearchDynamicsBlock({ data }: { data: SearchEnginesDynamicsResult }) {
  if (!data || data.dates.length === 0) {
    return (
      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-6 text-center text-sm text-gray-400 italic">
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

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-3">
        {data.series.map((s, i) => (
          <div key={s.name} className="flex items-center gap-1.5 text-sm text-gray-600">
            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: getEngineColor(s.name, i) }} />
            {s.name}
          </div>
        ))}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6 }} />
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
    </div>
  );
}
