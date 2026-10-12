/** Public site origin for sitemap, robots, and absolute metadata. */
export function getSiteUrl(): string {
  const raw =
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://k-sub.vercel.app";
  return raw.replace(/\/$/, "");
}
