import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ABNORMAL_HIGH_ROWS_URL,
  bandForOccurrence,
  CONSUMPTION_EXCEEDANCE,
} from "../wall/consumptionExceedanceConfig"
import { projectLatLng } from "../wall/geo"
import type { MapOverlaySpec, OverlayLegendRow, OverlayPoint } from "../wall/mapOverlay"

const HUB_QUERY = "/newapi/hub/esyduckdb/db/query"
const POLL_MS = 10 * 60 * 1000

type HubRow = {
  msn?: string | null
  occurrence?: number | string | null
  consumer_id?: string | null
  consumer_name?: string | null
  region?: string | null
  Latitude?: number | string | null
  Longitude?: number | string | null
  latitude?: number | string | null
  longitude?: number | string | null
}

export type ConsumptionExceedanceState = {
  overlay: MapOverlaySpec
  legend: OverlayLegendRow[]
  total: number
  withGps: number
  updatedAt: number | null
  error: string | null
}

const empty: ConsumptionExceedanceState = {
  overlay: null,
  legend: [],
  total: 0,
  withGps: 0,
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

/** One round-trip: abnormal_high for ym + devices GPS (same filters as rows URL). */
async function fetchJoinedRows(): Promise<HubRow[]> {
  const ym = sqlEscape(CONSUMPTION_EXCEEDANCE.ym)
  const limit = Math.max(1, Math.min(1000, CONSUMPTION_EXCEEDANCE.limit))
  const sql = `
SELECT
  a.msn,
  a.occurrence,
  a.consumer_id,
  a.consumer_name,
  a.region,
  d."Latitude" AS latitude,
  d."Longitude" AS longitude
FROM anomalies.abnormal_high a
LEFT JOIN meters_signal.devices d ON d."New Msn" = a.msn
WHERE a.ym = '${ym}'
ORDER BY a.occurrence DESC, a.msn
LIMIT ${limit}
`.replace(/\s+/g, " ").trim()

  const res = await fetch(HUB_QUERY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql, limit }),
  })
  if (!res.ok) throw new Error(`hub query ${res.status}`)
  const body = (await res.json()) as { rows?: HubRow[] }
  if (Array.isArray(body.rows) && body.rows.length) return body.rows

  // Fallback: exact rows URL, then resolve GPS in a second query if needed.
  const rowsRes = await fetch(ABNORMAL_HIGH_ROWS_URL)
  if (!rowsRes.ok) throw new Error(`hub rows ${rowsRes.status}`)
  const rowsBody = (await rowsRes.json()) as { rows?: HubRow[] }
  const base = Array.isArray(rowsBody.rows) ? rowsBody.rows : []
  if (!base.length) return []

  const msns = [...new Set(base.map((r) => (typeof r.msn === "string" ? r.msn.trim() : "")).filter(Boolean))]
  if (!msns.length) return base

  const list = msns.map((m) => `'${sqlEscape(m)}'`).join(",")
  const gpsSql = `
SELECT "New Msn" AS msn, "Latitude" AS latitude, "Longitude" AS longitude
FROM meters_signal.devices
WHERE "New Msn" IN (${list})
`.replace(/\s+/g, " ").trim()
  const gpsRes = await fetch(HUB_QUERY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql: gpsSql, limit }),
  })
  if (!gpsRes.ok) return base
  const gpsBody = (await gpsRes.json()) as { rows?: HubRow[] }
  const byMsn = new Map<string, { lat: number; lon: number }>()
  for (const row of gpsBody.rows ?? []) {
    const msn = typeof row.msn === "string" ? row.msn : ""
    const lat = num(row.latitude ?? row.Latitude)
    const lon = num(row.longitude ?? row.Longitude)
    if (!msn || lat == null || lon == null) continue
    byMsn.set(msn, { lat, lon })
  }
  return base.map((row) => {
    const msn = typeof row.msn === "string" ? row.msn : ""
    const gps = byMsn.get(msn)
    return gps ? { ...row, latitude: gps.lat, longitude: gps.lon } : row
  })
}

function buildState(rows: HubRow[]): ConsumptionExceedanceState {
  const points: OverlayPoint[] = []
  const bandCounts = new Map(CONSUMPTION_EXCEEDANCE.bands.map((b) => [b.id, 0]))

  for (const row of rows) {
    const msn = typeof row.msn === "string" && row.msn.trim() ? row.msn.trim() : null
    if (!msn) continue
    const occurrence = num(row.occurrence) ?? 0
    const lat = num(row.latitude ?? row.Latitude)
    const lon = num(row.longitude ?? row.Longitude)
    if (lat == null || lon == null) continue
    const mesh = projectLatLng(lat, lon)
    if (!mesh) continue
    const band = bandForOccurrence(occurrence)
    bandCounts.set(band.id, (bandCounts.get(band.id) ?? 0) + 1)
    const name = typeof row.consumer_name === "string" && row.consumer_name.trim() ? row.consumer_name.trim() : msn
    points.push({
      id: msn,
      x: mesh.x,
      z: mesh.z,
      color: band.color,
      count: Math.max(1, Math.round(occurrence)),
      approx: false,
      label: name,
      statusId: band.id,
      statusTitle: band.label,
      nos: [msn],
    })
  }

  const legend: OverlayLegendRow[] = CONSUMPTION_EXCEEDANCE.bands.map((band) => ({
    id: band.id,
    label: band.label,
    color: band.color,
    count: bandCounts.get(band.id) ?? 0,
  }))

  return {
    overlay: points.length
      ? {
          kind: "points",
          title: "Meters exceeding hourly consumption",
          points,
          legend,
        }
      : null,
    legend,
    total: rows.length,
    withGps: points.length,
    updatedAt: Date.now(),
    error: null,
  }
}

const Ctx = createContext<ConsumptionExceedanceState>(empty)

export function ConsumptionExceedanceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ConsumptionExceedanceState>(empty)

  useEffect(() => {
    let live = true
    async function pull() {
      try {
        const rows = await fetchJoinedRows()
        if (live) setState(buildState(rows))
      } catch (err) {
        if (live) {
          setState((current) => ({
            ...current,
            error: err instanceof Error ? err.message : "fetch failed",
          }))
        }
      }
    }
    pull()
    const id = window.setInterval(pull, POLL_MS)
    return () => {
      live = false
      window.clearInterval(id)
    }
  }, [])

  return <Ctx.Provider value={state}>{children}</Ctx.Provider>
}

export function useConsumptionExceedance(): ConsumptionExceedanceState {
  return useContext(Ctx)
}

export function useConsumptionExceedanceOverlay(enabled: boolean): MapOverlaySpec {
  const state = useConsumptionExceedance()
  return useMemo(() => (enabled ? state.overlay : null), [enabled, state.overlay])
}
