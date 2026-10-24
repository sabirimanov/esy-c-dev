export type Tone = "ok" | "warn" | "bad" | "none"

export type Sample = { labels: Record<string, string>; value: number }

export type Panel = {
  format?: string
  status?: string
  value?: number
  den?: number
  thr?: { higher?: [number, number]; lower?: [number, number] }
  samples?: Sample[]
  series?: { points: [number, number][] }[]
  error?: string
}

export type Alert = {
  name: string
  severity?: string
  domain?: string
  host?: string
  summary?: string
  starts: number
}

export type Reading = {
  text: string
  tone: Tone
  value: number | null
  den: number | null
}

const TZ = "Asia/Baku"
const clockFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" })
const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short" })

export const TONE_COLOR: Record<Tone, string> = {
  ok: "#34efde",
  warn: "#f3c85b",
  bad: "#eb7d5c",
  none: "#2a3332",
}

export const SOURCE_NAME: Record<string, string> = {
  meter_data: "Meter Data",
  billing_sync: "Billing Sync",
  gis_sync: "GIS Sync",
  ai_model_input: "AI Model Input",
}

function sig3(x: number) {
  const a = Math.abs(x)
  return a >= 100 ? x.toFixed(0) : a >= 10 ? x.toFixed(1) : x.toFixed(2)
}

export function compact(v: number) {
  const a = Math.abs(v)
  if (a >= 1e9) return sig3(v / 1e9) + "B"
  if (a >= 1e6) return sig3(v / 1e6) + "M"
  if (a >= 1e4) return sig3(v / 1e3) + "K"
  if (a < 100 && Math.abs(v - Math.round(v)) >= 0.05) return v.toFixed(1)
  return Math.round(v).toLocaleString("en-US")
}

export function duration(s: number) {
  if (s < 10) return s.toFixed(2) + " sec"
  if (s < 90) return Math.round(s) + " sec"
  if (s < 600) return (s / 60).toFixed(1) + " min"
  if (s < 5400) return Math.round(s / 60) + " min"
  if (s < 172800) return Math.round(s / 3600) + " hrs"
  return Math.round(s / 86400) + "d"
}

export function fmt(v: number, format?: string, den?: number | null) {
  switch (format) {
    case "percent": {
      const p = v * 100
      return (p >= 99.9 && p < 100 ? p.toFixed(2) : p.toFixed(1)) + "%"
    }
    case "count":
      return compact(v)
    case "ms":
      return Math.round(v * 1000) + " ms"
    case "duration":
      return duration(v)
    case "clock":
      return clockFmt.format(new Date(v * 1000))
    case "fraction":
      return `${compact(v)} / ${compact(den ?? 0)}`
    case "state":
      return ["Down", "Degraded", "Healthy"][clampState(v)]
    case "state01":
      return v >= 1 ? "Operational" : "Down"
    case "deptext":
      return ["Down", "1 Degraded", "All Healthy"][clampState(v)]
    default:
      return String(v)
  }
}

export function clampState(v: number) {
  return Math.max(0, Math.min(2, Math.round(v)))
}

export function level(v: number, panel: Panel | undefined, den?: number | null): Tone {
  if (!panel) return "none"
  const format = panel.format
  if (format === "state" || format === "deptext") return (["bad", "warn", "ok"] as const)[clampState(v)]
  if (format === "state01") return v >= 1 ? "ok" : "bad"
  if (format === "fraction") {
    const d = den ?? panel.den ?? 0
    return v >= d ? "ok" : v >= d - 1 ? "warn" : "bad"
  }
  const t = panel.thr
  if (!t) return "ok"
  if (t.higher) return v >= t.higher[0] ? "ok" : v >= t.higher[1] ? "warn" : "bad"
  if (t.lower) return v <= t.lower[0] ? "ok" : v <= t.lower[1] ? "warn" : "bad"
  return "ok"
}

export function findSample(panel: Panel | undefined, match: Record<string, string>) {
  return (panel?.samples || []).find((sample) =>
    Object.entries(match).every(([key, value]) => (sample.labels[key] || "").toLowerCase() === value.toLowerCase()),
  )
}

export function readPanel(panel: Panel | undefined, match?: Record<string, string>): Reading {
  if (!panel) return { text: "—", tone: "none", value: null, den: null }
  let value: number | null = null
  let den: number | null = panel.den ?? null
  if (match) {
    const hit = findSample(panel, match)
    value = hit ? hit.value : null
  } else if (panel.value !== undefined && panel.value !== null) {
    value = panel.value
  }
  if (value === null) return { text: "—", tone: "none", value: null, den }
  return { text: fmt(value, panel.format, den), tone: level(value, panel, den), value, den }
}

export function clock(unix: number) {
  return clockFmt.format(new Date(unix * 1000))
}

export function dayLabel(unix: number) {
  return dayFmt.format(new Date(unix * 1000))
}

export function tagOf(tone: Tone) {
  if (tone === "bad") return "High"
  if (tone === "warn") return "Med"
  if (tone === "ok") return "Low"
  return "—"
}
