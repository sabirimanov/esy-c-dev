import { useCachedResource } from "./cachedFetch"
import { apiRegionId, zoneIdForCity } from "../wall/places"
import type { WallState } from "../wall/state"

export type GisInfra = {
  distribution: number
  service: number
  meters: number
  stations: number
  valves: number
}

type GisRow = {
  "Distribution Pipe Length": number
  "Service Pipe Length": number
  Meters: number
  Stations: number
  Valves: number
}

export function useGis(state: WallState) {
  const query = new URLSearchParams()
  const region = apiRegionId(state.regionId)
  const zone = zoneIdForCity(state.cityId)
  if (region) query.set("region", region)
  if (zone) query.set("zone", zone)
  if (state.clusterId) query.set("cluster", state.clusterId)
  const body = useCachedResource<{ rows: GisRow[] }>(`/gis?${query}`, state.seed)
  if (!body?.rows.length) return null
  return body.rows.reduce(
    (sum, row) => ({
      distribution: sum.distribution + row["Distribution Pipe Length"],
      service: sum.service + row["Service Pipe Length"],
      meters: sum.meters + row.Meters,
      stations: sum.stations + row.Stations,
      valves: sum.valves + row.Valves,
    }),
    { distribution: 0, service: 0, meters: 0, stations: 0, valves: 0 },
  )
}
