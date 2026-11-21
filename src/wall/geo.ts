// Lat/lng ↔ Azerbaijan mesh x/z. Control points from places.ts / simplemaps.

export type LatLng = { lat: number; lon: number }

const CONTROLS: { lat: number; lon: number; x: number; z: number }[] = [
  { lat: 40.3667, lon: 49.8352, x: 1.364, z: -0.072 }, // Baku
  { lat: 40.5961, lon: 49.67, x: 1.255, z: -0.24 }, // Sumgayit
  { lat: 40.5703, lon: 48.4009, x: 0.46, z: -0.246 }, // Agsu
  { lat: 40.3383, lon: 48.1608, x: 0.313, z: -0.072 }, // Kurdamir
  { lat: 40.5183, lon: 47.6542, x: -0.006, z: -0.208 }, // Ujar
  { lat: 40.7847, lon: 48.1514, x: 0.302, z: -0.402 }, // Ismayilli
]

// x = ax*lon + bx*lat + cx ; z = az*lon + bz*lat + cz
const fit = (() => {
  const n = CONTROLS.length
  let sL = 0
  let sA = 0
  let sLL = 0
  let sAA = 0
  let sLA = 0
  let sX = 0
  let sZ = 0
  let sLX = 0
  let sAX = 0
  let sLZ = 0
  let sAZ = 0
  for (const p of CONTROLS) {
    sL += p.lon
    sA += p.lat
    sLL += p.lon * p.lon
    sAA += p.lat * p.lat
    sLA += p.lon * p.lat
    sX += p.x
    sZ += p.z
    sLX += p.lon * p.x
    sAX += p.lat * p.x
    sLZ += p.lon * p.z
    sAZ += p.lat * p.z
  }
  function solve(sY: number, sLY: number, sAY: number) {
    // [[n,sL,sA],[sL,sLL,sLA],[sA,sLA,sAA]] * [c,a,b] = [sY,sLY,sAY]
    const m = [
      [n, sL, sA],
      [sL, sLL, sLA],
      [sA, sLA, sAA],
    ]
    const r = [sY, sLY, sAY]
    for (let i = 0; i < 3; i++) {
      let piv = i
      for (let k = i + 1; k < 3; k++) if (Math.abs(m[k][i]) > Math.abs(m[piv][i])) piv = k
      ;[m[i], m[piv]] = [m[piv], m[i]]
      ;[r[i], r[piv]] = [r[piv], r[i]]
      const div = m[i][i] || 1e-12
      for (let j = i; j < 3; j++) m[i][j] /= div
      r[i] /= div
      for (let k = 0; k < 3; k++) {
        if (k === i) continue
        const f = m[k][i]
        for (let j = i; j < 3; j++) m[k][j] -= f * m[i][j]
        r[k] -= f * r[i]
      }
    }
    return { c: r[0], a: r[1], b: r[2] }
  }
  const x = solve(sX, sLX, sAX)
  const z = solve(sZ, sLZ, sAZ)
  return { x, z }
})()

export function projectLatLng(lat: number, lon: number): { x: number; z: number } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < 38.2 || lat > 42.2 || lon < 44.5 || lon > 51.2) return null
  return {
    x: fit.x.a * lon + fit.x.b * lat + fit.x.c,
    z: fit.z.a * lon + fit.z.b * lat + fit.z.c,
  }
}

/** Normalize API coordinate variants → numeric lat/lon or null. */
export function parseCoordinate(raw: unknown): LatLng | null {
  if (raw == null) return null
  let lat: number | null = null
  let lon: number | null = null
  if (typeof raw === "string") {
    const parts = raw.split(",").map((part) => part.trim())
    if (parts.length !== 2) return null
    lat = Number(parts[0])
    lon = Number(parts[1])
  } else if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    const latRaw = obj.lat ?? obj.latitude ?? obj.Latitude
    const lonRaw = obj.lon ?? obj.lng ?? obj.longitude ?? obj.Longitude
    if (latRaw == null || lonRaw == null) return null
    if (typeof latRaw === "string" && !latRaw.trim()) return null
    if (typeof lonRaw === "string" && !lonRaw.trim()) return null
    lat = Number(latRaw)
    lon = Number(lonRaw)
  } else {
    return null
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat === 0 && lon === 0) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return { lat, lon }
}
