import { useEffect, useState } from "react"
import { previousSpan } from "../wall/dates"
import { apiRegionId, zoneIdForCity } from "../wall/places"
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
  const [zones, setZones] = useState<UfgZone[]>([])
  const [clusters, setClusters] = useState<UfgCluster[]>([])
  useEffect(() => {
    let live = true
    fetch("/ufg/hierarchy", { cache: "no-store" })
      .then((res) => res.json())
      .then((body: { zones?: UfgZone[]; clusters?: UfgCluster[] }) => {
        if (!live) return
        if (Array.isArray(body.zones)) setZones(body.zones)
        if (Array.isArray(body.clusters)) setClusters(body.clusters)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [])
  return { zones, clusters }
}

export function useCapacity(state: WallState) {
  const [capacity, setCapacity] = useState<number | null>(null)
  useEffect(() => {
    const query = scopeQuery(state, {})
    let live = true
    setCapacity(null)
    fetch(`/ufg/capacity?${query}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<{ capacity: number | null }>
      })
      .then((body) => {
        if (live) setCapacity(typeof body.capacity === "number" ? body.capacity : null)
      })
      .catch(() => {
        if (live) setCapacity(null)
      })
    return () => {
      live = false
    }
  }, [state.regionId, state.cityId, state.clusterId, state.seed])
  return capacity
}

export type MeterSplit = { smart: number; retrofit: number }

export function useMeterSplit(state: WallState) {
  const [split, setSplit] = useState<MeterSplit | null>(null)
  useEffect(() => {
    const query = scopeQuery(state, {})
    let live = true
    setSplit(null)
    fetch(`/ufg/meters?${query}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<MeterSplit>
      })
      .then((body) => {
        if (live) setSplit(body)
      })
      .catch(() => {
        if (live) setSplit(null)
      })
    return () => {
      live = false
    }
  }, [state.regionId, state.cityId, state.clusterId, state.seed])
  return split
}

export function useUfgSummary(state: WallState) {
  const [summary, setSummary] = useState<UfgSummary>(emptySummary)
  useEffect(() => {
    const query = scopeQuery(state, { from: state.date, to: state.dateTo })
    let live = true
    fetch(`/ufg/summary?${query}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<UfgSummary>
      })
      .then((body) => {
        if (live) setSummary(body)
      })
      .catch(() => {
        if (live) setSummary(emptySummary)
      })
    return () => {
      live = false
    }
  }, [state.date, state.dateTo, state.regionId, state.cityId, state.clusterId, state.seed])
  return summary
}

export function useUfgTrend(state: WallState) {
  const [trend, setTrend] = useState<UfgTrend | null>(null)
  useEffect(() => {
    const previous = previousSpan(state.date, state.dateTo, state.period)
    const query = scopeQuery(state, {
      from: state.date,
      to: state.dateTo,
      prevFrom: previous.date,
      prevTo: previous.dateTo,
    })
    let live = true
    setTrend(null)
    fetch(`/ufg/trend?${query}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<UfgTrend>
      })
      .then((body) => {
        if (live) setTrend(body)
      })
      .catch(() => {
        if (live) setTrend({ current: [], previous: [], hourly: state.date === state.dateTo, hours: [] })
      })
    return () => {
      live = false
    }
  }, [state.date, state.dateTo, state.period, state.regionId, state.cityId, state.clusterId, state.seed])
  return trend
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
  const [readiness, setReadiness] = useState<UfgReadiness | null>(null)
  useEffect(() => {
    let live = true
    setReadiness(null)
    const query = scopeQuery(state, { from: state.date, to: state.dateTo })
    query.delete("cluster")
    fetch(`/ufg/readiness?${query}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<UfgReadiness>
      })
      .then((body) => {
        if (live) setReadiness(body)
      })
      .catch(() => {
        if (live) setReadiness(null)
      })
    return () => {
      live = false
    }
  }, [state.date, state.dateTo, state.regionId, state.cityId, state.seed])
  return readiness
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
  const [alarms, setAlarms] = useState<UfgAlarm[] | null>(null)
  useEffect(() => {
    let live = true
    fetch("/ufg/alarms", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<{ alarms?: UfgAlarm[] }>
      })
      .then((body) => {
        if (live) setAlarms(Array.isArray(body.alarms) ? body.alarms : [])
      })
      .catch(() => {
        if (live) setAlarms([])
      })
    return () => {
      live = false
    }
  }, [])
  return alarms
}
