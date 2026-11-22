import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from "react"
import { useMapLayerEnabled } from "../wall/mapLayerControl"
import { METERS_OFFLINE } from "../wall/metersOfflineConfig"
import { projectLatLng, type LatLng } from "../wall/geo"
import { foldAz, lookupCenterByName } from "../wall/placesGazetteer"
import type { MapOverlaySpec, OverlayLegendRow, OverlayPoint } from "../wall/mapOverlay"
import { useWallScope } from "../wall/wallScope"
import { MAP_CACHE_MS, mapCachedPostJson } from "./mapApiCache"
import { useLayerPoll } from "./useLayerPoll"

const HUB_QUERY = "/newapi/hub/esyduckdb/db/query"
const POLL_MS = MAP_CACHE_MS

type HubRow = {
  msn?: string | null
  last_rtc?: string | null
  days_offline?: number | string | null
  latitude?: number | string | null
  longitude?: number | string | null
  region?: string | null
  cluster?: string | null
  cluster_lat?: number | string | null
  cluster_lon?: number | string | null
  region_lat?: number | string | null
  region_lon?: number | string | null
  asof?: string | null
}

export type MetersOfflineState = {
  overlay: MapOverlaySpec
  legend: OverlayLegendRow[]
  total: number
  withGps: number
  approx: number
  unlocated: number
  asof: string | null
  updatedAt: number | null
  error: string | null
}

const empty: MetersOfflineState = {
  overlay: null,
  legend: [],
  total: 0,
  withGps: 0,
  approx: 0,
  unlocated: 0,
  asof: null,
  updatedAt: null,
  error: null,
}

function num(v: unknown) {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

/** Stable ~±1.2 km jitter so approx pins at the same center don't stack. */
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
  return {
    lat: center.lat + Math.sin(ang) * rad,
    lon: center.lon + Math.cos(ang) * rad,
  }
}

/** devices.Region → known city/RQİİ seat when centroid missing. */
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
    return {
      coords: jitter(msn || place, { lat: cLat, lon: cLon }),
      approx: true,
      label: place || msn,
    }
  }

  const rLat = num(row.region_lat)
  const rLon = num(row.region_lon)
  if (rLat != null && rLon != null) {
    return {
      coords: jitter(msn || place, { lat: rLat, lon: rLon }),
      approx: true,
      label: place || msn,
    }
  }

  const seat = regionSeat(region)
  if (seat) {
    return {
      coords: jitter(msn || place, seat),
      approx: true,
      label: place || msn,
    }
  }

  return null
}

async function fetchOfflineRows(force = false): Promise<{ rows: HubRow[]; asof: string | null; total: number }> {
  const days = Math.max(1, Math.min(90, Math.round(METERS_OFFLINE.offlineDays)))
  const limit = Math.max(1, Math.min(1000, METERS_OFFLINE.limit))
  const sql = `
WITH asof AS (
  SELECT MAX("RTC") AS t FROM meters_signal.daily
),
offline AS (
  SELECT
    c."MSN" AS msn,
    MAX(c."Retrofit Id") AS retrofit,
    MAX(c."RTC") AS last_rtc
  FROM meters_signal.daily c
  GROUP BY c."MSN"
  HAVING MAX(c."RTC") <= (SELECT t FROM asof) - INTERVAL '${days} days'
),
cluster_avg AS (
  SELECT
    "Region" AS region,
    "Cluster no" AS cluster,
    AVG("Latitude") AS lat,
    AVG("Longitude") AS lon
  FROM meters_signal.devices
  WHERE "Latitude" IS NOT NULL AND "Longitude" IS NOT NULL
  GROUP BY "Region", "Cluster no"
),
region_avg AS (
  SELECT
    "Region" AS region,
    AVG("Latitude") AS lat,
    AVG("Longitude") AS lon
  FROM meters_signal.devices
  WHERE "Latitude" IS NOT NULL AND "Longitude" IS NOT NULL
  GROUP BY "Region"
)
SELECT
  o.msn,
  o.last_rtc,
  EXTRACT(EPOCH FROM ((SELECT t FROM asof) - o.last_rtc)) / 86400.0 AS days_offline,
  d."Latitude" AS latitude,
  d."Longitude" AS longitude,
  d."Region" AS region,
  d."Cluster no" AS cluster,
  ca.lat AS cluster_lat,
  ca.lon AS cluster_lon,
  ra.lat AS region_lat,
  ra.lon AS region_lon,
  (SELECT t FROM asof) AS asof
FROM offline o
INNER JOIN meters_signal.devices d ON d."New Msn" = o.msn
LEFT JOIN cluster_avg ca
  ON ca.region = d."Region"
 AND ca.cluster = d."Cluster no"
LEFT JOIN region_avg ra
  ON ra.region = d."Region"
ORDER BY o.last_rtc ASC
LIMIT ${limit}
`.replace(/\s+/g, " ").trim()

  const body = await mapCachedPostJson<{ rows?: HubRow[] }>(HUB_QUERY, { sql, limit }, { force })
  const rows = Array.isArray(body.rows) ? body.rows : []
  const asof = rows[0]?.asof != null ? String(rows[0].asof) : null

  const countSql = `
WITH asof AS (SELECT MAX("RTC") AS t FROM meters_signal.daily),
offline AS (
  SELECT c."MSN" AS msn
  FROM meters_signal.daily c
  GROUP BY c."MSN"
  HAVING MAX(c."RTC") <= (SELECT t FROM asof) - INTERVAL '${days} days'
)
SELECT COUNT(*)::bigint AS n
FROM offline o
INNER JOIN meters_signal.devices d ON d."New Msn" = o.msn
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

  return { rows, asof, total }
}

function buildState(rows: HubRow[], asof: string | null, total: number): MetersOfflineState {
  const points: OverlayPoint[] = []
  let withGps = 0
  let approx = 0

  for (const row of rows) {
    const msn = typeof row.msn === "string" && row.msn.trim() ? row.msn.trim() : null
    if (!msn) continue
    const resolved = resolveCoords(row)
    if (!resolved) continue
    const mesh = projectLatLng(resolved.coords.lat, resolved.coords.lon)
    if (!mesh) continue
    const days = Math.max(1, Math.round(num(row.days_offline) ?? METERS_OFFLINE.offlineDays))
    if (resolved.approx) approx += 1
    else withGps += 1
    points.push({
      id: msn,
      x: mesh.x,
      z: mesh.z,
      color: METERS_OFFLINE.color,
      count: days,
      approx: resolved.approx,
      label: resolved.label || msn,
      statusId: METERS_OFFLINE.id,
      statusTitle: METERS_OFFLINE.label,
      nos: [msn],
    })
  }

  const legend: OverlayLegendRow[] = [
    {
      id: METERS_OFFLINE.id,
      label: METERS_OFFLINE.label,
      color: METERS_OFFLINE.color,
      count: points.length,
    },
  ]

  return {
    overlay: points.length
      ? {
          kind: "points",
          title: "Meters offline >3 days",
          points,
          legend,
        }
      : null,
    legend,
    total,
    withGps,
    approx,
    unlocated: Math.max(0, total - withGps - approx),
    asof,
    updatedAt: Date.now(),
    error: null,
  }
}

const Ctx = createContext<MetersOfflineState>(empty)

export function MetersOfflineProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MetersOfflineState>(empty)
  const enabled = useMapLayerEnabled("meters-offline")
  const scope = useWallScope()

  useLayerPoll(enabled, scope, POLL_MS, async ({ force }) => {
    try {
      const { rows, asof, total } = await fetchOfflineRows(force)
      setState(buildState(rows, asof, total))
    } catch (err) {
      setState((current) => ({
        ...current,
        error: err instanceof Error ? err.message : "fetch failed",
      }))
    }
  })

  return createElement(Ctx.Provider, { value: state }, children)
}

export function useMetersOffline(): MetersOfflineState {
  return useContext(Ctx)
}

export function useMetersOfflineOverlay(enabled: boolean): MapOverlaySpec {
  const state = useMetersOffline()
  return useMemo(() => (enabled ? state.overlay : null), [enabled, state.overlay])
}
