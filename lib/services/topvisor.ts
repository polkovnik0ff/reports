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

// positionsData is a map: "YYYY-MM-DD:projectId:regionIndex" → { position: number | "--" }
export interface TopvisorKeyword {
  id?: number;
  name: string;
  group_id?: number | null;
  positionsData: Record<string, { position: number | "--" }> | [] | null;
}

export interface TopvisorGroup {
  id: number;
  name: string;
}

export interface TopvisorHistoryResult {
  keywords: TopvisorKeyword[];
  groups: TopvisorGroup[];
  tops?: Record<string, Record<string, number>> | null;
  visibility?: number | null;
  headers?: {
    dates?: string[];
    projects?: {
      id: number;
      searchers?: {
        key: number;
        regions?: { index: string | number }[];
      }[];
    }[];
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

  // Fetches keyword positions for 1 or 2 specific dates.
  // dates[0] = current date, dates[1] = compare date (optional)
  // regionIndex defaults to 1 (Yandex Moscow / first region)
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

// Extracts numeric position from positionsData for a given date key pattern
function extractPosition(
  positionsData: TopvisorKeyword["positionsData"],
  datePrefix: string
): number | null {
  if (!positionsData || Array.isArray(positionsData)) return null;
  const entry = Object.entries(positionsData).find(([key]) => key.startsWith(datePrefix));
  if (!entry) return null;
  const pos = entry[1]?.position;
  if (typeof pos === "number" && pos >= 1) return pos;
  return null; // "--" means not in TOP-100
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
  hasCompare: boolean
): PositionsSummaryData {
  const { keywords, tops, visibility } = result;
  const dates = result.headers?.dates ?? [];
  const date0 = dates[0] ?? "";
  const date1 = dates[1] ?? "";

  // Try to use tops from API first (only reliable when 1 date, no compare)
  const apiTops = !hasCompare ? (tops?.["0"] ?? tops?.["all"] ?? null) : null;

  const top1  = apiTops ? (apiTops["1"]  ?? 0) : countTopsFromKeywords(keywords, date0, 1);
  const top3  = apiTops ? (apiTops["3"]  ?? 0) : countTopsFromKeywords(keywords, date0, 3);
  const top5  = apiTops ? (apiTops["5"]  ?? 0) : countTopsFromKeywords(keywords, date0, 5);
  const top10 = apiTops ? (apiTops["10"] ?? 0) : countTopsFromKeywords(keywords, date0, 10);

  const prevTop1  = hasCompare ? countTopsFromKeywords(keywords, date1, 1)  : null;
  const prevTop3  = hasCompare ? countTopsFromKeywords(keywords, date1, 3)  : null;
  const prevTop5  = hasCompare ? countTopsFromKeywords(keywords, date1, 5)  : null;
  const prevTop10 = hasCompare ? countTopsFromKeywords(keywords, date1, 10) : null;

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
  };
}

export function buildTableData(
  result: TopvisorHistoryResult,
  hasCompare: boolean
): PositionsTableData {
  const { keywords, groups } = result;
  const dates = result.headers?.dates ?? [];
  const date0 = dates[0] ?? "";
  const date1 = dates[1] ?? "";

  const groupMap = new Map<number, PositionsGroup>();
  for (const g of groups ?? []) {
    groupMap.set(g.id, { id: g.id, name: g.name, keywords: [] });
  }

  const ungrouped: PositionsKeyword[] = [];

  for (const kw of keywords) {
    const position     = extractPosition(kw.positionsData, date0);
    const prevPosition = hasCompare ? extractPosition(kw.positionsData, date1) : null;

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

  return { groups: groupsArr, ungrouped };
}
