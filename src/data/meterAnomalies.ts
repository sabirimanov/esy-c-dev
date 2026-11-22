import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from "react"
import { bandForAnomalyId, METER_ANOMALIES, perSourceLimit } from "../wall/meterAnomaliesConfig"
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
  kind?: string | null
  occurrence?: number | string | null
  region?: string | null
  consumer_name?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  device_region?: string | null
  cluster?: string | null
  cluster_lat?: number | string | null
  cluster_lon?: number | string | null
  region_lat?: number | string | null
  region_lon?: number | string | null
}

export type MeterAnomaliesState = {
  overlay: MapOverlaySpec
  legend: OverlayLegendRow[]
  total: number
  withGps: number
  approx: number
  unlocated: number
  updatedAt: number | null
  error: string | null
}

const empty: MeterAnomaliesState = {
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

function sqlEscape(value: string) {
  return value.replace(/'/g, "''")
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
  if (folded.includes("baku") || folded.includes("bakı") || folded.includes("bakı rq") || folded === "baki") {
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
  const region =
    (typeof row.device_region === "string" && row.device_region.trim() ? row.device_region.trim() : null) ||
    (typeof row.region === "string" && row.region.trim() ? row.region.trim() : null)
  const cluster = typeof row.cluster === "string" && row.cluster.trim() ? row.cluster.trim() : null
  const name =
    typeof row.consumer_name === "string" && row.consumer_name.trim() ? row.consumer_name.trim() : msn
  const place = [region, cluster && cluster.toLowerCase() !== "yox" ? `cluster ${cluster}` : null]
    .filter(Boolean)
    .join(" · ")

  const gpsLat = num(row.latitude)
  const gpsLon = num(row.longitude)
  if (gpsLat != null && gpsLon != null) {
    return { coords: { lat: gpsLat, lon: gpsLon }, approx: false, label: place || name }
  }

  const cLat = num(row.cluster_lat)
  const cLon = num(row.cluster_lon)
  if (cLat != null && cLon != null && cluster && cluster.toLowerCase() !== "yox") {
    return { coords: jitter(msn || place, { lat: cLat, lon: cLon }), approx: true, label: place || name }
  }

  const rLat = num(row.region_lat)
  const rLon = num(row.region_lon)
  if (rLat != null && rLon != null) {
    return { coords: jitter(msn || place, { lat: rLat, lon: rLon }), approx: true, label: place || name }
  }

  const seat = regionSeat(region)
  if (seat) return { coords: jitter(msn || place, seat), approx: true, label: place || name }
  return null
}

async function fetchAnomalyRows(force = false): Promise<{ rows: HubRow[]; total: number }> {
  const per = perSourceLimit()
  const limit = Math.min(1000, per * METER_ANOMALIES.bands.length)
  const ymPin = METER_ANOMALIES.ym ? `'${sqlEscape(METER_ANOMALIES.ym)}'` : null
  const ymExpr = ymPin
    ? ymPin
    : `GREATEST(
        (SELECT MAX(ym) FROM anomalies.abnormal_high),
        (SELECT MAX(ym) FROM anomalies.abnormal_low),
        (SELECT MAX(ym) FROM anomalies.overflow),
        (SELECT MAX(ym) FROM anomalies.zero_consumption)
      )`

  const slices = METER_ANOMALIES.bands
    .map(
      (b) => `(
  SELECT msn, '${b.id}' AS kind, occurrence, region, consumer_name
  FROM anomalies.${b.table}
  WHERE ym = (SELECT ym FROM bound)
  ORDER BY occurrence DESC, msn
  LIMIT ${per}
)`,
    )
    .join(" UNION ALL ")

  const sql = `
WITH bound AS (SELECT ${ymExpr} AS ym),
src AS (
  ${slices}
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
  s.msn,
  s.kind,
  s.occurrence,
  s.region,
  s.consumer_name,
  d."Latitude" AS latitude,
  d."Longitude" AS longitude,
  d."Region" AS device_region,
  d."Cluster no" AS cluster,
  ca.lat AS cluster_lat,
  ca.lon AS cluster_lon,
  ra.lat AS region_lat,
  ra.lon AS region_lon
FROM src s
LEFT JOIN meters_signal.devices d ON d."New Msn" = s.msn
LEFT JOIN cluster_avg ca
  ON ca.region = d."Region" AND ca.cluster = d."Cluster no"
LEFT JOIN region_avg ra ON ra.region = d."Region"
ORDER BY s.occurrence DESC, s.msn
LIMIT ${limit}
`.replace(/\s+/g, " ").trim()

  const body = await mapCachedPostJson<{ rows?: HubRow[] }>(HUB_QUERY, { sql, limit }, { force })
  const rows = Array.isArray(body.rows) ? body.rows : []

  const countSql = `
WITH bound AS (SELECT ${ymExpr} AS ym)
SELECT (
  (SELECT COUNT(*)::bigint FROM anomalies.abnormal_high WHERE ym = (SELECT ym FROM bound)) +
  (SELECT COUNT(*)::bigint FROM anomalies.abnormal_low WHERE ym = (SELECT ym FROM bound)) +
  (SELECT COUNT(*)::bigint FROM anomalies.overflow WHERE ym = (SELECT ym FROM bound)) +
  (SELECT COUNT(*)::bigint FROM anomalies.zero_consumption WHERE ym = (SELECT ym FROM bound))
) AS n
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

function buildState(rows: HubRow[], total: number): MeterAnomaliesState {
  const points: OverlayPoint[] = []
  const bandCounts = new Map(METER_ANOMALIES.bands.map((b) => [b.id, 0]))
  let withGps = 0
  let approx = 0

  for (const row of rows) {
    const msn = typeof row.msn === "string" && row.msn.trim() ? row.msn.trim() : null
    if (!msn) continue
    const kind = typeof row.kind === "string" ? row.kind : ""
    const band = bandForAnomalyId(kind)
    const resolved = resolveCoords(row)
    if (!resolved) continue
    const mesh = projectLatLng(resolved.coords.lat, resolved.coords.lon)
    if (!mesh) continue
    const occurrence = Math.max(1, Math.round(num(row.occurrence) ?? 1))
    bandCounts.set(band.id, (bandCounts.get(band.id) ?? 0) + 1)
    if (resolved.approx) approx += 1
    else withGps += 1
    points.push({
      id: `${band.id}:${msn}`,
      x: mesh.x,
      z: mesh.z,
      color: band.color,
      count: occurrence,
      approx: resolved.approx,
      label: resolved.label || msn,
      statusId: band.id,
      statusTitle: band.label,
      nos: [msn],
    })
  }

  const legend: OverlayLegendRow[] = METER_ANOMALIES.bands.map((band) => ({
    id: band.id,
    label: band.label,
    color: band.color,
    count: bandCounts.get(band.id) ?? 0,
  }))

  return {
    overlay: points.length
      ? {
          kind: "points",
          title: "Meter anomalies",
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

const Ctx = createContext<MeterAnomaliesState>(empty)

export function MeterAnomaliesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MeterAnomaliesState>(empty)
  const enabled = useMapLayerEnabled("meter-anomalies")
  const scope = useWallScope()

  useLayerPoll(enabled, scope, POLL_MS, async ({ force }) => {
    try {
      const { rows, total } = await fetchAnomalyRows(force)
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

export function useMeterAnomalies(): MeterAnomaliesState {
  return useContext(Ctx)
}

export function useMeterAnomaliesOverlay(enabled: boolean): MapOverlaySpec {
  const state = useMeterAnomalies()
  return useMemo(() => (enabled ? state.overlay : null), [enabled, state.overlay])
}
