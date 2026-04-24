"use client";

import { RankedTable } from "./ranked-table";
import { MetrikaReportData } from "@/lib/services/metrika";

export function ReferralsBlock({ data }: { data: MetrikaReportData }) {
  return (
    <RankedTable
      data={data}
      comparison={null}
      labelHeader="Источник"
      truncateUrl
    />
  );
}
