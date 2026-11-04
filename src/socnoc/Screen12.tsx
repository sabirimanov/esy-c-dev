import { useEffect, useMemo, useState } from "react"
import { cachedJson, FRESH_MS } from "../data/cachedFetch"
import { clock, type Alert } from "../snoc/format"
import { ChartGrid, MultiLineChart, ProgBar, SeverityDonut } from "./charts"
import { Frame, LiveBadge, Panel, Pin, TEAL, TEAL_GRAD } from "./ui"

const DASHBOARD_URL = String(
  import.meta.env.VITE_SOC_DASHBOARD_URL || "/socnoc/monitoring/screen1/api/dashboard",
).replace(/^https?:\/\/127\.0\.0\.1:8443\/api\/dashboard$/, "/soc-live")

const SEVERITY = [
  { label: "Critical", value: "0", color: "#e45b4c", y: 212 },
  { label: "High", value: "1", color: "#f2a04a", y: 274 },
  { label: "Medium", value: "1", color: "#e6c84a", y: 334 },
  { label: "Low", value: "0", color: "#4a8fd4", y: 396 },
]

const Y_LABELS = ["4", "3", "2", "1", "0"]
const X_LABELS = [
  { label: "19:52", x: 725 },
  { label: "23:50", x: 905 },
  { label: "03:48", x: 1085 },
  { label: "07:47", x: 1265 },
  { label: "11:45", x: 1445 },
  { label: "19:42", x: 1708 },
]

/** Firing alerts series matching Figma shape (yellow/medium dominates, brief high). */
const N = 48
const mediumVals = Array.from({ length: N }, (_, i) => {
  if (i < 6) return 0
  if (i < 10) return 1
  if (i < 14) return 2
  if (i < 18) return 3
  if (i < 22) return 2
  if (i < 28) return 3
  if (i < 34) return 2
  if (i < 38) return 1
  return 0
})
const highVals = Array.from({ length: N }, (_, i) => {
  if (i >= 30 && i <= 36) return 1
  return 0
})
const criticalVals = Array.from({ length: N }, () => 0)
const lowVals = Array.from({ length: N }, () => 0)

const CHART_X = 747
const CHART_Y = 731
const CHART_W = 1080
const CHART_H = 236

const SEV_STYLE: Record<string, { label: string; fg: string; bg: string }> = {
  critical: { label: "Critical", fg: "#ff765e", bg: "#41211e" },
  high: { label: "High", fg: "#ff765e", bg: "#41211e" },
  medium: { label: "Medium", fg: "#ffb14f", bg: "#40301a" },
  low: { label: "Low", fg: "#2ee0d3", bg: "#123b38" },
  info: { label: "Info", fg: "#2ee0d3", bg: "#123b38" },
}

const FEED_X = 684
const FEED_Y = 168
const FEED_W = 1180
const FEED_H = 450
const ROW_H = 65

function serviceOf(alert: Alert) {
  return alert.domain || alert.host || alert.name.split(/[:\s]/)[0] || "—"
}

function EventsFeedList() {
  const [alerts, setAlerts] = useState<Alert[]>([])

  useEffect(() => {
    let stop = false
    function load(force: boolean) {
      const end = Math.floor(Date.now() / 1000 / 300) * 300
      cachedJson<{ alerts?: Alert[] }>(`${DASHBOARD_URL}?range=7d&end=${end}`, 0, force)
        .then((body) => {
          if (!stop) setAlerts(body.alerts ?? [])
        })
        .catch(() => {
          /* keep last */
        })
    }
    load(false)
    const id = window.setInterval(() => load(true), FRESH_MS + 1000)
    return () => {
      stop = true
      window.clearInterval(id)
    }
  }, [])

  const rows = useMemo(
    () =>
      [...alerts].sort(
        (a, b) =>
          b.starts - a.starts ||
          a.name.localeCompare(b.name) ||
          (a.summary || "").localeCompare(b.summary || ""),
      ),
    [alerts],
  )

  if (!rows.length) {
    return (
      <Pin x={701} y={248} size={20} weight={400} color="#647373">
        No active events
      </Pin>
    )
  }

  const loop = rows.length > 6 ? [...rows, ...rows] : rows

  return (
    <div
      className="at"
      style={{
        left: FEED_X,
        top: FEED_Y,
        width: FEED_W,
        height: FEED_H,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          animation: rows.length > 6 ? `socnoc-feed-scroll ${Math.max(24, rows.length * 2.2)}s linear infinite` : undefined,
        }}
      >
        {loop.map((alert, index) => {
          const tone = SEV_STYLE[alert.severity || "low"] ?? SEV_STYLE.info
          const band = index % 2 === 0
          return (
            <div
              key={`${alert.starts}-${alert.name}-${index}`}
              style={{
                position: "relative",
                height: ROW_H,
                width: FEED_W,
              }}
            >
              {band && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 8,
                    width: FEED_W,
                    height: 58,
                    borderRadius: 95,
                    background: "#232323",
                    border: "1px solid #282b2a",
                  }}
                />
              )}
              <div
                style={{
                  position: "absolute",
                  left: 17,
                  top: 22,
                  fontSize: 21.6,
                  fontWeight: 400,
                  color: "#e3eaea",
                  fontFamily: "Roboto, sans-serif",
                  lineHeight: "26px",
                }}
              >
                {clock(alert.starts)}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 106,
                  top: 22,
                  width: 140,
                  fontSize: 21.6,
                  fontWeight: 400,
                  color: "#358f8d",
                  fontFamily: "Roboto, sans-serif",
                  lineHeight: "26px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {serviceOf(alert)}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 256,
                  top: 23,
                  width: 680,
                  fontSize: 20.4,
                  fontWeight: 400,
                  color: "#a6b7b6",
                  fontFamily: "Roboto, sans-serif",
                  lineHeight: "26px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {alert.summary || alert.name}
              </div>
              <div
                style={{
                  position: "absolute",
                  left: 962,
                  top: 16,
                  width: 210,
                  height: 40,
                  borderRadius: 46,
                  background: tone.bg,
                  color: tone.fg,
                  fontSize: 20,
                  fontWeight: alert.severity === "high" || alert.severity === "critical" ? 700 : 400,
                  lineHeight: "40px",
                  textAlign: "center",
                  fontFamily: "Roboto, sans-serif",
                }}
              >
                {tone.label}
              </div>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes socnoc-feed-scroll {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
      `}</style>
    </div>
  )
}

export function Screen12() {
  return (
    <Frame>
      <Pin x={67} y={30} size={32} weight={900} color={TEAL} lh={40}>ALERTS & EVENTS</Pin>
      <LiveBadge />

      <Panel x={42} y={90} w={617} h={399} grad="linear-gradient(106deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />
      <Panel x={42} y={498} w={617} h={533} grad="linear-gradient(102deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />
      <Panel x={672} y={90} w={1208} h={543} grad="linear-gradient(113deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />
      <Panel x={672} y={645} w={1208} h={386} grad="linear-gradient(121deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />

      <Pin x={71} y={115} size={25} weight={700} color="#f2f5f5">ACTIVE BY SEVERITY</Pin>
      <SeverityDonut
        x={78}
        y={179}
        size={274}
        arcs={[
          { color: "#f2a04a", startDeg: 200, sweepDeg: 100, r: 105, stroke: 22 },
          { color: "#e6c84a", startDeg: 220, sweepDeg: 70, r: 78, stroke: 18 },
        ]}
        center="2"
        sub="alerts"
      />

      {SEVERITY.map((s) => (
        <div key={s.label}>
          <div className="at" style={{ left: 394, top: s.y, width: 16, height: 16, borderRadius: 3, background: s.color }} />
          <Pin x={424} y={s.y - 2} size={24} weight={400} color="#e3eaea">{s.label}</Pin>
          <Pin x={598} y={s.y - 2} size={24} weight={400} color="#e3eaea" w={40} align="right">{s.value}</Pin>
        </div>
      ))}

      <Pin x={67} y={529} size={25} weight={700} color="#f2f5f5">ACTIVE BY SERVICE</Pin>
      <Pin x={67} y={594} size={24} weight={400} color="#e3eaea">UFG</Pin>
      <Pin x={606} y={594} size={24} weight={400} color="#e3eaea" w={40} align="right">1</Pin>
      <ProgBar x={67} y={633} trackW={579} fillW={579} fill={TEAL_GRAD} />
      <Pin x={67} y={665} size={24} weight={400} color="#e3eaea">Infrastructure</Pin>
      <Pin x={606} y={665} size={24} weight={400} color="#e3eaea" w={40} align="right">1</Pin>
      <ProgBar x={67} y={704} trackW={579} fillW={579} fill={TEAL_GRAD} />

      <Pin x={701} y={118} size={25} weight={700} color="#f2f5f5">EVENTS FEED</Pin>
      <Pin x={1768} y={125} size={18} weight={400} color="#647373" w={100} align="right">newest first</Pin>
      <EventsFeedList />

      <Pin x={702} y={672} size={25} weight={700} color="#f2f5f5">FIRING ALERTS OVER TIME</Pin>
      <div className="at" style={{ left: 1439, top: 690, width: 36, height: 3, background: "#e45b4c", borderRadius: 2 }} />
      <Pin x={1470} y={679} size={18} weight={400} color="#9baaaa">Critical</Pin>
      <div className="at" style={{ left: 1551, top: 690, width: 36, height: 3, background: "#f2a04a", borderRadius: 2 }} />
      <Pin x={1582} y={679} size={18} weight={400} color="#9baaaa">High</Pin>
      <div className="at" style={{ left: 1662, top: 690, width: 36, height: 3, background: "#e6c84a", borderRadius: 2 }} />
      <Pin x={1693} y={679} size={18} weight={400} color="#9baaaa">Medium</Pin>
      <div className="at" style={{ left: 1774, top: 690, width: 36, height: 3, background: "#4a8fd4", borderRadius: 2 }} />
      <Pin x={1805} y={679} size={18} weight={400} color="#9baaaa">Low</Pin>

      <ChartGrid x={CHART_X} y={CHART_Y} w={CHART_W} rows={5} rowH={59} />
      {Y_LABELS.map((label, i) => (
        <Pin key={label} x={720} y={719 + i * 59} size={18} weight={400} color="#8c9c9c" w={30} align="right">{label}</Pin>
      ))}
      <div className="at" style={{ left: CHART_X, top: 967, width: CHART_W, height: 1, background: "#3a4444" }} />
      {X_LABELS.map(({ label, x }) => (
        <Pin key={label} x={x} y={982} size={18} weight={400} color="#829393" w={60} align="center">{label}</Pin>
      ))}

      <MultiLineChart
        x={CHART_X}
        y={CHART_Y}
        w={CHART_W}
        h={CHART_H}
        yMax={4}
        series={[
          { color: "#e6c84a", area: "rgba(230,200,74,0.35)", values: mediumVals },
          { color: "#f2a04a", area: "rgba(242,160,74,0.35)", values: highVals },
          { color: "#e45b4c", values: criticalVals },
          { color: "#4a8fd4", values: lowVals },
        ]}
      />
    </Frame>
  )
}
