import { useEffect, useState } from "react"
import { apiRegionId, zoneIdForCity } from "../wall/places"
import type { WallState } from "../wall/state"

export type ImpactShare = {
  noSupply: number
  leak: number
  pressure: number
  meter: number
  other: number
}

export type ImpactStats = {
  serviceLevel: number | null
  affected: number | null
  serious: number | null
  fcr: number | null
  answered: number | null
  queue: number | null
  repeatCalls: number | null
  reopened: number | null
  share: ImpactShare | null
  open: number | null
  calls: number | null
  closed: number | null
  escalated: number | null
  crmSla: number | null
  heat: { rqii: string; month: string; serviceLevel: number | null }[]
}

export function useImpact(state: WallState) {
  const [stats, setStats] = useState<ImpactStats | null>(null)
  useEffect(() => {
    const query = new URLSearchParams({ from: state.date, to: state.dateTo })
    const region = apiRegionId(state.regionId)
    const zone = zoneIdForCity(state.cityId)
    if (region) query.set("region", region)
    if (zone) query.set("zone", zone)
    if (state.clusterId) query.set("cluster", state.clusterId)
    let live = true
    setStats(null)
    fetch(`/impact?${query}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<ImpactStats>
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
  }, [state.date, state.dateTo, state.regionId, state.cityId, state.clusterId])
  return stats
}
