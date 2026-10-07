import { getSupabaseClient } from "@/lib/supabase/client";
import { formatSupabaseError, mapExitRows } from "./map";
import { englishStationName } from "./station-en";
import { canonicalizeSlug, stationSlug } from "./slug";
import type { ExitRow, SearchOption } from "./types";

const SELECT_COLUMNS =
  "역명,역명_EN,출구별주요시설명,출구시설_EN,출구번호,노선명";

const PAGE_SIZE = 1000;

async function fetchRawExitsPage(
  from: number,
  to: number,
): Promise<{ rows: Record<string, unknown>[]; error: string | null }> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("subway_exits")
      .select(SELECT_COLUMNS)
      .range(from, to);

    if (error) {
      return {
        rows: [],
        error: formatSupabaseError(error.message, error.code),
      };
    }

    return { rows: (data ?? []) as Record<string, unknown>[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { rows: [], error: formatSupabaseError(message) };
  }
}

/** Paginate through every subway_exits row (PostgREST caps ~1000/request). */
export async function fetchExitCatalog(): Promise<{
  rows: ExitRow[];
  error: string | null;
}> {
  const all: Record<string, unknown>[] = [];
  let from = 0;

  while (true) {
    const { rows, error } = await fetchRawExitsPage(from, from + PAGE_SIZE - 1);
    if (error) return { rows: [], error };
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { rows: mapExitRows(all), error: null };
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

export function buildSearchOptions(rows: ExitRow[]): SearchOption[] {
  const stations = new Map<string, SearchOption>();
  const landmarks = new Map<string, SearchOption>();

  for (const row of rows) {
    const stationKo = row.stationKo || row.stationEn;
    const stationEn = englishStationName(row.stationKo, row.stationEn);
    if (stationEn || stationKo) {
      const slug = stationSlug(stationEn, stationKo);
      if (slug && !stations.has(slug)) {
        stations.set(slug, {
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
    if (facilityEn || facilityKo) {
      const slug = stationSlug(facilityEn, facilityKo);
      if (slug && slug.length >= 3 && !landmarks.has(slug)) {
        landmarks.set(slug, {
          id: `landmark:${slug}`,
          kind: "landmark",
          labelEn: facilityEn || facilityKo,
          labelKo: facilityKo || facilityEn,
          slug,
          stationEn: englishStationName(row.stationKo, row.stationEn) || undefined,
          stationKo: row.stationKo || undefined,
        });
      }
    }
  }

  return [
    ...[...stations.values()].sort((a, b) =>
      a.labelEn.localeCompare(b.labelEn, "en"),
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
    return rows.filter((row) => {
      const en = englishStationName(row.stationKo, row.stationEn);
      const stationSlugValue = stationSlug(en, row.stationKo || row.stationEn);
      return stationSlugValue === slug;
    });
  }

  const landmarkSlug = destination.slug;
  return rows.filter((row) => {
    const facSlug = stationSlug(
      row.facilityEn || row.facilityKo,
      row.facilityKo || row.facilityEn,
    );
    return facSlug === landmarkSlug;
  });
}

export function exitsForStationSlug(
  rows: ExitRow[],
  stationSlugValue: string,
): ExitRow[] {
  const key = canonicalizeSlug(stationSlugValue) || stationSlugValue;
  return rows.filter((row) => {
    const en = englishStationName(row.stationKo, row.stationEn);
    const slug = stationSlug(en, row.stationKo || row.stationEn);
    return slug === key;
  });
}

/** Unique exits by exit number + facility for cleaner guides. */
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
