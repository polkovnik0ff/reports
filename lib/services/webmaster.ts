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

// ── Client ───────────────────────────────────────────────────────────────────

export class WebmasterClient {
  private userId: string | null = null;

  constructor(private accessToken: string) {}

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
}
