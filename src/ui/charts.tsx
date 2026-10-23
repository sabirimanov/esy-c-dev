import type { Tone } from "./widgets"

export type Series = {
  name: string
  color: string
  data: (number | null)[]
  dashed?: boolean
  fill?: boolean
}

function linePath(data: (number | null)[], xAt: (index: number) => number, yAt: (value: number) => number) {
  let path = ""
  let drawing = false
  data.forEach((value, index) => {
    if (value == null) {
      drawing = false
      return
    }
    path += `${drawing ? "L" : "M"}${xAt(index).toFixed(1)} ${yAt(value).toFixed(1)}`
    drawing = true
  })
  return path
}

export function LineChart({
  series,
  min = 0,
  max,
  xLabels,
  height = 300,
  fillHeight = false,
  markers = false,
  note,
  format,
  step,
}: {
  series: Series[]
  min?: number
  max: number
  xLabels: { at: number; text: string }[]
  height?: number
  fillHeight?: boolean
  markers?: boolean
  note?: string
  format?: (value: number) => string
  step?: number
}) {
  const width = 1000
  const inner = 360
  const count = Math.max(...series.map((item) => item.data.length), 2)
  const xAt = (index: number) => 28 + (index / (count - 1)) * (width - 48)
  const yAt = (value: number) => 12 + (1 - (value - min) / (max - min)) * (inner - 28)
  const ticks = step
    ? Array.from({ length: Math.round((max - min) / step) + 1 }, (_, index) => Number((max - index * step).toFixed(2))).filter((value) => value >= min - 0.001)
    : [0, 0.25, 0.5, 0.75, 1].map((part) => min + (max - min) * (1 - part))

  return (
    <div className={fillHeight ? "chart chart-fill" : "chart"}>
      <div className="chart-plot" style={fillHeight ? undefined : { height }}>
        <div className="chart-y">
          {ticks.map((tick) => (
            <span key={tick}>{format ? format(tick) : Number.isInteger(tick) ? String(tick) : tick.toFixed(1)}</span>
          ))}
        </div>
        <svg viewBox={`0 0 ${width} ${inner}`} preserveAspectRatio="none">
          {ticks.map((tick) => (
            <line key={tick} x1="28" x2={width - 12} y1={yAt(tick)} y2={yAt(tick)} className="grid-line" />
          ))}
          {series.map((item) => {
            const path = linePath(item.data, xAt, yAt)
            const first = item.data.findIndex((value) => value != null)
            let last = -1
            item.data.forEach((value, index) => {
              if (value != null) last = index
            })
            const fill =
              item.fill && first >= 0 && last >= 0
                ? `${path}L${xAt(last)} ${yAt(min)}L${xAt(first)} ${yAt(min)}Z`
                : ""
            return (
              <g key={item.name}>
                {fill && <path d={fill} fill={item.color} opacity="0.18" />}
                <path d={path} fill="none" stroke={item.color} strokeWidth="2.5" strokeDasharray={item.dashed ? "7 6" : undefined} vectorEffect="non-scaling-stroke" />
                {markers &&
                  item.data.map((value, index) =>
                    value == null ? null : <circle key={index} cx={xAt(index)} cy={yAt(value)} r="3.5" fill={item.color} />,
                  )}
              </g>
            )
          })}
        </svg>
      </div>
      <div className="chart-x">
        {xLabels.map((label) => (
          <span key={label.text} style={{ left: `${(label.at / (count - 1)) * 100}%` }}>
            {label.text}
          </span>
        ))}
      </div>
      <div className="legend">
        {series.map((item) => (
          <span key={item.name}>
            <i style={{ background: item.dashed ? "transparent" : item.color, borderColor: item.color }} />
            {item.name}
          </span>
        ))}
      </div>
      {note && <p className="chart-note">{note}</p>}
    </div>
  )
}

export function Donut({
  value,
  percent,
  size = 168,
}: {
  value: string
  percent: number
  size?: number
}) {
  const radius = 36
  const length = 2 * Math.PI * radius
  const dash = Math.max(0, Math.min(1, percent / 100)) * length
  return (
    <div className="donut" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} className="donut-track" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="donut-value"
          strokeDasharray={`${dash} ${length - dash}`}
        />
      </svg>
      <strong>{value}</strong>
    </div>
  )
}

export function Timeline({ steps }: { steps: { label: string; time: string; tone: Tone }[] }) {
  return (
    <div className="timeline">
      <div className="timeline-line" />
      {steps.map((step) => (
        <div key={step.label} className={`time-step tone-${step.tone}`}>
          <i />
          <strong>{step.label}</strong>
          <span>{step.time}</span>
        </div>
      ))}
    </div>
  )
}

export function Matrix({
  points,
}: {
  points: { id: string; x: number; y: number; tone: Tone }[]
}) {
  return (
    <div className="matrix">
      <div className="matrix-y">
        <span>High</span>
        <span>Medium</span>
        <span>Low</span>
      </div>
      <div className="matrix-plot">
        <i className="matrix-cross x" />
        <i className="matrix-cross y" />
        {points.map((point) => (
          <span
            key={point.id}
            className={`matrix-dot tone-${point.tone}`}
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            {point.id}
          </span>
        ))}
      </div>
      <div className="matrix-x">
        <span>Low</span>
        <span>Medium</span>
        <span>High</span>
      </div>
    </div>
  )
}

export function Heatmap({
  columns,
  rows,
}: {
  columns: string[]
  rows: { label: string; values: number[] }[]
}) {
  return (
    <div className="heat">
      <div className="heat-grid" style={{ gridTemplateColumns: `132px repeat(${columns.length}, 1fr)` }}>
        <span />
        {columns.map((column) => (
          <span key={column} className="heat-col">
            {column}
          </span>
        ))}
        {rows.flatMap((row) => [
          <span className="heat-label" key={`${row.label}-label`}>
            {row.label}
          </span>,
          ...row.values.map((value, index) => (
            <i key={`${row.label}-${index}`} style={{ background: heatColor(value) }} />
          )),
        ])}
      </div>
    </div>
  )
}

function heatColor(value: number) {
  if (value >= 0.9) return "#9ffcf4"
  if (value >= 0.8) return "#46d7cd"
  if (value >= 0.7) return "#1b8f8a"
  if (value >= 0.6) return "#145e62"
  return "#3c2d58"
}

export function Bubbles({
  items,
  max = 8,
}: {
  items: { label: string; value: number; tone: Tone }[]
  max?: number
}) {
  const ticks = [max, Math.round(max / 2), 0]
  return (
    <div className="grade">
      <div className="grade-y">
        {ticks.map((tick) => (
          <span key={tick}>{tick}</span>
        ))}
      </div>
      <div className="grade-plot">
        {items.map((item) => (
          <div className="grade-col" key={item.label}>
            <div className="grade-stem">
              <div className="capsule-shell">
                <div className="capsule" style={{ height: `${(item.value / max) * 100}%` }}>
                  <strong>{item.value}</strong>
                </div>
              </div>
            </div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
