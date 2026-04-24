"use client";

import { RankedTable } from "./ranked-table";
import { RankedResult } from "@/lib/services/metrika";

export function TopPagesBlock({ data }: { data: RankedResult }) {
  return <RankedTable data={data} labelHeader="URL" truncateUrl />;
}
