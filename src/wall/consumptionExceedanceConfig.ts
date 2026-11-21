/** Tunable knobs for the "Meters exceeding hourly consumption" map slide. */

export type OccurrenceBand = {
  id: string
  label: string
  min: number
  max: number
  color: string
}

export const CONSUMPTION_EXCEEDANCE = {
  /** anomalies.abnormal_high period filter */
  ym: "2026-10",
  /** Hub rows/SQL limit — Oct has ~323 rows; keep headroom. */
  limit: 1000,
  /**
   * Hours-flagged (`occurrence`) → severity.
   * Edit min/max/color here — no SQL changes needed.
   */
  bands: [
    { id: "low", label: "1–3 hours", min: 1, max: 3, color: "#EAB308" },
    { id: "mid", label: "4–12 hours", min: 4, max: 12, color: "#F97316" },
    { id: "high", label: "13+ hours", min: 13, max: 99, color: "#EF4444" },
  ] as OccurrenceBand[],
}

export function bandForOccurrence(occurrence: number): OccurrenceBand {
  const bands = CONSUMPTION_EXCEEDANCE.bands
  const hit = bands.find((b) => occurrence >= b.min && occurrence <= b.max)
  return hit ?? bands[bands.length - 1]
}

export const ABNORMAL_HIGH_ROWS_URL =
  `/newapi/hub/esyduckdb/db/rows?schema=anomalies&table=abnormal_high&limit=${CONSUMPTION_EXCEEDANCE.limit}&ym=${CONSUMPTION_EXCEEDANCE.ym}`
