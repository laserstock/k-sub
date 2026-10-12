import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site";
import { buildSitemapRouteSlugs } from "@/lib/subway/sitemap-routes";

/** Build at deploy time so Googlebot never waits on a cold Supabase fetch. */
export const dynamic = "force-static";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getSiteUrl();
  const now = new Date();
  const { slugs } = await buildSitemapRouteSlugs();

  const home: MetadataRoute.Sitemap[number] = {
    url: base,
    lastModified: now,
    changeFrequency: "daily",
    priority: 1,
  };

  const routes: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${base}/routes/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [home, ...routes];
}
