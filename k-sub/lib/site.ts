/**
 * Public site origin for sitemap, robots, metadataBase, and canonicals.
 *
 * Priority:
 * 1. NEXT_PUBLIC_SITE_URL (preferred — set in Vercel Production)
 * 2. SITE_URL (optional server-only alias)
 * 3. https://k-sub.vercel.app (safe default until custom domain is Valid)
 *
 * After k-sub.com DNS is Valid on Vercel:
 *   Environment Variables → NEXT_PUBLIC_SITE_URL = https://k-sub.com
 *   → Redeploy Production (so sitemap/robots/metadata rebuild with the new origin).
 * Do not change this fallback to k-sub.com until that env is set, or vercel.app SEO URLs break.
 */
export const DEFAULT_SITE_URL = "https://k-sub.vercel.app";

/** Canonical custom domain once DNS + Vercel Domains are Valid. */
export const CUSTOM_DOMAIN_URL = "https://k-sub.com";

export function getSiteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    DEFAULT_SITE_URL;
  return raw.replace(/\/$/, "");
}
