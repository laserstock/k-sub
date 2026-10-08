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
          ? "relative rounded-2xl border-2 border-ink bg-white p-4 sm:p-5"
          : "rounded-2xl border border-[var(--line)] bg-white/85 p-4 backdrop-blur-sm sm:p-5"
      }
    >
      {highlighted ? (
        <span className="absolute -top-2.5 left-4 rounded-md bg-[var(--signal)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--signal-ink)]">
          Your exit
        </span>
      ) : null}
      <div className="flex items-start gap-3.5 sm:gap-4">
        {row.exitNumber ? (
          <div
            className={
              highlighted
                ? "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-[var(--signal)] text-[var(--signal-ink)]"
                : "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-ink text-white"
            }
            aria-label={`Exit ${row.exitNumber}`}
          >
            <span
              className={
                highlighted
                  ? "text-[9px] font-bold uppercase tracking-wider text-[var(--signal-ink)]/70"
                  : "text-[9px] font-bold uppercase tracking-wider text-white/55"
              }
            >
              Exit
            </span>
            <span className="font-display text-xl font-extrabold leading-none">
              {row.exitNumber}
            </span>
          </div>
        ) : null}
        <div className="min-w-0 flex-1 space-y-3.5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Station
            </p>
            <p className="mt-1 text-base font-bold text-ink sm:text-lg">
              {displayValue(row.stationEn)}
            </p>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              {displayValue(row.stationKo)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              Nearby
            </p>
            <p className="mt-1 text-base font-bold text-ink sm:text-lg">
              {displayValue(row.facilityEn)}
            </p>
            <p className="mt-0.5 text-sm text-[var(--muted)]">
              {displayValue(row.facilityKo)}
            </p>
            {row.facilityKo ? (
              <div className="mt-2.5">
                <CopyKoreanButton koreanName={row.facilityKo} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
