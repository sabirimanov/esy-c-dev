/** Carousel / map slide registry. Live: Emergency Calls + consumption exceedance. */

export type MapSlideId =
  | "emergency-calls"
  | "consumption-exceedance"
  | "meters-offline"
  | "low-battery"
  | "repeated-readings"
  | "meter-alarms"
  | "network-alarms"
  | "network-pressure"
  | "ufg-regions"
  | "dominant-meter-issue"

export type MapSlide = {
  id: MapSlideId
  title: string
  kind: "points" | "heatmap" | "region"
  /** Live data source, or null when not wired yet. */
  source: string | null
}

export const MAP_SLIDES: MapSlide[] = [
  {
    id: "emergency-calls",
    title: "Emergency Calls",
    kind: "points",
    source: "GET /newapi/hub/mfs/api/v1/integration/accident-call/recent",
  },
  {
    id: "consumption-exceedance",
    title: "Meters exceeding hourly consumption",
    kind: "points",
    source: "GET /newapi/hub/esyduckdb/db/rows?schema=anomalies&table=abnormal_high&limit=1000&ym=2026-10",
  },
  { id: "meters-offline", title: "Meters offline >3 days", kind: "points", source: null },
  { id: "low-battery", title: "Battery <10%", kind: "points", source: null },
  { id: "repeated-readings", title: "Repeated readings", kind: "points", source: null },
  { id: "meter-alarms", title: "Meter alarms", kind: "heatmap", source: null },
  { id: "network-alarms", title: "Network alarms", kind: "points", source: null },
  { id: "network-pressure", title: "Network pressure", kind: "heatmap", source: null },
  { id: "ufg-regions", title: "UFG by region", kind: "region", source: null },
  { id: "dominant-meter-issue", title: "Dominant smart-meter issue", kind: "points", source: null },
]

export const DEFAULT_SLIDE_ID: MapSlideId = "emergency-calls"

export function slideById(id: string | null | undefined): MapSlide {
  return MAP_SLIDES.find((s) => s.id === id) ?? MAP_SLIDES[0]
}

export function slidesMissingSource(): MapSlide[] {
  return MAP_SLIDES.filter((s) => !s.source)
}
