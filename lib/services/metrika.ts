const BASE = "https://api-metrika.yandex.net";

export interface MetrikaCounter {
  id: number;
  name: string;
  site: string;
}

export interface MetrikaReportData {
  data: Array<{
    dimensions: Array<{ name: string; id?: string }>;
    metrics: number[];
  }>;
  totals: number[];
  min: number[];
  max: number[];
  query: Record<string, unknown>;
  time_intervals?: string[][];
}

interface FetchReportParams {
  counterId: number;
  metrics: string;
  dimensions?: string;
  date1: string;
  date2: string;
  filters?: string;
  sort?: string;
  limit?: number;
  group?: string;
}

export class MetrikaClient {
  private token: string;

  constructor(accessToken: string) {
    this.token = accessToken;
  }

  private headers() {
    return { Authorization: `OAuth ${this.token}` };
  }

  async getCounters(): Promise<MetrikaCounter[]> {
    const res = await fetch(`${BASE}/management/v1/counters?per_page=200`, {
      headers: this.headers(),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Metrika counters error: ${res.status}`);
    const json = await res.json();
    return (json.counters ?? []).map((c: { id: number; name: string; site: string }) => ({
      id: c.id,
      name: c.name,
      site: c.site,
    }));
  }

  async getReport(p: FetchReportParams): Promise<MetrikaReportData> {
    const params = new URLSearchParams({
      ids: String(p.counterId),
      metrics: p.metrics,
      date1: p.date1,
      date2: p.date2,
      limit: String(p.limit ?? 100),
    });
    if (p.dimensions) params.set("dimensions", p.dimensions);
    if (p.filters) params.set("filters", p.filters);
    if (p.sort) params.set("sort", p.sort);
    if (p.group) params.set("group", p.group);

    const res = await fetch(`${BASE}/stat/v1/data?${params}`, {
      headers: this.headers(),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Metrika stat error ${res.status}: ${text}`);
    }
    return res.json();
  }

  // ── Block-specific methods ─────────────────────────────────────────────

  async getTrafficSummary(
    counterId: number,
    date1: string,
    date2: string,
    compareDate1?: string,
    compareDate2?: string
  ) {
    const metrics = "ym:s:visits,ym:s:users,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds";
    const current = await this.getReport({ counterId, metrics, date1, date2, limit: 1 });
    let comparison: MetrikaReportData | null = null;
    if (compareDate1 && compareDate2) {
      comparison = await this.getReport({ counterId, metrics, date1: compareDate1, date2: compareDate2, limit: 1 });
    }
    return { current, comparison };
  }

  async getTrafficByChannels(
    counterId: number,
    date1: string,
    date2: string,
    compareDate1?: string,
    compareDate2?: string
  ) {
    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:visits,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds",
      dimensions: "ym:s:trafficSource",
      date1,
      date2,
      sort: "-ym:s:visits",
    };
    const current = await this.getReport(params);
    let comparison: MetrikaReportData | null = null;
    if (compareDate1 && compareDate2) {
      comparison = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
    }
    return { current, comparison };
  }

  async getTrafficBySearchEngines(
    counterId: number,
    date1: string,
    date2: string,
    compareDate1?: string,
    compareDate2?: string
  ) {
    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:visits,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds",
      dimensions: "ym:s:searchEngine",
      date1,
      date2,
      sort: "-ym:s:visits",
    };
    const current = await this.getReport(params);
    let comparison: MetrikaReportData | null = null;
    if (compareDate1 && compareDate2) {
      comparison = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
    }
    return { current, comparison };
  }

  async getTrafficDynamics(
    counterId: number,
    date1: string,
    date2: string,
    compareDate1?: string,
    compareDate2?: string
  ) {
    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:visits,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds",
      dimensions: "ym:s:date",
      date1,
      date2,
      group: "day",
      sort: "ym:s:date",
      limit: 400,
    };
    const current = await this.getReport(params);
    let comparison: MetrikaReportData | null = null;
    if (compareDate1 && compareDate2) {
      comparison = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
    }
    return { current, comparison };
  }

  async getSearchDynamics(
    counterId: number,
    date1: string,
    date2: string,
    compareDate1?: string,
    compareDate2?: string
  ) {
    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:visits",
      dimensions: "ym:s:date",
      date1,
      date2,
      filters: "ym:s:trafficSource=='organic'",
      group: "day",
      sort: "ym:s:date",
      limit: 400,
    };
    const current = await this.getReport(params);
    let comparison: MetrikaReportData | null = null;
    if (compareDate1 && compareDate2) {
      comparison = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
    }
    return { current, comparison };
  }

  async getTrafficYoY(counterId: number, date1: string, date2: string) {
    // Compare with same period one year ago
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setFullYear(d1.getFullYear() - 1);
    d2.setFullYear(d2.getFullYear() - 1);
    const prevDate1 = d1.toISOString().slice(0, 10);
    const prevDate2 = d2.toISOString().slice(0, 10);
    return this.getTrafficDynamics(counterId, date1, date2, prevDate1, prevDate2);
  }

  async getGeography(counterId: number, date1: string, date2: string) {
    return this.getReport({
      counterId,
      metrics: "ym:s:visits,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds",
      dimensions: "ym:s:regionArea",
      date1,
      date2,
      sort: "-ym:s:visits",
      limit: 10,
    });
  }

  async getDevices(counterId: number, date1: string, date2: string) {
    return this.getReport({
      counterId,
      metrics: "ym:s:visits,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds",
      dimensions: "ym:s:deviceCategory",
      date1,
      date2,
      sort: "-ym:s:visits",
    });
  }

  async getTopPages(
    counterId: number,
    date1: string,
    date2: string,
    compareDate1?: string,
    compareDate2?: string
  ) {
    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:visits",
      dimensions: "ym:s:startURL",
      date1,
      date2,
      sort: "-ym:s:visits",
      limit: 10,
    };
    const current = await this.getReport(params);
    let comparison: MetrikaReportData | null = null;
    if (compareDate1 && compareDate2) {
      comparison = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
    }
    return { current, comparison };
  }

  async getTopQueries(
    counterId: number,
    date1: string,
    date2: string,
    compareDate1?: string,
    compareDate2?: string
  ) {
    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:visits",
      dimensions: "ym:s:searchPhrase",
      date1,
      date2,
      filters: "ym:s:trafficSource=='organic'",
      sort: "-ym:s:visits",
      limit: 10,
    };
    const current = await this.getReport(params);
    let comparison: MetrikaReportData | null = null;
    if (compareDate1 && compareDate2) {
      comparison = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
    }
    return { current, comparison };
  }

  async getReferrals(counterId: number, date1: string, date2: string) {
    return this.getReport({
      counterId,
      metrics: "ym:s:visits",
      dimensions: "ym:s:referer",
      date1,
      date2,
      filters: "ym:s:trafficSource=='referral'",
      sort: "-ym:s:visits",
      limit: 10,
    });
  }

  async getHighBouncePages(counterId: number, date1: string, date2: string) {
    return this.getReport({
      counterId,
      metrics: "ym:s:visits,ym:s:bounceRate",
      dimensions: "ym:s:startURL",
      date1,
      date2,
      filters: "ym:s:bounceRate>70",
      sort: "-ym:s:bounceRate",
      limit: 10,
    });
  }
}
