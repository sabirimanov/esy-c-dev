import { useCachedResource } from "./cachedFetch"
import { apiRegionId, zoneIdForCity } from "../wall/places"
import type { WallState } from "../wall/state"

export type FieldStats = {
  calls: number
  resolved: number
  leaks: number
  tamper: number
  emergency: number
  reconnection: number
  reconnectionDone: number
  reconnectionSameDay: number
  disconnection: number
  disconnectionWithin7: number
  meterCut: number
  replacements: number
  replacementSameDay: number
  pipelines: number | null
  pipelinesDone: number | null
  pipelinesSameDay: number | null
  regulators: number | null
}

export function useFieldOps(state: WallState) {
  const query = new URLSearchParams({ from: state.date, to: state.dateTo })
  const region = apiRegionId(state.regionId)
  const zone = zoneIdForCity(state.cityId)
  if (region) query.set("region", region)
  if (zone) query.set("zone", zone)
  if (state.clusterId) query.set("cluster", state.clusterId)
  return useCachedResource<FieldStats>(`/field?${query}`, state.seed)
}
