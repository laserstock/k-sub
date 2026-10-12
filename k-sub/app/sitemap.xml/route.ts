import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-static";
export const revalidate = 3600;

/** Plain XML Response — avoids Vercel static Content-Disposition on public/*.xml */
export async function GET() {
  const xml = await readFile(join(process.cwd(), "seo", "sitemap.xml"), "utf8");
  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
