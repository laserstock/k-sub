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

export function canonicalizeSlug(slug: string): string {
  const clean = slugify(slug);
  return SLUG_ALIASES[clean] ?? clean;
}

export function buildRouteSlug(fromLabelEn: string, toLabelEn: string): string {
  const from = canonicalizeSlug(slugify(fromLabelEn));
  const to = canonicalizeSlug(slugify(toLabelEn));
  return `${from}-to-${to}`;
}

export function parseRouteSlug(slug: string): RouteSlugParts | null {
  const normalized = slugify(slug);
  const marker = "-to-";
  const idx = normalized.indexOf(marker);
  if (idx <= 0) return null;
  const fromRaw = normalized.slice(0, idx);
  const toRaw = normalized.slice(idx + marker.length);
  if (!fromRaw || !toRaw) return null;
  return {
    fromSlug: canonicalizeSlug(fromRaw),
    toSlug: canonicalizeSlug(toRaw),
  };
}

export function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
