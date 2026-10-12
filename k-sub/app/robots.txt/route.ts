import { getSiteUrl } from "@/lib/site";

export const dynamic = "force-static";

export async function GET() {
  const base = getSiteUrl();
  const body = `User-agent: *
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Google-InspectionTool
Allow: /

Sitemap: ${base}/sitemap.xml
Sitemap: ${base}/sitemaps/gsc.xml
`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
