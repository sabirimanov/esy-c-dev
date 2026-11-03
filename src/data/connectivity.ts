import { useCachedResource } from "./cachedFetch"
import type { WallState } from "../wall/state"

export type ConnectivityTypeKey = "smart" | "retrofit" | "pressure" | "temperature" | "evc-non" | "evc-com"

export type ConnectivityTypeRow = {
  key: ConnectivityTypeKey
  total: number
  communicated: number
  azercell: number
  bakcell: number
  nc7: number
  rsrp: number | null
  snr: number | null
  refDay: string | null
  hasRadio: boolean
}

export type ConnectivityDay = {
  day: string
  installed: number
  communicated: number
  rate: number | null
}

export type ConnectivityStats = {
  from: string
  to: string
  types: ConnectivityTypeRow[]
  chart: ConnectivityDay[]
  kpis: {
    total: number
    communicated: number
    rate: number | null
    nc7: number
  }
}

export function useConnectivity(state: WallState) {
  const query = new URLSearchParams({
    from: state.date,
    to: state.dateTo,
  })
  if (state.regionId) query.set("region", state.regionId)
  if (state.cityId) query.set("city", state.cityId)
  if (state.clusterId) query.set("cluster", state.clusterId)
  return useCachedResource<ConnectivityStats>(`/connectivity?${query}`, state.seed)
}

export function typeByKey(stats: ConnectivityStats | null, key: ConnectivityTypeKey) {
  return stats?.types.find((row) => row.key === key) ?? null
}

export function formatCount(value: number | null | undefined) {
  if (value == null) return "—"
  return value.toLocaleString("en-US")
}

export function formatPct(value: number | null | undefined, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${value.toFixed(digits)}%`
}
