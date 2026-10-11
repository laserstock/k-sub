"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { buildRouteSlug } from "@/lib/subway/slug";
import type { SearchOption } from "@/lib/subway/types";

type Props = {
  options: SearchOption[];
  exampleSlug?: string;
};

type ActiveField = "from" | "to" | null;

/** Shown when To is focused and empty — resolve against DB options when possible. */
const TO_RECOMMENDATIONS = [
  "Myeongdong Street",
  "N Seoul Tower",
  "Hongdae",
  "Gyeongbokgung Palace",
  "Namdaemun Market",
  "Insadong Street",
  "Changdeokgung Palace",
] as const;

function filterOptions(
  options: SearchOption[],
  query: string,
  kind?: SearchOption["kind"],
): SearchOption[] {
  const q = query.trim().toLowerCase();
  const pool = kind ? options.filter((o) => o.kind === kind) : options;
  if (!q) return pool.slice(0, 12);
  return pool
    .filter((o) => {
      const hay = `${o.labelEn} ${o.labelKo} ${o.slug}`.toLowerCase();
      return hay.includes(q) || o.labelKo.includes(query.trim());
    })
    .slice(0, 20);
}

function resolveRecommendation(
  label: string,
  options: SearchOption[],
): SearchOption | null {
  const q = label.toLowerCase();
  return (
    options.find((o) => o.labelEn.toLowerCase() === q) ??
    options.find((o) => o.labelEn.toLowerCase().startsWith(q)) ??
    options.find((o) => o.labelEn.toLowerCase().includes(q)) ??
    options.find((o) => o.slug.includes(q.replace(/\s+/g, "-"))) ??
    null
  );
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <strong className="font-bold text-ink">
        {text.slice(idx, idx + q.length)}
      </strong>
      {text.slice(idx + q.length)}
    </>
  );
}

function SuggestionList({
  id,
  open,
  children,
}: {
  id: string;
  open: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <ul
          id={id}
          role="listbox"
          className="relative z-10 mt-1.5 max-h-56 w-full overflow-auto rounded-xl border border-[var(--line)] bg-white py-1.5 shadow-[0_12px_40px_-12px_rgba(12,27,42,0.25)]"
        >
          {children}
        </ul>
      </div>
    </div>
  );
}

function OptionField({
  labelEn,
  labelKo,
  placeholder,
  value,
  onChange,
  onPick,
  suggestions,
  inputId,
  open,
  onOpen,
  onClose,
  queryForHighlight,
  emptyRecommendations,
  onPickRecommendation,
}: {
  labelEn: string;
  labelKo: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  onPick: (option: SearchOption) => void;
  suggestions: SearchOption[];
  inputId: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  queryForHighlight: string;
  emptyRecommendations?: readonly string[];
  onPickRecommendation?: (label: string) => void;
}) {
  const listId = `${inputId}-list`;
  const showEmptyRecs =
    open &&
    !value.trim() &&
    !!emptyRecommendations?.length &&
    !!onPickRecommendation;
  const showSuggestions =
    open && value.trim().length > 0 && suggestions.length > 0;
  const showList = showEmptyRecs || showSuggestions;

  return (
    <div className="min-w-0 flex-1">
      <label
        htmlFor={inputId}
        className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]"
      >
        {labelEn}
        <span className="ml-2 font-medium normal-case tracking-normal text-[var(--muted)]/80">
          {labelKo}
        </span>
      </label>
      <input
        id={inputId}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          onOpen();
        }}
        onFocus={() => onOpen()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
        className="mt-2 w-full rounded-xl border border-[var(--line)] bg-[var(--paper)] px-3.5 py-3 text-[15px] font-medium text-ink outline-none transition placeholder:font-normal placeholder:text-[var(--muted)]/55 focus:border-[var(--rail)] focus:bg-white focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--rail)_22%,transparent)]"
      />

      <SuggestionList id={listId} open={showList}>
        {showEmptyRecs
          ? emptyRecommendations.map((label) => (
              <li key={label} role="option">
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--mist)]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPickRecommendation(label);
                    onClose();
                  }}
                >
                  <span className="text-base leading-none" aria-hidden>
                    📍
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">
                      {label}
                    </span>
                    <span className="block text-xs text-[var(--muted)]">
                      Popular landmark
                    </span>
                  </span>
                </button>
              </li>
            ))
          : null}

        {showSuggestions
          ? suggestions.map((option) => (
              <li key={option.id} role="option">
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-[var(--mist)]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPick(option);
                    onClose();
                  }}
                >
                  <span className="text-base leading-none" aria-hidden>
                    {option.kind === "station" ? "🚇" : "📍"}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-ink">
                      <HighlightMatch
                        text={option.labelEn}
                        query={queryForHighlight}
                      />
                    </span>
                    <span className="block text-xs text-[var(--muted)]">
                      {option.labelKo}
                      <span className="mx-1 opacity-40">·</span>
                      {option.kind === "station" ? "Station" : "Landmark"}
                    </span>
                  </span>
                </button>
              </li>
            ))
          : null}
      </SuggestionList>
    </div>
  );
}

export function RouteSearch({ options, exampleSlug }: Props) {
  const router = useRouter();
  const baseId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [fromOption, setFromOption] = useState<SearchOption | null>(null);
  const [toOption, setToOption] = useState<SearchOption | null>(null);
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = isPending;

  const stationOptions = useMemo(
    () => options.filter((o) => o.kind === "station"),
    [options],
  );

  const fromSuggestions = useMemo(
    () => filterOptions(stationOptions, fromQuery, "station"),
    [stationOptions, fromQuery],
  );

  const toSuggestions = useMemo(
    () => filterOptions(options, toQuery),
    [options, toQuery],
  );

  useEffect(() => {
    function onPointerDown(event: MouseEvent | TouchEvent) {
      const root = formRef.current;
      if (!root) return;
      const target = event.target as Node | null;
      if (target && !root.contains(target)) setActiveField(null);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveField(null);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function resolveOption(
    query: string,
    selected: SearchOption | null,
    preferStations: boolean,
  ): SearchOption | null {
    if (selected) {
      const matchLabel =
        selected.labelEn.toLowerCase() === query.trim().toLowerCase() ||
        selected.labelKo === query.trim();
      if (matchLabel || !query.trim()) return selected;
    }
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const pool = preferStations ? stationOptions : options;
    return (
      pool.find((o) => o.labelEn.toLowerCase() === q) ??
      pool.find((o) => o.labelKo === query.trim()) ??
      pool.find((o) => o.slug === q.replace(/\s+/g, "-")) ??
      filterOptions(pool, query, preferStations ? "station" : undefined)[0] ??
      null
    );
  }

  function swapEnds() {
    setFromQuery(toQuery);
    setToQuery(fromQuery);
    setFromOption(toOption);
    setToOption(fromOption);
    setError(null);
    setActiveField(null);
  }

  function pickToRecommendation(label: string) {
    const matched = resolveRecommendation(label, options);
    if (matched) {
      setToOption(matched);
      setToQuery(matched.labelEn);
    } else {
      setToOption(null);
      setToQuery(label);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setActiveField(null);
    setError(null);
    const from = resolveOption(fromQuery, fromOption, true);
    let to = resolveOption(toQuery, toOption, false);
    if (!to && toQuery.trim()) {
      to = resolveRecommendation(toQuery.trim(), options);
    }
    if (!from || !to) {
      setError(
        "Please choose a departure station and a destination from the suggestions. / 출발역과 도착지를 목록에서 선택해 주세요.",
      );
      return;
    }
    if (from.slug === to.slug) {
      setError(
        "From and To should be different. / 출발과 도착을 서로 다르게 선택해 주세요.",
      );
      return;
    }
    const slug = buildRouteSlug(
      from.labelEn,
      to.labelEn,
      from.labelKo,
      to.labelKo,
    );
    startTransition(() => {
      router.push(`/routes/${slug}`);
    });
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      aria-busy={busy}
      className="relative overflow-visible rounded-2xl border border-[var(--line)] bg-white/90 p-4 shadow-[0_20px_50px_-24px_rgba(12,27,42,0.35)] backdrop-blur-md sm:p-6"
    >
      {busy ? (
        <div
          className="absolute inset-0 z-30 flex flex-col gap-3 rounded-2xl bg-white/70 p-5 backdrop-blur-[2px] sm:p-6"
          aria-live="polite"
          aria-label="Loading exit guide"
        >
          <div className="h-3 w-24 animate-pulse rounded bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]" />
          <div className="h-11 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]" />
          <div className="h-11 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]" />
          <div className="mt-auto h-12 animate-pulse rounded-xl bg-[color-mix(in_srgb,var(--rail)_30%,transparent)]" />
          <p className="text-center text-sm font-semibold text-ink">
            Finding your exit…
          </p>
        </div>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-3">
        <OptionField
          inputId={`${baseId}-from`}
          labelEn="From"
          labelKo="출발역"
          placeholder="e.g. Jonggak"
          value={fromQuery}
          onChange={(next) => {
            setFromQuery(next);
            setFromOption(null);
          }}
          onPick={(option) => {
            setFromOption(option);
            setFromQuery(option.labelEn);
          }}
          suggestions={fromSuggestions}
          open={activeField === "from"}
          onOpen={() => setActiveField("from")}
          onClose={() => setActiveField(null)}
          queryForHighlight={fromQuery}
        />

        <div className="flex items-center justify-center sm:mt-9 sm:px-0.5">
          <button
            type="button"
            onClick={swapEnds}
            disabled={busy}
            aria-label="Swap From and To"
            title="Swap From and To"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper)] text-lg text-ink transition hover:border-[var(--rail)] hover:bg-white hover:text-[var(--rail)] active:scale-95 focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--rail)_22%,transparent)] disabled:pointer-events-none disabled:opacity-50"
          >
            <span aria-hidden className="sm:hidden">
              ⇅
            </span>
            <span aria-hidden className="hidden sm:inline">
              ⇆
            </span>
          </button>
        </div>

        <OptionField
          inputId={`${baseId}-to`}
          labelEn="To"
          labelKo="도착 · 랜드마크"
          placeholder="Station or landmark"
          value={toQuery}
          onChange={(next) => {
            setToQuery(next);
            setToOption(null);
          }}
          onPick={(option) => {
            setToOption(option);
            setToQuery(option.labelEn);
          }}
          suggestions={toSuggestions}
          open={activeField === "to"}
          onOpen={() => setActiveField("to")}
          onClose={() => setActiveField(null)}
          queryForHighlight={toQuery}
          emptyRecommendations={TO_RECOMMENDATIONS}
          onPickRecommendation={pickToRecommendation}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <div className="relative z-20 mt-5 flex flex-col gap-3 border-t border-[var(--line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0a7a6e] px-6 py-3.5 text-[15px] font-bold text-white shadow-[0_10px_28px_-12px_rgba(10,122,110,0.7)] transition hover:bg-[#08665c] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0a7a6e]/40 disabled:cursor-wait disabled:opacity-80 sm:w-auto"
        >
          {busy ? (
            <>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                aria-hidden
              />
              Finding exit…
              <span className="font-medium text-white/80">찾는 중</span>
            </>
          ) : (
            <>
              Find your exit
              <span className="ml-1 font-medium text-white/80">출구 찾기</span>
            </>
          )}
        </button>
        {exampleSlug ? (
          <p className="text-xs text-[var(--muted)]">
            Try{" "}
            <a
              href={`/routes/${exampleSlug}`}
              className="font-semibold text-ink underline-offset-2 hover:underline"
            >
              Jonggak → Seoul Station
            </a>
          </p>
        ) : null}
      </div>
    </form>
  );
}
