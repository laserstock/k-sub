import { englishStationName } from "./station-en";
import type { ExitRow } from "./types";

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

const LINE_KO_KEYS = ["노선명", "ROUTE", "route", "line", "line_name"] as const;

export function pickField(
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

export function mapExitRows(data: Record<string, unknown>[] | null): ExitRow[] {
  if (!data?.length) return [];
  return data.map((row) => {
    const stationKo = pickField(row, STATION_KO_KEYS);
    const stationEnRaw = pickField(row, STATION_EN_KEYS);
    return {
      stationKo,
      stationEn: englishStationName(stationKo, stationEnRaw) || stationKo,

      facilityKo: pickField(row, FACILITY_KO_KEYS),
      facilityEn: pickField(row, FACILITY_EN_KEYS),
      exitNumber: pickField(row, EXIT_NUMBER_KEYS),
      lineKo: pickField(row, LINE_KO_KEYS),
    };
  });
}

export function formatSupabaseError(message: string, code?: string): string {
  if (code === "42501" || /permission denied/i.test(message)) {
    return "권한이 없습니다 (42501). Supabase에서 anon 역할에 SELECT 권한을 부여해 주세요: GRANT SELECT ON public.subway_exits TO anon;";
  }
  return message || "알 수 없는 오류가 발생했습니다.";
}

export function displayValue(value: string): string {
  return value || "—";
}
