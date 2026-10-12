#!/usr/bin/env node
/**
 * Writes static public/sitemap.xml (+ gsc mirror) and public/robots.txt at build time.
 * Prefer static files over app/sitemap.ts — GSC often fails on Next metadata routes.
 */
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const SITE =
  (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://k-sub.vercel.app").replace(
    /\/$/,
    "",
  );

const HUB_HINTS = [
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

const DEST_STATION_HINTS = [
  "seoul-station",
  "gangnam",
  "jonggak",
  "myeongdong",
  "hongdae",
  "jamsil",
  "itaewon",
  "dongdaemun",
];

const MAX_ROUTE_URLS = 280;

async function loadEnvLocal() {
  try {
    const raw = await readFile(join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!m) continue;
      if (!process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    /* optional in CI when env is injected */
  }
}

function slugify(label) {
  return String(label || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function buildRouteSlug(fromEn, toEn, fromKo, toKo) {
  const from = slugify(fromEn) || slugify(fromKo) || "from";
  const to = slugify(toEn) || slugify(toKo) || "to";
  return `${from}-to-${to}`;
}

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function fetchExitRows() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return { rows: [], error: "missing supabase env" };

  const rows = [];
  let from = 0;
  const page = 1000;
  const columns = "역명,역명_EN,출구별주요시설명,출구시설_EN,출구번호,노선명";
  while (true) {
    const endpoint = `${url.replace(/\/$/, "")}/rest/v1/subway_exits?select=${encodeURIComponent(columns)}&offset=${from}&limit=${page}`;
    const res = await fetch(endpoint, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      return { rows: [], error: `supabase ${res.status}` };
    }
    const batch = await res.json();
    rows.push(...batch);
    if (batch.length < page) break;
    from += page;
  }
  return { rows, error: null };
}

function buildIndex(rows) {
  const stations = new Map();
  const landmarks = new Map();
  for (const row of rows) {
    const nameKo = String(row["역명"] || "").trim();
    const nameEn = String(row["역명_EN"] || "").trim() || nameKo;
    if (nameKo || nameEn) {
      const slug = slugify(nameEn) || slugify(nameKo);
      if (slug && !stations.has(slug)) {
        stations.set(slug, {
          slug,
          kind: "station",
          labelEn: nameEn,
          labelKo: nameKo,
        });
      }
    }
    const facKo = String(row["출구별주요시설명"] || "").trim();
    const facEn = String(row["출구시설_EN"] || "").trim();
    if (facEn || facKo) {
      const labelEn = facEn || facKo;
      const slug = slugify(labelEn) || slugify(facKo);
      if (slug && !landmarks.has(slug)) {
        landmarks.set(slug, {
          slug,
          kind: "landmark",
          labelEn,
          labelKo: facKo,
        });
      }
    }
  }
  return {
    stations: [...stations.values()],
    landmarks: [...landmarks.values()],
  };
}

function findHints(pool, hints) {
  const out = [];
  const seen = new Set();
  for (const hint of hints) {
    const hit =
      pool.find((o) => o.slug === hint) ||
      pool.find((o) => o.slug.includes(hint)) ||
      pool.find((o) => o.labelEn.toLowerCase().includes(hint.replace(/-/g, " ")));
    if (hit && !seen.has(hit.slug)) {
      seen.add(hit.slug);
      out.push(hit);
    }
  }
  return out;
}

function fallbackSlugs() {
  return [
    "jonggak-to-seoul-station",
    "hongdae-station-to-n-seoul-tower",
    "gangnam-to-seoul-station",
    "myeongdong-to-n-seoul-tower",
    "hapjeong-to-seoul-global-center",
  ];
}

function buildSlugs(index) {
  if (!index.stations.length) return fallbackSlugs();

  let hubs = findHints(index.stations, HUB_HINTS);
  if (hubs.length < 4) {
    hubs = [...hubs, ...index.stations.filter((s) => !hubs.some((h) => h.slug === s.slug))].slice(
      0,
      12,
    );
  }

  let landmarks = findHints(index.landmarks, LANDMARK_HINTS);
  if (landmarks.length < 4) {
    landmarks = [
      ...landmarks,
      ...index.landmarks.filter((l) => !landmarks.some((x) => x.slug === l.slug)),
    ].slice(0, 24);
  } else {
    landmarks = landmarks.slice(0, 24);
  }

  const destStations = findHints(index.stations, DEST_STATION_HINTS);
  const slugs = [];
  const seen = new Set();

  function addPair(from, to) {
    if (from.slug === to.slug) return;
    const slug = buildRouteSlug(from.labelEn, to.labelEn, from.labelKo, to.labelKo);
    if (seen.has(slug)) return;
    seen.add(slug);
    slugs.push(slug);
  }

  for (const from of hubs) {
    for (const to of landmarks) {
      if (slugs.length >= MAX_ROUTE_URLS) break;
      addPair(from, to);
    }
    for (const to of destStations) {
      if (slugs.length >= MAX_ROUTE_URLS) break;
      addPair(from, to);
    }
  }
  return slugs.slice(0, MAX_ROUTE_URLS);
}

function toXml(slugs) {
  const now = new Date().toISOString();
  const urls = [
    { loc: SITE, priority: "1.0", changefreq: "daily" },
    ...slugs.map((slug) => ({
      loc: `${SITE}/routes/${slug}`,
      priority: "0.7",
      changefreq: "weekly",
    })),
  ];
  const body = urls
    .map(
      (u) => `<url>
<loc>${escapeXml(u.loc)}</loc>
<lastmod>${now}</lastmod>
<changefreq>${u.changefreq}</changefreq>
<priority>${u.priority}</priority>
</url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

async function main() {
  await loadEnvLocal();
  const { rows, error } = await fetchExitRows();
  if (error) console.warn("[generate-sitemap]", error);
  const index = buildIndex(rows);
  const slugs = buildSlugs(index);
  const xml = toXml(slugs);

  await mkdir(join(root, "seo"), { recursive: true });
  await mkdir(join(root, "public", "sitemaps"), { recursive: true });
  // seo/sitemap.xml is read by app/sitemap.xml/route.ts (clean headers for GSC)
  await writeFile(join(root, "seo", "sitemap.xml"), xml, "utf8");
  // Mirror for GSC cache-bust submit path
  await writeFile(join(root, "public", "sitemaps", "gsc.xml"), xml, "utf8");
  console.log(`[generate-sitemap] wrote ${slugs.length + 1} URLs to seo/sitemap.xml`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
