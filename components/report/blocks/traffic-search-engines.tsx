"use client";

import { DonutTable, DonutRow } from "./donut-table";
import { TrafficChannelsResult } from "@/lib/services/metrika";

function getEngineColor(id: string, idx: number): string {
  const lower = id.toLowerCase();
  if (lower.includes("yandex") || lower.includes("яндекс")) return "#f97316";
  if (lower.includes("google")) return "#3b82f6";
  if (lower.includes("bing")) return "#0ea5e9";
  if (lower.includes("mail")) return "#ec4899";
  const fallbacks = ["#6b7280", "#a855f7", "#22c55e", "#14b8a6", "#eab308"];
  return fallbacks[idx % fallbacks.length];
}

export function TrafficSearchEnginesBlock({ data }: { data: TrafficChannelsResult }) {
  const rows: DonutRow[] = (data?.rows ?? []).map((item, i) => ({
    name:        item.name,
    visits:      item.visits,
    bounceRate:  item.bounceRate,
    pageDepth:   item.pageDepth,
    avgDuration: item.avgDuration,
    prevVisits:  item.prevVisits,
    color:       getEngineColor(item.id, i),
  }));

  return <DonutTable rows={rows} firstColLabel="Поисковая система" />;
}
