const ENGINE_COLOR_MAP: Array<{ keys: string[]; color: string }> = [
  { keys: ["yandex", "яндекс"],          color: "#FF7A00" },
  { keys: ["google"],                     color: "#4285F4" },
  { keys: ["bing"],                       color: "#00B4D8" },
  { keys: ["mail", "мейл", "mail.ru"],   color: "#005FF9" },
  { keys: ["rambler", "рамблер"],        color: "#E8272A" },
  { keys: ["yahoo"],                      color: "#720E9E" },
  { keys: ["duckduckgo"],                 color: "#DE5833" },
  { keys: ["baidu"],                      color: "#2932E1" },
];

const FALLBACK_COLORS = ["#9ca3af", "#a855f7", "#22c55e", "#14b8a6", "#eab308"];

export function getEngineColor(id: string, idx: number): string {
  const lower = (id ?? "").toLowerCase();
  for (const entry of ENGINE_COLOR_MAP) {
    if (entry.keys.some((k) => lower.includes(k))) return entry.color;
  }
  return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}
