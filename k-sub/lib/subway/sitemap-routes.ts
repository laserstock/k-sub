import { getSearchIndex } from "./data";
import { buildRouteSlug } from "./slug";
import type { SearchOption } from "./types";

/** Tourist-heavy hubs used as From stations in sitemap pairs. */
const HUB_SLUG_HINTS = [
  "jonggak",
  "seoul-station",
  "gangnam",
  "hongdae",
  "myeongdong",
  "city-hall",
  "hapjeong",
  "itaewon",
  "jamsil",
  "dongdaemun",
  "gwanghwamun",
  "sindorim",
  "express-bus-terminal",
  "samgakji",
  "yongsan",
];

/** Landmark / destination labels we try to resolve from the search index. */
const LANDMARK_HINTS = [
  "n seoul tower",
  "gyeongbokgung",
  "changdeokgung",
  "namdaemun",
  "insadong",
  "myeongdong street",
  "hongdae",
  "coex",
  "lotte world",
  "seoul global center",
  "dongdaemun design plaza",
  "starfield",
];

const MAX_ROUTE_URLS = 280;

function findBySlugHints(
  options: SearchOption[],
  hints: string[],
  kind?: SearchOption["kind"],
): SearchOption[] {
  const pool = kind ? options.filter((o) => o.kind === kind) : options;
  const out: SearchOption[] = [];
  const seen = new Set<string>();
  for (const hint of hints) {
    const hit =
      pool.find((o) => o.slug === hint) ??
      pool.find((o) => o.slug.includes(hint)) ??
      pool.find((o) => o.labelEn.toLowerCase().includes(hint.replace(/-/g, " ")));
    if (hit && !seen.has(hit.slug)) {
      seen.add(hit.slug);
      out.push(hit);
    }
  }
  return out;
}

/**
 * Build a capped list of /routes/{from}-to-{to} slugs for the sitemap.
 * Prefer real index matches; avoid combinatorial explosion of thin pages.
 */
export async function buildSitemapRouteSlugs(): Promise<{
  slugs: string[];
  hubCount: number;
  landmarkCount: number;
  error: string | null;
}> {
  const index = await getSearchIndex();
  if (index.error || index.stations.length === 0) {
    // Static fallback when Supabase is unavailable at build time
    const fallback = [
      "jonggak-to-seoul-station",
      "hongdae-station-to-n-seoul-tower",
      "gangnam-to-seoul-station",
      "myeongdong-to-n-seoul-tower",
      "hapjeong-to-seoul-global-center",
    ];
    return {
      slugs: fallback,
      hubCount: 0,
      landmarkCount: 0,
      error: index.error,
    };
  }

  const hubs = findBySlugHints(index.stations, HUB_SLUG_HINTS, "station");
  // Ensure we always have a few hubs even if hints miss
  const hubList =
    hubs.length >= 4
      ? hubs
      : [
          ...hubs,
          ...index.stations.filter(
            (s) => !hubs.some((h) => h.slug === s.slug),
          ),
        ].slice(0, 12);

  const landmarks = findBySlugHints(
    index.landmarks,
    LANDMARK_HINTS,
    "landmark",
  );
  const landmarkList =
    landmarks.length >= 4
      ? landmarks.slice(0, 24)
      : [
          ...landmarks,
          ...index.landmarks.filter(
            (l) => !landmarks.some((x) => x.slug === l.slug),
          ),
        ].slice(0, 24);

  // Major station destinations (not only landmarks)
  const destStations = findBySlugHints(
    index.stations,
    [
      "seoul-station",
      "gangnam",
      "jonggak",
      "myeongdong",
      "hongdae",
      "jamsil",
      "itaewon",
      "dongdaemun",
    ],
    "station",
  );

  const slugs: string[] = [];
  const seen = new Set<string>();

  function addPair(from: SearchOption, to: SearchOption) {
    if (from.slug === to.slug) return;
    const slug = buildRouteSlug(
      from.labelEn,
      to.labelEn,
      from.labelKo,
      to.labelKo,
    );
    if (seen.has(slug)) return;
    seen.add(slug);
    slugs.push(slug);
  }

  for (const from of hubList) {
    for (const to of landmarkList) {
      if (slugs.length >= MAX_ROUTE_URLS) break;
      addPair(from, to);
    }
    for (const to of destStations) {
      if (slugs.length >= MAX_ROUTE_URLS) break;
      addPair(from, to);
    }
  }

  return {
    slugs: slugs.slice(0, MAX_ROUTE_URLS),
    hubCount: hubList.length,
    landmarkCount: landmarkList.length,
    error: null,
  };
}
