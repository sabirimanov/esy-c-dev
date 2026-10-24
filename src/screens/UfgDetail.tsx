import type { ReactNode } from "react"
import { At, Frame, PlaceText } from "../ui/widgets"

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

export function UfgScreen2() {
  const cards = slots(5)
  const [current, target, gap, loss, bought] = cards
  return (
    <Frame mirror>
      <Head hint="What changed / How far from target / How much gas remains unaccounted" aside="National performance" />
      <Kpi {...current} label="CURRENT UFG" value="9.91%" note="Reported actual" glow="heat" labelColor="#eb7d5c" />
      <Kpi {...target} label="Target UFG" value="5.8%" note="Configured target" labelColor="#34efde" />
      <Kpi {...gap} label="TARGET GAP" value="+4.11 pp" note="Actual minus target" glow="heat" labelColor="#ffffff" />
      <Kpi {...loss} label="GAS LOSS" value="599.6K" note="Reported volume · m³" glow="heat" labelColor="#eb7d5c" />
      <Kpi {...bought} label="GAS PURCHASED" value="6.1M" note="Reported volume · m³" labelColor="#34efde" />
      <Pin x={1240} y={268} w={640} size={15} color="#6e7775" align="right">Portfolio reference · Jan–Aug 2026</Pin>

      <Card x={40} y={324} w={1075} h={460}>
        <h2>UFG vs target</h2>
        <p className="sub">Reference period: Jan–Aug 2026 · percentage</p>
        <div className="ufg-metric">
          <div className="ufg-metric-top">
            <span>Actual UFG</span>
            <b style={{ color: "#ef6d6d" }}>9.91%</b>
          </div>
          <Track ratio={0.82} color="linear-gradient(90deg, #c9843a, #f2a65a)" />
        </div>
        <div className="ufg-metric">
          <div className="ufg-metric-top">
            <span>Target UFG</span>
            <b style={{ color: "#34efde" }}>5.80%</b>
          </div>
          <Track ratio={0.44} color="linear-gradient(90deg, #1e897f, #5dfff0)" />
        </div>
        <div className="ufg-call">
          <strong>+4.11 pp ABOVE TARGET</strong>
          <span>Physical losses remain above the configured national benchmark</span>
        </div>
      </Card>

      <Card x={1130} y={324} w={750} h={460}>
        <h2>Gas balance</h2>
        <p className="sub">Rounded portfolio values</p>
        <div className="ufg-metric">
          <div className="ufg-metric-top">
            <span>Purchased volume</span>
            <b>6.1M m³</b>
          </div>
          <div className="ufg-duo">
            <i className="main" />
            <i className="cap" />
          </div>
        </div>
        <div className="ufg-metric">
          <div className="ufg-split">
            <span>Gas sold</span>
            <b>5.5M m³</b>
          </div>
        </div>
        <div className="ufg-metric">
          <div className="ufg-split">
            <span>Reported gas loss</span>
            <b style={{ color: "#f2a65a" }}>599.6K m³</b>
          </div>
        </div>
        <div className="ufg-quiet">
          <div className="ufg-split">
            <span>Purchased − Sold</span>
            <b style={{ color: "#d5ddda", fontWeight: 500 }}>~0.6M m³</b>
          </div>
          <div style={{ marginTop: 8 }}>Rounded volume figures are illustrative</div>
        </div>
      </Card>

      <Pills
        title="Executive reading"
        items={[
          { kicker: "EFFICIENCY", color: "#f2a65a", title: "UFG above target", note: "Deviation: +4.11 percentage points" },
          { kicker: "MATERIALITY", color: "#eb7d5c", title: "599.6K m³ reported", note: "Use exact source units for calculations" },
          { kicker: "PRIORITY", color: "#34efde", title: "Address highest contributors", note: "Volume and UFG rate need separate ranking" },
        ]}
      />
    </Frame>
  )
}

const alarms = [
  ["#750", "42. 17 mkr IV (Şahana)", "16.35%"],
  ["#749", "41. 17 mkr (Billur)", "16.01%"],
  ["#748", "42. 17 mkr IV (Şahana)", "14.76%"],
  ["#747", "41. 17 mkr (Billur)", "15.07%"],
]

export function UfgScreen8() {
  const cards = slots(4)
  const ticks = ["#eb7d5c", "#f2a65a", "#34efde", "#34efde"]
  return (
    <Frame mirror>
      <Head hint="Are reported anomalies being examined, and what remains unresolved?" aside="Investigation & execution overview" />
      <Kpi {...cards[0]} label="ACTIVE ALARMS" value="165" note="Reported actual" glow="heat" labelColor="#eb7d5c" wide />
      <Kpi {...cards[1]} label="UFG CASES" value="10" note="Configured target" glow="gold" labelColor="#e0a15a" wide />
      <Kpi {...cards[2]} label="SALES CASES" value="7" note="Actual minus target" labelColor="#34efde" wide />
      <Kpi {...cards[3]} label="OTHER / P-T CASES" value="1 / 1" note="Reported volume · m³" glow="faint" labelColor="#ffffff" wide />
      {cards.map((card, index) => (
        <At key={card.x} x={card.x + 8} y={262} w={3} h={16}>
          <div style={{ height: "100%", background: ticks[index], borderRadius: 2 }} />
        </At>
      ))}
      <Pin x={1280} y={260} w={600} size={15} color="#6e7775" align="right">Source UFG workflow snapshots · Oct 2026</Pin>

      <Card x={40} y={324} w={1075} h={460}>
        <h2>Critical UFG alarms</h2>
        <p className="sub">Source examples · alarm threshold shown: 6.00%</p>
        <div className="ufg-alarms">
          <div className="ufg-alarm head">
            <span>ALARM</span>
            <span>SOURCE</span>
            <span className="end">NET UFG</span>
            <span className="end">STATUS</span>
          </div>
          {alarms.map((row) => (
            <div className="ufg-alarm body" key={row[0]}>
              <span>{row[0]}</span>
              <span>{row[1]}</span>
              <span className="pct">{row[2]}</span>
              <span className="hot">ACTIVE</span>
            </div>
          ))}
        </div>
      </Card>

      <Card x={1130} y={324} w={750} h={460}>
        <h2>Investigation workflow</h2>
        <p className="sub">Reference statuses from source system</p>
        <div className="ufg-flow">
          {[
            ["#8b9490", "Draft", "Not yet submitted"],
            ["#5b8def", "In analyst review", "Pending decision"],
            ["#34efde", "Approved amendment", "Recalculation / publish"],
            ["#34efde", "Cleared / archived", "Final audit trail"],
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
          { kicker: "CURRENT SIGNAL", color: "#eb7d5c", title: "165 active alarms", note: "Reported work remains in the system" },
          { kicker: "CASE AGE", color: "#f2a65a", title: "28-day case in sample", note: "Potential investigation backlog indicator" },
          { kicker: "EXECUTION", color: "#34efde", title: "Closure rate not evidenced", note: "Do not invent completed / resolved counts" },
        ]}
      />
    </Frame>
  )
}

function Stack({ parts }: { parts: { pct: number; from: string; to: string }[] }) {
  let cursor = 0
  const stops = parts.flatMap((part) => {
    const next = cursor + part.pct
    const pair = [`${part.from} ${cursor}%`, `${part.to} ${next}%`]
    cursor = next
    return pair
  })
  return <div className="ufg-stack" style={{ background: `linear-gradient(90deg, ${stops.join(", ")})` }} />
}

export function UfgScreen9() {
  const cards = slots(4)
  return (
    <Frame mirror>
      <Head hint="How much of the network is ready, qualified, or blocked for trusted UFG reporting" aside="Reconciliation readiness" />
      <Kpi {...cards[0]} label="SERVICE AREAS" value="7" note="0 ready · 2 qualified · 5 blocked" labelColor="#34efde" wide />
      <Kpi {...cards[1]} label="CLUSTERS" value="39" note="2 ready · 10 qualified · 27 blocked" labelColor="#34efde" wide />
      <Kpi {...cards[2]} label="BLOCKED CLUSTERS" value="27" note="Require data or reconciliation review" glow="heat" labelColor="#eb7d5c" wide />
      <Kpi {...cards[3]} label="P/T CONFIGURED" value="3 / 47" note="Source configuration count" glow="gold" labelColor="#f2a65a" wide />
      <Pin x={1280} y={266} w={600} size={15} color="#6e7775" align="right">Source UFG workflow snapshots · Oct 2026</Pin>

      <Card x={40} y={324} w={1135} h={460}>
        <h2>Data readiness</h2>
        <p className="sub">Status distribution in the reported snapshot</p>
        <div className="ufg-block">
          <div className="ufg-block-head"><b>Service areas</b><span>7 total</span></div>
          <Stack parts={[{ pct: 28.6, from: "#d89a52", to: "#e7b56a" }, { pct: 71.4, from: "#d47858", to: "#e7a888" }]} />
          <div className="ufg-legend">
            <span><i style={{ background: "#34efde" }} />Ready: 0</span>
            <span><i style={{ background: "#e0a15a" }} />Qualified: 2</span>
            <span><i style={{ background: "#e07a55" }} />Blocked: 5</span>
          </div>
        </div>
        <div className="ufg-block">
          <div className="ufg-block-head"><b>Clusters</b><span>39 total</span></div>
          <Stack parts={[{ pct: 5.1, from: "#2ec8bc", to: "#5dfff0" }, { pct: 25.6, from: "#d89a52", to: "#e7b56a" }, { pct: 69.3, from: "#d47858", to: "#e7a888" }]} />
          <div className="ufg-legend">
            <span><i style={{ background: "#34efde" }} />Ready: 2</span>
            <span><i style={{ background: "#e0a15a" }} />Qualified: 10</span>
            <span><i style={{ background: "#e07a55" }} />Blocked: 27</span>
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
          { kicker: "STATUS", color: "#ffffff", title: "27 of 39 clusters blocked", note: "Reconciliation remains incomplete" },
          { kicker: "CONTROL", color: "#34efde", title: "Gross UFG ≠ Net UFG", note: "Approved adjustments must be traceable" },
          { kicker: "QUALITY", color: "#f2a65a", title: "3 / 47 P/T configured", note: "Configuration gaps need validation" },
        ]}
      />
    </Frame>
  )
}
