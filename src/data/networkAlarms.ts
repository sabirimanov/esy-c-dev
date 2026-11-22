import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from "react"
import { bandForNetworkAlarm, NETWORK_ALARMS } from "../wall/networkAlarmsConfig"
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
  events?: number | string | null
  last_event?: string | null
  last_rt?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  region?: string | null
  cluster?: string | null
}

export type NetworkAlarmsState = {
  overlay: MapOverlaySpec
  legend: OverlayLegendRow[]
  total: number
  withGps: number
  approx: number
  unlocated: number
  updatedAt: number | null
  error: string | null
}

const empty: NetworkAlarmsState = {
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

function excludeSqlList() {
  return NETWORK_ALARMS.excludeEventNames
    .map((name) => `'${name.replace(/'/g, "''")}'`)
    .join(", ")
}

async function fetchAlarmRows(force = false): Promise<{ rows: HubRow[]; total: number }> {
  const limit = Math.max(1, Math.min(1000, NETWORK_ALARMS.limit))
  const exclude = excludeSqlList()
  const excludeClause = exclude ? `AND event_name NOT IN (${exclude})` : ""
  const sql = `
WITH filtered AS (
  SELECT *
  FROM sensor_data.sensor_alarms
  WHERE event_name IS NOT NULL ${excludeClause}
),
per AS (
  SELECT
    device_id,
    COUNT(*)::int AS events,
    (ARRAY_AGG(event_name ORDER BY reading_time DESC NULLS LAST))[1] AS last_event,
    MAX(reading_time) AS last_rt
  FROM filtered
  GROUP BY device_id
)
SELECT
  p.device_id,
  p.events,
  p.last_event,
  p.last_rt,
  m.latitude,
  m.longitude,
  m.region,
  m.cluster
FROM per p
LEFT JOIN sensor_data.sensor_master m ON m.device_id = p.device_id
ORDER BY p.events DESC, p.last_rt DESC
LIMIT ${limit}
`.replace(/\s+/g, " ").trim()

  const body = await mapCachedPostJson<{ rows?: HubRow[] }>(HUB_QUERY, { sql, limit }, { force })
  const rows = Array.isArray(body.rows) ? body.rows : []

  const countSql = `
SELECT COUNT(DISTINCT device_id)::bigint AS n
FROM sensor_data.sensor_alarms
WHERE event_name IS NOT NULL ${excludeClause}
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

function buildState(rows: HubRow[], total: number): NetworkAlarmsState {
  const points: OverlayPoint[] = []
  const bandCounts = new Map(NETWORK_ALARMS.bands.map((b) => [b.id, 0]))
  let withGps = 0
  let approx = 0

  for (const row of rows) {
    const deviceId = typeof row.device_id === "string" && row.device_id.trim() ? row.device_id.trim() : null
    if (!deviceId) continue
    const resolved = resolveCoords(row)
    if (!resolved) continue
    const mesh = projectLatLng(resolved.coords.lat, resolved.coords.lon)
    if (!mesh) continue
    const band = bandForNetworkAlarm(typeof row.last_event === "string" ? row.last_event : null)
    const events = Math.max(1, Math.round(num(row.events) ?? 1))
    bandCounts.set(band.id, (bandCounts.get(band.id) ?? 0) + 1)
    if (resolved.approx) approx += 1
    else withGps += 1
    points.push({
      id: deviceId,
      x: mesh.x,
      z: mesh.z,
      color: band.color,
      count: events,
      approx: resolved.approx,
      label: resolved.label || deviceId,
      statusId: band.id,
      statusTitle: band.label,
      nos: [deviceId],
    })
  }

  const legend: OverlayLegendRow[] = NETWORK_ALARMS.bands.map((band) => ({
    id: band.id,
    label: band.label,
    color: band.color,
    count: bandCounts.get(band.id) ?? 0,
  }))

  return {
    overlay: points.length
      ? {
          kind: "points",
          title: "Network alarms",
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

const Ctx = createContext<NetworkAlarmsState>(empty)

export function NetworkAlarmsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NetworkAlarmsState>(empty)
  const enabled = useMapLayerEnabled("network-alarms")
  const scope = useWallScope()

  useLayerPoll(enabled, scope, POLL_MS, async ({ force }) => {
    try {
      const { rows, total } = await fetchAlarmRows(force)
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

export function useNetworkAlarms(): NetworkAlarmsState {
  return useContext(Ctx)
}

export function useNetworkAlarmsOverlay(enabled: boolean): MapOverlaySpec {
  const state = useNetworkAlarms()
  return useMemo(() => (enabled ? state.overlay : null), [enabled, state.overlay])
}
