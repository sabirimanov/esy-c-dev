import type { ReactNode } from "react"
import { useBrainCallCenter, withBrainFallback } from "../data/brainCallCenter"
import { At, Frame } from "../ui/widgets"
import type { WallState } from "../wall/state"

function Pin({
  x, y, size, weight = 400, color, children, w, lh, align, wrap,
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
        lineHeight: lh ? `${lh}px` : undefined,
        textAlign: align,
        whiteSpace: wrap ? "pre-line" : undefined,
      }}
    >
      {children}
    </div>
  )
}

const TEAL = "#34efde"
const TEAL_BAR = "linear-gradient(to right, #1e897f, #34efde)"
const ORANGE_BAR = "linear-gradient(to right, #a85a45, #eb8a77)"
const BLUE_BAR = "linear-gradient(to right, #2a6f9a, #4eb0e0)"
const TRACK = "#2a3533"

const paintOf = {
  teal: TEAL_BAR,
  orange: ORANGE_BAR,
  blue: BLUE_BAR,
} as const

function Donut({
  segments, total, size = 250, thickness = 28,
}: {
  segments: { value: number; color: string }[]
  total: number
  size?: number
  thickness?: number
}) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a2422" strokeWidth={thickness} />
      {segments.map((seg, index) => {
        const len = total > 0 ? (seg.value / total) * c : 0
        const dash = `${len} ${c - len}`
        const el = (
          <circle
            key={index}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={thickness}
            strokeDasharray={dash}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )
        offset += len
        return el
      })}
    </svg>
  )
}

function countText(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("en-US")
}

function pctText(value: number | null | undefined) {
  return value == null ? "—" : `${value.toFixed(2)}%`
}

export function Screen13CallCenter({ state }: { state: WallState }) {
  const data = withBrainFallback(useBrainCallCenter(state))
  const kpis = [
    { label: "Total Calls", value: countText(data.totalCalls) },
    { label: "Answered Calls", value: countText(data.answeredCalls) },
    { label: "AVG. Handle Time", value: data.aht ?? "—" },
    { label: "Service Satisfaction", value: pctText(data.serviceSatisfaction) },
  ]
  const callReasons = data.reasons
  const issueSegments = data.issues
  const qualityRows = data.quality
  const operators = data.operators
  const reasonMax = Math.max(1, ...callReasons.map((row) => row.value))
  const issueTotal = issueSegments.reduce((sum, row) => sum + row.value, 0)
  const kpiW = 448
  const kpiGap = 16
  const kpiX = [40, 40 + kpiW + kpiGap, 40 + 2 * (kpiW + kpiGap), 40 + 3 * (kpiW + kpiGap)]

  return (
    <Frame>
      <Pin x={40} y={28} size={30} weight={800} color={TEAL} lh={36}>CALL CENTER / SERVICE INTELLIGENCE</Pin>

      {kpiX.map((x, index) => (
        <At key={kpis[index].label} x={x} y={97} w={kpiW} h={150}>
          <div className="kpi" />
        </At>
      ))}
      {kpiX.map((x, index) => (
        <span key={`${kpis[index].label}-t`}>
          <Pin x={x + 28} y={118} size={22} weight={500} color={TEAL} lh={28}>{kpis[index].label}</Pin>
          <Pin x={x + 28} y={168} size={56} weight={400} color="#ffffff" lh={60}>{kpis[index].value}</Pin>
        </span>
      ))}

      <At x={40} y={268} w={940} h={386}>
        <div className="panel shell dim" />
      </At>
      <Pin x={68} y={286} size={22} weight={700} color="#f3f5f4" lh={28}>CALL REASONS / TOP ISSUES</Pin>
      {callReasons.map((row, index) => {
        const y = 334 + index * 38
        const fill = Math.max(18, Math.round((row.value / reasonMax) * 520))
        return (
          <span key={`${row.label}-${index}`}>
            <Pin x={68} y={y} w={260} size={16} color="#c8d4d2" lh={20}>{row.label}</Pin>
            <At x={340} y={y + 4} w={520} h={14}>
              <div style={{ height: "100%", borderRadius: 20, background: TRACK }} />
            </At>
            <At x={340} y={y + 4} w={fill} h={14}>
              <div style={{ height: "100%", borderRadius: 20, background: paintOf[row.paint] }} />
            </At>
            <Pin x={880} y={y} w={80} size={16} weight={600} color="#e8ecec" lh={20} align="right">
              {row.value.toLocaleString("en-US")}
            </Pin>
          </span>
        )
      })}

      <At x={1000} y={268} w={880} h={386}>
        <div className="panel shell dim" />
      </At>
      <Pin x={1032} y={286} size={22} weight={700} color="#f3f5f4" lh={28}>ISSUE DISTRIBUTION</Pin>
      <At x={1080} y={328} w={260} h={260}>
        <div style={{ position: "relative", width: 260, height: 260 }}>
          <Donut segments={issueSegments} total={issueTotal} size={260} thickness={32} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <div>
              <div style={{ fontSize: 38, fontWeight: 600, color: "#ffffff", lineHeight: "42px" }}>
                {issueTotal.toLocaleString("en-US")}
              </div>
              <div style={{ marginTop: 4, fontSize: 15, color: "#8d9694", lineHeight: "18px" }}>Top 5 Issues</div>
            </div>
          </div>
        </div>
      </At>
      <At x={1390} y={350} w={450} h={250}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, justifyContent: "center", height: "100%" }}>
          {issueSegments.map((row) => (
            <div key={row.label} style={{ display: "grid", gridTemplateColumns: "18px 1fr 80px", alignItems: "center", columnGap: 14 }}>
              <div style={{ width: 14, height: 14, borderRadius: 3, background: row.color }} />
              <div style={{ color: "#d5dddd", fontSize: 17, lineHeight: "20px" }}>{row.label}</div>
              <div style={{ color: "#f3f5f4", fontSize: 17, fontWeight: 600, lineHeight: "20px", textAlign: "right" }}>
                {row.value.toLocaleString("en-US")}
              </div>
            </div>
          ))}
        </div>
      </At>

      <At x={40} y={674} w={940} h={366}>
        <div className="panel shell dim" />
      </At>
      <Pin x={68} y={694} size={22} weight={700} color="#f3f5f4" lh={28}>SERVICE QUALITY / CUSTOMER FEEDBACK</Pin>
      {qualityRows.map((row, index) => {
        const col = index % 2
        const rowIndex = Math.floor(index / 2)
        const x = 68 + col * 450
        const y = 752 + rowIndex * 88
        const fill = Math.round(((row.value ?? 0) / 100) * 380)
        return (
          <span key={row.label}>
            <Pin x={x} y={y} w={280} size={16} color="#c8d4d2" lh={20}>{row.label}</Pin>
            <Pin x={x + 300} y={y} w={80} size={16} weight={600} color="#f3f5f4" lh={20} align="right">
              {pctText(row.value)}
            </Pin>
            <At x={x} y={y + 30} w={380} h={12}>
              <div style={{ height: "100%", borderRadius: 20, background: TRACK }} />
            </At>
            <At x={x} y={y + 30} w={fill} h={12}>
              <div style={{ height: "100%", borderRadius: 20, background: paintOf[row.paint] }} />
            </At>
          </span>
        )
      })}

      <At x={1000} y={674} w={880} h={366}>
        <div className="panel shell dim" />
      </At>
      <Pin x={1032} y={694} size={22} weight={700} color="#f3f5f4" lh={28}>OPERATOR PERFORMANCE</Pin>
      <Pin x={1032} y={742} size={13} weight={700} color="#8d9694" lh={16}>NAME</Pin>
      <Pin x={1380} y={742} w={110} size={13} weight={700} color="#8d9694" lh={16} align="right">TOTAL CALLS</Pin>
      <Pin x={1510} y={742} w={150} size={13} weight={700} color="#8d9694" lh={16} align="right">AVG HANDLE TIME</Pin>
      <Pin x={1700} y={742} w={140} size={13} weight={700} color="#8d9694" lh={16} align="right">SCORE</Pin>
      {operators.map((row, index) => {
        const y = 786 + index * 56
        return (
          <span key={row.name}>
            <At x={1032} y={y - 12} w={816} h={1}>
              <div style={{ height: "100%", background: "#2a3330" }} />
            </At>
            <Pin x={1032} y={y} w={320} size={18} weight={600} color="#f3f5f4" lh={22}>{row.name}</Pin>
            <Pin x={1380} y={y} w={110} size={18} color="#d5dddd" lh={22} align="right">{countText(row.calls)}</Pin>
            <Pin x={1510} y={y} w={150} size={18} color="#d5dddd" lh={22} align="right">{row.aht}</Pin>
            <Pin x={1700} y={y} w={140} size={20} weight={700} color={TEAL} lh={22} align="right">
              {row.score == null ? "—" : `${row.score}%`}
            </Pin>
          </span>
        )
      })}
    </Frame>
  )
}
