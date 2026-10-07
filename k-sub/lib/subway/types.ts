export type ExitRow = {
  stationKo: string;
  stationEn: string;
  facilityKo: string;
  facilityEn: string;
  exitNumber: string;
  lineKo: string;
};

export type SearchOption = {
  id: string;
  kind: "station" | "landmark";
  labelEn: string;
  labelKo: string;
  slug: string;
  /** Station English name this landmark belongs to (landmarks only). */
  stationEn?: string;
  stationKo?: string;
};

export type RouteSlugParts = {
  fromSlug: string;
  toSlug: string;
};
