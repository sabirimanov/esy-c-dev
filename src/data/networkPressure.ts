import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from "react"
import { bandForPressureAlarm, NETWORK_PRESSURE } from "../wall/networkPressureConfig"
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
  device_id?: string | null
  alarm_kind?: string | null
  severity?: number | string | null
  event_time?: string | null
  reading_value?: number | string | null
  avg7?: number | string | null
  direction?: string | null
  zero_hours?: number | string | null
  pct_delta?: number | string | null
  latitude?: number | string | null
  longitude?: number | string | null
  region?: string | null
  cluster?: string | null
}

export type NetworkPressureState = {
  overlay: MapOverlaySpec
  legend: OverlayLegendRow[]
  total: number
  withGps: number
  approx: number
  unlocated: number
  updatedAt: number | null
  error: string | null
}

const empty: NetworkPressureState = {
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
  if (folded.includes("sumgayit") || folded.includes("sumgait") || folded.includes("sumqayit")) {
    return lookupCenterByName("Sumqayıt") ?? { lat: 40.5961, lon: 49.67 }
  }
  if (folded.includes("baku") || folded.includes("bakı") || folded === "baki") {
    return lookupCenterByName("Bakı") ?? { lat: 40.4093, lon: 49.8671 }
  }
  if (folded.includes("agsu") || folded.includes("ağsu")) {
    return lookupCenterByName("Ağsu") ?? { lat: 40.5703, lon: 48.4009 }
  }
  return lookupCenterByName(region)
}

function resolveCoords(row: HubRow): { coords: LatLng; approx: boolean; label: string } | null {
  const deviceId = typeof row.device_id === "string" ? row.device_id.trim() : ""
  const region = typeof row.region === "string" && row.region.trim() ? row.region.trim() : null
  const cluster = typeof row.cluster === "string" && row.cluster.trim() ? row.cluster.trim() : null
  const place = [region, cluster].filter(Boolean).join(" · ")

  const gpsLat = num(row.latitude)
  const gpsLon = num(row.longitude)
  if (gpsLat != null && gpsLon != null) {
    return { coords: { lat: gpsLat, lon: gpsLon }, approx: false, label: place || deviceId }
  }

  const seat = regionSeat(region)
  if (seat) return { coords: jitter(deviceId || place, seat), approx: true, label: place || deviceId }
  return null
}

async function fetchPressureAlarmRows(force = false): Promise<{ rows: HubRow[]; total: number }> {
  const limit = Math.max(1, Math.min(1000, NETWORK_PRESSURE.limit))
  const lookback = Math.max(1, NETWORK_PRESSURE.lookbackDays)
  const swingPct = NETWORK_PRESSURE.swingPct
  const minAvg = NETWORK_PRESSURE.minAvgAbs
  const zeroHours = NETWORK_PRESSURE.zeroHours

  const sql = `
WITH pressure AS (
  SELECT device_id, reading_time, reading_value
  FROM sensor_data.sensor_readings
  WHERE reading_type = 'Pressure'
    AND reading_time >= (
      SELECT MAX(reading_time) - INTERVAL '${lookback} days'
      FROM sensor_data.sensor_readings
      WHERE reading_type = 'Pressure'
    )
),
latest AS (
  SELECT DISTINCT ON (device_id)
    device_id,
    reading_time,
    reading_value,
    EXTRACT(HOUR FROM reading_time)::int AS hr
  FROM pressure
  ORDER BY device_id, reading_time DESC
),
hist AS (
  SELECT
    p.device_id,
    EXTRACT(HOUR FROM p.reading_time)::int AS hr,
    AVG(p.reading_value) AS avg7
  FROM pressure p
  JOIN latest l ON l.device_id = p.device_id
  WHERE p.reading_time >= l.reading_time - INTERVAL '7 days'
    AND p.reading_time < l.reading_time
    AND EXTRACT(HOUR FROM p.reading_time)::int = l.hr
  GROUP BY p.device_id, EXTRACT(HOUR FROM p.reading_time)::int
),
swing AS (
  SELECT
    l.device_id,
    l.reading_value,
    l.reading_time,
    h.avg7,
    ABS(l.reading_value - h.avg7) / NULLIF(ABS(h.avg7), 0) AS pct_delta,
    CASE WHEN l.reading_value > h.avg7 THEN 'up' ELSE 'down' END AS direction
  FROM latest l
  JOIN hist h ON h.device_id = l.device_id AND h.hr = l.hr
  WHERE ABS(h.avg7) > ${minAvg}
    AND ABS(l.reading_value - h.avg7) / ABS(h.avg7) >= ${swingPct}
),
pflag AS (
  SELECT
    device_id,
    reading_time,
    CASE WHEN reading_value = 0 THEN 1 ELSE 0 END AS is_zero
  FROM pressure
),
ordered AS (
  SELECT
    device_id,
    reading_time,
    is_zero,
    SUM(CASE WHEN is_zero = 0 THEN 1 ELSE 0 END)
      OVER (PARTITION BY device_id ORDER BY reading_time) AS grp
  FROM pflag
),
zero_runs AS (
  SELECT
    device_id,
    MIN(reading_time) AS start_t,
    MAX(reading_time) AS end_t,
    EXTRACT(EPOCH FROM (MAX(reading_time) - MIN(reading_time))) / 3600.0 AS hours
  FROM ordered
  WHERE is_zero = 1
  GROUP BY device_id, grp
  HAVING MAX(reading_time) - MIN(reading_time) >= INTERVAL '${zeroHours} hours'
),
zero_best AS (
  SELECT DISTINCT ON (device_id)
    device_id, start_t, end_t, hours
  FROM zero_runs
  ORDER BY device_id, end_t DESC
),
alarms AS (
  SELECT
    z.device_id,
    'zero_8h'::text AS alarm_kind,
    z.hours AS severity,
    z.end_t AS event_time,
    NULL::float AS reading_value,
    NULL::float AS avg7,
    NULL::text AS direction,
    z.hours AS zero_hours,
    NULL::float AS pct_delta
  FROM zero_best z
  UNION ALL
  SELECT
    s.device_id,
    'swing_50'::text,
    s.pct_delta,
    s.reading_time,
    s.reading_value,
    s.avg7,
    s.direction,
    NULL::float,
    s.pct_delta
  FROM swing s
  WHERE NOT EXISTS (SELECT 1 FROM zero_best z WHERE z.device_id = s.device_id)
)
SELECT
  a.device_id,
  a.alarm_kind,
  a.severity,
  a.event_time,
  a.reading_value,
  a.avg7,
  a.direction,
  a.zero_hours,
  a.pct_delta,
  m.latitude,
  m.longitude,
  m.region,
  m.cluster
FROM alarms a
LEFT JOIN sensor_data.sensor_master m ON m.device_id = a.device_id
ORDER BY
  CASE WHEN a.alarm_kind = 'zero_8h' THEN 0 ELSE 1 END,
  a.severity DESC NULLS LAST
LIMIT ${limit}
`.replace(/\s+/g, " ").trim()

  const body = await mapCachedPostJson<{ rows?: HubRow[] }>(HUB_QUERY, { sql, limit }, { force })
  const rows = Array.isArray(body.rows) ? body.rows : []
  return { rows, total: rows.length }
}

function buildState(rows: HubRow[], total: number): NetworkPressureState {
  const points: OverlayPoint[] = []
  const bandCounts = new Map(NETWORK_PRESSURE.bands.map((b) => [b.id, 0]))
  let withGps = 0
  let approx = 0

  for (const row of rows) {
    const deviceId = typeof row.device_id === "string" && row.device_id.trim() ? row.device_id.trim() : null
    if (!deviceId) continue
    const kind = typeof row.alarm_kind === "string" ? row.alarm_kind : "swing_50"
    const band = bandForPressureAlarm(kind)
    const resolved = resolveCoords(row)
    if (!resolved) continue
    const mesh = projectLatLng(resolved.coords.lat, resolved.coords.lon)
    if (!mesh) continue

    const pct = num(row.pct_delta)
    const hours = num(row.zero_hours)
    const value = num(row.reading_value)
    const avg7 = num(row.avg7)
    const dir = typeof row.direction === "string" ? row.direction : null
    let label = resolved.label || deviceId
    if (kind === "zero_8h" && hours != null) {
      label = `${label} · ${hours.toFixed(1)}h zero`
    } else if (pct != null) {
      const arrow = dir === "down" ? "↓" : "↑"
      const cur = value != null ? `${value}` : "?"
      const base = avg7 != null ? `${avg7.toFixed(1)}` : "?"
      label = `${label} · ${arrow}${(pct * 100).toFixed(0)}% (${cur} vs ${base})`
    }

    bandCounts.set(band.id, (bandCounts.get(band.id) ?? 0) + 1)
    if (resolved.approx) approx += 1
    else withGps += 1

    const count =
      kind === "zero_8h"
        ? Math.max(1, Math.round(hours ?? 1))
        : Math.max(1, Math.round((pct ?? 0.5) * 10))

    points.push({
      id: deviceId,
      x: mesh.x,
      z: mesh.z,
      color: band.color,
      count,
      approx: resolved.approx,
      label,
      statusId: band.id,
      statusTitle: band.label,
      nos: [deviceId],
    })
  }

  const legend: OverlayLegendRow[] = NETWORK_PRESSURE.bands.map((band) => ({
    id: band.id,
    label: band.label,
    color: band.color,
    count: bandCounts.get(band.id) ?? 0,
  }))

  return {
    overlay: points.length
      ? {
          kind: "points",
          title: "Network pressure",
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

const Ctx = createContext<NetworkPressureState>(empty)

export function NetworkPressureProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NetworkPressureState>(empty)
  const enabled = useMapLayerEnabled("network-pressure")
  const scope = useWallScope()

  useLayerPoll(enabled, scope, POLL_MS, async ({ force }) => {
    try {
      const { rows, total } = await fetchPressureAlarmRows(force)
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

export function useNetworkPressure(): NetworkPressureState {
  return useContext(Ctx)
}

export function useNetworkPressureOverlay(enabled: boolean): MapOverlaySpec {
  const state = useNetworkPressure()
  return useMemo(() => (enabled ? state.overlay : null), [enabled, state.overlay])
}
