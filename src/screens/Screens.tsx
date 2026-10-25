import { useEffect, useState, type ReactNode } from "react"
import drillAi from "../assets/drill-ai.png"
import drillReady from "../assets/drill-ready.png"
import drillMaint from "../assets/drill-maint.png"
import drillRisk from "../assets/drill-risk.png"
import weatherBaku from "../assets/weather-baku.png"
import { UfgScreen2, UfgScreen8, UfgScreen9 } from "./UfgDetail"
import { At, Frame, PlaceText } from "../ui/widgets"
import { useContent } from "../data/live"
import { useSocPanel } from "../data/socDashboard"
import { useUfgHierarchy, useUfgSummary, useUfgTrend, type UfgCluster } from "../data/ufg"
import { addDays, formatRange, iso, monthGrid, monthTitle, parseIso, periodRange, previousSpan, shiftView, trendCaption } from "../wall/dates"
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

function compactCount(value: number) {
  const sign = value < 0 ? "-" : ""
  const abs = Math.abs(value)
  if (abs < 1000) return sign + String(abs)
  const divisor = abs >= 1_000_000 ? 1_000_000 : 1000
  const suffix = divisor === 1_000_000 ? "M" : "K"
  const scaled = Math.round((abs / divisor) * 10) / 10
  const text = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1)
  return sign + text + suffix
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
  const d = useContent().screen2
  const rows = [
    { y: 442, bar: 460 },
    { y: 519, bar: 537 },
    { y: 596, bar: 614 },
    { y: 673, bar: 691 },
  ].map((spot, index) => ({ ...spot, ...d.rows[index] }))
  return (
    <Frame mirror>
      <Pin x={37} y={28} size={32} weight={900} color="#34efde" lh={40}>CALIBRATION STATUS</Pin>
      <At x={43} y={97} w={427} h={150}><div className="kpi" /></At>
      <At x={505} y={97} w={426} h={150}><div className="kpi" /></At>
      <At x={966} y={97} w={427} h={150}><div className="kpi" /></At>
      <At x={1428} y={97} w={426} h={150}><div className="kpi" /></At>
      <Pin x={65} y={108} size={24} weight={500} color="#34efde" lh={40}>Calibration compliance</Pin>
      <Pin x={65} y={169} size={60} weight={700} color="#ffffff" lh={40}>{d.compliance}</Pin>
      <Pin x={262} y={187} size={16} color="#a0aaa8" lh={19}>Meters, EVC and sensors</Pin>
      <Pin x={530} y={108} size={24} weight={500} color="#34efde" lh={40}>Overdue assets</Pin>
      <Pin x={530} y={169} size={60} weight={700} color="#ffffff" lh={40}>{d.overdue}</Pin>
      <Pin x={727} y={187} size={16} color="#a0aaa8" lh={19}>Selected scope · as of date</Pin>
      <Pin x={995} y={108} size={24} weight={500} color="#34efde" lh={40}>Long pending assets</Pin>
      <Pin x={995} y={169} size={60} weight={700} color="#ffffff" lh={40}>{d.pending}</Pin>
      <Pin x={1192} y={187} size={16} color="#a0aaa8" lh={19}>Selected scope · as of date</Pin>
      <Pin x={1460} y={108} size={24} weight={500} color="#34efde" lh={40}>Total assets</Pin>
      <Pin x={1456} y={169} size={60} weight={700} color="#ffffff" lh={40}>{d.total}</Pin>
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
          <At x={789} y={row.bar} w={row.fill} h={22}><div style={{ height: "100%", borderRadius: 27, background: "linear-gradient(to right, #1e897f, #34efde)" }} /></At>
          <Pin x={1753} y={row.bar - 4} size={25} color="#f3f5f4" lh={29}>{row.value}</Pin>
          <At x={65} y={row.bar + 44} w={1756} h={1}><div style={{ height: 1, background: "#343838" }} /></At>
        </span>
      ))}
      <Pin x={65} y={752} size={15} color="#76817f" lh={18}>Overall compliance is weighted by the eligible asset population.</Pin>

      <Pin x={65} y={804} size={32} weight={700} color="#ffffff" lh={40}>Assets pending for calibration</Pin>
      {[43, 663, 1283].map((x, index) => (
        <At key={x} x={x} y={857} w={index === 2 ? 599 : 600} h={151}><div className="panel shell dim" /></At>
      ))}
      {[65, 685, 1305].map((x) => (
        <span key={x}>
          <Pin x={x} y={870} size={18} color="#a0aaa8" lh={21}>0–30 days</Pin>
          <Pin x={x} y={906} size={39} color="#f3f5f4" lh={46}>—</Pin>
          <Pin x={x} y={965} size={16} color="#f2a65a" lh={19}>Definition awaiting confirmation</Pin>
        </span>
      ))}
      <Pin x={65} y={1026} size={16} color="#76817f" lh={19}>Sources: MFS / AGIS Meter · AGIS Meter → GIS</Pin>
      <Pin x={1422} y={1026} size={16} color="#76817f" lh={19}>Snapshot values · no summation across days or months</Pin>
    </Frame>
  )
}

function StripCards({
  cards,
  children,
}: {
  cards: { label: string; value: string; down: boolean; amount: string }[]
  children?: ReactNode
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
            <Pin x={x} y={218} w={461} size={20} color="#a4a7ae" lh={24} align="center">
              <span style={{ color: "#13f88b" }}>{card.down ? "▼" : "▲"} {card.amount} </span>vs yesterday
            </Pin>
          </span>
        )
      })}
      {children}
    </Frame>
  )
}

function Screen3() {
  return <StripCards cards={useContent().screen3.cards} />
}

function Screen4() {
  const cards = [
    { icon: drillAi, x: 168, w: 300, title: "AI RECOMMENDATION CENTER", link: "OPEN DRILLDOWN", color: "#34eddc", titleY: 297, linkY: 332 },
    { icon: drillReady, x: 613, w: 321, title: "OPERATIONAL READINESS INDEX", link: "OPEN DRILLDOWN", color: "#34eddc", titleY: 291, linkY: 330 },
    { icon: drillMaint, x: 1079, w: 268, title: "PREDICTIVE MAINTENANCE", link: "OPEN DRILLDOWN", color: "#f3c85b", titleY: 291, linkY: 330 },
    { icon: drillRisk, x: 1492, w: 261, title: "NATIONAL RISK OVERVIEW", link: "OPEN DRILLDOWN", color: "#eb7d5c", titleY: 291, linkY: 330 },
  ]
  return (
    <div className="screen-body canvas">
      {cards.map((card) => (
        <span key={card.title}>
          <img className="at" src={card.icon} alt="" style={{ left: card.x, top: 69, width: card.w, height: 210 }} />
          <Pin x={card.x} y={card.titleY} w={card.w} size={16} weight={700} color="#e8f4f2" lh={18} align="center">{card.title}</Pin>
          <Pin x={card.x} y={card.linkY} w={card.w} size={16} weight={700} color={card.color} lh={18} align="center">{card.link}</Pin>
        </span>
      ))}
    </div>
  )
}

function Screen5() {
  const { state, patch } = useWall()
  const content = useContent()
  const d = content.screen5
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
  function pickDay(day: string) {
    if (!anchor) {
      setAnchor(day)
      return
    }
    const seed = Math.floor(Math.random() * 1e9) + 1
    setAnchor(null)
    if (anchor === day) {
      patch({ date: day, dateTo: day, period: "", seed })
      return
    }
    patch({
      date: anchor < day ? anchor : day,
      dateTo: anchor < day ? day : anchor,
      period: "",
      seed,
    })
  }
  weeks.forEach((week, row) => {
    const columns = week.flatMap((day, column) => {
      if (day == null) return []
      const key = iso(view.y, view.m, day)
      return key >= from && key <= to ? [column] : []
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
      const end = key === from || key === to || key === anchor
      const y = oy + 298 + row * rowH
      days.push(
        <span key={key}>
          {end && (
            <At x={ox + calX + column * colW + (colW - 54) / 2} y={y} w={54} h={54}>
              <div style={{ width: 54, height: 54, borderRadius: 27, background: "#34efde" }} />
            </At>
          )}
          <At x={ox + calX + column * colW} y={y} w={colW} h={54}>
            <button type="button" className="cal-day" style={{ color: end ? "#07302c" : "#e7f0ee", fontWeight: end ? 700 : 400 }} onClick={() => pickDay(key)}>{day}</button>
          </At>
        </span>,
      )
    })
  })
  return (
    <StripCards cards={d.cards}>
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
              patch({ ...range, period: label, seed: Math.floor(Math.random() * 1e9) + 1 })
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

function DemandChart({ actualY, forecastPath }: { actualY: number[]; forecastPath: string }) {
  const actual = [1.5, 103.5, 206.5, 308.5, 406.5, 513.5, 616.5, 718.5].map((x, index) => [x, actualY[index]] as [number, number])
  const line = actual.map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`).join("")
  return (
    <svg className="at" viewBox="0 0 1130 368" style={{ left: 140, top: 500, width: 1130, height: 368 }}>
      {[0, 123, 244, 367].map((y) => (
        <line key={y} x1="1" x2="1129" y1={y} y2={y} stroke="#343838" strokeWidth="1" />
      ))}
      <path d={forecastPath} fill="none" stroke="#f2a65a" strokeWidth="3" strokeDasharray="8 7" />
      <path d={line} fill="none" stroke="#34ddcc" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {actual.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#34ddcc" />
      ))}
    </svg>
  )
}

function Screen8() {
  const d = useContent().screen8
  const months = [
    [126, 30, "Jan"], [229, 30, "Feb"], [330, 32, "Mar"], [435, 28, "Apr"], [534, 34, "May"], [639, 30, "Jun"],
    [744, 25, "Jul"], [842, 32, "Aug"], [946, 31, "Sep"], [1049, 28, "Oct"], [1150, 32, "Nov"], [1253, 31, "Dec"],
  ] as const
  return (
    <Frame mirror>
      <Pin x={37} y={28} size={32} weight={900} color="#34efde" lh={40}>GAS DEMAND & FLOW</Pin>
      <At x={34} y={97} w={910} h={165}><div className="kpi" /></At>
      <At x={959} y={97} w={910} h={165}><div className="kpi" /></At>
      <Pin x={64} y={101} size={24} weight={500} color="#34efde" lh={40}>Gas demand · Actual</Pin>
      <Pin x={64} y={159} size={60} weight={400} color="#ffffff" lh={40}>{d.actual}</Pin>
      <Pin x={246} y={165} size={24} color="#a0aaa8" lh={28}>MCM</Pin>
      <Pin x={64} y={220} size={18} color="#ffffff" lh={21}>Total for selected period</Pin>
      <Pin x={994} y={101} size={24} weight={500} color="#34efde" lh={40}>Demand forecast</Pin>
      <Pin x={994} y={159} size={60} weight={400} color="#ffffff" lh={40}>{d.forecastValue}</Pin>
      <Pin x={1200} y={165} size={24} color="#a0aaa8" lh={28}>MCM</Pin>
      <Pin x={994} y={220} size={18} color="#ffffff" lh={21}>Forecast for the same selected period</Pin>

      <At x={42} y={323} w={1272} h={692}><div className="panel shell dim" /></At>
      <At x={1338} y={323} w={556} h={692}><div className="panel shell dim" /></At>
      <Pin x={74} y={339} size={32} weight={700} color="#ffffff" lh={40}>Actual vs forecast</Pin>
      <At x={1090} y={342} w={195} h={46}><div className="expand-pill">Expand chart</div></At>
      <Pin x={74} y={406} size={18} color="#a0aaa8" lh={21}>Monthly volume · same reporting period</Pin>
      <Pin x={74} y={450} size={19} color="#f3f5f4" lh={22}>Monthly volume (MCM)</Pin>
      <Pin x={88} y={491} w={38} size={16} color="#7d8885" lh={17} align="right">1.5M</Pin>
      <Pin x={103} y={613} w={23} size={16} color="#7d8885" lh={18} align="right">1M</Pin>
      <Pin x={87} y={735} w={39} size={16} color="#7d8885" lh={18} align="right">500K</Pin>
      <Pin x={103} y={858} w={23} size={16} color="#7d8885" lh={18} align="right">0.0</Pin>
      {months.map(([x, w, label]) => (
        <Pin key={label} x={x} y={883} w={w} size={18} color="#7d8885" lh={21} align="center">{label}</Pin>
      ))}
      <DemandChart actualY={d.actualY} forecastPath={d.forecastPath} />
      <At x={73} y={966} w={32} h={4}><div style={{ height: 3.5, background: "#34eddc", borderRadius: 2 }} /></At>
      <Pin x={119} y={948} size={24} color="#757171" lh={40}>Actual gas demand</Pin>
      <Pin x={491} y={948} size={24} color="#ffffff" lh={40}>{d.gap}</Pin>
      <At x={1050} y={966} w={32} h={4}>
        <div style={{ height: 3, background: "repeating-linear-gradient(90deg, #f2a65a 0 7px, transparent 7px 13px)" }} />
      </At>
      <Pin x={1100} y={948} size={24} color="#757171" lh={40}>Demand forecast</Pin>

      <Pin x={1366} y={339} size={32} weight={700} color="#ffffff" lh={40}>Demand drivers</Pin>
      <Pin x={1366} y={389} size={24} color="#757171" lh={40}>Jan–Aug 2026 against the</Pin>
      <Pin x={1366} y={429} size={24} color="#757171" lh={40}>same months a year earlier</Pin>
      <Pin x={1366} y={523} size={24} color="#f3f5f4" lh={28}>Weather impact</Pin>
      <Pin x={1759} y={513} w={87} size={32} color="#f3f5f4" lh={38} align="right">{d.weather}</Pin>
      <Pin x={1366} y={564} size={18} color="#76817f" lh={21}>Weather Underground → heating degree-days</Pin>
      <At x={1366} y={606} w={480} h={1}><div style={{ height: 1, background: "#343838" }} /></At>
      <Pin x={1366} y={629} size={24} color="#f3f5f4" lh={28}>Consumer growth impact</Pin>
      <Pin x={1759} y={619} w={87} size={32} color="#f3f5f4" lh={38} align="right">{d.consumer}</Pin>
      <Pin x={1366} y={671} size={18} color="#76817f" lh={21}>More customers × last year’s gas per customer</Pin>
      <At x={1360} y={710} w={512} h={186}>
        <div style={{ height: "100%", borderRadius: 20, background: "#232323", border: "1px solid #282b2a" }} />
      </At>
      <Pin x={1382} y={729} size={18} color="#76817f" lh={21}>Included within consumer growth</Pin>
      <Pin x={1382} y={765} size={24} color="#f3f5f4" lh={28}>Industrial growth impact</Pin>
      <Pin x={1784} y={759} w={62} size={23} color="#f3f5f4" lh={27} align="right">{d.industrial}</Pin>
      <At x={1382} y={806} w={464} h={1}><div style={{ height: 1, background: "#343838" }} /></At>
      <Pin x={1382} y={827} size={24} color="#f3f5f4" lh={28}>Commercial growth impact</Pin>
      <Pin x={1784} y={821} w={62} size={23} color="#f3f5f4" lh={27} align="right">{d.commercial}</Pin>
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
    <svg className="at" viewBox="0 0 202 202" style={{ left: 990, top: 219, width: 202, height: 202 }}>
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
  const steps = [
    { x: 120, lx: 87, lw: 96, tx: 95, color: "#f2765b", to: "#8c4435" },
    { x: 660, lx: 614.5, lw: 121, tx: 635, color: "#ffb32c", to: "#996b1a" },
    { x: 1200, lx: 1146.5, lw: 137, tx: 1175, color: "#35e5d7", to: "#1d7f77" },
    { x: 1740, lx: 1706, lw: 98, tx: 1715, color: "#a9f45b", to: "#628e35" },
  ].map((item, index) => ({ ...item, ...d.steps[index] }))
  return (
    <Frame mirror>
      <At x={43} y={52} w={1814} h={407}><div className="panel shell dim" /></At>
      <At x={43} y={475} w={1814} h={290}><div className="panel shell dim" /></At>
      <At x={43} y={781} w={1814} h={252}><div className="panel shell dim" /></At>
      <Pin x={87} y={80} size={32} weight={900} color="#34efde" lh={40}>INFRASTRUCTURE FIELD RAIL</Pin>
      <Pin x={110} y={154} size={24} color="#ffffff" lh={28}>QPS / REGULATORS</Pin>
      <Pin x={962} y={154} size={24} color="#ffffff" lh={28}>DIGITAL / CALIBRATION</Pin>
      {[
        [110, 219, "Active Stations"],
        [110, 264, "Station Availability"],
        [110, 309, "Pressure Stability"],
        [110, 354, "Regulator Faults"],
        [110, 399, "Critical Alerts"],
      ].map(([x, y, label]) => (
        <Pin key={label as string} x={x as number} y={y as number} size={24} color="#8fa7a4" lh={28}>{label}</Pin>
      ))}
      <Pin x={690} y={219} size={24} color="#34eddc" lh={28}>{d.stations[0].value}</Pin>
      <Pin x={716} y={264} size={24} color="#34eddc" lh={28}>{d.stations[1].value}</Pin>
      <Pin x={716} y={309} size={24} color="#34eddc" lh={28}>{d.stations[2].value}</Pin>
      <Pin x={767} y={354} size={24} color="#eb7d5c" lh={28}>{d.stations[3].value}</Pin>
      <Pin x={767} y={399} size={24} color="#eb7d5c" lh={28}>{d.stations[4].value}</Pin>
      <Track x={338} y={222} track={322} fill={d.stations[0].fill} />
      <Track x={338} y={267} track={322} fill={d.stations[1].fill} />
      <Track x={338} y={312} track={322} fill={d.stations[2].fill} />
      <Track x={338} y={357} track={322} fill={d.stations[3].fill} heat />
      <Track x={338} y={402} track={322} fill={d.stations[4].fill} heat />
      <RailDonut ratio={d.ring} />
      <Pin x={1021} y={300} w={140} size={50} color="#dff9f7" lh={40} align="center">{`${(d.ring * 100).toFixed(1)}%`}</Pin>
      {[
        [1294, 219, 0, 1685, 222],
        [1294, 306, 1, 1685, 309],
        [1294, 393, 2, 1685, 396],
      ].map(([lx, ly, index, vx, bar]) => (
        <span key={d.digital[index as number].label}>
          <Pin x={lx as number} y={ly as number} size={24} color="#8fa7a4" lh={28}>{d.digital[index as number].label}</Pin>
          <Pin x={vx as number} y={ly as number} size={24} color="#34eddc" lh={28}>{d.digital[index as number].value}</Pin>
          <Track x={1419} y={bar as number} track={247} fill={d.digital[index as number].fill} />
        </span>
      ))}
      <At x={922} y={119} w={2} h={318}><div style={{ height: "100%", background: "#293333" }} /></At>

      <Pin x={87} y={510} size={32} weight={900} color="#34efde" lh={40}>BILLING & EMERGENCY</Pin>
      {[
        [87, 0, "#34eddc"],
        [552, 1, "#e8f4f2"],
        [1017, 2, "#e8f4f2"],
        [1482, 3, "#eb7d5c"],
      ].map(([x, index, color]) => (
        <span key={d.billing[index as number].label}>
          <Pin x={x as number} y={584} size={32} color="#8fa7a4" lh={38}>{d.billing[index as number].label}</Pin>
          <Pin x={x as number} y={637} size={60} color={color as string} lh={70}>{d.billing[index as number].value}</Pin>
        </span>
      ))}
      {[526, 991, 1456].map((x) => (
        <At key={x} x={x - 1} y={591} w={2} h={102}><div style={{ height: "100%", background: "#293333" }} /></At>
      ))}

      <Pin x={87} y={807} size={32} weight={900} color="#34efde" lh={40}>EMERGENCY RESPONSE TIMELINE</Pin>
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
      ))}
    </Frame>
  )
}

function Screen13() {
  const d = useContent().screen13
  const cards = [
    { x: 29, w: 295, lx: 54, vx: 54 },
    { x: 339, w: 295, lx: 363, vx: 361 },
    { x: 649, w: 290, lx: 669, vx: 674 },
    { x: 954, w: 294, lx: 977, vx: 977 },
    { x: 1263, w: 296, lx: 1303, vx: 1299 },
    { x: 1574, w: 295, lx: 1602, vx: 1602 },
  ].map((item, index) => ({ ...item, ...d.cards[index] }))
  const bars = [
    { y: 298, vx: 1737, paint: "linear-gradient(to right, #80493c, #e6846b)" },
    { y: 331, vx: 1737, paint: "linear-gradient(to right, #1e897f, #34efde)" },
    { y: 364, vx: 1737, paint: "linear-gradient(to right, #1e897f, #34efde)" },
    { y: 397, vx: 1737, paint: "linear-gradient(to right, #926f34, #f8bd58)" },
    { y: 430, vx: 1751, paint: "linear-gradient(to right, #80493c, #e6846b)" },
  ].map((item, index) => ({ ...item, label: d.bars[index].label, value: d.bars[index].value, fillW: d.bars[index].fill }))
  const heatX = Array.from({ length: 12 }, (_, index) => 884 + index * 69)
  const heatY = Array.from({ length: 11 }, (_, index) => 612 + index * 24)
  const heat = [
    "occccccccccc",
    "cccccccccggg",
    "cccocccccggg",
    "occccccccccc",
    "occccccccccc",
    "occccccccggg",
    "cccccccccggg",
    "cccccccccggg",
    "occccccccggg",
    "cccccccccggg",
    "occccccccggg",
  ]
  const heatColor: Record<string, string> = { c: "#34efde", g: "#b7fe5d", o: "#f2a65a" }
  const regions: [number, number][] = [
    [815, 615], [738, 639], [806, 663], [783, 687], [789, 712], [804, 735],
    [801, 760], [781, 784], [808, 809], [791, 833], [786, 857],
  ]
  const monthLabels: [number, string][] = [
    [900, "Jan"], [969, "Feb"], [1035, "Mar"], [1107, "Apr"], [1173, "May"], [1243, "Jun"],
    [1315, "Jul"], [1378, "Aug"], [1449, "Sep"], [1518, "Oct"], [1584, "Nov"], [1654, "Dec"],
  ]
  const legend: [number, string, string][] = [
    [643, "#b4fa63", "≥ 90%"],
    [688, "#2ce0d2", "80–90%"],
    [733, "#f8bd58", "70–80%"],
    [778, "#f07d62", "60–70%"],
    [823, "#f34a18", "< 60%"],
  ]
  const sharePaint = [
    "linear-gradient(to bottom, #eb7e5d, #854735)",
    "linear-gradient(to right, #187a72, #2ce0d2)",
    "linear-gradient(to right, #98994d, #feff80)",
    "linear-gradient(to right, #6b943b, #b4fa63)",
    "linear-gradient(to right, #926f34, #f8bd58)",
  ]
  const shareRows = [
    [682, "#eb7e5d"],
    [720, "#2ce0d2"],
    [758, "#feff80"],
    [796, "#b4fa63"],
    [834, "#f8bd58"],
  ] as const
  let shareCursor = 65
  const share = d.share.map((part, index) => {
    const box = { x: shareCursor, width: part.width, paint: sharePaint[index], label: part.label, value: part.value }
    shareCursor += part.width + 3
    return box
  })
  const sla = [
    { x: 335, paint: "linear-gradient(to right, #854735, #eb7e5d)" },
    { x: 641, paint: "linear-gradient(to right, #187a72, #2ce0d2)" },
    { x: 947, paint: "linear-gradient(to right, #187a72, #2ce0d2)" },
    { x: 1253, paint: "linear-gradient(to right, #6b943b, #b4fa63)" },
    { x: 1559, paint: "linear-gradient(to right, #6b943b, #b4fa63)" },
  ].map((item, index) => ({ ...item, ...d.slaRows[index] }))
  return (
    <Frame>
      <Pin x={37} y={28} size={30} weight={700} color="#2de1d0" lh={35}>CUSTOMER IMPACT & CALL CENTER</Pin>
      {cards.map((card) => (
        <At key={card.label} x={card.x} y={97} w={card.w} h={165}>
          <div className="kpi surface-glow" />
        </At>
      ))}
      {cards.map((card) => (
        <span key={`${card.label}-t`}>
          <Pin x={card.lx} y={card.label === "Calls Answered" || card.label === "Queue Length" ? 120 : 119} size={24} weight={500} color="#34efde" lh={40}>{card.label}</Pin>
          <Pin x={card.vx} y={card.label === "Calls Answered" || card.label === "Queue Length" ? 184 : 183} size={60} weight={400} color="#dff9f7" lh={40}>{card.value}</Pin>
        </span>
      ))}
      <At x={29} y={287} w={1840} h={184}><div className="panel shell dim" /></At>
      <Pin x={54} y={297} size={26} weight={700} color="#f2f4f4" lh={30}>CUSTOMER IMPACT & ANOMALIES</Pin>
      <Pin x={54} y={335} size={20} weight={400} color="#a4adad" lh={23}>Consumption anomalies</Pin>
      <Pin x={54} y={364} size={70} weight={400} color="#ffffff" lh={85}>{d.anomalies}</Pin>
      {bars.map((bar) => (
        <span key={bar.label}>
          <Pin x={565} y={bar.y} size={24} weight={400} color="#dce3e3" lh={28}>{bar.label}</Pin>
          <Pin x={bar.vx} y={bar.y} size={24} weight={400} color="#e8ecec" lh={28}>{bar.value}</Pin>
          <At x={900} y={bar.y + 6} w={800} h={16}><div style={{ height: "100%", borderRadius: 33, background: "#303c3a" }} /></At>
          <At x={884} y={bar.y + 6} w={bar.fillW} h={16}><div style={{ height: "100%", borderRadius: 38, background: bar.paint }} /></At>
        </span>
      ))}
      <At x={29} y={479} w={633} h={422}><div className="panel shell dim" /></At>
      <At x={678} y={479} w={1191} h={422}><div className="panel shell dim" /></At>
      <Pin x={65} y={517} size={26} weight={700} color="#f1f4f4" lh={30}>COMPLAINT CATEGORY</Pin>
      <Pin x={65} y={555} size={20} weight={400} color="#a4adad" lh={23}>Share of accident calls by issue</Pin>
      {share.map((part) => (
        <At key={part.label} x={part.x} y={627} w={part.width} h={36}>
          <div style={{ height: "100%", borderRadius: 2, background: part.paint }} />
        </At>
      ))}
      {shareRows.map((row, index) => (
        <span key={share[index].label}>
          <At x={70} y={row[0] + 4} w={14} h={14}><div style={{ height: "100%", borderRadius: 3, background: row[1] }} /></At>
          <Pin x={98} y={row[0]} size={20} weight={400} color="#e9eeee" lh={23}>{share[index].label}</Pin>
          <Pin x={520} y={row[0]} w={99} size={20} weight={400} color="#f0f4f4" lh={23} align="right">{share[index].value}</Pin>
        </span>
      ))}
      <Pin x={740} y={502} size={26} weight={700} color="#f1f4f4" lh={30}>SERVICE LEVEL BY REGION & MONTH</Pin>
      <Pin x={740} y={540} size={18} weight={400} color="#a4adad" lh={21}>Calls answered within 20 seconds · synthetic</Pin>
      {monthLabels.map(([x, label]) => (
        <Pin key={label} x={x} y={581} size={18} weight={400} color="#a4adad" lh={21}>{label}</Pin>
      ))}
      {regions.map(([x, y], index) => (
        <Pin key={d.regionNames[index]} x={x} y={y} size={18} weight={400} color="#c8d0d0" lh={21}>{d.regionNames[index]}</Pin>
      ))}
      {heatY.map((y, row) => heatX.map((x, column) => (
        <At key={`${row}-${column}`} x={x} y={y} w={67} h={23}>
          <div style={{ height: "100%", background: heatColor[heat[row][column]] }} />
        </At>
      )))}
      {legend.map(([y, color, label]) => (
        <span key={label}>
          <At x={1727} y={y} w={31} h={13}><div style={{ height: "100%", borderRadius: 2, background: color }} /></At>
          <Pin x={1767} y={y - 4} size={18} weight={400} color="#a4adad" lh={21}>{label}</Pin>
        </span>
      ))}
      <At x={29} y={913} w={1840} h={145}><div className="panel shell dim" /></At>
      <Pin x={60} y={927} size={32} weight={400} color="#ffffff" lh={39}>CRM SLA</Pin>
      <Pin x={60} y={958} size={60} weight={400} color="#ffffff" lh={73}>{d.sla}</Pin>
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

function Screen14() {
  const d = useContent().screen14
  const tamper = [
    { y: 442, bar: 443, vx: 658 },
    { y: 499, bar: 500, vx: 656 },
    { y: 556, bar: 557, vx: 660 },
    { y: 613, bar: 614, vx: 677 },
    { y: 670, bar: 671, vx: 692 },
  ].map((item, index) => ({ ...item, ...d.tamper[index] }))
  const alerts = [
    { y: 430.4, ry: 439.4, ty: 445.4, color: "#ff3c49", ay: 430.4, aw: 302 },
    { y: 501.4, ry: 510.4, ty: 516.4, color: "#ff3c49", ay: 510.4, aw: 323 },
    { y: 583.4, ry: 592.4, ty: 598.4, color: "#ff3c49", ay: 592.4, aw: 291 },
    { y: 661.4, ry: 670.4, ty: 676.4, color: "#ffcf32", ay: 670.4, aw: 322 },
    { y: 738.4, ry: 747.4, ty: 753.4, color: "#ffcf32", ay: 747.4, aw: 348 },
    { y: 821.4, ry: 830.4, ty: 836.4, color: "#ffcf32", ay: 830.4, aw: 329 },
  ].map((item, index) => ({ ...item, ...d.alerts[index] }))
  return (
    <Frame>
      <Pin x={37} y={28} size={32} weight={900} color="#34efde" lh={40}>EXECUTIVE  BOARD</Pin>
      {[
        [31, 298.1, false],
        [341, 299.3, false],
        [653, 299.3, true],
        [965, 299.3, false],
        [1278, 298.1, true],
        [1588, 299.3, true],
      ].map(([x, w, heat]) => (
        <At key={x as number} x={x as number} y={113} w={w as number} h={150}>
          <div className={heat ? "kpi surface-heat" : "kpi"} />
        </At>
      ))}
      <Pin x={58} y={113} size={24} weight={500} color="#34efde" lh={40}>UFG</Pin>
      <Pin x={57} y={180} size={60} weight={700} color="#ffffff" lh={40}>{d.ufg}</Pin>
      <Pin x={385} y={116} size={24} weight={500} color="#34efde" lh={40}>Collection Efficiency</Pin>
      <Pin x={382} y={180} size={60} weight={700} color="#ffffff" lh={40}>{d.collection}</Pin>
      <Pin x={669} y={113} size={24} color="#eb7d5c" lh={40}>Outstanding Balance</Pin>
      <Pin x={669} y={180} size={60} weight={700} color="#ffffff" lh={40}>{d.balance} <span style={{ fontSize: 33 }}>AZN</span></Pin>
      <Pin x={982} y={116} size={24} weight={500} color="#34efde" lh={40}>Emergency Response</Pin>
      <Pin x={1000} y={180} size={60} weight={700} color="#ffffff" lh={40}>{d.response} <span style={{ fontSize: 33 }}>MIN</span></Pin>
      <Pin x={1301} y={116} size={24} color="#eb7d5c" lh={40}>Reconnect within 24 h</Pin>
      <Pin x={1299} y={180} size={60} weight={700} color="#ffffff" lh={40}>{d.reconnect}</Pin>
      <Pin x={1612} y={116} size={24} color="#eb7d5c" lh={40}>Meters Communicating</Pin>
      <Pin x={1610} y={180} size={60} weight={700} color="#ffffff" lh={40}>{d.meters}</Pin>

      <At x={31} y={285} w={718} h={453}><div className="panel shell dim" /></At>
      <At x={770} y={285} w={1127} h={620}><div className="panel shell dim" /></At>
      <Pin x={58} y={307} size={32} color="#f4f5f4" lh={38}>Meter tampering signs</Pin>
      <Pin x={58} y={350} size={18} color="#969b98" lh={21}>Found in meter replacements · selected period</Pin>
      {tamper.map((row) => (
        <span key={row.label}>
          <Pin x={58} y={row.y} size={24} color="#e8f4f2" lh={29}>{row.label}</Pin>
          <Pin x={row.vx} y={row.y} size={24} color="#e8f4f2" lh={29}>{row.value}</Pin>
          <At x={336} y={row.bar} w={295} h={27}><div style={{ height: "100%", borderRadius: 30, background: "#33413f" }} /></At>
          <At x={336} y={row.bar} w={row.fill} h={27}><div style={{ height: "100%", borderRadius: 38, background: "linear-gradient(to right, #1e897f, #34efde)" }} /></At>
        </span>
      ))}
      {[484, 541, 598, 655].map((y) => (
        <At key={y} x={58} y={y} w={662} h={1}><div style={{ height: 1, background: "#343a38" }} /></At>
      ))}

      <Pin x={803} y={307} size={32} color="#ffffff" lh={40}>EXECUTIVE ALERT BOARD</Pin>
      <Pin x={803} y={388} size={20} color="#a6b3af" lh={23}>Type</Pin>
      <Pin x={1118} y={388} size={20} color="#a6b3af" lh={23}>Region</Pin>
      <Pin x={1364} y={388} size={20} color="#a6b3af" lh={23}>Severity</Pin>
      <Pin x={1542} y={388} size={20} color="#a6b3af" lh={23}>Action</Pin>
      {[418, 500, 583.4, 661.5, 738.4, 821.8].map((y) => (
        <At key={y} x={803} y={y} w={1062} h={1}><div style={{ height: 1, background: "#2a3330" }} /></At>
      ))}
      {alerts.map((row) => (
        <span key={row.title}>
          <Pin x={803} y={row.y} size={24} color="#ffffff" lh={40}>{row.title}</Pin>
          <Pin x={803} y={row.y + 37} size={18} color="#a6b3af" lh={21}>{row.note}</Pin>
          <Pin x={1118} y={row.ry} size={24} color="#ffffff" lh={40}>{row.region}</Pin>
          <Pin x={1364} y={row.ty} size={24} weight={600} color={row.color} lh={28}>{row.tone}</Pin>
          <Pin x={1542} y={row.ay} w={row.aw} size={24} color="#ffffff" lh={29} wrap>{row.action}</Pin>
        </span>
      ))}
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
      <path d={`${gold} L1704 158 L80 158 Z`} fill="url(#rev-fill)" />
      {underlay(cyan, 14, "#34efde", 0.55, "rev-cyan")}
      <path d={gold} fill="none" stroke="#ffd184" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <path d={cyan} fill="none" stroke="#34efde" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function Screen15() {
  const d = useContent().screen15
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
  const days = [
    [203, "5 Apr"], [493, "10 Apr"], [783, "15 Apr"], [1087, "20 Apr"], [1406, "25 Apr"], [1727, "30 Apr"],
  ] as const
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
      {days.map(([x, label]) => (
        <Pin key={label} x={x} y={589} size={18} color="#a4a7ae" lh={40}>{label}</Pin>
      ))}
      <RevenueChart cyan={d.cyanPath} gold={d.goldPath} />

      <At x={34} y={701} w={1846} h={339}><div className="panel shell dim" /></At>
      <Pin x={67} y={733} size={32} weight={900} color="#ffffff" lh={40}>CONNECT / DISCONNECT OPERATIONS</Pin>
      <Pin x={67} y={811} size={32} color="#ffffff" lh={39}>Reconnect SLA</Pin>
      <Pin x={67} y={863} size={70} color="#ffffff" lh={85}>{d.reconnect}</Pin>
      <Pin x={67} y={977} size={18} color="#76817f" lh={21}>Opening orders done within 24 h</Pin>
      {bars.map((bar) => (
        <span key={bar.label}>
          <At x={bar.x} y={829} w={bar.w} h={18}>
            <div style={{ height: "100%", borderRadius: 131, background: bar.fill }} />
          </At>
          <Pin x={bar.lx} y={863} size={24} color="#ffffff" lh={40}>{bar.label}</Pin>
          <Pin x={bar.vx} y={903} size={32} color="#f3f5f4" lh={38}>{bar.value}</Pin>
        </span>
      ))}
    </Frame>
  )
}

function Screen16() {
  const d = useContent().screen16
  const kpis = [
    { x: 34, w: 446, label: "Accident calls", lx: 92, vx: 121, value: d.calls, note: "Selected reporting period", nx: 274 },
    { x: 498, w: 447, label: "Resolved on first visit", lx: 539, vx: 532, value: d.firstVisit, note: "Accident calls", nx: 820 },
    { x: 964, w: 445, label: "Leaks sent to repair within 24h", lx: 991, vx: 985, value: d.leaks24, note: "Dispatch to repair", nx: 1272 },
    { x: 1423, w: 446, label: "Suspected tamper / revenue loss", lx: 1455, vx: 1498, value: d.tamper, note: "Suspected cases · not confirmed", nx: 1625 },
  ]
  const bars = [
    { x: 79, y: 602, track: 672, fill: d.pipelineCoverage.fill },
    { x: 79, y: 927, track: 672, fill: d.regulatorCoverage.fill },
    { x: 1146, y: 548, track: 320, fill: d.within24.fill },
    { x: 1520, y: 548, track: 320, fill: d.completion.fill },
    { x: 1146, y: 754, track: 320, fill: d.within7.fill },
    { x: 1520, y: 754, track: 320, fill: d.meterCut.fill },
    { x: 1146, y: 923, track: 320, fill: d.replacement24.fill },
  ]
  const rules = [
    [79, 656, 672],
    [810, 580, 1048],
    [810, 801, 1048],
  ] as const
  return (
    <Frame mirror>
      <Pin x={37} y={28} size={32} weight={900} color="#34efde" lh={40}>FIELD OPERATION</Pin>
      <Pin x={1546} y={43} size={16} color="#a3aeab" lh={19}>Activity: 1–20 Oct 2026 · through 01:50 AZT</Pin>
      {kpis.map((card) => (
        <span key={card.label}>
          <At x={card.x} y={97} w={card.w} h={150}><div className="kpi" /></At>
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
      <Pin x={79} y={497} size={43} color="#f3f5f4" lh={55}>{d.pipelineKm}</Pin>
      <Pin x={201} y={516} size={22} color="#a3aeab" lh={29}>km</Pin>
      <Pin x={643} y={438} size={18} color="#a3aeab" lh={21}>Leaks per km</Pin>
      <Pin x={688} y={464} size={32} color="#eb7d5c" lh={38}>{d.leaksPerKm}</Pin>
      <Pin x={671} y={517} size={18} color="#7f8b87" lh={21}>Leaks/km</Pin>
      <Pin x={79} y={559} size={18} color="#a3aeab" lh={23}>Pipeline inspection coverage</Pin>
      <Pin x={665} y={547} size={32} color="#f3f5f4" lh={38}>{d.pipelineCoverage.value}</Pin>
      <Pin x={79} y={698} size={24} color="#f3f5f4" lh={28}>Regulator inspection</Pin>
      <Pin x={79} y={811} size={43} color="#f3f5f4" lh={55}>{d.regulators}</Pin>
      <Pin x={165} y={836} size={16} color="#a3aeab" lh={21}>Regulators inspected</Pin>
      <Pin x={79} y={878} size={24} color="#a3aeab" lh={28}>Regulator inspection coverage</Pin>
      <Pin x={665} y={877} size={32} color="#f3f5f4" lh={38}>{d.regulatorCoverage.value}</Pin>
      <Pin x={79} y={963} size={18} color="#7f8b87" lh={21}>Coverage uses the corresponding inspection scope.</Pin>
      <Pin x={836} y={278} size={32} weight={700} color="#ffffff" lh={40}>Meter service operations</Pin>
      <Pin x={836} y={329} size={18} color="#a3aeab" lh={21}>Work volumes and completion measures</Pin>
      <Pin x={836} y={419} size={24} color="#f3f5f4" lh={28}>Reconnection</Pin>
      <Pin x={836} y={497} size={41} color="#f3f5f4" lh={48}>{d.reconnection}</Pin>
      <Pin x={836} y={548} size={15} color="#a3aeab" lh={18}>Recorded operations</Pin>
      <Pin x={1146} y={423} size={17} color="#a3aeab" lh={20}>Within 24h</Pin>
      <Pin x={1377} y={489} size={33} color="#f3f5f4" lh={39}>{d.within24.value}</Pin>
      <Pin x={1520} y={423} size={17} color="#a3aeab" lh={20}>Completion</Pin>
      <Pin x={1751} y={489} size={33} color="#f3f5f4" lh={39}>{d.completion.value}</Pin>
      <Pin x={836} y={665} size={24} color="#f3f5f4" lh={28}>Disconnection</Pin>
      <Pin x={836} y={706} size={41} color="#f3f5f4" lh={48}>{d.disconnection}</Pin>
      <Pin x={836} y={762} size={15} color="#a3aeab" lh={18}>Recorded operations</Pin>
      <Pin x={1146} y={669} size={17} color="#a3aeab" lh={20}>Within 7 days</Pin>
      <Pin x={1377} y={695} size={33} color="#f3f5f4" lh={39}>{d.within7.value}</Pin>
      <Pin x={1520} y={669} size={17} color="#a3aeab" lh={20}>Meter cut off</Pin>
      <Pin x={1751} y={695} size={33} color="#f3f5f4" lh={39}>{d.meterCut.value}</Pin>
      <Pin x={836} y={834} size={24} color="#f3f5f4" lh={28}>Replacement acts</Pin>
      <Pin x={836} y={875} size={41} color="#f3f5f4" lh={48}>{d.replacements}</Pin>
      <Pin x={836} y={931} size={15} color="#a3aeab" lh={18}>Acts recorded</Pin>
      <Pin x={1146} y={838} size={17} color="#a3aeab" lh={20}>Done within 24h</Pin>
      <Pin x={1377} y={864} size={33} color="#f3f5f4" lh={39}>{d.replacement24.value}</Pin>
      {bars.map((bar) => (
        <span key={`${bar.x}-${bar.y}`}>
          <At x={bar.x} y={bar.y} w={bar.track} h={22}><div style={{ height: "100%", borderRadius: 38, background: "#33413f" }} /></At>
          <At x={bar.x} y={bar.y} w={bar.fill} h={22}><div style={{ height: "100%", borderRadius: 38, background: "linear-gradient(to right, #1d897f, #34efde)" }} /></At>
        </span>
      ))}
    </Frame>
  )
}

function Screen17() {
  const spots = [34, 499, 964, 1429]
  const cards = useContent().screen17.cards.map((card, index) => ({ x: spots[index], ...card }))
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
              <Pin x={card.x + 39} y={valueY[index]} size={30} color="#339b9a" lh={40}>{row.value}</Pin>
            </span>
          ))}
          {card.bar && (
            <span>
              <Pin x={card.x + 39} y={790} size={24} color="#ffffff" lh={40}>{card.bar.label}</Pin>
              <Pin x={card.x + 291} y={837} size={30} color="#339b9a" lh={40}>{card.bar.value}</Pin>
              <At x={card.x + 39} y={847} w={235} h={21}><div style={{ height: "100%", borderRadius: 63, background: "#34575b" }} /></At>
              <At x={card.x + 39} y={847} w={card.bar.fill} h={21}><div style={{ height: "100%", borderRadius: 38, background: "linear-gradient(to right, #1e897f, #34efde)" }} /></At>
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
    { y: 840 }, { y: 877 }, { y: 915 }, { y: 953 }, { y: 990 },
  ].map((item, index) => ({ ...item, ...d.rows[index] }))
  return (
    <Frame border={false}>
      <At x={20} y={756} w={1391} h={290}><div className="panel shell dim" /></At>
      <Pin x={56} y={782} size={28} weight={500} color="#ffffff" lh={30}>CUSTOMER CONSUMPTION ANOMALY ALERTS</Pin>
      <Pin x={80} y={858} w={190} size={32} weight={500} color="#eb7d5c" lh={36} align="center">Total</Pin>
      <Pin x={80} y={900} w={190} size={32} weight={500} color="#eb7d5c" lh={36} align="center">Anomalies</Pin>
      <Pin x={89} y={953} size={72} color="#ffffff" lh={64}>{d.total}</Pin>
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

function Screen20({ state }: { state: WallState }) {
  const d = useContent().screen20
  const kpis = [
    { x: 29, lx: 60 },
    { x: 495, lx: 516 },
    { x: 960, lx: 980 },
    { x: 1426, lx: 1446 },
  ].map((item, index) => ({ ...item, ...d.cards[index] }))
  const expected = [
    { y: 429, dx: 489, mx: 768 },
    { y: 500, dx: 489, mx: 786 },
    { y: 571, dx: 506, mx: 800 },
    { y: 642, dx: 519, mx: 685 },
  ].map((item, index) => ({ ...item, ...d.expected[index] }))
  const complete = [
    { y: 434, bar: 440, py: 414 },
    { y: 502, bar: 508, py: 481 },
    { y: 572, bar: 578, py: 554 },
    { y: 644, bar: 650, py: 625 },
  ].map((item, index) => ({ ...item, ...d.complete[index] }))
  const reads = [
    { y: 852, rule: 818, vy: 845 },
    { y: 907, rule: 884, vy: 900 },
    { y: 962, rule: 939, vy: 955 },
  ].map((item, index) => ({ ...item, ...d.reads[index] }))
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
      <Pin x={764} y={375} size={18} color="#76817f" lh={21}>Monthly</Pin>
      <Rule x={51} y={405} w={776} />
      {expected.map((row) => (
        <span key={row.label}>
          <Pin x={49} y={row.y} size={24} color="#ffffff" lh={28}>{row.label}</Pin>
          <Pin x={row.dx} y={row.y} size={24} color="#ffffff" lh={28}>{row.daily}</Pin>
          <Pin x={row.mx} y={row.y} size={24} color="#ffffff" lh={28}>{row.monthly}</Pin>
        </span>
      ))}
      <Rule x={51} y={472} w={776} />
      <Rule x={51} y={543} w={776} />
      <Rule x={51} y={616} w={776} />

      <At x={875} y={270} w={996} h={434}><div className="panel shell dim" /></At>
      <Pin x={898} y={302} size={24} weight={700} color="#ffffff" lh={28}>Data completeness</Pin>
      <Pin x={1707} y={311} size={18} color="#76817f" lh={21}>0–100% per cell</Pin>
      <Pin x={899} y={337} size={18} color="#76817f" lh={21}>Daily and monthly completeness</Pin>
      <Pin x={1375} y={375} size={18} color="#76817f" lh={21}>Daily</Pin>
      <Pin x={1680} y={375} size={18} color="#76817f" lh={21}>Monthly</Pin>
      <Rule x={899} y={405} w={936} />
      {complete.map((row) => (
        <span key={row.label}>
          <Pin x={899} y={row.y} size={24} color="#ffffff" lh={28}>{row.label}</Pin>
          <At x={1273} y={row.bar} w={243} h={12}>
            <div style={{ height: "100%", borderRadius: 6, background: "linear-gradient(to right, #1e897f, #34efde)" }} />
          </At>
          <At x={1583} y={row.bar} w={243} h={12}>
            <div style={{ height: "100%", borderRadius: 6, background: "linear-gradient(to right, #1e897f, #34efde)" }} />
          </At>
          <Pin x={1476} y={row.py} size={18} color="#ffffff" lh={21}>{row.daily}</Pin>
          <Pin x={1786} y={row.py} size={18} color="#ffffff" lh={21}>{row.monthly}</Pin>
        </span>
      ))}
      <Rule x={899} y={472} w={936} />
      <Rule x={898} y={543} w={937} />
      <Rule x={899} y={616} w={936} />

      <At x={27} y={720} w={1308} h={307}><div className="panel shell dim" /></At>
      <Pin x={51} y={736} size={24} color="#ffffff" lh={28}>Estimated reads</Pin>
      <Pin x={53} y={771} size={18} color="#76817f" lh={21}>Estimated readings · share</Pin>
      <Pin x={638} y={787} size={18} color="#76817f" lh={21}>Daily</Pin>
      <Pin x={905} y={787} size={18} color="#76817f" lh={21}>Monthly</Pin>
      <Pin x={1206} y={787} size={18} color="#76817f" lh={21}>Hourly</Pin>
      {reads.map((row) => (
        <span key={row.label}>
          <Rule x={51} y={row.rule} w={1260} />
          <Pin x={49} y={row.y} size={24} color="#ffffff" lh={28}>{row.label}</Pin>
          <Pin x={619} y={row.vy} size={24} color="#ffffff" lh={28}>{row.daily}</Pin>
          <Pin x={909} y={row.vy} size={24} color="#ffffff" lh={28}>{row.monthly}</Pin>
          <Pin x={1199} y={row.vy} size={24} color="#ffffff" lh={28}>{row.hourly}</Pin>
        </span>
      ))}

      <At x={1346} y={720} w={521} h={312}><div className="panel shell dim" /></At>
      <Pin x={1371} y={736} size={24} color="#ffffff" lh={28}>Data processing</Pin>
      <Pin x={1371} y={780} size={18} color="#76817f" lh={21}>Separate measures</Pin>
      <Pin x={1371} y={862} size={24} color="#ffffff" lh={28}>Validation failure</Pin>
      <Pin x={1762} y={860} size={38} color="#f3f5f4" lh={45}>{d.validation}</Pin>
      <Rule x={1371} y={922} w={472} />
      <Pin x={1371} y={944} size={24} color="#ffffff" lh={28}>Edited</Pin>
      <Pin x={1762} y={942} size={38} color="#f3f5f4" lh={45}>{d.edited}</Pin>
    </Frame>
  )
}

function Screen21() {
  const d = useContent().screen21
  const kpis = [
    { x: 31, lx: 56 },
    { x: 649, lx: 674 },
    { x: 1267, lx: 1294 },
  ].map((item, index) => ({ ...item, ...d.cards[index] }))
  const zones = [
    { y: 425, bar: 429, x: 1468 },
    { y: 463, bar: 467, x: 1468 },
    { y: 501, bar: 505, x: 1469 },
    { y: 539, bar: 543, x: 1469 },
  ].map((item, index) => ({ ...item, ...d.zones[index] }))
  const grades = [
    { trackY: 829, trackH: 139, bottom: 968, x: 1107, vx: 1093, vy: 840, lx: 1122 },
    { trackY: 829, trackH: 139, bottom: 898 + 70, x: 1365, vx: 1349, vy: 881, lx: 1381 },
    { trackY: 829, trackH: 146, bottom: 942 + 27, x: 1623, vx: 1607, vy: 921, lx: 1638 },
  ].map((item, index) => ({ ...item, ...d.grades[index], fillH: d.grades[index].fill, fillY: item.bottom - d.grades[index].fill }))
  return (
    <Frame>
      <Pin x={32} y={28} size={32} weight={900} color="#34efde" lh={40}>PRESSURE & LEAK DETECTION</Pin>
      {kpis.map((card) => (
        <span key={card.label}>
          <At x={card.x} y={97} w={605} h={150}><div className="kpi" /></At>
          <Pin x={card.lx} y={99} size={24} weight={500} color="#34efde" lh={28}>{card.label}</Pin>
          <Pin x={card.lx} y={154} size={60} weight={700} color="#ffffff" lh={48}>{card.value}</Pin>
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
      <Pin x={56} y={468} size={18} color="#76817f" lh={21}>{d.lowViolation.note}</Pin>
      <At x={408} y={451} w={355} h={22}><div style={{ height: "100%", borderRadius: 27, background: "#33413f" }} /></At>
      <At x={408} y={451} w={d.lowViolation.fill} h={22}><div style={{ height: "100%", borderRadius: 27, background: "linear-gradient(to right, #8c6034, #f2a65a)" }} /></At>
      <Pin x={816} y={445} size={30} color="#f3f5f4" lh={36}>{d.lowViolation.value}</Pin>
      <Rule x={56} y={498} w={824} color="#343838" />
      <Pin x={56} y={509} size={24} color="#f3f5f4" lh={28}>Medium pressure violation</Pin>
      <Pin x={56} y={544} size={18} color="#76817f" lh={21}>{d.mediumViolation.note}</Pin>
      <At x={408} y={528} w={355} h={22}><div style={{ height: "100%", borderRadius: 27, background: "#33413f" }} /></At>
      <At x={408} y={528} w={d.mediumViolation.fill} h={22}><div style={{ height: "100%", borderRadius: 27, background: "linear-gradient(to right, #8c6034, #f2a65a)" }} /></At>
      <Pin x={816} y={522} size={30} color="#f3f5f4" lh={36}>{d.mediumViolation.value}</Pin>
      <At x={56} y={596} w={10} h={10}><div style={{ width: 10, height: 10, borderRadius: 5, background: "#f2ab65" }} /></At>
      <Pin x={76} y={590} size={18} color="#76817f" lh={21}>Sensors with pressure violations</Pin>

      <At x={953} y={320} w={919} h={314}><div className="panel shell dim" /></At>
      <Pin x={976} y={339} size={24} weight={700} color="#f3f5f4" lh={28}>Customers impacted</Pin>
      <Pin x={976} y={374} size={18} color="#a3aeab" lh={21}>By pressure violations</Pin>
      <Pin x={976} y={424} size={70} color="#ffffff" lh={85} font="Inter, sans-serif">{d.customers}</Pin>
      <Pin x={976} y={517} w={171} size={18} color="#a3aeab" lh={21} wrap>Unique customers · illustrative definition</Pin>
      <Pin x={976} y={594} size={18} color="#7f8b87" lh={21}>Source: GIS</Pin>
      <Rule x={1267} y={424} w={1} h={139} color="#343838" />
      <Pin x={1343} y={339} size={24} weight={700} color="#f3f5f4" lh={28}>Top affected zones</Pin>
      <Pin x={1750} y={396} size={16} color="#8c9695" lh={19}>Customers</Pin>
      {zones.map((row) => (
        <span key={row.label}>
          <Pin x={1343} y={row.y} size={24} color="#e8f0ed" lh={28}>{row.label}</Pin>
          <At x={row.x} y={row.bar} w={280} h={20}><div style={{ height: "100%", borderRadius: 62, background: "#33413f" }} /></At>
          <At x={row.x} y={row.bar} w={row.fill} h={20}><div style={{ height: "100%", borderRadius: 62, background: "linear-gradient(to right, #e6846b, #80493b)" }} /></At>
          <Pin x={1787} y={row.y} size={24} color="#e8f0ed" lh={28}>{row.value}</Pin>
        </span>
      ))}
      <Pin x={1343} y={594} size={18} color="#7f8b87" lh={21}>Source: GIS</Pin>

      <At x={31} y={644} w={910} h={388}><div className="panel shell dim" /></At>
      <Pin x={56} y={720} size={24} color="#ffffff" lh={28}>Leak indicators</Pin>
      <Pin x={56} y={758} size={18} color="#76817f" lh={21}>Counts and handling times for the selected context</Pin>
      <Pin x={56} y={812} size={18} color="#76817f" lh={21}>Suspected leaks</Pin>
      <Pin x={56} y={851} size={40} color="#f3f5f4" lh={47}>{d.suspected}</Pin>
      <Pin x={399} y={864} size={18} color="#76817f" lh={21}>MDMS</Pin>
      <Pin x={486} y={812} size={18} color="#76817f" lh={21}>Confirmed leaks</Pin>
      <Pin x={486} y={851} size={40} color="#f3f5f4" lh={47}>{d.confirmed}</Pin>
      <Pin x={869} y={864} size={18} color="#76817f" lh={21}>LD</Pin>
      <Rule x={56} y={924} w={850} />
      <Rule x={471} y={825} w={1} h={183} />
      <Pin x={56} y={934} size={18} color="#76817f" lh={21}>Avg. leak response time</Pin>
      <Pin x={56} y={971} size={40} color="#f3f5f4" lh={47}>{d.response}</Pin>
      <Pin x={338} y={984} size={18} color="#76817f" lh={21}>MFS · minutes</Pin>
      <Pin x={486} y={934} size={18} color="#76817f" lh={21}>Avg. leak repair time</Pin>
      <Pin x={486} y={961} size={40} color="#f3f5f4" lh={47}>{d.repair}</Pin>
      <Pin x={776} y={984} size={18} color="#76817f" lh={21}>MFS · minutes</Pin>

      <At x={953} y={644} w={919} h={388}><div className="panel shell dim" /></At>
      <Pin x={976} y={662} size={24} color="#ffffff" lh={28}>Leak distribution by grade</Pin>
      <Pin x={1723} y={681} size={18} color="#76817f" lh={21}>Source: MFM</Pin>
      <Pin x={976} y={700} size={18} color="#76817f" lh={21}>Demo categories and counts · population to confirm</Pin>
      <Pin x={976} y={732} size={18} color="#76817f" lh={21}>Leaks · count</Pin>
      <Pin x={995} y={791} size={14} color="#7f8b87" lh={16}>10</Pin>
      <Pin x={1003} y={874} size={18} color="#76817f" lh={21}>5</Pin>
      <Pin x={1003} y={959} size={18} color="#76817f" lh={21}>0</Pin>
      <Rule x={1027} y={829} w={802} color="#343a38" />
      <Rule x={1027} y={899} w={802} color="#343a38" />
      <Rule x={1027} y={969} w={802} color="#343a38" />
      {grades.map((bar) => (
        <span key={bar.label}>
          <At x={bar.x} y={bar.trackY} w={92} h={bar.trackH}>
            <div style={{ height: "100%", borderRadius: 67, background: "rgba(52,87,91,0.51)" }} />
          </At>
          <At x={bar.x} y={bar.fillY} w={92} h={bar.fillH}>
            <div style={{ height: "100%", borderRadius: 67, background: "linear-gradient(to bottom, #34efde, #1d897f)" }} />
          </At>
          <Pin x={bar.vx} y={bar.vy} size={18} color="#76817f" lh={21}>{bar.value}</Pin>
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
  8: (state) => (state.ufgOpen ? <UfgScreen8 /> : <Screen8 />),
  9: (state) => (state.ufgOpen ? <UfgScreen9 state={state} /> : <Screen9 />),
  13: () => <Screen13 />,
  14: () => <Screen14 />,
  15: () => <Screen15 />,
  16: () => <Screen16 />,
  17: () => <Screen17 />,
  18: () => <Screen18 />,
  19: () => <Screen19 />,
  20: (state) => <Screen20 state={state} />,
  21: () => <Screen21 />,
}

export function screenBody(id: number, state: WallState) {
  const render = bodies[id]
  return render ? render(state) : null
}
