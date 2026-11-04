import type { CSSProperties, ReactNode } from "react"
import { At, Frame } from "../ui/widgets"

export { Frame, At }

export const TEAL = "#34efde"
export const TEAL_GRAD = "linear-gradient(to right, #34efde, #1e897f)"
export const PANEL_GRAD = "linear-gradient(108deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)"
export const KPI_GRAD = "linear-gradient(to bottom, rgba(0, 0, 0, 0) 71.104%, #34efde 122.31%)"
export const KPI_GRAD_ALT = "linear-gradient(to bottom, rgba(48, 58, 68, 0) 71.104%, #34efde 129.54%)"
export const TRACK = "#263332"

export function Pin({
  x, y, size, weight = 400, color, children, w, lh, align, wrap, style,
}: {
  x: number
  y: number
  size: number
  weight?: number
  color: string
  children: ReactNode
  w?: number
  lh?: number
  align?: CSSProperties["textAlign"]
  wrap?: boolean
  style?: CSSProperties
}) {
  return (
    <div
      className="at pin"
      style={{
        left: x,
        top: y,
        width: w,
        fontSize: size,
        fontWeight: weight,
        color,
        lineHeight: lh != null ? `${lh}px` : `${size}px`,
        textAlign: align,
        whiteSpace: wrap ? "pre-line" : "nowrap",
        fontFamily: "Roboto, sans-serif",
        letterSpacing: 0,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

export function KpiCard({
  x, y, w = 297, label, value, hint, accent = TEAL, grad = KPI_GRAD, labelX, valueX,
}: {
  x: number
  y: number
  w?: number
  label: string
  value: ReactNode
  hint?: string
  accent?: string
  grad?: string
  labelX?: number
  valueX?: number
  /** @deprecated always left-aligned */
  valueAlign?: CSSProperties["textAlign"]
}) {
  const lx = labelX ?? x + 20
  const vx = valueX ?? x + 20
  return (
    <>
      <div
        className="at"
        style={{
          left: x,
          top: y,
          width: w,
          height: 134,
          borderRadius: 30,
          background: grad,
        }}
      />
      <Pin x={lx} y={y + 10} size={24} weight={500} color={accent} lh={40}>{label}</Pin>
      <div
        className="at"
        style={{
          left: vx,
          top: y + 58,
          display: "flex",
          flexDirection: "row",
          flexWrap: "nowrap",
          alignItems: "center",
          gap: 12,
          fontFamily: "Roboto, sans-serif",
          maxWidth: w - 28,
        }}
      >
        <span
          style={{
            fontSize: 60,
            fontWeight: 700,
            color: "#fff",
            lineHeight: "40px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {value}
        </span>
        {hint && (
          <span
            style={{
              fontSize: 16.8,
              fontWeight: 400,
              color: "#8fa5a4",
              lineHeight: "18px",
              whiteSpace: "pre-line",
              flexShrink: 1,
              minWidth: 0,
            }}
          >
            {hint}
          </span>
        )}
      </div>
    </>
  )
}

export function Panel({
  x, y, w, h, children, grad = PANEL_GRAD,
}: {
  x: number
  y: number
  w: number
  h: number
  children?: ReactNode
  grad?: string
}) {
  return (
    <div
      className="at"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: 30,
        border: "1px solid rgba(133, 71, 52, 0)",
        background: grad,
      }}
    >
      {children}
    </div>
  )
}

export function LiveBadge({ x = 1795, y = 17, src: _src }: { x?: number; y?: number; src?: string }) {
  return (
    <>
      <div
        className="at"
        style={{
          left: x,
          top: y,
          width: 86,
          height: 38,
          borderRadius: 10,
          background: "#34edda",
          border: "1.4px solid #244443",
        }}
      />
      <Pin x={x + 22} y={y + 7} size={20} weight={700} color="#090d0e" w={42} align="center">LIVE</Pin>
    </>
  )
}

export function HBar({
  x, y, pct, trackW, showLabel = false,
}: {
  x: number
  y: number
  pct: number
  trackW: number
  showLabel?: boolean
}) {
  const fillW = Math.max(0, Math.min(trackW, (pct / 100) * trackW))
  return (
    <>
      <div className="at" style={{ left: x, top: y, width: trackW, height: 12, borderRadius: 50, background: TRACK }} />
      <div
        className="at"
        style={{
          left: x,
          top: y,
          width: fillW,
          height: 12,
          borderRadius: 38,
          background: TEAL_GRAD,
        }}
      />
      {showLabel && (
        <Pin x={x + trackW + 12} y={y - 8} size={23} weight={700} color="#e8f2f0" w={80} align="right">
          {`${pct}%`}
        </Pin>
      )}
    </>
  )
}

export function MetricRow({
  y, label, sub, value, barX, barPct, barTrack = 720,
}: {
  y: number
  label: string
  sub?: string
  value: string
  barX: number
  barPct: number
  barTrack?: number
}) {
  return (
    <>
      <Pin x={1039} y={y} size={24} weight={400} color="#fff">{label}</Pin>
      {sub && <Pin x={1296} y={y + 2} size={19} weight={400} color="#555">{sub}</Pin>}
      <Pin x={1750} y={y} size={23} weight={700} color="#e8f2f0" w={120} align="right">{value}</Pin>
      <HBar x={barX} y={y + 36} pct={barPct} trackW={barTrack} />
    </>
  )
}

export function ImgAt({ x, y, w, h, src }: { x: number; y: number; w: number; h: number; src: string }) {
  return (
    <At x={x} y={y} w={w} h={h}>
      <img alt="" src={src} style={{ width: "100%", height: "100%", display: "block", objectFit: "fill" }} />
    </At>
  )
}

export function SocnocFrame({ children }: { children?: ReactNode }) {
  return <Frame border={true}>{children}</Frame>
}

export function EmptySocnocScreen() {
  return <SocnocFrame />
}
