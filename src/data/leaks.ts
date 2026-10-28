import { useCachedResource } from "./cachedFetch"
import { apiRegionId, zoneIdForCity } from "../wall/places"
import type { WallState } from "../wall/state"

export type LeakStats = {
  suspected: number
  grades: {
    "Grade A": number
    "Grade B": number
    "Grade C": number
  }
}

export function useLeaks(state: WallState) {
  const query = new URLSearchParams({ from: state.date, to: state.dateTo })
  const region = apiRegionId(state.regionId)
  const zone = zoneIdForCity(state.cityId)
  if (region) query.set("region", region)
  if (zone) query.set("zone", zone)
  if (state.clusterId) query.set("cluster", state.clusterId)
  return useCachedResource<LeakStats>(`/leaks?${query}`, state.seed)
}
