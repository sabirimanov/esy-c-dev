import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from "react"
import { bandForEventName, TAMPERING_EVENTS } from "../wall/tamperingEventsConfig"
import { projectLatLng, type LatLng } from "../wall/geo"
import { useMapLayerEnabled } from "../wall/mapLayerControl"
import { foldAz, lookupCenterByName } from "../wall/placesGazetteer"
import type { MapOverlaySpec, OverlayLegendRow, OverlayPoint } from "../wall/mapOverlay"
import { useWallScope } from "../wall/wallScope"
import { MAP_CACHE_MS, mapCachedPostJson } from "./mapApiCache"
import { useLayerPoll } from "./useLayerPoll"

const HUB_QUERY = "/newapi/hub/esyduckdb/db/query"
const POLL_MS = MAP_CACHE_MS

type HubRow = {
  msn?: string | null
  events?: number | string | null
  last_event?: string | null
  last_rtc?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  region?: string | null
  cluster?: string | null
  cluster_lat?: number | string | null
  cluster_lon?: number | string | null
  region_lat?: number | string | null
  region_lon?: number | string | null
}

export type TamperingEventsState = {
  overlay: MapOverlaySpec
  legend: OverlayLegendRow[]
  total: number
  withGps: number
  approx: number
  unlocated: number
  updatedAt: number | null
  error: string | null
}

const empty: TamperingEventsState = {
  overlay: null,
  legend: [],
  total: 0,
  withGps: 0,
  approx: 0,
  unlocated: 0,
  updatedAt: null,
  error: null,
}

function num(v: unknown) {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function jitter(seed: string, center: LatLng): LatLng {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const u = ((h >>> 0) % 1000) / 1000
  const v = (((h >>> 10) % 1000) / 1000)
  const ang = u * Math.PI * 2
  const rad = 0.004 + v * 0.01
  return { lat: center.lat + Math.sin(ang) * rad, lon: center.lon + Math.cos(ang) * rad }
}

function regionSeat(region: string | null | undefined): LatLng | null {
  if (!region) return null
  const folded = foldAz(region)
  if (folded.includes("sumgayit") || folded.includes("sumqayit")) {
    return lookupCenterByName("Sumqayıt") ?? { lat: 40.5961, lon: 49.67 }
  }
  if (folded.includes("baku") || folded.includes("bakı") || folded === "baki") {
    return lookupCenterByName("Bakı") ?? { lat: 40.4093, lon: 49.8671 }
  }
  if (folded.includes("agsu") || folded.includes("ağsu")) {
    return lookupCenterByName("Ağsu") ?? { lat: 40.5703, lon: 48.4009 }
  }
  const slash = region.split("/")[0]?.trim()
  return lookupCenterByName(region) ?? lookupCenterByName(slash)
}

function resolveCoords(row: HubRow): { coords: LatLng; approx: boolean; label: string } | null {
  const msn = typeof row.msn === "string" ? row.msn.trim() : ""
  const region = typeof row.region === "string" && row.region.trim() ? row.region.trim() : null
  const cluster = typeof row.cluster === "string" && row.cluster.trim() ? row.cluster.trim() : null
  const place = [region, cluster && cluster.toLowerCase() !== "yox" ? `cluster ${cluster}` : null]
    .filter(Boolean)
    .join(" · ")

  const gpsLat = num(row.latitude)
  const gpsLon = num(row.longitude)
  if (gpsLat != null && gpsLon != null) {
    return { coords: { lat: gpsLat, lon: gpsLon }, approx: false, label: place || msn }
  }

  const cLat = num(row.cluster_lat)
  const cLon = num(row.cluster_lon)
  if (cLat != null && cLon != null && cluster && cluster.toLowerCase() !== "yox") {
    return { coords: jitter(msn || place, { lat: cLat, lon: cLon }), approx: true, label: place || msn }
  }

  const rLat = num(row.region_lat)
  const rLon = num(row.region_lon)
  if (rLat != null && rLon != null) {
    return { coords: jitter(msn || place, { lat: rLat, lon: rLon }), approx: true, label: place || msn }
  }

  const seat = regionSeat(region)
  if (seat) return { coords: jitter(msn || place, seat), approx: true, label: place || msn }
  return null
}

async function fetchTamperRows(force = false): Promise<{ rows: HubRow[]; total: number }> {
  const limit = Math.max(1, Math.min(1000, TAMPERING_EVENTS.limit))
  const sql = `
WITH per AS (
  SELECT
    "MSN" AS msn,
    MAX("Retrofit Id") AS retrofit,
    COUNT(*)::int AS events,
    MAX("RTC") AS last_rtc,
    (ARRAY_AGG("Event Name" ORDER BY "RTC" DESC))[1] AS last_event
  FROM tampering_events."Combined Events"
  GROUP BY "MSN"
),
cluster_avg AS (
  SELECT "Region" AS region, "Cluster no" AS cluster,
    AVG("Latitude") AS lat, AVG("Longitude") AS lon
  FROM meters_signal.devices
  WHERE "Latitude" IS NOT NULL AND "Longitude" IS NOT NULL
  GROUP BY "Region", "Cluster no"
),
region_avg AS (
  SELECT "Region" AS region, AVG("Latitude") AS lat, AVG("Longitude") AS lon
  FROM meters_signal.devices
  WHERE "Latitude" IS NOT NULL AND "Longitude" IS NOT NULL
  GROUP BY "Region"
)
SELECT
  p.msn,
  p.events,
  p.last_event,
  p.last_rtc,
  COALESCE(d1."Latitude", d2."Latitude") AS latitude,
  COALESCE(d1."Longitude", d2."Longitude") AS longitude,
  COALESCE(d1."Region", d2."Region") AS region,
  COALESCE(d1."Cluster no", d2."Cluster no") AS cluster,
  ca.lat AS cluster_lat,
  ca.lon AS cluster_lon,
  ra.lat AS region_lat,
  ra.lon AS region_lon
FROM per p
LEFT JOIN meters_signal.devices d1 ON d1."New Msn" = p.msn
LEFT JOIN meters_signal.devices d2 ON d2."Retrofit id" = p.retrofit
LEFT JOIN cluster_avg ca
  ON ca.region = COALESCE(d1."Region", d2."Region")
 AND ca.cluster = COALESCE(d1."Cluster no", d2."Cluster no")
LEFT JOIN region_avg ra
  ON ra.region = COALESCE(d1."Region", d2."Region")
ORDER BY p.events DESC, p.last_rtc DESC
LIMIT ${limit}
`.replace(/\s+/g, " ").trim()

  const body = await mapCachedPostJson<{ rows?: HubRow[] }>(HUB_QUERY, { sql, limit }, { force })
  const rows = Array.isArray(body.rows) ? body.rows : []

  const countSql = `
SELECT COUNT(DISTINCT "MSN")::bigint AS n
FROM tampering_events."Combined Events"
`.replace(/\s+/g, " ").trim()
  let total = rows.length
  try {
    const countBody = await mapCachedPostJson<{ rows?: { n?: number | string }[] }>(HUB_QUERY, {
      sql: countSql,
      limit: 1,
    }, { force })
    const n = num(countBody.rows?.[0]?.n)
    if (n != null) total = n
  } catch {
    /* keep rows.length */
  }

  return { rows, total }
}

function buildState(rows: HubRow[], total: number): TamperingEventsState {
  const points: OverlayPoint[] = []
  const bandCounts = new Map(TAMPERING_EVENTS.bands.map((b) => [b.id, 0]))
  let withGps = 0
  let approx = 0

  for (const row of rows) {
    const msn = typeof row.msn === "string" && row.msn.trim() ? row.msn.trim() : null
    if (!msn) continue
    const resolved = resolveCoords(row)
    if (!resolved) continue
    const mesh = projectLatLng(resolved.coords.lat, resolved.coords.lon)
    if (!mesh) continue
    const band = bandForEventName(typeof row.last_event === "string" ? row.last_event : null)
    const events = Math.max(1, Math.round(num(row.events) ?? 1))
    bandCounts.set(band.id, (bandCounts.get(band.id) ?? 0) + 1)
    if (resolved.approx) approx += 1
    else withGps += 1
    points.push({
      id: msn,
      x: mesh.x,
      z: mesh.z,
      color: band.color,
      count: events,
      approx: resolved.approx,
      label: resolved.label || msn,
      statusId: band.id,
      statusTitle: band.label,
      nos: [msn],
    })
  }

  const legend: OverlayLegendRow[] = TAMPERING_EVENTS.bands.map((band) => ({
    id: band.id,
    label: band.label,
    color: band.color,
    count: bandCounts.get(band.id) ?? 0,
  }))

  return {
    overlay: points.length
      ? {
          kind: "points",
          title: "Meter tampering events",
          points,
          legend,
        }
      : null,
    legend,
    total,
    withGps,
    approx,
    unlocated: Math.max(0, total - withGps - approx),
    updatedAt: Date.now(),
    error: null,
  }
}

const Ctx = createContext<TamperingEventsState>(empty)

export function TamperingEventsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TamperingEventsState>(empty)
  const enabled = useMapLayerEnabled("meter-alarms")
  const scope = useWallScope()

  useLayerPoll(enabled, scope, POLL_MS, async ({ force }) => {
    try {
      const { rows, total } = await fetchTamperRows(force)
      setState(buildState(rows, total))
    } catch (err) {
      setState((current) => ({
        ...current,
        error: err instanceof Error ? err.message : "fetch failed",
      }))
    }
  })

  return createElement(Ctx.Provider, { value: state }, children)
}

export function useTamperingEvents(): TamperingEventsState {
  return useContext(Ctx)
}

export function useTamperingEventsOverlay(enabled: boolean): MapOverlaySpec {
  const state = useTamperingEvents()
  return useMemo(() => (enabled ? state.overlay : null), [enabled, state.overlay])
}
