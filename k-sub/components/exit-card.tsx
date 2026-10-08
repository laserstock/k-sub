import { CopyKoreanButton } from "@/components/copy-korean-button";
import { displayValue } from "@/lib/subway/map";
import type { ExitRow } from "@/lib/subway/types";

export function ExitCard({
  row,
  highlighted = false,
}: {
  row: ExitRow;
  /** Locked / best exit for this result — badge + stronger border. */
  highlighted?: boolean;
}) {
  return (
    <li
      className={
        highlighted
          ? "relative rounded-xl border-2 border-zinc-900 bg-white p-4 shadow-md shadow-zinc-200/80 sm:p-5"
          : "rounded-xl border border-transparent bg-white p-4 shadow-md shadow-zinc-200/80 sm:p-5"
      }
    >
      {highlighted ? (
        <span className="absolute -top-2.5 left-3 rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
          Your exit
        </span>
      ) : null}
      <div className="flex items-start gap-3 sm:gap-4">
        {row.exitNumber ? (
          <div
            className={
              highlighted
                ? "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-zinc-900 text-white ring-2 ring-zinc-900 ring-offset-2"
                : "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-zinc-900 text-white"
            }
            aria-label={`Exit ${row.exitNumber}`}
          >
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-300">
              Exit
            </span>
            <span className="text-lg font-bold leading-none">
              {row.exitNumber}
            </span>
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              <span className="text-zinc-500">Station</span>
              <span className="mx-1.5 text-zinc-300">·</span>
              <span>역명</span>
            </p>
            <p className="mt-1 text-base font-semibold text-zinc-900 sm:text-lg">
              {displayValue(row.stationEn)}
            </p>
            <p className="mt-0.5 text-sm text-zinc-600">
              {displayValue(row.stationKo)}
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              <span className="text-zinc-500">Nearby</span>
              <span className="mx-1.5 text-zinc-300">·</span>
              <span>출구별 주요시설명</span>
            </p>
            <p className="mt-1 text-base font-semibold text-zinc-900 sm:text-lg">
              {displayValue(row.facilityEn)}
            </p>
            <p className="mt-0.5 text-sm text-zinc-600">
              {displayValue(row.facilityKo)}
            </p>
            {row.facilityKo ? (
              <div className="mt-2">
                <CopyKoreanButton koreanName={row.facilityKo} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
