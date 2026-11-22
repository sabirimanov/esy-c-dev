/** Tunable knobs for "Meter tampering events" map slide. */

export type TamperEventBand = {
  id: string
  /** Exact "Event Name" from tampering_events."Combined Events". */
  eventName: string
  label: string
  color: string
}

export const TAMPERING_EVENTS = {
  limit: 1000,
  color: "#EF4444",
  /** Legend order matches Executive Board tamper categories. */
  bands: [
    { id: "tampering", eventName: "Device tamper detection start", label: "Tampering", color: "#EF4444" },
    { id: "disassembly", eventName: "Disassembly detected", label: "Disassembly", color: "#F97316" },
    { id: "interference", eventName: "External field application interfering end", label: "Interference", color: "#A5F3FC" },
    { id: "magnetic", eventName: "Magnetic interference detected", label: "Magnetic", color: "#2DE0D2" },
    { id: "battery", eventName: "Unauthorized battery remove", label: "Battery remove", color: "#FACC15" },
  ] as TamperEventBand[],
}

export function bandForEventName(name: string | null | undefined): TamperEventBand {
  const bands = TAMPERING_EVENTS.bands
  const hit = bands.find((b) => b.eventName === name)
  return hit ?? bands[0]
}
