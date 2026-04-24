"use client";

import { DonutTable, DonutRow } from "./donut-table";
import { MetrikaReportData } from "@/lib/services/metrika";

const GEO_COLORS = [
  "#3b82f6", "#22c55e", "#f97316", "#a855f7", "#ec4899",
  "#14b8a6", "#eab308", "#6b7280", "#0ea5e9", "#f43f5e",
];

export function TrafficGeographyBlock({ data }: { data: MetrikaReportData }) {
  const rows: DonutRow[] = (data?.data ?? []).slice(0, 10).map((item, i) => ({
    name: item.dimensions[0]?.name ?? "Другое",
    visits: item.metrics[0] ?? 0,
    bounce: item.metrics[1],
    depth: item.metrics[2],
    duration: item.metrics[3],
    color: GEO_COLORS[i % GEO_COLORS.length],
  }));

  return <DonutTable rows={rows} />;
}
