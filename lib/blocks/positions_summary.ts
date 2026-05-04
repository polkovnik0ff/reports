import { TopvisorClient, buildMultiSearcherSummaryData, PositionsSummaryData } from "@/lib/services/topvisor";

interface PositionsSummarySettings {
  scanDate?: string;
  compareScanDate?: string;
  groupIds?: number[];      // ignored here — summary always covers all keywords
  regionIndex?: number;     // auto-detected and stored by TopvisorScanSettings UI
}

const EMPTY: PositionsSummaryData = {
  totalKeywords: 0, visibility: null,
  top1: 0, top3: 0, top5: 0, top10: 0,
  prevTop1: null, prevTop3: null, prevTop5: null, prevTop10: null,
  prevVisibility: null, scanDate: null, compareScanDate: null,
  bySearcher: [],
};

export async function fetchPositionsSummary(
  client: TopvisorClient,
  projectId: number,
  settings: PositionsSummarySettings = {},
): Promise<PositionsSummaryData> {
  // Discover all searchers (Яндекс / Google) and the region that actually has scan data.
  // getExistsDates probes regions in order and returns the first with real history —
  // this is the authoritative region index to use for data fetches.
  const [allSearchers, { dates: existsDates, regionIndex: detectedRegion }] = await Promise.all([
    client.getProjectSearchers(projectId),
    client.getExistsDates(projectId, settings.regionIndex),
  ]);

  // Resolve scan dates
  // settings.compareScanDate: undefined = auto, "" = no comparison, "YYYY-MM-DD" = explicit
  const hasExplicitSettings = settings.scanDate != null || settings.compareScanDate != null;

  let scanDate: string;
  let compareScanDate: string | null;

  if (hasExplicitSettings) {
    scanDate = settings.scanDate ?? existsDates[existsDates.length - 1];
    if (!scanDate) return EMPTY;
    compareScanDate = settings.compareScanDate === undefined
      ? (existsDates.length >= 2 ? existsDates[existsDates.length - 2] : null)
      : settings.compareScanDate || null;
  } else {
    if (existsDates.length === 0) return EMPTY;
    scanDate = existsDates[existsDates.length - 1];
    compareScanDate = existsDates.length >= 2 ? existsDates[existsDates.length - 2] : null;
  }

  const dates = compareScanDate ? [scanDate, compareScanDate] : [scanDate];

  if (allSearchers.length === 0) {
    const result = await client.getPositionsHistory(projectId, dates, detectedRegion);
    return buildMultiSearcherSummaryData(
      [{ result, searcherName: "Яндекс", regionName: "" }],
      scanDate, compareScanDate,
    );
  }

  // Group regions by searcherKey, then for each searcher find the region with real data.
  // Each searcher (Yandex/Google) may use a different region index — detect independently.
  const seenKeys = new Set<number>();
  const searcherGroups: { searcherKey: number; regions: typeof allSearchers }[] = [];
  for (const s of allSearchers) {
    if (seenKeys.has(s.searcherKey)) continue;
    seenKeys.add(s.searcherKey);
    searcherGroups.push({
      searcherKey: s.searcherKey,
      regions: allSearchers.filter((x) => x.searcherKey === s.searcherKey),
    });
  }

  // For each searcher, pick the first region that has actual scan data (parallel per searcher).
  const uniqueSearchers = await Promise.all(
    searcherGroups.map(async ({ regions }) => {
      for (const region of regions) {
        const { dates: d } = await client.getExistsDates(projectId, region.regionIndex);
        if (d.length > 0) return region;
      }
      return regions[0];
    })
  );

  const results = await Promise.all(
    uniqueSearchers.map(async (s) => {
      const result = await client.getPositionsHistory(projectId, dates, s.regionIndex);
      return { result, searcherName: s.searcherName, regionName: s.regionName };
    })
  );

  return buildMultiSearcherSummaryData(results, scanDate, compareScanDate);
}
