"use client";

import { RankedTable } from "./ranked-table";
import { MetrikaReportData } from "@/lib/services/metrika";

interface TopQueriesData {
  current: MetrikaReportData;
  comparison: MetrikaReportData | null;
}

export function TopQueriesBlock({ data }: { data: TopQueriesData }) {
  return (
    <RankedTable
      data={data.current}
      comparison={data.comparison}
      labelHeader="Фраза"
    />
  );
}
