import { TopvisorClient, buildMultiSearcherSummaryData, PositionsSummaryData } from "@/lib/services/topvisor";

interface PositionsSummarySettings {
  scanDate?: string;
  compareScanDate?: string;
  groupIds?: number[];      // ignored here — summary always covers all keywords
  regionIndex?: number;     // auto-detected and stored by TopvisorScanSettings UI
}

export async function fetchPositionsSummary(
  client: TopvisorClient,
  projectId: number,
  settings: PositionsSummarySettings = {},
): Promise<PositionsSummaryData> {
  // Discover all searchers (Яндекс / Google) for this project
  const allSearchers = await client.getProjectSearchers(projectId);

  // Resolve scan dates
  let scanDate: string;
  let compareScanDate: string | null;

  // settings.compareScanDate: undefined = not set (auto), "" = explicit "no comparison", "YYYY-MM-DD" = explicit date
  const hasExplicitSettings = settings.scanDate != null || settings.compareScanDate != null;

  if (hasExplicitSettings) {
    const { dates: existsDates } = await client.getExistsDates(projectId, settings.regionIndex);
    const lastDate = existsDates[existsDates.length - 1];
    scanDate = settings.scanDate ?? lastDate;
    if (!scanDate) {
      return {
        totalKeywords: 0, visibility: null,
        top1: 0, top3: 0, top5: 0, top10: 0,
        prevTop1: null, prevTop3: null, prevTop5: null, prevTop10: null,
        prevVisibility: null, scanDate: null, compareScanDate: null,
        bySearcher: [],
      };
    }
    compareScanDate = settings.compareScanDate === undefined
      ? (existsDates.length >= 2 ? existsDates[existsDates.length - 2] : null)
      : settings.compareScanDate || null;
  } else {
    // Fully automatic: use last two scan dates
    const { dates: existsDates } = await client.getExistsDates(projectId, settings.regionIndex);
    if (existsDates.length === 0) {
      return {
        totalKeywords: 0, visibility: null,
        top1: 0, top3: 0, top5: 0, top10: 0,
        prevTop1: null, prevTop3: null, prevTop5: null, prevTop10: null,
        prevVisibility: null, scanDate: null, compareScanDate: null,
        bySearcher: [],
      };
    }
    scanDate = existsDates[existsDates.length - 1];
    compareScanDate = existsDates.length >= 2 ? existsDates[existsDates.length - 2] : null;
  }

  const dates = compareScanDate ? [scanDate, compareScanDate] : [scanDate];

  if (allSearchers.length === 0) {
    // Fallback: no searcher info, single request
    const result = await client.getPositionsHistory(projectId, dates, settings.regionIndex ?? 1);
    return buildMultiSearcherSummaryData(
      [{ result, searcherName: "Яндекс", regionName: "" }],
      scanDate, compareScanDate,
    );
  }

  // Group searchers by (searcherName, searcherKey) — take the first region per searcher type
  const seenKeys = new Set<number>();
  const uniqueSearchers = allSearchers.filter((s) => {
    if (seenKeys.has(s.searcherKey)) return false;
    seenKeys.add(s.searcherKey);
    return true;
  });

  // Fetch positions for each searcher in parallel — no groupIds filter (summary = all keywords)
  const results = await Promise.all(
    uniqueSearchers.map(async (s) => {
      const result = await client.getPositionsHistory(projectId, dates, s.regionIndex);
      return { result, searcherName: s.searcherName, regionName: s.regionName };
    })
  );

  return buildMultiSearcherSummaryData(results, scanDate, compareScanDate);
}
