"use client";

import { DonutTable, DonutRow } from "./donut-table";
import { MetrikaReportData } from "@/lib/services/metrika";

const DEVICE_COLORS: Record<string, string> = {
  desktop: "#3b82f6",
  mobile: "#22c55e",
  tablet: "#f97316",
  пк: "#3b82f6",
  смартфон: "#22c55e",
  планшет: "#f97316",
};

function getDeviceColor(name: string, idx: number): string {
  const lower = name.toLowerCase();
  for (const [key, color] of Object.entries(DEVICE_COLORS)) {
    if (lower.includes(key)) return color;
  }
  const fallbacks = ["#6b7280", "#a855f7", "#14b8a6"];
  return fallbacks[idx % fallbacks.length];
}

export function TrafficDevicesBlock({ data }: { data: MetrikaReportData }) {
  const rows: DonutRow[] = (data?.data ?? []).map((item, i) => ({
    name: item.dimensions[0]?.name ?? "Другое",
    visits: item.metrics[0] ?? 0,
    bounce: item.metrics[1],
    depth: item.metrics[2],
    duration: item.metrics[3],
    color: getDeviceColor(item.dimensions[0]?.name ?? "", i),
  }));

  return <DonutTable rows={rows} />;
}
