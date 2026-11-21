import { BILLING_REGIONS } from "./billingRegions"
import { projectLatLng } from "./geo"
import type { MapOverlaySpec, OverlayLegendRow, OverlayPoint } from "./mapOverlay"
import type { MapSlideId } from "./mapSlides"
import { MAP_SLIDES } from "./mapSlides"

/** Deterministic pseudo-random 0..1 from string. */
function hash01(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return ((h >>> 0) % 10000) / 10000
}

const GLB_REGIONS = [
  "baku",
  "absheron-khizi",
  "guba-khachmaz",
  "daghlig-shirvan",
  "sheki-zagatala",
  "central-aran",
  "karabakh",
  "ganja-dashkasan",
  "gazakh-tovuz",
  "east-zangezur",
  "mil-mughan",
  "shirvan-salyan",
  "lankaran-astara",
  "nakhchivan",
] as const

const SLIDE_STYLE: Record<
  MapSlideId,
  { color: string; legend: OverlayLegendRow[]; kind: "points" | "heatmap" | "region" }
> = {
  "emergency-calls": { color: "#EF4444", legend: [], kind: "points" },
  "consumption-exceedance": {
    color: "#F97316",
    legend: [
      { id: "low", label: "1–3 hours", color: "#EAB308" },
      { id: "mid", label: "4–12 hours", color: "#F97316" },
      { id: "high", label: "13+ hours", color: "#EF4444" },
    ],
    kind: "points",
  },
  "meters-offline": {
    color: "#A78BFA",
    legend: [{ id: "offline", label: "Offline >3 days", color: "#A78BFA" }],
    kind: "points",
  },
  "low-battery": {
    color: "#FACC15",
    legend: [{ id: "battery", label: "Battery <10%", color: "#FACC15" }],
    kind: "points",
  },
  "repeated-readings": {
    color: "#22D3EE",
    legend: [{ id: "repeat", label: "Repeated readings", color: "#22D3EE" }],
    kind: "points",
  },
  "meter-alarms": {
    color: "#EF4444",
    legend: [{ id: "alarm", label: "Alarm density", color: "#EF4444" }],
    kind: "heatmap",
  },
  "network-alarms": {
    color: "#FB7185",
    legend: [
      { id: "crit", label: "Critical", color: "#EF4444" },
      { id: "warn", label: "Warning", color: "#F97316" },
    ],
    kind: "points",
  },
  "network-pressure": {
    color: "#C084FC",
    legend: [{ id: "pressure", label: "Pressure hotspots", color: "#F97316" }],
    kind: "heatmap",
  },
  "ufg-regions": {
    color: "#E879F9",
    legend: [
      { id: "hi", label: "UFG high", color: "#F97316" },
      { id: "mid", label: "UFG mid", color: "#C084FC" },
      { id: "lo", label: "UFG low", color: "#38BDF8" },
    ],
    kind: "region",
  },
  "dominant-meter-issue": {
    color: "#F97316",
    legend: [
      { id: "exceed", label: "Exceedance", color: "#F97316" },
      { id: "offline", label: "Offline", color: "#A78BFA" },
      { id: "battery", label: "Low battery", color: "#FACC15" },
      { id: "repeat", label: "Repeated", color: "#22D3EE" },
    ],
    kind: "points",
  },
}

function sampleCenters(slideId: string, n: number) {
  const picks: { lat: number; lon: number; label: string }[] = []
  for (let i = 0; i < BILLING_REGIONS.length && picks.length < n; i++) {
    const row = BILLING_REGIONS[Math.floor(hash01(`${slideId}:${i}`) * BILLING_REGIONS.length)]
    if (!row) continue
    if (picks.some((p) => p.label === row.region)) continue
    if (hash01(`${slideId}:${row.region}`) < 0.35) continue
    picks.push({ lat: row.center.lat, lon: row.center.lon, label: row.region.replace(/ District| City/gi, "") })
  }
  // pad
  while (picks.length < Math.min(n, BILLING_REGIONS.length)) {
    const row = BILLING_REGIONS[picks.length % BILLING_REGIONS.length]
    picks.push({ lat: row.center.lat, lon: row.center.lon, label: row.region.replace(/ District| City/gi, "") })
  }
  return picks
}

function mockPoints(slideId: MapSlideId, color: string, countHint: number): OverlayPoint[] {
  const centers = sampleCenters(slideId, countHint)
  const multi = slideId === "dominant-meter-issue" || slideId === "network-alarms"
  const palette =
    slideId === "dominant-meter-issue"
      ? ["#F97316", "#A78BFA", "#FACC15", "#22D3EE"]
      : slideId === "network-alarms"
        ? ["#EF4444", "#F97316"]
        : [color]
  return centers.map((c, index) => {
    const mesh = projectLatLng(c.lat, c.lon)
    if (!mesh) return null
    const tone = palette[index % palette.length]
    const count = 1 + Math.floor(hash01(`${slideId}:n:${index}`) * 40)
    return {
      id: `${slideId}:${index}`,
      x: mesh.x,
      z: mesh.z,
      color: tone,
      count,
      approx: hash01(`${slideId}:a:${index}`) > 0.7,
      label: c.label,
      statusId: multi ? String(index % palette.length) : "1",
      statusTitle: SLIDE_STYLE[slideId].legend[index % Math.max(SLIDE_STYLE[slideId].legend.length, 1)]?.label ?? slideId,
      nos: [`MOCK-${index + 1}`],
    } satisfies OverlayPoint
  }).filter((p): p is OverlayPoint => Boolean(p))
}

/** Build mock overlay for slides without a live API yet. */
export function mockOverlayForSlide(slideId: MapSlideId, opacity = 1): MapOverlaySpec {
  const slide = MAP_SLIDES.find((s) => s.id === slideId) ?? MAP_SLIDES[0]
  const style = SLIDE_STYLE[slideId]
  if (style.kind === "heatmap") {
    const centers = sampleCenters(slideId, 18)
    return {
      kind: "heatmap",
      title: slide.title,
      legend: style.legend,
      opacity,
      heat: centers.map((c, index) => {
        const mesh = projectLatLng(c.lat, c.lon)
        if (!mesh) return null
        return {
          id: `${slideId}:h:${index}`,
          x: mesh.x,
          z: mesh.z,
          weight: 0.4 + hash01(`${slideId}:w:${index}`),
          color: hash01(`${slideId}:c:${index}`) > 0.5 ? "#F97316" : style.color,
        }
      }).filter((x): x is NonNullable<typeof x> => Boolean(x)),
    }
  }
  if (style.kind === "region") {
    const colors = ["#38BDF8", "#C084FC", "#F97316", "#22C55E"]
    return {
      kind: "region",
      title: slide.title,
      legend: style.legend,
      opacity,
      regions: GLB_REGIONS.map((regionId, index) => ({
        regionId,
        color: colors[Math.floor(hash01(`${slideId}:${regionId}`) * colors.length)],
        intensity: 0.35 + hash01(`${slideId}:i:${index}`) * 0.4,
      })),
    }
  }
  const points = mockPoints(slideId, style.color, slideId === "network-alarms" ? 14 : 22)
  return {
    kind: "points",
    title: slide.title,
    legend: style.legend.map((row) => ({
      ...row,
      count: points.filter((p) => p.statusTitle === row.label || p.color === row.color).length || undefined,
    })),
    opacity,
    points,
  }
}
