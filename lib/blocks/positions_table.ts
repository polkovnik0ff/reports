import { TopvisorClient, buildTableData, PositionsTableData } from "@/lib/services/topvisor";

interface PositionsTableSettings {
  scanDate?: string;        // override: specific scan date (YYYY-MM-DD)
  compareScanDate?: string; // override: specific compare scan date (YYYY-MM-DD)
  groupIds?: number[];      // filter: only these groups (empty = all)
}

export async function fetchPositionsTable(
  client: TopvisorClient,
  projectId: number,
  settings: PositionsTableSettings = {},
): Promise<PositionsTableData> {
  let scanDate: string;
  let compareScanDate: string | null;

  if (settings.scanDate) {
    scanDate = settings.scanDate;
    compareScanDate = settings.compareScanDate ?? null;
  } else {
    const existsDates = await client.getExistsDates(projectId);
    if (existsDates.length === 0) {
      return { groups: [], ungrouped: [], scanDate: null, compareScanDate: null };
    }
    scanDate = existsDates[existsDates.length - 1];
    compareScanDate = existsDates.length >= 2 ? existsDates[existsDates.length - 2] : null;
  }

  const dates = compareScanDate ? [scanDate, compareScanDate] : [scanDate];
  const result = await client.getPositionsHistory(
    projectId, dates, 1,
    settings.groupIds && settings.groupIds.length > 0 ? settings.groupIds : undefined,
  );
  return buildTableData(result, scanDate, compareScanDate);
}
