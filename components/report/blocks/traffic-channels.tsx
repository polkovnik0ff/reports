"use client";

import { DonutTable, DonutRow } from "./donut-table";
import { MetrikaReportData } from "@/lib/services/metrika";

interface TrafficChannelsData {
  current: MetrikaReportData;
  comparison: MetrikaReportData | null;
}

const CHANNEL_COLORS: Record<string, string> = {
  "Прямые": "#3b82f6",
  "Поисковые системы": "#22c55e",
  "Переходы по рекламе": "#f97316",
  "Переходы по ссылкам на сайтах": "#a855f7",
  "Социальные сети": "#ec4899",
  "organic": "#22c55e",
  "direct": "#3b82f6",
  "referral": "#a855f7",
  "ad": "#f97316",
  "social": "#ec4899",
};

function getColor(name: string, idx: number): string {
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(CHANNEL_COLORS)) {
    if (lower.includes(key.toLowerCase())) return color;
  }
  const fallbacks = ["#6b7280", "#14b8a6", "#eab308", "#64748b", "#0ea5e9"];
  return fallbacks[idx % fallbacks.length];
}

export function TrafficChannelsBlock({ data }: { data: TrafficChannelsData }) {
  const rows: DonutRow[] = (data.current?.data ?? []).map((item, i) => ({
    name: item.dimensions[0]?.name ?? "Другое",
    visits: item.metrics[0] ?? 0,
    bounce: item.metrics[1],
    depth: item.metrics[2],
    duration: item.metrics[3],
    color: getColor(item.dimensions[0]?.name ?? "", i),
  }));

  return <DonutTable rows={rows} />;
}
