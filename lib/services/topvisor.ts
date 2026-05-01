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

export interface TopvisorGroupInfo {
  id: number;
  name: string;
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

interface TopvisorRegion {
  index: string | number;
  name: string;
  countryCode?: string;
}

interface TopvisorSearcher {
  name: string;
  key: number;
  regions: TopvisorRegion[];
}

interface TopvisorExistsDatesResult {
  existsDates: string[] | null;
  keywords: [];
  headers: {
    dates: string[];
    projects?: { searchers?: TopvisorSearcher[] }[];
  };
}

export interface TopvisorHistoryResult {
  keywords: TopvisorKeyword[];
  groups: TopvisorGroup[];
  tops?: Record<string, Record<string, number>> | null;
  visibility?: number | null;
  headers?: {
    dates?: string[];
    projects?: { searchers?: TopvisorSearcher[] }[];
  };
}

// ── Derived data types (stored in snapshotData) ──────────────────────────────

export interface SearcherSummary {
  name: string;          // "Яндекс" | "Google"
  regionName: string;    // "Москва", "Россия", etc.
  totalKeywords: number;
  top1: number;
  top3: number;
  top5: number;
  top10: number;
  prevTop1: number | null;
  prevTop3: number | null;
  prevTop5: number | null;
  prevTop10: number | null;
}

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
  scanDate: string | null;
  compareScanDate: string | null;
  bySearcher: SearcherSummary[];  // per-searcher breakdown (Яндекс / Google)
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

  // Returns all keyword groups for a project.
  async getGroups(projectId: number): Promise<TopvisorGroupInfo[]> {
    const result = await this.request<TopvisorGroupInfo[]>("get/keywords_2/groups", {
      project_id: projectId,
    });
    return Array.isArray(result) ? result : [];
  }

  // Returns all searchers+regions for a project via a broad probe request (indexes 1..20).
  // Result shape: [{ searcherName, searcherKey, regionIndex, regionName }]
  async getProjectSearchers(projectId: number): Promise<{ searcherName: string; searcherKey: number; regionIndex: number; regionName: string }[]> {
    const today = new Date().toISOString().slice(0, 10);
    const probeIndexes = Array.from({ length: 20 }, (_, i) => i + 1);
    const result = await this.request<TopvisorExistsDatesResult>(
      "get/positions_2/history",
      {
        project_id: projectId,
        regions_indexes: probeIndexes,
        type_range: 1,
        date1: today,
        date2: today,
        show_headers: true,
      }
    );
    const searchers = result.headers?.projects?.[0]?.searchers ?? [];
    const out: { searcherName: string; searcherKey: number; regionIndex: number; regionName: string }[] = [];
    for (const s of searchers) {
      // Only Yandex (key=0) and Google (key=1) — skip placeholder entries
      if (s.key !== 0 && s.key !== 1) continue;
      for (const r of s.regions ?? []) {
        const idx = Number(r.index);
        if (idx >= 1) {
          out.push({ searcherName: s.name, searcherKey: s.key, regionIndex: idx, regionName: r.name });
        }
      }
    }
    return out;
  }

  // Returns all region indexes configured for a project.
  async getProjectRegionIndexes(projectId: number): Promise<number[]> {
    const searchers = await this.getProjectSearchers(projectId);
    const indexes = searchers.map((s) => s.regionIndex);
    return indexes.length > 0 ? indexes : [1];
  }

  // Returns sorted list of dates when positions were actually scanned.
  // Passes all known region indexes at once — existsDates is the union across all regions.
  // Also returns the first region index that has data (for getPositionsHistory calls).
  async getExistsDates(projectId: number, regionIndex?: number): Promise<{ dates: string[]; regionIndex: number }> {
    const today = new Date().toISOString().slice(0, 10);

    if (regionIndex != null) {
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
      return { dates: result.existsDates ?? [], regionIndex };
    }

    // Discover all regions, try each until we find one with dates
    const searchers = await this.getProjectSearchers(projectId);
    const allIndexes = searchers.map((s) => s.regionIndex);
    const probeIndexes = allIndexes.length > 0 ? allIndexes : [1];

    for (const idx of probeIndexes) {
      const result = await this.request<TopvisorExistsDatesResult>(
        "get/positions_2/history",
        {
          project_id: projectId,
          regions_indexes: [idx],
          type_range: 1,
          date1: "2020-01-01",
          date2: today,
          show_headers: true,
          show_exists_dates: true,
        }
      );
      const dates = result.existsDates ?? [];
      if (dates.length > 0) return { dates, regionIndex: idx };
    }

    return { dates: [], regionIndex: probeIndexes[0] ?? 1 };
  }

  // Fetches keyword positions for specific dates.
  // groupIds: if provided, filters to only those groups (fetches group_id map first).
  async getPositionsHistory(
    projectId: number,
    dates: string[],
    regionIndex = 1,
    groupIds?: number[]
  ): Promise<TopvisorHistoryResult> {
    // positions_2/history doesn't return group_id — fetch from keywords_2/keywords and merge.
    const [posResult, keywordsWithGroups] = await Promise.all([
      this.request<TopvisorHistoryResult>("get/positions_2/history", {
        project_id: projectId,
        regions_indexes: [regionIndex],
        type_range: 0,
        dates,
        show_headers: true,
        show_tops: true,
        show_visibility: true,
        ...(groupIds && groupIds.length > 0 ? { groups_ids: groupIds } : {}),
      }),
      this.request<{ id: number; name: string; group_id: number | null }[]>(
        "get/keywords_2/keywords",
        { project_id: projectId, fields: ["id", "name", "group_id"] }
      ).catch(() => [] as { id: number; name: string; group_id: number | null }[]),
    ]);

    // Build name→group_id map (positions history returns keywords by name, no id)
    const nameToGroupId = new Map<string, number | null>();
    for (const kw of keywordsWithGroups) {
      nameToGroupId.set(kw.name, kw.group_id ?? null);
    }

    // Merge group_id into position keywords
    const mergedKeywords = (posResult.keywords ?? []).map((kw) => ({
      ...kw,
      group_id: nameToGroupId.get(kw.name) ?? null,
    }));

    // Filter to requested groups (API groups_ids param doesn't work reliably)
    const keywords =
      groupIds && groupIds.length > 0
        ? mergedKeywords.filter(
            (kw) => kw.group_id !== null && groupIds.includes(kw.group_id)
          )
        : mergedKeywords;

    // Collect groups referenced by the filtered keywords
    const usedGroupIds = new Set(keywords.map((k) => k.group_id).filter(Boolean));
    const allGroups = await this.getGroups(projectId);
    const groups = allGroups.filter((g) => usedGroupIds.has(g.id));

    return { ...posResult, keywords, groups };
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

function buildSearcherSummary(
  keywords: TopvisorKeyword[],
  searcherName: string,
  regionName: string,
  scanDate: string,
  compareScanDate: string | null,
): SearcherSummary {
  return {
    name: searcherName,
    regionName,
    totalKeywords: keywords.length,
    top1:  countTopsFromKeywords(keywords, scanDate, 1),
    top3:  countTopsFromKeywords(keywords, scanDate, 3),
    top5:  countTopsFromKeywords(keywords, scanDate, 5),
    top10: countTopsFromKeywords(keywords, scanDate, 10),
    prevTop1:  compareScanDate ? countTopsFromKeywords(keywords, compareScanDate, 1)  : null,
    prevTop3:  compareScanDate ? countTopsFromKeywords(keywords, compareScanDate, 3)  : null,
    prevTop5:  compareScanDate ? countTopsFromKeywords(keywords, compareScanDate, 5)  : null,
    prevTop10: compareScanDate ? countTopsFromKeywords(keywords, compareScanDate, 10) : null,
  };
}

export function buildSummaryData(
  result: TopvisorHistoryResult,
  scanDate: string,
  compareScanDate: string | null,
  searcherName = "Яндекс",
  regionName = "",
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

  const bySearcher: SearcherSummary[] = [
    buildSearcherSummary(keywords, searcherName, regionName, scanDate, compareScanDate),
  ];

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
    bySearcher,
  };
}

// Builds summary data from multiple per-searcher results (for multi-searcher projects).
export function buildMultiSearcherSummaryData(
  results: { result: TopvisorHistoryResult; searcherName: string; regionName: string }[],
  scanDate: string,
  compareScanDate: string | null,
): PositionsSummaryData {
  const bySearcher: SearcherSummary[] = results.map(({ result, searcherName, regionName }) =>
    buildSearcherSummary(result.keywords, searcherName, regionName, scanDate, compareScanDate)
  );

  // Aggregate across all searchers (de-duplicate keyword names for totalKeywords)
  const allKeywordNames = new Set(results.flatMap((r) => r.result.keywords.map((k) => k.name)));
  const totalKeywords = allKeywordNames.size;

  // Sum tops across searchers — use first searcher's data for aggregate (Яндекс primary)
  const primary = results[0]?.result;
  const keywords = primary?.keywords ?? [];

  return {
    totalKeywords,
    visibility: typeof primary?.visibility === "number" ? primary.visibility : null,
    top1:  countTopsFromKeywords(keywords, scanDate, 1),
    top3:  countTopsFromKeywords(keywords, scanDate, 3),
    top5:  countTopsFromKeywords(keywords, scanDate, 5),
    top10: countTopsFromKeywords(keywords, scanDate, 10),
    prevTop1:  compareScanDate ? countTopsFromKeywords(keywords, compareScanDate, 1)  : null,
    prevTop3:  compareScanDate ? countTopsFromKeywords(keywords, compareScanDate, 3)  : null,
    prevTop5:  compareScanDate ? countTopsFromKeywords(keywords, compareScanDate, 5)  : null,
    prevTop10: compareScanDate ? countTopsFromKeywords(keywords, compareScanDate, 10) : null,
    prevVisibility: null,
    scanDate,
    compareScanDate,
    bySearcher,
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
