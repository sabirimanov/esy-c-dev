import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from "react"
import { useMapLayerEnabled } from "../wall/mapLayerControl"
import { UFG_BY_REGION, UFG_REGION_TO_GLB, ufgByRegionUrl } from "../wall/ufgByRegionConfig"
import { foldAz } from "../wall/placesGazetteer"
import type { MapOverlaySpec, OverlayLegendRow, OverlayRegionTint } from "../wall/mapOverlay"
import { useWallScope } from "../wall/wallScope"
import { MAP_CACHE_MS, mapCachedGetJson } from "./mapApiCache"
import { useLayerPoll } from "./useLayerPoll"

const POLL_MS = MAP_CACHE_MS

type ApiRow = {
  region?: string | null
  netUfgPct?: number | string | null
  grossUfgPct?: number | string | null
  color?: string | null
}

export type UfgByRegionState = {
  overlay: MapOverlaySpec
  legend: OverlayLegendRow[]
  updatedAt: number | null
  error: string | null
}

const empty: UfgByRegionState = {
  overlay: null,
  legend: [],
  updatedAt: null,
  error: null,
}

function num(v: unknown) {
  const n = typeof v === "number" ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

function shortRegion(title: string) {
  return title
    .replace(/\s*RQİİ\s*$/i, "")
    .replace(/\s*RQSD\s*$/i, "")
    .replace(/\s*Qİİ\s*$/i, "")
    .replace(/\s*QII\s*$/i, "")
    .trim()
}

function foldKey(text: string) {
  return foldAz(text)
    .replace(/ə/g, "e")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ğ/g, "g")
    .replace(/ç/g, "c")
    .replace(/ş/g, "s")
}

function glbIdFor(title: string): string | null {
  const f = foldKey(title)
  for (const row of UFG_REGION_TO_GLB) {
    if (f.includes(foldKey(row.match))) return row.regionId
  }
  return null
}

function parseHex(hex: string) {
  const h = hex.replace("#", "").trim()
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
  if (!/^[0-9a-fA-F]{6}$/.test(n)) return null
  return {
    r: parseInt(n.slice(0, 2), 16) / 255,
    g: parseInt(n.slice(2, 4), 16) / 255,
    b: parseInt(n.slice(4, 6), 16) / 255,
  }
}

/** Brighten / saturate a hex so it reads through the blue map texture. */
function boostHex(hex: string) {
  const rgb = parseHex(hex)
  if (!rgb) return hex
  const { sat: satMul, light: lightMul } = UFG_BY_REGION.colorBoost
  const max = Math.max(rgb.r, rgb.g, rgb.b)
  const min = Math.min(rgb.r, rgb.g, rgb.b)
  const l = (max + min) / 2
  const d = max - min
  let h = 0
  let s = 0
  if (d > 1e-6) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rgb.r:
        h = (rgb.g - rgb.b) / d + (rgb.g < rgb.b ? 6 : 0)
        break
      case rgb.g:
        h = (rgb.b - rgb.r) / d + 2
        break
      default:
        h = (rgb.r - rgb.g) / d + 4
    }
    h /= 6
  }
  s = Math.min(1, s * satMul)
  const L = Math.min(0.72, l * lightMul)
  const hue2rgb = (p: number, q: number, t: number) => {
    let T = t
    if (T < 0) T += 1
    if (T > 1) T -= 1
    if (T < 1 / 6) return p + (q - p) * 6 * T
    if (T < 1 / 2) return q
    if (T < 2 / 3) return p + (q - p) * (2 / 3 - T) * 6
    return p
  }
  let r: number
  let g: number
  let b: number
  if (s <= 1e-6) {
    r = g = b = L
  } else {
    const q = L < 0.5 ? L * (1 + s) : L + s - L * s
    const p = 2 * L - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  const to = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, "0")
  return `#${to(r)}${to(g)}${to(b)}`
}

/** API green for 0% → muted gray-green (“no data”). */
function fillColor(apiColor: string | null | undefined, pct: number) {
  if (Math.abs(pct) <= UFG_BY_REGION.zeroEps) return UFG_BY_REGION.zeroColor
  if (typeof apiColor === "string" && apiColor.trim()) return boostHex(apiColor.trim())
  return boostHex("#10b981")
}

function buildState(rows: ApiRow[]): UfgByRegionState {
  const regions: OverlayRegionTint[] = []
  const legend: OverlayLegendRow[] = []
  const intensity = UFG_BY_REGION.intensity
  const usedGlb = new Set<string>()

  for (const row of rows) {
    const title = typeof row.region === "string" && row.region.trim() ? row.region.trim() : null
    if (!title) continue
    const pct = num(row.grossUfgPct) ?? 0
    const color = fillColor(row.color, pct)
    const id = foldAz(title).replace(/\s+/g, "-") || title

    legend.push({
      id,
      label: `${shortRegion(title)} ${pct.toFixed(1)}%`,
      color,
    })

    const regionId = glbIdFor(title)
    if (!regionId || usedGlb.has(regionId)) continue
    usedGlb.add(regionId)
    // Always tint the full RQİİ mesh — including 0% (muted color).
    regions.push({ regionId, color, intensity })
  }

  const scale = legend.slice(0, 3)

  return {
    overlay: regions.length
      ? {
          kind: "region",
          title: "UFG by region",
          legend: scale,
          regions,
          polygons: [],
        }
      : null,
    legend: scale,
    updatedAt: Date.now(),
    error: null,
  }
}

async function fetchRows(force = false): Promise<ApiRow[]> {
  const body = await mapCachedGetJson<{ data?: ApiRow[] }>(ufgByRegionUrl(), { force })
  return Array.isArray(body.data) ? body.data : []
}

const Ctx = createContext<UfgByRegionState>(empty)

export function UfgByRegionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<UfgByRegionState>(empty)
  const enabled = useMapLayerEnabled("ufg-regions")
  const scope = useWallScope()

  useLayerPoll(enabled, scope, POLL_MS, async ({ force }) => {
    try {
      const rows = await fetchRows(force)
      setState(buildState(rows))
    } catch (err) {
      setState((current) => ({
        ...current,
        error: err instanceof Error ? err.message : "fetch failed",
      }))
    }
  })

  return createElement(Ctx.Provider, { value: state }, children)
}

export function useUfgByRegion(): UfgByRegionState {
  return useContext(Ctx)
}

export function useUfgByRegionOverlay(enabled: boolean): MapOverlaySpec {
  const state = useUfgByRegion()
  return useMemo(() => (enabled ? state.overlay : null), [enabled, state.overlay])
}
