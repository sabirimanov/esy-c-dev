import layout from "./layout.json"
import { SHOW_DATE_SELECTION, SnocCalendar } from "./calendar"
import { useDash } from "./dashboard"
import { EventsFeed, tallyAlerts } from "./feed"
import { liveCopy } from "./slots"
import type { Alert } from "./format"

type Box = [0 | 1, number, number, number, number, number, string, string, number]
type Label = [2, number, number, number, number, number, number, string, number, string]
type Mark = [3, number, number, number, number, string, string, string, number]
type Item = Box | Label | Mark

const items = layout.items as Item[]

function paintVisible(paint: string) {
  if (!paint) return false
  if (paint.includes("#")) return true
  return [...paint.matchAll(/rgba\([^)]*?,\s*([0-9.]+)\)/g)].some((match) => Number(match[1]) > 0.01)
}

function isKpiShell(kind: number, h: number, radius: number, fill: string) {
  return kind === 0 && radius >= 28 && h >= 120 && h <= 160 && fill.includes("180deg") && fill.includes("#34efde")
}

function near(x: number, y: number, ax: number, ay: number) {
  return Math.abs(x - ax) < 3 && Math.abs(y - ay) < 3
}

function hiddenNode(item: Item) {
  const x = item[1]
  const y = item[2]
  if (y >= 1180 && y <= 3240 && x >= 3890 && x <= 5750) return true
  if (item[0] === 1 && near(x, y, 4590.5, 310)) return true
  if (item[0] === 0 && (near(x, y, 5452.5, 140) || (Math.abs(y - 339) < 2 && x >= 4939 && x <= 5310))) return true
  if (!SHOW_DATE_SELECTION && item[0] === 0 && Math.abs(x - 4939.5) < 2 && Math.abs(y - 138) < 2) return true
  if (item[0] !== 2) return false
  const chars = item[9]
  if (!SHOW_DATE_SELECTION && (chars === "DATE SELECTION" || chars === "Choose a date, month, year or range")) return true
  if (chars === "October 2026") return true
  if (y < 450 && ["Day", "Month", "Year", "Date Range", "Now", "Yesterday", "Custom Date"].includes(chars)) return true
  return /^\d{1,2}$/.test(chars) && x >= 3980 && x <= 4700 && y >= 150 && y <= 430
}

function feedBar(x: number, y: number, fill: string, alerts: Alert[] | null) {
  if (Math.abs(x - 3981) > 2 || !fill.includes("90deg")) return null
  if (!alerts) return 0
  const counts = tallyAlerts(alerts)
  const max = Math.max(counts.critical, counts.high, counts.info, 1)
  const value = Math.abs(y - 786) < 8 ? counts.critical : Math.abs(y - 860) < 8 ? counts.high : Math.abs(y - 933) < 8 ? counts.info : null
  if (value == null) return null
  return Math.round((value / max) * 1627)
}

const RESOURCE: [number, string][] = [
  [1426, "dc.cpu"],
  [1469, "dc.memory"],
  [1512, "dc.storage"],
  [1555, "dc.network"],
  [1598, "dc.database_load"],
]

function resourceWidth(x: number, y: number, w: number, fill: string, read: (key: string) => { value: number | null }) {
  if (Math.abs(x - 205) > 2 || w > 500 || !fill.includes("90deg")) return null
  const key = RESOURCE.find(([row]) => Math.abs(y - row) < 8)?.[1]
  if (!key) return null
  const value = read(key).value
  if (value === null) return 0
  return Math.round(Math.max(0, Math.min(1, value)) * 551)
}

function Spark({ x, y, w, h, color, points }: { x: number; y: number; w: number; h: number; color: string; points: [number, number][] }) {
  if (points.length < 2) return null
  const ys = points.map((point) => point[1])
  const min = Math.min(...ys)
  const span = Math.max(...ys) - min || 1
  const d = points
    .map((point, index) => {
      const px = (index / (points.length - 1)) * w
      const py = h - ((point[1] - min) / span) * (h - 4) - 2
      return `${index ? "L" : "M"}${px.toFixed(1)} ${py.toFixed(1)}`
    })
    .join(" ")
  return (
    <svg className="snoc-node" style={{ left: x, top: y, width: w, height: h }}>
      <path d={d} fill="none" stroke={color} strokeWidth={3} />
    </svg>
  )
}

export function SnocScreen({ id }: { id: number }) {
  const { read, ready, live, alerts, series, samples } = useDash()
  const col = (id - 1) % 4
  const row = Math.floor((id - 1) / 4)
  const copy = { ready, live, alerts, read, samples }
  return (
    <div className="snoc-clip">
      <div className="snoc-wall" style={{ transform: `translate(${-col * 1920}px, ${-row * 1080}px)` }}>
        {items.map((item, index) => {
          if (hiddenNode(item)) return null
          if (item[0] === 3) {
            const [, x, y, w, h, d, fill, stroke, sw] = item
            if (near(x, y, 124, 2948)) return <Spark key={index} x={124} y={2910} w={693} h={160} color="#f07865" points={ready ? series("app.error_rate_chart") : []} />
            if (near(x, y, 1080, 2922)) return <Spark key={index} x={1081} y={2908} w={615} h={168} color="#b7fe5d" points={ready ? series("app.response_time_chart") : []} />
            return (
              <svg key={index} className="snoc-node" style={{ left: x, top: y, width: w, height: h }}>
                <path d={d} fill={paintVisible(fill) ? fill : "none"} stroke={paintVisible(stroke) ? stroke : "none"} strokeWidth={sw} />
              </svg>
            )
          }
          if (item[0] === 2) {
            const [, x, y, w, h, size, weight, color, align, chars] = item
            const quickLift = chars === "QUICK SELECT" || chars === "Common time periods" ? 95 : 0
            const text = liveCopy(chars, x, y, copy)
            return (
              <div
                key={index}
                className="snoc-node snoc-copy"
                style={{
                  left: x,
                  top: y - quickLift,
                  width: w,
                  height: h,
                  fontSize: size,
                  fontWeight: weight,
                  color,
                  lineHeight: `${h}px`,
                  textAlign: align === 1 ? "center" : align === 2 ? "right" : "left",
                }}
              >
                {text === null ? chars : text}
              </div>
            )
          }
          const [kind, x, y, w, h, radius, fill, stroke, sw] = item
          const kpi = isKpiShell(kind, h, radius, fill)
          const edge = !kpi && paintVisible(stroke)
          const bar = feedBar(x, y, fill, ready ? alerts : null) ?? resourceWidth(x, y, w, fill, read)
          return (
            <div
              key={index}
              className={kpi ? "snoc-node kpi" : "snoc-node"}
              style={{
                left: x,
                top: y,
                width: bar ?? w,
                height: h,
                borderRadius: kind === 1 ? "50%" : radius,
                background: kpi || !paintVisible(fill) ? "transparent" : fill,
              }}
            >
              {edge && <span className="snoc-edge" style={{ padding: sw || 1, background: stroke }} />}
            </div>
          )
        })}
        <SnocCalendar />
        <EventsFeed />
      </div>
    </div>
  )
}
