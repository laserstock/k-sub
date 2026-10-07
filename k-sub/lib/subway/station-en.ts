/**
 * Last-resort English when `역명_EN` is still null after reimport.
 * Prefer the real DB column whenever it has latin text.
 */
export const STATION_EN_FALLBACKS: Record<string, string> = {
  장한평: "Janghanpyeong",
};

/** Prefer real `역명_EN`; never treat Hangul as English (breaks ASCII slugs). */
export function englishStationName(stationKo: string, stationEn: string): string {
  const en = stationEn.trim();
  if (en && /[a-z]/i.test(en)) return en;
  return STATION_EN_FALLBACKS[stationKo.trim()] || "";
}
