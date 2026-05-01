import { WebmasterClient, WebmasterBacklinksData } from "@/lib/services/webmaster";

export async function fetchWebmasterBacklinks(
  client: WebmasterClient,
  hostId: string,
  dateFrom: string,
  dateTo: string,
): Promise<WebmasterBacklinksData> {
  return client.getBacklinksHistory(hostId, dateFrom, dateTo);
}
