/**
 * English labels when Supabase `역명_EN` is null.
 * Prefer filling the DB column long-term; this is a small UI fallback.
 */
export const STATION_EN_FALLBACKS: Record<string, string> = {
  장한평: "Janghanpyeong",
};

/** Real English only — never returns Hangul (that broke ASCII slugify). */
export function englishStationName(stationKo: string, stationEn: string): string {
  const en = stationEn.trim();
  if (en && /[a-z]/i.test(en)) return en;
  return STATION_EN_FALLBACKS[stationKo.trim()] || "";
}
