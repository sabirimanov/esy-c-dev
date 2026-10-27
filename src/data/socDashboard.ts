import { useEffect, useState } from "react"
import { readPanel, type Panel } from "../snoc/format"

const BASE_URL = String(import.meta.env.VITE_SOC_DASHBOARD_URL || "/socnoc/monitoring/screen1/api/dashboard").replace(/^https?:\/\/127\.0\.0\.1:8443\/api\/dashboard$/, "/soc-live")
const URL = `${BASE_URL}?range=now`
const POLL_MS = 10_000

export function useSocPanel() {
  const [panels, setPanels] = useState<Record<string, Panel> | null>(null)

  useEffect(() => {
    let stop = false
    async function load() {
      try {
        const res = await fetch(URL, { cache: "no-store" })
        if (!res.ok) throw new Error(String(res.status))
        const body = (await res.json()) as { panels?: Record<string, Panel> }
        if (!stop) setPanels(body.panels ?? {})
      } catch {
        // keep the last payload
      }
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [])

  return (key: string) => readPanel(panels?.[key]).text
}
