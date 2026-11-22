/** Tunable knobs for "Network alarms" map slide. */

export type NetworkAlarmBand = {
  id: string
  /** Exact event_name from sensor_data.sensor_alarms. */
  eventName: string
  label: string
  color: string
}

export const NETWORK_ALARMS = {
  limit: 1000,
  /** Cleared / end-of-alarm rows — omit from map pins. */
  excludeEventNames: ["Alarm Release"] as string[],
  bands: [
    { id: "mutation", eventName: "Mutation Alarm", label: "Mutation", color: "#EF4444" },
    { id: "disconnected", eventName: "Sensor Disconnected", label: "Disconnected", color: "#F97316" },
    { id: "threshold", eventName: "Threshold Alarm", label: "Threshold", color: "#FACC15" },
    { id: "tamper", eventName: "Tamper Triggered", label: "Tamper", color: "#A78BFA" },
    { id: "out-of-range", eventName: "Sensor Out Of Range", label: "Out of range", color: "#2DE0D2" },
  ] as NetworkAlarmBand[],
}

export function bandForNetworkAlarm(name: string | null | undefined): NetworkAlarmBand {
  const bands = NETWORK_ALARMS.bands
  const hit = bands.find((b) => b.eventName === name)
  return hit ?? bands[0]
}
