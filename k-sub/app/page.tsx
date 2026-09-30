import { getSupabaseClient } from "@/lib/supabase/client";

type ExitRow = {
  stationName: string;
  facilityName: string;
};

const STATION_KEYS = [
  "역명",
  "STIN_NM",
  "stin_nm",
  "station_name",
  "stationName",
  "역이름",
] as const;

const FACILITY_KEYS = [
  "출구별 주요시설명",
  "출구별주요시설명",
  "EXIT_IMP_FACL_NM",
  "exit_imp_facl_nm",
  "exit_facility",
  "facility_name",
  "facilityName",
  "주요시설명",
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
  return "—";
}

function mapExitRows(data: Record<string, unknown>[] | null): ExitRow[] {
  if (!data?.length) return [];
  return data.map((row) => ({
    stationName: pickField(row, STATION_KEYS),
    facilityName: pickField(row, FACILITY_KEYS),
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

export default async function Home() {
  const { rows, error } = await fetchSubwayExits();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">
      <header className="mb-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          지하철 출구 정보
        </h1>
        <p className="text-sm text-zinc-600 sm:text-base">
          Supabase <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm">subway_exits</code>{" "}
          테이블에서 가져온 역명과 출구별 주요시설명입니다.
        </p>
      </header>

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <p className="font-medium">데이터를 불러오지 못했습니다</p>
          <p className="mt-1 whitespace-pre-wrap">{error}</p>
        </div>
      ) : null}

      {!error && rows.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
          표시할 출구 정보가 없습니다.
        </div>
      ) : null}

      {!error && rows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full min-w-[20rem] border-collapse text-left text-sm">
            <thead className="bg-zinc-50 text-zinc-700">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">
                  역명
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  출구별 주요시설명
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr
                  key={`${row.stationName}-${row.facilityName}-${index}`}
                  className="border-t border-zinc-200"
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    {row.stationName}
                  </td>
                  <td className="px-4 py-3 text-zinc-700">{row.facilityName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}
