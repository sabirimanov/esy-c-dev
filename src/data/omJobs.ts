import { useCachedResource } from "./cachedFetch"
import { addDays, todayIso } from "../wall/dates"
import type { WallState } from "../wall/state"

/** Page 7 charts need ~30 days. Pad short selections (day / week) symmetrically. */
export function omJobsWindow(from: string, to: string) {
  const start = from <= to ? from : to
  const end = from <= to ? to : from
  const days = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1
  if (days >= 30) return { from: start, to: end }
  const need = 30 - days
  let before = Math.floor(need / 2)
  let after = need - before
  const today = todayIso()
  let date = addDays(start, -before)
  let dateTo = addDays(end, after)
  if (dateTo > today) {
    const excess = Math.round((Date.parse(`${dateTo}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000)
    dateTo = today
    date = addDays(date, -excess)
  }
  return { from: date, to: dateTo }
}

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
  const range = omJobsWindow(
    state.date <= state.dateTo ? state.date : state.dateTo,
    state.date <= state.dateTo ? state.dateTo : state.date,
  )
  const query = new URLSearchParams({
    from: range.from,
    to: range.to,
  })
  if (state.regionId) query.set("region", state.regionId)
  if (state.cityId) query.set("city", state.cityId)
  return useCachedResource<OmJobsData>(`/om-jobs?${query}`, state.seed)
}
