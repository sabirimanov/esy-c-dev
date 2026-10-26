import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react"

export type AlertScroll = "step" | "smooth"

const AlertScrollContext = createContext<AlertScroll>("step")

export function AlertScrollProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AlertScroll>("step")
  useEffect(() => {
    let stop = false
    async function load() {
      try {
        const res = await fetch("/display", { cache: "no-store" })
        if (!res.ok) return
        const body = (await res.json()) as { alertScroll?: string }
        if (!stop) setMode(body.alertScroll === "smooth" ? "smooth" : "step")
      } catch {
        /* keep the last mode */
      }
    }
    load()
    const id = window.setInterval(load, 2000)
    return () => {
      stop = true
      window.clearInterval(id)
    }
  }, [])
  return <AlertScrollContext.Provider value={mode}>{children}</AlertScrollContext.Provider>
}

export function useAlertScroll() {
  return useContext(AlertScrollContext)
}

const ALERT_PX_PER_MS = 88 / 2000

export function alertRowMs(rowHeight: number) {
  const height = rowHeight > 0 ? rowHeight : 88
  return Math.round(height / ALERT_PX_PER_MS)
}

export function useSmoothTrack(active: boolean, count: number, stepMs: number, span: number) {
  const track = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!active || count <= 0 || span <= 0) return
    let frame = 0
    const period = stepMs * count
    function tick() {
      const node = track.current
      if (node) {
        const y = ((Date.now() % period) / period) * span
        node.style.transform = `translate3d(0, ${-y}px, 0)`
      }
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => {
      window.cancelAnimationFrame(frame)
      if (track.current) track.current.style.transform = ""
    }
  }, [active, count, stepMs, span])
  return track
}
