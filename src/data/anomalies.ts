import { useEffect, useState } from "react"
import { apiRegionId, zoneIdForCity } from "../wall/places"
import type { WallState } from "../wall/state"

export type AnomalyCounts = {
  high: number
  low: number
  zero: number
  overflow: number
}

export function useAnomalies(state: WallState) {
  const [data, setData] = useState<AnomalyCounts | null>(null)
  useEffect(() => {
    const query = new URLSearchParams({ from: state.date, to: state.dateTo })
    const region = apiRegionId(state.regionId)
    const zone = zoneIdForCity(state.cityId)
    if (region) query.set("region", region)
    if (zone) query.set("zone", zone)
    if (state.clusterId) query.set("cluster", state.clusterId)
    let live = true
    setData(null)
    fetch(`/anomalies?${query}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<AnomalyCounts>
      })
      .then((body) => {
        if (live) setData(body)
      })
      .catch(() => {
        if (live) setData(null)
      })
    return () => {
      live = false
    }
  }, [state.date, state.dateTo, state.regionId, state.cityId, state.clusterId, state.seed])
  return data
}
