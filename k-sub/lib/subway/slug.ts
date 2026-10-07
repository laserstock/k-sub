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

function hangulSlug(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return "";
  return `ko-${[...trimmed].map((c) => c.codePointAt(0)!.toString(16)).join("")}`;
}

/**
 * Stable station slug.
 * - Use English ASCII when labelEn has latin letters.
 * - Otherwise use ko-<codepoint hex> so Hangul/digit-only names never collide
 *   (e.g. slugify("종로3가…") must not become "3").
 */
export function stationSlug(labelEn: string, labelKo = ""): string {
  const en = labelEn.trim();
  const ko = labelKo.trim();
  const hasLatin = /[a-z]/i.test(en);
  if (hasLatin) {
    const ascii = canonicalizeSlug(slugify(en));
    if (ascii && /[a-z]/.test(ascii)) return ascii;
  }
  return hangulSlug(ko || en);
}

export function canonicalizeSlug(slug: string): string {
  if (slug.startsWith("ko-")) return slug;
  const clean = slugify(slug);
  if (!clean) return "";
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
  const lower = slug.toLowerCase();
  const idx = lower.indexOf(marker);
  if (idx <= 0) return null;
  const fromRaw = slug.slice(0, idx);
  const toRaw = slug.slice(idx + marker.length);
  if (!fromRaw || !toRaw) return null;

  const normalizePart = (part: string) => {
    if (part.startsWith("ko-")) return part;
    const ascii = canonicalizeSlug(part);
    if (ascii && /[a-z]/.test(ascii)) return ascii;
    return part;
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
