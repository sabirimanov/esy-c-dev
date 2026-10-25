import { useMemo } from "react"
import base from "./content.json"
import { useWall } from "../wall/useWall"

export type Content = typeof base

const keepKeys = new Set(["label", "title", "hint", "id", "region", "tone", "action", "city", "risk", "republic", "cluster", "rangeLabel"])
const pathKeys = new Set(["forecastPath", "cyanPath", "goldPath"])

function mulberry32(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function firstNumber(input: string) {
  const match = input.match(/\d[\d,]*(?:\.\d+)?/)
  return match ? Number(match[0].replace(/,/g, "")) : null
}

function formatNumber(n: number, decimals: number, commas: boolean) {
  const fixed = n.toFixed(decimals)
  if (!commas) return fixed
  const [whole, frac] = fixed.split(".")
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return frac ? `${grouped}.${frac}` : grouped
}

function jitterText(input: string, rnd: () => number) {
  return input.replace(/(\d[\d,]*(?:\.\d+)?)(\s*%)?/g, (_full, token: string, pct?: string) => {
    const commas = token.includes(",")
    const decimals = token.includes(".") ? token.split(".")[1].length : 0
    const n = Number(token.replace(/,/g, ""))
    if (!Number.isFinite(n) || n === 0) return `${token}${pct ?? ""}`
    let next = n
    if (pct && decimals === 0 && n <= 30) {
      const step = 1 + Math.floor(rnd() * 3)
      next = n + (rnd() < 0.5 ? -step : step)
    } else if (!pct && decimals === 0 && n > 0 && n < 1000) {
      const step = Math.max(1, Math.round(n * 0.15))
      next = n + (rnd() < 0.5 ? -step : step)
    } else {
      next = n * (0.88 + rnd() * 0.24)
    }
    if (pct) next = Math.max(0, n > 100 ? next : Math.min(100, next))
    else next = Math.max(0, next)
    let formatted = formatNumber(next, decimals, commas)
    if (Number(formatted.replace(/,/g, "")) === n && n !== 0) {
      const bump = decimals ? 1 / 10 ** decimals : 1
      const cap = pct && n <= 100 ? 100 : n + bump
      formatted = formatNumber(Math.min(cap, n + bump), decimals, commas)
    }
    return `${formatted}${pct ?? ""}`
  })
}

function jitterTime(input: string, rnd: () => number) {
  const match = input.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return jitterText(input, rnd)
  const mins = (Number(match[1]) * 60 + Number(match[2]) + Math.round((rnd() - 0.5) * 50) + 1440) % 1440
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`
}

function nudgePath(d: string, rnd: () => number) {
  return d.replace(/([ML])(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, cmd, x, y) => {
    const ny = Math.max(2, Number(y) + (rnd() - 0.5) * 16)
    return `${cmd}${x} ${ny.toFixed(1)}`
  })
}

function jitterSeries(key: string, values: number[], rnd: () => number) {
  return values.map((n) => {
    const next = n * (0.9 + rnd() * 0.2)
    if (key === "series" || key === "previous") return Math.min(9.6, Math.max(0.4, Number(next.toFixed(2))))
    if (key === "actualY") return Math.min(360, Math.max(4, Number(next.toFixed(1))))
    return Number(next.toFixed(2))
  })
}

function rescaleShare(items: { value: string; width: number }[], rnd: () => number) {
  const original = items.map((item) => firstNumber(item.value) || 0)
  const jittered = original.map((n) => n * (0.82 + rnd() * 0.36))
  const sumJ = jittered.reduce((sum, n) => sum + n, 0) || 1
  const sumO = original.reduce((sum, n) => sum + n, 0) || 1
  const sumW = items.reduce((sum, item) => sum + item.width, 0)
  const nextWidths = items.map((item, index) => (original[index] ? (item.width * jittered[index] * sumO) / sumJ / original[index] : item.width))
  const sumN = nextWidths.reduce((sum, n) => sum + n, 0) || 1
  items.forEach((item, index) => {
    const n = (jittered[index] * sumO) / sumJ
    const numeric = item.value.match(/\d[\d,]*(?:\.\d+)?/)
    const decimals = numeric?.[0].includes(".") ? (numeric[0].split(".")[1]?.length ?? 0) : 0
    item.value = `${n.toFixed(decimals)}%`
    item.width = Math.max(8, Math.round((nextWidths[index] * sumW) / sumN))
  })
}

function vary(source: Content, seed: number): Content {
  const rnd = mulberry32(seed)
  const copy = structuredClone(source) as Content

  const walk = (node: unknown, key: string | null) => {
    if (key === "regions" || key === "periods") return
    if (Array.isArray(node)) {
      if (key === "share") {
        rescaleShare(node as { value: string; width: number }[], rnd)
        return
      }
      for (const item of node) walk(item, null)
      return
    }
    if (!node || typeof node !== "object") return
    const record = node as Record<string, unknown>
    const before = typeof record.value === "string" ? firstNumber(record.value) : null
    for (const childKey of Object.keys(record)) {
      const child = record[childKey]
      if (pathKeys.has(childKey) && typeof child === "string") {
        record[childKey] = nudgePath(child, rnd)
        continue
      }
      if (childKey === "ring" && typeof child === "number") {
        record[childKey] = Math.min(0.995, Math.max(0.88, Number((child * (0.97 + rnd() * 0.06)).toFixed(3))))
        continue
      }
      if (typeof child === "string") {
        if (keepKeys.has(childKey)) continue
        record[childKey] = /^\d{1,2}:\d{2}$/.test(child) ? jitterTime(child, rnd) : jitterText(child, rnd)
        continue
      }
      if (Array.isArray(child) && child.length > 0 && child.every((item) => typeof item === "number")) {
        record[childKey] = jitterSeries(childKey, child, rnd)
        continue
      }
      walk(child, childKey)
    }
    const after = typeof record.value === "string" ? firstNumber(record.value) : null
    for (const barKey of ["fill", "fillH"] as const) {
      if (typeof record[barKey] !== "number") continue
      const track = typeof record.track === "number" ? record.track : Infinity
      const baseWidth = record[barKey] as number
      const scaled = before && after && before > 0 ? Math.round((baseWidth * after) / before) : Math.round(baseWidth * (0.85 + rnd() * 0.3))
      record[barKey] = Math.max(4, Math.min(track, scaled))
    }
  }

  walk(copy, null)
  return copy
}

export function useContent() {
  const { state } = useWall()
  return useMemo(() => (state.seed ? vary(base, state.seed) : base), [state.seed])
}
