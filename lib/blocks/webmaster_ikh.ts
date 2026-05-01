import { WebmasterClient, WebmasterIkhData } from "@/lib/services/webmaster";

export async function fetchWebmasterIkh(
  client: WebmasterClient,
  hostId: string,
  dateFrom: string,
  dateTo: string,
): Promise<WebmasterIkhData> {
  return client.getSqiHistory(hostId, dateFrom, dateTo);
}
