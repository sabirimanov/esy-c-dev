import { useEffect, useState } from "react"
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
  const [infra, setInfra] = useState<GisInfra | null>(null)
  useEffect(() => {
    const query = new URLSearchParams()
    const region = apiRegionId(state.regionId)
    const zone = zoneIdForCity(state.cityId)
    if (region) query.set("region", region)
    if (zone) query.set("zone", zone)
    if (state.clusterId) query.set("cluster", state.clusterId)
    let live = true
    setInfra(null)
    fetch(`/gis?${query}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<{ rows: GisRow[] }>
      })
      .then((body) => {
        if (!live) return
        if (!body.rows.length) {
          setInfra(null)
          return
        }
        setInfra(body.rows.reduce(
          (sum, row) => ({
            distribution: sum.distribution + row["Distribution Pipe Length"],
            service: sum.service + row["Service Pipe Length"],
            meters: sum.meters + row.Meters,
            stations: sum.stations + row.Stations,
            valves: sum.valves + row.Valves,
          }),
          { distribution: 0, service: 0, meters: 0, stations: 0, valves: 0 },
        ))
      })
      .catch(() => {
        if (live) setInfra(null)
      })
    return () => {
      live = false
    }
  }, [state.regionId, state.cityId, state.clusterId, state.seed])
  return infra
}
