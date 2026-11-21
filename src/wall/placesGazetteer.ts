import { BILLING_REGIONS, RQII_SEATS, type BillingRegionRow } from "./billingRegions"
import type { LatLng } from "./geo"

export type DistrictKind = "city" | "city_district" | "district" | "region_seat"

export type DistrictEntry = {
  id: number
  title: string
  kind: DistrictKind
  parentCity?: string
  center: LatLng | null
}

export type NamedPlace = {
  key: string
  title: string
  center: LatLng
  aliases: string[]
  source: "district" | "locality" | "hierarchy" | "region" | "billing"
  rqii?: string
}

export type LocalityEntry = {
  districtId: number
  canonical: string
  aliases: string[]
  center: LatLng
}

/** Emergency region.id → RQİİ seat (fallback when district unknown). Titles align with accident-call region.title. */
const REGION_SEATS: { id: number; title: string; center: LatLng; aliases: string[] }[] = [
  { id: 1, title: "Bakı RQİİ", center: { lat: 40.4093, lon: 49.8671 }, aliases: ["bakı", "baku", "bakı rqii", "bakı rqsd", "brqsd", "brqii"] },
  { id: 2, title: "Sumqayıt RQİİ", center: { lat: 40.5961, lon: 49.67 }, aliases: ["sumqayıt", "sumgayit", "sumqayıt qii", "sumqayıt rqii"] },
  { id: 3, title: "Gəncə RQİİ", center: { lat: 40.6828, lon: 46.3606 }, aliases: ["gəncə", "gence", "gəncə rqii"] },
  { id: 4, title: "Salyan RQİİ", center: { lat: 39.595, lon: 48.979 }, aliases: ["salyan", "salyan rqii"] },
  { id: 5, title: "Xaçmaz RQİİ", center: { lat: 41.4636, lon: 48.8065 }, aliases: ["xaçmaz", "xachmaz", "xaçmaz rqii"] },
  { id: 6, title: "Lənkəran RQİİ", center: { lat: 38.754, lon: 48.851 }, aliases: ["lənkəran", "lankaran", "lənkəran rqii"] },
  { id: 7, title: "Tərtər RQİİ", center: { lat: 40.342, lon: 46.93 }, aliases: ["tərtər", "terter", "tərtər rqii"] },
  { id: 8, title: "Ağsu RQİİ", center: { lat: 40.5703, lon: 48.4009 }, aliases: ["ağsu", "agsu", "ağsu rqii"] },
  { id: 9, title: "Zaqatala RQİİ", center: { lat: 41.6336, lon: 46.6433 }, aliases: ["zaqatala", "zagatala", "zaqatala rqii"] },
  { id: 10, title: "Şəmkir RQİİ", center: { lat: 40.8297, lon: 46.0178 }, aliases: ["şəmkir", "shamkir", "şəmkir rqii"] },
  { id: 11, title: "Qarabağ RQİİ", center: { lat: 39.8265, lon: 46.7656 }, aliases: ["qarabağ", "karabakh", "qarabağ rqii", "xankəndi"] },
  { id: 12, title: "Naxçıvan RQİİ", center: { lat: 39.2089, lon: 45.4122 }, aliases: ["naxçıvan", "nakhchivan", "naxçıvan rqii"] },
]

/** Seed districts (emergency API ids). Extend when new ids appear. */
const DISTRICTS: DistrictEntry[] = [
  { id: 1, title: "Yasamal", kind: "city_district", parentCity: "Bakı", center: { lat: 40.379, lon: 49.81 } },
  { id: 2, title: "Binəqədi", kind: "city_district", parentCity: "Bakı", center: { lat: 40.45, lon: 49.83 } },
  { id: 3, title: "Nəsimi", kind: "city_district", parentCity: "Bakı", center: { lat: 40.39, lon: 49.84 } },
  { id: 4, title: "Nərimanov", kind: "city_district", parentCity: "Bakı", center: { lat: 40.41, lon: 49.87 } },
  { id: 5, title: "Səbail", kind: "city_district", parentCity: "Bakı", center: { lat: 40.35, lon: 49.83 } },
  { id: 6, title: "Xətai", kind: "city_district", parentCity: "Bakı", center: { lat: 40.38, lon: 49.92 } },
  { id: 7, title: "Suraxanı", kind: "city_district", parentCity: "Bakı", center: { lat: 40.42, lon: 50.0 } },
  { id: 8, title: "Sabunçu", kind: "city_district", parentCity: "Bakı", center: { lat: 40.44, lon: 49.95 } },
  { id: 9, title: "Xəzər", kind: "city_district", parentCity: "Bakı", center: { lat: 40.4, lon: 50.15 } },
  { id: 10, title: "Nizami", kind: "city_district", parentCity: "Bakı", center: { lat: 40.42, lon: 49.94 } },
  { id: 11, title: "Qaradağ", kind: "city_district", parentCity: "Bakı", center: { lat: 40.25, lon: 49.6 } },
  { id: 12, title: "Abşeron", kind: "district", center: { lat: 40.45, lon: 49.75 } },
  { id: 13, title: "Sumqayıt", kind: "city", center: { lat: 40.5961, lon: 49.67 } },
  { id: 14, title: "İmişli", kind: "district", center: { lat: 39.8697, lon: 48.06 } },
  { id: 16, title: "Salyan", kind: "district", center: { lat: 39.595, lon: 48.979 } },
  { id: 17, title: "Sabirabad", kind: "district", center: { lat: 40.01, lon: 48.477 } },
  { id: 21, title: "Cəlilabad", kind: "district", center: { lat: 39.21, lon: 48.5 } },
  { id: 22, title: "Ağsu", kind: "district", center: { lat: 40.5703, lon: 48.4009 } },
  { id: 23, title: "Hacıqabul", kind: "district", center: { lat: 40.038, lon: 48.943 } },
  { id: 24, title: "İsmayıllı", kind: "district", center: { lat: 40.7847, lon: 48.1514 } },
  { id: 25, title: "Kürdəmir", kind: "district", center: { lat: 40.3383, lon: 48.1608 } },
  { id: 26, title: "Qobustan", kind: "district", center: { lat: 40.53, lon: 48.93 } },
  { id: 27, title: "Şamaxı", kind: "district", center: { lat: 40.63, lon: 48.64 } },
  { id: 28, title: "Ağdaş", kind: "district", center: { lat: 40.65, lon: 47.48 } },
  { id: 29, title: "Balakən", kind: "district", center: { lat: 41.73, lon: 46.41 } },
  { id: 30, title: "Goranboy", kind: "district", center: { lat: 40.61, lon: 46.79 } },
  { id: 31, title: "Göyçay", kind: "district", center: { lat: 40.6553, lon: 47.7389 } },
  { id: 32, title: "Mingəçevir", kind: "city", center: { lat: 40.77, lon: 47.05 } },
  { id: 34, title: "Oğuz", kind: "district", center: { lat: 41.07, lon: 47.46 } },
  { id: 36, title: "Qəbələ", kind: "district", center: { lat: 40.98, lon: 47.85 } },
  { id: 38, title: "Ucar", kind: "district", center: { lat: 40.5183, lon: 47.6542 } },
  { id: 39, title: "Yevlax", kind: "district", center: { lat: 40.66, lon: 47.15 } },
  { id: 40, title: "Zərdab", kind: "district", center: { lat: 40.22, lon: 47.71 } },
  { id: 41, title: "Zaqatala", kind: "district", center: { lat: 41.6336, lon: 46.6433 } },
  { id: 43, title: "Qusar", kind: "district", center: { lat: 41.43, lon: 48.43 } },
  { id: 44, title: "Quba", kind: "district", center: { lat: 41.36, lon: 48.51 } },
  { id: 45, title: "Siyəzən", kind: "district", center: { lat: 41.08, lon: 49.11 } },
  { id: 46, title: "Xızı", kind: "district", center: { lat: 40.91, lon: 49.07 } },
  { id: 47, title: "Xaçmaz", kind: "district", center: { lat: 41.4636, lon: 48.8065 } },
  { id: 48, title: "Ağdam", kind: "district", center: { lat: 39.99, lon: 46.93 } },
  { id: 49, title: "Ağcabədi", kind: "district", center: { lat: 40.05, lon: 47.46 } },
  { id: 50, title: "Bərdə", kind: "district", center: { lat: 40.37, lon: 47.13 } },
  { id: 51, title: "Beyləqan", kind: "district", center: { lat: 39.77, lon: 47.62 } },
  { id: 52, title: "Füzuli", kind: "district", center: { lat: 39.6, lon: 47.15 } },
  { id: 53, title: "Tərtər", kind: "district", center: { lat: 40.342, lon: 46.93 } },
  { id: 54, title: "Astara", kind: "district", center: { lat: 38.46, lon: 48.87 } },
  { id: 56, title: "Lənkəran", kind: "district", center: { lat: 38.754, lon: 48.851 } },
  { id: 57, title: "Masallı", kind: "district", center: { lat: 39.03, lon: 48.67 } },
  { id: 58, title: "Yardımlı", kind: "district", center: { lat: 38.91, lon: 48.24 } },
  { id: 59, title: "Ağstafa", kind: "district", center: { lat: 41.12, lon: 45.45 } },
  { id: 61, title: "Gəncə", kind: "city", center: { lat: 40.6828, lon: 46.3606 } },
  { id: 62, title: "Göygöl", kind: "district", center: { lat: 40.59, lon: 46.32 } },
  { id: 63, title: "Gədəbəy", kind: "district", center: { lat: 40.57, lon: 45.82 } },
  { id: 64, title: "Qazax", kind: "district", center: { lat: 41.09, lon: 45.36 } },
  { id: 65, title: "Samux", kind: "district", center: { lat: 40.77, lon: 46.41 } },
  { id: 66, title: "Şəmkir", kind: "district", center: { lat: 40.8297, lon: 46.0178 } },
  { id: 67, title: "Tovuz", kind: "district", center: { lat: 40.99, lon: 45.63 } },
  { id: 69, title: "Laçın", kind: "district", center: { lat: 39.63, lon: 46.55 } },
  { id: 70, title: "Xankəndi", kind: "city", center: { lat: 39.8265, lon: 46.7656 } },
  { id: 78, title: "Naxçıvan", kind: "city", center: { lat: 39.2089, lon: 45.4122 } },
  { id: 79, title: "Şərur", kind: "district", center: { lat: 39.55, lon: 44.98 } },
  { id: 80, title: "Sədərək", kind: "district", center: { lat: 39.71, lon: 44.88 } },
  { id: 81, title: "Culfa", kind: "district", center: { lat: 38.95, lon: 45.63 } },
  { id: 83, title: "Babək", kind: "district", center: { lat: 39.15, lon: 45.45 } },
  { id: 84, title: "Ordubad", kind: "district", center: { lat: 38.91, lon: 46.02 } },
  { id: 85, title: "Kəngərli", kind: "district", center: { lat: 39.39, lon: 45.16 } },
]

/** Hierarchy zone_id → known center (UFG /ufg/hierarchy + CCC hierarchy). */
const HIERARCHY_ZONE_COORDS: Record<string, LatLng> = {
  Z_agsu: { lat: 40.5703, lon: 48.4009 },
  Z_ismayilli: { lat: 40.7847, lon: 48.1514 },
  Z_kurdemir: { lat: 40.3383, lon: 48.1608 },
  Z_goycay: { lat: 40.6553, lon: 47.7389 },
  Z_ucar: { lat: 40.5183, lon: 47.6542 },
  Z_sabuncu: { lat: 40.44, lon: 49.95 },
  Z_sumqayit: { lat: 40.5961, lon: 49.67 },
}

const LOCALITIES: LocalityEntry[] = [
  { districtId: 12, canonical: "Saray", aliases: ["saray", "saray qəsəbəsi", "saray qesebesi"], center: { lat: 40.4503, lon: 49.7563 } },
  { districtId: 12, canonical: "Masazır", aliases: ["masazır", "masazir", "masazır kəndi", "masazir kendi"], center: { lat: 40.4578, lon: 49.7653 } },
  { districtId: 38, canonical: "Qaradağlı", aliases: ["qaradağlı", "qaradagli", "qaradağlı kəndi"], center: { lat: 40.4713, lon: 47.581 } },
  { districtId: 14, canonical: "Oruclu", aliases: ["oruclu", "oruclu kəndi"], center: { lat: 39.87, lon: 48.05 } },
  { districtId: 64, canonical: "Dəmirçilər", aliases: ["dəmirçilər", "demirciler", "dəmirçilər kəndi"], center: { lat: 41.0873, lon: 45.2695 } },
]

const byId = new Map(DISTRICTS.map((d) => [d.id, d]))
const byRegionId = new Map(REGION_SEATS.map((r) => [r.id, r]))
/** Extra named places from hierarchy / runtime merge (title → place). */
const namedPlaces = new Map<string, NamedPlace>()

export function foldAz(text: string): string {
  return text
    .normalize("NFC")
    .toLocaleLowerCase("az")
    .replace(/[’'`]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function stripPlaceNoise(text: string): string {
  return foldAz(text)
    .replace(/\b(qəs\.?|qes\.?|qəsəbəsi|qesebesi|kəndi|kendi|şəh\.?|seh\.?|şəhəri|sehəri|rq[iı]{2}|q[iı]{2}|rqsd)\b/g, " ")
    .replace(/[.,;]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function rememberPlace(place: NamedPlace) {
  const keys = [foldAz(place.title), ...place.aliases.map(foldAz), stripPlaceNoise(place.title)]
  for (const key of keys) {
    if (!key) continue
    if (!namedPlaces.has(key)) namedPlaces.set(key, place)
  }
}

// Seed named index from districts + region seats + localities
for (const d of DISTRICTS) {
  if (!d.center) continue
  rememberPlace({
    key: `district:${d.id}`,
    title: d.title,
    center: d.center,
    aliases: d.parentCity ? [foldAz(d.parentCity)] : [],
    source: "district",
  })
}
for (const r of REGION_SEATS) {
  rememberPlace({
    key: `region:${r.id}`,
    title: r.title,
    center: r.center,
    aliases: r.aliases,
    source: "region",
    rqii: r.title,
  })
}
for (const seat of RQII_SEATS) {
  rememberPlace({
    key: `rqii:${foldAz(seat.rqii)}`,
    title: seat.rqii,
    center: seat.center,
    aliases: seat.aliases,
    source: "billing",
    rqii: seat.rqii,
  })
}
for (const row of BILLING_REGIONS) {
  rememberBillingRow(row)
}

function rememberBillingRow(row: BillingRegionRow) {
  const en = foldAz(row.region)
  const short = en.replace(/\s+(district|city)\s*$/i, "").trim()
  rememberPlace({
    key: `billing:${foldAz(row.rqii)}:${en}`,
    title: row.region,
    center: row.center,
    aliases: [...row.aliases, short, en],
    source: "billing",
    rqii: row.rqii,
  })
  // Patch known emergency districts that share an AZ alias
  for (const d of byId.values()) {
    const title = foldAz(d.title)
    if (row.aliases.includes(title) || title === short) {
      if (!d.center) d.center = row.center
    }
  }
}
for (const loc of LOCALITIES) {
  rememberPlace({
    key: `locality:${loc.districtId}:${foldAz(loc.canonical)}`,
    title: loc.canonical,
    center: loc.center,
    aliases: loc.aliases,
    source: "locality",
  })
}

export function districtById(id: number | null | undefined): DistrictEntry | null {
  if (id == null || !Number.isFinite(Number(id))) return null
  return byId.get(Number(id)) ?? null
}

export function regionSeatById(id: number | null | undefined): (typeof REGION_SEATS)[number] | null {
  if (id == null || !Number.isFinite(Number(id))) return null
  return byRegionId.get(Number(id)) ?? null
}

/**
 * Accident-call RQİİ is `region.title` (e.g. "Bakı RQİİ").
 * Match billing.regions.rqii / RQII_SEATS / REGION_SEATS.
 */
export function regionSeatByRqii(title: string | null | undefined): { title: string; center: LatLng } | null {
  if (!title) return null
  const folded = foldAz(title)
  const stripped = stripPlaceNoise(title)
  const fromNamed = namedPlaces.get(folded) ?? namedPlaces.get(stripped)
  if (fromNamed?.source === "region" || fromNamed?.source === "billing" || fromNamed?.rqii) {
    return { title: fromNamed.rqii || fromNamed.title, center: fromNamed.center }
  }
  const seat =
    REGION_SEATS.find((r) => foldAz(r.title) === folded || r.aliases.includes(folded) || r.aliases.includes(stripped)) ??
    RQII_SEATS.find((r) => foldAz(r.rqii) === folded || r.aliases.includes(folded) || r.aliases.includes(stripped))
  return seat ? { title: "rqii" in seat ? seat.rqii : seat.title, center: seat.center } : null
}

function sameRqii(a: string, b: string): boolean {
  const fa = foldAz(a)
  const fb = foldAz(b)
  if (fa === fb) return true
  const seatA = RQII_SEATS.find((s) => foldAz(s.rqii) === fa || s.aliases.includes(fa))
  const seatB = RQII_SEATS.find((s) => foldAz(s.rqii) === fb || s.aliases.includes(fb))
  if (seatA && seatB && seatA.center.lat === seatB.center.lat && seatA.center.lon === seatB.center.lon) return true
  if (seatA && (foldAz(seatA.rqii) === fb || seatA.aliases.includes(fb))) return true
  if (seatB && (foldAz(seatB.rqii) === fa || seatB.aliases.includes(fa))) return true
  return false
}

/** District / place center scoped to accident-call region.title (RQİİ). */
export function placeCenterForRqii(rqii: string | null | undefined, districtTitle: string | null | undefined): LatLng | null {
  if (!districtTitle) return null
  const folded = foldAz(districtTitle)
  const stripped = stripPlaceNoise(districtTitle)
  const matches = (row: BillingRegionRow) => {
    const en = foldAz(row.region)
    const short = en.replace(/\s+(district|city)\s*$/i, "").trim()
    return row.aliases.includes(folded) || row.aliases.includes(stripped) || short === folded || short === stripped || en === folded
  }
  if (rqii) {
    const scoped = BILLING_REGIONS.find((row) => sameRqii(row.rqii, rqii) && matches(row))
    if (scoped) return scoped.center
  }
  const any = BILLING_REGIONS.find(matches)
  return any?.center ?? lookupCenterByName(districtTitle)
}

/** Ingest live billing.regions rows (optional refresh). Static BILLING_REGIONS already seeded. */
export function ingestBillingRegions(rows: { rqii?: string; region?: string }[]) {
  for (const row of rows) {
    if (!row.rqii || !row.region) continue
    const existing = BILLING_REGIONS.find((r) => foldAz(r.rqii) === foldAz(row.rqii!) && foldAz(r.region) === foldAz(row.region!))
    if (existing) {
      rememberBillingRow(existing)
      continue
    }
    const center = regionSeatByRqii(row.rqii)?.center ?? lookupCenterByName(row.region)
    if (!center) continue
    const entry: BillingRegionRow = {
      rqii: row.rqii,
      region: row.region,
      center,
      aliases: [foldAz(row.region).replace(/\s+(district|city)\s*$/i, "").trim()],
    }
    BILLING_REGIONS.push(entry)
    rememberBillingRow(entry)
  }
}

/**
 * Merge UFG/CCC hierarchy regions + zones into the gazetteer.
 * Fills gaps when emergency recent payload does not mention a place.
 */
export function ingestHierarchyPlaces(input: {
  regions?: { region_id?: string; name_en?: string; name_az?: string }[]
  zones?: { zone_id?: string; region_id?: string; name_en?: string; name_az?: string }[]
}) {
  for (const region of input.regions ?? []) {
    const title = region.name_en || region.name_az
    if (!title) continue
    const folded = foldAz(title)
    const seat = REGION_SEATS.find((r) => r.aliases.includes(folded) || foldAz(r.title) === folded || stripPlaceNoise(r.title) === stripPlaceNoise(title))
    const center = seat?.center ?? null
    if (!center) continue
    rememberPlace({
      key: `hierarchy:region:${region.region_id || title}`,
      title,
      center,
      aliases: [folded, stripPlaceNoise(title)],
      source: "hierarchy",
    })
  }
  for (const zone of input.zones ?? []) {
    const title = zone.name_en || zone.name_az
    if (!title || !zone.zone_id) continue
    const center = HIERARCHY_ZONE_COORDS[zone.zone_id]
    if (!center) continue
    rememberPlace({
      key: `hierarchy:zone:${zone.zone_id}`,
      title,
      center,
      aliases: [foldAz(title), stripPlaceNoise(title)],
      source: "hierarchy",
    })
    // Also patch matching district by title if center missing
    for (const d of byId.values()) {
      if (foldAz(d.title) === foldAz(title) && !d.center) {
        d.center = center
      }
    }
  }
}

/** Ensure unknown district id from a live call is registered (coords may be null until filled). */
export function ensureDistrict(id: number, title: string) {
  if (byId.has(id)) return byId.get(id)!
  const entry: DistrictEntry = { id, title, kind: "district", center: lookupCenterByName(title) }
  byId.set(id, entry)
  DISTRICTS.push(entry)
  if (entry.center) {
    rememberPlace({
      key: `district:${id}`,
      title,
      center: entry.center,
      aliases: [],
      source: "district",
    })
  }
  return entry
}

export function lookupCenterByName(name: string | null | undefined): LatLng | null {
  if (!name) return null
  const folded = foldAz(name)
  const stripped = stripPlaceNoise(name)
  return namedPlaces.get(folded)?.center ?? namedPlaces.get(stripped)?.center ?? null
}

/** Persist a geocoded (or manually found) center into the session gazetteer. */
export function registerGeocodedCenter(title: string, center: LatLng, rqii?: string | null) {
  rememberPlace({
    key: `geocode:${foldAz(title)}`,
    title,
    center,
    aliases: [foldAz(title), stripPlaceNoise(title)],
    source: "billing",
    rqii: rqii ?? undefined,
  })
  // Fill district entry if title matches a known id without coords
  for (const d of byId.values()) {
    if (foldAz(d.title) === foldAz(title) && !d.center) d.center = center
  }
}

export function placeLabel(district: DistrictEntry | null, locality: string | null): string {
  if (locality) {
    if (district?.kind === "city_district" && district.parentCity) {
      return `${district.parentCity} · ${district.title} · ${locality}`
    }
    return locality
  }
  if (!district) return "Location unknown"
  if (district.kind === "city_district" && district.parentCity) {
    return `${district.parentCity} · ${district.title}`
  }
  if (district.kind === "city") return district.title
  return `${district.title} rayonu`
}

/** Pull locality name from free-form address (skip leading RQİİ / district tokens). */
export function localityFromAddress(address: string | null | undefined, district: DistrictEntry | null): string | null {
  if (!address) return null
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean)
  const skip = new Set<string>()
  if (district) {
    skip.add(foldAz(district.title))
    if (district.parentCity) skip.add(foldAz(district.parentCity))
  }
  for (const seat of REGION_SEATS) {
    skip.add(foldAz(seat.title))
    for (const a of seat.aliases) skip.add(a)
  }

  for (const part of parts) {
    const folded = foldAz(part)
    if (/rq[iı]{2}|q[iı]{2}|rqsd/i.test(folded)) continue
    if (skip.has(folded) || skip.has(stripPlaceNoise(part))) continue
    if (/^(bina|mənzil|menzil|küç|kuc)\b/i.test(folded)) continue
    if (/^\d+$/.test(folded)) continue
    const cleaned = stripPlaceNoise(part)
    if (cleaned.length < 2) continue
    if (district) {
      const hit = LOCALITIES.find(
        (loc) =>
          loc.districtId === district.id &&
          (loc.aliases.includes(cleaned) || foldAz(loc.canonical) === cleaned || loc.aliases.some((a) => cleaned.includes(a))),
      )
      if (hit) return hit.canonical
    }
    if (/\b(qəs|qes|kənd|kend|şəh|seh)/i.test(part) || cleaned.length >= 3) {
      return part.replace(/\s+/g, " ").trim().replace(/\.$/, "")
    }
  }
  return null
}

export function localityCenter(districtId: number, localityName: string | null): LatLng | null {
  if (!localityName) return null
  const cleaned = stripPlaceNoise(localityName)
  const hit = LOCALITIES.find(
    (loc) =>
      loc.districtId === districtId &&
      (foldAz(loc.canonical) === cleaned || loc.aliases.includes(cleaned) || loc.aliases.some((a) => cleaned.includes(a))),
  )
  return hit?.center ?? lookupCenterByName(localityName)
}

export function registerDistrict(entry: DistrictEntry) {
  byId.set(entry.id, entry)
  const idx = DISTRICTS.findIndex((d) => d.id === entry.id)
  if (idx >= 0) DISTRICTS[idx] = entry
  else DISTRICTS.push(entry)
  if (entry.center) {
    rememberPlace({
      key: `district:${entry.id}`,
      title: entry.title,
      center: entry.center,
      aliases: [],
      source: "district",
    })
  }
}
