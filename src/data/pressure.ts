import { useEffect, useState } from "react"
import { apiRegionId, zoneIdForCity } from "../wall/places"
import type { WallState } from "../wall/state"

export type PressureStats = {
  lowSensors: number
  mediumSensors: number
  lowViolations: number
  mediumViolations: number
}

export function usePressure(state: WallState) {
  const [stats, setStats] = useState<PressureStats | null>(null)
  useEffect(() => {
    const query = new URLSearchParams({ from: state.date, to: state.dateTo })
    const region = apiRegionId(state.regionId)
    const zone = zoneIdForCity(state.cityId)
    if (region) query.set("region", region)
    if (zone) query.set("zone", zone)
    if (state.clusterId) query.set("cluster", state.clusterId)
    let live = true
    setStats(null)
    fetch(`/pressure?${query}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<PressureStats>
      })
      .then((body) => {
        if (live) setStats(body)
      })
      .catch(() => {
        if (live) setStats(null)
      })
    return () => {
      live = false
    }
  }, [state.date, state.dateTo, state.regionId, state.cityId, state.clusterId, state.seed])
  return stats
}
