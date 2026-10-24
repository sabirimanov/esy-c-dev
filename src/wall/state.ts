// Shared wall session. regionId and cityId are null when the filter is All.
// date and dateTo are an inclusive range; equal values are a single day.
// Region ids are the exc codes. 11 is Bakı, 9 is Dağlıq Şirvan, 8 is Abşeron-Xızı.
export type WallState = {
  date: string
  dateTo: string
  regionId: string | null
  cityId: string | null
  regionSet: boolean
  rev: number
  seed: number
  period: string
  ufgOpen: boolean
}

export const defaultWall: WallState = {
  date: "2026-09-30",
  dateTo: "2026-09-30",
  regionId: null,
  cityId: null,
  regionSet: false,
  rev: 0,
  seed: 0,
  period: "Last 30 Days",
  ufgOpen: false,
}

export function periodLabel(iso: string) {
  const [year, month] = iso.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function monthShort(iso: string) {
  const [year, month] = iso.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
    timeZone: "UTC",
  })
}

export function shiftMonth(iso: string, delta: number) {
  const [year, month, day] = iso.split("-").map(Number)
  const next = new Date(Date.UTC(year, month - 1 + delta, 1))
  const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate()
  const kept = Math.min(day, last)
  const y = next.getUTCFullYear()
  const m = String(next.getUTCMonth() + 1).padStart(2, "0")
  const d = String(kept).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function dayOf(iso: string) {
  return Number(iso.slice(8, 10))
}
