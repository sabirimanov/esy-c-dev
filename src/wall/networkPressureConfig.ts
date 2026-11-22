/** Tunable knobs for "Network pressure" map slide. */

export type NetworkPressureBand = {
  id: "swing_50" | "zero_8h"
  label: string
  color: string
}

export const NETWORK_PRESSURE = {
  /** Hub max 1000. */
  limit: 1000,
  /** How far back to scan Pressure rows (days). */
  lookbackDays: 14,
  /** Cond #1: |value − same-hour 7d avg| / avg ≥ this. */
  swingPct: 0.5,
  /** Cond #1: ignore tiny baselines (mbar). */
  minAvgAbs: 0.01,
  /** Cond #2: contiguous zero-pressure streak length (hours). */
  zeroHours: 8,
  bands: [
    { id: "swing_50", label: "±50% vs 7d same hour", color: "#F97316" },
    { id: "zero_8h", label: "Zero pressure ≥8h", color: "#EF4444" },
  ] as NetworkPressureBand[],
}

export function bandForPressureAlarm(id: string | null | undefined): NetworkPressureBand {
  const bands = NETWORK_PRESSURE.bands
  return bands.find((b) => b.id === id) ?? bands[0]
}
