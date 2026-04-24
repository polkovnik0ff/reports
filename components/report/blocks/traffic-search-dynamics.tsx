"use client";

import { AreaChartBlock } from "./area-chart-block";
import { DynamicsResult } from "@/lib/services/metrika";

export function TrafficSearchDynamicsBlock({ data }: { data: DynamicsResult }) {
  return (
    <AreaChartBlock
      data={data}
      currentLabel="Поисковый трафик"
      compareLabel="Период сравнения"
    />
  );
}
