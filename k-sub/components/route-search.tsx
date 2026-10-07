"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
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
      <strong className="font-bold text-zinc-950">
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
          className="relative z-10 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-md"
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
  const showSuggestions = open && value.trim().length > 0 && suggestions.length > 0;
  const showList = showEmptyRecs || showSuggestions;

  return (
    <div className="min-w-0 flex-1">
      <label htmlFor={inputId} className="block text-sm font-medium text-zinc-800">
        {labelEn}
        <span className="ml-1.5 font-normal text-zinc-500">{labelKo}</span>
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
        className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-zinc-900/10 transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2"
      />

      <SuggestionList id={listId} open={showList}>
        {showEmptyRecs
          ? emptyRecommendations.map((label) => (
              <li key={label} role="option">
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-zinc-50"
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
                    <span className="block text-sm font-medium text-zinc-900">
                      {label}
                    </span>
                    <span className="block text-xs text-zinc-500">
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
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-zinc-50"
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
                    <span className="block text-sm font-medium text-zinc-900">
                      <HighlightMatch
                        text={option.labelEn}
                        query={queryForHighlight}
                      />
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {option.labelKo}
                      <span className="mx-1 text-zinc-300">·</span>
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
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [fromOption, setFromOption] = useState<SearchOption | null>(null);
  const [toOption, setToOption] = useState<SearchOption | null>(null);
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [error, setError] = useState<string | null>(null);

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
    router.push(`/routes/${slug}`);
  }

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="overflow-visible rounded-2xl bg-white p-4 shadow-md shadow-zinc-200/80 sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-2">
        <OptionField
          inputId={`${baseId}-from`}
          labelEn="From (Departure Station)"
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

        <div className="flex items-center justify-center sm:mt-8 sm:px-1">
          <button
            type="button"
            onClick={swapEnds}
            aria-label="Swap From and To"
            title="Swap From and To"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-lg text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-white hover:text-zinc-900 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20"
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
          labelEn="To (Destination / Landmark)"
          labelKo="도착 / 랜드마크"
          placeholder="e.g. Seoul Station or N Seoul Tower"
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
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="relative z-20 mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:w-auto"
        >
          Find route
          <span className="ml-2 font-normal text-zinc-300">길찾기</span>
        </button>
        {exampleSlug ? (
          <p className="text-xs text-zinc-500">
            Try example:{" "}
            <a
              href={`/routes/${exampleSlug}`}
              className="font-medium text-zinc-800 underline-offset-2 hover:underline"
            >
              /routes/{exampleSlug}
            </a>
          </p>
        ) : null}
      </div>
    </form>
  );
}
