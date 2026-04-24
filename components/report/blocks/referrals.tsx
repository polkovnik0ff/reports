"use client";

import { RankedTable } from "./ranked-table";
import { RankedResult } from "@/lib/services/metrika";

export function ReferralsBlock({ data }: { data: RankedResult }) {
  return <RankedTable data={data} labelHeader="Источник" truncateUrl />;
}
