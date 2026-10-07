/**
 * Overrides for mangled / literal `역명_EN` values in open data.
 * Key = Korean station name (역명).
 */
export const STATION_NAME_MAPPER: Record<string, string> = {
  // User-reported / probe hits
  상수: "Sangsu",
  시청: "City Hall",
  사당: "Sadang",
  신사: "Sinsa",
  약수: "Yaksu",
  옥수: "Oksu",
  일원: "Irwon",
  오금: "Ogeum",
  발산: "Balsan",
  방화: "Banghwa",
  목동: "Mok-dong",
  미사: "Misa",
  청구: "Cheonggu",
  남성: "Namseong",
  상도: "Sangdo",
  면목: "Myeonmok",
  신흥: "Sinheung",
  장지: "Jangji",
  산성: "Sanseong",
  모란: "Moran",
  // Common Seoul names that often get mangled
  종각: "Jonggak",
  서울역: "Seoul Station",
  강남: "Gangnam",
  홍대입구: "Hongdae Station",
  명동: "Myeongdong",
  동대문: "Dongdaemun",
  을지로3가: "Euljiro 3-ga",
  을지로입구: "Euljiro Entrance",
  합정: "Hapjeong",
  이태원: "Itaewon",
  여의도: "Yeouido",
  잠실: "Jamsil",
  건대입구: "Konkuk University",
  성수: "Seongsu",
  왕십리: "Wangsimni",
  신촌: "Sinchon",
  이대: "Ewha Womans University",
  충무로: "Chungmuro",
  회현: "Hoehyeon",
  숙대입구: "Sookmyung Women's University",
  삼각지: "Samgakji",
  노량진: "Noryangjin",
  용산: "Yongsan",
  영등포: "Yeongdeungpo",
  구로: "Guro",
  신림: "Sillim",
  봉천: "Bongcheon",
  서울대입구: "Seoul National University",
  낙성대: "Nakseongdae",
  교대: "Seoul National Univ. of Education",
  서초: "Seocho",
  역삼: "Yeoksam",
  선릉: "Seolleung",
  삼성: "Samseong",
  종합운동장: "Sports Complex",
  천호: "Cheonho",
  강동: "Gangdong",
  길동: "Gildong",
  굽은다리: "Gubeundari",
  암사: "Amsa",
  올림픽공원: "Olympic Park",
  방이: "Bangi",
  개롱: "Gaerong",
  거여: "Geoyeo",
  마천: "Macheon",
  장한평: "Janghanpyeong",
  당산: "Dangsan",
  영등포구청: "Yeongdeungpo District Office",
  문래: "Mullae",
  신도림: "Sindorim",
  대림: "Daerim",
  구로디지털단지: "Guro Digital Complex",
  신대방: "Sindaebang",
  보라매: "Boramae",
  신풍: "Sinpung",
  대방: "Daebang",
  여의나루: "Yeouinaru",
  마포: "Mapo",
  공덕: "Gongdeok",
  애오개: "Aeogae",
  충정로: "Chungjeongno",
  광화문: "Gwanghwamun",
  종로3가: "Jongno 3-ga",
  동대문역사문화공원: "Dongdaemun History & Culture Park",
  신당: "Sindang",
  상왕십리: "Sangwangsimni",
  한양대: "Hanyang University",
  뚝섬: "Ttukseom",
  건대: "Konkuk University",
  어린이대공원: "Children's Grand Park",
  군자: "Gunja",
  아차산: "Achasan",
  광나루: "Gwangnaru",
  강동구청: "Gangdong District Office",
  몽촌토성: "Mongchontoseong",
};

/** Known-bad DB EN strings → force mapper / never display as-is. */
const BAD_EN_LITERALS = new Set(
  [
    "constant",
    "town hall",
    "shrine",
    "measure",
    "chalcedony",
    "member",
    "ham",
    "diffusion",
    "arson",
    "cowboy",
    "mass",
    "claim",
    "male",
    "highway",
    "face",
    "emerging",
    "burial site",
    "acid",
    "peony",
    "saccharic acid",
  ].map((s) => s.toLowerCase()),
);

export function mappedStationEn(stationKo: string): string | undefined {
  return STATION_NAME_MAPPER[stationKo.trim()];
}

export function isBadStationEn(stationEn: string): boolean {
  const en = stationEn.trim().toLowerCase();
  if (!en) return true;
  if (BAD_EN_LITERALS.has(en)) return true;
  // All-lowercase single word / short phrase often means a dictionary mistranslation
  if (/^[a-z]+(?:\s[a-z]+){0,2}$/.test(en) && en.length <= 14) {
    // Allow known good short names that are conventionally lowercase-ish in data
    const allow = new Set(["gangnam", "itaewon", "jamsil", "sinchon"]);
    if (allow.has(en)) return false;
    // If it looks like a common noun mistranslation and KO has a mapper, treat as bad
    return true;
  }
  return false;
}
