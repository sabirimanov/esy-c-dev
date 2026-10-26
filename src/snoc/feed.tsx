import { useEffect, useMemo, useState } from "react"
import { alertRowMs, useAlertScroll, useSmoothTrack, wallNow } from "../data/alertScroll"
import { useDash } from "./dashboard"
import { clock, type Alert } from "./format"

const SLOTS = [1208, 1296, 1384, 1472, 1560, 1648, 1736, 1824, 1912, 2000, 2088, 2176, 2256, 2344, 2432, 2520, 2608, 2696, 2784, 2872, 2960, 3048, 3136]
const ROW_H = 88
const ROW_MS = alertRowMs(ROW_H)

const SEV: Record<string, { label: string; fg: string; bg: string }> = {
  critical: { label: "CRITICAL", fg: "#ff765e", bg: "#41211e" },
  high: { label: "HIGH", fg: "#ffb14f", bg: "#40301a" },
  medium: { label: "MEDIUM", fg: "#f3c85b", bg: "#3a3214" },
  low: { label: "INFO", fg: "#2ee0d3", bg: "#123b38" },
  info: { label: "INFO", fg: "#2ee0d3", bg: "#123b38" },
}

export function tallyAlerts(alerts: Alert[]) {
  let critical = 0
  let high = 0
  let info = 0
  for (const alert of alerts) {
    const severity = alert.severity || "low"
    if (severity === "critical") critical += 1
    else if (severity === "high") high += 1
    else if (severity === "low" || severity === "info") info += 1
  }
  return { critical, high, info }
}

function useFeedOffset(length: number) {
  const [tick, setTick] = useState(() => Math.floor(wallNow() / ROW_MS))
  useEffect(() => {
    let timer = 0
    function arm() {
      const wait = ROW_MS - (wallNow() % ROW_MS)
      timer = window.setTimeout(() => {
        setTick(Math.floor(wallNow() / ROW_MS))
        arm()
      }, wait)
    }
    arm()
    return () => window.clearTimeout(timer)
  }, [])
  if (length <= SLOTS.length) return 0
  return tick % length
}

function FeedRow({ alert, band }: { alert: Alert; band: boolean }) {
  const tone = SEV[alert.severity || "low"] ?? SEV.info
  return (
    <div style={{ position: "relative", height: ROW_H }}>
      {band && <div style={{ position: "absolute", left: 0, top: 0, width: 1759, height: 77, borderRadius: 95, background: "#232323" }} />}
      <div style={{ position: "absolute", left: 29, top: 23, width: 14, height: 34, borderRadius: 7, background: tone.fg }} />
      <div className="snoc-copy" style={{ position: "absolute", left: 83, top: 22, width: 108, height: 32, fontSize: 27, fontWeight: 700, color: "#e7f0ed", lineHeight: "32px" }}>{clock(alert.starts)}</div>
      <div className="snoc-copy" style={{ position: "absolute", left: 292, top: 23, width: 1180, height: 30, fontSize: 26, fontWeight: 400, color: "#e5ecea", lineHeight: "30px", overflow: "hidden", textOverflow: "ellipsis" }}>{alert.summary || alert.name}</div>
      <div style={{ position: "absolute", left: 1534, top: 13, width: 208, height: 53, borderRadius: 46, background: tone.bg, color: tone.fg, fontSize: 20, fontWeight: 700, lineHeight: "53px", textAlign: "center" }}>{tone.label}</div>
    </div>
  )
}

export function EventsFeed() {
  const { alerts, ready } = useDash()
  const rows = useMemo(
    () => [...alerts].sort((a, b) => b.starts - a.starts || a.name.localeCompare(b.name) || (a.summary || "").localeCompare(b.summary || "")),
    [alerts],
  )
  const smooth = useAlertScroll() === "smooth" && rows.length > SLOTS.length
  const offset = useFeedOffset(smooth ? 0 : rows.length)
  const track = useSmoothTrack(smooth, rows.length, ROW_MS, rows.length * ROW_H)
  if (!ready || !rows.length) return null
  if (smooth) {
    const loop = [...rows, ...rows]
    return (
      <div className="snoc-node" style={{ left: 3933, top: SLOTS[0] - 22, width: 1759, height: SLOTS.length * ROW_H, overflow: "hidden", zIndex: 4 }}>
        <div ref={track}>
          {loop.map((alert, index) => <FeedRow key={`${index}-${alert.starts}-${alert.name}`} alert={alert} band={index % 2 === 0} />)}
        </div>
      </div>
    )
  }
  const visible = rows.length > SLOTS.length
    ? SLOTS.map((_, index) => rows[(offset + index) % rows.length])
    : rows
  return (
    <>
      {visible.map((alert, index) => (
        <div key={`${alert.starts}-${alert.name}-${index}`} className="snoc-node" style={{ left: 3933, top: SLOTS[index] - 22, width: 1759, height: 77, zIndex: 4 }}>
          <FeedRow alert={alert} band={index % 2 === 0} />
        </div>
      ))}
    </>
  )
}
