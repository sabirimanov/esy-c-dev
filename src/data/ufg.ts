import { useCachedResource } from "./cachedFetch"
import { previousSpan } from "../wall/dates"
import { apiRegionId, zoneIdForCity } from "../wall/places"
import { useWall } from "../wall/useWall"
import type { WallState } from "../wall/state"

export type UfgZone = {
  zone_id: string
  region_id: string
  name_en: string
}

export type UfgCluster = {
  cluster_id: string
  region_id: string
  zone_id: string
  name_en: string
}

export type UfgExtreme = {
  id: string
  name: string
  value: number
}

export type UfgSummary = {
  current: number | null
  target: number
  loss: number | null
  closure: number | null
  supply: number
  sale: number | null
  consumers: number | null
  extremes: { high: UfgExtreme | null; low: UfgExtreme } | null
}

const emptySummary: UfgSummary = { current: null, target: 5, loss: null, closure: null, supply: 0, sale: null, consumers: null, extremes: null }

export type UfgTrend = {
  current: (number | null)[]
  previous: (number | null)[]
  hourly: boolean
  hours: string[]
}

function scopeQuery(state: WallState, extra: Record<string, string>) {
  const query = new URLSearchParams(extra)
  const region = apiRegionId(state.regionId)
  const zone = zoneIdForCity(state.cityId)
  if (region) query.set("region", region)
  if (zone) query.set("zone", zone)
  if (state.clusterId) query.set("cluster", state.clusterId)
  return query
}

export function useUfgHierarchy() {
  const { state } = useWall()
  const body = useCachedResource<{ zones?: UfgZone[]; clusters?: UfgCluster[] }>("/ufg/hierarchy", state.seed, false)
  return {
    zones: Array.isArray(body?.zones) ? body.zones : [],
    clusters: Array.isArray(body?.clusters) ? body.clusters : [],
  }
}

export function useCapacity(state: WallState) {
  const body = useCachedResource<{ capacity: number | null }>(`/ufg/capacity?${scopeQuery(state, {})}`, state.seed)
  if (!body || typeof body.capacity !== "number") return null
  return body.capacity
}

export type MeterSplit = { smart: number; retrofit: number }

export function useMeterSplit(state: WallState) {
  return useCachedResource<MeterSplit>(`/ufg/meters?${scopeQuery(state, {})}`, state.seed)
}

export function useUfgSummary(state: WallState) {
  const body = useCachedResource<UfgSummary>(`/ufg/summary?${scopeQuery(state, { from: state.date, to: state.dateTo })}`, state.seed, false)
  return body ?? emptySummary
}

export function useUfgTrend(state: WallState) {
  const previous = previousSpan(state.date, state.dateTo, state.period)
  const query = scopeQuery(state, {
    from: state.date,
    to: state.dateTo,
    prevFrom: previous.date,
    prevTo: previous.dateTo,
  })
  return useCachedResource<UfgTrend>(`/ufg/trend?${query}`, state.seed)
}

export type UfgCounts = {
  total: number
  ready: number
  qualified: number
  blocked: number
}

export type UfgReadiness = {
  day: string | null
  areas: UfgCounts
  clusters: UfgCounts
}

export function useUfgReadiness(state: WallState) {
  const query = scopeQuery(state, { from: state.date, to: state.dateTo })
  query.delete("cluster")
  return useCachedResource<UfgReadiness>(`/ufg/readiness?${query}`, state.seed)
}

export type UfgAlarm = {
  id: number
  category: string
  source: string
  severity: string
  state: string
  currentValue: string
  time: string
}

export function useUfgAlarms() {
  const { state } = useWall()
  const body = useCachedResource<{ alarms?: UfgAlarm[] }>("/ufg/alarms", state.seed, false)
  if (!body) return null
  return Array.isArray(body.alarms) ? body.alarms : []
}
