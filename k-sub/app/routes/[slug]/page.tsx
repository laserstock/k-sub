import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExitCard } from "@/components/exit-card";
import {
  buildSearchOptions,
  exitsForDestination,
  exitsForStationSlug,
  fetchExitCatalog,
  findOptionBySlug,
  uniqueExitHighlights,
} from "@/lib/subway/data";
import { parseRouteSlug, titleFromSlug } from "@/lib/subway/slug";
import type { ExitRow, SearchOption } from "@/lib/subway/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function destinationStationLabel(dest: SearchOption, exits: ExitRow[]): {
  en: string;
  ko: string;
} {
  if (dest.kind === "station") {
    return { en: dest.labelEn, ko: dest.labelKo };
  }
  const first = exits[0];
  return {
    en: dest.stationEn || first?.stationEn || dest.labelEn,
    ko: dest.stationKo || first?.stationKo || dest.labelKo,
  };
}

function buildGuideCopy(
  from: SearchOption,
  to: SearchOption,
  destExits: ExitRow[],
) {
  const arrival = destinationStationLabel(to, destExits);
  const highlight = uniqueExitHighlights(destExits, 3);
  const primary = highlight[0];

  const exitHint = primary?.exitNumber
    ? `When you arrive at ${arrival.en}, look for Exit ${primary.exitNumber}${
        primary.facilityEn ? ` near ${primary.facilityEn}` : ""
      }.`
    : `When you arrive at ${arrival.en}, check the exit boards for nearby landmarks.`;

  const sameStation =
    slugifySafe(from.labelEn) === slugifySafe(arrival.en) ||
    from.labelKo === arrival.ko;

  const enIntro = sameStation
    ? `You are already near ${to.labelEn} at ${from.labelEn}. ${exitHint}`
    : `How to go from ${from.labelEn} to ${to.labelEn}. Ride the Seoul subway from ${from.labelEn} toward ${arrival.en}. ${exitHint}`;

  const arrivalKo = arrival.ko || arrival.en;
  const koIntro = sameStation
    ? `${from.labelKo || from.labelEn}에서 ${to.labelKo || to.labelEn} 근처 출구 안내입니다. 아래 출구를 이용하세요.`
    : `${from.labelKo || from.labelEn}에서 ${to.labelKo || to.labelEn}(으)로 가는 출구 안내입니다. ${arrivalKo}에서 도착한 뒤 아래 출구를 이용하세요.`;

  return { enIntro, koIntro, arrival, highlight, sameStation };
}

function slugifySafe(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const parts = parseRouteSlug(slug);
  if (!parts) {
    return {
      title: "Route not found | Seoul Subway Exit Guide",
      description: "Unknown subway route guide.",
    };
  }

  const fromTitle = titleFromSlug(parts.fromSlug);
  const toTitle = titleFromSlug(parts.toSlug);
  const title = `How to go from ${fromTitle} to ${toTitle}`;
  return {
    title: `${title} | Seoul Subway Exit Guide`,
    description: `Foreigner-friendly subway exit guide from ${fromTitle} to ${toTitle} in Seoul.`,
  };
}

export default async function RoutePage({ params }: PageProps) {
  const { slug } = await params;
  const parts = parseRouteSlug(slug);
  if (!parts) {
    notFound();
  }

  const { rows, error } = await fetchExitCatalog();
  const options = buildSearchOptions(rows);
  const from = findOptionBySlug(options, parts.fromSlug);
  const to = findOptionBySlug(options, parts.toSlug);

  if (!from || !to) {
    return (
      <main className="min-h-full flex-1 bg-zinc-100">
        <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
          <p className="text-sm text-zinc-500">
            <Link href="/" className="font-medium text-zinc-800 hover:underline">
              ← Back to search
            </Link>
          </p>
          <div className="mt-6 rounded-xl bg-white px-5 py-8 shadow-md shadow-zinc-200/80">
            <h1 className="text-2xl font-bold text-zinc-900">
              Route not found
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              We could not match{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs">
                {slug}
              </code>{" "}
              to stations or landmarks in the data.
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              데이터에서 출발/도착지를 찾지 못했습니다. 홈에서 다시 검색해
              주세요.
            </p>
            {!from ? (
              <p className="mt-4 text-sm text-zinc-600">
                Unknown from: <strong>{parts.fromSlug}</strong>
              </p>
            ) : null}
            {!to ? (
              <p className="mt-1 text-sm text-zinc-600">
                Unknown to: <strong>{parts.toSlug}</strong>
              </p>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  const destExits = exitsForDestination(rows, to);
  const fromExits = exitsForStationSlug(rows, from.slug);
  const guide = buildGuideCopy(from, to, destExits);
  const destHighlights = uniqueExitHighlights(destExits, 10);

  return (
    <main className="min-h-full flex-1 bg-zinc-100">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="text-sm text-zinc-500">
          <Link href="/" className="font-medium text-zinc-800 hover:underline">
            ← Back to search
          </Link>
        </p>

        <header className="mt-5 mb-6 sm:mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Seoul subway route guide
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            How to go from {from.labelEn} to {to.labelEn}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {from.labelKo} → {to.labelKo}
          </p>
        </header>

        {error ? (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-white px-4 py-4 text-sm text-red-800 shadow-sm"
          >
            <p className="font-semibold">Could not load exit data</p>
            <p className="mt-2 whitespace-pre-wrap">{error}</p>
          </div>
        ) : null}

        <section className="rounded-2xl bg-white p-5 shadow-md shadow-zinc-200/80 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Quick guide
          </h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-800">
            {guide.enIntro}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            {guide.koIntro}
          </p>
          <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
            {guide.sameStation ? (
              <>
                <li>
                  Stay at <strong>{from.labelEn}</strong>
                  {from.labelKo ? ` (${from.labelKo})` : ""}
                  {fromExits[0]?.lineKo
                    ? ` on ${fromExits[0].lineKo}`
                    : ""}
                  .
                </li>
                <li>
                  Follow exit signs
                  {guide.highlight[0]?.exitNumber
                    ? ` — use Exit ${guide.highlight[0].exitNumber}`
                    : ""}
                  {to.kind === "landmark" ? ` for ${to.labelEn}` : ""}.
                </li>
              </>
            ) : (
              <>
                <li>
                  Enter the subway at <strong>{from.labelEn}</strong>
                  {from.labelKo ? ` (${from.labelKo})` : ""}.
                  {fromExits[0]?.lineKo
                    ? ` Lines seen in data include ${fromExits[0].lineKo}.`
                    : ""}
                </li>
                <li>
                  Travel toward <strong>{guide.arrival.en}</strong>
                  {guide.arrival.ko ? ` (${guide.arrival.ko})` : ""}
                  {to.kind === "landmark"
                    ? `, the station for ${to.labelEn}`
                    : ""}
                  .
                </li>
                <li>
                  At the destination station, follow exit signs
                  {guide.highlight[0]?.exitNumber
                    ? ` — start with Exit ${guide.highlight[0].exitNumber}`
                    : ""}
                  {to.kind === "landmark" ? ` for ${to.labelEn}` : ""}.
                </li>
              </>
            )}
          </ol>
        </section>

        <section className="mt-8 sm:mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">
            Recommended exits near your destination
          </h2>
          <p className="mt-1 text-sm text-zinc-500">도착지 근처 추천 출구</p>

          {!error && destHighlights.length === 0 ? (
            <div className="mt-4 rounded-xl bg-white px-4 py-8 text-center shadow-sm">
              <p className="text-sm font-medium text-zinc-700">
                No exit rows matched this destination yet.
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                이 도착지에 맞는 출구 데이터가 없습니다.
              </p>
            </div>
          ) : null}

          {destHighlights.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-3 sm:gap-4">
              {destHighlights.map((row, index) => (
                <ExitCard
                  key={`${row.stationKo}-${row.facilityKo}-${row.exitNumber}-${index}`}
                  row={row}
                />
              ))}
            </ul>
          ) : null}
        </section>

        <p className="mt-8 text-xs text-zinc-400">/routes/{slug}</p>
      </div>
    </main>
  );
}
