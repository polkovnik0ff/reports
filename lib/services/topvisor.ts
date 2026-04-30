const BASE_URL = process.env.TOPVISOR_BASE_URL ?? "https://api.topvisor.com";

// ── API types ────────────────────────────────────────────────────────────────

interface TopvisorResponse<T> {
  status: 0 | 1;
  result: T;
  errors?: { code: number; string: string }[];
}

export interface TopvisorProject {
  id: number;
  name: string;
  site: string;
}

// positionsData: "YYYY-MM-DD:projectId:regionIndex" → { position: string | "--" }
// position comes as a string from API ("5", "32", "--")
export interface TopvisorKeyword {
  id?: number;
  name: string;
  group_id?: number | null;
  positionsData: Record<string, { position: string | number }> | [] | null;
}

export interface TopvisorGroup {
  id: number;
  name: string;
}

interface TopvisorExistsDatesResult {
  existsDates: string[] | null;
  keywords: [];
  headers: { dates: string[] };
}

export interface TopvisorHistoryResult {
  keywords: TopvisorKeyword[];
  groups: TopvisorGroup[];
  tops?: Record<string, Record<string, number>> | null;
  visibility?: number | null;
  headers?: {
    dates?: string[];
  };
}

// ── Derived data types (stored in snapshotData) ──────────────────────────────

export interface PositionsSummaryData {
  totalKeywords: number;
  visibility: number | null;
  top1: number;
  top3: number;
  top5: number;
  top10: number;
  prevTop1: number | null;
  prevTop3: number | null;
  prevTop5: number | null;
  prevTop10: number | null;
  prevVisibility: number | null;
  scanDate: string | null;       // actual last scan date used
  compareScanDate: string | null; // actual compare scan date used
}

export interface PositionsKeyword {
  id?: number;
  name: string;
  position: number | null;
  prevPosition: number | null;
}

export interface PositionsGroup {
  id: number;
  name: string;
  keywords: PositionsKeyword[];
}

export interface PositionsTableData {
  groups: PositionsGroup[];
  ungrouped: PositionsKeyword[];
  scanDate: string | null;
  compareScanDate: string | null;
}

// ── Client ───────────────────────────────────────────────────────────────────

export class TopvisorClient {
  constructor(private userId: string, private apiKey: string) {}

  private async request<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const url = `${BASE_URL}/v2/json/${method}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "seo-reports/1.0",
        "User-Id": this.userId,
        "Authorization": `bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`Topvisor HTTP ${res.status}: ${res.statusText}`);
    }

    const json: TopvisorResponse<T> = await res.json();

    if (json.errors && json.errors.length > 0) {
      throw new Error(`Topvisor API error: ${json.errors.map((e) => e.string).join(", ")}`);
    }

    return json.result;
  }

  async getProjects(): Promise<TopvisorProject[]> {
    return this.request<TopvisorProject[]>("get/projects_2/projects", {
      fields: ["id", "name", "site"],
    });
  }

  // Returns sorted list of dates when positions were actually scanned.
  // Uses a wide range to capture all historical scans.
  async getExistsDates(projectId: number, regionIndex = 1): Promise<string[]> {
    const today = new Date().toISOString().slice(0, 10);
    const result = await this.request<TopvisorExistsDatesResult>(
      "get/positions_2/history",
      {
        project_id: projectId,
        regions_indexes: [regionIndex],
        type_range: 1,
        date1: "2020-01-01",
        date2: today,
        show_headers: true,
        show_exists_dates: true,
      }
    );
    return result.existsDates ?? [];
  }

  // Fetches keyword positions for specific dates (actual scan dates).
  async getPositionsHistory(
    projectId: number,
    dates: string[],
    regionIndex = 1
  ): Promise<TopvisorHistoryResult> {
    return this.request<TopvisorHistoryResult>("get/positions_2/history", {
      project_id: projectId,
      regions_indexes: [regionIndex],
      type_range: 0,
      dates,
      show_headers: true,
      show_tops: true,
      show_visibility: true,
    });
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// Extracts numeric position. API returns positions as strings ("5", "--").
function extractPosition(
  positionsData: TopvisorKeyword["positionsData"],
  datePrefix: string
): number | null {
  if (!positionsData || Array.isArray(positionsData)) return null;
  const entry = Object.entries(positionsData).find(([key]) => key.startsWith(datePrefix));
  if (!entry) return null;
  const raw = entry[1]?.position;
  if (raw === "--" || raw === null || raw === undefined) return null;
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

function countTopsFromKeywords(
  keywords: TopvisorKeyword[],
  datePrefix: string,
  top: number
): number {
  return keywords.filter((kw) => {
    const pos = extractPosition(kw.positionsData, datePrefix);
    return pos !== null && pos <= top;
  }).length;
}

export function buildSummaryData(
  result: TopvisorHistoryResult,
  scanDate: string,
  compareScanDate: string | null
): PositionsSummaryData {
  const { keywords, visibility } = result;

  const top1  = countTopsFromKeywords(keywords, scanDate, 1);
  const top3  = countTopsFromKeywords(keywords, scanDate, 3);
  const top5  = countTopsFromKeywords(keywords, scanDate, 5);
  const top10 = countTopsFromKeywords(keywords, scanDate, 10);

  const prevTop1  = compareScanDate ? countTopsFromKeywords(keywords, compareScanDate, 1)  : null;
  const prevTop3  = compareScanDate ? countTopsFromKeywords(keywords, compareScanDate, 3)  : null;
  const prevTop5  = compareScanDate ? countTopsFromKeywords(keywords, compareScanDate, 5)  : null;
  const prevTop10 = compareScanDate ? countTopsFromKeywords(keywords, compareScanDate, 10) : null;

  return {
    totalKeywords: keywords.length,
    visibility: typeof visibility === "number" ? visibility : null,
    top1,
    top3,
    top5,
    top10,
    prevTop1,
    prevTop3,
    prevTop5,
    prevTop10,
    prevVisibility: null,
    scanDate,
    compareScanDate,
  };
}

export function buildTableData(
  result: TopvisorHistoryResult,
  scanDate: string,
  compareScanDate: string | null
): PositionsTableData {
  const { keywords, groups } = result;

  const groupMap = new Map<number, PositionsGroup>();
  for (const g of groups ?? []) {
    groupMap.set(g.id, { id: g.id, name: g.name, keywords: [] });
  }

  const ungrouped: PositionsKeyword[] = [];

  for (const kw of keywords) {
    const position     = extractPosition(kw.positionsData, scanDate);
    const prevPosition = compareScanDate ? extractPosition(kw.positionsData, compareScanDate) : null;

    const entry: PositionsKeyword = {
      id: kw.id,
      name: kw.name,
      position,
      prevPosition,
    };

    if (kw.group_id != null && groupMap.has(kw.group_id)) {
      groupMap.get(kw.group_id)!.keywords.push(entry);
    } else {
      ungrouped.push(entry);
    }
  }

  const groupsArr = Array.from(groupMap.values()).filter((g) => g.keywords.length > 0);

  return { groups: groupsArr, ungrouped, scanDate, compareScanDate };
}
