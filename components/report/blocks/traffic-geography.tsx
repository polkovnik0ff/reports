"use client";

import { DonutTable, DonutRow } from "./donut-table";
import { DimensionResult } from "@/lib/services/metrika";

const GEO_COLORS = [
  "#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ec4899",
  "#14b8a6", "#eab308", "#6b7280", "#0ea5e9", "#f43f5e",
  "#84cc16", "#8b5cf6", "#06b6d4", "#fb923c", "#e879f9",
  "#34d399", "#fbbf24", "#a3a3a3", "#60a5fa", "#f87171",
];

export function TrafficGeographyBlock({ data }: { data: DimensionResult }) {
  const rows: DonutRow[] = (data?.rows ?? []).map((item, i) => ({
    name:        item.name,
    visits:      item.visits,
    bounceRate:  item.bounceRate,
    pageDepth:   item.pageDepth,
    avgDuration: item.avgDuration,
    color:       GEO_COLORS[i % GEO_COLORS.length],
  }));

  return <DonutTable rows={rows} firstColLabel="Регион" />;
}
