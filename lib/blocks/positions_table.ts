import { TopvisorClient, buildTableData, PositionsTableData } from "@/lib/services/topvisor";

interface PositionsTableSettings {
  scanDate?: string;        // override: specific scan date (YYYY-MM-DD)
  compareScanDate?: string; // override: specific compare scan date (YYYY-MM-DD)
  groupIds?: number[];      // filter: only these groups (empty = all)
  regionIndex?: number;     // auto-detected and stored by TopvisorScanSettings UI
}

export async function fetchPositionsTable(
  client: TopvisorClient,
  projectId: number,
  settings: PositionsTableSettings = {},
): Promise<PositionsTableData> {
  let scanDate: string;
  let compareScanDate: string | null;

  let regionIndex = settings.regionIndex ?? 1;

  // settings.compareScanDate: undefined = not set (auto), "" = explicit "no comparison", "YYYY-MM-DD" = explicit date
  const hasExplicitSettings = settings.scanDate != null || settings.compareScanDate != null;

  if (hasExplicitSettings) {
    const { dates: existsDates, regionIndex: detectedIdx } = await client.getExistsDates(projectId, settings.regionIndex);
    regionIndex = detectedIdx;
    const lastDate = existsDates[existsDates.length - 1];
    scanDate = settings.scanDate ?? lastDate;
    if (!scanDate) return { groups: [], ungrouped: [], scanDate: null, compareScanDate: null };
    compareScanDate = settings.compareScanDate === undefined
      ? (existsDates.length >= 2 ? existsDates[existsDates.length - 2] : null)
      : settings.compareScanDate || null;
  } else {
    const { dates: existsDates, regionIndex: detectedIdx } = await client.getExistsDates(projectId);
    regionIndex = detectedIdx;
    if (existsDates.length === 0) {
      return { groups: [], ungrouped: [], scanDate: null, compareScanDate: null };
    }
    scanDate = existsDates[existsDates.length - 1];
    compareScanDate = existsDates.length >= 2 ? existsDates[existsDates.length - 2] : null;
  }

  const dates = compareScanDate ? [scanDate, compareScanDate] : [scanDate];
  const result = await client.getPositionsHistory(
    projectId, dates, regionIndex,
    settings.groupIds && settings.groupIds.length > 0 ? settings.groupIds : undefined,
  );
  return buildTableData(result, scanDate, compareScanDate);
}
