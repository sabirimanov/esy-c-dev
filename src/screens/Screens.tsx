import { useEffect, useState, type ReactNode } from "react"
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
import { useFieldOps } from "../data/field"
import { useTamper } from "../data/tamper"
import { useCapacity, useMeterSplit, useUfgHierarchy, useUfgSummary, useUfgTrend, type UfgCluster } from "../data/ufg"
import { addDays, formatRange, iso, monthGrid, monthTitle, parseIso, periodRange, previousSpan, shiftView, todayIso, trendCaption } from "../wall/dates"
import { apiRegionId, citiesOf, cityById, EXC_REGIONS, regionEnabled, regionLabel, zoneIdForCity } from "../wall/places"
import { periodLabel, type WallState } from "../wall/state"
import { useWall } from "../wall/useWall"

function Pin({
  x, y, size, weight = 400, color, children, w, lh, align, wrap, font,
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
}) {
  return (
    <div
      className="at pin"
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
        whiteSpace: wrap ? "normal" : undefined,
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

function Screen2() {
  const percent = () => "N/A"
  const amount = () => "0"
  const rows = [
    { y: 442, bar: 460, title: "Residential meter compliance", hint: "Residential G4 / G6" },
    { y: 519, bar: 537, title: "Non-residential meter compliance", hint: "Commercial and industrial meters" },
    { y: 596, bar: 614, title: "Balance meter compliance", hint: "Balance meters and EVC" },
    { y: 673, bar: 691, title: "Pressure sensor compliance", hint: "Pressure sensors" },
  ]
  const pending = [
    { x: 65, label: "0–30 days", hint: "Within the grace period" },
    { x: 685, label: "31–60 days", hint: "Past the due date" },
    { x: 1305, label: "61–90 days", hint: "Past the due date" },
  ]
  return (
    <Frame mirror>
      <Pin x={37} y={28} size={32} weight={900} color="#34efde" lh={40}>CALIBRATION STATUS</Pin>
      <At x={43} y={97} w={427} h={150}><div className="kpi" /></At>
      <At x={505} y={97} w={426} h={150}><div className="kpi" /></At>
      <At x={966} y={97} w={427} h={150}><div className="kpi" /></At>
      <At x={1428} y={97} w={426} h={150}><div className="kpi" /></At>
      <Pin x={65} y={108} size={24} weight={500} color="#34efde" lh={40}>Calibration compliance</Pin>
      <Pin x={65} y={169} size={60} weight={700} color="#ffffff" lh={40}>{percent()}</Pin>
      <Pin x={262} y={187} size={16} color="#a0aaa8" lh={19}>Meters, EVC and sensors</Pin>
      <Pin x={530} y={108} size={24} weight={500} color="#34efde" lh={40}>Overdue assets</Pin>
      <Pin x={530} y={169} size={60} weight={700} color="#ffffff" lh={40}>{amount()}</Pin>
      <Pin x={727} y={187} size={16} color="#a0aaa8" lh={19}>More than 30 days past due</Pin>
      <Pin x={995} y={108} size={24} weight={500} color="#34efde" lh={40}>Long pending assets</Pin>
      <Pin x={995} y={169} size={60} weight={700} color="#ffffff" lh={40}>{amount()}</Pin>
      <Pin x={1192} y={187} size={16} color="#a0aaa8" lh={19}>More than 90 days past due</Pin>
      <Pin x={1460} y={108} size={24} weight={500} color="#34efde" lh={40}>Total assets</Pin>
      <Pin x={1456} y={169} size={60} weight={700} color="#ffffff" lh={40}>{amount()}</Pin>
      <Pin x={1657} y={187} size={16} color="#a0aaa8" lh={19}>Selected asset population</Pin>

      <At x={43} y={324} w={1840} h={467}><div className="panel shell dim" /></At>
      <Pin x={65} y={340} size={32} weight={700} color="#ffffff" lh={40}>Compliance by asset type</Pin>
      <Pin x={65} y={376} size={18} color="#757171" lh={40}>One common percentage scale · each category uses its own eligible population</Pin>
      <Pin x={789} y={425} size={14} color="#76817f" lh={16}>0%</Pin>
      <Pin x={1237} y={425} size={14} color="#76817f" lh={16}>50%</Pin>
      <Pin x={1677} y={425} size={14} color="#76817f" lh={16}>100%</Pin>
      {rows.map((row) => (
        <span key={row.title}>
          <Pin x={67} y={row.y} size={18} weight={500} color="#f3f5f4" lh={21}>{row.title}</Pin>
          <Pin x={67} y={row.bar + 17} size={14} color="#757171" lh={16}>{row.hint}</Pin>
          <At x={789} y={row.bar} w={922} h={22}><div style={{ height: "100%", borderRadius: 27, background: "#33413f" }} /></At>
          <At x={789} y={row.bar} w={0} h={22}><div style={{ height: "100%", borderRadius: 27, background: "linear-gradient(to right, #1e897f, #34efde)" }} /></At>
          <Pin x={1753} y={row.bar - 4} size={25} color="#f3f5f4" lh={29}>{percent()}</Pin>
          <At x={65} y={row.bar + 44} w={1756} h={1}><div style={{ height: 1, background: "#343838" }} /></At>
        </span>
      ))}
      <Pin x={65} y={752} size={15} color="#76817f" lh={18}>Overall compliance is weighted by the eligible asset population.</Pin>

      <Pin x={65} y={804} size={32} weight={700} color="#ffffff" lh={40}>Assets pending for calibration</Pin>
      {[43, 663, 1283].map((x, index) => (
        <At key={x} x={x} y={857} w={index === 2 ? 599 : 600} h={151}><div className="panel shell dim" /></At>
      ))}
      {pending.map((bucket) => (
        <span key={bucket.label}>
          <Pin x={bucket.x} y={870} size={18} color="#a0aaa8" lh={21}>{bucket.label}</Pin>
          <Pin x={bucket.x} y={906} size={39} color="#f3f5f4" lh={46}>{amount()}</Pin>
          <Pin x={bucket.x} y={965} size={16} color="#a0aaa8" lh={19}>{bucket.hint}</Pin>
        </span>
      ))}
      <Pin x={65} y={1026} size={16} color="#76817f" lh={19}>Sources: MFS / AGIS Meter · AGIS Meter → GIS</Pin>
      <Pin x={1422} y={1026} size={16} color="#76817f" lh={19}>N/A · no summation across days or months</Pin>
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
  const revenue = useContent().screen3.cards[3]
  const supply = volume?.supply ?? null
  const demand = supply == null ? "—" : `${compactCount(Math.round(supply))} m³`
  const ufg = now.current == null ? "—" : `${now.current.toFixed(1)}%`
  const customers = now.consumers == null ? "—" : Math.round(now.consumers).toLocaleString("en-US")
  return (
    <StripCards
      cards={[
        { label: "CURRENT DEMAND", value: demand, ...dayShift(supply, volumeThen?.supply ?? null) },
        { label: "UFG", value: ufg, ...dayShift(now.current, then.current) },
        { label: "CUSTOMERS AVAILABLE", value: customers, ...dayShift(now.consumers, then.consumers) },
        revenue,
      ]}
    />
  )
}

function Screen4() {
  return <div className="screen-body canvas" />
}

function Screen5() {
  const { state, patch } = useWall()
  const content = useContent()
  const read = useSocPanel()
  const leaks = useLeaks(state)
  const cards = [
    { label: "NETWORK HEALTH", value: read("comm.gateway_availability"), down: false, amount: "" },
    { label: "ACTIVE INCIDENTS", value: "0", down: false, amount: "" },
    { label: "SUSPECTED LEAKS", value: leaks ? leaks.suspected.toLocaleString("en-US") : "—", down: false, amount: "" },
    { label: "ACTIVE CREWS", value: "N/A", down: false, amount: "" },
  ]
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
  const rowH = weeks.length > 5 ? 60 : 72
  const cities = citiesOf(state.regionId)
  const { zones, clusters } = useUfgHierarchy()
  const regionApi = apiRegionId(state.regionId)
  const zoneId = zoneIdForCity(state.cityId)
  const visible = clusters.filter((cluster) => cluster.zone_id !== "Z_goycay" && (!regionApi || cluster.region_id === regionApi) && (!zoneId || cluster.zone_id === zoneId))
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
  const oy = 330
  const calX = 576
  const calW = 604
  const colW = calW / 7
  const active = "linear-gradient(90deg, #4af3e6 0%, #2ed8cb 48%, #1eb5a8 100%)"
  const chipW = 165
  const chipH = 48
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
        <At key={`bar-${view.y}-${view.m}-${row}`} x={ox + calX + start * colW} y={oy + 305 + row * rowH} w={(end - start + 1) * colW} h={40}>
          <div style={{ height: "100%", borderRadius: 20, background: "#165654" }} />
        </At>,
      )
    }
    week.forEach((day, column) => {
      if (day == null) return
      const key = iso(view.y, view.m, day)
      const future = key > today
      const end = !future && (key === from || key === to || key === anchor)
      const y = oy + 298 + row * rowH
      days.push(
        <span key={key}>
          {end && (
            <At x={ox + calX + column * colW + (colW - 54) / 2} y={y} w={54} h={54}>
              <div style={{ width: 54, height: 54, borderRadius: 27, background: "#34efde" }} />
            </At>
          )}
          <At x={ox + calX + column * colW} y={y} w={colW} h={54}>
            <button type="button" className="cal-day" disabled={future} style={{ color: future ? "#4d5c5a" : end ? "#07302c" : "#e7f0ee", fontWeight: end ? 700 : 400, cursor: future ? "default" : undefined }} onClick={() => pickDay(key)}>{day}</button>
          </At>
        </span>,
      )
    })
  })
  return (
    <StripCards cards={cards} compare={false}>
      <At x={ox} y={oy} w={1880} h={685}>
        <div style={{ width: "100%", height: "100%", borderRadius: 42, background: "linear-gradient(115deg, #12383a 0%, #0d2426 48%, #0a1819 100%)" }} />
      </At>
      <Pin x={ox + 78} y={oy + 36} size={20} weight={700} color="#2de0d2" lh={24}>LOCATION</Pin>
      <Pin x={ox + 78} y={oy + 74} size={16} color="#7a8a8b" lh={20}>Select geographic coverage</Pin>
      <At x={ox + 78} y={oy + 144} w={420} h={80}>
        <div style={{ height: "100%", borderRadius: 40, background: "#0c1b1c", position: "relative" }}>
          <div style={{ position: "absolute", left: 28, top: 14, fontSize: 13, letterSpacing: 1.4, color: "#798586" }}>REGION</div>
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
          <div style={{ position: "absolute", right: 28, top: 30, color: "#9aabb0", fontSize: 16, pointerEvents: "none" }}>⌄</div>
        </div>
      </At>
      <At x={ox + 78} y={oy + 241} w={420} h={80}>
        <div style={{ height: "100%", borderRadius: 40, background: "#0c1b1c", position: "relative" }}>
          <div style={{ position: "absolute", left: 28, top: 14, fontSize: 13, letterSpacing: 1.4, color: "#798586" }}>CITY</div>
          <select
            className="region-select"
            value={state.cityId ?? ""}
            onChange={(event) => patch({ cityId: event.target.value || null, clusterId: null })}
          >
            <option value="">All cities</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>{city.label}</option>
            ))}
          </select>
          <div style={{ position: "absolute", right: 28, top: 30, color: "#9aabb0", fontSize: 16, pointerEvents: "none" }}>⌄</div>
        </div>
      </At>
      <At x={ox + 78} y={oy + 338} w={420} h={80}>
        <div style={{ height: "100%", borderRadius: 40, background: "#0c1b1c", position: "relative" }}>
          <div style={{ position: "absolute", left: 28, top: 14, fontSize: 13, letterSpacing: 1.4, color: "#798586" }}>CLUSTER</div>
          <select
            className="region-select"
            value={selectedCluster ? selectedCluster.cluster_id : ""}
            onChange={(event) => patch({ clusterId: event.target.value || null })}
          >
            <option value="">All clusters</option>
            {grouped.size > 1
              ? [...grouped.entries()].map(([id, list]) => (
                <optgroup key={id} label={zoneName.get(id) ?? id}>
                  {list.map((cluster) => (
                    <option key={cluster.cluster_id} value={cluster.cluster_id}>{cluster.name_en}</option>
                  ))}
                </optgroup>
              ))
              : visible.map((cluster) => (
                <option key={cluster.cluster_id} value={cluster.cluster_id}>{cluster.name_en}</option>
              ))}
          </select>
          <div style={{ position: "absolute", right: 28, top: 30, color: "#9aabb0", fontSize: 16, pointerEvents: "none" }}>⌄</div>
        </div>
      </At>

      <Pin x={ox + 576} y={oy + 36} size={20} weight={700} color="#2de0d2" lh={24}>DATE SELECTION</Pin>
      <Pin x={ox + 576} y={oy + 74} size={16} color="#7a8a8b" lh={20}>Choose a date, month, year or range</Pin>
      <At x={ox + 576} y={oy + 117} w={604} h={60}>
        <div style={{ height: "100%", borderRadius: 30, background: "#0c1b1c", position: "relative" }}>
          {["Day", "Month", "Year"].map((label, index) => (
            <div key={label} style={{ position: "absolute", left: index * 158, width: 158, top: 0, height: 60, lineHeight: "60px", textAlign: "center", color: "#c5d0d0", fontSize: 18 }}>{label}</div>
          ))}
          <div style={{ position: "absolute", right: 8, top: 8, width: 132, height: 44, borderRadius: 22, background: active, color: "#07302c", fontSize: 16, fontWeight: 600, lineHeight: "44px", textAlign: "center" }}>Date Range</div>
        </div>
      </At>
      <At x={ox + calX} y={oy + 190} w={36} h={40}>
        <button type="button" className="cal-nav" onClick={() => setView((current) => shiftView(current, -1))}>‹</button>
      </At>
      <Pin x={ox + calX + 36} y={oy + 196} w={calW - 72} size={28} weight={700} color="#f3f6f5" lh={34} align="center">{monthTitle(view)}</Pin>
      <At x={ox + calX + calW - 36} y={oy + 190} w={36} h={40}>
        <button type="button" className="cal-nav" onClick={() => setView((current) => shiftView(current, 1))}>›</button>
      </At>
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
        <Pin key={day} x={ox + calX + index * colW} y={oy + 252} w={colW} size={16} color="#8b9c9c" lh={20} align="center">{day}</Pin>
      ))}
      {bars}
      {days}

      <At x={ox + 536} y={oy + 117} w={1} h={518}><div style={{ width: 1, height: "100%", background: "#343b3c" }} /></At>
      <At x={ox + 1260} y={oy + 117} w={1} h={518}><div style={{ width: 1, height: "100%", background: "#343b3c" }} /></At>

      <Pin x={ox + 1296} y={oy + 36} size={20} weight={700} color="#2de0d2" lh={24}>QUICK SELECT</Pin>
      <Pin x={ox + 1296} y={oy + 74} size={16} color="#7a8a8b" lh={20}>Common time periods</Pin>
      {chips.map((row, rowIndex) => row.map((label, column) => (
        <At key={label} x={ox + 1296 + column * (chipW + chipGap)} y={oy + 118 + rowIndex * (chipH + 12)} w={chipW} h={chipH}>
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
      <At x={ox + 1295} y={oy + 244} w={524} h={1}><div style={{ height: 1, background: "#343b3c" }} /></At>
      <Pin x={ox + 1296} y={oy + 258} size={20} weight={700} color="#2de0d2" lh={24}>SELECTED FILTERS</Pin>
      <At x={ox + 1304} y={oy + 300} w={510} h={193}>
        <div style={{ height: "100%", borderRadius: 18, background: "#161e22" }} />
      </At>
      {filters.map((row, index) => (
        <span key={row[0]}>
          <Pin x={ox + 1324} y={oy + 316 + index * 34} size={18} color="#8b9c9c" lh={22}>{row[0]}</Pin>
          <Pin x={ox + 1540} y={oy + 316 + index * 34} w={254} size={18} color="#e7f0ee" lh={22} align="right">{row[1]}</Pin>
        </span>
      ))}
      <At x={ox + 1304} y={oy + 518} w={176} h={64}>
        <div
          onClick={() => {
            const range = periodRange("Last 30 Days")
            if (!range) return
            setAnchor(null)
            patch({ ...range, period: "Last 30 Days", regionId: null, regionSet: true, cityId: null, clusterId: null, seed: 0 })
          }}
          style={{ height: "100%", borderRadius: 32, background: "#102628", color: "#d5e0de", fontSize: 20, lineHeight: "64px", textAlign: "center", cursor: "pointer" }}
        >Reset</div>
      </At>
      <At x={ox + 1496} y={oy + 518} w={318} h={64}>
        <div style={{ height: "100%", borderRadius: 32, background: active, color: "#07302c", fontSize: 22, fontWeight: 700, lineHeight: "64px", textAlign: "center" }}>Apply Filters</div>
      </At>
    </StripCards>
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

function Screen7() {
  const d = useContent().screen7
  const kpis = [
    { x: 31, heat: true, lx: 58, vx: 56, color: "#eb7d5c", weight: 400 },
    { x: 346, heat: false, lx: 352, vx: 367, color: "#34efde", weight: 500 },
    { x: 657, heat: false, lx: 678, vx: 677, color: "#34efde", weight: 500 },
    { x: 969, heat: false, lx: 992, vx: 992, color: "#34efde", weight: 500 },
    { x: 1280, heat: true, lx: 1318, vx: 1318, color: "#eb7d5c", weight: 400 },
    { x: 1591, heat: true, lx: 1614, vx: 1614, color: "#eb7d5c", weight: 400 },
  ].map((item, index) => ({ ...item, ...d.cards[index] }))
  const bubbles: { id: string; x: number; y: number; color: string }[] = [
    { id: "R01", x: 260, y: 370, color: "#f0aa48" },
    { id: "R02", x: 594, y: 388, color: "#7ebbfa" },
    { id: "R03", x: 912, y: 379, color: "#ee745e" },
    { id: "R04", x: 550, y: 524, color: "#ee745e" },
    { id: "R05", x: 912, y: 544, color: "#ee745e" },
    { id: "R06", x: 672, y: 580, color: "#f0aa48" },
    { id: "R07", x: 295, y: 685, color: "#a9ef65" },
    { id: "R08", x: 863, y: 685, color: "#f0aa48" },
    { id: "R09", x: 390, y: 732, color: "#7ebbfa" },
  ]
  const findings = [
    { y: 373, edge: "#eb7d5c", kicker: "CRITICAL", kc: "#ee745e", title: "R03 · Predicted Gas Leakage", note: "Immediate field inspection", ty: 388, titleY: 417, noteY: 456 },
    { y: 521, edge: "#f2a65a", kicker: "HIGH", kc: "#f0aa48", title: "R05 · Asset Failure", note: "Schedule preventive maintenance", ty: 536, titleY: 565, noteY: 604 },
    { y: 669, edge: "#b7fe5d", kicker: "MEDIUM", kc: "#a9ef65", title: "R07 · Demand Spike", note: "Monitor network pressure", ty: 684, titleY: 713, noteY: 752 },
  ]
  return (
    <Frame>
      <Pin x={37} y={28} size={32} weight={900} color="#34efde" lh={38}>PREDICTIVE RISKS & RECOMMENDED ACTIONS</Pin>
      {kpis.map((card) => (
        <span key={card.label}>
          <At x={card.x} y={97} w={299} h={150}><div className={`kpi${card.heat ? " surface-heat" : ""}`} /></At>
          <Pin x={card.lx} y={110} size={24} weight={card.weight} color={card.color} lh={40}>{card.label}</Pin>
          <Pin x={card.vx} y={165} size={60} color="#ffffff" lh={41}>{card.value}</Pin>
        </span>
      ))}
      <At x={31} y={257} w={1152} h={649}><div className="panel shell dim" /></At>
      <At x={1201} y={257} w={689} h={649}><div className="panel shell dim" /></At>
      <Pin x={74} y={279} size={28} color="#f5f7f7" lh={33}>RISK PRIORITY MATRIX</Pin>
      <Pin x={975} y={279} size={20} color="#9caaa8" lh={23}>Impact × likelihood</Pin>
      <Pin x={975} y={312} size={18} color="#b5c0be" lh={21}>IMPACT</Pin>
      <At x={203} y={499} w={864} h={1}><div style={{ height: 1, background: "#343838" }} /></At>
      <At x={203} y={649} w={864} h={1}><div style={{ height: 1, background: "#343838" }} /></At>
      <At x={490} y={352} w={1} h={444}><div style={{ width: 1, height: "100%", background: "#343838" }} /></At>
      <At x={780} y={352} w={1} h={444}><div style={{ width: 1, height: "100%", background: "#343838" }} /></At>
      <Pin x={135} y={411} size={20} color="#b5c0be" lh={23}>High</Pin>
      <Pin x={104} y={561} size={20} color="#b5c0be" lh={23}>Medium</Pin>
      <Pin x={139} y={711} size={20} color="#b5c0be" lh={23}>Low</Pin>
      <Pin x={326} y={814} size={20} color="#b5c0be" lh={23}>Low</Pin>
      <Pin x={598} y={814} size={20} color="#b5c0be" lh={23}>Medium</Pin>
      <Pin x={904} y={814} size={20} color="#b5c0be" lh={23}>High</Pin>
      {bubbles.map((bubble) => (
        <At key={bubble.id} x={bubble.x} y={bubble.y} w={54} h={54}>
          <div style={{ height: "100%", borderRadius: 27, border: `2px solid ${bubble.color}`, background: `${bubble.color}2e`, display: "grid", placeItems: "center", color: "#ffffff", fontSize: 18, fontWeight: 700 }}>{bubble.id}</div>
        </At>
      ))}
      {[
        [153, "#a9ef65", 181, "Acceptable"],
        [421, "#f0aa48", 449, "Improve"],
        [689, "#ee745e", 717, "Major action"],
        [957, "#7ebbfa", 985, "Under review"],
      ].map(([x, color, tx, label]) => (
        <span key={label as string}>
          <At x={x as number} y={866} w={18} h={18}><div style={{ height: "100%", borderRadius: 9, background: color as string }} /></At>
          <Pin x={tx as number} y={864} size={18} color="#a9b8b5" lh={21}>{label}</Pin>
        </span>
      ))}
      <Pin x={1226} y={279} size={24} weight={700} color="#f3f5f4" lh={28}>OPERATIONAL FINDINGS</Pin>
      <Pin x={1226} y={314} size={20} color="#9caaa8" lh={23}>Priority risks requiring action</Pin>
      {findings.map((item) => (
        <span key={item.kicker}>
          <At x={1230} y={item.y} w={590} h={130}><div className="risk-card" style={{ ["--edge" as string]: item.edge }} /></At>
          <Pin x={1246} y={item.ty} size={18} weight={700} color={item.kc} lh={21}>{item.kicker}</Pin>
          <Pin x={1246} y={item.titleY} size={24} color="#f2f5f4" lh={28}>{item.title}</Pin>
          <Pin x={1246} y={item.noteY} size={20} color="#a9b8b5" lh={23}>{item.note}</Pin>
        </span>
      ))}
      <Pin x={1226} y={835} size={18} color="#a9b8b5" lh={21}>SELECT A RISK TO VIEW DETAILS</Pin>
      <Pin x={1226} y={867} size={18} color="#7d908c" lh={21}>Owner · Due date · Action status</Pin>
      <Pin x={74} y={931} size={24} color="#ffffff" lh={40}>Tamper Alerts</Pin>
      <Pin x={74} y={986} size={60} color="#ffffff" lh={40}>{d.tamperAlerts}</Pin>
      <Pin x={324} y={931} size={24} color="#ffffff" lh={40}>Critical Tamper Cases</Pin>
      <Pin x={325} y={986} size={32} color="#f3f5f4" lh={38}>{d.criticalTamper}</Pin>
      <Pin x={657} y={931} size={24} color="#ffffff" lh={40}>Verified Tamper Cases</Pin>
      <Pin x={658} y={986} size={32} color="#f3f5f4" lh={38}>{d.verifiedTamper}</Pin>
      <Pin x={997} y={931} size={24} color="#ffffff" lh={40}>False Positive Rate</Pin>
      <Pin x={998} y={986} size={32} color="#f3f5f4" lh={38}>{d.falsePositive}</Pin>
      <Pin x={1299} y={931} size={24} color="#ffffff" lh={40}>Revenue Risk</Pin>
      <Pin x={1299} y={986} size={32} color="#f3f5f4" lh={38}>{d.revenueRisk}</Pin>
      <Pin x={1543} y={931} size={24} color="#ffffff" lh={40}>Field Verification Pending</Pin>
      <Pin x={1543} y={986} size={32} color="#f3f5f4" lh={38}>{d.pending}</Pin>
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

function signedPercent(value: number) {
  const text = `${Math.abs(value).toFixed(1)}%`
  if (value < 0) return `−${text}`
  if (value > 0) return `+${text}`
  return text
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
  let comparedActual = 0
  let comparedForecast = 0
  if (forecastSeries) {
    series.forEach((value, index) => {
      const other = forecastSeries[index]
      if (value == null || other == null) return
      comparedActual += value
      comparedForecast += other
    })
  }
  const gapValue = comparedActual - comparedForecast
  const gapPercent = comparedForecast !== 0 ? (gapValue / comparedForecast) * 100 : null
  const gap = !demand
    ? "—"
    : !demand.forecast || (comparedForecast === 0 && comparedActual === 0)
      ? "Actual-forecast variance: N/A"
      : `Actual-forecast variance: ${gapPercent == null ? "N/A" : ` ${signedPercent(gapPercent)}`}`
  return (
    <Frame mirror>
      <Pin x={37} y={28} size={32} weight={900} color="#34efde" lh={40}>GAS DEMAND & FLOW</Pin>
      <At x={34} y={97} w={910} h={165}><div className="kpi" /></At>
      <At x={959} y={97} w={910} h={165}><div className="kpi" /></At>
      <Pin x={64} y={101} size={24} weight={500} color="#34efde" lh={40}>Gas demand · Actual</Pin>
      <div className="at" style={{ left: 64, top: 159, display: "flex", alignItems: "baseline", gap: 12, height: 40 }}>
        <span style={{ fontSize: 60, fontWeight: 400, lineHeight: "40px", color: "#ffffff" }}>{actual}</span>
        <span style={{ fontSize: 24, lineHeight: "28px", color: "#a0aaa8" }}>m³</span>
      </div>
      <Pin x={64} y={220} size={18} color="#ffffff" lh={21}>Total for selected period</Pin>
      <Pin x={994} y={101} size={24} weight={500} color="#34efde" lh={40}>Demand forecast</Pin>
      <div className="at" style={{ left: 994, top: 159, display: "flex", alignItems: "baseline", gap: 12, height: 40 }}>
        <span style={{ fontSize: 60, fontWeight: 400, lineHeight: "40px", color: "#ffffff" }}>{forecastText}</span>
        {demand?.forecast && <span style={{ fontSize: 24, lineHeight: "28px", color: "#a0aaa8" }}>m³</span>}
      </div>

      <At x={42} y={323} w={1272} h={692}><div className="panel shell dim" /></At>
      <At x={1338} y={323} w={556} h={692}><div className="panel shell dim" /></At>
      <Pin x={74} y={339} size={32} weight={700} color="#ffffff" lh={40}>Actual vs forecast</Pin>
      
      <Pin x={74} y={406} size={18} color="#a0aaa8" lh={21}>Daily volume · selected period</Pin>
      <Pin x={74} y={450} size={19} color="#f3f5f4" lh={22}>Daily volume (m³)</Pin>
      {ticks.map((tick, index) => (
        <Pin key={index} x={40} y={[491, 613, 735, 858][index]} w={92} size={16} color="#7d8885" lh={18} align="right">{compactCount(tick)}</Pin>
      ))}
      {series.length > 0 && axisMarks(series.length).map((index) => {
        const x = 140 + (series.length <= 1 ? 564 : (index * 1128) / (series.length - 1))
        return <Pin key={days[index]} x={x - 36} y={883} w={72} size={18} color="#7d8885" lh={21} align="center">{dayLabel(state.date, index)}</Pin>
      })}
      <DemandChart values={series} forecast={forecastSeries} max={max} />
      <At x={73} y={966} w={32} h={4}><div style={{ height: 3.5, background: "#34eddc", borderRadius: 2 }} /></At>
      <Pin x={119} y={948} size={24} color="#757171" lh={40}>Actual gas sales</Pin>
      <Pin x={491} y={948} size={24} color="#ffffff" lh={40}>{gap}</Pin>
      <At x={1050} y={966} w={32} h={4}>
        <div style={{ height: 3, background: "repeating-linear-gradient(90deg, #f2a65a 0 7px, transparent 7px 13px)" }} />
      </At>
      <Pin x={1100} y={948} size={24} color="#757171" lh={40}>Demand forecast</Pin>

      <Pin x={1366} y={339} size={32} weight={700} color="#ffffff" lh={40}>Demand drivers</Pin>
      <Pin x={1366} y={389} size={24} color="#757171" lh={40}>Jan–Aug 2026 against the</Pin>
      <Pin x={1366} y={429} size={24} color="#757171" lh={40}>same months a year earlier</Pin>
      <Pin x={1366} y={523} size={24} color="#f3f5f4" lh={28}>Weather impact</Pin>
      <Pin x={1759} y={513} w={87} size={32} color="#f3f5f4" lh={38} align="right">N/A</Pin>
      <Pin x={1366} y={564} size={18} color="#76817f" lh={21}>Weather Underground → heating degree-days</Pin>
      <At x={1366} y={606} w={480} h={1}><div style={{ height: 1, background: "#343838" }} /></At>
      <Pin x={1366} y={629} size={24} color="#f3f5f4" lh={28}>Consumer growth impact</Pin>
      <Pin x={1759} y={619} w={87} size={32} color="#f3f5f4" lh={38} align="right">0</Pin>
      <Pin x={1366} y={671} size={18} color="#76817f" lh={21}>More customers × last year’s gas per customer</Pin>
      <At x={1360} y={710} w={512} h={186}>
        <div style={{ height: "100%", borderRadius: 20, background: "#232323", border: "1px solid #282b2a" }} />
      </At>
      <Pin x={1382} y={729} size={18} color="#76817f" lh={21}>Included within consumer growth</Pin>
      <Pin x={1382} y={765} size={24} color="#f3f5f4" lh={28}>Industrial growth impact</Pin>
      <Pin x={1784} y={759} w={62} size={23} color="#f3f5f4" lh={27} align="right">0</Pin>
      <At x={1382} y={806} w={464} h={1}><div style={{ height: 1, background: "#343838" }} /></At>
      <Pin x={1382} y={827} size={24} color="#f3f5f4" lh={28}>Commercial growth impact</Pin>
      <Pin x={1784} y={821} w={62} size={23} color="#f3f5f4" lh={27} align="right">0</Pin>
      <Pin x={1382} y={863} size={18} color="#76817f" lh={21}>Billing → GIS</Pin>
      <At x={1360} y={918} w={512} h={81}>
        <div style={{ position: "relative", height: "100%", borderRadius: 20, background: "#232323" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: 20,
              padding: 1,
              background: "linear-gradient(to bottom, #939452 0%, #212121 45%, #a57545 100%)",
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              maskComposite: "exclude",
              pointerEvents: "none",
            }}
          />
        </div>
      </At>
      <Pin x={1398} y={934} size={18} color="#76817f" lh={21}>Industrial and commercial are subsets.</Pin>
      <Pin x={1398} y={961} size={18} color="#eeeeee" lh={21}>Do not add them again to consumer growth.</Pin>
      <At x={1326} y={424} w={1} h={499}><div style={{ height: "100%", background: "#383838" }} /></At>
      <Pin x={42} y={1033} size={18} color="#76817f" lh={21}>Sources: Rockweb · CCC Forecast · Weather System · Billing → GIS</Pin>
    </Frame>
  )
}

function RailDonut({ ratio }: { ratio: number }) {
  const radius = 95.8
  const turn = 2 * Math.PI * radius
  const dash = turn * ratio
  return (
    <svg className="at" viewBox="0 0 202 202" style={{ left: 990, top: 311, width: 202, height: 202 }}>
      <defs>
        <linearGradient id="rail-ring" x1="0.94" y1="0.67" x2="0.88" y2="0.27">
          <stop offset="0%" stopColor="#34efde" />
          <stop offset="100%" stopColor="#1e897f" />
        </linearGradient>
      </defs>
      <g transform="rotate(-90 101 101)">
        <circle cx="101" cy="101" r={radius} fill="none" stroke="#33413f" strokeWidth="10.4" />
        <circle cx="101" cy="101" r={radius} fill="none" stroke="url(#rail-ring)" strokeWidth="10.4" strokeDasharray={`${dash} ${turn - dash}`} />
      </g>
    </svg>
  )
}

function Track({ x, y, track, fill, heat = false }: { x: number; y: number; track: number; fill: number; heat?: boolean }) {
  const color = heat ? "linear-gradient(to right, #854734, #eb7d5c)" : "linear-gradient(to right, #1e897f, #34efde)"
  return (
    <>
      <At x={x} y={y} w={track} h={22}><div style={{ height: "100%", borderRadius: 38, background: "#33413f" }} /></At>
      <At x={x} y={y} w={fill} h={22}><div style={{ height: "100%", borderRadius: 38, background: color }} /></At>
    </>
  )
}

function Screen9() {
  const d = useContent().screen9
  const billing = ["N/A", "0", "0", "0"]
  const stationValues = ["0", "N/A", "N/A", "0", "0"]
  return (
    <Frame mirror>
      <At x={43} y={52} w={1814} h={548}><div className="panel shell dim" /></At>
      <At x={43} y={616} w={1814} h={417}><div className="panel shell dim" /></At>
      <Pin x={87} y={88} size={32} weight={900} color="#34efde" lh={40}>INFRASTRUCTURE FIELD RAIL</Pin>
      <Pin x={110} y={178} size={24} color="#ffffff" lh={28}>QPS / REGULATORS</Pin>
      <Pin x={962} y={178} size={24} color="#ffffff" lh={28}>DIGITAL / CALIBRATION</Pin>
      {[
        [110, 256, "Active Stations"],
        [110, 327, "Station Availability"],
        [110, 398, "Pressure Stability"],
        [110, 469, "Regulator Faults"],
        [110, 540, "Critical Alerts"],
      ].map(([x, y, label]) => (
        <Pin key={label as string} x={x as number} y={y as number} size={24} color="#8fa7a4" lh={28}>{label}</Pin>
      ))}
      <Pin x={690} y={256} size={24} color="#34eddc" lh={28}>{stationValues[0]}</Pin>
      <Pin x={716} y={327} size={24} color="#34eddc" lh={28}>{stationValues[1]}</Pin>
      <Pin x={716} y={398} size={24} color="#34eddc" lh={28}>{stationValues[2]}</Pin>
      <Pin x={767} y={469} size={24} color="#eb7d5c" lh={28}>{stationValues[3]}</Pin>
      <Pin x={767} y={540} size={24} color="#eb7d5c" lh={28}>{stationValues[4]}</Pin>
      <Track x={338} y={259} track={322} fill={0} />
      <Track x={338} y={330} track={322} fill={0} />
      <Track x={338} y={401} track={322} fill={0} />
      <Track x={338} y={472} track={322} fill={0} heat />
      <Track x={338} y={543} track={322} fill={0} heat />
      <RailDonut ratio={0} />
      <Pin x={1021} y={392} w={140} size={50} color="#dff9f7" lh={40} align="center">N/A</Pin>
      {[
        [1294, 256, 0, 1685, 259],
        [1294, 398, 1, 1685, 401],
        [1294, 540, 2, 1685, 543],
      ].map(([lx, ly, index, vx, bar]) => (
        <span key={d.digital[index as number].label}>
          <Pin x={lx as number} y={ly as number} size={24} color="#8fa7a4" lh={28}>{d.digital[index as number].label}</Pin>
          <Pin x={vx as number} y={ly as number} size={24} color="#34eddc" lh={28}>N/A</Pin>
          <Track x={1419} y={bar as number} track={247} fill={0} />
        </span>
      ))}
      <At x={922} y={128} w={2} h={450}><div style={{ height: "100%", background: "#293333" }} /></At>

      <Pin x={87} y={656} size={32} weight={900} color="#34efde" lh={40}>BILLING & EMERGENCY</Pin>
      {[
        [87, 0, "#34eddc"],
        [552, 1, "#e8f4f2"],
        [1017, 2, "#e8f4f2"],
        [1482, 3, "#eb7d5c"],
      ].map(([x, index, color]) => (
        <span key={d.billing[index as number].label}>
          <Pin x={x as number} y={802} size={32} color="#8fa7a4" lh={38}>{d.billing[index as number].label}</Pin>
          <Pin x={x as number} y={872} size={60} color={color as string} lh={70}>{billing[index as number]}</Pin>
        </span>
      ))}
      {[526, 991, 1456].map((x) => (
        <At key={x} x={x - 1} y={809} w={2} h={124}><div style={{ height: "100%", background: "#293333" }} /></At>
      ))}

      {/*<Pin x={87} y={807} size={32} weight={900} color="#34efde" lh={40}>EMERGENCY RESPONSE TIMELINE</Pin>
      <svg className="at" viewBox="0 0 1615 6" style={{ left: 126, top: 881, width: 1615, height: 6 }}>
        <defs>
          <linearGradient id="rail-dash" x1="0" y1="0" x2="1615" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#aeaeae" />
            <stop offset="1" stopColor="#484848" />
          </linearGradient>
        </defs>
        <line x1="3" y1="3" x2="1612" y2="3" stroke="url(#rail-dash)" strokeWidth="6" strokeDasharray="16 16" strokeLinecap="round" />
      </svg>
      {steps.map((step) => (
        <span key={step.label}>
          <At x={step.x} y={869} w={30} h={30}>
            <div style={{ width: 30, height: 30, borderRadius: 15, background: `linear-gradient(to bottom, ${step.color}, ${step.to})` }} />
          </At>
          <Pin x={step.lx} y={925} w={step.lw} size={24} color="#91a4a4" lh={28} align="center">{step.label}</Pin>
          <Pin x={step.tx} y={969} w={80} size={32} color={step.color} lh={38} align="center">{step.time}</Pin>
        </span>
      ))}*/}
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
  ["Signal Strength reaching poor thresholds", "Sumqayit", "High", "Telco Intervention"],
  ["Retrofit Devices non-communicative percentage increasing", "Baku", "Medium", "Investigate HES and Connectivity"],
  ["Purchase Data Missing causing reconciliation blocks", "Sumqayit", "Medium", "Send field teams"],
  ["Rainy and cold weather to continue for a week", "Agsu", "Medium", "Pressure Management"],
  ["Leakage surveys indicate high prevalance of in-building emissions", "Sumqayit", "High", "Expedite rectification works"],
  ["CPU utilization for GIS system peaking over 90%", "General", "Critical", "Optimize and Manage"],
  ["Gas velocity voilations observed in Kurdemir", "Agsu", "High", "Change regulator Pressure Settings"],
  ["Lead time for new connections in Goychay over the SLA", "Agsu", "Medium", "Investigate and Resolve"],
  ["Service interruption complaints volume reduced MoM", "Baku", "Low", "Continue monitoring"],
  ["Billing recovery on decline trend", "Ismaiyilli", "Medium", "Generate Consumer Notifications"],
  ["Nil consumption consumers number raised MoM", "Baku", "Medium", "Mobilize field Gas Theft"],
  ["Sales consistently dropping in Cluster 66 for three days", "Sumqayit", "Medium", "Continue monitoring"],
  ["Sim card data utilization limit approaching limit", "Ucar", "High", "Top up credit limit"],
  ["EVC batteries consumption higher than mean in Sumqayit", "Sumqayit", "Medium", "Re-assess communicaiton frequency"],
  ["New Meter installation progress lower than planned rate", "Agsu", "Medium", "Investigate and Resolve"],
  ["Cash collection channels are experiencing intermittent service degradation", "General", "High", "Investigate and Resolve"],
  ["Connection application backlog is increasing faster than weekly completions", "General", "Medium", "Investigate and Resolve"],
  ["Cybersecurity monitoring has identified repeated authentication anomalies", "General", "Medium", "Escalate to security team"],
  ["Field workforce availability is below the level required for planned interventions", "General", "Medium", "Reprioritize non-critical work"],
  ["Forecast demand is diverging from scheduled supply nominations", "Baku", "Medium", "Reconcile demand data"],
].map(([type, region, severity, action], index) => ({
  type,
  region,
  severity,
  action,
  date: `${String(index + 7).padStart(2, "0")} Oct`,
})).reverse()

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
        gridTemplateColumns: "35px 355px 130px 130px 1fr",
        columnGap: 30,
        alignItems: "center",
        borderTop: "1px solid #2a3330",
        padding: "6px 0",
      }}
    >
      <div style={{ color: "#cccccc", fontSize: 28, lineHeight: "32px", textAlign: "left" }}>{row.date}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: "#ffffff", fontSize: 22, lineHeight: "28px" }}>{row.type}</div>
      </div>
      <div style={{ color: "#60bbb3", fontSize: 20, lineHeight: "24px", textTransform: "uppercase" }}>{row.region}</div>
      <div style={{ color: severityColor[row.severity], fontSize: 20, fontWeight: 600, lineHeight: "24px", textTransform: "uppercase" }}>{row.severity}</div>
      <div style={{ color: "#ffffff", fontSize: 24, lineHeight: "28px" }}>{row.action}</div>
    </div>
  )
}

function ExecutiveAlerts() {
  const smooth = useAlertScroll() === "smooth"
  const [offset, setOffset] = useState(0)
  const rowH = 114
  const rowMs = alertRowMs(rowH)
  const track = useSmoothTrack(smooth, executiveAlerts.length, rowMs, executiveAlerts.length * rowH)
  useEffect(() => {
    if (smooth) return
    const timer = window.setInterval(() => setOffset((index) => (index + 1) % executiveAlerts.length), rowMs)
    return () => window.clearInterval(timer)
  }, [smooth, rowMs])
  const shown = smooth
    ? [...executiveAlerts, ...executiveAlerts]
    : Array.from({ length: 4 }, (_, index) => executiveAlerts[(offset + index) % executiveAlerts.length])
  return (
    <At x={803} y={424} w={1062} h={456}>
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

function Screen14({ state }: { state: WallState }) {
  const d = useContent().screen14
  const ufg = useUfgSummary(state)
  const quality = useQuality(state)
  const ufgText = ufg.current == null ? "—" : `${ufg.current.toFixed(1)}%`
  const coverageShare = quality && quality.total > 0 && quality.days > 0 ? quality.received.overall / (quality.total * quality.days) : null
  const metersText = coverageShare == null ? "—" : `${(coverageShare * 100).toFixed(1)}%`
  const events = useTamper(state)
  const eventCounts = events ? [events.tampering, events.disassembly, events.interference, events.magnetic, events.battery] : null
  const eventMax = eventCounts ? Math.max(...eventCounts) : 0
  const tamper = [
    { y: 442, bar: 443, vx: 658 },
    { y: 499, bar: 500, vx: 656 },
    { y: 556, bar: 557, vx: 660 },
    { y: 613, bar: 614, vx: 677 },
    { y: 670, bar: 671, vx: 692 },
  ].map((item, index) => {
    const count = eventCounts ? eventCounts[index] : null
    const scaled = count == null || eventMax <= 0 ? 0 : Math.round((count / eventMax) * 255)
    const fill = scaled > 0 && scaled < 30 ? scaled + 30 : scaled
    return { ...item, ...d.tamper[index], value: count == null ? "—" : count.toLocaleString("en-US"), fill }
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
      <Pin x={385} y={116} size={24} weight={500} color="#34efde" lh={40}>Collection Efficiency</Pin>
      <Pin x={382} y={180} size={60} weight={700} color="#ffffff" lh={40}>{d.collection}</Pin>
      <Pin x={669} y={113} size={24} color="#34efde" lh={40}>Outstanding Balance</Pin>
      <Pin x={669} y={180} size={60} weight={700} color="#ffffff" lh={40}>{d.balance} <span style={{ fontSize: 33 }}></span></Pin>
      <Pin x={982} y={116} size={24} weight={500} color="#34efde" lh={40}>Emergency Response</Pin>
      <Pin x={1000} y={180} size={60} weight={700} color="#ffffff" lh={40}>56 <span style={{ fontSize: 33 }}>MIN</span></Pin>
      <Pin x={1301} y={116} size={24} color="#34efde" lh={40}>Reconnect within 24 h</Pin>
      <Pin x={1299} y={180} size={60} weight={700} color="#ffffff" lh={40}>{100/*reconnectText*/}%</Pin>
      <Pin x={1612} y={116} size={24} color="#34efde" lh={40}>Meters Communicating</Pin>
      <Pin x={1610} y={180} size={60} weight={700} color="#ffffff" lh={40}>{metersText}</Pin>

      <At x={31} y={285} w={718} h={453}><div className="panel shell dim" /></At>
      <At x={770} y={285} w={1127} h={620}><div className="panel shell dim" /></At>
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
      {[484, 541, 598, 655].map((y) => (
        <At key={y} x={58} y={y} w={662} h={1}><div style={{ height: 1, background: "#343a38" }} /></At>
      ))}

      <Pin x={803} y={307} size={32} color="#ffffff" lh={40}>EXECUTIVE ALERT BOARD</Pin>
      <Pin x={803} y={388} size={20} color="#a6b3af" lh={23}>Date</Pin>
      <Pin x={870} y={388} size={20} color="#a6b3af" lh={23}>Title</Pin>
      <Pin x={1254} y={388} size={20} color="#a6b3af" lh={23}>Region</Pin>
      <Pin x={1412} y={388} size={20} color="#a6b3af" lh={23}>Severity</Pin>
      <Pin x={1572} y={388} size={20} color="#a6b3af" lh={23}>Action</Pin>
      <ExecutiveAlerts />
    </Frame>
  )
}

function underlay(d: string, depth: number, color: string, opacity: number, id: string) {
  const pts = d.trim().split(/[ML]\s*/).filter(Boolean).map((part) => part.trim().split(/\s+/).map(Number))
  return pts.slice(0, -1).map((p, index) => {
    const n = pts[index + 1]
    const top = Math.min(p[1], n[1])
    return (
      <g key={index}>
        <linearGradient id={`${id}-${index}`} gradientUnits="userSpaceOnUse" x1="0" y1={top} x2="0" y2={top + depth}>
          <stop offset="0" stopColor={color} stopOpacity={opacity} />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <polygon points={`${p[0]},${p[1]} ${n[0]},${n[1]} ${n[0]},${n[1] + depth} ${p[0]},${p[1] + depth}`} fill={`url(#${id}-${index})`} />
      </g>
    )
  })
}

function RevenueChart({ cyan, gold }: { cyan: string; gold: string }) {
  return (
    <svg className="at" viewBox="0 0 1720 180" style={{ left: 150, top: 400, width: 1720, height: 180 }}>
      <defs>
        <linearGradient id="rev-fill" gradientUnits="userSpaceOnUse" x1="0" y1="46" x2="0" y2="160">
          <stop offset="0" stopColor="#ada166" stopOpacity="1" />
          <stop offset="1" stopColor="#ada166" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="10" x2="1710" y1="41" y2="41" stroke="#3b3b3b" />
      {gold && <path d={`${gold} L1704 158 L80 158 Z`} fill="url(#rev-fill)" />}
      {underlay(cyan, 14, "#34efde", 0.55, "rev-cyan")}
      {gold && <path d={gold} fill="none" stroke="#ffd184" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />}
      <path d={cyan} fill="none" stroke="#34efde" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function Screen15({ state }: { state: WallState }) {
  const d = useContent().screen15
  const field = useFieldOps(state)
  const within24 = fieldShare(field?.reconnectionSameDay, field?.reconnection)
  const pending = field == null ? null : field.reconnection - field.reconnectionDone
  const ops = [
    fieldCount(field?.disconnection),
    fieldCount(field?.reconnection),
    fieldCount(pending),
  ]
  const kpis = [
    { x: 34, w: 446, lx: 69, vx: 69 },
    { x: 498, w: 447, lx: 530, vx: 530 },
    { x: 964, w: 445, lx: 992, vx: 992 },
    { x: 1433, w: 446, lx: 1467, vx: 1467 },
  ].map((item, index) => ({ ...item, ...d.cards[index] }))
  const bars = [
    { x: 393, w: 276, fill: "linear-gradient(to right, #854734, #eb7d5c)", lx: 396, vx: 395 },
    { x: 678, w: 276, fill: "linear-gradient(to right, #1e897f, #34efde)", lx: 679, vx: 679 },
    { x: 963, w: 275, fill: "linear-gradient(to right, #1e897f, #34efde)", lx: 963, vx: 963 },
    { x: 1248, w: 276, fill: "linear-gradient(to right, #6e9838, #b7fe5d)", lx: 1248, vx: 1248 },
    { x: 1533, w: 276, fill: "linear-gradient(to right, #6e9838, #b7fe5d)", lx: 1533, vx: 1522 },
  ].map((item, index) => ({ ...item, ...d.bars[index] }))
  const transfer = [
    { x: 200, label: "Jul", value: 95.6 },
    { x: 860, label: "Aug", value: 99.7 },
    { x: 1520, label: "Sep", value: 99.8 },
  ]
  const transferY = (percent: number) => 158 - (percent / 100) * 89
  const transferPath = transfer.map((point, index) => `${index ? "L" : "M"}${point.x} ${transferY(point.value).toFixed(1)}`).join(" ")
  return (
    <Frame mirror>
      <Pin x={37} y={28} size={32} weight={900} color="#34efde" lh={40}>REVENUE & BILLING PERFORMANCE</Pin>
      {kpis.map((card) => (
        <span key={card.label}>
          <At x={card.x} y={97} w={card.w} h={150}><div className="kpi" /></At>
          <Pin x={card.lx} y={105} size={24} weight={500} color="#34efde" lh={28}>{card.label}</Pin>
          <Pin x={card.vx} y={152} size={60} weight={500} color="#ffffff" lh={48}>{card.value}</Pin>
        </span>
      ))}

      <At x={34} y={277} w={1846} h={399}><div className="panel shell dim" /></At>
      <Pin x={95} y={299} size={32} color="#ffffff" lh={40}>Performance Trend</Pin>
      <Pin x={1206} y={295} size={25} color="#34efde" lh={40}>Billing Transfer Success</Pin>
      <Pin x={1571} y={295} size={25} color="#ffd184" lh={40}>Collection Efficiency</Pin>
      <Pin x={100} y={425} w={60} size={18} color="#ffffff" lh={21} align="center">150%</Pin>
      <Pin x={100} y={469} w={60} size={18} color="#ffffff" lh={21} align="center">100%</Pin>
      <Pin x={100} y={514} w={60} size={18} color="#ffffff" lh={21} align="center">50%</Pin>
      <Pin x={100} y={559} w={60} size={18} color="#ffffff" lh={21} align="center">0%</Pin>
      {transfer.map((point) => (
        <Pin key={point.label} x={110 + point.x} y={589} w={80} size={18} color="#a4a7ae" lh={40} align="center">{point.label}</Pin>
      ))}
      <RevenueChart cyan={transferPath} gold="" />

      <At x={34} y={701} w={1846} h={339}><div className="panel shell dim" /></At>
      <Pin x={67} y={733} size={32} weight={900} color="#ffffff" lh={40}>CONNECT / DISCONNECT OPERATIONS</Pin>
      <Pin x={67} y={811} size={32} color="#ffffff" lh={39}>Reconnect SLA</Pin>
      <Pin x={67} y={863} size={70} color="#ffffff" lh={85}>{fieldPercent(within24)}</Pin>
      <Pin x={67} y={977} size={18} color="#76817f" lh={21}>Opening orders done within 24 h</Pin>
      {bars.map((bar, index) => (
        <span key={bar.label}>
          <At x={bar.x} y={829} w={bar.w} h={18}>
            <div style={{ height: "100%", borderRadius: 131, background: bar.fill }} />
          </At>
          <Pin x={bar.lx} y={863} size={24} color="#ffffff" lh={40}>{bar.label}</Pin>
          <Pin x={bar.vx} y={903} size={32} color="#f3f5f4" lh={38}>{ops[index] ?? bar.value}</Pin>
        </span>
      ))}
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

function Screen16({ state }: { state: WallState }) {
  const field = useFieldOps(state)
  const within24 = fieldShare(field?.reconnectionSameDay, field?.reconnection)
  const completion = fieldShare(field?.reconnectionDone, field?.reconnection)
  const within7 = fieldShare(field?.disconnectionWithin7, field?.disconnection)
  const meterCut = fieldShare(field?.meterCut, field?.disconnection)
  const replacement24 = fieldShare(field?.replacementSameDay, field?.replacements)
  const regulators = fieldCount(field?.regulators)
  const kpis = [
    { x: 34, w: 446, label: "Accident calls", lx: 72, vx: 71, value: fieldCount(field?.calls), note: "Selected reporting period", nx: 274 },
    { x: 498, w: 447, label: "Resolved on first visit", lx: 539, vx: 542, value: fieldCount(field?.resolved), note: "Accident calls", nx: 820 },
    { x: 964, w: 445, label: "Leaks sent to repair within 24h", lx: 1001, vx: 1000, value: fieldCount(field?.leaks), note: "Dispatch to repair", nx: 1272 },
    { x: 1423, w: 446, label: "Suspected tamper / revenue loss", lx: 1455, vx: 1458, value: fieldCount(field?.tamper), note: "Suspected cases · not confirmed", nx: 1625 },
  ]
  const bars = [
    { x: 79, y: 602, track: 672, fill: 0 },
    { x: 79, y: 927, track: 672, fill: 0 },
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
      <Pin x={79} y={419} size={24} color="#f3f5f4" lh={28}>Pipeline inspection</Pin>
      <Pin x={79} y={497} size={43} color="#f3f5f4" lh={55}>0</Pin>
      <Pin x={201} y={516} size={22} color="#a3aeab" lh={29}>km</Pin>
      <Pin x={643} y={438} size={18} color="#a3aeab" lh={21}>Leaks per km</Pin>
      <Pin x={688} y={464} size={32} color="#eb7d5c" lh={38}>N/A</Pin>
      <Pin x={671} y={517} size={18} color="#7f8b87" lh={21}>Leaks/km</Pin>
      <Pin x={79} y={559} size={18} color="#a3aeab" lh={23}>Pipeline inspection coverage</Pin>
      <Pin x={650} y={547} size={32} color="#f3f5f4" lh={38}>N/A</Pin>
      <Pin x={79} y={698} size={24} color="#f3f5f4" lh={28}>Regulator inspection</Pin>
      <Pin x={79} y={811} size={43} color="#f3f5f4" lh={55}>{regulators}</Pin>
      <Pin x={79 + Math.max(86, regulators.length * 22 + 12)} y={836} size={16} color="#a3aeab" lh={21}>Regulators inspected</Pin>
      <Pin x={79} y={878} size={24} color="#a3aeab" lh={28}>Regulator inspection coverage</Pin>
      <Pin x={650} y={877} size={32} color="#f3f5f4" lh={38}>N/A</Pin>
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
  const { state } = useWall()
  const d = useContent().screen18
  const cityId = state.cityId || "baku"
  const [weather, setWeather] = useState<{ city: string; temp: string; summary: string } | null>(null)
  useEffect(() => {
    let stop = false
    async function load() {
      try {
        const res = await fetch(`/weather?city=${encodeURIComponent(cityId)}`, { cache: "no-store" })
        if (!res.ok) throw new Error(String(res.status))
        const body = (await res.json()) as { city: string; temp: string; summary: string }
        if (!stop) setWeather(body)
      } catch {
        // keep the last reading
      }
    }
    setWeather(null)
    load()
    const id = setInterval(load, 10 * 60 * 1000)
    return () => {
      stop = true
      clearInterval(id)
    }
  }, [cityId])
  const rows = [
    { y: 860 }, { y: 897 }, { y: 935 }, { y: 973 },
  ].map((item, index) => ({ ...item, ...d.rows[index] }))
  return (
    <Frame border={false}>
      <At x={20} y={756} w={1391} h={290}><div className="panel shell dim" /></At>
      <Pin x={56} y={782} size={28} weight={500} color="#ffffff" lh={30}>CUSTOMER CONSUMPTION ANOMALY ALERTS</Pin>
      <Pin x={80} y={858} w={190} size={32} weight={500} color="#eb7d5c" lh={36} align="center">Total</Pin>
      <Pin x={80} y={900} w={190} size={32} weight={500} color="#eb7d5c" lh={36} align="center">Anomalies</Pin>
      <Pin x={69} y={953} size={72} color="#ffffff" lh={64}>{d.total}</Pin>
      {rows.map((row) => (
        <span key={row.label}>
          <Pin x={358} y={row.y + 2} size={24} color="#f3f5f4" lh={26}>{row.label}</Pin>
          <At x={588} y={row.y} w={645} h={28}>
            <div style={{ height: "100%", borderRadius: 14, background: "#33413f" }} />
          </At>
          <At x={588} y={row.y} w={row.fill} h={28}>
            <div style={{ height: "100%", borderRadius: 14, background: "linear-gradient(to right, #1e897f, #34efde)" }} />
          </At>
          <Pin x={1255} y={row.y + 2} size={24} color="#f3f5f4" lh={26}>{row.value}</Pin>
        </span>
      ))}
      <img className="at" src={weatherBaku} alt="" style={{ left: 1437, top: 805, width: 463, height: 219 }} />
      <Pin x={1437} y={830} w={463} size={34} weight={300} color="#ffffff" lh={32} align="center">{weather?.city ?? cityById(cityId)?.label ?? "Baku"}</Pin>
      <Pin x={1437} y={888} w={463} size={100} weight={300} color="#ffffff" lh={76} align="center">{weather?.temp ?? "—"}</Pin>
      <Pin x={1437} y={985} w={463} size={22} weight={500} color="#ffffff" lh={26} align="center">{weather?.summary ?? ""}</Pin>
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
  { x: 421, label: "Critical", key: "soc.critical_alerts" },
  { x: 703, label: "Integration", key: "int.integration_success" },
  { x: 993, label: "Availability", key: "dc.infra_availability" },
  { x: 1274, label: "Response", key: "app.avg_response" },
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
          <Pin x={ring.x - 20} y={842} w={264} size={48} color="#ffffff" lh={40} align="center">{ring.key === "soc.critical_alerts" ? "0" : read(ring.key)}</Pin>
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

function violationView(part: number | null, whole: number | null) {
  if (part == null || whole == null) return { value: "—", note: "—", fill: 0 }
  if (whole === 0) return { value: "—", note: "0 / 0 sensors", fill: 0 }
  const share = part / whole
  return {
    value: `${(share * 100).toFixed(1)}%`,
    note: `${part.toLocaleString("en-US")} / ${whole.toLocaleString("en-US")} sensors`,
    fill: Math.max(0, Math.min(355, Math.round(share * 355))),
  }
}

function Screen21({ state }: { state: WallState }) {
  const d = useContent().screen21
  const pressure = usePressure(state)
  const leaks = useLeaks(state)
  const lowSensors = pressure ? pressure.lowSensors : null
  const mediumSensors = pressure ? pressure.mediumSensors : null
  const totalSensors = lowSensors == null || mediumSensors == null ? null : lowSensors + mediumSensors
  const lowViolation = violationView(pressure ? pressure.lowViolations : null, lowSensors)
  const mediumViolation = violationView(pressure ? pressure.mediumViolations : null, mediumSensors)
  const kpis = [
    { x: 31, lx: 56 },
    { x: 649, lx: 674 },
    { x: 1267, lx: 1294 },
  ].map((item, index) => ({ ...item, ...d.cards[index], value: [countText(totalSensors), countText(lowSensors), countText(mediumSensors)][index] }))
  const zones = [
    { y: 425, bar: 429, x: 1468 },
    { y: 463, bar: 467, x: 1468 },
    { y: 501, bar: 505, x: 1469 },
    { y: 539, bar: 543, x: 1469 },
  ].map((item, index) => ({ ...item, ...d.zones[index] }))
  const gradeNames = ["Grade A", "Grade B", "Grade C"] as const
  const gradeCounts = gradeNames.map((name) => leaks?.grades[name] ?? 0)
  const gradeScale = chartScale(gradeCounts)
  const gradeTrack = 140
  const gradeBase = 969
  const grades = [
    { x: 1107, lx: 1122 },
    { x: 1365, lx: 1381 },
    { x: 1623, lx: 1638 },
  ].map((item, index) => {
    const count = leaks ? gradeCounts[index] : null
    const fillH = count == null || gradeScale.max <= 0 ? 0 : Math.round((count / gradeScale.max) * gradeTrack)
    return { ...item, label: gradeNames[index], value: count == null ? "—" : count.toLocaleString("en-US"), fillH, fillY: gradeBase - fillH }
  })
  const gradeTicks = [gradeScale.max, gradeScale.max / 2, 0]
  return (
    <Frame>
      <Pin x={32} y={28} size={32} weight={900} color="#34efde" lh={40}>PRESSURE & LEAK DETECTION</Pin>
      {kpis.map((card) => (
        <span key={card.label}>
          <At x={card.x} y={97} w={605} h={150}><div className="kpi" /></At>
          <Pin x={card.lx} y={99} size={24} weight={500} color="#34efde" lh={28}>{card.label}</Pin>
          <Pin x={card.lx} y={140} size={60} weight={700} color="#ffffff" lh={48}>{card.value}</Pin>
          <Pin x={card.lx} y={201} size={18} weight={500} color="#ffffff" lh={22}>{card.note}</Pin>
        </span>
      ))}

      <At x={31} y={320} w={910} h={314}><div className="panel shell dim" /></At>
      <Pin x={56} y={339} size={23} weight={700} color="#f3f5f4" lh={27}>Pressure violations</Pin>
      <Pin x={56} y={366} size={24} color="#757171" lh={28}>Share of the corresponding sensor population · common 0–100% scale</Pin>
      <Pin x={408} y={417} size={18} color="#76817f" lh={21}>0%</Pin>
      <Pin x={573} y={417} size={18} color="#76817f" lh={21}>50%</Pin>
      <Pin x={719} y={417} size={18} color="#76817f" lh={21}>100%</Pin>
      <Pin x={56} y={434} size={24} color="#f3f5f4" lh={28}>Low pressure violation</Pin>
      <Pin x={56} y={468} size={18} color="#76817f" lh={21}>{lowViolation.note}</Pin>
      <At x={408} y={451} w={355} h={22}><div style={{ height: "100%", borderRadius: 27, background: "#33413f" }} /></At>
      <At x={408} y={451} w={lowViolation.fill} h={22}><div style={{ height: "100%", borderRadius: 27, background: "linear-gradient(to right, #8c6034, #f2a65a)" }} /></At>
      <Pin x={816} y={445} size={30} color="#f3f5f4" lh={36}>{lowViolation.value}</Pin>
      <Rule x={56} y={498} w={824} color="#343838" />
      <Pin x={56} y={509} size={24} color="#f3f5f4" lh={28}>Medium pressure violation</Pin>
      <Pin x={56} y={544} size={18} color="#76817f" lh={21}>{mediumViolation.note}</Pin>
      <At x={408} y={528} w={355} h={22}><div style={{ height: "100%", borderRadius: 27, background: "#33413f" }} /></At>
      <At x={408} y={528} w={mediumViolation.fill} h={22}><div style={{ height: "100%", borderRadius: 27, background: "linear-gradient(to right, #8c6034, #f2a65a)" }} /></At>
      <Pin x={816} y={522} size={30} color="#f3f5f4" lh={36}>{mediumViolation.value}</Pin>
      <At x={56} y={596} w={10} h={10}><div style={{ width: 10, height: 10, borderRadius: 5, background: "#f2ab65" }} /></At>
      <Pin x={76} y={590} size={18} color="#76817f" lh={21}>Sensors with pressure violations</Pin>

      <At x={953} y={320} w={919} h={314}><div className="panel shell dim" /></At>
      <Pin x={976} y={339} size={24} weight={700} color="#f3f5f4" lh={28}>Customers impacted</Pin>
      <Pin x={976} y={374} size={18} color="#a3aeab" lh={21}>By pressure violations</Pin>
      <Pin x={976} y={424} size={70} color="#ffffff" lh={85} font="Inter, sans-serif">0</Pin>
      <Pin x={976} y={517} w={171} size={18} color="#a3aeab" lh={21} wrap>Unique customers · illustrative definition</Pin>
      <Pin x={976} y={594} size={18} color="#7f8b87" lh={21}>Source: GIS</Pin>
      <Rule x={1267} y={424} w={1} h={139} color="#343838" />
      <Pin x={1343} y={339} size={24} weight={700} color="#f3f5f4" lh={28}>Top affected zones</Pin>
      <Pin x={1750} y={396} size={16} color="#8c9695" lh={19}>Customers</Pin>
      {zones.map((row) => (
        <span key={row.label}>
          <Pin x={1343} y={row.y} size={24} color="#e8f0ed" lh={28}>{row.label}</Pin>
          <At x={row.x} y={row.bar} w={280} h={20}><div style={{ height: "100%", borderRadius: 62, background: "#33413f" }} /></At>
          <At x={row.x} y={row.bar} w={/*row.fill*/0} h={20}><div style={{ height: "100%", borderRadius: 62, background: "linear-gradient(to right, #e6846b, #80493b)" }} /></At>
          <Pin x={1787} y={row.y} size={24} color="#e8f0ed" lh={28}>{/*row.value*/} 0</Pin>
        </span>
      ))}
      <Pin x={1343} y={594} size={18} color="#7f8b87" lh={21}>Source: GIS</Pin>

      <At x={31} y={644} w={910} h={388}><div className="panel shell dim" /></At>
      <Pin x={56} y={720} size={24} color="#ffffff" lh={28}>Leak indicators</Pin>
      <Pin x={56} y={758} size={18} color="#76817f" lh={21}>Counts and handling times for the selected context</Pin>
      <Pin x={56} y={812} size={18} color="#76817f" lh={21}>Suspected leaks</Pin>
      <Pin x={56} y={851} size={40} color="#f3f5f4" lh={47}>{leaks ? leaks.suspected.toLocaleString("en-US") : "—"}</Pin>
      
      <Pin x={486} y={812} size={18} color="#76817f" lh={21}>Confirmed leaks</Pin>
      <Pin x={486} y={851} size={40} color="#f3f5f4" lh={47}>N/A</Pin>
      
      <Rule x={56} y={924} w={850} />
      <Rule x={471} y={825} w={1} h={183} />
      <Pin x={56} y={934} size={18} color="#76817f" lh={21}>Avg. leak response time</Pin>
      <Pin x={56} y={971} size={40} color="#f3f5f4" lh={47}>N/A</Pin>
      <Pin x={486} y={934} size={18} color="#76817f" lh={21}>Avg. leak repair time</Pin>
      <Pin x={486} y={961} size={40} color="#f3f5f4" lh={47}>N/A</Pin>

      <At x={953} y={644} w={919} h={388}><div className="panel shell dim" /></At>
      <Pin x={976} y={662} size={24} color="#ffffff" lh={28}>Leak distribution by grade</Pin>
      {/*<Pin x={976} y={700} size={18} color="#76817f" lh={21}>Categories and counts · population to confirm</Pin>*/}
      <Pin x={976} y={732} size={18} color="#76817f" lh={21}>Leaks · count</Pin>
      {gradeTicks.map((tick, index) => (
        <Pin key={tick} x={930} y={807 + index * 70} w={90} size={18} color="#76817f" lh={21} align="right">{Number.isInteger(tick) ? tick.toLocaleString("en-US") : tick.toFixed(1)}</Pin>
      ))}
      <Rule x={1027} y={829} w={802} color="#343a38" />
      <Rule x={1027} y={899} w={802} color="#343a38" />
      <Rule x={1027} y={969} w={802} color="#343a38" />
      {grades.map((bar) => (
        <span key={bar.label}>
          <At x={bar.x} y={829} w={92} h={gradeTrack}>
            <div style={{ height: "100%", borderRadius: 67, background: "rgba(52,87,91,0.51)" }} />
          </At>
          <At x={bar.x} y={bar.fillY} w={92} h={bar.fillH}>
            <div style={{ height: "100%", borderRadius: 67, background: "linear-gradient(to bottom, #34efde, #1d897f)" }} />
          </At>
          <Pin x={bar.x - 16} y={bar.fillY - 24} w={124} size={18} color="#76817f" lh={21} align="center">{bar.value}</Pin>
          <Pin x={bar.lx} y={984} size={18} color="#76817f" lh={21}>{bar.label}</Pin>
        </span>
      ))}
    </Frame>
  )
}

const bodies: Record<number, (state: WallState) => ReactNode> = {
  1: (state) => <Screen1 state={state} />,
  2: (state) => (state.ufgOpen ? <UfgScreen2 state={state} /> : <Screen2 />),
  3: () => <Screen3 />,
  4: () => <Screen4 />,
  5: () => <Screen5 />,
  6: () => <Screen6 />,
  7: () => <Screen7 />,
  8: (state) => (state.ufgOpen ? <UfgScreen8 /> : <Screen8 state={state} />),
  9: (state) => (state.ufgOpen ? <UfgScreen9 state={state} /> : <Screen9 />),
  13: (state) => <Screen13 state={state} />,
  14: (state) => <Screen14 state={state} />,
  15: (state) => <Screen15 state={state} />,
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
