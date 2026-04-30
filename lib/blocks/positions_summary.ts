import { TopvisorClient, buildSummaryData, PositionsSummaryData } from "@/lib/services/topvisor";

export async function fetchPositionsSummary(
  client: TopvisorClient,
  projectId: number,
): Promise<PositionsSummaryData> {
  // Step 1: get all actual scan dates for this project
  const existsDates = await client.getExistsDates(projectId);
  if (existsDates.length === 0) {
    return {
      totalKeywords: 0,
      visibility: null,
      top1: 0, top3: 0, top5: 0, top10: 0,
      prevTop1: null, prevTop3: null, prevTop5: null, prevTop10: null,
      prevVisibility: null,
      scanDate: null,
      compareScanDate: null,
    };
  }

  const scanDate = existsDates[existsDates.length - 1];
  const compareScanDate = existsDates.length >= 2 ? existsDates[existsDates.length - 2] : null;
  const dates = compareScanDate ? [scanDate, compareScanDate] : [scanDate];

  // Step 2: fetch positions for the last (and optionally second-to-last) scan date
  const result = await client.getPositionsHistory(projectId, dates);
  return buildSummaryData(result, scanDate, compareScanDate);
}
