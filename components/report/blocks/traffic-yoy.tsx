"use client";

import { AreaChartBlock } from "./area-chart-block";
import { MetrikaReportData } from "@/lib/services/metrika";

interface TrafficYoYData {
  current: MetrikaReportData;
  comparison: MetrikaReportData | null;
}

export function TrafficYoYBlock({ data }: { data: TrafficYoYData }) {
  return (
    <AreaChartBlock
      current={data.current}
      comparison={data.comparison}
      currentLabel="Текущий год"
      compareLabel="Прошлый год"
    />
  );
}
