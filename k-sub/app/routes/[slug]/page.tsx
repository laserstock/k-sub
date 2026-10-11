import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExitCard } from "@/components/exit-card";
import { loadRoutePageData } from "@/lib/subway/data";
import { googleMapsDirectionsUrl } from "@/lib/subway/google-maps";
import { parseRouteSlug, titleFromSlug } from "@/lib/subway/slug";
import type { SearchOption } from "@/lib/subway/types";

/** Exit guides reuse cached station rows for ~1 hour. */
export const revalidate = 3600;

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

  const { from, to, guide, error } = await loadRoutePageData(
    parts.fromSlug,
    parts.toSlug,
  );

  if (!from || !to || !guide) {
    return (
      <main className="min-h-full flex-1">
        <div className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
          <p className="text-sm text-[var(--muted)]">
            <Link
              href="/"
              className="font-semibold text-ink underline-offset-4 hover:underline"
            >
              ← Back to search
            </Link>
          </p>
          <div className="mt-8">
            <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
              Exit guide not found
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)]">
              We could not match{" "}
              <code className="rounded bg-white/80 px-1.5 py-0.5 text-xs text-ink">
                {slug}
              </code>{" "}
              to stations or landmarks. Try searching again from home.
            </p>
            {error ? (
              <p className="mt-4 whitespace-pre-wrap text-sm text-red-800">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      </main>
    );
  }

  const bestExit = guide.best?.exitNumber?.trim() || "—";
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
    <main className="min-h-full flex-1">
      <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-8 sm:py-12">
        <p className="text-sm text-[var(--muted)]">
          <Link
            href="/"
            className="font-semibold text-ink underline-offset-4 transition hover:text-[var(--rail)] hover:underline"
          >
            ← Back to search
          </Link>
        </p>

        <header className="anim-rise mt-8 sm:mt-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--rail)]">
            Seoul Subway Exit Guide
          </p>

          {/* Stack only — badge never sits beside H1 (avoids overlap on narrow widths) */}
          <div className="mt-5">
            <h1 className="font-display text-[2rem] font-extrabold leading-[1.15] tracking-tight text-ink sm:text-5xl sm:leading-[1.1]">
              Get off at {guide.arrivalEn}
              <span className="mx-2 text-[var(--rail)]" aria-hidden>
                →
              </span>
              <span className="whitespace-nowrap">Exit {bestExit}</span>
            </h1>

            {bestExit !== "—" ? (
              <div
                className="anim-exit-pop mt-5 inline-flex h-[5.25rem] w-[5.25rem] flex-col items-center justify-center rounded-2xl bg-[var(--signal)] text-[var(--signal-ink)] shadow-[0_16px_40px_-16px_rgba(240,180,41,0.65)] sm:mt-6 sm:h-28 sm:w-28"
                aria-hidden
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
                  Exit
                </span>
                <span className="font-display text-4xl font-extrabold leading-none sm:text-5xl">
                  {bestExit}
                </span>
              </div>
            ) : null}

            {to.kind === "landmark" ? (
              <p className="mt-4 text-lg font-medium text-[var(--ink-soft)] sm:text-xl">
                for {to.labelEn}
              </p>
            ) : landmarkForGuide ? (
              <p className="mt-4 text-base text-[var(--muted)] sm:text-lg">
                near {landmarkForGuide}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-[var(--muted)]">
              From {from.labelEn}
              {from.labelKo ? (
                <span className="text-[var(--muted)]/80">
                  {" "}
                  · {from.labelKo}
                </span>
              ) : null}
            </p>
          </div>
        </header>

        {error ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-200/80 bg-white/90 px-4 py-4 text-sm text-red-900"
          >
            <p className="font-semibold">Could not load exit data</p>
            <p className="mt-2 whitespace-pre-wrap">{error}</p>
          </div>
        ) : null}

        <section className="anim-rise-delay mt-10 border-t border-[var(--line)] pt-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Quick guide
          </h2>

          <dl className="mt-5 grid gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">
                Destination station
              </dt>
              <dd className="font-display mt-1 text-2xl font-bold tracking-tight text-ink">
                {guide.arrivalEn}
              </dd>
              <dd className="mt-0.5 text-sm text-[var(--muted)]">
                {guide.arrivalKo}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-[var(--muted)]">
                Best exit
                {landmarkForGuide ? ` for ${landmarkForGuide}` : ""}
              </dt>
              <dd className="font-display mt-1 text-2xl font-bold tracking-tight text-ink">
                {bestExit === "—" ? "—" : `Exit ${bestExit}`}
              </dd>
              {to.kind === "landmark" && guide.landmarkLabelKo ? (
                <dd className="mt-0.5 text-sm text-[var(--muted)]">
                  {guide.landmarkLabelKo}
                </dd>
              ) : guide.best?.facilityEn && to.kind === "station" ? (
                <dd className="mt-0.5 text-sm text-[var(--muted)]">
                  {guide.best.facilityEn}
                </dd>
              ) : null}
            </div>
          </dl>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#1a73e8] px-5 py-4 text-[15px] font-bold text-white shadow-[0_14px_36px_-14px_rgba(26,115,232,0.7)] transition hover:bg-[#1558b0] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a73e8]/40"
          >
            Open in Google Maps
            <span className="font-medium text-white/80">
              구글 맵으로 경로 보기
            </span>
          </a>
        </section>

        <section className="mt-14 sm:mt-16">
          <h2 className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
            Recommended exits nearby
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Other exits at this station
          </p>

          {!error && guide.highlights.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-white/80 px-4 py-8 text-center">
              <p className="text-sm font-medium text-ink">
                No exit rows matched this destination yet.
              </p>
            </div>
          ) : null}

          {guide.highlights.length > 0 ? (
            <ul className="mt-6 flex flex-col gap-4">
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
      </div>
    </main>
  );
}
