import { unstable_cache } from "next/cache";
import {
  getSupabaseClient,
  REVALIDATE_SECONDS,
} from "@/lib/supabase/client";
import { formatSupabaseError, mapExitRows } from "./map";
import { englishStationName } from "./station-en";
import { canonicalizeSlug, stationSlug } from "./slug";
import type { ExitRow, SearchOption } from "./types";

/** Columns used by UI — never select('*'). */
export const EXIT_SELECT_COLUMNS =
  "역명,역명_EN,출구별주요시설명,출구시설_EN,출구번호,노선명";

const PAGE_SIZE = 1000;

type RawResult = {
  rows: Record<string, unknown>[];
  error: string | null;
};

async function fetchPages(columns: string): Promise<RawResult> {
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

      const batch = (data ?? []) as unknown as Record<string, unknown>[];
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

async function fetchPagesEq(
  columns: string,
  column: string,
  value: string,
): Promise<RawResult> {
  try {
    const supabase = getSupabaseClient();
    const all: Record<string, unknown>[] = [];
    let from = 0;

    while (true) {
      const { data, error } = await supabase
        .from("subway_exits")
        .select(columns)
        .eq(column, value)
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        return {
          rows: [],
          error: formatSupabaseError(error.message, error.code),
        };
      }

      const batch = (data ?? []) as unknown as Record<string, unknown>[];
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

/** Cached full catalog (explicit columns). Used to build search index hourly. */
const getCachedCatalogRaw = unstable_cache(
  async (): Promise<RawResult> => fetchPages(EXIT_SELECT_COLUMNS),
  ["subway-exits-catalog-v2"],
  { revalidate: REVALIDATE_SECONDS, tags: ["subway-exits"] },
);

const getCachedStationExitsRaw = unstable_cache(
  async (stationKo: string): Promise<RawResult> =>
    fetchPagesEq(EXIT_SELECT_COLUMNS, "역명", stationKo),
  ["subway-exits-by-station-v2"],
  { revalidate: REVALIDATE_SECONDS, tags: ["subway-exits"] },
);

const getCachedPopularRaw = unstable_cache(
  async (limit: number): Promise<RawResult> => {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("subway_exits")
        .select(EXIT_SELECT_COLUMNS)
        .limit(limit);
      if (error) {
        return {
          rows: [],
          error: formatSupabaseError(error.message, error.code),
        };
      }
      return {
        rows: (data ?? []) as unknown as Record<string, unknown>[],
        error: null,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { rows: [], error: formatSupabaseError(message) };
    }
  },
  ["subway-exits-popular-v2"],
  { revalidate: REVALIDATE_SECONDS, tags: ["subway-exits"] },
);

export type SearchIndex = {
  options: SearchOption[];
  stations: SearchOption[];
  landmarks: SearchOption[];
  distinctStationCount: number;
  error: string | null;
};

function buildIndexFromRows(raw: Record<string, unknown>[]): SearchIndex {
  const stations = new Map<string, SearchOption>();
  const landmarks = new Map<string, SearchOption>();
  const usedStationSlugs = new Set<string>();
  const usedLandmarkSlugs = new Set<string>();

  for (const row of raw) {
    const stationKo = String(row["역명"] ?? "").trim();
    const stationEnRaw = String(row["역명_EN"] ?? "").trim();
    const stationEn = englishStationName(stationKo, stationEnRaw);
    const stationKey = stationKo || stationEnRaw;

    if (stationKey && !stations.has(stationKey)) {
      let slug = stationSlug(stationEn, stationKo);
      if (slug) {
        if (usedStationSlugs.has(slug)) {
          const alt = stationSlug("", stationKo || stationEn);
          slug =
            alt && !usedStationSlugs.has(alt)
              ? alt
              : `${slug}-${usedStationSlugs.size}`;
        }
        usedStationSlugs.add(slug);
        stations.set(stationKey, {
          id: `station:${slug}`,
          kind: "station",
          labelEn: stationEn || stationKo || stationEnRaw,
          labelKo: stationKo || stationEnRaw,
          slug,
        });
      }
    } else if (stationKey && stations.has(stationKey)) {
      const existing = stations.get(stationKey)!;
      if (!/[a-z]/i.test(existing.labelEn) && stationEn) {
        existing.labelEn = stationEn;
      }
    }

    const facilityKo = String(row["출구별주요시설명"] ?? "").trim();
    const facilityEn = String(row["출구시설_EN"] ?? "").trim();
    const facKey = facilityKo || facilityEn;
    if (facKey && !landmarks.has(facKey)) {
      let slug = stationSlug(facilityEn, facilityKo);
      if (slug && slug.length >= 3) {
        if (usedLandmarkSlugs.has(slug)) {
          const alt = stationSlug("", facilityKo || facilityEn);
          slug =
            alt && !usedLandmarkSlugs.has(alt)
              ? alt
              : `${slug}-${usedLandmarkSlugs.size}`;
        }
        usedLandmarkSlugs.add(slug);
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

  const stationList = [...stations.values()].sort((a, b) =>
    a.labelKo.localeCompare(b.labelKo, "ko"),
  );
  const landmarkList = [...landmarks.values()].sort((a, b) =>
    a.labelEn.localeCompare(b.labelEn, "en"),
  );

  return {
    options: [...stationList, ...landmarkList],
    stations: stationList,
    landmarks: landmarkList,
    distinctStationCount: stationList.length,
    error: null,
  };
}

const getCachedSearchIndex = unstable_cache(
  async (): Promise<SearchIndex> => {
    const { rows, error } = await getCachedCatalogRaw();
    if (error) {
      return {
        options: [],
        stations: [],
        landmarks: [],
        distinctStationCount: 0,
        error,
      };
    }
    return buildIndexFromRows(rows);
  },
  ["subway-search-index-v2"],
  { revalidate: REVALIDATE_SECONDS, tags: ["subway-exits"] },
);

/** Home autocomplete: stations + landmarks (cached 1h). */
export async function getSearchIndex(): Promise<SearchIndex> {
  return getCachedSearchIndex();
}

export async function fetchAllStationOptions(): Promise<{
  stations: SearchOption[];
  distinctCount: number;
  error: string | null;
}> {
  const index = await getSearchIndex();
  return {
    stations: index.stations,
    distinctCount: index.distinctStationCount,
    error: index.error,
  };
}

export async function fetchLandmarkOptions(): Promise<{
  landmarks: SearchOption[];
  error: string | null;
}> {
  const index = await getSearchIndex();
  return { landmarks: index.landmarks, error: index.error };
}

export async function fetchPopularExits(limit = 8): Promise<{
  rows: ExitRow[];
  error: string | null;
}> {
  const { rows, error } = await getCachedPopularRaw(limit);
  if (error) return { rows: [], error };
  return { rows: mapExitRows(rows), error: null };
}

/** @deprecated Prefer getSearchIndex / fetchExitsForStation */
export async function fetchExitCatalog(): Promise<{
  rows: ExitRow[];
  error: string | null;
}> {
  const { rows, error } = await getCachedCatalogRaw();
  if (error) return { rows: [], error };
  return { rows: mapExitRows(rows), error: null };
}

export async function fetchExitsForStation(stationKo: string): Promise<{
  rows: ExitRow[];
  error: string | null;
}> {
  const ko = stationKo.trim();
  if (!ko) return { rows: [], error: null };
  const { rows, error } = await getCachedStationExitsRaw(ko);
  if (error) return { rows: [], error };
  return { rows: mapExitRows(rows), error: null };
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

  if (destination.stationKo) {
    const scoped = matched.filter((r) => r.stationKo === destination.stationKo);
    if (scoped.length) matched = scoped;
  } else if (destination.stationEn) {
    const scoped = matched.filter(
      (r) =>
        englishStationName(r.stationKo, r.stationEn) ===
          destination.stationEn || r.stationEn === destination.stationEn,
    );
    if (scoped.length) matched = scoped;
  }

  return matched;
}

function exitRowKey(row: ExitRow): string {
  return `${row.stationKo}|${row.exitNumber}|${row.facilityEn}|${row.facilityKo}`;
}

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
  highlights: ExitRow[];
  locked: boolean;
  landmarkLabelEn: string | null;
  landmarkLabelKo: string | null;
};

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

/**
 * One clear answer for the result page.
 * `rows` should already be scoped to the destination station when possible.
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

export type RoutePageData = {
  from: SearchOption | null;
  to: SearchOption | null;
  guide: ExitGuideAnswer | null;
  error: string | null;
};

/**
 * Lean route load: cached search index + exits for destination station only.
 * Avoids reloading ~10k rows on every Find-your-exit click.
 */
export async function loadRoutePageData(
  fromSlug: string,
  toSlug: string,
): Promise<RoutePageData> {
  const index = await getSearchIndex();
  if (index.error) {
    return { from: null, to: null, guide: null, error: index.error };
  }

  const from = findOptionBySlug(index.options, fromSlug) ?? null;
  const to = findOptionBySlug(index.options, toSlug) ?? null;
  if (!from || !to) {
    return { from, to, guide: null, error: null };
  }

  const stationKo =
    to.kind === "station"
      ? to.labelKo
      : to.stationKo || "";

  let rows: ExitRow[] = [];
  let error: string | null = null;

  if (stationKo) {
    const scoped = await fetchExitsForStation(stationKo);
    rows = scoped.rows;
    error = scoped.error;
  }

  // Landmark without stationKo on option — fall back to facility filter via catalog cache
  if (!error && rows.length === 0 && to.kind === "landmark") {
    const catalog = await fetchExitCatalog();
    error = catalog.error;
    rows = exitsForDestination(catalog.rows, to);
    if (rows[0]?.stationKo) {
      const stationFill = await fetchExitsForStation(rows[0].stationKo);
      if (!stationFill.error && stationFill.rows.length) {
        rows = stationFill.rows;
      }
    }
  }

  if (error) {
    return { from, to, guide: null, error };
  }

  return {
    from,
    to,
    guide: resolveExitGuide(rows, to),
    error: null,
  };
}
