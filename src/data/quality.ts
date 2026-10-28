import { useCachedResource } from "./cachedFetch"
import { apiRegionId, zoneIdForCity } from "../wall/places"
import type { WallState } from "../wall/state"

export type QualityStats = {
  days: number
  total: number
  residential: number
  nonResidential: number
  balance: number
  received: {
    overall: number
    residential: number
    nonResidential: number
    balance: number
  }
}

export function useQuality(state: WallState) {
  const query = new URLSearchParams({ from: state.date, to: state.dateTo })
  const region = apiRegionId(state.regionId)
  const zone = zoneIdForCity(state.cityId)
  if (region) query.set("region", region)
  if (zone) query.set("zone", zone)
  if (state.clusterId) query.set("cluster", state.clusterId)
  return useCachedResource<QualityStats>(`/quality?${query}`, state.seed)
}
