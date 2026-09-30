"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useId, type FormEvent } from "react";
import { buildRouteSlug } from "@/lib/subway/slug";
import type { SearchOption } from "@/lib/subway/types";

type Props = {
  options: SearchOption[];
  exampleSlug?: string;
};

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
      return hay.includes(q);
    })
    .slice(0, 12);
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
}: {
  labelEn: string;
  labelKo: string;
  placeholder: string;
  value: string;
  onChange: (next: string) => void;
  onPick: (option: SearchOption) => void;
  suggestions: SearchOption[];
  inputId: string;
}) {
  const listId = `${inputId}-list`;
  return (
    <div className="relative min-w-0 flex-1">
      <label htmlFor={inputId} className="block text-sm font-medium text-zinc-800">
        {labelEn}
        <span className="ml-1.5 font-normal text-zinc-500">{labelKo}</span>
      </label>
      <input
        id={inputId}
        type="text"
        autoComplete="off"
        role="combobox"
        aria-expanded={suggestions.length > 0}
        aria-controls={listId}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 outline-none ring-zinc-900/10 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2"
      />
      {suggestions.length > 0 && value.trim() ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
        >
          {suggestions.map((option) => (
            <li key={option.id} role="option">
              <button
                type="button"
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-zinc-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPick(option)}
              >
                <span className="text-sm font-medium text-zinc-900">
                  {option.labelEn}
                </span>
                <span className="text-xs text-zinc-500">
                  {option.labelKo}
                  <span className="mx-1 text-zinc-300">·</span>
                  {option.kind === "station" ? "Station" : "Landmark"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function RouteSearch({ options, exampleSlug }: Props) {
  const router = useRouter();
  const baseId = useId();
  const [fromQuery, setFromQuery] = useState("");
  const [toQuery, setToQuery] = useState("");
  const [fromOption, setFromOption] = useState<SearchOption | null>(null);
  const [toOption, setToOption] = useState<SearchOption | null>(null);
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

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const from = resolveOption(fromQuery, fromOption, true);
    const to = resolveOption(toQuery, toOption, false);
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
    const slug = buildRouteSlug(from.labelEn, to.labelEn);
    router.push(`/routes/${slug}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl bg-white p-4 shadow-md shadow-zinc-200/80 sm:p-6"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
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
        />
        <OptionField
          inputId={`${baseId}-to`}
          labelEn="To (Destination / Landmark)"
          labelKo="도착 / 랜드마크"
          placeholder="e.g. Seoul Station"
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
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          className="inline-flex items-center justify-center rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-800"
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
