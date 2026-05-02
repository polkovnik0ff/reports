import { GscClient, GscSummaryData } from "@/lib/services/gsc";

export async function fetchGscSummary(
  client: GscClient,
  siteUrl: string,
  dateFrom: string,
  dateTo: string,
  compareFrom?: string,
  compareTo?: string,
): Promise<GscSummaryData> {
  return client.getSummary(siteUrl, dateFrom, dateTo, compareFrom, compareTo);
}
