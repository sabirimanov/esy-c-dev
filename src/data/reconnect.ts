import { useEffect, useState } from "react"
import { apiRegionId, zoneIdForCity } from "../wall/places"
import type { WallState } from "../wall/state"

export type ReconnectStats = { pct: number | null }

export function useReconnect(state: WallState) {
  const [stats, setStats] = useState<ReconnectStats | null>(null)
  useEffect(() => {
    const query = new URLSearchParams({ from: state.date, to: state.dateTo })
    const region = apiRegionId(state.regionId)
    const zone = zoneIdForCity(state.cityId)
    if (region) query.set("region", region)
    if (zone) query.set("zone", zone)
    let live = true
    setStats(null)
    fetch(`/reconnect?${query}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<ReconnectStats>
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
  }, [state.date, state.dateTo, state.regionId, state.cityId])
  return stats
}
