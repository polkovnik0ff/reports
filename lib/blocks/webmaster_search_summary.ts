import { WebmasterClient, WebmasterSearchSummaryData } from "@/lib/services/webmaster";

export async function fetchWebmasterSearchSummary(
  client: WebmasterClient,
  hostId: string,
  dateFrom: string,
  dateTo: string,
  compareFrom?: string,
  compareTo?: string,
): Promise<WebmasterSearchSummaryData> {
  return client.getSearchSummary(hostId, dateFrom, dateTo, compareFrom, compareTo);
}
