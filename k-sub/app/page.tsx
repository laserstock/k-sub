import Link from "next/link";
import { ExitCard } from "@/components/exit-card";
import { RouteSearch } from "@/components/route-search";
import {
  fetchAllStationOptions,
  fetchLandmarkOptions,
  fetchPopularExits,
} from "@/lib/subway/data";
import { buildRouteSlug } from "@/lib/subway/slug";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [popular, stationResult, landmarkResult] = await Promise.all([
    fetchPopularExits(8),
    fetchAllStationOptions(),
    fetchLandmarkOptions(),
  ]);

  const error =
    popular.error || stationResult.error || landmarkResult.error;
  const options = [...stationResult.stations, ...landmarkResult.landmarks];
  const exampleSlug = buildRouteSlug("Jonggak", "Seoul Station", "종각", "서울역");

  return (
    <main className="min-h-full flex-1 bg-zinc-100">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-6 sm:mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Seoul Subway Exit Guide
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            Search how to go from one station to another — then see which exit
            to use near your destination.
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            출발역과 도착지를 검색하면 출구 안내 페이지로 이동합니다
            {!error && stationResult.distinctCount > 0 ? (
              <span className="ml-1 text-zinc-400">
                · {stationResult.distinctCount} stations
              </span>
            ) : null}
          </p>
        </header>

        {error ? (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-red-200 bg-white px-4 py-4 text-sm text-red-800 shadow-sm"
          >
            <p className="font-semibold">Could not load exit data</p>
            <p className="mt-1 font-medium">데이터를 불러오지 못했습니다</p>
            <p className="mt-2 whitespace-pre-wrap text-red-700">{error}</p>
          </div>
        ) : (
          <RouteSearch options={options} exampleSlug={exampleSlug} />
        )}

        <section className="mt-10 sm:mt-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">
                Popular exits
              </h2>
              <p className="mt-1 text-sm text-zinc-500">인기 출구 안내</p>
            </div>
            <Link
              href={`/routes/${exampleSlug}`}
              className="text-sm font-medium text-zinc-700 underline-offset-2 hover:underline"
            >
              Sample route
            </Link>
          </div>

          {!error && popular.rows.length === 0 ? (
            <div className="rounded-xl bg-white px-4 py-10 text-center shadow-sm">
              <p className="text-sm font-medium text-zinc-700">
                No exit information to show.
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                표시할 출구 정보가 없습니다.
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
        </section>
      </div>
    </main>
  );
}
