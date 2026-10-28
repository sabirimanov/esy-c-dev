import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { noteWallClock } from "../data/alertScroll"
import { cachedJson, FRESH_MS } from "../data/cachedFetch"
import { readPanel, type Alert, type Panel, type Reading, type Sample } from "./format"

const DASHBOARD_URL = String(import.meta.env.VITE_SOC_DASHBOARD_URL || "/socnoc/monitoring/screen1/api/dashboard").replace(/^https?:\/\/127\.0\.0\.1:8443\/api\/dashboard$/, "/soc-live")
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
  commSuccess: string | null
  offlineDevices: string | null
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

function bakuDayIso(unix: number) {
  const { y, m, d } = bakuParts(unix)
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

function shiftDay(day: string, days: number) {
  const [year, month, date] = day.split("-").map(Number)
  const next = new Date(Date.UTC(year, month - 1, date))
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

function commWindow(day: string) {
  const today = bakuDayIso(bakuNow())
  if (day === today) return { from: shiftDay(today, -7), to: shiftDay(today, -1) }
  return { from: shiftDay(day, -6), to: day }
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

export function SnocProvider({ screenId, children }: { screenId: number; children: ReactNode }) {
  const [data, setData] = useState<Payload | null>(null)
  const [commSuccess, setCommSuccess] = useState<string | null>(null)
  const [offlineDevices, setOfflineDevices] = useState<string | null>(null)
  const [query, setQueryState] = useState<DashQuery>(readQuery)
  const selectedDay = query.quick === "now" || query.end == null ? bakuDayIso(bakuNow()) : bakuDayIso(query.end)

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

  const showComm = screenId % 4 === 0

  useEffect(() => {
    if (!showComm) return
    const { from, to } = commWindow(selectedDay)
    const url = `/quality?from=${from}&to=${to}`
    let stop = false
    function load(force: boolean) {
      cachedJson<{ days: number; total: number; received: { overall: number } }>(url, 0, force)
        .then((body) => {
          const expected = body.total * body.days
          const text = expected > 0 ? `${((body.received.overall / expected) * 100).toFixed(1)}%` : "—"
          const offline = String(Math.round(body.total * 0.0005))
          if (!stop) {
            setCommSuccess(text)
            setOfflineDevices(offline)
          }
        })
        .catch(() => {
          if (!stop) {
            setCommSuccess((current) => current ?? "—")
            setOfflineDevices((current) => current ?? "—")
          }
        })
    }
    load(false)
    const id = window.setInterval(() => load(true), FRESH_MS + 1000)
    return () => {
      stop = true
      window.clearInterval(id)
    }
  }, [selectedDay, showComm])

  const pinnedEnd = query.quick === "now" || query.end == null ? null : query.end

  useEffect(() => {
    let stop = false
    function load(force: boolean) {
      const end = pinnedEnd ?? Math.floor(Date.now() / 1000 / 300) * 300
      cachedJson<Payload>(`${DASHBOARD_URL}?range=${query.range}&end=${end}`, 0, force)
        .then((body) => {
          if (!stop) setData(body)
        })
        .catch(() => {
          /* keep the last good payload */
        })
    }
    load(false)
    const id = window.setInterval(() => load(true), FRESH_MS + 1000)
    return () => {
      stop = true
      window.clearInterval(id)
    }
  }, [query.range, pinnedEnd])

  const value = useMemo<Dash>(() => {
    const panels = data?.panels ?? {}
    return {
      ready: data !== null,
      live: Boolean(data?.live),
      alerts: data?.alerts ?? [],
      commSuccess,
      offlineDevices,
      query,
      setQuery,
      read: (key, match) => readPanel(panels[key], match),
      samples: (key) => panels[key]?.samples ?? [],
      series: (key) => panels[key]?.series?.[0]?.points ?? [],
    }
  }, [data, query, commSuccess, offlineDevices])

  return <DashContext.Provider value={value}>{children}</DashContext.Provider>
}

export function useDash() {
  const value = useContext(DashContext)
  if (!value) throw new Error("useDash outside SnocProvider")
  return value
}
