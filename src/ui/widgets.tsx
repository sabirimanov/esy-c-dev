import type { CSSProperties, ReactNode } from "react"

export function Frame({ children, border = true, mirror = false }: { children: ReactNode; border?: boolean; mirror?: boolean }) {
  return (
    <div className="screen-body canvas">
      {border && <div className="frame-plate" />}
      {border && <div className={mirror ? "frame-stroke is-mirrored" : "frame-stroke"} />}
      {children}
    </div>
  )
}

export function At({
  x,
  y,
  w,
  h,
  children,
  className,
}: {
  x: number
  y: number
  w: number
  h: number
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className ? `at ${className}` : "at"} style={{ left: x, top: y, width: w, height: h }}>
      {children}
    </div>
  )
}

export function PlaceText({
  x,
  y,
  w,
  size = 32,
  weight = 700,
  color = "var(--cyan)",
  children,
}: {
  x: number
  y: number
  w?: number
  size?: number
  weight?: number
  color?: string
  children: ReactNode
}) {
  const style: CSSProperties = { left: x, top: y, fontSize: size, fontWeight: weight, color, width: w }
  return (
    <div className="at place-text" style={style}>
      {children}
    </div>
  )
}

export type Tone = "cyan" | "orange" | "red" | "yellow" | "green" | "white"

export function Panel({
  title,
  subtitle,
  extra,
  children,
  className,
}: {
  title?: string
  subtitle?: string
  extra?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={className ? `panel ${className}` : "panel"}>
      {(title || extra) && (
        <header className="panel-head">
          <div>
            {title && <h2>{title}</h2>}
            {subtitle && <p>{subtitle}</p>}
          </div>
          {extra}
        </header>
      )}
      {children}
    </section>
  )
}

export function Kpi({
  label,
  value,
  unit,
  note,
  tone = "cyan",
  variant = "plain",
  surface = "glow",
  delta,
}: {
  label: string
  value: string
  unit?: string
  note?: string
  tone?: Tone
  variant?: "plain" | "accent"
  surface?: "glow" | "glow-mid" | "glow-strong" | "heat" | "gray" | "plain"
  delta?: { direction: "up" | "down"; text: string; tone: Tone }
}) {
  return (
    <article className={`kpi tone-${tone} ${variant} surface-${surface}`}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value}
        {unit && <span className="kpi-unit">{unit}</span>}
      </div>
      {note && <div className="kpi-note">{note}</div>}
      {delta && (
        <div className={`kpi-delta tone-${delta.tone}`}>
          {delta.direction === "up" ? "▲" : "▼"} {delta.text}
        </div>
      )}
    </article>
  )
}

export function BarList({
  items,
  max = 100,
  scale,
}: {
  items: {
    label: string
    hint?: string
    value: number
    display?: string
    tone?: Tone
    marker?: number
  }[]
  max?: number
  scale?: string[]
}) {
  return (
    <div className="bars">
      {scale && (
        <div className="bars-scale">
          {scale.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
      )}
      {items.map((item) => (
        <div className="bar-row" key={item.label}>
          <div className="bar-copy">
            <strong>{item.label}</strong>
            {item.hint && <small>{item.hint}</small>}
          </div>
          <div className="bar-track">
            <div
              className={`bar-fill tone-${item.tone ?? "cyan"}`}
              style={{ width: `${Math.max(0, Math.min(100, (item.value / max) * 100))}%` }}
            />
            {item.marker != null && (
              <i className="bar-marker" style={{ left: `${(item.marker / max) * 100}%` }} />
            )}
          </div>
          <div className="bar-value">{item.display ?? item.value}</div>
        </div>
      ))}
    </div>
  )
}

export function StackedBar({
  segments,
}: {
  segments: { label: string; value: number; display: string; tone: Tone }[]
}) {
  const total = segments.reduce((sum, item) => sum + item.value, 0) || 1
  return (
    <div className="stacked">
      <div className="stacked-legend">
        {segments.map((item) => (
          <span key={item.label}>
            <i className={`swatch tone-${item.tone}`} />
            {item.label}
          </span>
        ))}
      </div>
      <div className="stacked-track">
        {segments.map((item) => (
          <div
            key={item.label}
            className={`stacked-seg tone-${item.tone}`}
            style={{ width: `${(item.value / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="stacked-values">
        {segments.map((item) => (
          <span key={item.label}>{item.display}</span>
        ))}
      </div>
    </div>
  )
}

export function Table({
  columns,
  rows,
}: {
  columns: string[]
  rows: { cells: { text: string; tone?: Tone }[] }[]
}) {
  return (
    <div className="table">
      <div className="table-row head" style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
        {columns.map((column) => (
          <span key={column}>{column}</span>
        ))}
      </div>
      {rows.map((row, index) => (
        <div className="table-row" key={index} style={{ gridTemplateColumns: `repeat(${columns.length}, 1fr)` }}>
          {row.cells.map((cell, cellIndex) => (
            <span key={cellIndex} className={cell.tone ? `tone-${cell.tone}` : undefined}>
              {cell.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  )
}

export function RecordList({
  rows,
}: {
  rows: { title: string; meta?: string; badge: string; tone: Tone }[]
}) {
  return (
    <div className="records">
      {rows.map((row, index) => (
        <div className="record" key={`${row.title}-${index}`}>
          <strong>{row.title}</strong>
          <span>{row.meta}</span>
          <em className={`badge tone-${row.tone}`}>{row.badge}</em>
        </div>
      ))}
    </div>
  )
}

export function SegmentStrip({
  leading,
  segments,
}: {
  leading?: { label: string; value: string; note?: string }
  segments: { label: string; value: string; tone: Tone; weight: number }[]
}) {
  return (
    <div className="strip">
      {leading && (
        <div className="strip-lead">
          <span>{leading.label}</span>
          <strong>{leading.value}</strong>
          {leading.note && <small>{leading.note}</small>}
        </div>
      )}
      <div className="strip-rest">
        <div className="strip-bar">
          {segments.map((item) => (
            <i key={item.label} className={`tone-${item.tone}`} style={{ flex: item.weight }} />
          ))}
        </div>
        <div className="strip-labels">
          {segments.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Facts({ rows }: { rows: { label: string; value: string; tone?: Tone }[] }) {
  return (
    <div className="facts">
      {rows.map((row) => (
        <div key={row.label}>
          <span>{row.label}</span>
          <strong className={row.tone ? `tone-${row.tone}` : undefined}>{row.value}</strong>
        </div>
      ))}
    </div>
  )
}

const icons = {
  nodes: (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="6" />
      <circle cx="32" cy="12" r="4" />
      <circle cx="50" cy="22" r="4" />
      <circle cx="50" cy="42" r="4" />
      <circle cx="32" cy="52" r="4" />
      <circle cx="14" cy="42" r="4" />
      <circle cx="14" cy="22" r="4" />
      <path d="M32 18v8M37 29l10-5M37 35l10 5M32 38v10M27 35l-10 5M27 29l-10-5" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="18" />
      <path d="M22 33l7 7 14-16" />
    </svg>
  ),
  gauge: (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M14 40a18 18 0 1 1 36 0" />
      <path d="M32 40l10-12" />
      <circle cx="32" cy="40" r="3" />
    </svg>
  ),
  globe: (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="32" cy="32" r="18" />
      <ellipse cx="32" cy="32" rx="8" ry="18" />
      <path d="M14 32h36M18 22h28M18 42h28" />
    </svg>
  ),
}

export function Drilldowns({
  items,
}: {
  items: { title: string; action: string; tone: Tone; icon: keyof typeof icons }[]
}) {
  return (
    <div className="drills">
      {items.map((item) => (
        <article className={`drill tone-${item.tone}`} key={item.title}>
          <div className="drill-icon">{icons[item.icon]}</div>
          <h3>{item.title}</h3>
          <p>{item.action}</p>
        </article>
      ))}
    </div>
  )
}
