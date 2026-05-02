export type BlockType =
  | "traffic_summary"
  | "traffic_channels"
  | "traffic_search_engines"
  | "search_engines_dynamics"
  | "traffic_search_dynamics"
  | "traffic_yoy"
  | "traffic_geography"
  | "traffic_devices"
  | "top_pages"
  | "top_queries"
  | "referrals"
  | "high_bounce_pages"
  | "positions_summary"
  | "positions_table"
  | "webmaster_ikh"
  | "webmaster_indexing"
  | "webmaster_backlinks"
  | "gsc_summary"
  | "work_done"
  | "work_plan"
  | "custom_text"
  | "custom_kpi";

export interface BlockConfig {
  id: string;
  type: BlockType;
  enabled: boolean;
  order: number;
  commentAbove: string;
  commentBelow: string;
  settings: Record<string, unknown>;
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  traffic_summary: "Общая посещаемость",
  traffic_channels: "Распределение по каналам",
  traffic_search_engines: "Распределение по поисковым системам",
  search_engines_dynamics: "Динамика переходов из поисковых систем",
  traffic_search_dynamics: "Динамика поискового трафика",
  traffic_yoy: "Сравнение с прошлым годом",
  traffic_geography: "География посетителей",
  traffic_devices: "Тип устройств",
  top_pages: "Популярные посадочные страницы из поисковых систем",
  top_queries: "Популярные поисковые фразы",
  referrals: "Переходы с сайтов",
  high_bounce_pages: "Страницы с высоким отказом",
  positions_summary: "Общая статистика по позициям",
  positions_table: "Позиции в поисковых системах",
  webmaster_ikh: "Индекс качества сайта (ИКС)",
  webmaster_indexing: "Страницы в поиске",
  webmaster_backlinks: "Внешние ссылки",
  gsc_summary: "Google Search Console — сводка",
  work_done: "Проделанная работа",
  work_plan: "План работ",
  custom_text: "Произвольный текст",
  custom_kpi: "Таблица план/факт",
};

export const DEFAULT_BLOCKS: BlockConfig[] = [
  { id: "traffic_summary",          type: "traffic_summary",          enabled: true,  order: 1,  commentAbove: "", commentBelow: "", settings: {} },
  { id: "traffic_channels",         type: "traffic_channels",         enabled: true,  order: 2,  commentAbove: "", commentBelow: "", settings: { metric: "visits", showDynamics: "percent" } },
  { id: "traffic_search_engines",   type: "traffic_search_engines",   enabled: true,  order: 3,  commentAbove: "", commentBelow: "", settings: {} },
  { id: "traffic_search_dynamics",  type: "traffic_search_dynamics",  enabled: true,  order: 4,  commentAbove: "", commentBelow: "", settings: {} },
  { id: "traffic_yoy",              type: "traffic_yoy",              enabled: false, order: 5,  commentAbove: "", commentBelow: "", settings: {} },
  { id: "traffic_geography",        type: "traffic_geography",        enabled: true,  order: 6,  commentAbove: "", commentBelow: "", settings: {} },
  { id: "traffic_devices",          type: "traffic_devices",          enabled: true,  order: 7,  commentAbove: "", commentBelow: "", settings: {} },
  { id: "top_pages",                type: "top_pages",                enabled: true,  order: 8,  commentAbove: "", commentBelow: "", settings: {} },
  { id: "top_queries",              type: "top_queries",              enabled: true,  order: 9,  commentAbove: "", commentBelow: "", settings: {} },
  { id: "referrals",                type: "referrals",                enabled: true,  order: 10, commentAbove: "", commentBelow: "", settings: {} },
  { id: "high_bounce_pages",        type: "high_bounce_pages",        enabled: false, order: 11, commentAbove: "", commentBelow: "", settings: {} },
  { id: "positions_summary",        type: "positions_summary",        enabled: false, order: 12, commentAbove: "", commentBelow: "", settings: {} },
  { id: "positions_table",          type: "positions_table",          enabled: false, order: 13, commentAbove: "", commentBelow: "", settings: {} },
  { id: "webmaster_ikh",            type: "webmaster_ikh",            enabled: false, order: 14, commentAbove: "", commentBelow: "", settings: {} },
  { id: "webmaster_indexing",       type: "webmaster_indexing",       enabled: false, order: 15, commentAbove: "", commentBelow: "", settings: {} },
  { id: "webmaster_backlinks",      type: "webmaster_backlinks",      enabled: false, order: 16, commentAbove: "", commentBelow: "", settings: {} },
  { id: "gsc_summary",              type: "gsc_summary",              enabled: false, order: 17, commentAbove: "", commentBelow: "", settings: {} },
  { id: "work_done",                type: "work_done",                enabled: true,  order: 18, commentAbove: "", commentBelow: "", settings: {} },
  { id: "work_plan",                type: "work_plan",                enabled: true,  order: 19, commentAbove: "", commentBelow: "", settings: {} },
];
