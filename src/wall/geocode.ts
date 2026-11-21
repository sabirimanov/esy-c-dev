import type { LatLng } from "./geo"
import { foldAz } from "./placesGazetteer"

const memory = new Map<string, LatLng | null>()
const inflight = new Map<string, Promise<LatLng | null>>()

function cacheKey(query: string) {
  return foldAz(query)
}

/**
 * Resolve city/rayon coordinates via Open-Meteo geocoding (no API key).
 * Restricted to Azerbaijan. Results cached in-memory for the session.
 */
export async function geocodePlace(name: string | null | undefined): Promise<LatLng | null> {
  if (!name) return null
  const cleaned = name
    .replace(/\b(RQİİ|RQSD|Qİİ|rayonu|rayon|District|City|şəhəri|kəndi|qəsəbəsi)\b/gi, " ")
    .replace(/[.,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
  if (cleaned.length < 2) return null
  const key = cacheKey(cleaned)
  if (memory.has(key)) return memory.get(key) ?? null
  const pending = inflight.get(key)
  if (pending) return pending

  const promise = (async () => {
    try {
      const url = new URL("https://geocoding-api.open-meteo.com/v1/search")
      url.searchParams.set("name", cleaned)
      url.searchParams.set("count", "5")
      url.searchParams.set("language", "az")
      url.searchParams.set("format", "json")
      url.searchParams.set("countryCode", "AZ")
      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.json()) as {
        results?: { name?: string; latitude?: number; longitude?: number; country_code?: string }[]
      }
      const hit = (body.results ?? []).find(
        (row) =>
          row.country_code === "AZ" &&
          Number.isFinite(row.latitude) &&
          Number.isFinite(row.longitude) &&
          row.latitude !== 0 &&
          row.longitude !== 0,
      )
      const coords = hit ? { lat: Number(hit.latitude), lon: Number(hit.longitude) } : null
      memory.set(key, coords)
      return coords
    } catch {
      memory.set(key, null)
      return null
    } finally {
      inflight.delete(key)
    }
  })()
  inflight.set(key, promise)
  return promise
}

/** Geocode several unique names with a small concurrency limit. */
export async function geocodePlaces(names: string[]): Promise<Map<string, LatLng>> {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))]
  const out = new Map<string, LatLng>()
  const queue = [...unique]
  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const name = queue.shift()
      if (!name) break
      const coords = await geocodePlace(name)
      if (coords) out.set(foldAz(name), coords)
    }
  })
  await Promise.all(workers)
  return out
}

export function cachedGeocode(name: string): LatLng | null | undefined {
  const key = cacheKey(name)
  if (!memory.has(key)) return undefined
  return memory.get(key) ?? null
}
