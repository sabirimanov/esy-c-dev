import { useEffect, useState, type ReactNode } from "react"
import { useCachedResource } from "../data/cachedFetch"
import weatherBaku from "../assets/weather-baku.png"
import { UfgScreen2, UfgScreen8, UfgScreen9 } from "./UfgDetail"
import { At, Frame, PlaceText } from "../ui/widgets"
import { useContent } from "../data/live"
import { useSocPanel } from "../data/socDashboard"
import { useLeaks } from "../data/leaks"
import { usePressure } from "../data/pressure"
import { useDemand } from "../data/demand"
import { useGis } from "../data/gis"
import { useQuality } from "../data/quality"
import { useImpact } from "../data/impact"
import { alertRowMs, useAlertScroll, useSmoothTrack } from "../data/alertScroll"
import { billingForRange, useBilling } from "../data/billing"
import { useCalibration } from "../data/calibration"
import { useTamper } from "../data/tamper"
import { useFieldOps } from "../data/field"
import { formatCount, formatPct, typeByKey, useConnectivity, type ConnectivityTypeKey } from "../data/connectivity"
import { METER_READING_SAVING_AZN, VALVE_OPEN_CLOSE_OPS, VALVE_OPS_SAVING_AZN } from "../data/valveOps"
import { useOmJobs } from "../data/omJobs"
import {
  cccMinConsumption,
  cccPressureSpans,
  cccQmax,
  cccTopPressureClusters,
  cccZeroConsumption,
} from "../data/cccSnapshot"
import { useCapacity, useMeterSplit, useUfgHierarchy, useUfgSummary, useUfgTrend, type UfgCluster } from "../data/ufg"
import { addDays, formatRange, iso, monthGrid, monthTitle, parseIso, periodRange, previousSpan, shiftView, todayIso, trendCaption } from "../wall/dates"
import { apiRegionId, citiesOf, cityById, EXC_REGIONS, regionEnabled, regionLabel, zoneIdForCity } from "../wall/places"
import { periodLabel, type WallState } from "../wall/state"
import { useWall } from "../wall/useWall"

const screen15Svg = import.meta.glob("../assets/screen15/*.svg", { eager: true, import: "default" }) as Record<string, string>

function screen15Asset(name: string) {
  const entry = Object.entries(screen15Svg).find(([path]) => path.endsWith(`/${name}.svg`))
  if (!entry) throw new Error(`missing screen 15 asset ${name}`)
  return entry[1]
}

const screen7Svg = import.meta.glob("../assets/screen7/*.svg", { eager: true, import: "default" }) as Record<string, string>

function screen7Asset(name: string) {
  const entry = Object.entries(screen7Svg).find(([path]) => path.endsWith(`/${name}.svg`))
  if (!entry) throw new Error(`missing screen 7 asset ${name}`)
  return entry[1]
}

const screen9Svg = import.meta.glob("../assets/screen9/*.svg", { eager: true, import: "default" }) as Record<string, string>

function screen9Asset(name: string) {
  const entry = Object.entries(screen9Svg).find(([path]) => path.endsWith(`/${name}.svg`))
  if (!entry) throw new Error(`missing screen 9 asset ${name}`)
  return entry[1]
}

const screen21Svg = import.meta.glob("../assets/screen21/*.svg", { eager: true, import: "default" }) as Record<string, string>

function screen21Asset(name: string) {
  const entry = Object.entries(screen21Svg).find(([path]) => path.endsWith(`/${name}.svg`))
  if (!entry) throw new Error(`missing screen 21 asset ${name}`)
  return entry[1]
}

const screen8Svg = import.meta.glob("../assets/screen8/*.svg", { eager: true, import: "default" }) as Record<string, string>

function screen8Asset(name: string) {
  const entry = Object.entries(screen8Svg).find(([path]) => path.endsWith(`/${name}.svg`))
  if (!entry) throw new Error(`missing screen 8 asset ${name}`)
  return entry[1]
}

const screen2Svg = import.meta.glob("../assets/screen2/*.svg", { eager: true, import: "default" }) as Record<string, string>

function screen2Asset(name: string) {
  const entry = Object.entries(screen2Svg).find(([path]) => path.endsWith(`/${name}.svg`))
  if (!entry) throw new Error(`missing screen 2 asset ${name}`)
  return entry[1]
}

function Pin({
  x, y, size, weight = 400, color, children, w, lh, align, wrap, font, unwired,
}: {
  x: number
  y: number
  size: number
  weight?: number
  color: string
  children: ReactNode
  w?: number
  lh?: number
  align?: "left" | "right" | "center"
  wrap?: boolean
  font?: string
  unwired?: string
}) {
  return (
    <div
      className="at pin"
      data-unwired={unwired}
      style={{
        left: x,
        top: y,
        width: w,
        height: lh && !wrap ? lh : undefined,
        fontSize: size,
        fontWeight: weight,
        fontFamily: font,
        color,
        lineHeight: lh ? `${lh}px` : 1,
        textAlign: align,
        whiteSpace: wrap ? "pre-line" : undefined,
      }}
    >
      {children}
    </div>
  )
}

function niceStep(rough: number) {
  if (!(rough > 0)) return 1
  const pow = 10 ** Math.floor(Math.log10(rough))
  const scaled = rough / pow
  const base = scaled >= 7.5 ? 10 : scaled >= 3.5 ? 5 : scaled >= 1.5 ? 2 : 1
  return base * pow
}

function chartScale(values: (number | null)[]) {
  const nums = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (!nums.length) return { min: 0, max: 10 }
  const low = Math.min(0, ...nums)
  const high = Math.max(5, ...nums)
  let step = niceStep((high - low) / 5)
  for (let guard = 0; guard < 8; guard += 1) {
    const min = Math.floor(low / step) * step
    const max = min + step * 5
    if (max >= high) return { min, max }
    step = niceStep(step * 2)
  }
  return { min: low, max: low + step * 5 }
}

function linePath(values: (number | null)[], xAt: (index: number) => number, yAt: (value: number) => number) {
  let path = ""
  let drawing = false
  values.forEach((value, index) => {
    if (value == null) {
      drawing = false
      return
    }
    path += `${drawing ? "L" : "M"}${xAt(index).toFixed(1)} ${yAt(value).toFixed(1)}`
    drawing = true
  })
  return path
}

/** Cardinal spline through points. Set tension 0 for almost-linear; flip caller flag to revert. */
function smoothPolylinePath(points: { x: number; y: number }[], tension = 0.22) {
  if (!points.length) return ""
  if (points.length === 1) return `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  let path = `M${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index]
    const p1 = points[index]
    const p2 = points[index + 1]
    const p3 = points[index + 2] ?? p2
    const cp1x = p1.x + (p2.x - p0.x) * tension
    const cp1y = p1.y + (p2.y - p0.y) * tension
    const cp2x = p2.x - (p3.x - p1.x) * tension
    const cp2y = p2.y - (p3.y - p1.y) * tension
    path += `C${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return path
}

function UfgChart({ current, previous, min, max }: { current: (number | null)[]; previous: (number | null)[]; min: number; max: number }) {
  const count = Math.max(current.length, previous.length, 2)
  const xAt = (index: number) => (index * 1112) / (count - 1)
  const yAt = (value: number) => ((max - value) / (max - min)) * 325
  return (
    <svg className="at" viewBox="0 0 1150 325" style={{ left: 126, top: 505, width: 1150, height: 325 }}>
      {[0, 1, 2, 3, 4, 5].map((step) => (
        <line key={step} x1="0" x2="1150" y1={step * 65} y2={step * 65} stroke="#343838" strokeWidth="1" />
      ))}
      <path d={linePath(previous, xAt, yAt)} fill="none" stroke="#34d9e6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <line x1="0" x2="1112" y1={yAt(5)} y2={yAt(5)} stroke="#34eddc" strokeWidth="2" strokeDasharray="8 6" />
      <path d={linePath(current, xAt, yAt)} fill="none" stroke="#f2a65a" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
      {current.map((value, index) => (
        value == null ? null : <circle key={index} cx={xAt(index)} cy={yAt(value)} r="3" fill="#f2a65a" />
      ))}
    </svg>
  )
}

function metricWidth(text: string) {
  let width = 0
  for (const char of text) width += char === "," || char === "." ? 22 : char === "—" ? 40 : 36
  return width
}

function KpiValue({ x, y, value, unit, note, edge }: { x: number; y: number; value: string; unit: string; note?: string; edge: number }) {
  const noteX = x + metricWidth(value) + (unit ? 8 + unit.length * 16 : 0) + 18
  const showNote = Boolean(note) && noteX + (note?.length ?? 0) * 8 < edge
  return (
    <>
      <div className="at" style={{ left: x, top: y, display: "flex", alignItems: "baseline", gap: 8, height: 40 }}>
        <span style={{ fontSize: 60, fontWeight: 700, lineHeight: "40px", color: "#ffffff" }}>{value}</span>
        {unit && <span style={{ fontSize: 24, lineHeight: "28px", color: "#a0aaa8" }}>{unit}</span>}
      </div>
      {showNote && <Pin x={noteX} y={y + 23} size={16} color="#a0aaa8" lh={19}>{note}</Pin>}
    </>
  )
}

// Chart only. A negative UFG point is drawn as the last value at or above zero.
// Set to false to plot the API value unchanged. The KPI cards stay on the raw figures.
const smoothNegativeChart = false

// Chart only. A point more than 5 percentage points away from both neighbors
// is drawn as the previous value. Set to false to plot the series unchanged.
const smoothChartJumps = true
const chartJumpLimit = 5

function smoothSeries(values: (number | null)[]) {
  if (!smoothNegativeChart) return values
  const normal = values.find((value) => value != null && value >= 0) ?? 0
  let last = normal
  return values.map((value) => {
    if (value == null) return null
    if (value < 0) return last
    last = value
    return value
  })
}

function fillGaps(values: (number | null)[]) {
  let last: number | null = null
  return values.map((value) => {
    if (value == null) return last
    last = value
    return value
  })
}

function smoothJumps(values: (number | null)[]) {
  if (!smoothChartJumps) return values
  const out = values.slice()
  for (let index = 1; index < out.length; index += 1) {
    const previous = out[index - 1]
    const value = out[index]
    const next = values[index + 1]
    if (previous == null || value == null) continue
    const farFromPrevious = Math.abs(value - previous) > chartJumpLimit
    const farFromNext = next == null || Math.abs(value - next) > chartJumpLimit
    if (farFromPrevious && farFromNext) out[index] = previous
  }
  return out
}

function axisMarks(count: number) {
  if (count <= 1) return [0]
  if (count <= 8) return Array.from({ length: count }, (_, index) => index)
  const step = Math.ceil((count - 1) / 7)
  const marks = []
  for (let index = 0; index < count; index += step) marks.push(index)
  return marks
}

function clusterName(name: string) {
  return name.replace(/\(\d+\)\s*$/, "").trim()
}

function compactCount(value: number, digits = 0) {
  const sign = value < 0 ? "-" : ""
  const abs = Math.abs(value)
  if (abs < 1000) return sign + String(abs)
  const divisor = abs >= 1_000_000 ? 1_000_000 : 1000
  const suffix = divisor === 1_000_000 ? "M" : "K"
  const scaled = Math.round((abs / divisor) * 10) / 10
  const places = digits > 0 ? digits : Number.isInteger(scaled) ? 0 : 1
  return sign + scaled.toFixed(places) + suffix
}

function dayLabel(start: string, index: number) {
  const { d, m } = parseIso(addDays(start, index))
  return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}`
}

function tickText(value: number) {
  const rounded = Math.round(value * 10) / 10
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%`
}

function Screen1({ state }: { state: WallState }) {
  const ufg = useUfgSummary(state)
  const trend = useUfgTrend(state)
  const earlier = previousSpan(state.date, state.dateTo, state.period)
  const currentLabel = `${trendCaption(state.date, state.dateTo, state.period)} – Current`
  const previousLabel = `${trendCaption(earlier.date, earlier.dateTo, state.period)} – Previous`
  const series = smoothJumps(fillGaps(smoothSeries(trend?.current ?? [])))
  const previousSeries = smoothJumps(fillGaps(smoothSeries(trend?.previous ?? [])))
  const count = Math.max(series.length, previousSeries.length, 1)
  const scale = chartScale([...series, ...previousSeries])
  const ticks = [0, 1, 2, 3, 4, 5].map((step) => scale.max - ((scale.max - scale.min) / 5) * step)
  const marks = axisMarks(count)
  const hourly = Boolean(trend?.hourly)
  const [hover, setHover] = useState<number | null>(null)
  const pointX = (index: number) => 126 + (count <= 1 ? 556 : (index * 1112) / (count - 1))
  const current = ufg.current == null ? "—" : ufg.current.toFixed(1)
  const lossRounded = ufg.loss == null ? null : Math.round(ufg.loss)
  const loss = lossRounded == null ? "—" : lossRounded.toLocaleString("en-US")
  const impact = lossRounded == null ? "—" : compactCount(Math.round(lossRounded * 0.125))
  const extremes = state.regionId ? ufg.extremes : null
  const scaleMax = Math.max(5, extremes?.high?.value ?? 0, extremes?.low.value ?? 0)
  const track = 488
  const barX = 1366
  const barWidth = (value: number) => Math.max(0, Math.min(track, (value / scaleMax) * track))
  const markerX = barX + (5 / scaleMax) * track - 1
  const shown = ufg.current == null ? null : Number(ufg.current.toFixed(1))
  const gap = shown == null ? null : Number((shown - 5).toFixed(1))
  const consumers = ufg.consumers == null ? "—" : Math.round(ufg.consumers).toLocaleString("en-US")
  const callout = gap == null ? "—" : gap > 0 ? `UFG ${gap.toFixed(1)} pp above target` : gap < 0 ? `UFG ${Math.abs(gap).toFixed(1)} pp below target` : "UFG at target"
  const calloutColor = gap == null || gap === 0 ? "#a0aaa8" : gap > 0 ? "#f2a65a" : "#34efde"
  return (
    <Frame mirror>
      <PlaceText x={37} y={28} size={32} weight={900}>UFG PERFORMANCE & LOSS MONITORING</PlaceText>
      <At x={42} y={98} w={443} h={150}><div className="kpi" /></At>
      <At x={508} y={97} w={451} h={150}><div className="kpi" /></At>
      <At x={974} y={97} w={451} h={150}><div className="kpi surface-glow-strong" /></At>
      <At x={1440} y={97} w={450} h={150}><div className="kpi surface-glow-mid" /></At>
      <Pin x={73} y={108} size={24} weight={500} color="#34efde" lh={40}>Current UFG</Pin>
      <KpiValue x={73} y={164} value={current} unit="%" edge={470} />
      <Pin x={537} y={108} size={24} weight={500} color="#34efde" lh={40}>Target UFG</Pin>
      <KpiValue x={537} y={164} value="5.0" unit="%" note="Configured for selected scope" edge={950} />
      <Pin x={1001} y={108} size={24} weight={500} color="#34efde" lh={40}>Loss volume</Pin>
      <KpiValue x={1001} y={164} value={loss} unit="m³" note="Total for selected period" edge={1410} />
      <Pin x={1465} y={108} size={24} weight={500} color="#34efde" lh={40}>Total consumers</Pin>
      <KpiValue x={1465} y={164} value={consumers} unit="" edge={1880} />
      <At x={42} y={321} w={1272} h={681}><div className="panel shell dim" /></At>
      <Pin x={69} y={340} size={32} weight={700} color="#ffffff" lh={40}>UFG trend</Pin>
      <Pin x={70} y={385} size={24} color="#757171" lh={40}>{hourly ? "Hourly values · aligned by hour" : "Daily values · aligned by day of period"}</Pin>
      <Pin x={70} y={435} size={24} color="#ffffff" lh={40}>UFG (%)</Pin>
      {/*<At x={1090} y={340} w={195} h={46}><div className="expand-pill">Expand chart</div></At>*/}
      <UfgChart current={series} previous={previousSeries} min={scale.min} max={scale.max} />
      {ticks.map((tick, index) => (
        <Pin key={index} x={24} y={479 + index * 65} w={92} size={24} color="#757171" lh={40} align="right">{tickText(tick)}</Pin>
      ))}
      {marks.map((index) => {
        const text = hourly ? (trend?.hours[index] || "").slice(0, 2) || String(index + 1) : String(index + 1)
        return <Pin key={text + index} x={pointX(index) - 28} y={845} w={56} size={24} color="#757171" lh={40} align="center">{text}</Pin>
      })}
      <Pin x={607} y={890} size={18} color="#a0aaa8" lh={21}>{hourly ? "Hour" : "Day of period"}</Pin>
      {Array.from({ length: count }, (_, index) => {
        const width = count <= 1 ? 48 : Math.max(16, 1112 / (count - 1))
        return (
          <div
            key={index}
            className="at"
            style={{ left: pointX(index) - width / 2, top: 505, width, height: 325, zIndex: 2 }}
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover((currentIndex) => (currentIndex === index ? null : currentIndex))}
          />
        )
      })}
      {hover != null && (
        <div className="at" style={{ left: Math.min(1120, Math.max(56, pointX(hover) - 78)), top: 448, zIndex: 3, width: 168, padding: "8px 12px", borderRadius: 10, background: "#102022", border: "1px solid #245552", pointerEvents: "none" }}>
          <div style={{ color: "#f2a65a", fontSize: 16, lineHeight: "22px" }}>{dayLabel(state.date, hover)} · {series[hover] == null ? "—" : `${series[hover].toFixed(1)}%`}</div>
          <div style={{ color: "#34d9e6", fontSize: 16, lineHeight: "22px" }}>{dayLabel(earlier.date, hover)} · {previousSeries[hover] == null ? "—" : `${previousSeries[hover].toFixed(1)}%`}</div>
        </div>
      )}
      <div className="at" style={{ left: 90, top: 938, width: 1180, height: 40, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12, color: "#757171", fontSize: 22 }}>
          <i style={{ width: 32, height: 3, borderRadius: 2, background: "#f2a65a" }} />
          {currentLabel}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 12, color: "#757171", fontSize: 22 }}>
          <i style={{ width: 32, height: 3, borderRadius: 2, background: "#34d9e6" }} />
          {previousLabel}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 12, color: "#757171", fontSize: 22 }}>
          <i style={{ width: 32, height: 2, background: "repeating-linear-gradient(90deg, #34eddc 0 8px, transparent 8px 14px)" }} />
          Target – 5.0%
        </span>
      </div>
      {state.ufgOpen && (
        <Pin x={1480} y={32} w={390} size={18} color="#34efde" align="right" lh={28}>Details open</Pin>
      )}

      <At x={1338} y={321} w={556} h={681}><div className="panel shell dim" /></At>
      <Pin x={1366} y={340} size={32} weight={700} color="#ffffff" lh={40}>Regional comparison</Pin>
      <Pin x={1366} y={385} size={24} color="#757171" lh={40}>Highest and lowest UFG in selected scope</Pin>
      <div className="at" title={extremes?.high?.name} style={{ left: 1366, top: 465, width: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 24, lineHeight: "28px", color: "#f3f5f4" }}>{extremes?.high ? clusterName(extremes.high.name) : "—"}</div>
      <Pin x={1779} y={465} size={32} color="#f3f5f4" lh={38}>{extremes?.high ? `${extremes.high.value.toFixed(1)}%` : "—"}</Pin>
      <At x={barX} y={503} w={track} h={22}><div style={{ height: "100%", borderRadius: 27, background: "#33413f" }} /></At>
      <At x={barX} y={503} w={extremes?.high ? barWidth(extremes.high.value) : 0} h={22}><div style={{ height: "100%", borderRadius: 27, background: "linear-gradient(to right, #8c6034, #f2a65a)" }} /></At>
      {extremes && <At x={markerX} y={499} w={2} h={30}><div style={{ height: "100%", background: "#f3f5f4" }} /></At>}
      <Pin x={1366} y={533} size={18} color="#76817f" lh={21}>Highest UFG · same period</Pin>
      <div className="at" title={extremes?.low.name} style={{ left: 1366, top: 588, width: 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 24, lineHeight: "28px", color: "#f3f5f4" }}>{extremes ? clusterName(extremes.low.name) : "—"}</div>
      <Pin x={1779} y={591} size={32} color="#f3f5f4" lh={38}>{extremes ? `${extremes.low.value.toFixed(1)}%` : "—"}</Pin>
      <At x={barX} y={629} w={track} h={22}><div style={{ height: "100%", borderRadius: 27, background: "#33413f" }} /></At>
      <At x={barX} y={629} w={extremes ? barWidth(extremes.low.value) : 0} h={22}><div style={{ height: "100%", borderRadius: 27, background: "linear-gradient(to right, #1e897f, #34efde)" }} /></At>
      {extremes && <At x={markerX} y={625} w={2} h={30}><div style={{ height: "100%", background: "#f3f5f4" }} /></At>}
      <Pin x={1366} y={659} size={18} color="#76817f" lh={21}>Lowest UFG · same period</Pin>
      <At x={1366} y={701} w={488} h={1}><div style={{ height: 1, background: "#343838" }} /></At>
      <Pin x={1366} y={727} size={18} color="#76817f" lh={21}>White marker: target UFG · 5.0%</Pin>
      <Pin x={1366} y={766} size={18} color="#a0aaa8" lh={21}>Approximate revenue impact</Pin>
      <div className="at" style={{ left: 1366, top: 791, display: "flex", alignItems: "baseline", gap: 12, height: 49 }}>
        <span style={{ fontSize: 42, lineHeight: "49px", color: "#f3f5f4" }}>{impact}</span>
        {impact !== "—" && <span style={{ fontSize: 24, lineHeight: "28px", color: "#a0aaa8" }}>AZN</span>}
      </div>
      <Pin x={1366} y={847} size={18} color="#a0aaa8" lh={21}>Based on residential tariff 0.125 AZN/m³</Pin>
      <At x={1360} y={901} w={512} h={48}>
        <div style={{ height: "100%", borderRadius: 20, background: "linear-gradient(135deg, #2a2a2a, #1c1c1c)", border: "1px solid #282b2a" }} />
      </At>
      <Pin x={1382} y={912} size={24} color={calloutColor} lh={28}>{callout}</Pin>
    </Frame>
  )
}

function Screen2({ state }: { state: WallState }) {
  const calib = useCalibration(state)
  const fmt = (value: number | null | undefined) => (value == null ? "—" : value.toLocaleString("en-US"))
  const kpis = [
    { x: 43, labelX: 65, valueX: 65, noteX: 262, label: "Calibration compliance", value: "100%", note: "Meters, EVC and sensors" },
    { x: 504.54, labelX: 530, valueX: 530, noteX: 727, label: "Overdue assets", value: "0", note: "Selected scope · as of date" },
    { x: 966.07, labelX: 995, valueX: 995, noteX: 1192, label: "Long pending assets", value: "0", note: "Selected scope · as of date" },
    { x: 1427.61, labelX: 1460, valueX: 1456, noteX: 1657, label: "Total assets", value: fmt(calib?.total), note: "Selected asset population" },
  ]
  const rows = [
    { label: "Residential meters", y: 434, valueY: 431, lineY: 475, count: calib?.residential, avg: "4.6" },
    { label: "Non-residential meters", y: 487, valueY: 484, lineY: 528, count: calib?.nonResidential, avg: "4.6" },
    { label: "Balance meters / EVC", y: 540, valueY: 537, lineY: 581, count: calib?.balance, avg: "3" },
    { label: "Pressure sensors", y: 593, valueY: 590, lineY: 634, count: calib?.pressure, avg: "4.7" },
    { label: "Temperature sensors", y: 646, valueY: 643, lineY: 687, count: calib?.temperature, avg: "4.7" },
  ]
  const columns = [
    { x: 435, key: "count", w: 90, align: "left" as const },
    { x: 659, key: "avg-validity", w: 60, align: "center" as const },
    { x: 919, key: "overdue", w: 40, align: "center" as const },
    { x: 1169, key: "3m", w: 40, align: "center" as const },
    { x: 1411, key: "6m", w: 40, align: "center" as const },
    { x: 1676, key: "6p", w: 40, align: "center" as const },
  ]
  const cell = (row: (typeof rows)[number], key: string) => {
    if (key === "count") return fmt(row.count)
    if (key === "avg-validity") return row.count == null ? "—" : row.avg
    return row.count == null ? "—" : "0"
  }
  const dueRows = [
    { label: "Calibration DUE", y: 836.03, barY: 844.02, bold: true, value: null as number | null, source: "due-header" },
    { label: "up to 3 months", y: 887.98, barY: 894.99, bold: false, value: 0, source: "due-3m" },
    { label: "up to 6 months", y: 921.02, barY: 929.02, bold: false, value: 0, source: "due-6m" },
    { label: "up to 6+ months", y: 953.96, barY: 961.96, bold: false, value: 0, source: "due-6p" },
  ]
  const trendMonths = [
    { label: "Jun", x: 1035.07 },
    { label: "Jul", x: 1195.97 },
    { label: "Aug", x: 1358.02 },
    { label: "Sep", x: 1508.93 },
    { label: "Oct", x: 1670.02 },
    { label: "Nov", x: 1827.07 },
  ]
  return (
    <Frame mirror>
      <Pin x={43} y={33} size={32} weight={900} color="#34efde" lh={40}>CALIBRATION STATUS</Pin>
      {kpis.map((card) => (
        <span key={card.label}>
          <At x={card.x} y={97} w={427.394} h={150}><div className="kpi" /></At>
          <Pin x={card.labelX} y={108} size={24} weight={500} color="#34efde" lh={40}>{card.label}</Pin>
          <Pin x={card.valueX} y={169} size={60} weight={700} color="#ffffff" lh={40}>{card.value}</Pin>
          <Pin x={card.noteX} y={187} size={16} color="#a0aaa8" lh={19}>{card.note}</Pin>
        </span>
      ))}

      <At x={43} y={271} w={1840} h={441}><div className="panel shell dim" /></At>
      <Pin x={72} y={290} size={25} weight={700} color="#f2f5f5" lh={29}>Calibration Validity</Pin>
      <At x={55} y={342} w={1813} h={71}>
        <div style={{ height: "100%", borderRadius: 95, background: "#232323", border: "1px solid #282b2a" }} />
      </At>
      <Pin x={72} y={366} size={19} weight={700} color="#bcebe5" lh={22}>Assets Type</Pin>
      <Pin x={435} y={367} size={19} weight={700} color="#bcebe5" lh={22}>Count</Pin>
      <Pin x={601} y={352} size={19} weight={700} color="#bcebe5" lh={22}>Average Remaining</Pin>
      <Pin x={601} y={376} size={19} weight={700} color="#bcebe5" lh={22}>Calibration Validity</Pin>
      <Pin x={891} y={366} size={19} weight={700} color="#bcebe5" lh={22}>Calibration over due</Pin>
      <Pin x={1143} y={366} size={19} weight={700} color="#bcebe5" lh={22}>3 months</Pin>
      <Pin x={1380} y={366} size={19} weight={700} color="#bcebe5" lh={22}>6 months</Pin>
      <Pin x={1640} y={366} size={19} weight={700} color="#bcebe5" lh={22}>6+ months</Pin>
      {rows.map((row) => (
        <span key={row.label}>
          <Pin x={72} y={row.y} size={21} color="#edf4f3" lh={25}>{row.label}</Pin>
          {columns.map((column) => (
            <Pin key={column.key} x={column.x} y={row.valueY} w={column.w} size={24} color="#edf4f3" lh={28} align={column.align}>{cell(row, column.key)}</Pin>
          ))}
          <FigAsset src={screen2Asset("row-line")} x={65} y={row.lineY - 0.5} w={1765} h={1} />
        </span>
      ))}

      <At x={43} y={725} w={885} h={314}><div className="panel shell dim" /></At>
      <At x={939} y={725} w={944} h={314}><div className="panel shell dim" /></At>

      {dueRows.map((row) => (
        <span key={row.source}>
          <Pin x={89.09} y={row.y} size={24} weight={row.bold ? 700 : 400} color="#ffffff" lh={28}>{row.label}</Pin>
          {row.value != null ? <Pin x={820} y={row.y} w={60} size={22} weight={700} color="#f0f5f5" lh={26} align="right">{row.value}</Pin> : null}
          <FigAsset src={screen2Asset("bar-track")} x={361.92} y={row.barY} w={430} h={13} />
        </span>
      ))}

      <Pin x={973.06} y={743.04} size={26} weight={700} color="#f0f5f5" lh={30}>Compliance trend — last 6 months</Pin>
      <Pin x={1785.98} y={786.02} w={93} size={25} weight={700} color="#34eddc" lh={29} align="right">100%</Pin>
      {[
        [964.98, 974.05, "97%"],
        [926.96, 934.96, "98%"],
        [887.0, 895.97, "99%"],
        [848.02, 856.01, "100%"],
        [809.03, 817.99, ""],
      ].map(([labelY, lineY, label]) => (
        <span key={`${labelY}`}>
          {label ? <Pin x={972.99} y={labelY as number} w={50} size={17} color="#8fa3a4" lh={20} align="right">{label as string}</Pin> : null}
          <FigAsset src={screen2Asset("trend-grid")} x={1035.98} y={(lineY as number) - 0.5} w={819} h={1} />
        </span>
      ))}
      <At x={1035.98} y={848} w={819} h={4}>
        <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(to right, #1e897f, #34efde)" }} />
      </At>
      {trendMonths.map((month) => (
        <At key={`${month.label}-dot`} x={month.x + 14} y={846} w={10} h={10}>
          <div style={{ width: "100%", height: "100%", borderRadius: 999, background: "#34efde" }} />
        </At>
      ))}
      {trendMonths.map((month) => (
        <Pin key={`${month.label}-label`} x={month.x} y={980.96} w={40} size={18} color="#d3dede" lh={21} align="center">{month.label}</Pin>
      ))}
    </Frame>
  )
}

function showsCompare(value: string) {
  const match = value.match(/-?\d[\d,]*(?:\.\d+)?/)
  if (!match) return false
  const n = Number(match[0].replace(/,/g, ""))
  return Number.isFinite(n) && n !== 0
}

function StripCards({
  cards,
  children,
  compare = true,
}: {
  cards: { label: string; value: string; down: boolean; amount: string }[]
  children?: ReactNode
  compare?: boolean
}) {
  return (
    <Frame border={false}>
      {cards.map((card, index) => {
        const x = 20 + index * 473
        return (
          <span key={card.label}>
            <At x={x} y={20} w={461} h={282}><div className="kpi" /></At>
            <Pin x={x} y={54} w={461} size={24} weight={500} color="#34efde" lh={40} align="center">{card.label}</Pin>
            <Pin x={x} y={131} w={461} size={90} weight={400} color="#ffffff" lh={41} align="center">{card.value}</Pin>
            {compare && showsCompare(card.value) && (
              <Pin x={x} y={218} w={461} size={20} color="#a4a7ae" lh={24} align="center">
                {card.amount === "—" ? "— " : <span style={{ color: "#13f88b" }}>{card.down ? "▼" : "▲"} {card.amount} </span>}vs yesterday
              </Pin>
            )}
          </span>
        )
      })}
      {children}
    </Frame>
  )
}

function dayShift(current: number | null, previous: number | null) {
  if (current == null || previous == null || previous === 0) return { down: false, amount: "—" }
  const pct = ((current - previous) / Math.abs(previous)) * 100
  const rounded = Math.round(Math.abs(pct) * 10) / 10
  return { down: pct < 0, amount: `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)}%` }
}

function Screen3() {
  const { state } = useWall()
  const earlier = previousSpan(state.date, state.dateTo, state.period)
  const now = useUfgSummary(state)
  const then = useUfgSummary({ ...state, date: earlier.date, dateTo: earlier.dateTo })
  const volume = useDemand(state)
  const volumeThen = useDemand({ ...state, date: earlier.date, dateTo: earlier.dateTo })
  const billing = useBilling(state)
  const revenue = useContent().screen3.cards[3]
  const currentBilling = billingForRange(billing, state.date, state.dateTo)
  const thenBilling = billingForRange(billing, earlier.date, earlier.dateTo)
  const collection = billing == null ? "—" : currentBilling ? fieldPercent(currentBilling.revenueRealizationGross) : revenue.value
  const supply = volume?.supply ?? null
  const demand = supply == null ? "—" : `${compactCount(Math.round(supply))} m³`
  const ufg = now.current == null ? "—" : `${now.current.toFixed(1)}%`
  const customers = now.consumers == null ? "—" : Math.round(now.consumers).toLocaleString("en-US")
  return (
    <StripCards
      compare={false}
      cards={[
        { label: "CURRENT DEMAND", value: demand, ...dayShift(supply, volumeThen?.supply ?? null) },
        { label: "UFG", value: ufg, ...dayShift(now.current, then.current) },
        { label: "CUSTOMERS AVAILABLE", value: customers, ...dayShift(now.consumers, then.consumers) },
        { label: revenue.label, value: collection, ...dayShift(currentBilling?.revenueRealizationGross ?? null, thenBilling?.revenueRealizationGross ?? null) },
      ]}
    />
  )
}

function Screen4() {
  const { state } = useWall()
  const cityId = state.cityId || "baku"
  const weather = useCachedResource<{ city: string; temp: string; summary: string }>(`/weather?city=${encodeURIComponent(cityId)}`, state.seed, false)
  const wx = (1920 - 463) / 2
  const wy = 40
  return (
    <Frame border={false}>
      <img className="at" src={weatherBaku} alt="" style={{ left: wx, top: wy, width: 463, height: 219 }} />
      <Pin x={wx} y={wy + 25} w={463} size={34} weight={300} color="#ffffff" lh={32} align="center">{weather?.city ?? cityById(cityId)?.label ?? "Baku"}</Pin>
      <Pin x={wx} y={wy + 83} w={463} size={100} weight={300} color="#ffffff" lh={76} align="center">{weather?.temp ?? "—"}</Pin>
      <Pin x={wx} y={wy + 180} w={463} size={22} weight={500} color="#ffffff" lh={26} align="center">{weather?.summary ?? ""}</Pin>
    </Frame>
  )
}

function ClusterChoice({ selected, onPick, children }: { selected: boolean; onPick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onPick}
      style={{
        display: "block",
        width: "100%",
        border: 0,
        background: selected ? "#165654" : "transparent",
        color: "#f2f6f5",
        font: "inherit",
        fontSize: 16,
        lineHeight: "22px",
        textAlign: "left",
        padding: "8px 16px",
        cursor: "pointer",
      }}
    >{children}</button>
  )
}

function Screen5() {
  const { state, patch, clearCache } = useWall()
  const [cacheCleared, setCacheCleared] = useState(false)
  const content = useContent()
  const connectivity = useConnectivity(state)
  const smartMeters = typeByKey(connectivity, "smart")?.total
  const retrofitMeters = typeByKey(connectivity, "retrofit")?.total
  const installedMeters = smartMeters == null || retrofitMeters == null ? null : smartMeters + retrofitMeters
  const meterSaving = installedMeters == null ? null : installedMeters * METER_READING_SAVING_AZN
  const opsSaving = VALVE_OPEN_CLOSE_OPS * VALVE_OPS_SAVING_AZN
  const combinedSaving = meterSaving == null ? null : meterSaving + opsSaving
  const money = (value: number | null) => (value == null ? "—" : value.toLocaleString("en-US"))
  const [clusterOpen, setClusterOpen] = useState(false)
  const opened = parseIso(state.date)
  const [view, setView] = useState({ y: opened.y, m: opened.m })
  const [anchor, setAnchor] = useState<string | null>(null)
  useEffect(() => {
    const next = parseIso(state.date)
    setView((current) => (current.y === next.y && current.m === next.m ? current : { y: next.y, m: next.m }))
  }, [state.date])
  const committedFrom = state.date <= state.dateTo ? state.date : state.dateTo
  const committedTo = state.date <= state.dateTo ? state.dateTo : state.date
  const from = anchor ?? committedFrom
  const to = anchor ?? committedTo
  const weeks = monthGrid(view.y, view.m)
  const rowH = weeks.length > 5 ? 52 : 62
  const cities = citiesOf(state.regionId)
  const { zones, clusters } = useUfgHierarchy()
  const regionApi = apiRegionId(state.regionId)
  const zoneId = zoneIdForCity(state.cityId)
  // Region → cities; region (+ city/zone) → clusters. No region ⇒ no city/cluster choices.
  const visible = regionApi
    ? clusters.filter((cluster) => cluster.zone_id !== "Z_goycay" && cluster.region_id === regionApi && (!zoneId || cluster.zone_id === zoneId))
    : []
  const selectedCluster = visible.find((cluster) => cluster.cluster_id === state.clusterId)
  const zoneName = new Map(zones.map((zone) => [zone.zone_id, zone.name_en]))
  const grouped = new Map<string, UfgCluster[]>()
  for (const cluster of visible) {
    const list = grouped.get(cluster.zone_id) ?? []
    list.push(cluster)
    grouped.set(cluster.zone_id, list)
  }
  const clusterLabel = selectedCluster ? (selectedCluster.name_en.length > 26 ? `${selectedCluster.name_en.slice(0, 25)}…` : selectedCluster.name_en) : "All clusters"
  const filters = [
    ["Region", regionLabel(state.regionId)],
    ["City", cityById(state.cityId)?.label ?? "All cities"],
    ["Cluster", clusterLabel],
    ["Date Range", formatRange(from, to)],
  ]
  const ox = 20
  const oy = 385
  const calX = 576
  const calW = 604
  const colW = calW / 7
  const active = "linear-gradient(90deg, #4af3e6 0%, #2ed8cb 48%, #1eb5a8 100%)"
  const chipW = 165
  const chipH = 44
  const chipGap = 14
  const chips = [content.periods.slice(0, 3), content.periods.slice(3)]
  const bars: ReactNode[] = []
  const days: ReactNode[] = []
  const today = todayIso()
  function pickDay(day: string) {
    if (day > today) return
    if (!anchor) {
      setAnchor(day)
      return
    }
    setAnchor(null)
    if (anchor === day) {
      patch({ date: day, dateTo: day, period: "" })
      return
    }
    patch({
      date: anchor < day ? anchor : day,
      dateTo: anchor < day ? day : anchor,
      period: "",
    })
  }
  weeks.forEach((week, row) => {
    const columns = week.flatMap((day, column) => {
      if (day == null) return []
      const key = iso(view.y, view.m, day)
      return key >= from && key <= to && key <= today ? [column] : []
    })
    if (columns.length && from !== to) {
      const start = columns[0]
      const end = columns[columns.length - 1]
      bars.push(
        <At key={`bar-${view.y}-${view.m}-${row}`} x={ox + calX + start * colW} y={oy + 275 + row * rowH} w={(end - start + 1) * colW} h={36}>
          <div style={{ height: "100%", borderRadius: 18, background: "#165654" }} />
        </At>,
      )
    }
    week.forEach((day, column) => {
      if (day == null) return
      const key = iso(view.y, view.m, day)
      const future = key > today
      const end = !future && (key === from || key === to || key === anchor)
      const y = oy + 268 + row * rowH
      days.push(
        <span key={key}>
          {end && (
            <At x={ox + calX + column * colW + (colW - 48) / 2} y={y} w={48} h={48}>
              <div style={{ width: 48, height: 48, borderRadius: 24, background: "#34efde" }} />
            </At>
          )}
          <At x={ox + calX + column * colW} y={y} w={colW} h={48}>
            <button type="button" className="cal-day" disabled={future} style={{ color: future ? "#4d5c5a" : end ? "#07302c" : "#e7f0ee", fontWeight: end ? 700 : 400, cursor: future ? "default" : undefined }} onClick={() => pickDay(key)}>{day}</button>
          </At>
        </span>,
      )
    })
  })
  return (
    <Frame border={false}>
      <At x={20} y={20} w={934} h={282}><div className="kpi" /></At>
      <At x={966} y={20} w={934} h={282}><div className="kpi" /></At>
      <Pin x={60} y={40} w={224} size={24} weight={500} color="#34efde" lh={29} wrap>Monthly meter reading cost avoided</Pin>
      <Pin x={425} y={40} w={224} size={24} weight={500} color="#34efde" lh={40}>Estimated saving</Pin>
      <Pin x={1006} y={40} w={231} size={24} weight={500} color="#34efde" lh={29} wrap>Connect / disconnect cost avoided</Pin>
      <Pin x={1371} y={40} w={224} size={24} weight={500} color="#34efde" lh={40}>Estimated saving</Pin>
      <Pin x={58} y={131} w={271} size={90} color="#ffffff" lh={41} align="center">{money(installedMeters)}</Pin>
      <div className="at" style={{ left: 425, top: 131, display: "flex", alignItems: "baseline", justifyContent: "center", width: 455, height: 41 }}>
        <span style={{ fontSize: 60, lineHeight: "41px", color: "#ffffff" }}>AZN&nbsp;</span>
        <span style={{ fontSize: 90, lineHeight: "41px", color: "#ffffff" }}>{money(meterSaving)}</span>
      </div>
      <Pin x={1006} y={131} w={152} size={90} color="#ffffff" lh={41} align="center">{VALVE_OPEN_CLOSE_OPS.toLocaleString("en-US")}</Pin>
      <div className="at" style={{ left: 1371, top: 131, display: "flex", alignItems: "baseline", justifyContent: "center", width: 404, height: 41 }}>
        <span style={{ fontSize: 60, lineHeight: "41px", color: "#ffffff" }}>AZN&nbsp;</span>
        <span style={{ fontSize: 90, lineHeight: "41px", color: "#ffffff" }}>{opsSaving.toLocaleString("en-US")}</span>
      </div>
      <Pin x={58} y={214} size={23} color="#d5e5e4" lh={27}>AZN 6 per meter per month</Pin>
      <Pin x={58} y={251} size={19} color="#7d9798" lh={22}>No. of meters × AZN 6 × months counted</Pin>
      <Pin x={1006} y={214} size={23} color="#d5e5e4" lh={27}>AZN 35 per avoided field visit</Pin>
      <Pin x={1006} y={251} size={19} color="#7d9798" lh={22}>No. of remote connect / disconnect operations × AZN 35</Pin>
      <Pin x={60} y={329} size={23} color="#8ca7a7" lh={27}>Combined estimated savings</Pin>
      <Pin x={1503} y={312} w={309} size={52} weight={700} color="#34eddc" lh={61} align="right">{combinedSaving == null ? "—" : `AZN ${combinedSaving.toLocaleString("en-US")}`}</Pin>

      <At x={ox} y={oy} w={1880} h={630}>
        <div style={{ width: "100%", height: "100%", borderRadius: 42, background: "linear-gradient(115deg, #12383a 0%, #0d2426 48%, #0a1819 100%)" }} />
      </At>
      <Pin x={ox + 78} y={oy + 28} size={20} weight={700} color="#2de0d2" lh={24}>LOCATION</Pin>
      <Pin x={ox + 78} y={oy + 60} size={16} color="#7a8a8b" lh={20}>Select geographic coverage</Pin>
      <At x={ox + 78} y={oy + 118} w={420} h={72}>
        <div style={{ height: "100%", borderRadius: 36, background: "#0c1b1c", position: "relative" }}>
          <div style={{ position: "absolute", left: 28, top: 12, fontSize: 13, letterSpacing: 1.4, color: "#798586" }}>REGION</div>
          <select
            className="region-select"
            value={state.regionId ?? ""}
            onChange={(event) => window.setRegion(event.target.value || null)}
          >
            <option value="">All regions</option>
            {EXC_REGIONS.map((item) => (
              <option key={item.value} value={item.value} disabled={!regionEnabled(item.value)}>{item.label}</option>
            ))}
          </select>
          <div style={{ position: "absolute", right: 28, top: 26, color: "#9aabb0", fontSize: 16, pointerEvents: "none" }}>⌄</div>
        </div>
      </At>
      <At x={ox + 78} y={oy + 206} w={420} h={72}>
        <div style={{ height: "100%", borderRadius: 36, background: "#0c1b1c", position: "relative", opacity: cities.length ? 1 : 0.55 }}>
          <div style={{ position: "absolute", left: 28, top: 12, fontSize: 13, letterSpacing: 1.4, color: "#798586" }}>CITY</div>
          <select
            className="region-select"
            value={state.cityId ?? ""}
            disabled={!cities.length}
            onChange={(event) => patch({ cityId: event.target.value || null, clusterId: null })}
          >
            <option value="">{cities.length ? "All cities" : "Select a region first"}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>{city.label}</option>
            ))}
          </select>
          <div style={{ position: "absolute", right: 28, top: 26, color: "#9aabb0", fontSize: 16, pointerEvents: "none" }}>⌄</div>
        </div>
      </At>
      <At x={ox + 78} y={oy + 294} w={420} h={72}>
        <div style={{ height: "100%", borderRadius: 36, background: "#0c1b1c", position: "relative", opacity: regionApi ? 1 : 0.55 }}>
          <div style={{ position: "absolute", left: 28, top: 12, fontSize: 13, letterSpacing: 1.4, color: "#798586" }}>CLUSTER</div>
          <button type="button" className="region-select" style={{ textAlign: "left", fontFamily: "inherit" }} disabled={!regionApi} onClick={() => regionApi && setClusterOpen((open) => !open)}>
            {regionApi ? clusterLabel : "Select a region first"}
          </button>
          {clusterOpen && regionApi && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 3 }} onClick={() => setClusterOpen(false)} />
              <div style={{ position: "absolute", left: 12, top: 70, zIndex: 4, width: 396, maxHeight: 260, overflowY: "auto", borderRadius: 18, background: "#0e2426", boxShadow: "0 16px 40px rgba(0,0,0,0.5)", padding: "6px 0" }}>
                <ClusterChoice selected={!selectedCluster} onPick={() => { patch({ clusterId: null }); setClusterOpen(false) }}>All clusters</ClusterChoice>
                {grouped.size > 1
                  ? [...grouped.entries()].map(([id, list]) => (
                    <div key={id}>
                      <div style={{ padding: "8px 16px 2px", color: "#7a8a8b", fontSize: 13, letterSpacing: 0.6 }}>{zoneName.get(id) ?? id}</div>
                      {list.map((cluster) => (
                        <ClusterChoice key={cluster.cluster_id} selected={cluster.cluster_id === state.clusterId} onPick={() => { patch({ clusterId: cluster.cluster_id }); setClusterOpen(false) }}>{cluster.name_en}</ClusterChoice>
                      ))}
                    </div>
                  ))
                  : visible.map((cluster) => (
                    <ClusterChoice key={cluster.cluster_id} selected={cluster.cluster_id === state.clusterId} onPick={() => { patch({ clusterId: cluster.cluster_id }); setClusterOpen(false) }}>{cluster.name_en}</ClusterChoice>
                  ))}
              </div>
            </>
          )}
          <div style={{ position: "absolute", right: 28, top: 26, color: "#9aabb0", fontSize: 16, pointerEvents: "none" }}>⌄</div>
        </div>
      </At>

      <Pin x={ox + 576} y={oy + 28} size={20} weight={700} color="#2de0d2" lh={24}>DATE SELECTION</Pin>
      <Pin x={ox + 576} y={oy + 60} size={16} color="#7a8a8b" lh={20}>Choose a date, month, year or range</Pin>
      <At x={ox + 576} y={oy + 98} w={604} h={52}>
        <div style={{ height: "100%", borderRadius: 26, background: "#0c1b1c", position: "relative" }}>
          {["Day", "Month", "Year"].map((label, index) => (
            <div key={label} style={{ position: "absolute", left: index * 158, width: 158, top: 0, height: 52, lineHeight: "52px", textAlign: "center", color: "#c5d0d0", fontSize: 18 }}>{label}</div>
          ))}
          <div style={{ position: "absolute", right: 8, top: 6, width: 132, height: 40, borderRadius: 20, background: active, color: "#07302c", fontSize: 16, fontWeight: 600, lineHeight: "40px", textAlign: "center" }}>Date Range</div>
        </div>
      </At>
      <At x={ox + calX} y={oy + 162} w={36} h={36}>
        <button type="button" className="cal-nav" onClick={() => setView((current) => shiftView(current, -1))}>‹</button>
      </At>
      <Pin x={ox + calX + 36} y={oy + 166} w={calW - 72} size={26} weight={700} color="#f3f6f5" lh={30} align="center">{monthTitle(view)}</Pin>
      <At x={ox + calX + calW - 36} y={oy + 162} w={36} h={36}>
        <button type="button" className="cal-nav" onClick={() => setView((current) => shiftView(current, 1))}>›</button>
      </At>
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
        <Pin key={day} x={ox + calX + index * colW} y={oy + 214} w={colW} size={15} color="#8b9c9c" lh={18} align="center">{day}</Pin>
      ))}
      {bars}
      {days}

      <At x={ox + 536} y={oy + 98} w={1} h={470}><div style={{ width: 1, height: "100%", background: "#343b3c" }} /></At>
      <At x={ox + 1260} y={oy + 98} w={1} h={470}><div style={{ width: 1, height: "100%", background: "#343b3c" }} /></At>

      <Pin x={ox + 1296} y={oy + 28} size={20} weight={700} color="#2de0d2" lh={24}>QUICK SELECT</Pin>
      <Pin x={ox + 1296} y={oy + 60} size={16} color="#7a8a8b" lh={20}>Common time periods</Pin>
      {chips.map((row, rowIndex) => row.map((label, column) => (
        <At key={label} x={ox + 1296 + column * (chipW + chipGap)} y={oy + 98 + rowIndex * (chipH + 10)} w={chipW} h={chipH}>
          <div
            onClick={() => {
              const range = periodRange(label)
              if (!range) return
              setAnchor(null)
              patch({ ...range, period: label })
            }}
            style={{
              height: "100%",
              borderRadius: chipH / 2,
              background: label === state.period ? active : "#0c1b1c",
              color: label === state.period ? "#07302c" : "#d5e0de",
              fontSize: 16,
              fontWeight: label === state.period ? 600 : 500,
              lineHeight: `${chipH}px`,
              textAlign: "center",
              cursor: "pointer",
            }}
          >{label}</div>
        </At>
      )))}
      <At x={ox + 1295} y={oy + 210} w={524} h={1}><div style={{ height: 1, background: "#343b3c" }} /></At>
      <Pin x={ox + 1296} y={oy + 222} size={20} weight={700} color="#2de0d2" lh={24}>SELECTED FILTERS</Pin>
      <At x={ox + 1664} y={oy + 216} w={150} h={36}>
        <div
          onClick={() => {
            clearCache()
            setCacheCleared(true)
            window.setTimeout(() => setCacheCleared(false), 1800)
          }}
          style={{
            height: "100%",
            borderRadius: 18,
            background: cacheCleared ? active : "#102628",
            color: cacheCleared ? "#07302c" : "#8b9c9c",
            fontSize: 14,
            fontWeight: 600,
            lineHeight: "36px",
            textAlign: "center",
            cursor: "pointer",
          }}
        >{cacheCleared ? "Cache Cleared" : "Clear Cache"}</div>
      </At>
      <At x={ox + 1304} y={oy + 262} w={510} h={170}>
        <div style={{ height: "100%", borderRadius: 18, background: "#161e22" }} />
      </At>
      {filters.map((row, index) => (
        <span key={row[0]}>
          <Pin x={ox + 1324} y={oy + 276 + index * 32} size={18} color="#8b9c9c" lh={22}>{row[0]}</Pin>
          <Pin x={ox + 1540} y={oy + 276 + index * 32} w={254} size={18} color="#e7f0ee" lh={22} align="right">{row[1]}</Pin>
        </span>
      ))}
      <At x={ox + 1304} y={oy + 458} w={176} h={56}>
        <div
          onClick={() => {
            const range = periodRange("Last 30 Days")
            if (!range) return
            setAnchor(null)
            patch({ ...range, period: "Last 30 Days", regionId: null, regionSet: true, cityId: null, clusterId: null, seed: 0 })
          }}
          style={{ height: "100%", borderRadius: 28, background: "#102628", color: "#d5e0de", fontSize: 20, lineHeight: "56px", textAlign: "center", cursor: "pointer" }}
        >Reset</div>
      </At>
      <At x={ox + 1496} y={oy + 458} w={318} h={56}>
        <div style={{ height: "100%", borderRadius: 28, background: active, color: "#07302c", fontSize: 22, fontWeight: 700, lineHeight: "56px", textAlign: "center" }}>Apply Filters</div>
      </At>
    </Frame>
  )
}

function Screen6() {
  const d = useContent().screen6
  const cards = [
    { x: 42, surface: "glow" as const, lx: 68, vx: 68, vy: 162, color: "#34efde", weight: 500 },
    { x: 354, surface: "heat" as const, lx: 387, vx: 387, vy: 166, color: "#eb7d5c", weight: 400 },
    { x: 662, surface: "glow" as const, lx: 695, vx: 695, vy: 165, color: "#34efde", weight: 500 },
    { x: 971, surface: "heat" as const, lx: 992, vx: 992, vy: 165, color: "#eb7d5c", weight: 400 },
    { x: 1280, surface: "glow" as const, lx: 1303, vx: 1303, vy: 165, color: "#34efde", weight: 500 },
    { x: 1588, surface: "glow" as const, lx: 1613, vx: 1613, vy: 165, color: "#34efde", weight: 500 },
  ].map((item, index) => ({ ...item, ...d.cards[index] }))
  const queue = [
    { y: 419, badgeY: 404, title: "Fire / Smoke Detection", meta: "QPS-04 Baku", badge: "Critical" },
    { y: 494, badgeY: 481, title: "Excavation Near Pipeline", meta: "Absheron Corridor", badge: "High" },
    { y: 570, badgeY: 555, title: "Unauthorized Access", meta: "DRS Ganja", badge: "High" },
    { y: 647, badgeY: 631, title: "Fire / Smoke Detection", meta: "QPS-04 Baku", badge: "Critical" },
  ]
  const breakdown = [
    { y: 355 }, { y: 412 }, { y: 470 }, { y: 526 }, { y: 584 }, { y: 640 },
  ].map((item, index) => ({ ...item, ...d.breakdown[index] }))
  const pills = [
    { x: 401, w: 276, fill: "linear-gradient(to right, #1e897f, #34efde)", lx: 403 },
    { x: 686, w: 276, fill: "linear-gradient(to right, #f8bd58, #926f34)", lx: 687 },
    { x: 971, w: 275, fill: "linear-gradient(to right, #f8bd58, #926f34)", lx: 971 },
    { x: 1256, w: 276, fill: "linear-gradient(to right, #854734, #eb7d5c)", lx: 1254 },
    { x: 1541, w: 276, fill: "linear-gradient(to right, #854734, #eb7d5c)", lx: 1541 },
  ].map((item, index) => ({ ...item, ...d.pills[index] }))
  return (
    <Frame>
      <Pin x={37} y={28} size={32} weight={900} color="#34efde" lh={40}>CAMERA VISION INCIDENTS</Pin>
      {cards.map((card) => (
        <At key={card.label} x={card.x} y={97} w={296} h={150}>
          <div className={`kpi surface-${card.surface}`} />
        </At>
      ))}
      {cards.map((card) => (
        <span key={`${card.label}-copy`}>
          <Pin x={card.lx} y={111} size={24} weight={card.weight} color={card.color} lh={40}>{card.label}</Pin>
          <Pin x={card.vx} y={card.vy} size={60} weight={400} color="#dff9f7" lh={40}>{card.value}</Pin>
        </span>
      ))}
      <At x={42} y={268} w={729} h={490}><div className="panel shell dim" /></At>
      <At x={789} y={268} w={1095} h={490}><div className="panel shell dim" /></At>
      <Pin x={53} y={289} size={32} weight={400} color="#ffffff" lh={40}>INCIDENT VERIFICATION QUEUE</Pin>
      {queue.map((row) => (
        <span key={row.badgeY}>
          <Pin x={63} y={row.y} size={22} color="#ffffff" lh={26}>{row.title}</Pin>
          <Pin x={375} y={row.y} size={22} color="#ffffff" lh={26}>{row.meta}</Pin>
          <At x={616} y={row.badgeY} w={136} h={42}>
            <div style={{ height: "100%", borderRadius: 12, background: "#d03000", color: "#ffffff", display: "grid", placeItems: "center", fontSize: 18, fontWeight: 500 }}>{row.badge}</div>
          </At>
        </span>
      ))}
      <Pin x={819} y={289} size={32} weight={400} color="#ffffff" lh={40}>INCIDENT TYPE BREAKDOWN</Pin>
      {breakdown.map((item) => (
        <span key={item.label}>
          <Pin x={819} y={item.y + 10} size={20} color="#757171" lh={24}>{item.label}</Pin>
          <At x={1101} y={item.y} w={708} h={44}>
            <div style={{ height: "100%", borderRadius: 22, background: "#33413f" }} />
          </At>
          <At x={1101} y={item.y} w={item.fill} h={44}>
            <div style={{ height: "100%", borderRadius: 22, background: "linear-gradient(to right, #854734, #eb7d5c)" }} />
          </At>
          <Pin x={1826} y={item.y + 10} size={20} color="#757171" lh={24}>{item.value}</Pin>
        </span>
      ))}
      {[
        [1101, "0"], [1228, "20%"], [1366, "40%"], [1500, "60%"], [1636, "80%"], [1766, "100%"],
      ].map(([x, label]) => (
        <Pin key={label as string} x={x as number} y={698} size={14} color="#a4a7ae" lh={16}>{label}</Pin>
      ))}
      <At x={42} y={789} w={1846} h={224}><div className="panel shell dim" /></At>
      <Pin x={82} y={833} size={32} weight={400} color="#ffffff" lh={39}>Total Cameras</Pin>
      <Pin x={82} y={885} size={70} weight={400} color="#ffffff" lh={85}>{d.cameras}</Pin>
      {pills.map((pill) => (
        <span key={pill.label}>
          <At x={pill.x} y={851} w={pill.w} h={18}>
            <div style={{ height: "100%", borderRadius: 40, background: pill.fill }} />
          </At>
          <Pin x={pill.lx} y={885} size={24} weight={400} color="#ffffff" lh={40}>{pill.label}</Pin>
          <Pin x={pill.lx} y={925} size={32} weight={400} color="#f3f5f4" lh={38}>{pill.value}</Pin>
        </span>
      ))}
    </Frame>
  )
}

function Screen7({ state }: { state: WallState }) {
  const jobs = useOmJobs(state)
  const fmt = (value: number | null | undefined) => (value == null ? "—" : value.toLocaleString("en-US"))
  const pct = (value: number | null | undefined) => (value == null ? "—" : `${value.toFixed(1)}%`)
  const assigned = jobs?.assigned ?? null
  const attended = jobs?.attended ?? null
  const resolved = jobs?.resolved ?? null
  const telco = jobs?.telco ?? 50
  const kpis = [
    { x: 43, y: 96, label: "Jobs assigned", lx: 73.92, ly: 107.03, value: fmt(assigned), vx: 73.92, vy: 168.05, vw: 120 },
    { x: 308.48, y: 101, label: "Cases attended", lx: 340.99, ly: 112, value: fmt(attended), vx: 340.99, vy: 173.02, vw: 120 },
    { x: 573.95, y: 101, label: "Cases resolved", lx: 605.95, ly: 112, value: fmt(resolved), vx: 605.95, vy: 173.02, vw: 120 },
    { x: 839.43, y: 101, label: "Telco Escalations", lx: 872.06, ly: 112, value: String(telco), vx: 872.06, vy: 173.02, vw: 68.93 },
    { x: 1104.91, y: 101, label: "Resolution rate", lx: 1132.99, ly: 112, value: pct(jobs?.resolutionRate), vx: 1132.99, vy: 173.02, vw: 166.08 },
    { x: 1370.39, y: 101, label: "Last 7 days visits", lx: 1401.98, ly: 112, value: fmt(jobs?.visits7), vx: 1401.98, vy: 173.02, vw: 68.93 },
    { x: 1635.89, y: 101, label: "Last 30 days visits", lx: 1668.1, ly: 112, value: fmt(jobs?.visits30), vx: 1668.1, vy: 173.02, vw: 103.87 },
  ]
  const actionYs = [767.02, 799.96, 833, 866.05, 898.99, 932.04, 964.98]
  const actions = (jobs?.actions ?? []).map((row, index) => ({
    ...row,
    y: actionYs[index] ?? 964.98,
    value: fmt(row.count),
    share: pct(row.share),
  }))
  // Compact pitch so 5 months clear the Telco footer (~972)
  const monthFirstY = 752
  const monthPitch = 38
  const months = (jobs?.months ?? []).slice(0, 5).map((row, index) => ({
    label: row.ym,
    y: monthFirstY + index * monthPitch,
    assigned: fmt(row.assigned),
    attended: fmt(row.attended),
    resolved: fmt(row.resolved),
    rate: pct(row.rate),
  }))
  const monthCols = [
    { key: "assigned" as const, x: 1205.95 },
    { key: "attended" as const, x: 1401.02 },
    { key: "resolved" as const, x: 1590.91 },
    { key: "rate" as const, x: 1800.96 },
  ]
  const statusTotal = Math.max(assigned ?? 0, 1)
  const statusRows = [
    { label: "Resolved", value: resolved, color: "#35e5d7", fill: "#35e5d7", y: 335.02, vy: 328.97, barY: 365.04 },
    { label: "Attended, not resolved", value: jobs?.attendedNotResolved, color: "#f2bd56", fill: "#f2bd56", y: 419.04, vy: 412.99, barY: 448.96 },
    { label: "Not yet attended", value: jobs?.notAttended, color: "#ed746b", fill: "#ed746b", y: 502.96, vy: 497.02, barY: 532.98 },
  ]
  const daily = jobs?.daily ?? []
  const dailyMax = Math.max(1, ...daily.map((day) => Math.max(day.assigned, day.resolved, day.pending)))
  const tickMax = Math.max(4, Math.ceil(dailyMax / 4) * 4)
  const chartLeft = 101
  const chartTop = 351
  const chartW = 1020
  const chartH = 180
  // Flip to false to restore sharp polyline segments
  const smoothOmJobsDaily = false
  const yAt = (value: number) => chartTop + chartH - (value / tickMax) * chartH
  const xAt = (index: number) => (daily.length <= 1 ? chartLeft + chartW / 2 : chartLeft + (index * chartW) / (daily.length - 1))
  const pathFor = (pick: (day: (typeof daily)[number]) => number) => {
    if (!daily.length) return ""
    const points = daily.map((day, index) => ({ x: xAt(index), y: yAt(pick(day)) }))
    return smoothOmJobsDaily ? smoothPolylinePath(points) : points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join("")
  }
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((share) => ({
    y: chartTop + chartH - share * chartH,
    label: String(Math.round(tickMax * share)),
  }))
  const dayLabels = daily.filter((_, index) => {
    if (daily.length <= 8) return true
    const step = Math.ceil(daily.length / 7)
    return index % step === 0 || index === daily.length - 1
  })
  return (
    <Frame mirror>
      <At x={55} y={716} w={901} h={31}>
        <div style={{ height: "100%", borderRadius: 95, background: "#232323", border: "1px solid #282b2a" }} />
      </At>
      <At x={1002} y={716} w={860} h={31}>
        <div style={{ height: "100%", borderRadius: 95, background: "#232323", border: "1px solid #282b2a" }} />
      </At>
      {kpis.map((card) => (
        <At key={card.label} x={card.x} y={card.y} w={246.025} h={150}><div className="kpi" /></At>
      ))}
      <At x={43} y={652} w={933} h={408}><div className="panel shell dim" /></At>
      <At x={43} y={268} w={1840} h={371}><div className="panel shell dim" /></At>
      <At x={986} y={652} w={897} h={408}><div className="panel shell dim" /></At>

      <Pin x={43.01} y={33.05} size={32} weight={900} color="#34efde" lh={40}>FIELD JOB PERFORMANCE FOR NON-COMMUNICATING DEVICES</Pin>
      {kpis.map((card) => (
        <span key={card.label}>
          <Pin x={card.lx} y={card.ly} size={24} weight={500} color="#34efde" lh={40}>{card.label}</Pin>
          <Pin x={card.vx} y={card.vy} w={card.vw} size={60} weight={700} color="#ffffff" lh={40} align="center">{card.value}</Pin>
        </span>
      ))}

      <Pin x={78.91} y={282.96} size={25} weight={700} color="#f2f5f5" lh={29}>DAILY JOB PROGRESS</Pin>
      <Pin x={1002.05} y={294.95} w={160} size={13} color="#91aaa8" lh={15} align="right">{jobs ? `${daily.length} days · om_jobs` : "Loading…"}</Pin>
      {yTicks.map((tick) => (
        <span key={tick.label}>
          <FigAsset src={screen7Asset("grid-line")} x={96.96} y={tick.y - 0.5} w={1026} h={1} />
          <Pin x={67.97} y={tick.y - 8} w={22} size={13} color="#91aaa8" lh={15} align="right">{tick.label}</Pin>
        </span>
      ))}
      {dayLabels.map((day) => {
        const index = daily.indexOf(day)
        const { m, d } = parseIso(day.day)
        return <Pin key={day.day} x={xAt(index) - 18} y={540} w={40} size={13} color="#91aaa8" lh={15} align="center">{`${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`}</Pin>
      })}
      {daily.length > 0 && (
        <svg className="at" viewBox="0 0 1920 1080" style={{ left: 0, top: 0, width: 1920, height: 1080, pointerEvents: "none" }}>
          <path d={pathFor((day) => day.assigned)} fill="none" stroke="#34efde" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d={pathFor((day) => day.resolved)} fill="none" stroke="#6bb8ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d={pathFor((day) => day.pending)} fill="none" stroke="#f2bd56" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <FigAsset src={screen7Asset("swatch-assigned")} x={106.94} y={610.54} w={26} h={3} />
      <FigAsset src={screen7Asset("swatch-resolved")} x={262.08} y={610.54} w={26} h={3} />
      <FigAsset src={screen7Asset("swatch-pending")} x={417.02} y={610.54} w={26} h={3} />
      <Pin x={142.08} y={602.96} size={14} color="#91aaa8" lh={16}>Assigned</Pin>
      <Pin x={297.02} y={602.96} size={14} color="#91aaa8" lh={16}>Resolved</Pin>
      <Pin x={451.97} y={602.96} size={14} color="#91aaa8" lh={16}>Pending</Pin>

      <Pin x={1228.99} y={282.96} size={25} weight={700} color="#f2f5f5" lh={29}>FIELD WORK STATUS</Pin>
      {statusRows.map((row) => {
        const value = row.value ?? null
        const fillW = value == null ? 0 : Math.max(value > 0 ? 8 : 0, Math.round((value / statusTotal) * 624))
        return (
          <span key={row.label}>
            <Pin x={1233.98} y={row.y} size={17} color="#e6f3f2" lh={20}>{row.label}</Pin>
            <Pin x={1760} y={row.vy} w={90} size={23} weight={700} color={row.color} lh={27} align="right">{fmt(value)}</Pin>
            <FigAsset src={screen7Asset("bar-track")} x={1233.98} y={row.barY} w={624} h={14} />
            {fillW > 0 ? (
              <At x={1233.98} y={row.barY} w={fillW} h={14}>
                <div style={{ height: "100%", borderRadius: 20, background: row.fill }} />
              </At>
            ) : null}
          </span>
        )
      })}
      <Pin x={1233.98} y={598} size={14} color="#91aaa8" lh={16}>
        {assigned == null ? "Loading om_jobs…" : `Derived from om_jobs: ${fmt(assigned)} assigned, ${fmt(attended)} attended, ${fmt(resolved)} resolved.`}
      </Pin>

      <Pin x={73.92} y={666.04} size={25} weight={700} color="#f2f5f5" lh={29}>FIELD JOB RESOLUTION & ESCALATION BREAKDOWN</Pin>
      <Pin x={90.05} y={721.98} size={16} weight={700} color="#e6f3f2" lh={19}>Resolution action</Pin>
      <Pin x={675.07} y={721.98} w={67.01} size={16} weight={700} color="#e6f3f2" lh={19} align="right">Resolved</Pin>
      <Pin x={841.92} y={721.98} w={90.05} size={16} weight={700} color="#e6f3f2" lh={19} align="right">Contribution</Pin>
      {actions.map((row) => (
        <span key={row.label}>
          <Pin x={90.05} y={row.y} size={15} color="#e6f3f2" lh={18}>{row.label}</Pin>
          <Pin x={690} y={row.y} w={52} size={16} weight={700} color="#35e5d7" lh={19} align="right">{row.value}</Pin>
          <Pin x={860} y={row.y} w={70} size={15} color="#e6f3f2" lh={18} align="right">{row.share}</Pin>
        </span>
      ))}
      {[791.96, 825.01, 857.95, 891, 924.05, 956.99, 990.04].map((y) => (
        <FigAsset key={y} src={screen7Asset("row-line")} x={73.92} y={y - 0.5} w={882} h={1} />
      ))}
      <Pin x={91.97} y={1005.05} size={15} weight={700} color="#35e5d7" lh={18}>TELCO COVERAGE ESCALATIONS · {telco} LOCATIONS (separate category)</Pin>

      <Pin x={1012.99} y={666.04} size={25} weight={700} color="#f2f5f5" lh={29}>MONTHLY FIELD PERFORMANCE</Pin>
      <Pin x={1025.09} y={721.98} size={16} weight={700} color="#e6f3f2" lh={19}>Month</Pin>
      <Pin x={1205.95} y={721.98} size={16} weight={700} color="#e6f3f2" lh={19}>Assigned</Pin>
      <Pin x={1401.02} y={721.98} size={16} weight={700} color="#e6f3f2" lh={19}>Attended</Pin>
      <Pin x={1590.91} y={721.98} size={16} weight={700} color="#e6f3f2" lh={19}>Resolved</Pin>
      <Pin x={1800.96} y={721.98} size={16} weight={700} color="#e6f3f2" lh={19}>Rate</Pin>
      {months.map((row) => (
        <span key={row.label}>
          <Pin x={1025.09} y={row.y} size={18} color="#e6f3f2" lh={18}>{row.label}</Pin>
          {monthCols.map((col) => (
            <Pin key={col.key} x={col.x} y={row.y} size={18} color="#e6f3f2" lh={18}>{row[col.key]}</Pin>
          ))}
        </span>
      ))}
      {months.slice(0, -1).map((row) => (
        <FigAsset key={`line-${row.label}`} src={screen7Asset("month-line")} x={1012.99} y={row.y + monthPitch - 10} w={829} h={1} />
      ))}
      <Pin x={1012.99} y={972} size={24} color="#34eddc" lh={28}>
        <span style={{ fontWeight: 400 }}>Telco Escalations — </span>
        <span style={{ fontWeight: 700 }}>{telco} locations</span>
      </Pin>
      <Pin x={1012.99} y={1007.96} size={18} color="#9aafad" lh={21}>
        Separate category; excluded from {fmt(resolved)} resolved cases and resolution percentages.
      </Pin>
    </Frame>
  )
}

function demandMax(values: number[]) {
  const high = values.reduce((max, value) => Math.max(max, value), 0)
  if (!(high > 0)) return 3
  let step = niceStep(high / 3)
  for (let guard = 0; guard < 12 && step * 3 < high; guard += 1) step = niceStep(step * 2)
  return step * 3
}

function spanDays(from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) return []
  const days: string[] = []
  for (let cursor = from; cursor <= to && days.length < 3660; cursor = addDays(cursor, 1)) days.push(cursor)
  return days
}

function DemandChart({ values, forecast, max }: { values: (number | null)[]; forecast: (number | null)[] | null; max: number }) {
  const count = Math.max(values.length, 2)
  const xAt = (index: number) => (values.length <= 1 ? 564 : (index * 1128) / (count - 1))
  const yAt = (value: number) => (max <= 0 ? 367 : ((max - value) / max) * 367)
  return (
    <svg className="at" viewBox="0 0 1130 368" style={{ left: 140, top: 500, width: 1130, height: 368 }}>
      {[0, 123, 244, 367].map((y) => (
        <line key={y} x1="1" x2="1129" y1={y} y2={y} stroke="#343838" strokeWidth="1" />
      ))}
      {forecast && (
        <path d={linePath(forecast, xAt, yAt)} fill="none" stroke="#f2a65a" strokeWidth="3" strokeDasharray="8 7" strokeLinecap="round" strokeLinejoin="round" />
      )}
      <path d={linePath(values, xAt, yAt)} fill="none" stroke="#34ddcc" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {values.length <= 60 && values.map((value, index) => (
        value == null ? null : <circle key={index} cx={xAt(index)} cy={yAt(value)} r="4" fill="#34ddcc" />
      ))}
      {forecast && values.length <= 60 && forecast.map((value, index) => (
        value == null ? null : <circle key={`f${index}`} cx={xAt(index)} cy={yAt(value)} r="4" fill="#f2a65a" />
      ))}
    </svg>
  )
}

function Screen8({ state }: { state: WallState }) {
  const demand = useDemand(state)
  const forecastEnd = demand?.forecast?.predicted.reduce((last, point) => (point.date > last ? point.date : last), state.dateTo) ?? state.dateTo
  const days = demand ? spanDays(state.date, forecastEnd) : []
  const today = todayIso()
  const byDate = new Map(demand?.points.map((point) => [point.date, point.value]) ?? [])
  const series = days.map((date) => (date >= today ? null : byDate.get(date) ?? 0))
  for (let index = series.length - 1; index >= 0; index -= 1) {
    const value = series[index]
    if (value != null && value > 0) break
    series[index] = null
  }
  let lastIndex = -1
  for (let index = series.length - 1; index >= 0; index -= 1) {
    if (series[index] != null) {
      lastIndex = index
      break
    }
  }
  let previousIndex = -1
  for (let index = lastIndex - 1; index >= 0; index -= 1) {
    if (series[index] != null) {
      previousIndex = index
      break
    }
  }
  const lastValue = lastIndex >= 0 ? series[lastIndex] : null
  const previousValue = previousIndex >= 0 ? series[previousIndex] : null
  if (lastValue != null && previousValue != null && previousValue > 0 && lastValue < previousValue / 2) series[lastIndex] = null
  const simulated = new Map(demand?.forecast?.simulated.map((point) => [point.date, point.value]) ?? [])
  const predicted = new Map(demand?.forecast?.predicted.map((point) => [point.date, point.value]) ?? [])
  const forecastSeries = demand?.forecast
    ? days.map((date) => {
        const simulatedValue = simulated.get(date)
        const predictedValue = predicted.get(date)
        if (date < today && simulatedValue != null) return simulatedValue
        return predictedValue ?? null
      })
    : null
  const actualNumbers = series.filter((value): value is number => value != null)
  const forecastNumbers = (forecastSeries ?? []).filter((value): value is number => value != null)
  const max = demandMax([...actualNumbers, ...forecastNumbers])
  const ticks = demand ? [max, (max * 2) / 3, max / 3, 0] : []
  const actual = demand ? compactCount(Math.round(demand.supply), 1) : "—"
  const forecastText = !demand ? "—" : demand.forecast ? compactCount(Math.round(forecastNumbers.reduce((sum, value) => sum + value, 0)), 1) : "N/A"
  return (
    <Frame mirror>
      <Pin x={67} y={32} size={32} weight={900} color="#34efde" lh={40}>GAS DEMAND & FLOW</Pin>
      <At x={34} y={97} w={910} h={165}><div className="kpi" /></At>
      <At x={959} y={97} w={910} h={165}><div className="kpi" /></At>
      <Pin x={63.94} y={100.98} size={24} weight={500} color="#34efde" lh={40}>Gas demand · Actual</Pin>
      <div className="at" style={{ left: 63.94, top: 158.98, display: "flex", alignItems: "baseline", gap: 12, height: 40 }}>
        <span style={{ fontSize: 60, fontWeight: 400, lineHeight: "40px", color: "#ffffff" }}>{actual}</span>
        <span style={{ fontSize: 24, lineHeight: "28px", color: "#a0aaa8" }}>MCM</span>
      </div>
      <Pin x={63.94} y={220} size={18} color="#ffffff" lh={21}>Total for selected period</Pin>
      <Pin x={993.98} y={100.98} size={24} weight={500} color="#34efde" lh={40}>Demand forecast</Pin>
      <div className="at" style={{ left: 993.98, top: 158.98, display: "flex", alignItems: "baseline", gap: 12, height: 40 }}>
        <span style={{ fontSize: 60, fontWeight: 400, lineHeight: "40px", color: "#ffffff" }}>{forecastText}</span>
        {demand?.forecast && <span style={{ fontSize: 24, lineHeight: "28px", color: "#a0aaa8" }}>MCM</span>}
      </div>
      <Pin x={993.98} y={220} size={18} color="#ffffff" lh={21}>Forecast for the same selected period</Pin>

      <At x={42} y={323} w={1272} h={692}><div className="panel shell dim" /></At>
      <At x={1338} y={323} w={556} h={692}><div className="panel shell dim" /></At>
      <Pin x={73.92} y={339.01} size={32} weight={700} color="#ffffff" lh={40} align="center" w={260}>Actual vs forecast</Pin>
      <FigAsset src={screen8Asset("divider")} x={1326} y={424} w={1} h={499} />

      {[866.99, 744.01, 623.05, 500.04].map((y) => (
        <FigAsset key={y} src={screen8Asset("chart-grid")} x={140.93} y={y - 0.5} w={1128} h={1} />
      ))}
      {(() => {
        const liveChart = actualNumbers.length > 1
        const chartLeft = 140.93
        const chartWidth = 1128
        // Evenly spaced labels across the full series — never hardcode day-of-month as indices
        const axisDays = (() => {
          if (!days.length) return [] as { day: string; index: number }[]
          const count = Math.min(7, days.length)
          const picked: { day: string; index: number }[] = []
          for (let slot = 0; slot < count; slot += 1) {
            const index = count === 1 ? 0 : Math.round((slot * (days.length - 1)) / (count - 1))
            if (picked.length && picked[picked.length - 1].index === index) continue
            picked.push({ day: days[index], index })
          }
          return picked
        })()
        const axisLabel = (iso: string) => {
          const { m, d } = parseIso(iso)
          return `${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}`
        }
        return (
          <>
            {liveChart ? ticks.map((tick, index) => (
              <Pin key={index} x={87} y={[490.97, 613.01, 735.05, 857.95][index]} w={92} size={16} color="#7d8885" lh={18} align="right">{compactCount(tick)}</Pin>
            )) : (
              [["—", 490.97], ["—", 613.01], ["—", 735.05], ["0", 857.95]].map(([label, y], index) => (
                <Pin key={`${label}-${index}`} x={87} y={y as number} w={92} size={16} color="#7d8885" lh={18} align="right">{label}</Pin>
              ))
            )}
            {axisDays.map(({ day, index }) => {
              const x = chartLeft + (index * chartWidth) / Math.max(days.length - 1, 1)
              return <Pin key={day} x={x - 28} y={872.96} w={56} size={18} color="#757171" lh={40} align="center">{axisLabel(day)}</Pin>
            })}
            {liveChart ? (
              <DemandChart values={series} forecast={forecastSeries} max={max} />
            ) : null}
          </>
        )
      })()}
      <FigAsset src={screen8Asset("legend-actual")} x={72.96} y={967} w={32} h={3.5} />
      <Pin x={119.04} y={948.02} size={24} color="#757171" lh={40}>Actual gas demand</Pin>
      <FigAsset src={screen8Asset("legend-forecast")} x={1050.05} y={967.5} w={32} h={3} />
      <Pin x={1099.97} y={948.02} size={24} color="#757171" lh={40}>Demand forecast</Pin>

      <Pin x={1366.08} y={339.01} size={32} weight={700} color="#ffffff" lh={40}>Demand drivers</Pin>
      <Pin x={1366.08} y={466.02} size={24} color="#f3f5f4" lh={28}>Weather impact</Pin>
      <Pin x={1366.08} y={506.95} size={18} color="#76817f" lh={21}>Weather Underground → heating degree-days</Pin>
      <FigAsset src={screen8Asset("driver-rule")} x={1366.08} y={548.96} w={480} h={1} />
      <Pin x={1366.08} y={571.97} size={24} color="#f3f5f4" lh={28}>Consumer growth impact</Pin>
      <Pin x={1366.08} y={613.98} size={18} color="#76817f" lh={21}>More customers × last year’s gas per customer</Pin>
      <At x={1360} y={721} w={512} h={265}>
        <div style={{ height: "100%", borderRadius: 20, background: "#232323", border: "1px solid #282b2a" }} />
      </At>
      <Pin x={1382.02} y={758.05} size={18} color="#76817f" lh={21}>Included within consumer growth</Pin>
      <Pin x={1382.02} y={794.02} size={24} color="#f3f5f4" lh={28}>Industrial growth impact</Pin>
      <FigAsset src={screen8Asset("driver-rule-inner")} x={1382.02} y={857.95} w={464} h={1} />
      <Pin x={1382.02} y={891} size={24} color="#f3f5f4" lh={28}>Commercial growth impact</Pin>
      <Pin x={42.05} y={1033.02} size={18} color="#76817f" lh={21}>Sources: Rockweb · CCC Forecast · Weather System · Billing → GIS</Pin>
    </Frame>
  )
}

function connectivityCell(row: ReturnType<typeof typeByKey>, key: string) {
  if (!row) return "—"
  if (key === "total") return formatCount(row.total)
  if (key === "comm") return formatPct(row.total ? (row.communicated / row.total) * 100 : null)
  if (key === "azercell") return formatPct(row.total ? (row.azercell / row.total) * 100 : null)
  if (key === "bakcell") return formatPct(row.total ? (row.bakcell / row.total) * 100 : null)
  if (key === "nc") return formatCount(row.nc7)
  if (key === "rsrp") return row.hasRadio ? formatCount(row.rsrp) : "—"
  if (key === "snr") return row.hasRadio ? formatCount(row.snr) : "—"
  return "—"
}

function chartAxisLabel(value: number) {
  if (value >= 1000) return `${Math.round(value / 1000)}K`
  return String(Math.round(value))
}

function Screen9({ state }: { state: WallState }) {
  const stats = useConnectivity(state)
  const kpis = [
    { x: 43, label: "TOTAL DEVICES", lx: 71.04, value: formatCount(stats?.kpis.total), vx: 71.04, vw: 160, note: "Registered devices", nx: 240, source: "total-devices" },
    { x: 504.54, label: "COMMUNICATED", lx: 532.99, value: formatCount(stats?.kpis.communicated), vx: 532.99, vw: 160, note: "Latest day in range", nx: 700, source: "communicated" },
    { x: 966.07, label: "COMMUNICATION RATE", lx: 994.94, value: formatPct(stats?.kpis.rate), vx: 994.94, vw: 166.08, note: "Successful communication", nx: 1174.08, source: "comm-rate" },
    { x: 1427.61, label: "NC > 7 DAYS", lx: 1455.94, value: formatCount(stats?.kpis.nc7), vx: 1455.94, vw: 120, note: "Requires attention", nx: 1600, source: "nc-7" },
  ]
  const columns = [
    { label: "TOTAL", x: 427.97, dash: 430, key: "total", w: 90 },
    { label: "COMM. %", x: 593.09, dash: 590, key: "comm", w: 90 },
    { label: "AZERCELL %", x: 782.98, dash: 780, key: "azercell", w: 100 },
    { label: "BAKCELL %", x: 973.06, dash: 970, key: "bakcell", w: 100 },
    { label: "NC >7 DAYS", x: 1157.95, dash: 1160, key: "nc", w: 100 },
    { label: "RSRP BREACHES", x: 1372.99, dash: 1385, key: "rsrp", w: 110 },
    { label: "SNR BREACHES", x: 1647.94, dash: 1655, key: "snr", w: 110 },
  ]
  const types: { label: string; y: number; source: ConnectivityTypeKey }[] = [
    { label: "Smart meters", y: 371.95, source: "smart" },
    { label: "Mechanical meters with retrofit", y: 402.95, source: "retrofit" },
    { label: "Pressure sensors", y: 434.05, source: "pressure" },
    { label: "Temperature sensors", y: 465.05, source: "temperature" },
    { label: "EVC Non-Commercial", y: 496.04, source: "evc-non" },
    { label: "EVC Commercial", y: 527.04, source: "evc-com" },
  ]
  const chart = stats?.chart ?? []
  const installedMax = Math.max(1, ...chart.map((day) => day.installed), 1)
  const chartLeft = 130
  const chartWidth = 1676
  const chartTop = 730
  const chartHeight = 211
  const slot = chart.length ? chartWidth / chart.length : chartWidth
  const barW = Math.max(4, Math.min(16, slot * 0.55))
  const innerW = Math.max(3, barW * 0.62)
  const ratePoints = chart.map((day, index) => {
    const x = chartLeft + slot * index + slot / 2
    const rate = day.rate == null ? 0 : Math.max(0, Math.min(100, day.rate))
    const y = chartTop + chartHeight - (rate / 100) * chartHeight
    return `${index === 0 ? "M" : "L"} ${x} ${y}`
  }).join(" ")
  const dayLabels = chart.filter((_, index) => {
    if (chart.length <= 16) return true
    const step = Math.ceil(chart.length / 15)
    return index % step === 0 || index === chart.length - 1
  })
  const rangeLabel = stats ? formatRange(stats.from, stats.to) : formatRange(state.date, state.dateTo)
  const leftTicks = [0, 0.25, 0.5, 0.75, 1].map((share) => ({
    y: chartTop + chartHeight - share * chartHeight,
    label: chartAxisLabel(installedMax * share),
  }))
  return (
    <Frame mirror>
      {kpis.map((card) => (
        <At key={card.source} x={card.x} y={97} w={427.394} h={150}><div className="kpi" /></At>
      ))}
      <At x={43} y={268} w={1840} h={328}><div className="panel shell dim" /></At>
      <At x={43} y={608} w={1840} h={418}><div className="panel shell dim" /></At>
      <At x={55} y={325} w={1813} h={31}>
        <div style={{ height: "100%", borderRadius: 95, background: "#232323", border: "1px solid #282b2a" }} />
      </At>
      {[887.98, 836.03, 783, 729, 941.98].map((y) => (
        <FigAsset key={y} src={screen9Asset("grid-line")} x={129.98} y={y - 0.5} w={1676} h={1} />
      ))}
      {chart.map((day, index) => {
        const x = chartLeft + slot * index + (slot - barW) / 2
        const installedH = chartHeight
        const communicatedH = day.installed > 0 ? (day.communicated / installedMax) * chartHeight : 0
        const innerX = x + (barW - innerW) / 2
        return (
          <span key={day.day}>
            <At x={x} y={chartTop} w={barW} h={installedH}>
              <div style={{ height: "100%", borderRadius: 27, background: "linear-gradient(to bottom, #34efde, #1e897f)" }} />
            </At>
            <At x={innerX} y={chartTop + (installedH - communicatedH)} w={innerW} h={Math.max(communicatedH, 0)}>
              <div style={{ height: "100%", borderRadius: 27, background: "linear-gradient(to bottom, #082321, #1e897f)" }} />
            </At>
          </span>
        )
      })}
      {ratePoints && (
        <svg className="at" viewBox="0 0 1920 1080" style={{ left: 0, top: 0, width: 1920, height: 1080, pointerEvents: "none" }}>
          <path d={ratePoints} fill="none" stroke="#f2a65a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {chart.map((day, index) => {
            const x = chartLeft + slot * index + slot / 2
            const rate = day.rate == null ? 0 : Math.max(0, Math.min(100, day.rate))
            const y = chartTop + chartHeight - (rate / 100) * chartHeight
            return <circle key={day.day} cx={x} cy={y} r="3.5" fill="#f2a65a" />
          })}
        </svg>
      )}
      {[400.03, 431.03, 462.02, 493.02, 524.02].map((y) => (
        <FigAsset key={y} src={screen9Asset("row-line")} x={67.97} y={y - 0.5} w={1787} h={1} />
      ))}

      <Pin x={43.01} y={33.05} size={32} weight={900} color="#34efde" lh={40}>DEVICE COMMUNICATION OVERVIEW</Pin>
      {kpis.map((card) => (
        <span key={card.source}>
          <Pin x={card.lx} y={108} size={24} weight={500} color="#34efde" lh={40}>{card.label}</Pin>
          <Pin x={card.vx} y={169.02} w={card.vw} size={60} weight={700} color="#ffffff" lh={40} align="center">{card.value}</Pin>
          <Pin x={card.nx} y={186.95} size={16} color="#a0aaa8" lh={19}>{card.note}</Pin>
        </span>
      ))}

      <Pin x={66.05} y={274.97} size={25} weight={700} color="#f2f5f5" lh={29}>DEVICE CONNECTIVITY BY TYPE</Pin>
      <Pin x={1500} y={292.03} w={360} size={17} color="#8ba1a5" lh={20} align="right">{stats ? `Ref day · meters ${typeByKey(stats, "smart")?.refDay ?? "—"}` : "Loading…"}</Pin>
      <Pin x={67.97} y={331.02} size={18} color="#b2e5de" lh={21}>DEVICE TYPE</Pin>
      {columns.map((column) => (
        <Pin key={column.key} x={column.x} y={331.02} size={18} color="#b2e5de" lh={21}>{column.label}</Pin>
      ))}
      {types.map((row) => {
        const data = typeByKey(stats, row.source)
        return (
          <span key={row.source}>
            <Pin x={67.97} y={row.y} size={18} color="#e7f1f2" lh={21}>{row.label}</Pin>
            {columns.map((column) => (
              <Pin key={column.key} x={column.dash} y={row.y} w={column.w} size={18} color="#e7f1f2" lh={21} align="right">{connectivityCell(data, column.key)}</Pin>
            ))}
          </span>
        )
      })}
      <Pin x={67.97} y={563.98} size={15} color="#8ba1a5" lh={18}>Thresholds: RSRP &lt; −110 dBm • SNR &lt; 13 dB | Operator from ICCID prefix 8999455 = Bakcell.</Pin>

      <Pin x={67.97} y={628.99} size={25} weight={700} color="#f2f5f5" lh={29}>DAILY COMMUNICATED VS TOTAL INSTALLED METERS</Pin>
      <Pin x={72.96} y={683.96} size={17} color="#81999b" lh={22}>{rangeLabel}</Pin>
      <FigAsset src={screen9Asset("swatch-installed")} x={1400.06} y={687.96} w={13} h={14} />
      <Pin x={1420.99} y={683.96} size={16} color="#a9bec0" lh={22}>Installed</Pin>
      <FigAsset src={screen9Asset("swatch-communicated")} x={1545.98} y={687.96} w={13} h={14} />
      <Pin x={1566.91} y={683.96} size={16} color="#a9bec0" lh={22}>Communicated</Pin>
      <FigAsset src={screen9Asset("swatch-rate")} x={1747.02} y={693.48} w={33} h={3} />
      <Pin x={1790.02} y={683.96} size={16} color="#a9bec0" lh={22}>Rate %</Pin>
      {leftTicks.map((tick) => (
        <Pin key={`l-${tick.label}`} x={85} y={tick.y - 8} w={40} size={15} color="#81989a" lh={17} align="right">{tick.label}</Pin>
      ))}
      {[0, 25, 50, 75, 100].map((label) => (
        <Pin key={`r-${label}`} x={1814.02} y={chartTop + chartHeight - (label / 100) * chartHeight - 8} size={14} color="#81989a" lh={16}>{label}</Pin>
      ))}
      {dayLabels.map((day) => {
        const index = chart.indexOf(day)
        const x = chartLeft + slot * index + slot / 2 - 8
        return <Pin key={day.day} x={x} y={953.96} w={20} size={13} color="#8aa1a3" lh={15} align="center">{day.day.slice(8, 10)}</Pin>
      })}
      <Pin x={72.96} y={991.98} size={15} color="#a1b3b4" lh={20}>Meters only · light bar = installed · dark bar = communicated that day · orange = communication rate.</Pin>
    </Frame>
  )
}

const impactRegions = [
  ["Ağsu", "Ağsu RQİİ"],
  ["Bakı", "Bakı RQİİ"],
  ["Gəncə", "Gəncə RQİİ"],
  ["Lənkəran", "Lənkəran RQİİ"],
  ["Qarabağ", "Qarabağ RQİİ"],
  ["Salyan", "Salyan RQİİ"],
  ["Şəmkir", "Şəmkir RQİİ"],
  ["Sumqayıt", "Sumqayıt RQİİ"],
  ["Tərtər", "Tərtər RQİİ"],
  ["Xaçmaz", "Xaçmaz RQİİ"],
  ["Zaqatala", "Zaqatala RQİİ"],
] as const

const impactMonths = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]

const heatStops: [number, [number, number, number]][] = [
  [0, [226, 59, 44]],
  [20, [225, 93, 69]],
  [40, [233, 139, 112]],
  [60, [240, 177, 92]],
  [80, [63, 212, 198]],
  [100, [198, 242, 90]],
]

function impactTone(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "#24302e"
  const level = Math.max(0, Math.min(100, value))
  let lower = heatStops[0]
  let upper = heatStops[heatStops.length - 1]
  for (let index = 0; index < heatStops.length - 1; index += 1) {
    if (level >= heatStops[index][0] && level <= heatStops[index + 1][0]) {
      lower = heatStops[index]
      upper = heatStops[index + 1]
      break
    }
  }
  const span = upper[0] - lower[0] || 1
  const mix = (level - lower[0]) / span
  const rgb = lower[1].map((channel, index) => Math.round(channel + (upper[1][index] - channel) * mix))
  return `rgb(${rgb.join(",")})`
}

const complaintPaints = [
  "linear-gradient(180deg, #6ff6e8 0%, #14b3a4 100%)",
  "linear-gradient(180deg, #f6d27a 0%, #c48a2e 100%)",
  "linear-gradient(180deg, #ff7a52 0%, #e44528 100%)",
  "linear-gradient(180deg, #ff6844 0%, #e23b2c 100%)",
  "linear-gradient(180deg, #ff5a3c 0%, #d43224 100%)",
]

function ComplaintColumns({ share }: { share: { label: string; count: number }[] }) {
  const track = 220
  const total = share.reduce((sum, item) => sum + item.count, 0)
  return (
    <At x={46} y={552} w={596} h={330}>
      <div style={{ height: "100%", display: "flex" }}>
        <div style={{ width: 36, height: track, marginTop: 34, display: "flex", flexDirection: "column", justifyContent: "space-between", color: "#8d9694", fontSize: 15 }}>
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        <div style={{ position: "relative", flex: 1, display: "flex", justifyContent: "space-between", paddingRight: 8 }}>
          <div style={{ position: "absolute", left: 0, right: 8, top: 34, height: 1, background: "#3a4442" }} />
          <div style={{ position: "absolute", left: 0, right: 8, top: 34 + track / 2, height: 1, background: "#3a4442" }} />
          {share.map((bar, index) => {
            const percent = total > 0 ? (bar.count / total) * 100 : 0
            const fill = Math.round((percent / 100) * track)
            return (
              <div key={bar.label} style={{ width: 96, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                <div style={{ height: 34, color: "#d5dddd", fontSize: 22, lineHeight: "34px" }}>{total > 0 ? `${Math.round(percent)}%` : "—"}</div>
                <div style={{ width: 62, height: track, borderRadius: 31, background: "#1b2b2d", position: "relative" }}>
                  <div style={{ position: "absolute", left: 7, right: 7, bottom: 7, height: Math.max(0, fill - 10), borderRadius: 24, background: complaintPaints[index] }} />
                </div>
                <div style={{ marginTop: 12, color: "#c5cece", fontSize: 16, lineHeight: "20px", textAlign: "center", whiteSpace: "pre-line" }}>{bar.label}</div>
              </div>
            )
          })}
        </div>
      </div>
    </At>
  )
}

function Screen13({ state }: { state: WallState }) {
  const impact = useImpact(state)
  const countText = (value: number | null | undefined) => (value == null ? "—" : value.toLocaleString("en-US"))
  const percentText = (value: number | null | undefined) => (value == null ? "—" : `${value.toFixed(1)}%`)
  const cards = [
    { x: 29, w: 295, lx: 54, vx: 54, label: "Service Level", value: percentText(impact?.serviceLevel) },
    { x: 339, w: 295, lx: 363, vx: 361, label: "Affected Customers", value: countText(impact?.affected) },
    { x: 649, w: 290, lx: 669, vx: 674, label: "Emergency Complaints", value: countText(impact?.serious) },
    { x: 954, w: 294, lx: 977, vx: 977, label: "FCR", value: percentText(impact?.fcr) },
    { x: 1263, w: 296, lx: 1303, vx: 1299, label: "Calls Answered", value: impact?.answered == null ? "—" : compactCount(Math.round(impact.answered)) },
    { x: 1574, w: 295, lx: 1602, vx: 1602, label: "Open Calls", value: countText(impact?.queue) },
  ]
  const share = impact?.share
  const barNumbers = impact
    ? [share?.leak ?? null, share?.pressure ?? null, share?.noSupply ?? null, impact.repeatCalls, impact.reopened]
    : [null, null, null, null, null]
  const barMax = Math.max(0, ...barNumbers.filter((value): value is number => value != null))
  const bars = [
    { y: 298, vx: 1737, paint: "linear-gradient(to right, #80493c, #e6846b)", label: "Gas leak" },
    { y: 331, vx: 1737, paint: "linear-gradient(to right, #1e897f, #34efde)", label: "Pressure" },
    { y: 364, vx: 1737, paint: "linear-gradient(to right, #1e897f, #34efde)", label: "No supply" },
    { y: 397, vx: 1737, paint: "linear-gradient(to right, #926f34, #f8bd58)", label: "Repeat calls" },
    { y: 430, vx: 1751, paint: "linear-gradient(to right, #80493c, #e6846b)", label: "Reopened calls" },
  ].map((item, index) => {
    const value = barNumbers[index]
    const fillW = value == null || barMax <= 0
    ? 0
    : Math.round((value / barMax) * 800);
    
    return {
      ...item,
      value: countText(value),
      fillW: Number.isFinite(fillW) && fillW < 100 ? 25 + fillW : fillW,
    };
  })
  const mix = [
    { label: "No\nSupply", count: share?.noSupply ?? 0 },
    { label: "Gas\nLeak", count: share?.leak ?? 0 },
    { label: "Pressure", count: share?.pressure ?? 0 },
    { label: "Meter", count: share?.meter ?? 0 },
    { label: "Other", count: share?.other ?? 0 },
  ]
  const heatX = Array.from({ length: 12 }, (_, index) => 884 + index * 69)
  const heatY = Array.from({ length: 11 }, (_, index) => 612 + index * 24)
  const heat = new Map((impact?.heat ?? []).map((cell) => [`${cell.rqii}|${cell.month}`, cell.serviceLevel]))
  const regions: [number, number][] = [
    [815, 615], [822, 639], [806, 663], [783, 687], [789, 712], [804, 735],
    [801, 760], [781, 784], [808, 809], [791, 833], [786, 857],
  ]
  const monthLabels: [number, string][] = [
    [900, "Jan"], [969, "Feb"], [1035, "Mar"], [1107, "Apr"], [1173, "May"], [1243, "Jun"],
    [1315, "Jul"], [1378, "Aug"], [1449, "Sep"], [1518, "Oct"], [1584, "Nov"], [1654, "Dec"],
  ]
  const sla = [
    { x: 335, paint: "linear-gradient(to right, #854735, #eb7e5d)", label: "Open CRM cases", value: countText(impact?.open) },
    { x: 641, paint: "linear-gradient(to right, #187a72, #2ce0d2)", label: "New cases", value: countText(impact?.calls) },
    { x: 947, paint: "linear-gradient(to right, #187a72, #2ce0d2)", label: "Resolved cases", value: countText(impact?.closed) },
    { x: 1253, paint: "linear-gradient(to right, #6b943b, #b4fa63)", label: "Sent to repair", value: countText(impact?.escalated) },
    { x: 1559, paint: "linear-gradient(to right, #6b943b, #b4fa63)", label: "Reopened calls", value: countText(impact?.reopened) },
  ]
  return (
    <Frame>
      <Pin x={37} y={28} size={30} weight={700} color="#2de1d0" lh={35}>CUSTOMER IMPACT & ACCIDENT CALLS</Pin>
      {cards.map((card) => (
        <At key={card.label} x={card.x} y={97} w={card.w} h={165}>
          <div className="kpi surface-glow" />
        </At>
      ))}
      {cards.map((card) => (
        <span key={`${card.label}-t`}>
          <Pin x={card.lx} y={card.label === "Calls Answered" || card.label === "Open Calls" ? 120 : 119} size={24} weight={500} color="#34efde" lh={40}>{card.label}</Pin>
          <Pin x={card.vx} y={card.label === "Calls Answered" || card.label === "Open Calls" ? 184 : 183} size={60} weight={400} color="#dff9f7" lh={40}>{card.value}</Pin>
        </span>
      ))}
      <At x={29} y={287} w={1840} h={184}><div className="panel shell dim" /></At>
      <Pin x={54} y={297} size={26} weight={700} color="#f2f4f4" lh={30}>ACCIDENT CALLS</Pin>
      <Pin x={54} y={335} size={20} weight={400} color="#a4adad" lh={23}>Registered in the selected period</Pin>
      <Pin x={54} y={364} size={70} weight={400} color="#ffffff" lh={85}>{impact?.calls == null ? "—" : compactCount(impact.calls)}</Pin>
      {bars.map((bar) => (
        <span key={bar.label}>
          <Pin x={565} y={bar.y} size={24} weight={400} color="#dce3e3" lh={28}>{bar.label}</Pin>
          <Pin x={1740} y={bar.y} size={24} weight={400} color="#e8ecec" lh={28}>{bar.value}</Pin>
          <At x={900} y={bar.y + 6} w={800} h={16}><div style={{ height: "100%", borderRadius: 33, background: "#303c3a" }} /></At>
          <At x={884} y={bar.y + 6} w={bar.fillW} h={16}><div style={{ height: "100%", borderRadius: 38, background: bar.paint }} /></At>
        </span>
      ))}
      <At x={29} y={479} w={633} h={422}><div className="panel shell dim" /></At>
      <At x={678} y={479} w={1191} h={422}><div className="panel shell dim" /></At>
      <Pin x={52} y={498} w={580} size={26} weight={700} color="#f4f6f6" lh={32} wrap>Complaint mix</Pin>
      <ComplaintColumns share={mix} />
      <Pin x={740} y={502} size={26} weight={700} color="#f1f4f4" lh={30}>SERVICE LEVEL BY REGION & MONTH ({state.date.slice(0, 4)})</Pin>
      <Pin x={740} y={540} size={18} weight={400} color="#a4adad" lh={21}>Completed accident calls</Pin>
      {monthLabels.map(([x, label]) => (
        <Pin key={label} x={x} y={581} size={18} weight={400} color="#a4adad" lh={21}>{label}</Pin>
      ))}
      {regions.map(([x, y], index) => (
        <Pin key={impactRegions[index][0]} x={x} y={y} size={18} weight={400} color="#c8d0d0" lh={21}>{impactRegions[index][0]}</Pin>
      ))}
      {heatY.map((y, row) => heatX.map((x, column) => (
        <At key={`${row}-${column}`} x={x} y={y} w={67} h={23}>
          <div style={{ height: "100%", background: impactTone(heat.get(`${impactRegions[row][1]}|${impactMonths[column]}`)) }} />
        </At>
      )))}
      <At x={1735} y={610} w={36} h={270}>
        <div style={{ height: "100%", borderRadius: 4, background: "linear-gradient(to bottom, #c6f25a 0%, #3fd4c6 20%, #f0b15c 40%, #e98b70 60%, #e15d45 80%, #e23b2c 100%)" }} />
      </At>
      {["100%", "80%", "60%", "40%", "20%", "0%"].map((label, index) => (
        <Pin key={label} x={1782} y={600 + index * 54} size={16} weight={400} color="#a4adad" lh={20}>{label}</Pin>
      ))}
      <At x={29} y={913} w={1840} h={145}><div className="panel shell dim" /></At>
      <Pin x={60} y={927} size={32} weight={400} color="#ffffff" lh={39}>CRM SLA</Pin>
      <Pin x={60} y={958} size={60} weight={400} color="#ffffff" lh={73}>{percentText(impact?.crmSla)}</Pin>
      <Pin x={60} y={1030} size={15} weight={400} color="#a0aaa8" lh={18}>Closed within 1 hour</Pin>
      {sla.map((item) => (
        <span key={item.label}>
          <At x={item.x} y={945} w={280} h={11}><div style={{ height: "100%", borderRadius: 44, background: item.paint }} /></At>
          <Pin x={item.x} y={966} size={19} weight={400} color="#f3f5f4" lh={22}>{item.label}</Pin>
          <Pin x={item.x} y={1000} size={25} weight={400} color="#f3f5f4" lh={29}>{item.value}</Pin>
        </span>
      ))}
    </Frame>
  )
}

const executiveAlerts = [
  ["02.Nov.26", "Steady Nil Consumption across Sep and Oct 2026", "Sumqayit", "Medium", "Investigate"],
  ["02.Nov.26", "800+ consumers below rated meter capacity", "General", "Medium", "Assess yearly trend and evaluate meter rating change"],
  ["01.Nov.26", "Cold Wave expected from 06-Nov-2026, demand increase forecasted", "General", "Medium", "Assess & Optimize Operating Pressures"],
  ["24.Oct.26", "Consumer ID 100464061800007 maxing rated meter capacity", "Sumqayit", "High", "Assign Field Crew for investigation and evaluate meter rating change"],
  ["15.Oct.26", "Low Pressure observed at network tail ends", "Sumqayit (Cluster 15)", "Medium", "Assess & Optimize Operating Pressures"],
  ["05.Oct.26", "Low Pressure observed at network tail ends", "Baku (Mashtaga)", "Medium", "Assess & Optimize Operating Pressures"],
  ["02.Oct.26", "1500+ consumers below rated meter capacity", "General", "Medium", "Assess yearly trend and evaluate meter rating change"],
  ["30.Sep.26", "Signal Strength reaching poor thresholds", "Sumqayit", "High", "Telco Intervention"],
  ["29.Sep.26", "Retrofit Devices non-communicative percentage increasing", "Baku", "Medium", "Investigate HES and Connectivity"],
  ["28.Sep.26", "Purchase Data Missing causing reconciliation blocks", "Sumqayit", "Medium", "Send field teams"],
  ["27.Sep.26", "Rainy and cold weather to continue for a week", "Agsu", "Medium", "Pressure Management"],
  ["26.Sep.26", "Leakage surveys indicate high prevalance of in-building emissions", "Sumqayit", "High", "Expedite rectification works"],
  ["25.Sep.26", "CPU utilization for GIS system peaking over 90%", "General", "Critical", "Optimize and Manage"],
  ["24.Sep.26", "Gas velocity voilations observed in Kurdemir", "Agsu", "High", "Change regulator Pressure Settings"],
  ["23.Sep.26", "Lead time for new connections in Goychay over the SLA", "Agsu", "Medium", "Investigate and Resolve"],
  ["22.Sep.26", "Service interruption complaints volume reduced MoM", "Baku", "Low", "Continue monitoring"],
  ["21.Sep.26", "Billing recovery on decline trend", "Ismaiyilli", "Medium", "Generate Consumer Notifications"],
  ["20.Sep.26", "Nil consumption consumers number raised MoM", "Baku", "Medium", "Mobilize field Gas Theft"],
  ["19.Sep.26", "Sales consistently dropping in Cluster 66 for three days", "Sumqayit", "Medium", "Continue monitoring"],
  ["18.Sep.26", "Sim card data utilization limit approaching limit", "Ucar", "High", "Top up credit limit"],
  ["17.Sep.26", "EVC batteries consumption higher than mean in Sumqayit", "Sumqayit", "Medium", "Re-assess communicaiton frequency"],
  ["16.Sep.26", "New Meter installation progress lower than planned rate", "Agsu", "Medium", "Investigate and Resolve"],
  ["15.Sep.26", "Cash collection channels are experiencing intermittent service degradation", "General", "High", "Investigate and Resolve"],
  ["14.Sep.26", "Connection application backlog is increasing faster than weekly completions", "General", "Medium", "Investigate and Resolve"],
  ["13.Sep.26", "Cybersecurity monitoring has identified repeated authentication anomalies", "General", "Medium", "Escalate to security team"],
  ["12.Sep.26", "Field workforce availability is below the level required for planned interventions", "General", "Medium", "Reprioritize non-critical work"],
  ["11.Sep.26", "Forecast demand is diverging from scheduled supply nominations", "Baku", "Medium", "Reconcile demand data"],
].map(([date, type, region, severity, action]) => ({ date, type, region, severity, action }))

const severityColor: Record<string, string> = {
  Critical: "#ff3c49",
  High: "#eb7d5c",
  Medium: "#ffcf32",
  Low: "#8fb8b4",
}

function ExecutiveAlertRow({ row, height }: { row: (typeof executiveAlerts)[number]; height?: number }) {
  return (
    <div
      style={{
        flex: height ? undefined : 1,
        height,
        minHeight: 0,
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: "118px 320px 160px 110px 1fr",
        columnGap: 24,
        alignItems: "center",
        borderTop: "1px solid #2a3330",
        padding: "6px 0",
      }}
    >
      <div style={{ color: "#cccccc", fontSize: 20, lineHeight: "24px", textAlign: "left", whiteSpace: "nowrap" }}>{row.date}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#ffffff", fontSize: 20, lineHeight: "26px" }}>{row.type}</div>
      </div>
      <div style={{ color: "#60bbb3", fontSize: 18, lineHeight: "22px", textTransform: "uppercase" }}>{row.region}</div>
      <div style={{ color: severityColor[row.severity], fontSize: 20, fontWeight: 600, lineHeight: "24px", textTransform: "uppercase" }}>{row.severity}</div>
      <div style={{ color: "#ffffff", fontSize: 24, lineHeight: "28px" }}>{row.action}</div>
    </div>
  )
}

function ExecutiveAlerts({ height }: { height: number }) {
  const smooth = useAlertScroll() === "smooth"
  const [offset, setOffset] = useState(0)
  const rowH = 114
  const visible = Math.max(1, Math.floor(height / rowH))
  const rowMs = alertRowMs(rowH)
  const track = useSmoothTrack(smooth, executiveAlerts.length, rowMs, executiveAlerts.length * rowH)
  useEffect(() => {
    if (smooth) return
    const timer = window.setInterval(() => setOffset((index) => (index + 1) % executiveAlerts.length), rowMs)
    return () => window.clearInterval(timer)
  }, [smooth, rowMs])
  const shown = smooth
    ? [...executiveAlerts, ...executiveAlerts]
    : Array.from({ length: visible }, (_, index) => executiveAlerts[(offset + index) % executiveAlerts.length])
  return (
    <At x={803} y={424} w={1062} h={height}>
      {smooth ? (
        <div style={{ height: "100%", overflow: "hidden" }}>
          <div ref={track}>
            {shown.map((row, index) => <ExecutiveAlertRow key={`${index}-${row.type}`} row={row} height={rowH} />)}
          </div>
        </div>
      ) : (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          {shown.map((row) => <ExecutiveAlertRow key={`${row.date}-${row.type}`} row={row} />)}
        </div>
      )}
    </At>
  )
}

function billingAmount(value: number | null | undefined) {
  if (value == null) return "—"
  const sign = value < 0 ? "−" : ""
  const abs = Math.abs(value)
  if (abs >= 1000) return `${sign}${compactCount(Math.round(abs), 1)}`
  return `${sign}${Math.round(abs).toLocaleString("en-US")}`
}

function Screen14({ state }: { state: WallState }) {
  const d = useContent().screen14
  const ufg = useUfgSummary(state)
  const quality = useQuality(state)
  const billing = useBilling(state)
  const currentBilling = billingForRange(billing, state.date, state.dateTo)
  const collectionText = billing == null ? "—" : currentBilling ? fieldPercent(currentBilling.revenueRealizationGross) : d.collection
  const balanceText = billing == null ? "—" : currentBilling ? billingAmount(currentBilling.outstandingBalance) : d.balance
  const ufgText = ufg.current == null ? "—" : `${ufg.current.toFixed(1)}%`
  const coverageShare = quality && quality.total > 0 && quality.days > 0 ? quality.received.overall / (quality.total * quality.days) : null
  const metersText = coverageShare == null ? "—" : `${(coverageShare * 100).toFixed(1)}%`
  const events = useTamper(state)
  const eventCounts = events ? [events.tampering, events.disassembly, events.interference, events.magnetic, events.battery] : null
  const eventMax = eventCounts ? Math.max(...eventCounts) : 0
  const boardTop = 285
  const boardBottom = 1040
  const boardH = boardBottom - boardTop
  const alertH = boardBottom - 28 - 424
  const tamper = [
    { y: 448, vx: 658 },
    { y: 581, vx: 656 },
    { y: 714, vx: 660 },
    { y: 847, vx: 677 },
    { y: 980, vx: 692 },
  ].map((item, index) => {
    const count = eventCounts ? eventCounts[index] : null
    const scaled = count == null || eventMax <= 0 ? 0 : Math.round((count / eventMax) * 255)
    const fill = scaled > 0 && scaled < 30 ? scaled + 30 : scaled
    return { ...item, bar: item.y + 1, ...d.tamper[index], value: count == null ? "—" : count.toLocaleString("en-US"), fill }
  })
  return (
    <Frame>
      <Pin x={37} y={28} size={32} weight={900} color="#34efde" lh={40}>EXECUTIVE  BOARD</Pin>
      {[
        [31, 298.1, true],
        [341, 299.3, false],
        [653, 299.3, false],
        [965, 299.3, false],
        [1278, 298.1, false],
        [1588, 299.3, false],
      ].map(([x, w, heat]) => (
        <At key={x as number} x={x as number} y={113} w={w as number} h={150}>
          <div className={heat ? "kpi surface-heat" : "kpi"} />
        </At>
      ))}
      <Pin x={58} y={113} size={24} weight={500} color="#eb7d5c" lh={40}>UFG</Pin>
      <Pin x={57} y={180} size={60} weight={700} color="#ffffff" lh={40}>{ufgText}</Pin>
      <Pin x={385} y={116} size={24} weight={500} color="#34efde" lh={40}>Realization Gross</Pin>
      <Pin x={382} y={180} size={60} weight={700} color="#ffffff" lh={40}>{collectionText}</Pin>
      <Pin x={669} y={113} size={24} color="#34efde" lh={40}>Outstanding Balance</Pin>
      <Pin x={669} y={180} size={60} weight={700} color="#ffffff" lh={40}>{balanceText} <span style={{ fontSize: 33 }}>{currentBilling ? "AZN" : ""}</span></Pin>
      <Pin x={982} y={116} size={24} weight={500} color="#34efde" lh={40}>Emergency Response</Pin>
      <Pin x={1000} y={180} size={60} weight={700} color="#ffffff" lh={40}>N/A {/*<span style={{ fontSize: 33 }}>MIN</span>*/}</Pin>
      <Pin x={1301} y={116} size={24} color="#34efde" lh={40}>Reconnect within 24 h</Pin>
      <Pin x={1299} y={180} size={60} weight={700} color="#ffffff" lh={40}>{100/*reconnectText*/}%</Pin>
      <Pin x={1612} y={116} size={24} color="#34efde" lh={40}>Meters Communicating</Pin>
      <Pin x={1610} y={180} size={60} weight={700} color="#ffffff" lh={40}>{metersText}</Pin>

      <At x={31} y={boardTop} w={718} h={boardH}><div className="panel shell dim" /></At>
      <At x={770} y={boardTop} w={1127} h={boardH}><div className="panel shell dim" /></At>
      <Pin x={58} y={307} size={32} color="#f4f5f4" lh={38}>Meter tampering events</Pin>
      <Pin x={58} y={370} size={18} color="#969b98" lh={21}>Detected during selected period</Pin>
      {tamper.map((row) => (
        <span key={row.label}>
          <Pin x={58} y={row.y} size={24} color="#e8f4f2" lh={29}>{row.label}</Pin>
          <Pin x={670} y={row.y} size={24} color="#e8f4f2" lh={29}>{row.value}</Pin>
          <At x={390} y={row.bar} w={255} h={27}><div style={{ height: "100%", borderRadius: 30, background: "#33413f" }} /></At>
          <At x={390} y={row.bar} w={row.fill} h={27}><div style={{ height: "100%", borderRadius: 38, background: "linear-gradient(to right, #1e897f, #34efde)" }} /></At>
        </span>
      ))}
      {tamper.slice(1).map((row) => (
        <At key={row.y} x={58} y={row.y - 16} w={662} h={1}><div style={{ height: 1, background: "#343a38" }} /></At>
      ))}

      <Pin x={803} y={307} size={32} color="#ffffff" lh={40}>EXECUTIVE ALERT BOARD</Pin>
      <Pin x={803} y={388} size={20} color="#a6b3af" lh={23}>Date</Pin>
      <Pin x={945} y={388} size={20} color="#a6b3af" lh={23}>Title</Pin>
      <Pin x={1289} y={388} size={20} color="#a6b3af" lh={23}>Region</Pin>
      <Pin x={1473} y={388} size={20} color="#a6b3af" lh={23}>Severity</Pin>
      <Pin x={1607} y={388} size={20} color="#a6b3af" lh={23}>Action</Pin>
      <ExecutiveAlerts height={alertH} />
    </Frame>
  )
}

function FigAsset({ src, x, y, w, h, unwired }: { src: string; x: number; y: number; w: number; h: number; unwired?: string }) {
  return <img className="at" alt="" src={src} width={w} height={h} data-unwired={unwired} style={{ left: x, top: y, display: "block" }} />
}

const billSpeedHardcoded = [
  { month: "July", total: 26163, day1: 24018, day1Pct: 91.8, days23: 1001, days410: 143, lateTo10: 1144 },
  { month: "August", total: 27700, day1: 27332, day1Pct: 98.67, days23: 368, days410: 0, lateTo10: 368 },
  { month: "September", total: 28429, day1: 28368, day1Pct: 99.79, days23: 0, days410: 61, lateTo10: 61 },
  { month: "October", total: 28498, day1: 28355, day1Pct: 99.5, days23: 0, days410: 0, lateTo10: 0 },
] as const

const billTrackFill = "#2b3534"
const billDay1Fill = "linear-gradient(to right, #18756E, #2DDBCE)"
const billDays23Fill = "linear-gradient(to right, #274C6E, #4C92D4)"
const billDays410Fill = "linear-gradient(to right, #5C5782, #A49BE8)"

const connectOpsHardcoded = [
  { month: "July", disconnect: 420, connect: 310 },
  { month: "August", disconnect: 510, connect: 360 },
  { month: "September", disconnect: 340, connect: 460 },
  { month: "October", disconnect: null, connect: null },
] as const

function Screen15() {
  const { state } = useWall()
  const billing = useBilling(state)
  const current = billingForRange(billing, state.date, state.dateTo)
  const loading = billing == null
  const kpis = [
    { x: 34, w: 295.014, lx: 56, vx: 156, vw: 200, label: "Revenue Realization Gross", value: loading ? "—" : fieldPercent(current?.revenueRealizationGross ?? null) },
    { x: 340.92, w: 295.675, lx: 360.76, vx: 444, vw: 170, label: "Revenue Realization Net", value: loading ? "—" : fieldPercent(current?.revenueRealizationNet ?? null) },
    { x: 649.16, w: 294.352, lx: 666.36, vx: 749, vw: 160, label: "Bill Payment Rate", value: loading ? "—" : fieldPercent(current?.billPaymentRate ?? null) },
    { x: 952.78, w: 295.014, lx: 969.31, vx: 1098.5, vw: 260, label: "Outstanding Credit", value: loading ? "—" : current ? `${billingAmount(current.outstandingCredit)} AZN` : "—" },
    { x: 1260.37, w: 294.352, lx: 1277.57, vx: 1397, vw: 220, label: "Outstanding Balance", value: loading ? "—" : current ? `${billingAmount(current.outstandingBalance)} AZN` : "—" },
    { x: 1563.99, w: 295.014, lx: 1580.52, vx: 1664, vw: 180, label: "Positive Balance %", value: loading ? "—" : fieldPercent(current?.positiveBalanceShare ?? null) },
  ]

  const billPanelY = 250
  const billPanelH = 448
  const billRowPitch = 78
  const billBarH = 40
  const billBarX = 279
  const billBarW = 1220
  const billFirstBarY = 370
  const billMinPeek = 18
  const billRows = billSpeedHardcoded.map((row, index) => {
    const barY = billFirstBarY + index * billRowPitch
    const byDay10 = row.day1 + row.lateTo10
    const share = (count: number) => (row.total > 0 ? (count / row.total) * billBarW : 0)
    // Nested capsules (design): track → days4–10 cum → days2–3 cum → day1 on top
    let w1 = share(row.day1)
    let w23 = share(row.day1 + row.days23)
    let w410 = share(row.day1 + row.days23 + row.days410)
    if (row.days23 > 0) w23 = Math.max(w23, w1 + billMinPeek)
    if (row.days410 > 0) w410 = Math.max(w410, w23 + billMinPeek)
    w410 = Math.min(billBarW, Math.round(w410))
    w23 = Math.min(w410, Math.round(w23))
    w1 = Math.min(w23 || w410 || billBarW, Math.round(w1))
    const layers = [
      { w: billBarW, fill: billTrackFill },
      ...(row.days410 > 0 && w410 > Math.max(w23, w1) ? [{ w: w410, fill: billDays410Fill }] : []),
      ...(row.days23 > 0 && w23 > w1 ? [{ w: w23, fill: billDays23Fill }] : []),
      ...(w1 > 0 ? [{ w: w1, fill: billDay1Fill }] : []),
    ]
    return {
      month: row.month,
      eligible: `${row.total.toLocaleString("en-US")} eligible`,
      my: barY + 2,
      ey: barY + 28,
      pct: `${row.day1Pct.toFixed(2)}%`,
      pctY: barY - 2,
      total: byDay10.toLocaleString("en-US"),
      totalY: barY + 2,
      barY,
      layers,
      source: `${row.month.toLowerCase()}-bill`,
    }
  })

  const opsPanelY = 708
  const opsPanelH = 312
  const opsRowPitch = 50
  const opsFirstY = 808
  const opsBarX = 230
  const opsMaxDisconnect = Math.max(...connectOpsHardcoded.map((row) => row.disconnect ?? 0), 1)
  const opsMaxConnect = Math.max(...connectOpsHardcoded.map((row) => row.connect ?? 0), 1)
  const opsDisconnectTrack = 520
  const opsConnectTrack = 460
  const connectRows = connectOpsHardcoded.map((row, index) => {
    const discY = opsFirstY + index * opsRowPitch
    const connY = discY + 22
    const disconnectW = row.disconnect == null ? 0 : Math.max(24, Math.round((row.disconnect / opsMaxDisconnect) * opsDisconnectTrack))
    const connectW = row.connect == null ? 0 : Math.max(24, Math.round((row.connect / opsMaxConnect) * opsConnectTrack))
    return {
      month: row.month,
      my: discY + 1,
      disconnect: row.disconnect == null ? "—" : String(row.disconnect),
      disconnectX: opsBarX + disconnectW + 12,
      disconnectY: discY - 1,
      disconnectW,
      connect: row.connect == null ? "—" : String(row.connect),
      connectX: opsBarX + connectW + 12,
      connectY: connY - 1,
      connectW,
      wired: row.disconnect != null && row.connect != null,
      source: `${row.month.toLowerCase()}-ops`,
    }
  })
  const opsDisconnectTotal = connectOpsHardcoded.reduce((sum, row) => sum + (row.disconnect ?? 0), 0)
  const opsConnectTotal = connectOpsHardcoded.reduce((sum, row) => sum + (row.connect ?? 0), 0)
  const opsHaveOctober = connectOpsHardcoded.every((row) => row.disconnect != null && row.connect != null)

  return (
    <Frame mirror>
      <Pin x={67} y={28} size={32} weight={900} color="#34efde" lh={40}>REVENUE & BILLING PERFORMANCE</Pin>

      {kpis.map((card) => (
        <span key={card.label}>
          <At x={card.x} y={90} w={card.w} h={142}><div className="kpi" /></At>
          <Pin x={card.lx} y={92} size={22} weight={500} color="#34efde" lh={24}>{card.label}</Pin>
          <Pin x={card.vx - card.vw / 2} y={142} w={card.vw} size={52} weight={700} color="#ffffff" lh={40} align="center">{card.value}</Pin>
        </span>
      ))}

      <At x={34} y={billPanelY} w={1846} h={billPanelH}><div className="panel shell dim" /></At>
      <Pin x={79} y={billPanelY + 28} size={26} weight={700} color="#f4fbfa" lh={30}>Bill generation speed</Pin>
      <Pin x={79} y={billPanelY + 60} size={16} color="#90a4a4" lh={19}>Share of eligible bills generated within each time window</Pin>

      <FigAsset src={screen15Asset("swatch-day1")} x={990.91} y={billPanelY + 52} w={12} h={12} />
      <Pin x={1010} y={billPanelY + 48} size={14} color="#b8c8c7" lh={17}>Day 1</Pin>
      <FigAsset src={screen15Asset("swatch-days2-3")} x={1199.04} y={billPanelY + 52} w={12} h={12} />
      <Pin x={1218} y={billPanelY + 48} size={14} color="#b8c8c7" lh={17}>Days 2–3</Pin>
      <FigAsset src={screen15Asset("swatch-days4-10")} x={1406.98} y={billPanelY + 52} w={12} h={12} />
      <Pin x={1426} y={billPanelY + 48} size={14} color="#b8c8c7" lh={17}>Days 4–10</Pin>
      <FigAsset src={screen15Asset("swatch-after-day10")} x={1555.97} y={billPanelY + 52} w={12} h={12} />
      <Pin x={1575} y={billPanelY + 48} size={14} color="#b8c8c7" lh={17}>After day 10 / remaining</Pin>

      {billRows.map((row) => (
        <span key={row.source}>
          <Pin x={81} y={row.my} size={22} weight={700} color="#f3f8f7" lh={26}>{row.month}</Pin>
          <Pin x={81} y={row.ey} size={14} color="#8da3a2" lh={17}>{row.eligible}</Pin>
          {row.layers.map((layer, layerIndex) => (
            <At key={`${row.source}-${layerIndex}`} x={billBarX} y={row.barY} w={layer.w} h={billBarH}>
              <div style={{ height: "100%", borderRadius: 999, background: layer.fill }} />
            </At>
          ))}
          <Pin x={1531} y={row.pctY} size={24} weight={700} color="#42e6d6" lh={28}>{row.pct}</Pin>
          <Pin x={1531} y={row.pctY + 28} size={13} color="#8ca7a5" lh={16}>generated on day 1</Pin>
          <Pin x={1720} y={row.totalY} w={84} size={20} weight={700} color="#f4fbfa" lh={24} align="right">{row.total}</Pin>
          <Pin x={1720} y={row.totalY + 24} w={84} size={13} color="#8ca7a5" lh={16} align="right">by day 10</Pin>
        </span>
      ))}

      <At x={34} y={opsPanelY} w={1075} h={opsPanelH}><div className="panel shell dim" /></At>
      <At x={1120} y={opsPanelY} w={760} h={opsPanelH}><div className="panel shell dim" /></At>

      <Pin x={79} y={opsPanelY + 18} size={24} weight={700} color="#f4fbfa" lh={28}>Connect / Disconnect within 24 hours</Pin>
      <Pin x={79} y={opsPanelY + 48} size={15} color="#90a4a4" lh={18}>Completed operations by month</Pin>
      <FigAsset src={screen15Asset("swatch-disconnect")} x={835.97} y={opsPanelY + 28} w={12} h={12} />
      <Pin x={854} y={opsPanelY + 24} size={15} color="#c4d4d2" lh={18}>Disconnect</Pin>
      <FigAsset src={screen15Asset("swatch-day1")} x={992.06} y={opsPanelY + 28} w={12} h={12} />
      <Pin x={1010} y={opsPanelY + 24} size={15} color="#c4d4d2" lh={18}>Connect</Pin>

      {connectRows.map((row) => (
        <span key={row.source}>
          <Pin x={84} y={row.my} size={18} weight={700} color="#eaf4f3" lh={22}>{row.month}</Pin>
          {row.disconnectW > 0 ? (
            <At x={opsBarX} y={row.disconnectY} w={row.disconnectW} h={15}>
              <div style={{ height: "100%", borderRadius: 33, background: "linear-gradient(to left, #ed746b, #87423d)" }} />
            </At>
          ) : null}
          {row.connectW > 0 ? (
            <At x={opsBarX} y={row.connectY} w={row.connectW} h={15}>
              <div style={{ height: "100%", borderRadius: 54, background: "linear-gradient(to right, #18756e, #2ddbce)" }} />
            </At>
          ) : null}
          <Pin x={row.disconnectW > 0 ? row.disconnectX : opsBarX + 8} y={row.disconnectY - 1} size={15} weight={700} color="#f1a395" lh={18} unwired={row.wired ? undefined : `${row.source}-disconnect`}>{row.disconnect}</Pin>
          <Pin x={row.connectW > 0 ? row.connectX : opsBarX + 8} y={row.connectY - 1} size={15} weight={700} color="#57e9dc" lh={18} unwired={row.wired ? undefined : `${row.source}-connect`}>{row.connect}</Pin>
        </span>
      ))}

      <Pin x={1161} y={opsPanelY + 18} size={24} weight={700} color="#f4fbfa" lh={28}>Operations summary</Pin>
      <Pin x={1161} y={opsPanelY + 58} size={15} color="#8ca7a5" lh={18}>{opsHaveOctober ? "July–October · completed within 24h" : "July–September · October pending"}</Pin>
      <Pin x={1162} y={opsPanelY + 108} size={17} color="#9ab1af" lh={20}>Disconnect</Pin>
      <Pin x={1650} y={opsPanelY + 100} w={115} size={26} weight={700} color="#f1816c" lh={30} align="right">{opsDisconnectTotal.toLocaleString("en-US")}</Pin>
      <FigAsset src={screen15Asset("row-line")} x={1161.98} y={opsPanelY + 140} w={676.99} h={1} />
      <Pin x={1162} y={opsPanelY + 158} size={17} color="#9ab1af" lh={20}>Connect</Pin>
      <Pin x={1650} y={opsPanelY + 150} w={115} size={26} weight={700} color="#2ddbce" lh={30} align="right">{opsConnectTotal.toLocaleString("en-US")}</Pin>
      <FigAsset src={screen15Asset("row-line")} x={1161.98} y={opsPanelY + 190} w={676.99} h={1} />
      <Pin x={1162} y={opsPanelY + 208} size={17} color="#9ab1af" lh={20}>Total operations</Pin>
      <Pin x={1650} y={opsPanelY + 200} w={115} size={26} weight={700} color="#f3faf9" lh={30} align="right">{(opsDisconnectTotal + opsConnectTotal).toLocaleString("en-US")}</Pin>

    </Frame>
  )
}

function fieldCount(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("en-US")
}

function fieldShare(part: number | null | undefined, total: number | null | undefined) {
  if (part == null || total == null || total <= 0) return null
  return (part / total) * 100
}

function fieldPercent(value: number | null) {
  return value == null ? "—" : `${value.toFixed(1)}%`
}

function fieldFill(value: number | null, track: number) {
  if (value == null) return 0
  return Math.max(0, Math.min(track, Math.round((value / 100) * track)))
}

const regulatorTotals: Record<string, number> = {
  "1": 1107,
  "2": 1564,
  "3": 1023,
  "4": 1309,
  "6": 1335,
  "7": 1083,
  "8": 421,
  "9": 1051,
  "11": 4724,
  "12": 1085,
}
const regulatorGrandTotal = 14702

function Screen16({ state }: { state: WallState }) {
  const field = useFieldOps(state)
  const october = state.dateTo >= "2026-10-01" && state.date <= "2026-10-31"
  const within24 = october ? (field ? 100 : null) : fieldShare(field?.reconnectionSameDay, field?.reconnection)
  const completion = october ? (field ? 100 : null) : fieldShare(field?.reconnectionDone, field?.reconnection)
  const within7 = october ? (field ? 100 : null) : fieldShare(field?.disconnectionWithin7, field?.disconnection)
  const meterCut = october ? (field ? 0 : null) : fieldShare(field?.meterCut, field?.disconnection)
  const replacement24 = fieldShare(field?.replacementSameDay, field?.replacements)
  const pipelines = fieldCount(field?.pipelines)
  const pipeline24 = fieldShare(field?.pipelinesSameDay, field?.pipelinesDone)
  const pipelineCoverage = fieldShare(field?.pipelinesDone, field?.pipelines)
  const regulators = fieldCount(field?.regulators)
  const regulatorTotal = state.regionId ? regulatorTotals[state.regionId] ?? null : regulatorGrandTotal
  const regulatorCoverage = fieldShare(field?.regulators, regulatorTotal)
  const kpis = [
    { x: 34, w: 446, label: "Accident calls", lx: 72, vx: 71, value: fieldCount(field?.calls), note: "Selected reporting period", nx: 274 },
    { x: 498, w: 447, label: "Resolved on first visit", lx: 539, vx: 542, value: fieldCount(field?.resolved), note: "Accident calls", nx: 820 },
    { x: 964, w: 445, label: "Leaks sent to repair within 24h", lx: 1001, vx: 1000, value: fieldCount(field?.leaks), note: "Dispatch to repair", nx: 1272 },
    { x: 1423, w: 446, label: "Suspected tamper / revenue loss", lx: 1455, vx: 1458, value: fieldCount(field?.tamper), note: "Suspected cases · not confirmed", nx: 1625 },
  ]
  const bars = [
    { x: 79, y: 602, track: 672, fill: fieldFill(pipelineCoverage, 672) },
    { x: 79, y: 927, track: 672, fill: fieldFill(regulatorCoverage, 672) },
    { x: 1146, y: 548, track: 320, fill: fieldFill(within24, 320) },
    { x: 1520, y: 548, track: 320, fill: fieldFill(completion, 320) },
    { x: 1146, y: 754, track: 320, fill: fieldFill(within7, 320) },
    { x: 1520, y: 754, track: 320, fill: fieldFill(meterCut, 320) },
    { x: 1146, y: 923, track: 320, fill: fieldFill(replacement24, 320) },
  ]
  const rules = [
    [79, 656, 672],
    [810, 580, 1048],
    [810, 801, 1048],
  ] as const
  return (
    <Frame mirror>
      <Pin x={37} y={28} size={32} weight={900} color="#34efde" lh={40}>FIELD OPERATION</Pin>
      <Pin x={1688} y={43} size={16} color="#a3aeab" lh={19}>Activity: {formatRange(state.date, state.dateTo)}</Pin>
      {kpis.map((card) => (
        <span key={card.label}>
          <At x={card.x + 10} y={87} w={432} h={150}><div className="kpi" /></At>
          <Pin x={card.lx} y={105} size={24} weight={500} color="#34efde" lh={28}>{card.label}</Pin>
          <Pin x={card.vx} y={152} size={60} weight={500} color="#ffffff" lh={48}>{card.value}</Pin>
          <Pin x={card.nx} y={179} size={15} color="#7f8b87" lh={18}>{card.note}</Pin>
        </span>
      ))}
      <At x={43} y={257} w={745} h={763}><div className="panel shell dim" /></At>
      <At x={806} y={257} w={1063} h={763}><div className="panel shell dim" /></At>
      <At x={797} y={350} w={1} h={549}><div style={{ height: "100%", background: "#373737" }} /></At>
      {rules.map(([x, y, w]) => (
        <At key={`${x}-${y}`} x={x} y={y} w={w} h={1}><div style={{ height: 1, background: "#353a39" }} /></At>
      ))}
      <Pin x={79} y={278} size={32} weight={700} color="#ffffff" lh={40}>Network inspections</Pin>
      <Pin x={79} y={329} size={18} color="#a3aeab" lh={21}>Inspection volume and coverage</Pin>
      <Pin x={79} y={419} size={24} color="#f3f5f4" lh={28}>Pipeline leak inspection</Pin>
      <Pin x={79} y={497} size={43} color="#f3f5f4" lh={55}>{pipelines}</Pin>
      <Pin x={643} y={438} size={18} color="#a3aeab" lh={21}>During 24h</Pin>
      <Pin x={650} y={464} size={32} color="#34efde" lh={38}>{fieldPercent(pipeline24)}</Pin>
      <Pin x={79} y={559} size={18} color="#a3aeab" lh={23}>Pipeline leak inspection coverage</Pin>
      <Pin x={650} y={547} size={32} color="#f3f5f4" lh={38}>{fieldPercent(pipelineCoverage)}</Pin>
      <Pin x={79} y={698} size={24} color="#f3f5f4" lh={28}>Regulator inspection</Pin>
      <Pin x={79} y={811} size={43} color="#f3f5f4" lh={55}>{regulators}</Pin>
      <Pin x={79 + Math.max(86, regulators.length * 22 + 12)} y={836} size={16} color="#a3aeab" lh={21}>Regulators inspected</Pin>
      <Pin x={79} y={878} size={24} color="#a3aeab" lh={28}>Regulator inspection coverage</Pin>
      <Pin x={650} y={877} size={32} color="#f3f5f4" lh={38}>{fieldPercent(regulatorCoverage)}</Pin>
      <Pin x={79} y={963} size={18} color="#7f8b87" lh={21}>Coverage uses the corresponding inspection scope.</Pin>
      <Pin x={836} y={278} size={32} weight={700} color="#ffffff" lh={40}>Meter service operations</Pin>
      <Pin x={836} y={329} size={18} color="#a3aeab" lh={21}>Work volumes and completion measures</Pin>
      <Pin x={836} y={419} size={24} color="#f3f5f4" lh={28}>Reconnection</Pin>
      <Pin x={836} y={497} size={41} color="#f3f5f4" lh={48}>{fieldCount(field?.reconnection)}</Pin>
      <Pin x={836} y={548} size={15} color="#a3aeab" lh={18}>Recorded operations</Pin>
      <Pin x={1146} y={423} size={17} color="#a3aeab" lh={20}>Within 24h</Pin>
      <Pin x={1377} y={489} size={33} color="#f3f5f4" lh={39}>{fieldPercent(within24)}</Pin>
      <Pin x={1520} y={423} size={17} color="#a3aeab" lh={20}>Completion</Pin>
      <Pin x={1751} y={489} size={33} color="#f3f5f4" lh={39}>{fieldPercent(completion)}</Pin>
      <Pin x={836} y={665} size={24} color="#f3f5f4" lh={28}>Disconnection</Pin>
      <Pin x={836} y={706} size={41} color="#f3f5f4" lh={48}>{fieldCount(field?.disconnection)}</Pin>
      <Pin x={836} y={762} size={15} color="#a3aeab" lh={18}>Recorded operations</Pin>
      <Pin x={1146} y={669} size={17} color="#a3aeab" lh={20}>Within 7 days</Pin>
      <Pin x={1377} y={695} size={33} color="#f3f5f4" lh={39}>{fieldPercent(within7)}</Pin>
      <Pin x={1520} y={669} size={17} color="#a3aeab" lh={20}>Meter cut off</Pin>
      <Pin x={1751} y={695} size={33} color="#f3f5f4" lh={39}>{fieldPercent(meterCut)}</Pin>
      <Pin x={836} y={834} size={24} color="#f3f5f4" lh={28}>Replacement acts</Pin>
      <Pin x={836} y={875} size={41} color="#f3f5f4" lh={48}>{fieldCount(field?.replacements)}</Pin>
      <Pin x={836} y={931} size={15} color="#a3aeab" lh={18}>Acts recorded</Pin>
      <Pin x={1146} y={838} size={17} color="#a3aeab" lh={20}>Done within 24h</Pin>
      <Pin x={1377} y={864} size={33} color="#f3f5f4" lh={39}>{fieldPercent(replacement24)}</Pin>
      {bars.map((bar) => (
        <span key={`${bar.x}-${bar.y}`}>
          <At x={bar.x} y={bar.y} w={bar.track} h={22}><div style={{ height: "100%", borderRadius: 38, background: "#33413f" }} /></At>
          <At x={bar.x} y={bar.y} w={bar.fill} h={22}><div style={{ height: "100%", borderRadius: 38, background: "linear-gradient(to right, #1d897f, #34efde)" }} /></At>
        </span>
      ))}
    </Frame>
  )
}

const clusterPack: Record<string, number> = { c_41: 15.7, c_42: 19.5, c_160: 41.38 }

function linePack(state: WallState) {
  if (!state.clusterId) return null
  return clusterPack[state.clusterId] ?? null
}

function linePackVariation(state: WallState) {
  const sumgayit = state.regionId === "8" || state.cityId === "sumgayit"
  const baku = state.regionId === "11" || state.cityId === "baku"
  if (sumgayit) return 0.44
  if (baku) return 0.41
  if (!state.regionId && !state.cityId) return (0.44 * 462 + 0.41 * 655) / (462 + 655)
  return null
}

function pipelineKm(value: number) {
  const rounded = Math.round(value * 10) / 10
  return `${Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)} km`
}

function Screen17({ state }: { state: WallState }) {
  const spots = [34, 499, 964, 1429]
  const demand = useDemand(state)
  const meters = useMeterSplit(state)
  const quality = useQuality(state)
  const capacity = useCapacity(state)
  const coverageShare = quality && quality.total > 0 && quality.days > 0 ? quality.received.overall / (quality.total * quality.days) : null
  const dayCount = spanDays(state.date, state.dateTo).length
  const dailyVolume = demand && dayCount > 0 ? demand.total / dayCount : null
  const utilization = dailyVolume != null && capacity != null && capacity > 0 ? (dailyVolume / capacity) * 100 : null
  const systemMargin = utilization == null ? null : 100 - utilization
  const volume = demand ? `${compactCount(Math.round(demand.total))} m³` : "—"
  const peak = demand?.peak == null ? "—" : `${compactCount(Math.round(demand.peak))} m³/day`
  const percentText = (value: number) => `${value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)}%`
  const meterText = (value: number | undefined) => (value == null ? "—" : value.toLocaleString("en-US"))
  const pipe = useGis(state)
  const pack = linePack(state)
  const variation = linePackVariation(state)
  const variationText = variation == null ? "—" : `+${variation.toFixed(2)}%`
  const cards = useContent().screen17.cards.map((card, index) => ({
    x: spots[index],
    ...card,
    value: card.title === "PIPELINE INFRA"
      ? (pipe ? pipelineKm(pipe.distribution + pipe.service) : "—")
      : card.title === "LINE PACK"
        ? (pack == null ? "N/A" : `${pack.toLocaleString("en-US")} m³`)
        : index === 0
          ? volume
          : card.title === "COVERAGE"
            ? (meters ? compactCount(meters.smart + meters.retrofit) : "—")
            : card.value,
    note: card.title === "PIPELINE INFRA"
      ? (pipe ? `${pipe.stations.toLocaleString("en-US")} active` : "—")
      : index === 0
        ? (utilization == null ? "—" : `Utilization ${percentText(utilization)}`)
        : card.title === "LINE PACK"
          ? (variation == null ? "—" : `last read`)
          : card.note,
    bar: !card.bar
      ? card.bar
      : card.title === "COVERAGE"
        ? {
            ...card.bar,
            value: coverageShare == null ? "—" : `${(coverageShare * 100).toFixed(1)}%`,
            fill: coverageShare == null ? 0 : Math.max(0, Math.min(card.bar.track, Math.round(coverageShare * card.bar.track))),
          }
        : index === 0
          ? {
              ...card.bar,
              value: utilization == null ? "—" : percentText(utilization),
              fill: utilization == null ? 0 : Math.max(0, Math.min(card.bar.track, Math.round((utilization / 100) * card.bar.track))),
            }
          : card.bar,
    rows: index === 0
      ? [
          { label: "Peak Flow", value: peak },
          { label: "Available Capacity", value: capacity == null ? "—" : `${compactCount(Math.round(capacity))} m³/day` },
          { label: "Utilization", value: utilization == null ? "—" : percentText(utilization) },
          { label: "System Margin", value: systemMargin == null ? "—" : percentText(systemMargin) },
        ]
      : card.rows.map((row) => {
      if (card.title === "LINE PACK" && row.label === "Line Pack Variation") return { ...row, value: pack == null ? "N/A" : variationText}
      if (row.label === "Active Smart Metered") return { ...row, value: meterText(meters?.smart) }
      if (row.label === "Active Retrofited") return { ...row, value: meterText(meters?.retrofit) }
      if (card.title !== "PIPELINE INFRA") return row
      if (!pipe) return { ...row, value: "—" }
      if (row.label === "Distribution Lines") return { ...row, value: pipelineKm(pipe.distribution) }
      if (row.label === "Service Lines") return { ...row, value: pipelineKm(pipe.service) }
      if (row.label === "Active Stations") return { ...row, value: String(pipe.stations) }
      if (row.label === "Valves") return { ...row, value: pipe.valves.toLocaleString("en-US") }
      return row
    }),
  }))
  const rowY = [474, 577, 687, 790]
  const valueY = [514, 624, 727, 837]
  return (
    <Frame border={false}>
      {cards.map((card) => (
        <span key={card.title}>
          <At x={card.x} y={197} w={456} h={849}><div className="volume-card" /></At>
          <Pin x={card.x + 40} y={229} size={32} weight={700} color="#e8f4f2" lh={38}>{card.title}</Pin>
          <Pin x={card.x + 40} y={297} size={60} color="#34eddc" lh={70}>{card.value}</Pin>
          {card.note && <Pin x={card.x + 40} y={381} size={24} color="#8fa7a4" lh={28}>{card.note}</Pin>}
          <At x={card.x + 40} y={435} w={375} h={1}><div style={{ height: 1, background: "#353a39" }} /></At>
          {card.rows.map((row, index) => (
            <span key={row.label}>
              <Pin x={card.x + 39} y={rowY[index]} size={24} color="#ffffff" lh={40}>{row.label}</Pin>
              <Pin x={row.label === "Utilization" ? card.x + 291 : card.x + 39} y={valueY[index]} size={30} color="#339b9a" lh={40}>{row.value}</Pin>
            </span>
          ))}
          {card.bar && card.title !== "GAS SALE VOLUME" && (
            <span>
              <Pin x={card.x + 39} y={790} size={24} color="#ffffff" lh={40}>{card.bar.label}</Pin>
              <Pin x={card.x + 291} y={837} size={30} color="#339b9a" lh={40}>{card.bar.value}</Pin>
              <At x={card.x + 39} y={847} w={235} h={21}><div style={{ height: "100%", borderRadius: 63, background: "#34575b" }} /></At>
              <At x={card.x + 39} y={847} w={card.bar.fill} h={21}><div style={{ height: "100%", borderRadius: 38, background: "linear-gradient(to right, #1e897f, #34efde)" }} /></At>
            </span>
          )}
          {card.bar && card.title === "GAS SALE VOLUME" && (
            <span>
              <At x={card.x + 39} y={737} w={235} h={21}><div style={{ height: "100%", borderRadius: 63, background: "#34575b" }} /></At>
              <At x={card.x + 39} y={737} w={card.bar.fill} h={21}><div style={{ height: "100%", borderRadius: 38, background: "linear-gradient(to right, #1e897f, #34efde)" }} /></At>
            </span>
          )}
        </span>
      ))}
    </Frame>
  )
}

function Screen18() {
  // Counts from CCC data 02-Nov-2026.xlsx (Zero / Min sheets; Qmax fixed to 1)
  const track = 446.14
  const maxCount = Math.max(cccQmax, cccZeroConsumption, cccMinConsumption, 1)
  const fillOf = (count: number) => Math.max(count > 0 ? 8 : 0, Math.round((count / maxCount) * track))
  const rows = [
    { label: "Qmax Validation", y: 855, barY: 854, valueY: 854, value: cccQmax.toLocaleString("en-US"), fill: fillOf(cccQmax), source: "qmax" },
    { label: "Continuous Active\nZero Consumption", y: 911, barY: 924, valueY: 924, value: cccZeroConsumption.toLocaleString("en-US"), fill: fillOf(cccZeroConsumption), source: "zero" },
    { label: "Continuous Active\nMinimum Consumption", y: 995, barY: 1008, valueY: 1008, value: cccMinConsumption.toLocaleString("en-US"), fill: fillOf(cccMinConsumption), source: "minimum" },
  ]
  const report = [
    { value: "3", x: 1324, daysX: 1360.5, source: "report-qmax" },
    { value: "5", x: 1530.5, daysX: 1567, source: "report-zero" },
    { value: "5", x: 1765.5, daysX: 1802, source: "report-min" },
  ]
  const resolve = [
    { value: "12", x: 1315.5, daysX: 1360.5, source: "resolve-qmax" },
    { value: "6", x: 1530.5, daysX: 1567, source: "resolve-zero" },
    { value: "9", x: 1765.5, daysX: 1802, source: "resolve-min" },
  ]
  return (
    <Frame border={false}>
      <At x={26} y={772} w={866.155} h={290}><div className="panel shell dim" /></At>
      <At x={897.18} y={772} w={1004.821} h={290}><div className="panel shell dim" /></At>

      <Pin x={49.11} y={789} w={580.79} size={32} weight={700} color="#ffffff" lh={40} align="center">Customer Consumption Abnormalities</Pin>
      {rows.map((row) => (
        <span key={row.source}>
          <Pin x={56} y={row.y} w={300} size={24} color="#f3f5f4" lh={28} wrap>{row.label}</Pin>
          <At x={380.7} y={row.barY} w={track} h={30}>
            <div style={{ height: "100%", borderRadius: 27, background: "#33413f" }} />
          </At>
          <At x={380.7} y={row.barY} w={row.fill} h={30}>
            <div style={{ height: "100%", borderRadius: 38, background: "linear-gradient(to right, #1e897f, #34efde)" }} />
          </At>
          <Pin x={841.91} y={row.valueY} size={24} weight={700} color="#f3f5f4" lh={28}>{row.value}</Pin>
        </span>
      ))}

      <Pin x={923} y={794} size={32} weight={700} color="#ffffff" lh={40}>Average Days Taken to Report / Resolve</Pin>
      <Pin x={923} y={861} size={19} weight={700} color="#a9e9e3" lh={22}>Performance metric</Pin>
      <Pin x={1266} y={862} w={133} size={18} weight={700} color="#a9e9e3" lh={21} align="center">Qmax Validation</Pin>
      <Pin x={1464} y={862} w={150} size={18} weight={700} color="#a9e9e3" lh={21} align="center">Zero Consumption</Pin>
      <Pin x={1679} y={862} w={190} size={18} weight={700} color="#a9e9e3" lh={21} align="center">Minimum Consumption</Pin>

      <Pin x={923} y={920} size={21} color="#edf5f4" lh={25}>Average days taken to report</Pin>
      {report.map((cell) => (
        <span key={cell.source}>
          <Pin x={cell.x} y={916} w={cell.value.length > 1 ? 34 : 17} size={29} weight={700} color="#34eddc" lh={34} align="center" unwired={cell.source}>{cell.value}</Pin>
          <Pin x={cell.daysX} y={923} size={16} color="#a0b1b0" lh={19}>days</Pin>
        </span>
      ))}

      <Pin x={923} y={987} size={21} color="#edf5f4" lh={25}>Average days taken to resolve</Pin>
      {resolve.map((cell) => (
        <span key={cell.source}>
          <Pin x={cell.x} y={983} w={cell.value.length > 1 ? 34 : 17} size={29} weight={700} color="#34eddc" lh={34} align="center" unwired={cell.source}>{cell.value}</Pin>
          <Pin x={cell.daysX} y={990} size={16} color="#a0b1b0" lh={19}>days</Pin>
        </span>
      ))}
    </Frame>
  )
}

function HealthRing({ x }: { x: number }) {
  const r = 106
  const length = 2 * Math.PI * r
  return (
    <svg className="at" viewBox="0 0 240 240" style={{ left: x - 8, top: 742, width: 240, height: 240 }}>
      <defs>
        <linearGradient id={`health-${x}`} x1="8" y1="120" x2="232" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1c7f76" />
          <stop offset="1" stopColor="#36f9e8" />
        </linearGradient>
      </defs>
      <circle
        cx="120"
        cy="120"
        r={r}
        fill="none"
        stroke={`url(#health-${x})`}
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${length - 19} 19`}
        strokeDashoffset={length * 0.25 - 4}
      />
    </svg>
  )
}

const healthRings = [
  { x: 140, label: "Telecom", key: "comm.gateway_availability" },
  { x: 494, label: "Integration", key: "int.integration_success" },
  { x: 848, label: "Availability", key: "dc.infra_availability" },
  { x: 1202, label: "Response", key: "app.avg_response" },
  { x: 1556, label: "Comm.", key: "comm.success" },
]

function Screen19() {
  const read = useSocPanel()
  return (
    <Frame border={false}>
      <Pin x={425} y={657} size={32} weight={900} color="#34efde" lh={40}>SYSTEM HEALTH, CYBERSECURITY & ENTERPRISE ECOSYSTEM HEALTH</Pin>
      {healthRings.map((ring) => (
        <span key={ring.label}>
          <HealthRing x={ring.x} />
          <Pin x={ring.x - 20} y={842} w={264} size={48} color="#ffffff" lh={40} align="center">{read(ring.key)}</Pin>
          <Pin x={ring.x - 20} y={1004} w={264} size={32} color="#8fa7a4" lh={36} align="center">{ring.label}</Pin>
        </span>
      ))}
    </Frame>
  )
}

function Rule({ x, y, w, h = 1, color = "#353a39" }: { x: number; y: number; w: number; h?: number; color?: string }) {
  return <At x={x} y={y} w={w} h={h}><div style={{ width: "100%", height: "100%", background: color }} /></At>
}

function recordView(received: number, expected: number) {
  if (expected <= 0) return { text: "—", fill: 0, gap: "—" }
  const share = received / expected
  return {
    text: `${(share * 100).toFixed(1)}%`,
    fill: Math.max(0, Math.min(243, Math.round(share * 243))),
    gap: `${((1 - share) * 100).toFixed(1)}%`,
  }
}

function Screen20({ state }: { state: WallState }) {
  const d = useContent().screen20
  const quality = useQuality(state)
  const counts = quality ? [quality.total, quality.residential, quality.nonResidential, quality.balance] : [null, null, null, null]
  const arrived = quality ? [quality.received.overall, quality.received.residential, quality.received.nonResidential, quality.received.balance] : [null, null, null, null]
  const days = quality?.days ?? 0
  const views = counts.map((count, index) => {
    const got = arrived[index]
    if (count == null || got == null) return { text: "—", fill: 0, gap: "—" }
    return recordView(got, count * days)
  })
  const kpis = [
    { x: 29, lx: 60 },
    { x: 495, lx: 516 },
    { x: 960, lx: 980 },
    { x: 1426, lx: 1446 },
  ].map((item, index) => ({ ...item, ...d.cards[index], value: counts[index] == null ? "—" : counts[index].toLocaleString("en-US") }))
  const expected = [
    { y: 429 },
    { y: 500 },
    { y: 571 },
    { y: 642 },
  ].map((item, index) => ({
    ...item,
    ...d.expected[index],
    daily: counts[index] == null ? "—" : counts[index].toLocaleString("en-US"),
    period: counts[index] == null ? "—" : (counts[index] * days).toLocaleString("en-US"),
  }))
  const complete = [
    { y: 434, bar: 440, py: 414 },
    { y: 502, bar: 508, py: 481 },
    { y: 572, bar: 578, py: 554 },
    { y: 644, bar: 650, py: 625 },
  ].map((item, index) => ({ ...item, ...d.complete[index], ...views[index] }))
  const reads = [
    { y: 852, rule: 818, vy: 845 },
    { y: 907, rule: 884, vy: 900 },
    { y: 962, rule: 939, vy: 955 },
  ].map((item, index) => ({ ...item, ...d.reads[index], daily: views[index].gap, period: views[index].gap, hourly: "—" }))
  return (
    <Frame>
      <Pin x={27} y={28} size={32} weight={900} color="#34efde" lh={40}>DATA QUALITY</Pin>
      <Pin x={1742} y={42} size={17} color="#f3f5f4" lh={20}>{periodLabel(state.date)}</Pin>
      {kpis.map((card) => (
        <span key={card.label}>
          <At x={card.x} y={97} w={445} h={150}><div className="kpi" /></At>
          <Pin x={card.lx} y={99} size={24} weight={500} color="#34efde" lh={28}>{card.label}</Pin>
          <Pin x={card.lx} y={154} size={60} weight={700} color="#ffffff" lh={48}>{card.value}</Pin>
        </span>
      ))}

      <At x={29} y={270} w={839} h={434}><div className="panel shell dim" /></At>
      <Pin x={48} y={302} size={24} weight={700} color="#ffffff" lh={28}>Expected records</Pin>
      <Pin x={51} y={337} size={18} color="#76817f" lh={21}>Expected volume · count</Pin>
      <Pin x={512} y={375} size={18} color="#76817f" lh={21}>Daily</Pin>
      <Pin x={715} y={375} size={18} color="#76817f" lh={21}>For the period</Pin>
      <Rule x={51} y={405} w={776} />
      {expected.map((row) => (
        <span key={row.label}>
          <Pin x={49} y={row.y} size={24} color="#ffffff" lh={28}>{row.label}</Pin>
          <Pin x={400} y={row.y} w={170} size={24} color="#ffffff" lh={28} align="right">{row.daily}</Pin>
          <Pin x={620} y={row.y} w={210} size={24} color="#ffffff" lh={28} align="right">{row.period}</Pin>
        </span>
      ))}
      <Rule x={51} y={472} w={776} />
      <Rule x={51} y={543} w={776} />
      <Rule x={51} y={616} w={776} />

      <At x={875} y={270} w={996} h={434}><div className="panel shell dim" /></At>
      <Pin x={898} y={302} size={24} weight={700} color="#ffffff" lh={28}>Data completeness</Pin>
      <Pin x={1707} y={311} size={18} color="#76817f" lh={21}>0–100% per cell</Pin>
      <Pin x={899} y={337} size={18} color="#76817f" lh={21}>Daily and period completeness</Pin>
      <Pin x={1375} y={375} size={18} color="#76817f" lh={21}>Daily</Pin>
      <Pin x={1645} y={375} size={18} color="#76817f" lh={21}>For the period</Pin>
      <Rule x={899} y={405} w={936} />
      {complete.map((row) => (
        <span key={row.label}>
          <Pin x={899} y={row.y} size={24} color="#ffffff" lh={28}>{row.label}</Pin>
          <At x={1273} y={row.bar} w={243} h={12}><div style={{ height: "100%", borderRadius: 6, background: "#33413f" }} /></At>
          <At x={1273} y={row.bar} w={row.fill} h={12}><div style={{ height: "100%", borderRadius: 6, background: "linear-gradient(to right, #1e897f, #34efde)" }} /></At>
          <At x={1583} y={row.bar} w={243} h={12}><div style={{ height: "100%", borderRadius: 6, background: "#33413f" }} /></At>
          <At x={1583} y={row.bar} w={row.fill} h={12}><div style={{ height: "100%", borderRadius: 6, background: "linear-gradient(to right, #1e897f, #34efde)" }} /></At>
          <Pin x={1476} y={row.py} size={18} color="#ffffff" lh={21}>{row.text}</Pin>
          <Pin x={1786} y={row.py} size={18} color="#ffffff" lh={21}>{row.text}</Pin>
        </span>
      ))}
      <Rule x={899} y={472} w={936} />
      <Rule x={898} y={543} w={937} />
      <Rule x={899} y={616} w={936} />

      <At x={27} y={720} w={1308} h={307}><div className="panel shell dim" /></At>
      <Pin x={51} y={736} size={24} color="#ffffff" lh={28}>Estimated reads</Pin>
      <Pin x={53} y={771} size={18} color="#76817f" lh={21}>Estimated readings · share</Pin>
      <Pin x={638} y={787} size={18} color="#76817f" lh={21}>Daily</Pin>
      <Pin x={905} y={787} size={18} color="#76817f" lh={21}>For the period</Pin>
      <Pin x={1206} y={787} size={18} color="#76817f" lh={21}>Hourly</Pin>
      {reads.map((row) => (
        <span key={row.label}>
          <Rule x={51} y={row.rule} w={1260} />
          <Pin x={49} y={row.y} size={24} color="#ffffff" lh={28}>{row.label}</Pin>
          <Pin x={560} y={row.vy} w={150} size={24} color="#ffffff" lh={28} align="right">{row.daily}</Pin>
          <Pin x={820} y={row.vy} w={170} size={24} color="#ffffff" lh={28} align="right">{row.period}</Pin>
          <Pin x={1120} y={row.vy} w={150} size={24} color="#ffffff" lh={28} align="right">{row.hourly}</Pin>
        </span>
      ))}

      <At x={1346} y={720} w={521} h={312}><div className="panel shell dim" /></At>
      <Pin x={1371} y={736} size={24} color="#ffffff" lh={28}>Data processing</Pin>
      <Pin x={1371} y={780} size={18} color="#76817f" lh={21}>Separate measures</Pin>
      <Pin x={1371} y={862} size={24} color="#ffffff" lh={28}>Validation failure</Pin>
      <Pin x={1762} y={856} size={23} color="#f3f5f4" lh={45}>N/A</Pin>
      <Rule x={1371} y={922} w={472} />
      <Pin x={1371} y={944} size={24} color="#ffffff" lh={28}>Edited</Pin>
      <Pin x={1762} y={935} size={23} color="#f3f5f4" lh={45}>N/A</Pin>
    </Frame>
  )
}

function countText(value: number | null) {
  return value == null ? "—" : value.toLocaleString("en-US")
}

const pressureSpanRows = cccPressureSpans

function PressureSpanRow({ row, height }: { row: (typeof pressureSpanRows)[number]; height?: number }) {
  return (
    <div
      data-unwired={`span-${row.rank}`}
      style={{
        flex: height ? undefined : 1,
        height,
        minHeight: 0,
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: "60px 220px 230px 130px 130px 130px 80px",
        columnGap: 12,
        alignItems: "center",
        borderTop: "1px solid #2a3330",
        padding: "4px 0 8px",
        position: "relative",
      }}
    >
      <div style={{ color: "#34eddd", fontSize: 19, fontWeight: 700, lineHeight: "22px" }}>{row.rank}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#f0f6f5", fontSize: 17, fontWeight: 700, lineHeight: "20px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div>
        {row.sub ? <div style={{ color: "#a9c0be", fontSize: 15, lineHeight: "18px" }}>{row.sub}</div> : null}
      </div>
      <div style={{ color: "#b7cecb", fontSize: 15, lineHeight: "18px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.sensor}</div>
      <div style={{ color: "#cce4e1", fontSize: 15, lineHeight: "18px" }}>{row.position}</div>
      <div style={{ color: "#b7cecb", fontSize: 14, lineHeight: "17px" }}>{row.start}</div>
      <div style={{ color: "#b7cecb", fontSize: 14, lineHeight: "17px" }}>{row.end}</div>
      <div style={{ color: "#eb8a77", fontSize: 18, fontWeight: 700, lineHeight: "21px" }}>{row.span}</div>
      <div style={{ position: "absolute", left: 304, right: 22, bottom: 4, height: 7, borderRadius: 4, background: "rgba(52,87,91,0.35)", overflow: "hidden" }}>
        <div style={{ width: Math.min(704, row.fill), height: "100%", borderRadius: 4, background: "linear-gradient(to right, #1e897f, #34efde)" }} />
      </div>
    </div>
  )
}

function PressureSpanList({ height }: { height: number }) {
  const smooth = useAlertScroll() === "smooth"
  const [offset, setOffset] = useState(0)
  const rowH = 66
  const visible = Math.max(1, Math.floor(height / rowH))
  const rowMs = alertRowMs(rowH)
  const track = useSmoothTrack(smooth, pressureSpanRows.length, rowMs, pressureSpanRows.length * rowH)
  useEffect(() => {
    if (smooth) return
    const timer = window.setInterval(() => setOffset((index) => (index + 1) % pressureSpanRows.length), rowMs)
    return () => window.clearInterval(timer)
  }, [smooth, rowMs])
  const shown = smooth
    ? [...pressureSpanRows, ...pressureSpanRows]
    : Array.from({ length: visible }, (_, index) => pressureSpanRows[(offset + index) % pressureSpanRows.length])
  return (
    <At x={730} y={370} w={1110} h={height}>
      {smooth ? (
        <div style={{ height: "100%", overflow: "hidden" }}>
          <div ref={track}>
            {shown.map((row, index) => <PressureSpanRow key={`${index}-${row.rank}`} row={row} height={rowH} />)}
          </div>
        </div>
      ) : (
        <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
          {shown.map((row) => <PressureSpanRow key={`${row.rank}-${row.sensor}-${row.start}`} row={row} />)}
        </div>
      )}
    </At>
  )
}

function Screen21({ state }: { state: WallState }) {
  const d = useContent().screen21
  const pressure = usePressure(state)
  const leaks = useLeaks(state)
  const lowSensors = pressure ? pressure.lowSensors : null
  const mediumSensors = pressure ? pressure.mediumSensors : null
  const totalSensors = lowSensors == null || mediumSensors == null ? null : lowSensors + mediumSensors
  const kpis = [
    { x: 31, lx: 56 },
    { x: 649, lx: 674 },
    { x: 1267, lx: 1294 },
  ].map((item, index) => ({ ...item, ...d.cards[index], value: [countText(totalSensors), countText(lowSensors), countText(mediumSensors)][index] }))
  const surveyedLeaks = leaks ? countText(leaks.suspected) : "—"
  const clusterLayout = [
    { rankY: 388, nameY: 378, subY: 398, valY: 378, lineY: 420, line: "cluster-row-line-01" },
    { rankY: 448, nameY: 440, valY: 437, lineY: 478, line: "cluster-row-line-02" },
    { rankY: 508, nameY: 500, valY: 497, lineY: 538, line: "cluster-row-line-03" },
    { rankY: 568, nameY: 560, valY: 557, lineY: 598, lineA: "cluster-row-line-04a", lineB: "cluster-row-line-04b", lineBX: 160 },
    { rankY: 628, nameY: 620, valY: 617, lineY: 658, line: "cluster-row-line-05" },
  ]
  const clusterRows = cccTopPressureClusters.map((cluster, index) => ({ ...cluster, ...clusterLayout[index] }))
  const ppmBars = [
    { x: 1107, lx: 1122, label: "500-1000", trackY: 852, trackH: 139, fillY: 880, fillH: 111 },
    { x: 1365, lx: 1381, label: "1000-1500", trackY: 852, trackH: 139, fillY: 921, fillH: 70 },
    { x: 1623, lx: 1638, label: ">1500", trackY: 852, trackH: 146, fillY: 965, fillH: 27, trackSvg: true },
  ]
  return (
    <Frame>
      <Pin x={32} y={28} size={32} weight={900} color="#34efde" lh={40}>PRESSURE & LEAK DETECTION</Pin>
      {kpis.map((card) => (
        <span key={card.label}>
          <At x={card.x} y={97} w={605} h={150}><div className="kpi" /></At>
          <Pin x={card.lx} y={99} size={24} weight={500} color="#34efde" lh={40}>{card.label}</Pin>
          <Pin x={card.lx} y={154} size={60} weight={700} color="#ffffff" lh={40}>{card.value}</Pin>
          <Pin x={card.lx} y={201} size={18} weight={500} color="#ffffff" lh={40}>{card.note}</Pin>
        </span>
      ))}

      <At x={31} y={258} w={650} h={454}><div className="panel shell dim" /></At>
      <At x={694} y={258} w={1178} h={454}><div className="panel shell dim" /></At>
      <At x={31} y={725} w={910} h={330}><div className="panel shell dim" /></At>
      <At x={953} y={725} w={919} h={330}><div className="panel shell dim" /></At>

      <Pin x={56} y={273} size={25} weight={700} color="#f3f8f8" lh={29}>Top 5 clusters by low-pressure occurrence</Pin>
      <Pin x={76} y={331} size={16} weight={700} color="#9ccac5" lh={19}>RANK</Pin>
      <Pin x={160} y={331} size={16} weight={700} color="#9ccac5" lh={19}>CLUSTER</Pin>
      <Pin x={557} y={331} w={100} size={16} weight={700} color="#9ccac5" lh={19} align="right">VIOLATIONS</Pin>
      {clusterRows.map((row) => (
        <span key={row.rank}>
          <Pin x={76} y={row.rankY} size={24} weight={700} color="#34eddd" lh={23} unwired={`cluster-${row.rank}`}>{row.rank}</Pin>
          <Pin x={160} y={row.nameY} size={19} weight={700} color="#eff8f7" lh={22} unwired={`cluster-${row.rank}`}>{row.name}</Pin>
          {"sub" in row && row.sub ? <Pin x={160} y={row.subY!} size={17} color="#b5ccca" lh={20} unwired={`cluster-${row.rank}`}>{row.sub}</Pin> : null}
          <Pin x={591} y={row.valY} w={80} size={23} weight={700} color="#e9f7f5" lh={27} align="right" unwired={`cluster-${row.rank}`}>{row.violations}</Pin>
          {"line" in row && row.line ? <FigAsset src={screen21Asset(row.line)} x={160} y={row.lineY} w={490} h={9} /> : null}
          {"lineA" in row && row.lineA ? (
            <>
              <FigAsset src={screen21Asset(row.lineA)} x={160} y={row.lineY} w={490} h={9} />
              <FigAsset src={screen21Asset(row.lineB!)} x={row.lineBX!} y={row.lineY} w={31} h={9} />
            </>
          ) : null}
        </span>
      ))}

      <Pin x={730} y={278} size={25} weight={700} color="#f3f8f8" lh={29}>Longest observed low-pressure event spans</Pin>
      <Pin x={730} y={344} size={14} weight={700} color="#9ccac5" lh={17}>RANK</Pin>
      <Pin x={802} y={344} size={14} weight={700} color="#9ccac5" lh={17}>CLUSTER</Pin>
      <Pin x={1034} y={344} size={14} weight={700} color="#9ccac5" lh={17}>SENSOR ID</Pin>
      <Pin x={1277} y={344} size={14} weight={700} color="#9ccac5" lh={17}>POSITION</Pin>
      <Pin x={1418} y={344} size={14} weight={700} color="#9ccac5" lh={17}>START</Pin>
      <Pin x={1560} y={344} size={14} weight={700} color="#9ccac5" lh={17}>END</Pin>
      <Pin x={1702} y={344} size={14} weight={700} color="#9ccac5" lh={17}>SPAN</Pin>
      <PressureSpanList height={330} />

      <Pin x={56} y={738} size={24} color="#ffffff" lh={40}>Leak indicators</Pin>
      <Pin x={56} y={781} size={18} color="#76817f" lh={21}>Counts and handling times for the selected context</Pin>
      <Pin x={56} y={835} size={18} color="#76817f" lh={21}>Surveyed leaks</Pin>
      <Pin x={56} y={874} size={40} color="#f3f5f4" lh={47}>{surveyedLeaks}</Pin>
      <Pin x={399} y={887} size={18} color="#76817f" lh={21}>MDMS</Pin>
      <Pin x={486} y={835} size={18} color="#76817f" lh={21}>Repaired leaks</Pin>
      <Pin x={486} y={874} size={40} color="#f3f5f4" lh={47} unwired="repaired-leaks">{d.confirmed}</Pin>
      <Pin x={869} y={887} size={18} color="#76817f" lh={21}>LD</Pin>
      <FigAsset src={screen21Asset("leak-rule-v")} x={471} y={848} w={1} h={183} />
      <FigAsset src={screen21Asset("leak-rule-h")} x={56} y={946.5} w={850} h={1} />
      <Pin x={56} y={957} size={18} color="#76817f" lh={21}>Avg. leak response time</Pin>
      <Pin x={56} y={994} size={40} color="#f3f5f4" lh={47} unwired="avg-response">{d.response}</Pin>
      <Pin x={338} y={1007} size={18} color="#76817f" lh={21}>MFS · minutes</Pin>
      <Pin x={486} y={957} size={18} color="#76817f" lh={21}>Avg. leak repair time</Pin>
      <Pin x={486} y={984} size={40} color="#f3f5f4" lh={47} unwired="avg-repair">{d.repair}</Pin>
      <Pin x={776} y={1007} size={18} color="#76817f" lh={21}>MFS · minutes</Pin>

      <Pin x={976} y={738} size={24} color="#ffffff" lh={40}>Leak distribution by ppm</Pin>
      <Pin x={1414} y={745} size={18} color="#76817f" lh={21}>Demo categories and counts · population to confirm</Pin>
      <Pin x={976} y={778} size={18} color="#76817f" lh={21}>Leaks · count</Pin>
      <Pin x={995} y={836} w={40} size={14} color="#7f8b87" lh={17} align="right">10</Pin>
      <Pin x={1003} y={905} w={32} size={18} color="#76817f" lh={21} align="right">5</Pin>
      <Pin x={1003} y={974} w={32} size={18} color="#76817f" lh={21} align="right">0</Pin>
      <FigAsset src={screen21Asset("chart-grid-line")} x={1027} y={851.5} w={802} h={1} />
      <FigAsset src={screen21Asset("chart-grid-line")} x={1027} y={921.5} w={802} h={1} />
      <FigAsset src={screen21Asset("chart-grid-line")} x={1027} y={991.5} w={802} h={1} />
      {ppmBars.map((bar) => (
        <span key={bar.label}>
          {"trackSvg" in bar && bar.trackSvg ? (
            <FigAsset src={screen21Asset("bar-track-top")} x={bar.x} y={bar.trackY} w={92} h={137} />
          ) : (
            <At x={bar.x} y={bar.trackY} w={92} h={bar.trackH}>
              <div style={{ height: "100%", borderRadius: 67, background: "rgba(52,87,91,0.51)" }} />
            </At>
          )}
          <At x={bar.x} y={bar.fillY} w={92} h={bar.fillH}>
            <div style={{ height: "100%", borderRadius: 67, background: "linear-gradient(to bottom, #34efde, #1e897f)" }} />
          </At>
          <Pin x={bar.lx} y={1007} size={18} color="#76817f" lh={21}>{bar.label}</Pin>
        </span>
      ))}
      <Pin x={1093} y={863} size={18} color="#76817f" lh={21} unwired="ppm-500-1000">8</Pin>
      <Pin x={1349} y={863} size={18} color="#76817f" lh={21} unwired="ppm-1000-1500">5</Pin>
      <Pin x={1607} y={944} size={18} color="#76817f" lh={21} unwired="ppm-over-1500">2</Pin>
    </Frame>
  )
}

const bodies: Record<number, (state: WallState) => ReactNode> = {
  1: (state) => <Screen1 state={state} />,
  2: (state) => (state.ufgOpen ? <UfgScreen2 state={state} /> : <Screen2 state={state} />),
  3: () => <Screen3 />,
  4: () => <Screen4 />,
  5: () => <Screen5 />,
  6: () => <Screen6 />,
  7: (state) => <Screen7 state={state} />,
  8: (state) => (state.ufgOpen ? <UfgScreen8 /> : <Screen8 state={state} />),
  9: (state) => (state.ufgOpen ? <UfgScreen9 state={state} /> : <Screen9 state={state} />),
  13: (state) => <Screen13 state={state} />,
  14: (state) => <Screen14 state={state} />,
  15: () => <Screen15 />,
  16: (state) => <Screen16 state={state} />,
  17: (state) => <Screen17 state={state} />,
  18: () => <Screen18 />,
  19: () => <Screen19 />,
  20: (state) => <Screen20 state={state} />,
  21: (state) => <Screen21 state={state} />,
}

export function screenBody(id: number, state: WallState) {
  const render = bodies[id]
  return render ? render(state) : null
}
