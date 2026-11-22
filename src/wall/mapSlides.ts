/** Carousel / map slide registry. Live: calls, exceedance, offline, repeated, tampering, network alarms, UFG. */

export type MapSlideId =
  | "emergency-calls"
  | "consumption-exceedance"
  | "meters-offline"
  | "low-battery"
  | "repeated-readings"
  | "meter-alarms"
  | "meter-anomalies"
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
  /** false → disabled in Single dropdown, omitted from carousel. Default true. */
  enabled?: boolean
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
  {
    id: "meters-offline",
    title: "Meters offline >3 days",
    kind: "points",
    source:
      "POST /newapi/hub/esyduckdb/db/query · meters_signal.daily vs MAX(RTC) − 3 days ∩ devices",
  },
  { id: "low-battery", title: "Battery <10%", kind: "points", source: null, enabled: false },
  {
    id: "repeated-readings",
    title: "Meters with repeated readings (>3 days)",
    kind: "points",
    source: "POST /newapi/hub/esyduckdb/db/query · meters_signal.daily identical Total vb streak ≥3",
  },
  {
    id: "meter-alarms",
    title: "Meter tampering events",
    kind: "points",
    source: 'GET /newapi/hub/esyduckdb/db/rows?schema=tampering_events&table=Combined+Events',
  },
  {
    id: "meter-anomalies",
    title: "Meter anomalies",
    kind: "points",
    source: "POST /newapi/hub/esyduckdb/db/query · anomalies.{abnormal_high,abnormal_low,overflow,zero_consumption}",
  },
  {
    id: "network-alarms",
    title: "Network alarms",
    kind: "points",
    source:
      "POST /newapi/hub/esyduckdb/db/query · sensor_data.sensor_alarms ⋈ sensor_master (lat/lon)",
  },
  {
    id: "network-pressure",
    title: "Network pressure",
    kind: "points",
    source:
      "POST /newapi/hub/esyduckdb/db/query · sensor_readings Pressure · ±50% vs 7d same-hour OR zero ≥8h",
  },
  {
    id: "ufg-regions",
    title: "UFG by region",
    kind: "region",
    source: "GET /newapi/hub/ufg/api/v2/ufg/by-region?year=2026&month=10",
  },
  {
    id: "dominant-meter-issue",
    title: "Dominant smart-meter issue",
    kind: "points",
    source: null,
    enabled: false,
  },
]

/** Slides that rotate in Carousel mode. */
export const CAROUSEL_SLIDES: MapSlide[] = MAP_SLIDES.filter((s) => s.enabled !== false)

export const DEFAULT_SLIDE_ID: MapSlideId = "emergency-calls"

/** Carousel dwell time per slide (ms). Shared by clock + overlay fade. */
export const SLIDE_MS = 10_000

export function slideById(id: string | null | undefined): MapSlide {
  return MAP_SLIDES.find((s) => s.id === id) ?? MAP_SLIDES[0]
}

export function slidesMissingSource(): MapSlide[] {
  return MAP_SLIDES.filter((s) => !s.source)
}
