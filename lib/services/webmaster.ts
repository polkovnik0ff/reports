const BASE_URL = "https://api.webmaster.yandex.net/v4/user";

// ── API types ────────────────────────────────────────────────────────────────

export interface WebmasterHost {
  host_id: string;       // e.g. "https:example.com:443"
  ascii_host_url: string; // e.g. "https://example.com/"
  unicode_host_url: string;
  verified: boolean;
}

interface HistoryPoint {
  date: string;   // ISO 8601
  value: number;
}

// ── Derived data types (stored in snapshotData) ──────────────────────────────

export interface IkhPoint {
  date: string;  // YYYY-MM-DD
  value: number;
}

export interface WebmasterIkhData {
  points: IkhPoint[];
  hostUrl: string;
}

export interface IndexingPoint {
  date: string;  // YYYY-MM-DD
  indexed: number;   // HTTP_2XX (успешно просканировано)
  excluded: number;  // HTTP_4XX + HTTP_5XX + OTHER
}

export interface WebmasterIndexingData {
  points: IndexingPoint[];
  hostUrl: string;
  currentIndexed?: number;   // searchable_pages_count из /summary
  currentExcluded?: number;  // excluded_pages_count из /summary
}

export interface BacklinksPoint {
  date: string;  // YYYY-MM-DD
  value: number;
}

export interface WebmasterBacklinksData {
  points: BacklinksPoint[];
  hostUrl: string;
}

export interface WebmasterSearchSummaryData {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  compareClicks?: number;
  compareImpressions?: number;
  compareCtr?: number;
  comparePosition?: number;
  hostUrl: string;
}

// ── Client ───────────────────────────────────────────────────────────────────

export class WebmasterClient {
  private userId: string | null = null;

  constructor(private accessToken: string) {}

  private async post<T>(path: string, body: unknown): Promise<T> {
    const url = `${BASE_URL}/${path}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `OAuth ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Webmaster API ${res.status}: ${text.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  private async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}/${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), {
      headers: { Authorization: `OAuth ${this.accessToken}` },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Webmaster API ${res.status}: ${body.slice(0, 200)}`);
    }
    return res.json() as Promise<T>;
  }

  async getUserId(): Promise<string> {
    if (this.userId) return this.userId;
    const data = await this.get<{ user_id: number }>(""); // GET /v4/user/
    this.userId = String(data.user_id);
    return this.userId;
  }

  async getHosts(): Promise<WebmasterHost[]> {
    const uid = await this.getUserId();
    const data = await this.get<{ hosts: WebmasterHost[] }>(`${uid}/hosts`);
    return data.hosts ?? [];
  }

  // ИКС — история изменений индекса качества сайта
  async getSqiHistory(
    hostId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<WebmasterIkhData> {
    const uid = await this.getUserId();
    const encoded = encodeURIComponent(hostId);
    const data = await this.get<{ points: HistoryPoint[] }>(
      `${uid}/hosts/${encoded}/sqi-history`,
      { date_from: dateFrom, date_to: dateTo },
    );
    const points: IkhPoint[] = (data.points ?? []).map((p) => ({
      date: p.date.slice(0, 10),
      value: p.value,
    }));
    return { points, hostUrl: hostId };
  }

  // История индексирования + актуальное число из /summary
  async getIndexingHistory(
    hostId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<WebmasterIndexingData> {
    const uid = await this.getUserId();
    const encoded = encodeURIComponent(hostId);

    const [historyData, summaryData] = await Promise.all([
      this.get<{ indicators: Record<string, HistoryPoint[]> }>(
        `${uid}/hosts/${encoded}/indexing/history`,
        { date_from: dateFrom, date_to: dateTo },
      ),
      this.get<{ searchable_pages_count?: number; excluded_pages_count?: number }>(
        `${uid}/hosts/${encoded}/summary`,
      ).catch(() => ({} as { searchable_pages_count?: number; excluded_pages_count?: number })),
    ]);

    const ind = historyData.indicators ?? {};
    const indexed = ind["HTTP_2XX"] ?? [];
    const excl4xx = ind["HTTP_4XX"] ?? [];
    const excl5xx = ind["HTTP_5XX"] ?? [];
    const exclOth = ind["OTHER"] ?? [];

    const idxMap = new Map(indexed.map((p) => [p.date.slice(0, 10), p.value]));
    const exclMap = new Map<string, number>();
    for (const arr of [excl4xx, excl5xx, exclOth]) {
      for (const p of arr) {
        const d = p.date.slice(0, 10);
        exclMap.set(d, (exclMap.get(d) ?? 0) + p.value);
      }
    }
    const allDates = [...new Set([...idxMap.keys(), ...exclMap.keys()])].sort();
    const points: IndexingPoint[] = allDates.map((d) => ({
      date: d,
      indexed: idxMap.get(d) ?? 0,
      excluded: exclMap.get(d) ?? 0,
    }));

    return {
      points,
      hostUrl: hostId,
      currentIndexed: summaryData.searchable_pages_count,
      currentExcluded: summaryData.excluded_pages_count,
    };
  }

  // Внешние ссылки — динамика
  async getBacklinksHistory(
    hostId: string,
    dateFrom: string,
    dateTo: string,
  ): Promise<WebmasterBacklinksData> {
    const uid = await this.getUserId();
    const encoded = encodeURIComponent(hostId);
    const data = await this.get<{
      indicators: Record<string, HistoryPoint[]>;
    }>(`${uid}/hosts/${encoded}/links/external/history`, {
      indicator: "LINKS_TOTAL_COUNT",
      date_from: dateFrom,
      date_to: dateTo,
    });
    const pts = data.indicators?.["LINKS_TOTAL_COUNT"] ?? [];
    const points: BacklinksPoint[] = pts.map((p) => ({
      date: p.date.slice(0, 10),
      value: p.value,
    }));
    return { points, hostUrl: hostId };
  }

  // Поисковые запросы — сводные метрики за период
  async getSearchSummary(
    hostId: string,
    dateFrom: string,
    dateTo: string,
    compareFrom?: string,
    compareTo?: string,
  ): Promise<WebmasterSearchSummaryData> {
    const uid = await this.getUserId();
    const encoded = encodeURIComponent(hostId);

    interface QueryAnalyticsResponse {
      text_indicator_to_statistics?: {
        indicator: string;
        statistics: { field: string; value: number }[];
      }[];
    }

    const fetchPeriod = async (d1: string, d2: string) => {
      const data = await this.post<QueryAnalyticsResponse>(
        `${uid}/hosts/${encoded}/query-analytics/list`,
        {
          date_from: d1,
          date_to: d2,
          limit: 1,
          offset: 0,
          filters: { text_filters: [] },
          order_by: [{ field: "TOTAL_CLICKS", order: "DESC" }],
        },
      );
      // API returns per-query rows; we need totals — use indicators from first row or sum
      // Better: request with group_by empty → totals endpoint
      // Fallback: use /summary statistics
      return data;
    };

    // Webmaster query-analytics возвращает строки по запросам, не суммарные.
    // Для суммарных метрик используем другой endpoint: /search-queries/all/summary
    interface SummaryResponse {
      indicators?: {
        TOTAL_SHOWS?: number;
        TOTAL_CLICKS?: number;
        AVG_CLICK_POSITION?: number;
        AVG_SHOW_POSITION?: number;
      };
    }

    const fetchSummary = async (d1: string, d2: string) => {
      return this.get<SummaryResponse>(
        `${uid}/hosts/${encoded}/search-queries/all/summary`,
        { date_from: d1, date_to: d2 },
      );
    };

    const [main, compare] = await Promise.all([
      fetchSummary(dateFrom, dateTo),
      compareFrom && compareTo ? fetchSummary(compareFrom, compareTo) : Promise.resolve(null),
    ]);

    const toMetrics = (r: SummaryResponse | null) => ({
      clicks:      r?.indicators?.TOTAL_CLICKS      ?? 0,
      impressions: r?.indicators?.TOTAL_SHOWS        ?? 0,
      ctr:         r?.indicators?.TOTAL_CLICKS && r?.indicators?.TOTAL_SHOWS
                     ? r.indicators.TOTAL_CLICKS / r.indicators.TOTAL_SHOWS
                     : 0,
      position:    r?.indicators?.AVG_CLICK_POSITION ?? 0,
    });

    const m = toMetrics(main);
    const c = compare ? toMetrics(compare) : null;

    return {
      ...m,
      ...(c && {
        compareClicks:      c.clicks,
        compareImpressions: c.impressions,
        compareCtr:         c.ctr,
        comparePosition:    c.position,
      }),
      hostUrl: hostId,
    };
  }
}
