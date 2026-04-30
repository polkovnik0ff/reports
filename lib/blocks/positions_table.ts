import { TopvisorClient, buildTableData, PositionsTableData } from "@/lib/services/topvisor";

export async function fetchPositionsTable(
  client: TopvisorClient,
  projectId: number,
): Promise<PositionsTableData> {
  // Step 1: get all actual scan dates for this project
  const existsDates = await client.getExistsDates(projectId);
  if (existsDates.length === 0) {
    return { groups: [], ungrouped: [], scanDate: null, compareScanDate: null };
  }

  const scanDate = existsDates[existsDates.length - 1];
  const compareScanDate = existsDates.length >= 2 ? existsDates[existsDates.length - 2] : null;
  const dates = compareScanDate ? [scanDate, compareScanDate] : [scanDate];

  // Step 2: fetch positions for the last (and optionally second-to-last) scan date
  const result = await client.getPositionsHistory(projectId, dates);
  return buildTableData(result, scanDate, compareScanDate);
}
