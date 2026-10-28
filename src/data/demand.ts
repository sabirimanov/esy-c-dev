import { useCachedResource } from "./cachedFetch"
import { apiRegionId, zoneIdForCity } from "../wall/places"
import type { WallState } from "../wall/state"

export type DemandPoint = { date: string; value: number }

export type DemandStats = {
  total: number
  supply: number
  points: DemandPoint[]
  peak: number | null
  forecast: { simulated: DemandPoint[]; predicted: DemandPoint[] } | null
}

export function useDemand(state: WallState) {
  const query = new URLSearchParams({ from: state.date, to: state.dateTo })
  const region = apiRegionId(state.regionId)
  const zone = zoneIdForCity(state.cityId)
  if (region) query.set("region", region)
  if (zone) query.set("zone", zone)
  if (state.clusterId) query.set("cluster", state.clusterId)
  return useCachedResource<DemandStats>(`/demand?${query}`, state.seed)
}
