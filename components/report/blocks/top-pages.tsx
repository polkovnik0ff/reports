"use client";

import { RankedTable } from "./ranked-table";
import { MetrikaReportData } from "@/lib/services/metrika";

interface TopPagesData {
  current: MetrikaReportData;
  comparison: MetrikaReportData | null;
}

export function TopPagesBlock({ data }: { data: TopPagesData }) {
  return (
    <RankedTable
      data={data.current}
      comparison={data.comparison}
      labelHeader="URL"
      truncateUrl
    />
  );
}
