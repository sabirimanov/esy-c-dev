import { useEffect, useState, type ReactNode } from "react"
import { useUfgAlarms, useUfgHierarchy, useUfgReadiness, useUfgSummary, type UfgAlarm, type UfgCounts } from "../data/ufg"
import { At, Frame, PlaceText } from "../ui/widgets"
import { formatRange } from "../wall/dates"
import { cityById, regionLabel } from "../wall/places"
import type { WallState } from "../wall/state"

function Pin({
  x, y, size, color, children, w, align,
}: {
  x: number
  y: number
  size: number
  color: string
  children: ReactNode
  w?: number
  align?: "left" | "right"
}) {
  return (
    <div
      className="at pin"
      style={{
        left: x,
        top: y,
        width: w,
        fontSize: size,
        color,
        textAlign: align,
        lineHeight: 1.3,
      }}
    >
      {children}
    </div>
  )
}

function slots(count: number) {
  const gap = 18
  const width = Math.floor((1840 - gap * (count - 1)) / count)
  return Array.from({ length: count }, (_, index) => ({ x: 40 + index * (width + gap), w: width }))
}

function Head({ hint, aside }: { hint: string; aside: string }) {
  return (
    <>
      <PlaceText x={36} y={28} size={30} weight={900}>UFG PERFORMANCE & LOSS MONITORING</PlaceText>
      <Pin x={36} y={70} size={16} color="#8d9694">{hint}</Pin>
      <Pin x={1280} y={32} w={600} size={20} color="#ffffff" align="right">{aside}</Pin>
    </>
  )
}

function Kpi({
  x, y = 100, w, label, value, note, glow, labelColor, wide,
}: {
  x: number
  y?: number
  w: number
  label: string
  value: string
  note: string
  glow?: "heat" | "gold" | "faint"
  labelColor: string
  wide?: boolean
}) {
  const tone = glow === "heat" ? " surface-heat" : glow === "gold" ? " surface-gold" : glow === "faint" ? " surface-faint" : ""
  return (
    <At x={x} y={y} w={w} h={148}>
      <div className={`kpi ufg-kpi${tone}${wide ? " is-wide" : ""}`}>
        <div className="kpi-label" style={{ color: labelColor }}>{label}</div>
        <div className="kpi-value">{value}</div>
        <div className="kpi-note">{note}</div>
      </div>
    </At>
  )
}

function Card({ x, y, w, h, foot, children }: { x: number; y: number; w: number; h: number; foot?: boolean; children: ReactNode }) {
  return (
    <At x={x} y={y} w={w} h={h}>
      <div className={foot ? "panel shell dim ufg-card is-foot" : "panel shell dim ufg-card"}>{children}</div>
    </At>
  )
}

function Pills({ title, items }: { title: string; items: { kicker: string; color: string; title: string; note: string }[] }) {
  return (
    <Card x={40} y={802} w={1840} h={198} foot>
      <h2>{title}</h2>
      <div className="ufg-pills">
        {items.map((item) => (
          <div className="ufg-pill" key={item.kicker}>
            <em style={{ color: item.color }}>{item.kicker}</em>
            <b>{item.title}</b>
            <span>{item.note}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function volume(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—"
  const sign = value < 0 ? "-" : ""
  const abs = Math.abs(Math.round(value))
  if (abs < 1000) return sign + abs.toLocaleString("en-US")
  const divisor = abs >= 1_000_000 ? 1_000_000 : 1000
  const suffix = divisor === 1_000_000 ? "M" : "K"
  const scaled = Math.round((abs / divisor) * 10) / 10
  const text = Number.isInteger(scaled) ? String(scaled) : scaled.toFixed(1)
  return sign + text + suffix
}

function scopeTitle(state: WallState, clusterName: string | null) {
  if (!state.regionId) return "National performance"
  return [regionLabel(state.regionId), cityById(state.cityId)?.label, clusterName].filter(Boolean).join(" · ")
}

function Track({ ratio, color }: { ratio: number; color: string }) {
  return (
    <div className="ufg-track">
      <div className="rail">
        <i style={{ width: `${ratio * 100}%`, background: color }} />
      </div>
      <i className="tick" style={{ left: `calc(${ratio * 100}% - 1px)` }} />
    </div>
  )
}

export function UfgScreen2({ state }: { state: WallState }) {
  const cards = slots(5)
  const [current, target, gap, loss, bought] = cards
  const ufg = useUfgSummary(state)
  const hierarchy = useUfgHierarchy()
  const period = formatRange(state.date, state.dateTo)
  const clusterName = hierarchy.clusters.find((cluster) => cluster.cluster_id === state.clusterId)?.name_en ?? null
  const shown = ufg.current == null ? null : Number(ufg.current.toFixed(1))
  const delta = shown == null ? null : Number((shown - 5).toFixed(1))
  const above = delta != null && delta > 0
  const scale = Math.max(shown ?? 0, 5)
  const sold = ufg.loss == null ? null : ufg.supply - ufg.loss
  const lossShare = ufg.supply > 0 && ufg.loss != null ? Math.max(0, Math.min(100, (ufg.loss / ufg.supply) * 100)) : 0
  const high = ufg.extremes?.high
  const gapText = delta == null ? "—" : delta > 0 ? `+${delta.toFixed(1)} pp` : delta < 0 ? `${delta.toFixed(1)} pp` : "0 pp"
  return (
    <Frame mirror>
      <Head hint="What changed / How far from target / How much gas remains unaccounted" aside={scopeTitle(state, clusterName)} />
      <Kpi {...current} label="CURRENT UFG" value={shown == null ? "—" : `${shown.toFixed(1)}%`} note="Selected period" glow={above ? "heat" : undefined} labelColor={above ? "#eb7d5c" : "#34efde"} />
      <Kpi {...target} label="Target UFG" value="5.0%" note="Configured target" labelColor="#34efde" />
      <Kpi {...gap} label="TARGET GAP" value={gapText} note="Current UFG − target" glow={above ? "heat" : undefined} labelColor="#ffffff" />
      <Kpi {...loss} label="GAS LOSS" value={volume(ufg.loss)} note="Purchase − sale · m³" glow={ufg.loss != null && ufg.loss > 0 ? "heat" : undefined} labelColor="#eb7d5c" />
      <Kpi {...bought} label="GAS PURCHASED" value={volume(ufg.current == null ? null : ufg.supply)} note="Selected period · m³" labelColor="#34efde" />
      <Pin x={1240} y={268} w={640} size={15} color="#6e7775" align="right">{period}</Pin>

      <Card x={40} y={324} w={1075} h={460}>
        <h2>UFG vs target</h2>
        <p className="sub">{period} · percentage</p>
        <div className="ufg-metric">
          <div className="ufg-metric-top">
            <span>Actual UFG</span>
            <b style={{ color: above ? "#ef6d6d" : "#34efde" }}>{shown == null ? "—" : `${shown.toFixed(1)}%`}</b>
          </div>
          <Track ratio={shown == null ? 0 : Math.max(0, Math.min(1, shown / scale))} color="linear-gradient(90deg, #c9843a, #f2a65a)" />
        </div>
        <div className="ufg-metric">
          <div className="ufg-metric-top">
            <span>Target UFG</span>
            <b style={{ color: "#34efde" }}>5.0%</b>
          </div>
          <Track ratio={5 / scale} color="linear-gradient(90deg, #1e897f, #5dfff0)" />
        </div>
        <div className="ufg-call">
          <strong style={{ color: above ? "#f2a65a" : "#34efde" }}>{delta == null ? "—" : delta > 0 ? `+${delta.toFixed(1)} pp ABOVE TARGET` : delta < 0 ? `${Math.abs(delta).toFixed(1)} pp BELOW TARGET` : "AT TARGET"}</strong>
          <span>Same current UFG and 5.0% target as the monitoring screen</span>
        </div>
      </Card>

      <Card x={1130} y={324} w={750} h={460}>
        <h2>Gas balance</h2>
        <p className="sub">{period}</p>
        <div className="ufg-metric">
          <div className="ufg-metric-top">
            <span>Purchased volume</span>
            <b>{ufg.current == null ? "—" : `${volume(ufg.supply)} m³`}</b>
          </div>
          <div className="ufg-duo">
            <i className="main" style={{ flex: `${Math.max(0, 100 - lossShare)} 1 0` }} />
            <i className="cap" style={{ width: "auto", flex: lossShare > 0 ? `${lossShare} 1 0` : "0 0 0" }} />
          </div>
        </div>
        <div className="ufg-metric">
          <div className="ufg-split">
            <span>Gas sold</span>
            <b>{sold == null ? "—" : `${volume(sold)} m³`}</b>
          </div>
        </div>
        <div className="ufg-metric">
          <div className="ufg-split">
            <span>Reported gas loss</span>
            <b style={{ color: "#f2a65a" }}>{ufg.loss == null ? "—" : `${volume(ufg.loss)} m³`}</b>
          </div>
        </div>
        <div className="ufg-quiet">
          <div className="ufg-split">
            <span>Purchased − Sold</span>
            <b style={{ color: "#d5ddda", fontWeight: 500 }}>{ufg.loss == null ? "—" : `${volume(ufg.loss)} m³`}</b>
          </div>
          <div style={{ marginTop: 8 }}>Purchase minus sale for the selected period</div>
        </div>
      </Card>

      <Pills
        title="Executive reading"
        items={[
          { kicker: "EFFICIENCY", color: above ? "#f2a65a" : "#34efde", title: delta == null ? "UFG unavailable" : delta > 0 ? "UFG above target" : delta < 0 ? "UFG below target" : "UFG at target", note: delta == null ? "Waiting for the selected period" : `Deviation: ${delta > 0 ? "+" : ""}${delta.toFixed(1)} percentage points` },
          { kicker: "MATERIALITY", color: "#eb7d5c", title: ufg.loss == null ? "Loss unavailable" : `${volume(ufg.loss)} m³ reported`, note: "Purchase − sale · selected period" },
          { kicker: "PRIORITY", color: "#34efde", title: high ? high.name.replace(/\(\d+\)\s*$/, "").trim() : ufg.extremes ? "No cluster at or below 40%" : "No cluster ranking", note: high ? `Highest UFG · ${high.value.toFixed(1)}%` : ufg.extremes ? "Clusters above 40% are left out of the ranking" : "No clusters in the selected period" },
        ]}
      />
    </Frame>
  )
}

function alarmName(source: string, names: Map<string, string>) {
  return (names.get(source) || source).replace(/\(\d+\)\s*$/, "").trim()
}

function AlarmTicker({ rows, names }: { rows: UfgAlarm[]; names: Map<string, string> }) {
  const [offset, setOffset] = useState(0)
  useEffect(() => {
    if (rows.length <= 4) return
    const timer = window.setInterval(() => setOffset((index) => (index + 1) % rows.length), 1000)
    return () => window.clearInterval(timer)
  }, [rows.length])
  const shown = Array.from({ length: Math.min(4, rows.length) }, (_, index) => rows[(offset + index) % rows.length])
  return (
    <>
      {shown.map((row) => (
        <div className="ufg-alarm body" key={row.id}>
          <span>#{row.id}</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{alarmName(row.source, names)}</span>
          <span className="pct">{row.currentValue || "—"}</span>
          <span className="hot">{row.state.toUpperCase()}</span>
        </div>
      ))}
    </>
  )
}

export function UfgScreen8() {
  const cards = slots(4)
  const ticks = ["#eb7d5c", "#f2a65a", "#34efde", "#34efde"]
  const alarms = useUfgAlarms()
  const hierarchy = useUfgHierarchy()
  const names = new Map(hierarchy.clusters.map((cluster) => [cluster.cluster_id, cluster.name_en]))
  const list = alarms ?? []
  const count = (category: string, state?: string) => list.filter((alarm) => alarm.category === category && (!state || alarm.state === state)).length
  const active = list.filter((alarm) => alarm.state === "Active")
  const cleared = list.filter((alarm) => alarm.state === "Cleared").length
  const suppressed = list.filter((alarm) => alarm.state === "Suppressed").length
  const decided = active.length + cleared
  const closure = decided ? (cleared / decided) * 100 : null
  const oldest = active.reduce<number | null>((min, alarm) => {
    const time = Date.parse(alarm.time)
    if (!Number.isFinite(time)) return min
    return min == null || time < min ? time : min
  }, null)
  const age = oldest == null ? null : Math.max(0, Math.floor((Date.now() - oldest) / 86400000))
  const critical = list
    .filter((alarm) => alarm.category === "ufg" && alarm.state === "Active")
    .sort((a, b) => b.id - a.id)
  const ready = alarms != null
  return (
    <Frame mirror>
      <Head hint="Are reported anomalies being examined, and what remains unresolved?" aside="Investigation & execution overview" />
      <Kpi {...cards[0]} label="ACTIVE ALARMS" value={ready ? String(active.length) : "—"} note="Open right now" glow="heat" labelColor="#eb7d5c" wide />
      <Kpi {...cards[1]} label="UFG CASES" value={ready ? String(count("ufg")) : "—"} note={ready ? `${count("ufg", "Active")} active` : "—"} glow="gold" labelColor="#e0a15a" wide />
      <Kpi {...cards[2]} label="INTERFACE" value={ready ? String(count("interface")) : "—"} note="Interface alarms" labelColor="#34efde" wide />
      <Kpi {...cards[3]} label="RECONCILIATION" value={ready ? String(count("reconciliation")) : "—"} note="Reconciliation alarms" glow="faint" labelColor="#ffffff" wide />
      {cards.map((card, index) => (
        <At key={card.x} x={card.x + 8} y={262} w={3} h={16}>
          <div style={{ height: "100%", background: ticks[index], borderRadius: 2 }} />
        </At>
      ))}
      <Pin x={1280} y={260} w={600} size={15} color="#6e7775" align="right">UFG alarms</Pin>

      <Card x={40} y={324} w={1075} h={460}>
        <h2>Critical UFG alarms</h2>
        <p className="sub">{ready ? `${critical.length} active · threshold 6.00%` : "—"}</p>
        <div className="ufg-alarms">
          <div className="ufg-alarm head">
            <span>ALARM</span>
            <span>SOURCE</span>
            <span className="end">NET UFG</span>
            <span className="end">STATUS</span>
          </div>
          <AlarmTicker rows={critical} names={names} />
        </div>
      </Card>

      <Card x={1130} y={324} w={750} h={460}>
        <h2>Investigation workflow</h2>
        <p className="sub">Alarm states from the source system</p>
        <div className="ufg-flow">
          {[
            ["#eb7d5c", "Active", ready ? `${active.length} open` : "—"],
            ["#e0a15a", "Suppressed", ready ? `${suppressed} held` : "—"],
            ["#34efde", "Cleared", ready ? `${cleared} closed` : "—"],
          ].map(([color, title, note]) => (
            <div className="ufg-flow-row" key={title}>
              <i className="ufg-dot" style={{ background: color }} />
              <div>
                <b>{title}</b>
                <span>{note}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Pills
        title="Executive reading"
        items={[
          { kicker: "CURRENT SIGNAL", color: "#eb7d5c", title: ready ? `${active.length} active alarms` : "Alarms unavailable", note: "Open UFG, interface and reconciliation alarms" },
          { kicker: "CASE AGE", color: "#f2a65a", title: age == null ? "No open alarm age" : `${age}-day oldest active alarm`, note: "Age of the earliest alarm still open" },
          { kicker: "EXECUTION", color: "#34efde", title: closure == null ? "Closure unavailable" : `${closure.toFixed(1)}% cleared`, note: ready ? `${cleared} cleared · ${active.length} still active` : "—" },
        ]}
      />
    </Frame>
  )
}

function countLine(counts: UfgCounts) {
  return `${counts.ready} ready · ${counts.qualified} qualified · ${counts.blocked} blocked`
}

function stackParts(counts: UfgCounts) {
  const total = counts.ready + counts.qualified + counts.blocked
  if (!total) return []
  const bands = [
    [counts.ready, "#2ec8bc", "#5dfff0"],
    [counts.qualified, "#d89a52", "#e7b56a"],
    [counts.blocked, "#d47858", "#e7a888"],
  ] as const
  return bands.filter(([count]) => count > 0).map(([count, from, to]) => ({ pct: (count / total) * 100, from, to }))
}

function Stack({ parts }: { parts: { pct: number; from: string; to: string }[] }) {
  if (!parts.length) return <div className="ufg-stack" style={{ background: "#33413f" }} />
  let cursor = 0
  const stops = parts.flatMap((part) => {
    const next = cursor + part.pct
    const pair = [`${part.from} ${cursor}%`, `${part.to} ${next}%`]
    cursor = next
    return pair
  })
  return <div className="ufg-stack" style={{ background: `linear-gradient(90deg, ${stops.join(", ")})` }} />
}

export function UfgScreen9({ state }: { state: WallState }) {
  const cards = slots(4)
  const readiness = useUfgReadiness(state)
  const areas = readiness?.areas
  const clusters = readiness?.clusters
  const snapshot = readiness == null ? "—" : readiness.day ? formatRange(readiness.day, readiness.day) : "No snapshot in the selected period"
  return (
    <Frame mirror>
      <Head hint="How much of the network is ready, qualified, or blocked for trusted UFG reporting" aside="Reconciliation readiness" />
      <Kpi {...cards[0]} label="SERVICE AREAS" value={areas ? String(areas.total) : "—"} note={areas ? countLine(areas) : "—"} labelColor="#34efde" wide />
      <Kpi {...cards[1]} label="CLUSTERS" value={clusters ? String(clusters.total) : "—"} note={clusters ? countLine(clusters) : "—"} labelColor="#34efde" wide />
      <Kpi {...cards[2]} label="BLOCKED CLUSTERS" value={clusters ? String(clusters.blocked) : "—"} note="Require data or reconciliation review" glow="heat" labelColor="#eb7d5c" wide />
      <Kpi {...cards[3]} label="P&T CONFIGURED CLUSTERS" value="3 / 42" note="Source configuration count" glow="gold" labelColor="#f2a65a" wide />
      <Pin x={1280} y={266} w={600} size={15} color="#6e7775" align="right">{snapshot}</Pin>

      <Card x={40} y={324} w={1135} h={460}>
        <h2>Data readiness</h2>
        <p className="sub">{snapshot}</p>
        <div className="ufg-block">
          <div className="ufg-block-head"><b>Service areas</b><span>{areas ? `${areas.total} total` : "—"}</span></div>
          <Stack parts={areas ? stackParts(areas) : []} />
          <div className="ufg-legend">
            <span><i style={{ background: "#34efde" }} />Ready: {areas ? areas.ready : "—"}</span>
            <span><i style={{ background: "#e0a15a" }} />Qualified: {areas ? areas.qualified : "—"}</span>
            <span><i style={{ background: "#e07a55" }} />Blocked: {areas ? areas.blocked : "—"}</span>
          </div>
        </div>
        <div className="ufg-block">
          <div className="ufg-block-head"><b>Clusters</b><span>{clusters ? `${clusters.total} total` : "—"}</span></div>
          <Stack parts={clusters ? stackParts(clusters) : []} />
          <div className="ufg-legend">
            <span><i style={{ background: "#34efde" }} />Ready: {clusters ? clusters.ready : "—"}</span>
            <span><i style={{ background: "#e0a15a" }} />Qualified: {clusters ? clusters.qualified : "—"}</span>
            <span><i style={{ background: "#e07a55" }} />Blocked: {clusters ? clusters.blocked : "—"}</span>
          </div>
        </div>
      </Card>

      <Card x={1195} y={324} w={685} h={460}>
        <h2>Publication workflow</h2>
        <p className="sub">System process · not a user control</p>
        <div className="ufg-steps">
          {[
            ["01", "#34efde", "INGEST", "Input records"],
            ["02", "#34efde", "VALIDATE", "Quality gates"],
            ["03", "#e0a15a", "RECONCILE", "Gross / Net UFG"],
            ["04", "#8b9490", "APPROVE", "Review adjustments"],
            ["05", "#8b9490", "PUBLISH", "Controlled version"],
          ].map(([num, color, title, note]) => (
            <div className="ufg-step" key={num}>
              <i style={{ background: color }} />
              <em className="num">{num}</em>
              <b>{title}</b>
              <span>{note}</span>
            </div>
          ))}
        </div>
      </Card>

      <Pills
        title="Data interpretation rules"
        items={[
          { kicker: "STATUS", color: "#ffffff", title: clusters ? `${clusters.blocked} of ${clusters.total} clusters blocked` : "Cluster status unavailable", note: "Reconciliation remains incomplete" },
          { kicker: "CONTROL", color: "#34efde", title: "Gross UFG ≠ Net UFG", note: "Approved adjustments must be traceable" },
          { kicker: "QUALITY", color: "#f2a65a", title: "3 / 42 P&T configured clusters", note: "Configuration gaps need validation" },
        ]}
      />
    </Frame>
  )
}
