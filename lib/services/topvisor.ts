const BASE_URL = process.env.TOPVISOR_BASE_URL ?? "https://api.topvisor.com";

// ── API types ────────────────────────────────────────────────────────────────

interface TopvisorResponse<T> {
  status: 0 | 1;
  result: T;
  errors?: string[];
}

export interface TopvisorProject {
  id: number;
  name: string;
  site: string;
}

export interface TopvisorKeyword {
  id: number;
  name: string;
  group_id: number | null;
  // positionsData[dateIndex][searcherIndex] = position (null = not in TOP)
  positionsData: (number | null)[][];
}

export interface TopvisorGroup {
  id: number;
  name: string;
}

export interface TopvisorTops {
  // keys: "1", "3", "5", "10", "100", "out", "nond"
  [key: string]: number;
}

export interface TopvisorHistoryResult {
  keywords: TopvisorKeyword[];
  groups: TopvisorGroup[];
  // tops[searcherKey][topKey] = count
  tops?: Record<string, TopvisorTops>;
  visibility?: number;
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
  id: number;
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

    if (json.status === 0) {
      throw new Error(`Topvisor API error: ${json.errors?.join(", ") ?? "Unknown error"}`);
    }

    return json.result;
  }

  async getProjects(): Promise<TopvisorProject[]> {
    return this.request<TopvisorProject[]>("get/projects_2/projects", {
      fields: ["id", "name", "site"],
    });
  }

  // Fetches keyword positions for 1 or 2 specific dates.
  // dates[0] = current period end date, dates[1] = compare period end date (optional)
  async getPositionsHistory(
    projectId: number,
    dates: string[],
    searcherKey = 0
  ): Promise<TopvisorHistoryResult> {
    return this.request<TopvisorHistoryResult>("get/positions_2/history", {
      project_id: projectId,
      searcher_key: searcherKey,
      type_range: 0,   // specific dates
      dates,
      show_headers: true,
      show_tops: true,
      show_visibility: true,
      fields: {
        keywords: ["id", "name", "group_id"],
        groups: ["id", "name"],
      },
    });
  }
}

// ── Aggregation helpers ───────────────────────────────────────────────────────

function countTops(keywords: TopvisorKeyword[], dateIdx: number, top: number): number {
  return keywords.filter((kw) => {
    const pos = kw.positionsData?.[dateIdx]?.[0];
    return pos !== null && pos !== undefined && pos >= 1 && pos <= top;
  }).length;
}

export function buildSummaryData(
  result: TopvisorHistoryResult,
  hasCompare: boolean
): PositionsSummaryData {
  const { keywords, tops, visibility } = result;

  // Try to use tops from API first; fall back to manual count
  const apiTops = tops?.["0"] ?? tops?.["all"] ?? null;

  const top1  = apiTops ? (apiTops["1"]  ?? 0) : countTops(keywords, 0, 1);
  const top3  = apiTops ? (apiTops["3"]  ?? 0) : countTops(keywords, 0, 3);
  const top5  = apiTops ? (apiTops["5"]  ?? 0) : countTops(keywords, 0, 5);
  const top10 = apiTops ? (apiTops["10"] ?? 0) : countTops(keywords, 0, 10);

  const prevTop1  = hasCompare ? countTops(keywords, 1, 1)  : null;
  const prevTop3  = hasCompare ? countTops(keywords, 1, 3)  : null;
  const prevTop5  = hasCompare ? countTops(keywords, 1, 5)  : null;
  const prevTop10 = hasCompare ? countTops(keywords, 1, 10) : null;

  return {
    totalKeywords: keywords.length,
    visibility: visibility ?? null,
    top1,
    top3,
    top5,
    top10,
    prevTop1,
    prevTop3,
    prevTop5,
    prevTop10,
    prevVisibility: null, // Topvisor doesn't return per-date visibility
  };
}

export function buildTableData(
  result: TopvisorHistoryResult,
  hasCompare: boolean
): PositionsTableData {
  const { keywords, groups } = result;

  const groupMap = new Map<number, PositionsGroup>();
  for (const g of groups ?? []) {
    groupMap.set(g.id, { id: g.id, name: g.name, keywords: [] });
  }

  const ungrouped: PositionsKeyword[] = [];

  for (const kw of keywords) {
    const position     = kw.positionsData?.[0]?.[0] ?? null;
    const prevPosition = hasCompare ? (kw.positionsData?.[1]?.[0] ?? null) : null;

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
