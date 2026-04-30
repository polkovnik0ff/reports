import { TopvisorClient, buildTableData, PositionsTableData } from "@/lib/services/topvisor";

export async function fetchPositionsTable(
  client: TopvisorClient,
  projectId: number,
  dateTo: string,
  compareTo?: string
): Promise<PositionsTableData> {
  const dates = compareTo ? [dateTo, compareTo] : [dateTo];
  const result = await client.getPositionsHistory(projectId, dates);
  return buildTableData(result, !!compareTo);
}
