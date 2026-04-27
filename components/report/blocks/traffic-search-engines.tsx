"use client";

import { DonutTable, DonutRow } from "./donut-table";
import { TrafficChannelsResult } from "@/lib/services/metrika";
import { getEngineColor } from "@/lib/utils/engine-colors";

export function TrafficSearchEnginesBlock({ data }: { data: TrafficChannelsResult }) {
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
    color:           getEngineColor(item.id, i),
  }));

  return <DonutTable rows={rows} firstColLabel="Поисковая система" hideTable />;

}
