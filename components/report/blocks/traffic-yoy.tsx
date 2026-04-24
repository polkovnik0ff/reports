"use client";

import { AreaChartBlock } from "./area-chart-block";
import { DynamicsResult } from "@/lib/services/metrika";

export function TrafficYoYBlock({ data }: { data: DynamicsResult }) {
  return (
    <AreaChartBlock
      data={data}
      currentLabel="Текущий год"
      compareLabel="Прошлый год"
    />
  );
}
