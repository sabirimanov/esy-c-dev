/** Tunable knobs for "UFG by region" map slide. */

export const UFG_BY_REGION = {
  year: 2026,
  month: 10,
  /** Opacity of tinted GLB regions (1 = full replace of base albedo). */
  intensity: 1,
  /**
   * Fill when grossUfgPct is ~0 — gray-green so the territory still shows,
   * but reads as “no data”, not the bright API green.
   */
  zeroColor: "#8FA99A",
  zeroEps: 0.05,
  /** Lift API hex toward brighter / more saturated fills on the textured map. */
  colorBoost: { sat: 1.35, light: 1.45 },
}

/**
 * API region title (folded) → full GLB mesh id.
 * Bakı RQSD → baku, Sumqayıt Qİİ → absheron-khizi, Ağsu RQİİ → daghlig-shirvan.
 */
export const UFG_REGION_TO_GLB: { match: string; regionId: string }[] = [
  { match: "sumqayit", regionId: "absheron-khizi" },
  { match: "sumgayit", regionId: "absheron-khizi" },
  { match: "baku", regionId: "baku" },
  { match: "bakı", regionId: "baku" },
  { match: "baki", regionId: "baku" },
  { match: "agsu", regionId: "daghlig-shirvan" },
  { match: "ağsu", regionId: "daghlig-shirvan" },
]

export function ufgByRegionUrl(year = UFG_BY_REGION.year, month = UFG_BY_REGION.month) {
  return `/newapi/hub/ufg/api/v2/ufg/by-region?year=${year}&month=${month}`
}
