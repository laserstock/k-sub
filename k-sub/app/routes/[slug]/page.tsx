import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExitCard } from "@/components/exit-card";
import {
  buildSearchOptions,
  fetchExitCatalog,
  findOptionBySlug,
  resolveExitGuide,
} from "@/lib/subway/data";
import { googleMapsDirectionsUrl } from "@/lib/subway/google-maps";
import { parseRouteSlug, titleFromSlug } from "@/lib/subway/slug";
import type { SearchOption } from "@/lib/subway/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

function mapsDestinationLabel(
  to: SearchOption,
  arrivalEn: string,
): string {
  if (to.kind === "landmark") {
    return to.labelEn || to.labelKo || arrivalEn;
  }
  return `${arrivalEn} Station`;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const parts = parseRouteSlug(slug);
  if (!parts) {
    return {
      title: "Exit guide not found | Seoul Subway Exit Guide",
      description: "Unknown subway exit guide.",
    };
  }

  const fromTitle = titleFromSlug(parts.fromSlug);
  const toTitle = titleFromSlug(parts.toSlug);
  return {
    title: `Exit for ${toTitle} from ${fromTitle} | Seoul Subway Exit Guide`,
    description: `Which station and exit to use for ${toTitle} when coming from ${fromTitle}.`,
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
              Exit guide not found
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
          </div>
        </div>
      </main>
    );
  }

  const guide = resolveExitGuide(rows, to);
  const bestExit = guide.best?.exitNumber?.trim() || "—";
  const heroExit =
    bestExit === "—" ? "Exit —" : `Exit ${bestExit}`;
  const landmarkForGuide =
    to.kind === "landmark"
      ? guide.landmarkLabelEn || to.labelEn
      : guide.landmarkLabelEn;

  const mapsUrl = googleMapsDirectionsUrl(
    `${from.labelEn} Station`,
    mapsDestinationLabel(to, guide.arrivalEn),
  );

  const lockedKey = guide.best
    ? `${guide.best.stationKo}|${guide.best.exitNumber}|${guide.best.facilityEn}|${guide.best.facilityKo}`
    : null;

  return (
    <main className="min-h-full flex-1 bg-zinc-100">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        <p className="text-sm text-zinc-500">
          <Link href="/" className="font-medium text-zinc-800 hover:underline">
            ← Back to search
          </Link>
        </p>

        {/* One clear answer — first screen */}
        <header className="mt-5 mb-5 sm:mb-7">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Seoul subway exit guide
          </p>
          <h1 className="mt-3 text-[1.65rem] font-bold leading-tight tracking-tight text-zinc-900 sm:text-4xl sm:leading-tight">
            Get off at {guide.arrivalEn}{" "}
            <span className="text-zinc-400" aria-hidden>
              →
            </span>{" "}
            {heroExit}
          </h1>
          {to.kind === "landmark" ? (
            <p className="mt-2 text-base font-medium text-zinc-700 sm:text-lg">
              for {to.labelEn}
            </p>
          ) : landmarkForGuide ? (
            <p className="mt-2 text-sm text-zinc-600 sm:text-base">
              near {landmarkForGuide}
            </p>
          ) : null}
          <p className="mt-2 text-sm text-zinc-500">
            From {from.labelEn} ({from.labelKo})
            {to.labelKo ? ` · ${to.labelKo}` : null}
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

          <dl className="mt-4 space-y-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Destination Station · 도착역
              </dt>
              <dd className="mt-1 text-2xl font-bold text-zinc-900">
                {guide.arrivalEn}
              </dd>
              <dd className="text-sm text-zinc-500">{guide.arrivalKo}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                Best Exit
                {landmarkForGuide ? ` for ${landmarkForGuide}` : ""} · 추천
                출구
              </dt>
              <dd className="mt-1 text-3xl font-bold text-zinc-900">
                {bestExit === "—" ? "—" : `Exit ${bestExit}`}
              </dd>
              {to.kind === "landmark" && guide.landmarkLabelKo ? (
                <dd className="mt-0.5 text-sm text-zinc-500">
                  {guide.landmarkLabelKo}
                </dd>
              ) : guide.best?.facilityKo && to.kind === "station" ? (
                <dd className="mt-0.5 text-sm text-zinc-500">
                  {guide.best.facilityEn}
                  {guide.best.facilityKo
                    ? ` · ${guide.best.facilityKo}`
                    : null}
                </dd>
              ) : null}
            </div>
          </dl>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a73e8] px-4 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1558b0] active:scale-[0.99]"
          >
            <span aria-hidden>🗺️</span>
            Open in Google Maps
            <span className="font-normal text-blue-100">
              구글 맵으로 경로 보기
            </span>
          </a>
        </section>

        <section className="mt-8 sm:mt-10">
          <h2 className="text-lg font-semibold text-zinc-900">
            Recommended exits near your destination
          </h2>
          <p className="mt-1 text-sm text-zinc-500">도착지 근처 추천 출구</p>

          {!error && guide.highlights.length === 0 ? (
            <div className="mt-4 rounded-xl bg-white px-4 py-8 text-center shadow-sm">
              <p className="text-sm font-medium text-zinc-700">
                No exit rows matched this destination yet.
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                이 도착지에 맞는 출구 데이터가 없습니다.
              </p>
            </div>
          ) : null}

          {guide.highlights.length > 0 ? (
            <ul className="mt-5 flex flex-col gap-4 sm:gap-5">
              {guide.highlights.map((row, index) => {
                const key = `${row.stationKo}|${row.exitNumber}|${row.facilityEn}|${row.facilityKo}`;
                const isLocked =
                  guide.locked && lockedKey !== null && key === lockedKey;
                return (
                  <ExitCard
                    key={`${key}-${index}`}
                    row={row}
                    highlighted={isLocked || (!guide.locked && index === 0)}
                  />
                );
              })}
            </ul>
          ) : null}
        </section>

        <p className="mt-8 text-xs text-zinc-400">/routes/{slug}</p>
      </div>
    </main>
  );
}
