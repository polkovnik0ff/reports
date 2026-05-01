import { WebmasterClient, WebmasterIndexingData } from "@/lib/services/webmaster";

export async function fetchWebmasterIndexing(
  client: WebmasterClient,
  hostId: string,
  dateFrom: string,
  dateTo: string,
): Promise<WebmasterIndexingData> {
  return client.getIndexingHistory(hostId, dateFrom, dateTo);
}
