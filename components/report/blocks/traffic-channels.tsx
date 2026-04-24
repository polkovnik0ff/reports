"use client";

import { DonutTable, DonutRow } from "./donut-table";
import { TrafficChannelsResult } from "@/lib/services/metrika";

const CHANNEL_COLORS: Record<string, string> = {
  organic:   "#22c55e",
  direct:    "#3b82f6",
  referral:  "#a855f7",
  ad:        "#f97316",
  social:    "#ec4899",
  recommend: "#14b8a6",
  internal:  "#64748b",
  email:     "#0ea5e9",
  messenger: "#eab308",
  saved:     "#6b7280",
};

function getChannelColor(id: string, idx: number): string {
  if (CHANNEL_COLORS[id]) return CHANNEL_COLORS[id];
  const fallbacks = ["#9ca3af", "#d97706", "#7c3aed", "#be185d"];
  return fallbacks[idx % fallbacks.length];
}

export function TrafficChannelsBlock({ data }: { data: TrafficChannelsResult }) {
  const rows: DonutRow[] = (data?.rows ?? []).map((item, i) => ({
    name:        item.name,
    visits:      item.visits,
    bounceRate:  item.bounceRate,
    pageDepth:   item.pageDepth,
    avgDuration: item.avgDuration,
    prevVisits:  item.prevVisits,
    color:       getChannelColor(item.id, i),
  }));

  return <DonutTable rows={rows} firstColLabel="Канал" metricLabel="Посетители" />;
}
