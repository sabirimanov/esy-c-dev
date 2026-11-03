import { useCachedResource } from "./cachedFetch"
import type { WallState } from "../wall/state"

export type OmJobsAction = {
  label: string
  count: number
  share: number | null
}

export type OmJobsMonth = {
  ym: string
  assigned: number
  attended: number
  resolved: number
  rate: number | null
}

export type OmJobsDay = {
  day: string
  assigned: number
  resolved: number
  pending: number
}

export type OmJobsData = {
  assigned: number
  attended: number
  resolved: number
  attendedNotResolved: number
  notAttended: number
  resolutionRate: number | null
  visits7: number
  visits30: number
  refDay: string | null
  telco: number
  actions: OmJobsAction[]
  months: OmJobsMonth[]
  daily: OmJobsDay[]
}

export function useOmJobs(state: WallState) {
  const query = new URLSearchParams({
    from: state.date <= state.dateTo ? state.date : state.dateTo,
    to: state.date <= state.dateTo ? state.dateTo : state.date,
  })
  if (state.regionId) query.set("region", state.regionId)
  if (state.cityId) query.set("city", state.cityId)
  return useCachedResource<OmJobsData>(`/om-jobs?${query}`, state.seed)
}
