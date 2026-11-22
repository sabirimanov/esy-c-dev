/** Tunable knobs for "Meter anomalies" — all anomalies.* tables. */

export type AnomalyBand = {
  id: string
  table: "abnormal_high" | "abnormal_low" | "overflow" | "zero_consumption"
  label: string
  color: string
}

export const METER_ANOMALIES = {
  /**
   * Optional ym pin (YYYY-MM). null → use GREATEST(MAX(ym)) across the 4 tables.
   */
  ym: null as string | null,
  /** Hub max 1000 — split evenly across the 4 sources. */
  limit: 1000,
  bands: [
    { id: "abnormal_high", table: "abnormal_high", label: "Abnormal high", color: "#EF4444" },
    { id: "abnormal_low", table: "abnormal_low", label: "Abnormal low", color: "#2DE0D2" },
    { id: "overflow", table: "overflow", label: "Overflow", color: "#F97316" },
    { id: "zero_consumption", table: "zero_consumption", label: "Zero consumption", color: "#FACC15" },
  ] as AnomalyBand[],
}

export function bandForAnomalyId(id: string | null | undefined): AnomalyBand {
  const bands = METER_ANOMALIES.bands
  return bands.find((b) => b.id === id) ?? bands[0]
}

export function perSourceLimit() {
  const n = METER_ANOMALIES.bands.length || 1
  return Math.max(1, Math.floor(Math.min(1000, METER_ANOMALIES.limit) / n))
}
