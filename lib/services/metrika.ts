const BASE = "https://api-metrika.yandex.net";

export interface MetrikaCounter {
  id: number;
  name: string;
  site: string;
}

interface MetrikaRawResponse {
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

// ── Attribution & request settings ───────────────────────────────────────────

export type AttributionModel = "lastsign" | "first" | "last" | "auto" | "direct";

export interface MetrikaSettings {
  attribution?: AttributionModel;
  withRobots?: boolean;
  crossDevice?: boolean;
}

// attribution query param — works for metrics but NOT for trafficSource dimensions
const ATTRIBUTION_MAP: Record<AttributionModel, string> = {
  lastsign: "LastSign",
  first:    "First",
  last:     "Last",
  auto:     "Automatic",
  direct:   "LastYandexDirect",
};

// For trafficSource, attribution is encoded in the dimension name itself
const CHANNELS_DIMENSION_MAP: Record<AttributionModel, string> = {
  lastsign: "ym:s:lastsignTrafficSource",
  first:    "ym:s:firstTrafficSource",
  last:     "ym:s:lastTrafficSource",
  auto:     "ym:s:lastsignTrafficSource", // fallback to lastsign
  direct:   "ym:s:lastsignTrafficSource", // fallback to lastsign
};

const CHANNELS_DIMENSION_CROSS_DEVICE: Record<AttributionModel, string> = {
  lastsign: "ym:s:cross_device_last_significantTrafficSource",
  first:    "ym:s:cross_device_last_significantTrafficSource", // Metrika only exposes lastsign for cross-device
  last:     "ym:s:cross_device_last_significantTrafficSource",
  auto:     "ym:s:cross_device_last_significantTrafficSource",
  direct:   "ym:s:cross_device_last_significantTrafficSource",
};

const ROBOTS_FILTER = "ym:s:isRobot=='No'";

function mergeFilters(existing: string | undefined, extra: string): string {
  if (!existing) return extra;
  return `${existing} AND ${extra}`;
}

// ── Typed result shapes ───────────────────────────────────────────────────────

export interface SummaryMetrics {
  visits: number;
  users: number;
  pageviews: number;
  bounceRate: number;
  pageDepth: number;
  avgDuration: number;
}

export interface TrafficSummaryResult {
  current: SummaryMetrics;
  previous?: SummaryMetrics;
}

export interface ChannelRow {
  id: string;
  name: string;
  visits: number;
  bounceRate: number;
  pageDepth: number;
  avgDuration: number;
  prevVisits?: number;
  prevBounceRate?: number;
  prevPageDepth?: number;
  prevAvgDuration?: number;
}

export interface TrafficChannelsResult {
  rows: ChannelRow[];
}

export interface DimensionRow {
  id: string;
  name: string;
  visits: number;
  bounceRate: number;
  pageDepth: number;
  avgDuration: number;
  prevVisits?: number;
  prevBounceRate?: number;
  prevPageDepth?: number;
  prevAvgDuration?: number;
}

export interface DimensionResult {
  rows: DimensionRow[];
}

export interface RankedRow {
  name: string;
  visits: number;
  prevVisits?: number;
}

export interface RankedResult {
  rows: RankedRow[];
}

export interface DynamicsResult {
  current: MetrikaRawResponse;
  comparison: MetrikaRawResponse | null;
}

export interface SearchEnginesSeries {
  name: string;
  color: string;
  data: number[];
}

export interface SearchEnginesDynamicsResult {
  dates: string[];
  series: SearchEnginesSeries[];
}

// ── Name translations ─────────────────────────────────────────────────────────

const CHANNEL_NAMES: Record<string, string> = {
  organic:   "Переходы из поисковых систем",
  direct:    "Прямые заходы",
  referral:  "Переходы по ссылкам на сайтах",
  ad:        "Переходы по рекламе",
  social:    "Переходы из социальных сетей",
  recommend: "Переходы из рекомендательных систем",
  internal:  "Внутренние переходы",
  email:     "Переходы из рассылок",
  messenger: "Переходы из мессенджеров",
  saved:     "Переходы с сохранённых страниц",
};

const SEARCH_ENGINE_NAMES: Record<string, string> = {
  yandex:     "Яндекс",
  google:     "Google",
  bing:       "Bing",
  mail:       "Mail.ru",
  rambler:    "Рамблер",
  yahoo:      "Yahoo",
  duckduckgo: "DuckDuckGo",
  baidu:      "Baidu",
};

const DEVICE_NAMES: Record<string, string> = {
  desktop: "ПК",
  mobile:  "Смартфоны",
  tablet:  "Планшеты",
  tv:      "Телевизоры",
};

// ── Client ────────────────────────────────────────────────────────────────────

export class MetrikaClient {
  private token: string;
  private settings: MetrikaSettings;

  constructor(accessToken: string, settings: MetrikaSettings = {}) {
    this.token = accessToken;
    this.settings = settings;
  }

  private headers() {
    return { Authorization: `OAuth ${this.token}` };
  }

  private applySettings(p: FetchReportParams): FetchReportParams {
    const result = { ...p };
    if (!this.settings.withRobots) {
      result.filters = mergeFilters(result.filters, ROBOTS_FILTER);
    }
    return result;
  }

  // Returns the correct trafficSource dimension for the current attribution + cross-device settings.
  // The attribution query param does NOT affect trafficSource breakdowns in Metrika —
  // the model must be encoded in the dimension name itself.
  private channelsDimension(): string {
    const attr = this.settings.attribution ?? "lastsign";
    if (this.settings.crossDevice) {
      return CHANNELS_DIMENSION_CROSS_DEVICE[attr];
    }
    return CHANNELS_DIMENSION_MAP[attr];
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

  async getReport(p: FetchReportParams): Promise<MetrikaRawResponse> {
    const applied = this.applySettings(p);

    const params = new URLSearchParams({
      ids:     String(applied.counterId),
      metrics: applied.metrics,
      date1:   applied.date1,
      date2:   applied.date2,
      limit:   String(applied.limit ?? 100),
      lang:    "ru",
    });
    if (applied.dimensions) params.set("dimensions", applied.dimensions);
    if (applied.filters)    params.set("filters", applied.filters);
    if (applied.sort)       params.set("sort", applied.sort);
    if (applied.group)      params.set("group", applied.group);

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

  // ── Block-specific methods ─────────────────────────────────────────────────

  async getTrafficSummary(
    counterId: number,
    date1: string,
    date2: string,
    compareDate1?: string,
    compareDate2?: string
  ): Promise<TrafficSummaryResult> {
    const metrics = "ym:s:visits,ym:s:users,ym:s:pageviews,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds";
    const raw = await this.getReport({ counterId, metrics, date1, date2, limit: 1 });

    const m = raw.data?.[0]?.metrics ?? raw.totals ?? [];
    const current: SummaryMetrics = {
      visits:      m[0] ?? 0,
      users:       m[1] ?? 0,
      pageviews:   m[2] ?? 0,
      bounceRate:  m[3] ?? 0,
      pageDepth:   m[4] ?? 0,
      avgDuration: m[5] ?? 0,
    };

    if (!compareDate1 || !compareDate2) return { current };

    const rawPrev = await this.getReport({ counterId, metrics, date1: compareDate1, date2: compareDate2, limit: 1 });
    const mp = rawPrev.data?.[0]?.metrics ?? rawPrev.totals ?? [];
    const previous: SummaryMetrics = {
      visits:      mp[0] ?? 0,
      users:       mp[1] ?? 0,
      pageviews:   mp[2] ?? 0,
      bounceRate:  mp[3] ?? 0,
      pageDepth:   mp[4] ?? 0,
      avgDuration: mp[5] ?? 0,
    };

    return { current, previous };
  }

  async getTrafficByChannels(
    counterId: number,
    date1: string,
    date2: string,
    compareDate1?: string,
    compareDate2?: string
  ): Promise<TrafficChannelsResult> {
    const dim = this.channelsDimension();
    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:users,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds",
      dimensions: dim,
      date1,
      date2,
      sort: "-ym:s:users",
    };
    const raw = await this.getReport(params);

    interface PrevMetrics { users: number; bounceRate: number; pageDepth: number; avgDuration: number; }
    const prevMap = new Map<string, PrevMetrics>();
    if (compareDate1 && compareDate2) {
      const rawPrev = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
      for (const item of rawPrev.data ?? []) {
        const id = item.dimensions[0]?.id ?? item.dimensions[0]?.name ?? "";
        prevMap.set(id, {
          users:       item.metrics[0] ?? 0,
          bounceRate:  item.metrics[1] ?? 0,
          pageDepth:   item.metrics[2] ?? 0,
          avgDuration: item.metrics[3] ?? 0,
        });
      }
    }

    const rows: ChannelRow[] = (raw.data ?? []).map((item) => {
      const id = item.dimensions[0]?.id ?? item.dimensions[0]?.name ?? "";
      const prev = prevMap.get(id);
      return {
        id,
        name:        CHANNEL_NAMES[id] ?? item.dimensions[0]?.name ?? id,
        visits:      item.metrics[0] ?? 0,
        bounceRate:  item.metrics[1] ?? 0,
        pageDepth:   item.metrics[2] ?? 0,
        avgDuration: item.metrics[3] ?? 0,
        ...(prev != null ? {
          prevVisits:      prev.users,
          prevBounceRate:  prev.bounceRate,
          prevPageDepth:   prev.pageDepth,
          prevAvgDuration: prev.avgDuration,
        } : {}),
      };
    });

    return { rows };
  }

  async getTrafficBySearchEngines(
    counterId: number,
    date1: string,
    date2: string,
    compareDate1?: string,
    compareDate2?: string
  ): Promise<TrafficChannelsResult> {
    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:users,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds",
      dimensions: "ym:s:SearchEngineRoot",
      date1,
      date2,
      sort: "-ym:s:users",
    };
    const raw = await this.getReport(params);

    interface PrevMetrics { users: number; bounceRate: number; pageDepth: number; avgDuration: number; }
    const prevMap = new Map<string, PrevMetrics>();
    if (compareDate1 && compareDate2) {
      const rawPrev = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
      for (const item of rawPrev.data ?? []) {
        const id = item.dimensions[0]?.id ?? item.dimensions[0]?.name ?? "";
        prevMap.set(id, {
          users:       item.metrics[0] ?? 0,
          bounceRate:  item.metrics[1] ?? 0,
          pageDepth:   item.metrics[2] ?? 0,
          avgDuration: item.metrics[3] ?? 0,
        });
      }
    }

    const EMPTY_NAMES = new Set(["не определено", "not defined", "(not set)", "", "undefined"]);

    const rows: ChannelRow[] = (raw.data ?? []).filter((item) => {
      const id = item.dimensions[0]?.id ?? item.dimensions[0]?.name ?? "";
      const rawName = item.dimensions[0]?.name ?? id;
      const name = SEARCH_ENGINE_NAMES[id.toLowerCase()] ?? rawName;
      return id && !EMPTY_NAMES.has(name.toLowerCase());
    }).map((item) => {
      const id = item.dimensions[0]?.id ?? item.dimensions[0]?.name ?? "";
      const rawName = item.dimensions[0]?.name ?? id;
      const name = SEARCH_ENGINE_NAMES[id.toLowerCase()] ?? rawName;
      const prev = prevMap.get(id);
      return {
        id,
        name,
        visits:      item.metrics[0] ?? 0,
        bounceRate:  item.metrics[1] ?? 0,
        pageDepth:   item.metrics[2] ?? 0,
        avgDuration: item.metrics[3] ?? 0,
        ...(prev != null ? {
          prevVisits:      prev.users,
          prevBounceRate:  prev.bounceRate,
          prevPageDepth:   prev.pageDepth,
          prevAvgDuration: prev.avgDuration,
        } : {}),
      };
    });

    return { rows };
  }

  async getSearchDynamics(
    counterId: number,
    date1: string,
    date2: string,
    compareDate1?: string,
    compareDate2?: string
  ): Promise<DynamicsResult> {
    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:users,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds",
      dimensions: "ym:s:date",
      date1,
      date2,
      filters: "ym:s:trafficSource=='organic'",
      group: "day",
      sort: "ym:s:date",
      limit: 400,
    };
    const current = await this.getReport(params);
    let comparison: MetrikaRawResponse | null = null;
    if (compareDate1 && compareDate2) {
      comparison = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
    }
    return { current, comparison };
  }

  async getTrafficYoY(counterId: number, date1: string, date2: string): Promise<DynamicsResult> {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setFullYear(d1.getFullYear() - 1);
    d2.setFullYear(d2.getFullYear() - 1);
    const prevDate1 = d1.toISOString().slice(0, 10);
    const prevDate2 = d2.toISOString().slice(0, 10);

    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:users,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds",
      dimensions: "ym:s:date",
      date1,
      date2,
      filters: "ym:s:trafficSource=='organic'",
      group: "day",
      sort: "ym:s:date",
      limit: 400,
    };
    const current = await this.getReport(params);
    const comparison = await this.getReport({ ...params, date1: prevDate1, date2: prevDate2 });
    return { current, comparison };
  }

  async getGeography(
    counterId: number,
    date1: string,
    date2: string,
    compareDate1?: string,
    compareDate2?: string
  ): Promise<DimensionResult> {
    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:users,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds",
      dimensions: "ym:s:regionArea",
      date1,
      date2,
      sort: "-ym:s:users",
      limit: 20,
    };
    const raw = await this.getReport(params);

    interface PrevMetrics { users: number; bounceRate: number; pageDepth: number; avgDuration: number; }
    const prevMap = new Map<string, PrevMetrics>();
    if (compareDate1 && compareDate2) {
      const rawPrev = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
      for (const item of rawPrev.data ?? []) {
        const id = item.dimensions[0]?.id ?? item.dimensions[0]?.name ?? "";
        prevMap.set(id, {
          users:       item.metrics[0] ?? 0,
          bounceRate:  item.metrics[1] ?? 0,
          pageDepth:   item.metrics[2] ?? 0,
          avgDuration: item.metrics[3] ?? 0,
        });
      }
    }

    const rows: DimensionRow[] = (raw.data ?? []).map((item) => {
      const id = item.dimensions[0]?.id ?? item.dimensions[0]?.name ?? "";
      const prev = prevMap.get(id);
      return {
        id,
        name:        item.dimensions[0]?.name ?? "Другое",
        visits:      item.metrics[0] ?? 0,
        bounceRate:  item.metrics[1] ?? 0,
        pageDepth:   item.metrics[2] ?? 0,
        avgDuration: item.metrics[3] ?? 0,
        ...(prev != null ? {
          prevVisits:      prev.users,
          prevBounceRate:  prev.bounceRate,
          prevPageDepth:   prev.pageDepth,
          prevAvgDuration: prev.avgDuration,
        } : {}),
      };
    });
    return { rows };
  }

  async getDevices(
    counterId: number,
    date1: string,
    date2: string,
    compareDate1?: string,
    compareDate2?: string
  ): Promise<DimensionResult> {
    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:users,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds",
      dimensions: "ym:s:deviceCategory",
      date1,
      date2,
      sort: "-ym:s:users",
    };
    const raw = await this.getReport(params);

    interface PrevMetrics { users: number; bounceRate: number; pageDepth: number; avgDuration: number; }
    const prevMap = new Map<string, PrevMetrics>();
    if (compareDate1 && compareDate2) {
      const rawPrev = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
      for (const item of rawPrev.data ?? []) {
        const id = item.dimensions[0]?.id ?? item.dimensions[0]?.name ?? "";
        prevMap.set(id, {
          users:       item.metrics[0] ?? 0,
          bounceRate:  item.metrics[1] ?? 0,
          pageDepth:   item.metrics[2] ?? 0,
          avgDuration: item.metrics[3] ?? 0,
        });
      }
    }

    const rows: DimensionRow[] = (raw.data ?? []).map((item) => {
      const id = item.dimensions[0]?.id ?? item.dimensions[0]?.name ?? "";
      const prev = prevMap.get(id);
      return {
        id,
        name:        DEVICE_NAMES[id] ?? item.dimensions[0]?.name ?? id,
        visits:      item.metrics[0] ?? 0,
        bounceRate:  item.metrics[1] ?? 0,
        pageDepth:   item.metrics[2] ?? 0,
        avgDuration: item.metrics[3] ?? 0,
        ...(prev != null ? {
          prevVisits:      prev.users,
          prevBounceRate:  prev.bounceRate,
          prevPageDepth:   prev.pageDepth,
          prevAvgDuration: prev.avgDuration,
        } : {}),
      };
    });
    return { rows };
  }

  async getTopPages(
    counterId: number,
    date1: string,
    date2: string,
    compareDate1?: string,
    compareDate2?: string
  ): Promise<RankedResult> {
    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:users",
      dimensions: "ym:s:startURL",
      date1,
      date2,
      sort: "-ym:s:users",
      limit: 10,
    };
    const raw = await this.getReport(params);

    const prevMap = new Map<string, number>();
    if (compareDate1 && compareDate2) {
      const rawPrev = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
      for (const item of rawPrev.data ?? []) {
        prevMap.set(item.dimensions[0]?.name ?? "", item.metrics[0] ?? 0);
      }
    }

    const rows: RankedRow[] = (raw.data ?? []).map((item) => {
      const name = item.dimensions[0]?.name ?? "";
      return {
        name,
        visits: item.metrics[0] ?? 0,
        ...(prevMap.size > 0 ? { prevVisits: prevMap.get(name) } : {}),
      };
    });
    return { rows };
  }

  async getTopQueries(
    counterId: number,
    date1: string,
    date2: string,
    compareDate1?: string,
    compareDate2?: string
  ): Promise<RankedResult> {
    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:users",
      dimensions: "ym:s:searchPhrase",
      date1,
      date2,
      filters: "ym:s:trafficSource=='organic'",
      sort: "-ym:s:users",
      limit: 10,
    };
    const raw = await this.getReport(params);

    const prevMap = new Map<string, number>();
    if (compareDate1 && compareDate2) {
      const rawPrev = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
      for (const item of rawPrev.data ?? []) {
        prevMap.set(item.dimensions[0]?.name ?? "", item.metrics[0] ?? 0);
      }
    }

    const rows: RankedRow[] = (raw.data ?? []).map((item) => {
      const name = item.dimensions[0]?.name ?? "";
      return {
        name,
        visits: item.metrics[0] ?? 0,
        ...(prevMap.size > 0 ? { prevVisits: prevMap.get(name) } : {}),
      };
    });
    return { rows };
  }

  async getReferrals(counterId: number, date1: string, date2: string): Promise<RankedResult> {
    const raw = await this.getReport({
      counterId,
      metrics: "ym:s:users",
      dimensions: "ym:s:referer",
      date1,
      date2,
      filters: "ym:s:trafficSource=='referral'",
      sort: "-ym:s:users",
      limit: 10,
    });
    const rows: RankedRow[] = (raw.data ?? []).map((item) => ({
      name:   item.dimensions[0]?.name ?? "",
      visits: item.metrics[0] ?? 0,
    }));
    return { rows };
  }

  async getHighBouncePages(counterId: number, date1: string, date2: string): Promise<RankedResult> {
    const raw = await this.getReport({
      counterId,
      metrics: "ym:s:users,ym:s:bounceRate",
      dimensions: "ym:s:startURL",
      date1,
      date2,
      filters: "ym:s:bounceRate>70",
      sort: "-ym:s:bounceRate",
      limit: 10,
    });
    const rows = (raw.data ?? []).map((item) => ({
      name:       item.dimensions[0]?.name ?? "",
      visits:     item.metrics[0] ?? 0,
      bounceRate: item.metrics[1] ?? 0,
    }));
    return { rows } as unknown as RankedResult;
  }

  async getSearchEnginesDynamics(
    counterId: number,
    date1: string,
    date2: string
  ): Promise<SearchEnginesDynamicsResult> {
    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:users",
      dimensions: "ym:s:date,ym:s:SearchEngineRoot",
      date1,
      date2,
      group: "day",
      sort: "ym:s:date",
      limit: 400,
    };
    const raw = await this.getReport(params);

    const ENGINE_COLORS: Record<string, string> = {
      yandex: "#FF7A00",
      google: "#4285F4",
      bing:   "#008373",
      mail:   "#005FF9",
    };
    function engineColor(id: string): string {
      const key = id.toLowerCase();
      return ENGINE_COLORS[key] ?? "#9ca3af";
    }

    const EMPTY_NAMES = new Set(["не определено", "not defined", "(not set)", "", "undefined"]);

    const dateSet = new Set<string>();
    const engineSet = new Set<string>();
    const engineIdToName = new Map<string, string>();

    for (const item of raw.data ?? []) {
      const date = item.dimensions[0]?.name ?? "";
      const engineId = item.dimensions[1]?.id ?? item.dimensions[1]?.name ?? "";
      const engineName = SEARCH_ENGINE_NAMES[engineId.toLowerCase()] ?? item.dimensions[1]?.name ?? engineId;
      // Skip empty/undefined engines
      if (!engineId || EMPTY_NAMES.has(engineName.toLowerCase())) continue;
      dateSet.add(date);
      engineSet.add(engineId);
      engineIdToName.set(engineId, engineName);
    }

    const dates = Array.from(dateSet).sort();

    const engineData = new Map<string, Map<string, number>>();
    for (const item of raw.data ?? []) {
      const date = item.dimensions[0]?.name ?? "";
      const engineId = item.dimensions[1]?.id ?? item.dimensions[1]?.name ?? "";
      if (!engineSet.has(engineId)) continue;
      if (!engineData.has(engineId)) engineData.set(engineId, new Map());
      engineData.get(engineId)!.set(date, item.metrics[0] ?? 0);
    }

    const series: SearchEnginesSeries[] = Array.from(engineSet).map((engineId) => ({
      name:  engineIdToName.get(engineId) ?? engineId,
      color: engineColor(engineId),
      data:  dates.map((d) => engineData.get(engineId)?.get(d) ?? 0),
    }));

    // Sort by total desc, keep top 6
    series.sort((a, b) => b.data.reduce((s, v) => s + v, 0) - a.data.reduce((s, v) => s + v, 0));

    return { dates, series: series.slice(0, 6) };
  }
}
