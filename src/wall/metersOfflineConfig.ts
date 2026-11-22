/** Tunable knobs for the "Meters offline >3 days" map slide. */

export const METERS_OFFLINE = {
  /**
   * No daily row in this many days before the latest RTC in meters_signal.daily.
   * Anchor is MAX("RTC") in the table — not wall-clock "today".
   * Only MSNs that also exist in meters_signal.devices (New Msn / Retrofit id).
   */
  offlineDays: 3,
  /** Hub SQL limit (max 1000). */
  limit: 1000,
  color: "#EF4444",
  label: "Offline >3 days",
  id: "offline",
}
