import Link from "next/link";
import { ExitCard } from "@/components/exit-card";
import { RouteSearch } from "@/components/route-search";
import { fetchPopularExits, getSearchIndex } from "@/lib/subway/data";
import { buildRouteSlug } from "@/lib/subway/slug";

/** Semi-static subway data — refresh at most hourly. */
export const revalidate = 3600;

export default async function Home() {
  const [popular, index] = await Promise.all([
    fetchPopularExits(8),
    getSearchIndex(),
  ]);

  const error = popular.error || index.error;
  const options = index.options;
  const exampleSlug = buildRouteSlug(
    "Jonggak",
    "Seoul Station",
    "종각",
    "서울역",
  );

  return (
    <main className="min-h-full flex-1">
      <section className="relative mx-auto flex min-h-[100svh] w-full max-w-3xl flex-col justify-center px-5 py-12 sm:px-8 sm:py-16">
        <p className="anim-rise text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--rail)]">
          For visitors · 외국인 출구 안내
        </p>

        <h1 className="font-display anim-rise mt-4 max-w-[14ch] text-[2.65rem] font-extrabold leading-[0.95] tracking-tight text-ink sm:text-6xl sm:leading-[0.92]">
          Seoul Subway Exit Guide
        </h1>

        <p className="anim-rise-delay mt-5 max-w-md text-base leading-relaxed text-[var(--muted)] sm:text-lg">
          Know which station and exit to use — before you surface into the wrong
          street.
        </p>

        <div className="anim-rise-delay mt-9 sm:mt-10">
          {error ? (
            <div
              role="alert"
              className="rounded-2xl border border-red-200/80 bg-white/90 px-4 py-4 text-sm text-red-900 shadow-sm backdrop-blur-sm"
            >
              <p className="font-semibold">Could not load exit data</p>
              <p className="mt-1 text-[var(--muted)]">
                데이터를 불러오지 못했습니다
              </p>
              <p className="mt-2 whitespace-pre-wrap text-red-800/90">{error}</p>
            </div>
          ) : (
            <RouteSearch options={options} exampleSlug={exampleSlug} />
          )}
        </div>

        {!error && index.distinctStationCount > 0 ? (
          <p className="mt-5 text-xs text-[var(--muted)]">
            {index.distinctStationCount} stations · landmarks from exit
            facilities
          </p>
        ) : null}
      </section>

      <section className="border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_70%,transparent)]">
        <div className="mx-auto w-full max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
          <div className="mb-6 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-bold tracking-tight text-ink">
                Popular exits
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Browse nearby landmarks by exit
              </p>
            </div>
            <Link
              href={`/routes/${exampleSlug}`}
              className="shrink-0 text-sm font-semibold text-[var(--rail)] underline-offset-4 transition hover:underline"
            >
              Sample route
            </Link>
          </div>

          {!error && popular.rows.length === 0 ? (
            <div className="rounded-2xl bg-white/80 px-4 py-10 text-center">
              <p className="text-sm font-medium text-ink">
                No exit information to show.
              </p>
            </div>
          ) : null}

          {!error && popular.rows.length > 0 ? (
            <ul className="flex flex-col gap-3 sm:gap-4">
              {popular.rows.map((row, index) => (
                <ExitCard
                  key={`${row.stationKo}-${row.facilityKo}-${row.exitNumber}-${index}`}
                  row={row}
                />
              ))}
            </ul>
          ) : null}
        </div>
      </section>
    </main>
  );
}
