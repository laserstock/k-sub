/**
 * English labels when Supabase `역명_EN` is null.
 * Keep small — prefer filling the column in the DB long-term.
 */
export const STATION_EN_FALLBACKS: Record<string, string> = {
  장한평: "Janghanpyeong",
};

export function englishStationName(stationKo: string, stationEn: string): string {
  const en = stationEn.trim();
  if (en) return en;
  const ko = stationKo.trim();
  return STATION_EN_FALLBACKS[ko] || ko;
}
