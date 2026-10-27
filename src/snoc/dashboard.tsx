import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { noteWallClock } from "../data/alertScroll"
import { readPanel, type Alert, type Panel, type Reading, type Sample } from "./format"

const DASHBOARD_URL = String(import.meta.env.VITE_SOC_DASHBOARD_URL || "/socnoc/monitoring/screen1/api/dashboard").replace(/^https?:\/\/127\.0\.0\.1:8443\/api\/dashboard$/, "/soc-live")
const POLL_MS = 10_000
const STORAGE = "snoc-dashboard-query"
const BAKU = 4 * 3600

export type DashRange = "24h" | "7d"
export type DashTab = "day" | "month" | "year" | "range"
export type DashQuick = "now" | "yesterday" | "custom"

export type DashQuery = {
  range: DashRange
  end: number | null
  tab: DashTab
  quick: DashQuick
  viewY: number
  viewM: number
}

type Payload = {
  live?: boolean
  alerts?: Alert[]
  alerts_ok?: boolean
  panels?: Record<string, Panel>
}

type Dash = {
  ready: boolean
  live: boolean
  alerts: Alert[]
  query: DashQuery
  setQuery: (next: DashQuery) => void
  read: (key: string, match?: Record<string, string>) => Reading
  samples: (key: string) => Sample[]
  series: (key: string) => [number, number][]
}

const DashContext = createContext<Dash | null>(null)

export function bakuNow() {
  return Math.floor(Date.now() / 1000)
}

export function bakuParts(unix: number) {
  const date = new Date((unix + BAKU) * 1000)
  return { y: date.getUTCFullYear(), m: date.getUTCMonth(), d: date.getUTCDate() }
}

export function bakuToday() {
  return bakuParts(bakuNow())
}

export function endOfBakuDay(y: number, m: number, day: number) {
  return Math.floor(Date.UTC(y, m, day, 23, 59, 59) / 1000) - BAKU
}

function sameQuery(a: DashQuery, b: DashQuery) {
  return a.range === b.range && a.end === b.end && a.tab === b.tab && a.quick === b.quick && a.viewY === b.viewY && a.viewM === b.viewM
}

function snocFromSync(raw: Record<string, unknown>): DashQuery | null {
  if (raw.snocRange !== "24h" && raw.snocRange !== "7d") return null
  const tab = raw.snocTab === "day" || raw.snocTab === "month" || raw.snocTab === "year" || raw.snocTab === "range" ? raw.snocTab : "range"
  const quick = raw.snocQuick === "now" || raw.snocQuick === "yesterday" || raw.snocQuick === "custom" ? raw.snocQuick : "now"
  const end = raw.snocEnd === null ? null : Number.isInteger(raw.snocEnd) && (raw.snocEnd as number) > 0 ? (raw.snocEnd as number) : null
  const today = bakuToday()
  const viewY = Number.isInteger(raw.snocViewY) ? (raw.snocViewY as number) : today.y
  const viewM = Number.isInteger(raw.snocViewM) && (raw.snocViewM as number) >= 0 && (raw.snocViewM as number) <= 11 ? (raw.snocViewM as number) : today.m
  return { range: raw.snocRange, end, tab, quick, viewY, viewM }
}

function readQuery(): DashQuery {
  const today = bakuToday()
  const base: DashQuery = { range: "7d", end: null, tab: "range", quick: "now", viewY: today.y, viewM: today.m }
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE) || "") as Partial<DashQuery>
    const tab = raw.tab === "day" || raw.tab === "month" || raw.tab === "year" || raw.tab === "range" ? raw.tab : base.tab
    const quick = raw.quick === "now" || raw.quick === "yesterday" || raw.quick === "custom" ? raw.quick : base.quick
    return {
      range: raw.range === "24h" || raw.range === "7d" ? raw.range : base.range,
      end: Number.isInteger(raw.end) && (raw.end as number) > 0 ? (raw.end as number) : null,
      tab,
      quick,
      viewY: Number.isInteger(raw.viewY) ? (raw.viewY as number) : base.viewY,
      viewM: Number.isInteger(raw.viewM) && (raw.viewM as number) >= 0 && (raw.viewM as number) <= 11 ? (raw.viewM as number) : base.viewM,
    }
  } catch {
    return base
  }
}

export function SnocProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Payload | null>(null)
  const [query, setQueryState] = useState<DashQuery>(readQuery)

  function setQuery(next: DashQuery) {
    setQueryState(next)
    localStorage.setItem(STORAGE, JSON.stringify(next))
    void fetch("/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        snocRange: next.range,
        snocEnd: next.end,
        snocTab: next.tab,
        snocQuick: next.quick,
        snocViewY: next.viewY,
        snocViewM: next.viewM,
      }),
    })
  }

  useEffect(() => {
    const source = new EventSource("/sync")
    source.onmessage = (event) => {
      const raw = JSON.parse(event.data) as Record<string, unknown>
      if (typeof raw.now === "number") noteWallClock(raw.now)
      const next = snocFromSync(raw)
      if (!next) return
      localStorage.setItem(STORAGE, JSON.stringify(next))
      setQueryState((current) => (sameQuery(current, next) ? current : next))
    }
    return () => source.close()
  }, [])

  useEffect(() => {
    let stop = false
    async function load() {
      const end = query.end ?? bakuNow()
      try {
        const res = await fetch(`${DASHBOARD_URL}?range=${query.range}&end=${end}`, { cache: "no-store" })
        if (!res.ok) throw new Error(String(res.status))
        const body = (await res.json()) as Payload
        if (!stop) setData(body)
      } catch {
        /* keep the last good payload */
      }
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [query.range, query.end])

  const value = useMemo<Dash>(() => {
    const panels = data?.panels ?? {}
    return {
      ready: data !== null,
      live: Boolean(data?.live),
      alerts: data?.alerts ?? [],
      query,
      setQuery,
      read: (key, match) => readPanel(panels[key], match),
      samples: (key) => panels[key]?.samples ?? [],
      series: (key) => panels[key]?.series?.[0]?.points ?? [],
    }
  }, [data, query])

  return <DashContext.Provider value={value}>{children}</DashContext.Provider>
}

export function useDash() {
  const value = useContext(DashContext)
  if (!value) throw new Error("useDash outside SnocProvider")
  return value
}
