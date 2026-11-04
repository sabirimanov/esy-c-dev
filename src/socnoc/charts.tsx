import type { ReactNode } from "react"
import { At } from "../ui/widgets"
import { TEAL, TEAL_GRAD, TRACK } from "./ui"

/** Horizontal progress bar — CSS only, no images. */
export function ProgBar({
  x, y, trackW, fillW, h = 12, fill = TEAL_GRAD, track = TRACK,
}: {
  x: number
  y: number
  trackW: number
  fillW: number
  h?: number
  fill?: string
  track?: string
}) {
  const w = Math.max(0, Math.min(trackW, fillW))
  return (
    <>
      <div className="at" style={{ left: x, top: y, width: trackW, height: h, borderRadius: 50, background: track }} />
      <div className="at" style={{ left: x, top: y, width: w, height: h, borderRadius: 38, background: fill }} />
    </>
  )
}

export function ProgBarPct({
  x, y, trackW, pct, h = 12, fill = TEAL_GRAD,
}: {
  x: number
  y: number
  trackW: number
  pct: number
  h?: number
  fill?: string
}) {
  return <ProgBar x={x} y={y} trackW={trackW} fillW={(pct / 100) * trackW} h={h} fill={fill} />
}

/** Area + line chart from numeric series. yMax maps to top of chart. */
export function AreaLineChart({
  x, y, w, h, series, yMax, lineColor = TEAL, areaOpacity = 0.35,
}: {
  x: number
  y: number
  w: number
  h: number
  series: number[]
  yMax: number
  lineColor?: string
  areaOpacity?: number
}) {
  if (series.length < 2) return null
  const pts = series.map((v, i) => {
    const px = (i / (series.length - 1)) * w
    const py = h - (Math.max(0, Math.min(yMax, v)) / yMax) * h
    return [px, py] as const
  })
  const line = pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ")
  const area = `${line} L${w},${h} L0,${h} Z`
  const gid = `ag-${x}-${y}`.replace(/\./g, "")
  return (
    <At x={x} y={y} w={w} h={h}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={areaOpacity} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </At>
  )
}

/** Multi-series stacked-ish area + line chart for alerts over time. */
export function MultiLineChart({
  x, y, w, h, series, yMax, tooltipX,
}: {
  x: number
  y: number
  w: number
  h: number
  series: { color: string; area?: string; values: number[] }[]
  yMax: number
  tooltipX?: number
}) {
  const toPts = (values: number[]) =>
    values.map((v, i) => {
      const px = (i / (values.length - 1)) * w
      const py = h - (Math.max(0, Math.min(yMax, v)) / yMax) * h
      return [px, py] as const
    })
  const pathLine = (pts: readonly (readonly [number, number])[]) =>
    pts.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join(" ")
  const pathArea = (pts: readonly (readonly [number, number])[]) =>
    `${pathLine(pts)} L${w},${h} L0,${h} Z`

  return (
    <At x={x} y={y} w={w} h={h}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>
        {series.map((s, si) => {
          const pts = toPts(s.values)
          return (
            <g key={si}>
              {s.area && <path d={pathArea(pts)} fill={s.area} opacity={0.45} />}
              <path d={pathLine(pts)} fill="none" stroke={s.color} strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
            </g>
          )
        })}
        {tooltipX != null && (
          <line x1={tooltipX} y1={0} x2={tooltipX} y2={h} stroke="#6a7a7a" strokeWidth={1.5} />
        )}
      </svg>
    </At>
  )
}

/** Semi-donut / gauge arcs for severity. */
export function SeverityDonut({
  x, y, size, arcs, center, sub,
}: {
  x: number
  y: number
  size: number
  arcs: { color: string; startDeg: number; sweepDeg: number; r: number; stroke: number }[]
  center: ReactNode
  sub: ReactNode
}) {
  const cx = size / 2
  const cy = size / 2
  const arcPath = (r: number, startDeg: number, sweepDeg: number) => {
    const toRad = (d: number) => ((d - 90) * Math.PI) / 180
    const s = toRad(startDeg)
    const e = toRad(startDeg + sweepDeg)
    const x1 = cx + r * Math.cos(s)
    const y1 = cy + r * Math.sin(s)
    const x2 = cx + r * Math.cos(e)
    const y2 = cy + r * Math.sin(e)
    const large = sweepDeg > 180 ? 1 : 0
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`
  }
  return (
    <At x={x} y={y} w={size} h={size}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: "block" }}>
        <circle cx={cx} cy={cy} r={size * 0.38} fill="none" stroke="#1a2222" strokeWidth={18} />
        {arcs.map((a, i) => (
          <path
            key={i}
            d={arcPath(a.r, a.startDeg, a.sweepDeg)}
            fill="none"
            stroke={a.color}
            strokeWidth={a.stroke}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: size * 0.28,
          width: size,
          textAlign: "center",
          fontFamily: "Roboto, sans-serif",
          color: "#e2f5f4",
          fontSize: 52.8,
          fontWeight: 400,
          lineHeight: 1,
        }}
      >
        {center}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: size * 0.55,
          width: size,
          textAlign: "center",
          fontFamily: "Roboto, sans-serif",
          color: "#8da3a3",
          fontSize: 18,
          fontWeight: 400,
        }}
      >
        {sub}
      </div>
    </At>
  )
}

/** Tiny sparkline from values. */
export function Sparkline({
  x, y, w, h, values, color = TEAL,
}: {
  x: number
  y: number
  w: number
  h: number
  values: number[]
  color?: string
}) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const d = values
    .map((v, i) => {
      const px = (i / (values.length - 1)) * w
      const py = h - ((v - min) / span) * h
      return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`
    })
    .join(" ")
  return (
    <At x={x} y={y} w={w} h={h}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible" }}>
        <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </At>
  )
}

export function ChartGrid({
  x, y, w, rows, rowH, color = "#2a3333",
}: {
  x: number
  y: number
  w: number
  rows: number
  rowH: number
  color?: string
}) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="at"
          style={{ left: x, top: y + i * rowH, width: w, height: 1, background: color }}
        />
      ))}
    </>
  )
}
