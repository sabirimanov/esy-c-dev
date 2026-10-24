import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { readPanel, type Alert, type Panel, type Reading, type Sample } from "./format"

const URL = "/socnoc/monitoring/screen1/api/dashboard?range=now"
const POLL_MS = 10_000

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
  read: (key: string, match?: Record<string, string>) => Reading
  samples: (key: string) => Sample[]
  series: (key: string) => [number, number][]
}

const DashContext = createContext<Dash | null>(null)

export function SnocProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Payload | null>(null)

  useEffect(() => {
    let stop = false
    async function load() {
      try {
        const res = await fetch(URL, { cache: "no-store" })
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
  }, [])

  const value = useMemo<Dash>(() => {
    const panels = data?.panels ?? {}
    return {
      ready: data !== null,
      live: Boolean(data?.live),
      alerts: data?.alerts ?? [],
      read: (key, match) => readPanel(panels[key], match),
      samples: (key) => panels[key]?.samples ?? [],
      series: (key) => panels[key]?.series?.[0]?.points ?? [],
    }
  }, [data])

  return <DashContext.Provider value={value}>{children}</DashContext.Provider>
}

export function useDash() {
  const value = useContext(DashContext)
  if (!value) throw new Error("useDash outside SnocProvider")
  return value
}
