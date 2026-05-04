"use client";

import { DonutTable, DonutRow } from "./donut-table";
import { DimensionResult, DimensionRow } from "@/lib/services/metrika";

const GEO_COLORS = [
  "#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ec4899",
  "#14b8a6", "#eab308", "#6b7280", "#0ea5e9", "#f43f5e",
  "#84cc16", "#8b5cf6", "#06b6d4", "#fb923c", "#e879f9",
  "#34d399", "#fbbf24", "#a3a3a3", "#60a5fa", "#f87171",
];

function weightedAvg(rows: DimensionRow[], field: "bounceRate" | "pageDepth" | "avgDuration"): number {
  const total = rows.reduce((s, r) => s + r.visits, 0);
  if (total === 0) return 0;
  return rows.reduce((s, r) => s + r[field] * r.visits, 0) / total;
}

export function TrafficGeographyBlock({ data }: { data: DimensionResult }) {
  const allRows = data?.rows ?? [];
  const top6 = allRows.slice(0, 6);
  const rest = allRows.slice(6);

  const tableRows: (DimensionRow & { isOther?: boolean })[] = [...top6];
  if (rest.length > 0) {
    const otherVisits = rest.reduce((s, r) => s + r.visits, 0);
    tableRows.push({
      id: "__other__",
      name: "Другие",
      visits: otherVisits,
      bounceRate: weightedAvg(rest, "bounceRate"),
      pageDepth: weightedAvg(rest, "pageDepth"),
      avgDuration: weightedAvg(rest, "avgDuration"),
      isOther: true,
    });
  }

  const rows: DonutRow[] = tableRows.map((item, i) => ({
    name:            item.name,
    visits:          item.visits,
    bounceRate:      item.bounceRate,
    pageDepth:       item.pageDepth,
    avgDuration:     item.avgDuration,
    prevVisits:      (item as DimensionRow).prevVisits,
    prevBounceRate:  (item as DimensionRow).prevBounceRate,
    prevPageDepth:   (item as DimensionRow).prevPageDepth,
    prevAvgDuration: (item as DimensionRow).prevAvgDuration,
    color:           item.isOther ? "#9ca3af" : GEO_COLORS[i % GEO_COLORS.length],
  }));

  return <DonutTable rows={rows} firstColLabel="Регион" />;
}
