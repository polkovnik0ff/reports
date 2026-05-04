import { getEngineColor } from "@/lib/utils/engine-colors";

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
  total_rows?: number;
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
  offset?: number;
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

// For SearchEngineRoot, attribution is also encoded in the dimension name
const SEARCH_ENGINE_DIMENSION_MAP: Record<AttributionModel, string> = {
  lastsign: "ym:s:lastsignSearchEngineRoot",
  first:    "ym:s:firstSearchEngineRoot",
  last:     "ym:s:lastSearchEngineRoot",
  auto:     "ym:s:lastsignSearchEngineRoot",
  direct:   "ym:s:lastsignSearchEngineRoot",
};

const SEARCH_ENGINE_DIMENSION_CROSS_DEVICE: Record<AttributionModel, string> = {
  lastsign: "ym:s:cross_device_last_significantSearchEngineRoot",
  first:    "ym:s:cross_device_last_significantSearchEngineRoot",
  last:     "ym:s:cross_device_last_significantSearchEngineRoot",
  auto:     "ym:s:cross_device_last_significantSearchEngineRoot",
  direct:   "ym:s:cross_device_last_significantSearchEngineRoot",
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

export interface YoYKpi {
  users: number;
  visits: number;
  bounceRate: number;
  pageDepth: number;
  avgDuration: number;
}

export interface DynamicsResult {
  current: MetrikaRawResponse;
  comparison: MetrikaRawResponse | null;
  currentKpi?: YoYKpi;
  comparisonKpi?: YoYKpi;
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

  private searchEngineDimension(): string {
    const attr = this.settings.attribution ?? "lastsign";
    if (this.settings.crossDevice) {
      return SEARCH_ENGINE_DIMENSION_CROSS_DEVICE[attr];
    }
    return SEARCH_ENGINE_DIMENSION_MAP[attr];
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
    if (applied.offset)     params.set("offset", String(applied.offset));

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

  // Fetches all pages for a report query, up to maxRows total rows
  async getAllReportPages(p: FetchReportParams, pageSize = 10000): Promise<MetrikaRawResponse> {
    const first = await this.getReport({ ...p, limit: pageSize, offset: 1 });
    const total = first.total_rows ?? first.data?.length ?? 0;
    if (total <= pageSize) return first;

    const pages: MetrikaRawResponse[] = [first];
    let offset = pageSize + 1;
    while (offset <= total) {
      const page = await this.getReport({ ...p, limit: pageSize, offset });
      pages.push(page);
      offset += pageSize;
    }
    return {
      ...first,
      data: pages.flatMap((pg) => pg.data ?? []),
    };
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
      metrics: "ym:s:visits,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds",
      dimensions: dim,
      date1,
      date2,
      sort: "-ym:s:visits",
    };
    const raw = await this.getReport(params);

    interface PrevMetrics { visits: number; bounceRate: number; pageDepth: number; avgDuration: number; }
    const prevMap = new Map<string, PrevMetrics>();
    if (compareDate1 && compareDate2) {
      const rawPrev = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
      for (const item of rawPrev.data ?? []) {
        const id = item.dimensions[0]?.id ?? item.dimensions[0]?.name ?? "";
        prevMap.set(id, {
          visits:      item.metrics[0] ?? 0,
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
          prevVisits:      prev.visits,
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
      metrics: "ym:s:visits,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds",
      dimensions: this.searchEngineDimension(),
      date1,
      date2,
      sort: "-ym:s:visits",
    };
    const raw = await this.getReport(params);

    interface PrevMetrics { visits: number; bounceRate: number; pageDepth: number; avgDuration: number; }
    const prevMap = new Map<string, PrevMetrics>();
    if (compareDate1 && compareDate2) {
      const rawPrev = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
      for (const item of rawPrev.data ?? []) {
        const id = item.dimensions[0]?.id ?? item.dimensions[0]?.name ?? "";
        prevMap.set(id, {
          visits:      item.metrics[0] ?? 0,
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
          prevVisits:      prev.visits,
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
    const [y1, m1, day1] = date1.split("-").map(Number);
    const [y2, m2, day2] = date2.split("-").map(Number);
    const prevDate1 = `${y1 - 1}-${String(m1).padStart(2, "0")}-${String(day1).padStart(2, "0")}`;
    const prevDate2 = `${y2 - 1}-${String(m2).padStart(2, "0")}-${String(day2).padStart(2, "0")}`;

    const channelDim = this.channelsDimension();
    const filter = `${channelDim}=='organic'`;

    // Graph: visits by day (visits sum correctly across days, unlike users)
    const chartParams: FetchReportParams = {
      counterId,
      metrics: "ym:s:visits",
      dimensions: "ym:s:date",
      date1,
      date2,
      filters: filter,
      group: "day",
      sort: "ym:s:date",
    };
    const current    = await this.getAllReportPages(chartParams);
    const comparison = await this.getAllReportPages({ ...chartParams, date1: prevDate1, date2: prevDate2 });

    // KPI: correct deduped users/visits/metrics via totals (no date dimension)
    const kpiParams: FetchReportParams = {
      counterId,
      metrics: "ym:s:users,ym:s:visits,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds",
      date1,
      date2,
      filters: filter,
      limit: 1,
    };
    const kpiRaw     = await this.getReport(kpiParams);
    const kpiPrevRaw = await this.getReport({ ...kpiParams, date1: prevDate1, date2: prevDate2 });

    const toKpi = (raw: MetrikaRawResponse): YoYKpi => {
      const t = raw.totals ?? [];
      return { users: t[0] ?? 0, visits: t[1] ?? 0, bounceRate: t[2] ?? 0, pageDepth: t[3] ?? 0, avgDuration: t[4] ?? 0 };
    };

    return { current, comparison, currentKpi: toKpi(kpiRaw), comparisonKpi: toKpi(kpiPrevRaw) };
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
      metrics: "ym:s:visits,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds",
      dimensions: "ym:s:regionArea",
      date1,
      date2,
      sort: "-ym:s:visits",
      limit: 20,
    };
    const raw = await this.getReport(params);

    interface PrevMetrics { visits: number; bounceRate: number; pageDepth: number; avgDuration: number; }
    const prevMap = new Map<string, PrevMetrics>();
    if (compareDate1 && compareDate2) {
      const rawPrev = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
      for (const item of rawPrev.data ?? []) {
        const id = item.dimensions[0]?.id ?? item.dimensions[0]?.name ?? "";
        prevMap.set(id, {
          visits:      item.metrics[0] ?? 0,
          bounceRate:  item.metrics[1] ?? 0,
          pageDepth:   item.metrics[2] ?? 0,
          avgDuration: item.metrics[3] ?? 0,
        });
      }
    }

    const UNDEFINED_GEO = new Set(["не определено", "not defined", "(not set)", "undefined"]);

    const rows: DimensionRow[] = (raw.data ?? [])
      .filter((item) => {
        const name = (item.dimensions[0]?.name ?? "").toLowerCase().trim();
        return !UNDEFINED_GEO.has(name);
      })
      .map((item) => {
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
            prevVisits:      prev.visits,
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
      metrics: "ym:s:visits,ym:s:bounceRate,ym:s:pageDepth,ym:s:avgVisitDurationSeconds",
      dimensions: "ym:s:deviceCategory",
      date1,
      date2,
      sort: "-ym:s:visits",
    };
    const raw = await this.getReport(params);

    interface PrevMetrics { visits: number; bounceRate: number; pageDepth: number; avgDuration: number; }
    const prevMap = new Map<string, PrevMetrics>();
    if (compareDate1 && compareDate2) {
      const rawPrev = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
      for (const item of rawPrev.data ?? []) {
        const id = item.dimensions[0]?.id ?? item.dimensions[0]?.name ?? "";
        prevMap.set(id, {
          visits:      item.metrics[0] ?? 0,
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
          prevVisits:      prev.visits,
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
      metrics: "ym:s:visits",
      dimensions: "ym:s:startURL",
      date1,
      date2,
      filters: `${this.channelsDimension()}=='organic'`,
      sort: "-ym:s:visits",
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

  async getReferrals(
    counterId: number,
    date1: string,
    date2: string,
    compareDate1?: string,
    compareDate2?: string
  ): Promise<RankedResult> {
    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:visits",
      dimensions: "ym:s:refererDomain",
      date1,
      date2,
      filters: `${this.channelsDimension()}=='referral'`,
      sort: "-ym:s:visits",
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

  async getHighBouncePages(
    counterId: number,
    date1: string,
    date2: string,
    siteUrl?: string,
    compareDate1?: string,
    compareDate2?: string
  ): Promise<RankedResult> {
    // Extract host from siteUrl to filter only own pages
    let siteHost = "";
    if (siteUrl) {
      try { siteHost = new URL(siteUrl.startsWith("http") ? siteUrl : `https://${siteUrl}`).hostname.replace(/^www\./, ""); } catch { /* ignore */ }
    }

    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:visits,ym:s:bounceRate",
      dimensions: "ym:s:startURL",
      date1,
      date2,
      sort: "-ym:s:visits",
      limit: 200,
    };
    const raw = await this.getReport(params);

    const prevMap = new Map<string, { visits: number; bounceRate: number }>();
    if (compareDate1 && compareDate2) {
      const rawPrev = await this.getReport({ ...params, date1: compareDate1, date2: compareDate2 });
      for (const item of rawPrev.data ?? []) {
        const name = item.dimensions[0]?.name ?? "";
        prevMap.set(name, { visits: item.metrics[0] ?? 0, bounceRate: item.metrics[1] ?? 0 });
      }
    }

    type BounceRow = { name: string; visits: number; bounceRate: number; prevVisits?: number; prevBounceRate?: number };
    let rows: BounceRow[] = (raw.data ?? [])
      .filter((item) => {
        const url = item.dimensions[0]?.name ?? "";
        if (!siteHost) return true;
        try { return new URL(url).hostname.replace(/^www\./, "").includes(siteHost); } catch { return false; }
      })
      .map((item) => {
        const name = item.dimensions[0]?.name ?? "";
        const prev = prevMap.get(name);
        return {
          name,
          visits:     item.metrics[0] ?? 0,
          bounceRate: item.metrics[1] ?? 0,
          ...(prev ? { prevVisits: prev.visits, prevBounceRate: prev.bounceRate } : {}),
        };
      });

    // Two-level sort: bounceRate desc, then visits desc
    rows.sort((a, b) => b.bounceRate - a.bounceRate || b.visits - a.visits);
    rows = rows.slice(0, 10);

    return { rows } as unknown as RankedResult;
  }

  async getSearchEnginesDynamics(
    counterId: number,
    date1: string,
    date2: string
  ): Promise<SearchEnginesDynamicsResult> {
    const params: FetchReportParams = {
      counterId,
      metrics: "ym:s:visits",
      dimensions: `ym:s:date,${this.searchEngineDimension()}`,
      date1,
      date2,
      group: "day",
      sort: "ym:s:date",
    };
    const raw = await this.getAllReportPages(params);

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
      color: getEngineColor(engineId, Array.from(engineSet).indexOf(engineId)),
      data:  dates.map((d) => engineData.get(engineId)?.get(d) ?? 0),
    }));

    // Sort by total desc, keep top 6
    series.sort((a, b) => b.data.reduce((s, v) => s + v, 0) - a.data.reduce((s, v) => s + v, 0));

    return { dates, series: series.slice(0, 6) };
  }
}
