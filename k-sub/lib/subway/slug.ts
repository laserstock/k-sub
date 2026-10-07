import type { RouteSlugParts } from "./types";

/** Common misspellings / alternate English names → canonical slug from data. */
const SLUG_ALIASES: Record<string, string> = {
  jongjak: "jonggak",
  jonggag: "jonggak",
  "city-hall": "town-hall",
  cityhall: "town-hall",
  "seoul-sta": "seoul-station",
  seoulstation: "seoul-station",
  "seoul-stn": "seoul-station",
  janghanpyeong: "janghanpyeong",
  janghanpyong: "janghanpyeong",
};

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Stable slug even when the label is Hangul-only (ASCII slugify would be empty). */
export function stationSlug(labelEn: string, labelKo = ""): string {
  const fromEn = canonicalizeSlug(slugify(labelEn));
  if (fromEn) return fromEn;
  const fromKoAscii = canonicalizeSlug(slugify(labelKo));
  if (fromKoAscii) return fromKoAscii;
  const source = (labelKo || labelEn).trim();
  if (!source) return "";
  return `ko-${[...source].map((c) => c.codePointAt(0)!.toString(16)).join("")}`;
}

export function canonicalizeSlug(slug: string): string {
  const clean = slugify(slug);
  if (!clean) {
    // Preserve ko-<hex> style slugs through canonicalize
    if (slug.startsWith("ko-")) return slug;
    return "";
  }
  return SLUG_ALIASES[clean] ?? clean;
}

export function buildRouteSlug(
  fromLabelEn: string,
  toLabelEn: string,
  fromLabelKo = "",
  toLabelKo = "",
): string {
  const from = stationSlug(fromLabelEn, fromLabelKo);
  const to = stationSlug(toLabelEn, toLabelKo);
  return `${from}-to-${to}`;
}

export function parseRouteSlug(slug: string): RouteSlugParts | null {
  const marker = "-to-";
  // Keep ko-<hex> segments intact; only ASCII-normalize non-ko parts via split
  const idx = slug.toLowerCase().indexOf(marker);
  if (idx <= 0) return null;
  const fromRaw = slug.slice(0, idx);
  const toRaw = slug.slice(idx + marker.length);
  if (!fromRaw || !toRaw) return null;

  const normalizePart = (part: string) => {
    if (part.startsWith("ko-")) return part;
    return canonicalizeSlug(part) || stationSlug(part);
  };

  return {
    fromSlug: normalizePart(fromRaw),
    toSlug: normalizePart(toRaw),
  };
}

export function titleFromSlug(slug: string): string {
  if (slug.startsWith("ko-")) return slug;
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
