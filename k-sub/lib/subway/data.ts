import { getSupabaseClient } from "@/lib/supabase/client";
import { formatSupabaseError, mapExitRows } from "./map";
import { englishStationName } from "./station-en";
import { canonicalizeSlug, stationSlug } from "./slug";
import type { ExitRow, SearchOption } from "./types";

const SELECT_COLUMNS =
  "역명,역명_EN,출구별주요시설명,출구시설_EN,출구번호,노선명";

const STATION_COLUMNS = "역명,역명_EN";

const PAGE_SIZE = 1000;

async function fetchPages(
  columns: string,
): Promise<{ rows: Record<string, unknown>[]; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const all: Record<string, unknown>[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("subway_exits")
        .select(columns)
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        return {
          rows: [],
          error: formatSupabaseError(error.message, error.code),
        };
      }

      const batch = (data ?? []) as Record<string, unknown>[];
      all.push(...batch);
      if (batch.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }

    return { rows: all, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { rows: [], error: formatSupabaseError(message) };
  }
}

/** Full exit rows for route pages (paginated until exhausted). */
export async function fetchExitCatalog(): Promise<{
  rows: ExitRow[];
  error: string | null;
}> {
  const { rows, error } = await fetchPages(SELECT_COLUMNS);
  if (error) return { rows: [], error };
  return { rows: mapExitRows(rows), error: null };
}

/**
 * Lightweight station list for From/To autocomplete.
 * Distinct by Korean station name; covers every station in the table.
 */
export async function fetchAllStationOptions(): Promise<{
  stations: SearchOption[];
  distinctCount: number;
  error: string | null;
}> {
  const { rows, error } = await fetchPages(STATION_COLUMNS);
  if (error) return { stations: [], distinctCount: 0, error };

  const byKo = new Map<string, SearchOption>();
  const usedSlugs = new Set<string>();

  for (const row of rows) {
    const stationKo = String(row["역명"] ?? "").trim();
    const stationEnRaw = String(row["역명_EN"] ?? "").trim();
    if (!stationKo && !stationEnRaw) continue;

    const key = stationKo || stationEnRaw;
    if (byKo.has(key)) {
      // Prefer a row that has English if we stored a KO-only stub earlier
      const existing = byKo.get(key)!;
      if (!existing.labelEn.match(/[a-z]/i) && stationEnRaw) {
        const en = englishStationName(stationKo, stationEnRaw);
        if (en) {
          existing.labelEn = en;
        }
      }
      continue;
    }

    const stationEn = englishStationName(stationKo, stationEnRaw);
    let slug = stationSlug(stationEn, stationKo);
    if (!slug) continue;

    // Disambiguate rare EN collisions (e.g. bad data: 사당/신사 both "shrine")
    if (usedSlugs.has(slug)) {
      const alt = stationSlug("", stationKo || stationEn || key);
      slug = alt && !usedSlugs.has(alt) ? alt : `${slug}-${usedSlugs.size}`;
    }
    usedSlugs.add(slug);

    byKo.set(key, {
      id: `station:${slug}`,
      kind: "station",
      labelEn: stationEn || stationKo || stationEnRaw,
      labelKo: stationKo || stationEnRaw,
      slug,
    });
  }

  const stations = [...byKo.values()].sort((a, b) =>
    a.labelKo.localeCompare(b.labelKo, "ko"),
  );

  return { stations, distinctCount: stations.length, error: null };
}

/** Landmark options from full table (paginated). */
export async function fetchLandmarkOptions(): Promise<{
  landmarks: SearchOption[];
  error: string | null;
}> {
  const { rows, error } = await fetchPages(
    "역명,역명_EN,출구별주요시설명,출구시설_EN",
  );
  if (error) return { landmarks: [], error };

  const landmarks = new Map<string, SearchOption>();
  const usedSlugs = new Set<string>();

  for (const row of rows) {
    const facilityKo = String(row["출구별주요시설명"] ?? "").trim();
    const facilityEn = String(row["출구시설_EN"] ?? "").trim();
    if (!facilityKo && !facilityEn) continue;

    const key = facilityKo || facilityEn;
    if (landmarks.has(key)) continue;

    let slug = stationSlug(facilityEn, facilityKo);
    if (!slug || slug.length < 3) continue;
    if (usedSlugs.has(slug)) {
      const alt = stationSlug("", facilityKo || facilityEn);
      slug = alt && !usedSlugs.has(alt) ? alt : `${slug}-${usedSlugs.size}`;
    }
    usedSlugs.add(slug);

    const stationKo = String(row["역명"] ?? "").trim();
    const stationEn = englishStationName(
      stationKo,
      String(row["역명_EN"] ?? ""),
    );

    landmarks.set(key, {
      id: `landmark:${slug}`,
      kind: "landmark",
      labelEn: facilityEn || facilityKo,
      labelKo: facilityKo || facilityEn,
      slug,
      stationEn: stationEn || undefined,
      stationKo: stationKo || undefined,
    });
  }

  return {
    landmarks: [...landmarks.values()].sort((a, b) =>
      a.labelEn.localeCompare(b.labelEn, "en"),
    ),
    error: null,
  };
}

export async function fetchPopularExits(limit = 8): Promise<{
  rows: ExitRow[];
  error: string | null;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("subway_exits")
      .select(SELECT_COLUMNS)
      .limit(limit);

    if (error) {
      return {
        rows: [],
        error: formatSupabaseError(error.message, error.code),
      };
    }

    return {
      rows: mapExitRows((data ?? []) as Record<string, unknown>[]),
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { rows: [], error: formatSupabaseError(message) };
  }
}

/** @deprecated Prefer fetchAllStationOptions + fetchLandmarkOptions */
export function buildSearchOptions(rows: ExitRow[]): SearchOption[] {
  const stations = new Map<string, SearchOption>();
  const landmarks = new Map<string, SearchOption>();
  const usedStationSlugs = new Set<string>();

  for (const row of rows) {
    const stationKo = row.stationKo.trim();
    const stationEn = englishStationName(row.stationKo, row.stationEn);
    const key = stationKo || stationEn;
    if (key && !stations.has(key)) {
      let slug = stationSlug(stationEn, stationKo);
      if (slug) {
        if (usedStationSlugs.has(slug)) {
          const alt = stationSlug("", stationKo || stationEn);
          slug = alt && !usedStationSlugs.has(alt) ? alt : `${slug}-${usedStationSlugs.size}`;
        }
        usedStationSlugs.add(slug);
        stations.set(key, {
          id: `station:${slug}`,
          kind: "station",
          labelEn: stationEn || stationKo,
          labelKo: stationKo || stationEn,
          slug,
        });
      }
    }

    const facilityEn = row.facilityEn || row.facilityKo;
    const facilityKo = row.facilityKo || row.facilityEn;
    const facKey = facilityKo || facilityEn;
    if (facKey && !landmarks.has(facKey)) {
      let slug = stationSlug(facilityEn, facilityKo);
      if (slug && slug.length >= 3) {
        landmarks.set(facKey, {
          id: `landmark:${slug}`,
          kind: "landmark",
          labelEn: facilityEn || facilityKo,
          labelKo: facilityKo || facilityEn,
          slug,
          stationEn: stationEn || undefined,
          stationKo: stationKo || undefined,
        });
      }
    }
  }

  return [
    ...[...stations.values()].sort((a, b) =>
      a.labelKo.localeCompare(b.labelKo, "ko"),
    ),
    ...[...landmarks.values()].sort((a, b) =>
      a.labelEn.localeCompare(b.labelEn, "en"),
    ),
  ];
}

export function findOptionBySlug(
  options: SearchOption[],
  slug: string,
): SearchOption | undefined {
  const key = canonicalizeSlug(slug) || slug;
  return (
    options.find((o) => o.kind === "station" && o.slug === key) ??
    options.find((o) => o.slug === key)
  );
}

export function exitsForDestination(
  rows: ExitRow[],
  destination: SearchOption,
): ExitRow[] {
  if (destination.kind === "station") {
    const slug = destination.slug;
    const ko = destination.labelKo;
    return rows.filter((row) => {
      if (ko && row.stationKo === ko) return true;
      const en = englishStationName(row.stationKo, row.stationEn);
      return stationSlug(en, row.stationKo) === slug;
    });
  }

  const landmarkSlug = destination.slug;
  const facKo = destination.labelKo;
  return rows.filter((row) => {
    if (facKo && row.facilityKo === facKo) return true;
    return (
      stationSlug(row.facilityEn || row.facilityKo, row.facilityKo) ===
      landmarkSlug
    );
  });
}

export function exitsForStationSlug(
  rows: ExitRow[],
  stationSlugValue: string,
): ExitRow[] {
  const key = canonicalizeSlug(stationSlugValue) || stationSlugValue;
  return rows.filter((row) => {
    const en = englishStationName(row.stationKo, row.stationEn);
    return stationSlug(en, row.stationKo) === key;
  });
}

export function uniqueExitHighlights(rows: ExitRow[], limit = 8): ExitRow[] {
  const seen = new Set<string>();
  const out: ExitRow[] = [];
  for (const row of rows) {
    const key = `${row.exitNumber}|${row.facilityEn}|${row.facilityKo}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}
