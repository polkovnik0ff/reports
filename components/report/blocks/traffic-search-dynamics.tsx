"use client";

import { AreaChartBlock } from "./area-chart-block";
import { MetrikaReportData } from "@/lib/services/metrika";

interface SearchDynamicsData {
  current: MetrikaReportData;
  comparison: MetrikaReportData | null;
}

export function TrafficSearchDynamicsBlock({ data }: { data: SearchDynamicsData }) {
  return (
    <AreaChartBlock
      current={data.current}
      comparison={data.comparison}
      currentLabel="Поисковый трафик"
      compareLabel="Период сравнения"
    />
  );
}
