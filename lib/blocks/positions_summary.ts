import { TopvisorClient, buildSummaryData, PositionsSummaryData } from "@/lib/services/topvisor";

interface PositionsSummarySettings {
  scanDate?: string;        // override: specific scan date (YYYY-MM-DD)
  compareScanDate?: string; // override: specific compare scan date (YYYY-MM-DD)
  groupIds?: number[];      // filter: only these groups (empty = all)
}

export async function fetchPositionsSummary(
  client: TopvisorClient,
  projectId: number,
  settings: PositionsSummarySettings = {},
): Promise<PositionsSummaryData> {
  // Resolve scan dates: use explicit settings or fall back to last two scan dates
  let scanDate: string;
  let compareScanDate: string | null;

  if (settings.scanDate) {
    scanDate = settings.scanDate;
    compareScanDate = settings.compareScanDate ?? null;
  } else {
    const existsDates = await client.getExistsDates(projectId);
    if (existsDates.length === 0) {
      return {
        totalKeywords: 0, visibility: null,
        top1: 0, top3: 0, top5: 0, top10: 0,
        prevTop1: null, prevTop3: null, prevTop5: null, prevTop10: null,
        prevVisibility: null, scanDate: null, compareScanDate: null,
      };
    }
    scanDate = existsDates[existsDates.length - 1];
    compareScanDate = existsDates.length >= 2 ? existsDates[existsDates.length - 2] : null;
  }

  const dates = compareScanDate ? [scanDate, compareScanDate] : [scanDate];
  const result = await client.getPositionsHistory(
    projectId, dates, 1,
    settings.groupIds && settings.groupIds.length > 0 ? settings.groupIds : undefined,
  );
  return buildSummaryData(result, scanDate, compareScanDate);
}
