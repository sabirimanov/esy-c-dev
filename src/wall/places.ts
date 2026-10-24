// Exc region codes. Only 11, 9 and 8 select a map region and open a city list.
// Map coordinates are the city lat/lon dropped onto the Azerbaijan mesh
// (simplemaps: Baku 40.3667, 49.8352; Sumqayıt 40.5961, 49.6700;
// Ağsu 40.5703, 48.4009; Kürdəmir 40.3383, 48.1608; Ucar 40.5183, 47.6542;
// İsmayıllı 40.7847, 48.1514; Göyçay 40.6553, 47.7389).

export const EXC_REGIONS = [
  { value: "1", label: "Salyan RQİİ" },
  { value: "2", label: "Gəncə RQİİ" },
  { value: "3", label: "Tərtər RQİİ" },
  { value: "4", label: "Şəmkir RQİİ" },
  { value: "6", label: "Zaqatala RQİİ" },
  { value: "7", label: "Xaçmaz RQİİ" },
  { value: "8", label: "Sumqayıt RQİİ" },
  { value: "9", label: "Ağsu RQİİ" },
  { value: "11", label: "Bakı RQSD" },
  { value: "12", label: "Lənkəran RQİİ" },
] as const

const active = new Set(["11", "9", "8"])

const mapIds: Record<string, string> = {
  "11": "baku",
  "9": "daghlig-shirvan",
  "8": "absheron-khizi",
}

const legacy: Record<string, string> = {
  baku: "11",
  "absheron-khizi": "8",
  "daghlig-shirvan": "9",
}

export type City = {
  id: string
  label: string
  mapLabel: string
  x: number
  z: number
}

const cities: Record<string, City[]> = {
  "11": [{ id: "baku", label: "Baku", mapLabel: "BAKU", x: 1.364, z: -0.072 }],
  "8": [{ id: "sumgayit", label: "Sumgayit", mapLabel: "SUMGAYIT", x: 1.255, z: -0.24 }],
  "9": [
    { id: "agsu", label: "Agsu", mapLabel: "AGSU", x: 0.46, z: -0.246 },
    { id: "kurdamir", label: "Kurdamir", mapLabel: "KURDAMIR", x: 0.313, z: -0.072 },
    { id: "ujar", label: "Ujar", mapLabel: "UJAR", x: -0.006, z: -0.208 },
    { id: "ismayilli", label: "Ismayilli", mapLabel: "ISMAYILLI", x: 0.302, z: -0.402 },
    { id: "goychay", label: "Goychay", mapLabel: "GOYCHAY", x: 0.049, z: -0.298 },
  ],
}

export function regionEnabled(id: string) {
  return active.has(id)
}

export function mapRegionId(id: string | null) {
  return id ? mapIds[id] ?? null : null
}

export function citiesOf(regionId: string | null) {
  return regionId ? cities[regionId] ?? [] : []
}

export function cityById(id: string | null) {
  if (!id) return null
  for (const list of Object.values(cities)) {
    const found = list.find((city) => city.id === id)
    if (found) return found
  }
  return null
}

export function regionLabel(id: string | null) {
  if (!id) return "All regions"
  return EXC_REGIONS.find((item) => item.value === id)?.label ?? "All regions"
}

export function normalizeRegion(id: string | null | undefined) {
  if (!id) return null
  if (legacy[id]) return legacy[id]
  return EXC_REGIONS.some((item) => item.value === id) ? id : null
}

export function normalizeCity(regionId: string | null, cityId: string | null | undefined) {
  if (!cityId) return null
  return citiesOf(regionId).some((city) => city.id === cityId) ? cityId : null
}
