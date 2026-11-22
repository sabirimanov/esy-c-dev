/** Tunable knobs for "Meters with repeated readings (>3 days)". */

export type StreakBand = {
  id: string
  label: string
  min: number
  max: number
  color: string
}

/** Exact hub column name for cumulative volume on meters_signal.daily. */
export const DAILY_VB_COL = "Total vb(m\u00c2\u00b3)"

export const REPEATED_READINGS = {
  /** Same Total vb for at least this many consecutive available days (from latest). */
  minStreakDays: 3,
  /** Exclude meters whose latest Total vb is below this (m³). */
  minTotalVb: 2,
  /** Hub SQL limit (max 1000). */
  limit: 1000,
  /**
   * Streak length → severity bands (approx terciles on current data).
   * Edit min/max/color here — no SQL changes needed.
   */
  bands: [
    { id: "low", label: "3–10 days", min: 3, max: 10, color: "#FDE68A" },
    { id: "mid", label: "11–40 days", min: 11, max: 40, color: "#F97316" },
    { id: "high", label: "41+ days", min: 41, max: 9999, color: "#9A3412" },
  ] as StreakBand[],
}

export function bandForStreak(days: number): StreakBand {
  const bands = REPEATED_READINGS.bands
  const hit = bands.find((b) => days >= b.min && days <= b.max)
  return hit ?? bands[bands.length - 1]
}
