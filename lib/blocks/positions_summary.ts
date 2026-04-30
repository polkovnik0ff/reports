import { TopvisorClient, buildSummaryData, PositionsSummaryData } from "@/lib/services/topvisor";

export async function fetchPositionsSummary(
  client: TopvisorClient,
  projectId: number,
  dateTo: string,
  compareTo?: string
): Promise<PositionsSummaryData> {
  const dates = compareTo ? [dateTo, compareTo] : [dateTo];
  const result = await client.getPositionsHistory(projectId, dates);
  return buildSummaryData(result, !!compareTo);
}
