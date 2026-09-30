import { getSupabaseClient } from "@/lib/supabase/client";

type ExitRow = {
  stationKo: string;
  stationEn: string;
  facilityKo: string;
  facilityEn: string;
  exitNumber: string;
};

const STATION_KO_KEYS = [
  "역명",
  "STIN_NM",
  "stin_nm",
  "station_name",
  "stationName",
  "역이름",
] as const;

const STATION_EN_KEYS = [
  "역명_EN",
  "STIN_NM_ENG",
  "stin_nm_eng",
  "station_name_en",
  "stationNameEn",
  "STATION_NM_EN",
] as const;

const FACILITY_KO_KEYS = [
  "출구별주요시설명",
  "출구별 주요시설명",
  "EXIT_IMP_FACL_NM",
  "exit_imp_facl_nm",
  "exit_facility",
  "facility_name",
  "facilityName",
  "주요시설명",
] as const;

const FACILITY_EN_KEYS = [
  "출구시설_EN",
  "EXIT_IMP_FACL_NM_ENG",
  "exit_imp_facl_nm_eng",
  "exit_facility_en",
  "facility_name_en",
  "facilityNameEn",
  "EXIT_FACL_NM_EN",
] as const;

const EXIT_NUMBER_KEYS = [
  "출구번호",
  "EXIT_NO",
  "exit_no",
  "exit_number",
  "exitNumber",
] as const;

function pickField(
  row: Record<string, unknown>,
  keys: readonly string[],
): string {
  for (const key of keys) {
    const value = row[key];
    if (value != null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function displayValue(value: string): string {
  return value || "—";
}

function mapExitRows(data: Record<string, unknown>[] | null): ExitRow[] {
  if (!data?.length) return [];
  return data.map((row) => ({
    stationKo: pickField(row, STATION_KO_KEYS),
    stationEn: pickField(row, STATION_EN_KEYS),
    facilityKo: pickField(row, FACILITY_KO_KEYS),
    facilityEn: pickField(row, FACILITY_EN_KEYS),
    exitNumber: pickField(row, EXIT_NUMBER_KEYS),
  }));
}

function formatSupabaseError(message: string, code?: string): string {
  if (code === "42501" || /permission denied/i.test(message)) {
    return "권한이 없습니다 (42501). Supabase에서 anon 역할에 SELECT 권한을 부여해 주세요: GRANT SELECT ON public.subway_exits TO anon;";
  }
  return message || "알 수 없는 오류가 발생했습니다.";
}

async function fetchSubwayExits(): Promise<{
  rows: ExitRow[];
  error: string | null;
}> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("subway_exits")
      .select("*")
      .limit(10);

    if (error) {
      return {
        rows: [],
        error: formatSupabaseError(error.message, error.code),
      };
    }

    return {
      rows: mapExitRows((data ?? []) as Record<string, unknown>[]),
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { rows: [], error: formatSupabaseError(message) };
  }
}

function BilingualBlock({
  labelKo,
  labelEn,
  valueKo,
  valueEn,
}: {
  labelKo: string;
  labelEn: string;
  valueKo: string;
  valueEn: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        <span className="text-zinc-500">{labelEn}</span>
        <span className="mx-1.5 text-zinc-300">·</span>
        <span>{labelKo}</span>
      </p>
      <p className="mt-1 text-base font-semibold text-zinc-900 sm:text-lg">
        {displayValue(valueEn)}
      </p>
      <p className="mt-0.5 text-sm text-zinc-600">{displayValue(valueKo)}</p>
    </div>
  );
}

export default async function Home() {
  const { rows, error } = await fetchSubwayExits();

  return (
    <main className="min-h-full flex-1 bg-zinc-100">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-8 sm:mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Seoul Subway Exit Guide
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            Nearby landmarks at each exit — Korean and English, for visitors
            exploring Seoul.
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            외국인 관광객을 위한 지하철 출구별 주요 시설 안내
          </p>
        </header>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-white px-4 py-4 text-sm text-red-800 shadow-sm"
          >
            <p className="font-semibold">Could not load exit data</p>
            <p className="mt-1 font-medium">데이터를 불러오지 못했습니다</p>
            <p className="mt-2 whitespace-pre-wrap text-red-700">{error}</p>
          </div>
        ) : null}

        {!error && rows.length === 0 ? (
          <div className="rounded-xl bg-white px-4 py-10 text-center shadow-sm">
            <p className="text-sm font-medium text-zinc-700">
              No exit information to show.
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              표시할 출구 정보가 없습니다.
            </p>
          </div>
        ) : null}

        {!error && rows.length > 0 ? (
          <ul className="flex flex-col gap-3 sm:gap-4">
            {rows.map((row, index) => (
              <li
                key={`${row.stationKo}-${row.facilityKo}-${row.exitNumber}-${index}`}
                className="rounded-xl bg-white p-4 shadow-md shadow-zinc-200/80 sm:p-5"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  {row.exitNumber ? (
                    <div
                      className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-zinc-900 text-white"
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
                  <div className="min-w-0 flex-1 space-y-4">
                    <BilingualBlock
                      labelEn="Station"
                      labelKo="역명"
                      valueEn={row.stationEn}
                      valueKo={row.stationKo}
                    />
                    <BilingualBlock
                      labelEn="Nearby"
                      labelKo="출구별 주요시설명"
                      valueEn={row.facilityEn}
                      valueKo={row.facilityKo}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </main>
  );
}
