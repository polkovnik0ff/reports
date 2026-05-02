const TOKEN_URL = "https://oauth2.googleapis.com/token";
const BASE_URL = "https://www.googleapis.com/webmasters/v3";

export interface GscSite {
  siteUrl: string;
  permissionLevel: string;
}

export interface GscSummaryData {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  compareClicks?: number;
  compareImpressions?: number;
  compareCtr?: number;
  comparePosition?: number;
  siteUrl: string;
}

interface SearchAnalyticsRow {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export class GscClient {
  constructor(
    private accessToken: string,
    private refreshToken: string | null,
    private clientId: string,
    private clientSecret: string,
    private onTokenRefresh?: (newToken: string, expiresAt: Date) => Promise<void>,
  ) {}

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) throw new Error("No refresh token available");

    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: this.refreshToken,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.access_token) {
      throw new Error(`Token refresh failed: ${data.error ?? res.status}`);
    }

    this.accessToken = data.access_token;
    const expiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
    await this.onTokenRefresh?.(data.access_token, expiresAt);
  }

  private async post<T>(path: string, body: unknown, retried = false): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status === 401 && !retried) {
      await this.refreshAccessToken();
      return this.post<T>(path, body, true);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`GSC API ${res.status}: ${text.slice(0, 200)}`);
    }

    return res.json() as Promise<T>;
  }

  private async get<T>(path: string, retried = false): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });

    if (res.status === 401 && !retried) {
      await this.refreshAccessToken();
      return this.get<T>(path, true);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`GSC API ${res.status}: ${text.slice(0, 200)}`);
    }

    return res.json() as Promise<T>;
  }

  async getSites(): Promise<GscSite[]> {
    const data = await this.get<{ siteEntry?: GscSite[] }>("/sites");
    return data.siteEntry ?? [];
  }

  async getSummary(
    siteUrl: string,
    dateFrom: string,
    dateTo: string,
    compareFrom?: string,
    compareTo?: string,
  ): Promise<GscSummaryData> {
    const encodedSite = encodeURIComponent(siteUrl);

    const mainRow = await this.post<{ rows?: SearchAnalyticsRow[] }>(
      `/sites/${encodedSite}/searchAnalytics/query`,
      { startDate: dateFrom, endDate: dateTo, rowLimit: 1 },
    ).then((d) => d.rows?.[0] ?? null);

    let compareRow: SearchAnalyticsRow | null = null;
    if (compareFrom && compareTo) {
      compareRow = await this.post<{ rows?: SearchAnalyticsRow[] }>(
        `/sites/${encodedSite}/searchAnalytics/query`,
        { startDate: compareFrom, endDate: compareTo, rowLimit: 1 },
      ).then((d) => d.rows?.[0] ?? null);
    }

    return {
      clicks:      mainRow?.clicks      ?? 0,
      impressions: mainRow?.impressions  ?? 0,
      ctr:         mainRow?.ctr          ?? 0,
      position:    mainRow?.position     ?? 0,
      ...(compareRow && {
        compareClicks:      compareRow.clicks,
        compareImpressions: compareRow.impressions,
        compareCtr:         compareRow.ctr,
        comparePosition:    compareRow.position,
      }),
      siteUrl,
    };
  }
}
