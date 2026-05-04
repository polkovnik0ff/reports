"use client";

import { DonutTable, DonutRow } from "./donut-table";
import { DimensionResult } from "@/lib/services/metrika";

const DEVICE_COLORS: Record<string, string> = {
  desktop: "#3b82f6",
  mobile:  "#22c55e",
  tablet:  "#f97316",
  tv:      "#a855f7",
};

function getDeviceColor(id: string, idx: number): string {
  if (DEVICE_COLORS[id]) return DEVICE_COLORS[id];
  const fallbacks = ["#6b7280", "#14b8a6", "#eab308"];
  return fallbacks[idx % fallbacks.length];
}

export function TrafficDevicesBlock({ data }: { data: DimensionResult }) {
  const rows: DonutRow[] = (data?.rows ?? []).map((item, i) => ({
    name:            item.name,
    visits:          item.visits,
    bounceRate:      item.bounceRate,
    pageDepth:       item.pageDepth,
    avgDuration:     item.avgDuration,
    prevVisits:      item.prevVisits,
    prevBounceRate:  item.prevBounceRate,
    prevPageDepth:   item.prevPageDepth,
    prevAvgDuration: item.prevAvgDuration,
    color:           getDeviceColor(item.id, i),
  }));

  return <DonutTable rows={rows} firstColLabel="Устройство" />;
}
