"use client";

import { RankedTable } from "./ranked-table";
import { RankedResult } from "@/lib/services/metrika";

export function TopQueriesBlock({ data }: { data: RankedResult }) {
  return <RankedTable data={data} labelHeader="Фраза" />;
}
