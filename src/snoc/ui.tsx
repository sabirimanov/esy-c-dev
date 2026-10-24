import type { ReactNode } from "react"
import { dayLabel, TONE_COLOR, type Tone } from "./format"

export function Stage({ frame = true, children, className }: { frame?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={className ? `snoc ${className}` : "snoc"}>
      {frame && <div className="snoc-bezel" />}
      {children}
    </div>
  )
}

export function Title({ children, hint, stack = false }: { children: ReactNode; hint?: string; stack?: boolean }) {
  return (
    <div className={stack ? "snoc-title-row is-stack" : "snoc-title-row"}>
      <h1 className="snoc-title">{children}</h1>
      {hint && <p className="snoc-hint">{hint}</p>}
    </div>
  )
}

export function Stat({ label, text, tone = "ok" }: { label: string; text: string; tone?: Tone }) {
  const color = tone === "bad" ? "#eb7d5c" : tone === "warn" ? "#f3c85b" : "#ffffff"
  return (
    <article className={tone === "bad" || tone === "warn" ? "kpi surface-heat" : "kpi"}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>
        {text}
      </div>
    </article>
  )
}

export function Plate({
  title,
  hint,
  extra,
  children,
  className,
}: {
  title?: string
  hint?: string
  extra?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={className ? `snoc-plate ${className}` : "snoc-plate"}>
      {(title || extra) && (
        <header>
          <div>
            {title && <h2>{title}</h2>}
            {hint && <p>{hint}</p>}
          </div>
          {extra}
        </header>
      )}
      {children}
    </section>
  )
}

export function BarRow({ label, text, ratio, tone }: { label: string; text: string; ratio: number; tone: Tone }) {
  const width = `${Math.max(0, Math.min(1, ratio)) * 100}%`
  return (
    <div className="snoc-bar">
      <span>{label}</span>
      <div className="snoc-track">
        <i className={`is-${tone}`} style={{ width }} />
      </div>
      <b className={`is-${tone}`} style={tone === "bad" || tone === "warn" ? { color: TONE_COLOR[tone] } : undefined}>
        {text}
      </b>
    </div>
  )
}

export function Chip({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`snoc-chip is-${tone}`}>{children}</span>
}

export function AreaChart({
  points,
  color,
  target,
  dashed = false,
  fill = false,
}: {
  points: [number, number][]
  color: string
  target?: number | null
  dashed?: boolean
  fill?: boolean
}) {
  const taken = thin(points, 64)
  if (taken.length < 2) return <div className="snoc-chart-empty">—</div>
  const w = 640
  const h = 240
  const left = 58
  const right = 8
  const top = 16
  const bottom = 28
  const hours = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "24:00"]
  const ys = taken.map((point) => point[1])
  const yMax = Math.max(...ys, target ?? 0) * 1.25 || 1
  const xAt = (index: number) => left + (index / (taken.length - 1)) * (w - left - right)
  const yAt = (value: number) => top + (1 - value / yMax) * (h - top - bottom)
  const line = taken.map((point, index) => `${index ? "L" : "M"}${xAt(index).toFixed(1)},${yAt(point[1]).toFixed(1)}`).join("")
  const area = `${line}L${xAt(taken.length - 1).toFixed(1)},${h - bottom}L${xAt(0).toFixed(1)},${h - bottom}Z`
  const stamps = [0.12, 0.37, 0.62, 0.87].map((t) => taken[Math.round(t * (taken.length - 1))])
  return (
    <svg className="snoc-chart" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      {hours.map((label, index) => {
        const y = top + (index / (hours.length - 1)) * (h - top - bottom)
        return (
          <g key={label}>
            <text x={left - 8} y={y + 4} fill="#8aa3a8" fontSize="12" textAnchor="end">
              {label}
            </text>
            <line x1={left} x2={w - right} y1={y} y2={y} stroke="#24302f" strokeWidth={1} />
          </g>
        )
      })}
      {fill && (
        <>
          <defs>
            <linearGradient id="snoc-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={color} stopOpacity="0.55" />
              <stop offset="1" stopColor={color} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#snoc-area)" />
        </>
      )}
      <path d={line} fill="none" stroke={color} strokeWidth={2.4} strokeDasharray={dashed ? "7 5" : undefined} />
      {target != null && (
        <line x1={left} x2={w - right} y1={yAt(target)} y2={yAt(target)} stroke="#e8eef0" strokeDasharray="3 6" strokeWidth={1.6} />
      )}
      {fill ? (
        <text x={left} y={h - 8} fill="#8aa3a8" fontSize="12">
          {dayLabel(taken[0][0])}
        </text>
      ) : (
        stamps.map((point, index) => (
          <text key={index} x={xAt(Math.round([0.12, 0.37, 0.62, 0.87][index] * (taken.length - 1)))} y={h - 8} fill="#8aa3a8" fontSize="12" textAnchor="middle">
            {dayLabel(point[0]).replace(" ", ".")}
          </text>
        ))
      )}
    </svg>
  )
}

function thin(points: [number, number][], count: number) {
  if (points.length <= count) return points
  const step = (points.length - 1) / (count - 1)
  return Array.from({ length: count }, (_, index) => points[Math.round(index * step)])
}

export const RIBBON: [string, string][] = [
  ["ribbon.equipment", "Equipment"],
  ["ribbon.application", "Application"],
  ["ribbon.soc", "SOC"],
  ["ribbon.communication", "Communication"],
  ["ribbon.data_quality", "Data Quality"],
  ["ribbon.data_centre", "Data Centre"],
  ["ribbon.core_systems", "Core Systems"],
  ["ribbon.identity_access", "Identity & Access"],
  ["ribbon.integration", "Integration"],
]

const RIBBON_STEP = 300

export function Ribbon({ side, values }: { side: "left" | "right"; values: { text: string; tone: Tone }[] }) {
  const width = RIBBON.length * RIBBON_STEP
  const shift = side === "left" ? 720 : 720 - 1920
  const y = 28
  let path = `M ${RIBBON_STEP / 2} ${y}`
  for (let index = 1; index < RIBBON.length; index++) {
    const x0 = (index - 0.5) * RIBBON_STEP
    const x1 = (index + 0.5) * RIBBON_STEP
    const bend = index % 2 === 0 ? 14 : -14
    path += ` C ${x0 + 42} ${y + bend}, ${x1 - 42} ${y - bend}, ${x1} ${y}`
  }
  const gradient = `ribbon-${side}`
  return (
    <div className="snoc-ribbon-clip">
      <div className="snoc-ribbon" style={{ width, transform: `translateX(${shift}px)` }}>
        <svg className="snoc-ribbon-svg" viewBox={`0 0 ${width} 64`} preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradient} x1="0" x2="1">
              <stop offset="0" stopColor="#3ef0e2" />
              <stop offset="0.2" stopColor="#9fe0cf" />
              <stop offset="0.34" stopColor="#cbb89a" />
              <stop offset="0.46" stopColor="#e08a62" />
              <stop offset="0.58" stopColor="#e0a45c" />
              <stop offset="0.74" stopColor="#8ed9b0" />
              <stop offset="1" stopColor="#3ef0e2" />
            </linearGradient>
          </defs>
          <path d={path} fill="none" stroke={`url(#${gradient})`} strokeWidth="30" strokeLinecap="round" />
          {RIBBON.map((item, index) => (
            <ellipse key={item[0]} cx={(index + 0.5) * RIBBON_STEP} cy={y} rx="48" ry="20" fill={`url(#${gradient})`} />
          ))}
        </svg>
        <div className="snoc-ribbon-row">
          {RIBBON.map(([key, label], index) => (
            <div key={key} className="snoc-node">
              <div className="snoc-node-label">{label}</div>
              <div className="snoc-node-value">{values[index]?.text ?? "—"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
