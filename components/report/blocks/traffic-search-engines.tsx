"use client";

import { DonutTable, DonutRow } from "./donut-table";
import { MetrikaReportData } from "@/lib/services/metrika";

interface TrafficSearchEnginesData {
  current: MetrikaReportData;
  comparison: MetrikaReportData | null;
}

function getColor(name: string, idx: number): string {
  const lower = name.toLowerCase();
  if (lower.includes("yandex") || lower.includes("яндекс")) return "#f97316";
  if (lower.includes("google")) return "#3b82f6";
  const fallbacks = ["#6b7280", "#a855f7", "#22c55e", "#ec4899", "#14b8a6"];
  return fallbacks[idx % fallbacks.length];
}

export function TrafficSearchEnginesBlock({ data }: { data: TrafficSearchEnginesData }) {
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
