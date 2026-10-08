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
  const facEn = destination.labelEn;
  let matched = rows.filter((row) => {
    if (facKo && row.facilityKo === facKo) return true;
    if (facEn && row.facilityEn === facEn) return true;
    return (
      stationSlug(row.facilityEn || row.facilityKo, row.facilityKo) ===
      landmarkSlug
    );
  });

  // Prefer the station the search option was built from (same facility can appear at 2 stations)
  if (destination.stationKo) {
    const scoped = matched.filter((r) => r.stationKo === destination.stationKo);
    if (scoped.length) matched = scoped;
  } else if (destination.stationEn) {
    const scoped = matched.filter(
      (r) =>
        englishStationName(r.stationKo, r.stationEn) === destination.stationEn ||
        r.stationEn === destination.stationEn,
    );
    if (scoped.length) matched = scoped;
  }

  return matched;
}

function exitRowKey(row: ExitRow): string {
  return `${row.stationKo}|${row.exitNumber}|${row.facilityEn}|${row.facilityKo}`;
}

/** Put the locked facility exit first, then other exits at the same station. */
function prioritizeLockedExit(
  stationRows: ExitRow[],
  locked: ExitRow,
): ExitRow[] {
  const lockKey = exitRowKey(locked);
  const rest = stationRows.filter((r) => exitRowKey(r) !== lockKey);
  const sameExit = rest.filter((r) => r.exitNumber === locked.exitNumber);
  const other = rest.filter((r) => r.exitNumber !== locked.exitNumber);
  return [locked, ...sameExit, ...other];
}

export type ExitGuideAnswer = {
  arrivalEn: string;
  arrivalKo: string;
  best: ExitRow | null;
  /** Recommended list (locked exit first when landmark). */
  highlights: ExitRow[];
  /** True when To was a facility and Best Exit is locked to that row. */
  locked: boolean;
  landmarkLabelEn: string | null;
  landmarkLabelKo: string | null;
};

/**
 * One clear answer for the result page.
 * Landmark To → lock Best Exit to that facility’s exit at its station.
 * Station To → first unique exit highlight (heuristic).
 */
export function resolveExitGuide(
  rows: ExitRow[],
  destination: SearchOption,
): ExitGuideAnswer {
  if (destination.kind === "landmark") {
    const matched = exitsForDestination(rows, destination);
    const best =
      matched.find((r) => r.exitNumber.trim()) ?? matched[0] ?? null;

    const arrivalKo =
      best?.stationKo ||
      destination.stationKo ||
      matched[0]?.stationKo ||
      "";
    const arrivalEnRaw =
      best?.stationEn ||
      destination.stationEn ||
      matched[0]?.stationEn ||
      "";
    const arrivalEn =
      englishStationName(arrivalKo, arrivalEnRaw) ||
      destination.stationEn ||
      arrivalKo;

    const stationRows = arrivalKo
      ? rows.filter((r) => r.stationKo === arrivalKo)
      : matched;

    const ordered = best
      ? prioritizeLockedExit(
          stationRows.length ? stationRows : matched,
          best,
        )
      : stationRows;
    const highlights = uniqueExitHighlights(ordered, 10);

    return {
      arrivalEn,
      arrivalKo: arrivalKo || arrivalEn,
      best,
      highlights,
      locked: Boolean(best),
      landmarkLabelEn: destination.labelEn || best?.facilityEn || null,
      landmarkLabelKo: destination.labelKo || best?.facilityKo || null,
    };
  }

  const destExits = exitsForDestination(rows, destination);
  const highlights = uniqueExitHighlights(destExits, 10);
  const best = highlights[0] ?? null;

  return {
    arrivalEn: destination.labelEn,
    arrivalKo: destination.labelKo,
    best,
    highlights,
    locked: false,
    landmarkLabelEn: best?.facilityEn || null,
    landmarkLabelKo: best?.facilityKo || null,
  };
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
