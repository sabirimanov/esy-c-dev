import { useEffect, useState } from "react"
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
  const [stats, setStats] = useState<LeakStats | null>(null)
  useEffect(() => {
    const query = new URLSearchParams({ from: state.date, to: state.dateTo })
    const region = apiRegionId(state.regionId)
    const zone = zoneIdForCity(state.cityId)
    if (region) query.set("region", region)
    if (zone) query.set("zone", zone)
    if (state.clusterId) query.set("cluster", state.clusterId)
    let live = true
    setStats(null)
    fetch(`/leaks?${query}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<LeakStats>
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
