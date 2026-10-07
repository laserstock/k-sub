import {
  isBadStationEn,
  mappedStationEn,
} from "./station-name-mapper";

/**
 * Display / search English for a station.
 * Order: mapper override (when KO known) → clean DB EN → mapper → KO.
 * Never surfaces mangled literals like "constant" for 상수.
 */
export function englishStationName(stationKo: string, stationEn: string): string {
  const ko = stationKo.trim();
  const en = stationEn.trim();
  const mapped = mappedStationEn(ko);

  if (mapped) {
    // Prefer mapper when DB EN is missing or clearly wrong
    if (!en || isBadStationEn(en) || en.toLowerCase() === mapped.toLowerCase()) {
      return mapped;
    }
    // DB has a different but non-bad EN (e.g. longer official form) — keep DB if it looks proper
    if (!isBadStationEn(en) && /[A-Z]/.test(en)) return en;
    return mapped;
  }

  if (en && /[a-z]/i.test(en) && !isBadStationEn(en)) return en;
  return mapped || "";
}
