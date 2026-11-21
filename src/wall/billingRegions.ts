import type { LatLng } from "./geo"

/**
 * Full place catalog from billing.regions (rqii + region).
 * Source: GET /newapi/hub/esyduckdb/db/rows?schema=billing&table=regions&limit=200
 * Accident-call RQİİ is `region.title` — match against `rqii` here.
 */

export type BillingRegionRow = {
  rqii: string
  region: string
  center: LatLng
  /** Azerbaijani / emergency-API aliases for the place name. */
  aliases: string[]
}

/** Canonical RQİİ seat centers (match accident-call region.title / billing.rqii). */
export const RQII_SEATS: { rqii: string; center: LatLng; aliases: string[] }[] = [
  { rqii: "Bakı RQİİ", center: { lat: 40.4093, lon: 49.8671 }, aliases: ["bakı rqii", "bakı rqsd", "brqsd", "brqii", "baku", "bakı"] },
  { rqii: "BRQSD", center: { lat: 40.4093, lon: 49.8671 }, aliases: ["bakı rqsd", "bakı rqii", "brqii"] },
  { rqii: "BRQİİ", center: { lat: 40.4093, lon: 49.8671 }, aliases: ["bakı rqii", "bakı rqsd", "brqsd"] },
  { rqii: "Sumqayıt RQİİ", center: { lat: 40.5961, lon: 49.67 }, aliases: ["sumqayıt rqii", "sumqayıt qii", "sumgayit"] },
  { rqii: "Gəncə RQİİ", center: { lat: 40.6828, lon: 46.3606 }, aliases: ["gəncə rqii", "gence"] },
  { rqii: "Salyan RQİİ", center: { lat: 39.595, lon: 48.979 }, aliases: ["salyan rqii"] },
  { rqii: "Xaçmaz RQİİ", center: { lat: 41.4636, lon: 48.8065 }, aliases: ["xaçmaz rqii", "xachmaz"] },
  { rqii: "Lənkəran RQİİ", center: { lat: 38.754, lon: 48.851 }, aliases: ["lənkəran rqii", "lankaran"] },
  { rqii: "Tərtər RQİİ", center: { lat: 40.342, lon: 46.93 }, aliases: ["tərtər rqii", "terter"] },
  { rqii: "Ağsu RQİİ", center: { lat: 40.5703, lon: 48.4009 }, aliases: ["ağsu rqii", "agsu"] },
  { rqii: "Zaqatala RQİİ", center: { lat: 41.6336, lon: 46.6433 }, aliases: ["zaqatala rqii"] },
  { rqii: "Şəmkir RQİİ", center: { lat: 40.8297, lon: 46.0178 }, aliases: ["şəmkir rqii", "shamkir"] },
  { rqii: "Qarabağ RQİİ", center: { lat: 39.8265, lon: 46.7656 }, aliases: ["qarabağ rqii", "karabakh"] },
  { rqii: "Naxçıvan RQİİ", center: { lat: 39.2089, lon: 45.4122 }, aliases: ["naxçıvan rqii", "nakhchivan"] },
]

/** billing.regions rows with centers + AZ aliases for emergency district.title matching. */
export const BILLING_REGIONS: BillingRegionRow[] = [
  { rqii: "Ağsu RQİİ", region: "Agsu District", center: { lat: 40.5703, lon: 48.4009 }, aliases: ["ağsu", "agsu"] },
  { rqii: "Ağsu RQİİ", region: "Gobustan District", center: { lat: 40.53, lon: 48.93 }, aliases: ["qobustan", "gobustan"] },
  { rqii: "Ağsu RQİİ", region: "Goychay District", center: { lat: 40.6553, lon: 47.7389 }, aliases: ["göyçay", "goychay"] },
  { rqii: "Ağsu RQİİ", region: "Ismailli District", center: { lat: 40.7847, lon: 48.1514 }, aliases: ["ismayıllı", "ismayilli"] },
  { rqii: "Ağsu RQİİ", region: "Kurdamir District", center: { lat: 40.3383, lon: 48.1608 }, aliases: ["kürdəmir", "kurdamir"] },
  { rqii: "Ağsu RQİİ", region: "Shamakhi District", center: { lat: 40.63, lon: 48.64 }, aliases: ["şamaxı", "shamakhi"] },
  { rqii: "Ağsu RQİİ", region: "Ujar District", center: { lat: 40.5183, lon: 47.6542 }, aliases: ["ucar", "ujar"] },
  { rqii: "BRQSD", region: "Baku City", center: { lat: 40.4093, lon: 49.8671 }, aliases: ["bakı", "baku"] },
  { rqii: "BRQİİ", region: "Baku City", center: { lat: 40.4093, lon: 49.8671 }, aliases: ["bakı", "baku"] },
  { rqii: "Gəncə RQİİ", region: "Ganja City", center: { lat: 40.6828, lon: 46.3606 }, aliases: ["gəncə", "ganja", "gence"] },
  { rqii: "Gəncə RQİİ", region: "Goranboy District", center: { lat: 40.61, lon: 46.79 }, aliases: ["goranboy"] },
  { rqii: "Gəncə RQİİ", region: "Goygol District", center: { lat: 40.59, lon: 46.32 }, aliases: ["göygöl", "goygol"] },
  { rqii: "Gəncə RQİİ", region: "Naftalan City", center: { lat: 40.51, lon: 46.82 }, aliases: ["naftalan"] },
  { rqii: "Gəncə RQİİ", region: "Samukh District", center: { lat: 40.77, lon: 46.41 }, aliases: ["samux", "samukh"] },
  { rqii: "Lənkəran RQİİ", region: "Astara District", center: { lat: 38.46, lon: 48.87 }, aliases: ["astara"] },
  { rqii: "Lənkəran RQİİ", region: "Bilasuvar District", center: { lat: 39.46, lon: 48.54 }, aliases: ["biləsuvar", "bilasuvar"] },
  { rqii: "Lənkəran RQİİ", region: "Jalilabad District", center: { lat: 39.21, lon: 48.5 }, aliases: ["cəlilabad", "jalilabad"] },
  { rqii: "Lənkəran RQİİ", region: "Lankaran District", center: { lat: 38.754, lon: 48.851 }, aliases: ["lənkəran", "lankaran"] },
  { rqii: "Lənkəran RQİİ", region: "Lerik District", center: { lat: 38.77, lon: 48.41 }, aliases: ["lerik"] },
  { rqii: "Lənkəran RQİİ", region: "Masally District", center: { lat: 39.03, lon: 48.67 }, aliases: ["masallı", "masally"] },
  { rqii: "Lənkəran RQİİ", region: "Yardymli District", center: { lat: 38.91, lon: 48.24 }, aliases: ["yardımlı", "yardymli"] },
  { rqii: "Naxçıvan RQİİ", region: "Babek District", center: { lat: 39.15, lon: 45.45 }, aliases: ["babək", "babek"] },
  { rqii: "Naxçıvan RQİİ", region: "Julfa District", center: { lat: 38.95, lon: 45.63 }, aliases: ["culfa", "julfa"] },
  { rqii: "Naxçıvan RQİİ", region: "Kangarli District", center: { lat: 39.39, lon: 45.16 }, aliases: ["kəngərli", "kangarli"] },
  { rqii: "Naxçıvan RQİİ", region: "Nakhchivan District", center: { lat: 39.2089, lon: 45.4122 }, aliases: ["naxçıvan", "nakhchivan"] },
  { rqii: "Naxçıvan RQİİ", region: "Ordubad District", center: { lat: 38.91, lon: 46.02 }, aliases: ["ordubad"] },
  { rqii: "Naxçıvan RQİİ", region: "Sadarak District", center: { lat: 39.71, lon: 44.88 }, aliases: ["sədərək", "sadarak"] },
  { rqii: "Naxçıvan RQİİ", region: "Shahbuz District", center: { lat: 39.4, lon: 45.57 }, aliases: ["şahbuz", "shahbuz"] },
  { rqii: "Naxçıvan RQİİ", region: "Sharur District", center: { lat: 39.55, lon: 44.98 }, aliases: ["şərur", "sharur"] },
  { rqii: "Qarabağ RQİİ", region: "Agdam District", center: { lat: 39.99, lon: 46.93 }, aliases: ["ağdam", "agdam"] },
  { rqii: "Qarabağ RQİİ", region: "Aghdara District", center: { lat: 40.21, lon: 46.81 }, aliases: ["ağdərə", "aghdara"] },
  { rqii: "Qarabağ RQİİ", region: "Gubadly District", center: { lat: 39.34, lon: 46.58 }, aliases: ["qubadlı", "gubadly"] },
  { rqii: "Qarabağ RQİİ", region: "Jabrayil District", center: { lat: 39.4, lon: 47.03 }, aliases: ["cəbrayıl", "jabrayil"] },
  { rqii: "Qarabağ RQİİ", region: "Kalbajar District", center: { lat: 40.1, lon: 46.04 }, aliases: ["kəlbəcər", "kalbajar"] },
  { rqii: "Qarabağ RQİİ", region: "Khankendi district", center: { lat: 39.8265, lon: 46.7656 }, aliases: ["xankəndi", "khankendi"] },
  { rqii: "Qarabağ RQİİ", region: "Khojaly District", center: { lat: 39.91, lon: 46.79 }, aliases: ["xocalı", "khojaly"] },
  { rqii: "Qarabağ RQİİ", region: "Khojavend District", center: { lat: 39.79, lon: 47.11 }, aliases: ["xocavənd", "khojavend"] },
  { rqii: "Qarabağ RQİİ", region: "Lachin District", center: { lat: 39.63, lon: 46.55 }, aliases: ["laçın", "lachin"] },
  { rqii: "Qarabağ RQİİ", region: "Shusha District", center: { lat: 39.76, lon: 46.75 }, aliases: ["şuşa", "shusha"] },
  { rqii: "Qarabağ RQİİ", region: "Zangilan District", center: { lat: 39.08, lon: 46.7 }, aliases: ["zəngilan", "zangilan"] },
  { rqii: "Salyan RQİİ", region: "Hajigabul District", center: { lat: 40.038, lon: 48.943 }, aliases: ["hacıqabul", "hajigabul"] },
  { rqii: "Salyan RQİİ", region: "Imishli District", center: { lat: 39.8697, lon: 48.06 }, aliases: ["imişli", "imishli"] },
  { rqii: "Salyan RQİİ", region: "Neftchala District", center: { lat: 39.37, lon: 49.25 }, aliases: ["neftçala", "neftchala"] },
  { rqii: "Salyan RQİİ", region: "Saatly District", center: { lat: 39.93, lon: 48.37 }, aliases: ["saatlı", "saatly"] },
  { rqii: "Salyan RQİİ", region: "Sabirabad District", center: { lat: 40.01, lon: 48.477 }, aliases: ["sabirabad"] },
  { rqii: "Salyan RQİİ", region: "Salyan District", center: { lat: 39.595, lon: 48.979 }, aliases: ["salyan"] },
  { rqii: "Salyan RQİİ", region: "Shirvan City", center: { lat: 39.93, lon: 48.92 }, aliases: ["şirvan", "shirvan"] },
  { rqii: "Sumqayıt RQİİ", region: "Absheron District", center: { lat: 40.45, lon: 49.75 }, aliases: ["abşeron", "absheron"] },
  { rqii: "Sumqayıt RQİİ", region: "Khizi District", center: { lat: 40.91, lon: 49.07 }, aliases: ["xızı", "khizi"] },
  { rqii: "Sumqayıt RQİİ", region: "Sumqayit City", center: { lat: 40.5961, lon: 49.67 }, aliases: ["sumqayıt", "sumgayit"] },
  { rqii: "Tərtər RQİİ", region: "Aghjabadi District", center: { lat: 40.05, lon: 47.46 }, aliases: ["ağcabədi", "aghjabadi"] },
  { rqii: "Tərtər RQİİ", region: "Barda District", center: { lat: 40.37, lon: 47.13 }, aliases: ["bərdə", "barda"] },
  { rqii: "Tərtər RQİİ", region: "Beylagan District", center: { lat: 39.77, lon: 47.62 }, aliases: ["beyləqan", "beylagan"] },
  { rqii: "Tərtər RQİİ", region: "Fuzuli District", center: { lat: 39.6, lon: 47.15 }, aliases: ["füzuli", "fuzuli"] },
  { rqii: "Tərtər RQİİ", region: "Mingachevir City", center: { lat: 40.77, lon: 47.05 }, aliases: ["mingəçevir", "mingachevir"] },
  { rqii: "Tərtər RQİİ", region: "Tartar District", center: { lat: 40.342, lon: 46.93 }, aliases: ["tərtər", "tartar", "terter"] },
  { rqii: "Tərtər RQİİ", region: "Yevlakh District", center: { lat: 40.66, lon: 47.15 }, aliases: ["yevlax", "yevlakh"] },
  { rqii: "Tərtər RQİİ", region: "Zardab District", center: { lat: 40.22, lon: 47.71 }, aliases: ["zərdab", "zardab"] },
  { rqii: "Xaçmaz RQİİ", region: "Khachmaz District", center: { lat: 41.4636, lon: 48.8065 }, aliases: ["xaçmaz", "khachmaz"] },
  { rqii: "Xaçmaz RQİİ", region: "Khizi District", center: { lat: 40.91, lon: 49.07 }, aliases: ["xızı", "khizi"] },
  { rqii: "Xaçmaz RQİİ", region: "Quba District", center: { lat: 41.36, lon: 48.51 }, aliases: ["quba", "quba"] },
  { rqii: "Xaçmaz RQİİ", region: "Qusar District", center: { lat: 41.43, lon: 48.43 }, aliases: ["qusar"] },
  { rqii: "Xaçmaz RQİİ", region: "Shabran District", center: { lat: 41.2, lon: 48.99 }, aliases: ["şabran", "shabran"] },
  { rqii: "Xaçmaz RQİİ", region: "Siazan District", center: { lat: 41.08, lon: 49.11 }, aliases: ["siyəzən", "siazan"] },
  { rqii: "Zaqatala RQİİ", region: "Agdash District", center: { lat: 40.65, lon: 47.48 }, aliases: ["ağdaş", "agdash"] },
  { rqii: "Zaqatala RQİİ", region: "Balakan District", center: { lat: 41.73, lon: 46.41 }, aliases: ["balakən", "balakan"] },
  { rqii: "Zaqatala RQİİ", region: "Oghuz District", center: { lat: 41.07, lon: 47.46 }, aliases: ["oğuz", "oghuz"] },
  { rqii: "Zaqatala RQİİ", region: "Qabala District", center: { lat: 40.98, lon: 47.85 }, aliases: ["qəbələ", "qabala", "gabala"] },
  { rqii: "Zaqatala RQİİ", region: "Qakh District", center: { lat: 41.42, lon: 46.92 }, aliases: ["qax", "qakh"] },
  { rqii: "Zaqatala RQİİ", region: "Shaki District", center: { lat: 41.2, lon: 47.17 }, aliases: ["şəki", "shaki", "sheki"] },
  { rqii: "Zaqatala RQİİ", region: "Zaqatala District", center: { lat: 41.6336, lon: 46.6433 }, aliases: ["zaqatala"] },
  { rqii: "Şəmkir RQİİ", region: "Agstafa District", center: { lat: 41.12, lon: 45.45 }, aliases: ["ağstafa", "agstafa"] },
  { rqii: "Şəmkir RQİİ", region: "Dashkasan District", center: { lat: 40.52, lon: 46.08 }, aliases: ["daşkəsən", "dashkasan"] },
  { rqii: "Şəmkir RQİİ", region: "Gadabay District", center: { lat: 40.57, lon: 45.82 }, aliases: ["gədəbəy", "gadabay"] },
  { rqii: "Şəmkir RQİİ", region: "Qazakh District", center: { lat: 41.09, lon: 45.36 }, aliases: ["qazax", "qazakh"] },
  { rqii: "Şəmkir RQİİ", region: "Shamkir District", center: { lat: 40.8297, lon: 46.0178 }, aliases: ["şəmkir", "shamkir"] },
  { rqii: "Şəmkir RQİİ", region: "Tovuz District", center: { lat: 40.99, lon: 45.63 }, aliases: ["tovuz"] },
]

export const BILLING_REGIONS_URL = "/newapi/hub/esyduckdb/db/rows?schema=billing&table=regions&limit=200"
