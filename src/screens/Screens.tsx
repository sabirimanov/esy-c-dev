import type { ReactNode } from "react"
import drillAi from "../assets/drill-ai.png"
import drillReady from "../assets/drill-ready.png"
import drillMaint from "../assets/drill-maint.png"
import drillRisk from "../assets/drill-risk.png"
import weatherBaku from "../assets/weather-baku.png"
import { At, Frame, PlaceText } from "../ui/widgets"
import { mapConfig, mapRegions } from "../wall/mapConfig"
import { periodLabel, shiftMonth, type WallState } from "../wall/state"
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

function UfgChart() {
  const current = [6.59, 6.19, 6.79, 5.99, 6.49, 6.29, 6.69, 6.09, 6.89, 5.89]
  const points = [...current, ...current, ...current]
  const xAt = (index: number) => index * (1111.7 / 29)
  const yAt = (value: number) => (10 - value) * 32.5
  const line = points.map((value, index) => `${index === 0 ? "M" : "L"}${xAt(index).toFixed(1)} ${yAt(value).toFixed(1)}`).join("")
  const previous = Array.from({ length: 30 }, (_, index) => 7.1 + Math.sin((index / 29) * Math.PI * 3) * 0.35)
  const prev = previous.map((value, index) => `${index === 0 ? "M" : "L"}${xAt(index).toFixed(1)} ${yAt(value).toFixed(1)}`).join("")
  return (
    <svg className="at" viewBox="0 0 1150 325" style={{ left: 126, top: 505, width: 1150, height: 325 }}>
      {[0, 1, 2, 3, 4, 5].map((step) => (
        <line key={step} x1="0" x2="1150" y1={step * 65} y2={step * 65} stroke="#343838" strokeWidth="1" />
      ))}
      <path d={prev} fill="none" stroke="#34d9e6" strokeWidth="2.5" strokeDasharray="4 5" />
      <line x1="0" x2="1112" y1={yAt(5.8)} y2={yAt(5.8)} stroke="#34eddc" strokeWidth="2" strokeDasharray="8 6" />
      <path d={line} fill="none" stroke="#f2a65a" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((value, index) => (
        <circle key={index} cx={xAt(index)} cy={yAt(value)} r="3" fill="#f2a65a" />
      ))}
    </svg>
  )
}

function Screen1({ state }: { state: WallState }) {
  const period = periodLabel(state.date)
  const previous = periodLabel(shiftMonth(state.date, -1))
  return (
    <Frame>
      <PlaceText x={37} y={28} size={32} weight={900}>UFG PERFORMANCE & LOSS MONITORING</PlaceText>
      <At x={42} y={98} w={443} h={150}><div className="kpi" /></At>
      <At x={508} y={97} w={451} h={150}><div className="kpi" /></At>
      <At x={974} y={97} w={451} h={150}><div className="kpi surface-glow-strong" /></At>
      <At x={1440} y={97} w={450} h={150}><div className="kpi surface-glow-mid" /></At>
      <Pin x={73} y={108} size={24} weight={500} color="#34efde" lh={40}>Current UFG</Pin>
      <Pin x={73} y={164} size={60} weight={700} color="#ffffff" lh={40}>6.4</Pin>
      <Pin x={162} y={176} size={24} color="#a0aaa8" lh={28}>%</Pin>
      <Pin x={244} y={187} size={16} color="#a0aaa8" lh={19}>−0.7 pp vs previous period</Pin>
      <Pin x={537} y={108} size={24} weight={500} color="#34efde" lh={40}>Target UFG</Pin>
      <Pin x={537} y={164} size={60} weight={700} color="#ffffff" lh={40}>5.8</Pin>
      <Pin x={626} y={176} size={24} color="#a0aaa8" lh={28}>%</Pin>
      <Pin x={694} y={187} size={16} color="#a0aaa8" lh={19}>Configured for selected scope</Pin>
      <Pin x={1001} y={108} size={24} weight={500} color="#34efde" lh={40}>Loss volume</Pin>
      <Pin x={1001} y={164} size={60} weight={700} color="#ffffff" lh={40}>4.8</Pin>
      <Pin x={1100} y={176} size={24} color="#a0aaa8" lh={28}>MCM</Pin>
      <Pin x={1211} y={187} size={16} color="#a0aaa8" lh={19}>Total for selected period</Pin>
      <Pin x={1465} y={108} size={24} weight={500} color="#34efde" lh={40}>Deviation closure rate</Pin>
      <Pin x={1465} y={164} size={60} weight={700} color="#ffffff" lh={40}>90.6</Pin>
      <Pin x={1592} y={176} size={24} color="#a0aaa8" lh={28}>%</Pin>
      <Pin x={1622} y={187} size={16} color="#a0aaa8" lh={19}>Target UFG / Current UFG × 100</Pin>
      <At x={42} y={321} w={1272} h={681}><div className="panel shell dim" /></At>
      <Pin x={69} y={340} size={32} weight={700} color="#ffffff" lh={40}>UFG trend</Pin>
      <Pin x={70} y={385} size={24} color="#757171" lh={40}>Daily values · aligned by day of period</Pin>
      <Pin x={70} y={435} size={24} color="#ffffff" lh={40}>UFG (%)</Pin>
      <At x={1090} y={340} w={195} h={46}><div className="expand-pill">Expand chart</div></At>
      <UfgChart />
      {[
        [70, 479, "10%"],
        [80, 544, "8%"],
        [80, 609, "6%"],
        [80, 675, "4%"],
        [80, 740, "2%"],
        [80, 805, "0%"],
      ].map(([x, y, label]) => (
        <Pin key={label as string} x={x as number} y={y as number} size={24} color="#757171" lh={40}>{label}</Pin>
      ))}
      {[
        [123, "1"], [272, "5"], [458, "10"], [650, "15"], [841, "20"], [1033, "25"], [1225, "30"], [1255, "31"],
      ].map(([x, label]) => (
        <Pin key={label as string} x={x as number} y={845} size={24} color="#757171" lh={40}>{label}</Pin>
      ))}
      <Pin x={607} y={890} size={18} color="#a0aaa8" lh={21}>Day of period</Pin>
      <At x={105} y={957} w={32} h={2}><div style={{ height: 3, background: "#f2a65a", borderRadius: 2 }} /></At>
      <At x={608} y={957} w={32} h={2}><div style={{ height: 2, background: "repeating-linear-gradient(90deg, #34d9e6 0 4px, transparent 4px 9px)" }} /></At>
      <At x={1090} y={957} w={32} h={2}><div style={{ height: 2, background: "repeating-linear-gradient(90deg, #34eddc 0 8px, transparent 8px 14px)" }} /></At>
      <Pin x={149} y={938} size={24} color="#757171" lh={40}>{`${period} · Current`}</Pin>
      <Pin x={658} y={938} size={24} color="#757171" lh={40}>{`${previous} · Previous`}</Pin>
      <Pin x={1138} y={938} size={24} color="#757171" lh={40}>Target · 5.8%</Pin>

      <At x={1338} y={321} w={556} h={681}><div className="panel shell dim" /></At>
      <Pin x={1366} y={340} size={32} weight={700} color="#ffffff" lh={40}>Regional comparison</Pin>
      <Pin x={1366} y={385} size={24} color="#757171" lh={40}>Highest and lowest UFG in selected scope</Pin>
      <Pin x={1366} y={465} size={24} color="#f3f5f4" lh={28}>Ganja · Highest UFG</Pin>
      <Pin x={1779} y={465} size={32} color="#f3f5f4" lh={38}>8.2%</Pin>
      <At x={1366} y={503} w={488} h={22}><div style={{ height: "100%", borderRadius: 27, background: "#33413f" }} /></At>
      <At x={1366} y={503} w={400} h={22}><div style={{ height: "100%", borderRadius: 27, background: "linear-gradient(to right, #8c6034, #f2a65a)" }} /></At>
      <At x={1764} y={499} w={2} h={30}><div style={{ height: "100%", background: "#f3f5f4" }} /></At>
      <Pin x={1366} y={533} size={18} color="#76817f" lh={21}>Same period · Region level</Pin>
      <Pin x={1366} y={588} size={24} color="#f3f5f4" lh={28}>Baku · Lowest UFG</Pin>
      <Pin x={1779} y={591} size={32} color="#f3f5f4" lh={38}>4.3%</Pin>
      <At x={1366} y={629} w={488} h={22}><div style={{ height: "100%", borderRadius: 27, background: "#33413f" }} /></At>
      <At x={1366} y={629} w={214} h={22}><div style={{ height: "100%", borderRadius: 27, background: "linear-gradient(to right, #1e897f, #34efde)" }} /></At>
      <At x={1578} y={625} w={2} h={30}><div style={{ height: "100%", background: "#f3f5f4" }} /></At>
      <Pin x={1366} y={659} size={18} color="#76817f" lh={21}>Same period · Region level</Pin>
      <At x={1366} y={701} w={488} h={1}><div style={{ height: 1, background: "#343838" }} /></At>
      <Pin x={1366} y={727} size={18} color="#76817f" lh={21}>White marker: target UFG · 5.8%</Pin>
      <Pin x={1366} y={766} size={18} color="#a0aaa8" lh={21}>Revenue impact</Pin>
      <Pin x={1366} y={791} size={42} color="#f3f5f4" lh={49}>2.6</Pin>
      <Pin x={1429} y={808} size={24} color="#a0aaa8" lh={28}>M AZN</Pin>
      <Pin x={1366} y={847} size={18} color="#a0aaa8" lh={21}>Selected period · Billing</Pin>
      <At x={1360} y={901} w={512} h={48}>
        <div style={{ height: "100%", borderRadius: 20, background: "linear-gradient(135deg, #2a2a2a, #1c1c1c)", border: "1px solid #282b2a" }} />
      </At>
      <Pin x={1382} y={912} size={24} color="#f2a65a" lh={28}>UFG 0.6 pp above target</Pin>
    </Frame>
  )
}

function Screen2() {
  const rows = [
    { title: "Residential meter compliance", hint: "Residential G4 / G6", y: 442, bar: 460, fill: 903, value: "98.0%" },
    { title: "Non-residential meter compliance", hint: "Commercial and industrial meters", y: 519, bar: 537, fill: 889, value: "96.5%" },
    { title: "Balance meter compliance", hint: "Balance meters and EVC", y: 596, bar: 614, fill: 912, value: "99.0%" },
    { title: "Pressure sensor compliance", hint: "Pressure sensors", y: 673, bar: 691, fill: 894, value: "97.0%" },
  ]
  return (
    <Frame>
      <Pin x={37} y={28} size={32} weight={900} color="#34efde" lh={40}>CALIBRATION STATUS</Pin>
      <At x={43} y={97} w={427} h={150}><div className="kpi" /></At>
      <At x={505} y={97} w={426} h={150}><div className="kpi" /></At>
      <At x={966} y={97} w={427} h={150}><div className="kpi" /></At>
      <At x={1428} y={97} w={426} h={150}><div className="kpi" /></At>
      <Pin x={65} y={108} size={24} weight={500} color="#34efde" lh={40}>Calibration compliance</Pin>
      <Pin x={65} y={169} size={60} weight={700} color="#ffffff" lh={40}>97.9%</Pin>
      <Pin x={262} y={187} size={16} color="#a0aaa8" lh={19}>Meters, EVC and sensors</Pin>
      <Pin x={530} y={108} size={24} weight={500} color="#34efde" lh={40}>Overdue assets</Pin>
      <Pin x={530} y={169} size={60} weight={700} color="#ffffff" lh={40}>505</Pin>
      <Pin x={727} y={187} size={16} color="#a0aaa8" lh={19}>Selected scope · as of date</Pin>
      <Pin x={995} y={108} size={24} weight={500} color="#34efde" lh={40}>Long pending assets</Pin>
      <Pin x={995} y={169} size={60} weight={700} color="#ffffff" lh={40}>120</Pin>
      <Pin x={1192} y={187} size={16} color="#a0aaa8" lh={19}>Selected scope · as of date</Pin>
      <Pin x={1460} y={108} size={24} weight={500} color="#34efde" lh={40}>Total assets</Pin>
      <Pin x={1456} y={169} size={60} weight={700} color="#ffffff" lh={40}>23,500</Pin>
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
  return (
    <StripCards cards={[
      { label: "CURRENT DEMAND", value: "74.8 MCM", down: true, amount: "10%" },
      { label: "UFG", value: "6.4%", down: true, amount: "10%" },
      { label: "CUSTOMERS AFFECTED", value: "12,450", down: true, amount: "10%" },
      { label: "REVENUE COLLECTION", value: "91.3%", down: true, amount: "10%" },
    ]} />
  )
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
  const { state } = useWall()
  const region = state.regionSet ? state.regionId : mapConfig.regionId
  const regionLabel = mapRegions.find((item) => item.id === region)?.label ?? "Вся карта"
  const ox = 20
  const oy = 330
  const weeks = [
    [null, null, null, 1, 2, 3, 4],
    [5, 6, 7, 8, 9, 10, 11],
    [12, 13, 14, 15, 16, 17, 18],
    [19, 20, 21, 22, 23, 24, 25],
    [26, 27, 28, 29, 30, 31, null],
  ]
  const fields = [
    { kicker: "REPUBLIC", y: 144, value: "Azerbaijan" },
    { kicker: "CITY", y: 338, value: "All Cities" },
    { kicker: "CLUSTER", y: 435, value: "All Clusters" },
  ]
  const filters = [
    ["Republic", "Azerbaijan"],
    ["Region", regionLabel],
    ["City", "All Cities"],
    ["Cluster", "All Clusters"],
    ["Date Range", "12–23 Oct 2026"],
  ]
  const calX = 576
  const calW = 604
  const colW = calW / 7
  const active = "linear-gradient(90deg, #4af3e6 0%, #2ed8cb 48%, #1eb5a8 100%)"
  const chipW = 165
  const chipH = 48
  const chipGap = 14
  const chips = [
    ["Today", "Last 7 Days", "Last 30 Days"],
    ["Last Month", "This Year", "This Month"],
  ]
  return (
    <StripCards cards={[
      { label: "NETWORK HEALTH", value: "98.7%", down: false, amount: "0.2%" },
      { label: "ACTIVE INCIDENTS", value: "6", down: true, amount: "10%" },
      { label: "ACTIVE LEAKS", value: "18", down: true, amount: "10%" },
      { label: "ACTIVE CREWS", value: "12", down: false, amount: "2%" },
    ]}>
      <At x={ox} y={oy} w={1880} h={685}>
        <div style={{ width: "100%", height: "100%", borderRadius: 42, background: "linear-gradient(115deg, #12383a 0%, #0d2426 48%, #0a1819 100%)" }} />
      </At>
      <Pin x={ox + 78} y={oy + 36} size={20} weight={700} color="#2de0d2" lh={24}>LOCATION</Pin>
      <Pin x={ox + 78} y={oy + 74} size={16} color="#7a8a8b" lh={20}>Select geographic coverage</Pin>
      {fields.map((field) => (
        <At key={field.kicker} x={ox + 78} y={oy + field.y} w={420} h={80}>
          <div style={{ height: "100%", borderRadius: 40, background: "#0c1b1c", position: "relative" }}>
            <div style={{ position: "absolute", left: 28, top: 14, fontSize: 13, letterSpacing: 1.4, color: "#798586" }}>{field.kicker}</div>
            <div style={{ position: "absolute", left: 28, top: 36, fontSize: 26, color: "#f2f6f5" }}>{field.value}</div>
            <div style={{ position: "absolute", right: 28, top: 30, color: "#9aabb0", fontSize: 16, pointerEvents: "none" }}>⌄</div>
          </div>
        </At>
      ))}
      <At x={ox + 78} y={oy + 241} w={420} h={80}>
        <div style={{ height: "100%", borderRadius: 40, background: "#0c1b1c", position: "relative" }}>
          <div style={{ position: "absolute", left: 28, top: 14, fontSize: 13, letterSpacing: 1.4, color: "#798586" }}>REGION</div>
          <select
            className="region-select"
            value={region ?? ""}
            onChange={(event) => window.setRegion(event.target.value || null)}
          >
            <option value="">Вся карта</option>
            {mapRegions.map((item) => (
              <option key={item.id} value={item.id} disabled={!item.enabled}>{item.label}</option>
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
      <Pin x={ox + calX} y={oy + 196} w={36} size={28} color="#8fa0a0" lh={32} align="center">‹</Pin>
      <Pin x={ox + calX + 36} y={oy + 196} w={calW - 72} size={28} weight={700} color="#f3f6f5" lh={34} align="center">October 2026</Pin>
      <Pin x={ox + calX + calW - 36} y={oy + 196} w={36} size={28} color="#8fa0a0" lh={32} align="center">›</Pin>
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, index) => (
        <Pin key={day} x={ox + calX + index * colW} y={oy + 252} w={colW} size={16} color="#8b9c9c" lh={20} align="center">{day}</Pin>
      ))}
      <At x={ox + calX} y={oy + 449} w={calW} h={40}>
        <div style={{ height: "100%", borderRadius: 20, background: "#165654" }} />
      </At>
      <At x={ox + calX} y={oy + 521} w={colW * 4 + (colW + 54) / 2} h={40}>
        <div style={{ height: "100%", borderRadius: 20, background: "#165654" }} />
      </At>
      {weeks.map((week, row) => week.map((day, column) => day != null && (
        <span key={`${row}-${day}`}>
          {(day === 12 || day === 23) ? (
            <At x={ox + calX + column * colW + (colW - 54) / 2} y={oy + 298 + row * 72} w={54} h={54}>
              <div style={{ width: 54, height: 54, borderRadius: 27, background: "#34efde", color: "#07302c", fontSize: 20, fontWeight: 700, lineHeight: "54px", textAlign: "center" }}>{day}</div>
            </At>
          ) : (
            <Pin x={ox + calX + column * colW} y={oy + 312 + row * 72} w={colW} size={20} color="#e7f0ee" lh={26} align="center">{day}</Pin>
          )}
        </span>
      )))}

      <At x={ox + 536} y={oy + 117} w={1} h={518}><div style={{ width: 1, height: "100%", background: "#343b3c" }} /></At>
      <At x={ox + 1260} y={oy + 117} w={1} h={518}><div style={{ width: 1, height: "100%", background: "#343b3c" }} /></At>

      <Pin x={ox + 1296} y={oy + 36} size={20} weight={700} color="#2de0d2" lh={24}>QUICK SELECT</Pin>
      <Pin x={ox + 1296} y={oy + 74} size={16} color="#7a8a8b" lh={20}>Common time periods</Pin>
      {chips.map((row, rowIndex) => row.map((label, column) => (
        <At key={label} x={ox + 1296 + column * (chipW + chipGap)} y={oy + 118 + rowIndex * (chipH + 12)} w={chipW} h={chipH}>
          <div style={{
            height: "100%",
            borderRadius: chipH / 2,
            background: label === "Last 30 Days" ? active : "#0c1b1c",
            color: label === "Last 30 Days" ? "#07302c" : "#d5e0de",
            fontSize: 16,
            fontWeight: label === "Last 30 Days" ? 600 : 500,
            lineHeight: `${chipH}px`,
            textAlign: "center",
          }}>{label}</div>
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
        <div style={{ height: "100%", borderRadius: 32, background: "#102628", color: "#d5e0de", fontSize: 20, lineHeight: "64px", textAlign: "center" }}>Reset</div>
      </At>
      <At x={ox + 1496} y={oy + 518} w={318} h={64}>
        <div style={{ height: "100%", borderRadius: 32, background: active, color: "#07302c", fontSize: 22, fontWeight: 700, lineHeight: "64px", textAlign: "center" }}>Apply Filters</div>
      </At>
    </StripCards>
  )
}

function Screen6() {
  const cards: { x: number; surface: "glow" | "heat"; label: string; lx: number; value: string; vx: number; vy: number; color: string; weight: number }[] = [
    { x: 42, surface: "glow", label: "Camera Incidents Today", lx: 68, value: "42", vx: 68, vy: 162, color: "#34efde", weight: 500 },
    { x: 354, surface: "heat", label: "Critical Vision Alerts", lx: 387, value: "6", vx: 387, vy: 166, color: "#eb7d5c", weight: 400 },
    { x: 662, surface: "glow", label: "Verified Incidents", lx: 695, value: "31", vx: 695, vy: 165, color: "#34efde", weight: 500 },
    { x: 971, surface: "heat", label: "False Positive Rate", lx: 992, value: "8.4%", vx: 992, vy: 165, color: "#eb7d5c", weight: 400 },
    { x: 1280, surface: "glow", label: "Camera Availability", lx: 1303, value: "96.8%", vx: 1303, vy: 165, color: "#34efde", weight: 500 },
    { x: 1588, surface: "glow", label: "Avg Verification Time", lx: 1613, value: "3.2 min", vx: 1613, vy: 165, color: "#34efde", weight: 500 },
  ]
  const queue = [
    { y: 419, badgeY: 404, title: "Fire / Smoke Detection", meta: "QPS-04 Baku", badge: "Critical" },
    { y: 494, badgeY: 481, title: "Excavation Near Pipeline", meta: "Absheron Corridor", badge: "High" },
    { y: 570, badgeY: 555, title: "Unauthorized Access", meta: "DRS Ganja", badge: "High" },
    { y: 647, badgeY: 631, title: "Fire / Smoke Detection", meta: "QPS-04 Baku", badge: "Critical" },
  ]
  const breakdown = [
    { label: "Unauthorized Access", y: 355, fill: 74, value: "12" },
    { label: "Fire / Smoke Detection", y: 412, fill: 575, value: "6" },
    { label: "Leak Area Activity", y: 470, fill: 309, value: "5" },
    { label: "Excavation Near Pipeline", y: 526, fill: 443, value: "8" },
    { label: "Equipment Tampering", y: 584, fill: 319, value: "7" },
    { label: "PPE / Safety Violation", y: 640, fill: 177, value: "4" },
  ]
  const pills = [
    { x: 401, w: 276, fill: "linear-gradient(to right, #1e897f, #34efde)", label: "Online Cameras", value: "1,243", lx: 403 },
    { x: 686, w: 276, fill: "linear-gradient(to right, #f8bd58, #926f34)", label: "Maintenance Due", value: "24", lx: 687 },
    { x: 971, w: 275, fill: "linear-gradient(to right, #f8bd58, #926f34)", label: "Low Signal", value: "18", lx: 971 },
    { x: 1256, w: 276, fill: "linear-gradient(to right, #854734, #eb7d5c)", label: "Obstructed View", value: "12", lx: 1254 },
    { x: 1541, w: 276, fill: "linear-gradient(to right, #854734, #eb7d5c)", label: "Offline Cameras", value: "41", lx: 1541 },
  ]
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
      <Pin x={82} y={885} size={70} weight={400} color="#ffffff" lh={85}>1,284</Pin>
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
  const kpis: { x: number; heat?: boolean; label: string; lx: number; ly?: number; value: string; vx: number; color: string; weight: number }[] = [
    { x: 31, heat: true, label: "High Priority Risks", lx: 58, value: "14", vx: 56, color: "#eb7d5c", weight: 400 },
    { x: 346, label: "Predicted Leak Risk Zones", lx: 352, value: "12", vx: 367, color: "#34efde", weight: 500 },
    { x: 657, label: "Asset Failure Prediction", lx: 678, value: "42", vx: 677, color: "#34efde", weight: 500 },
    { x: 969, label: "Theft Probability Cases", lx: 992, value: "7", vx: 992, color: "#34efde", weight: 500 },
    { x: 1280, heat: true, label: "Peak Demand Risk", lx: 1318, value: "Medium", vx: 1318, color: "#eb7d5c", weight: 400 },
    { x: 1591, heat: true, label: "Battery EOL Projections", lx: 1614, value: "417", vx: 1614, color: "#eb7d5c", weight: 400 },
  ]
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
      <Pin x={74} y={986} size={60} color="#ffffff" lh={40}>126</Pin>
      <Pin x={324} y={931} size={24} color="#ffffff" lh={40}>Critical Tamper Cases</Pin>
      <Pin x={325} y={986} size={32} color="#f3f5f4" lh={38}>14</Pin>
      <Pin x={657} y={931} size={24} color="#ffffff" lh={40}>Verified Tamper Cases</Pin>
      <Pin x={658} y={986} size={32} color="#f3f5f4" lh={38}>42</Pin>
      <Pin x={997} y={931} size={24} color="#ffffff" lh={40}>False Positive Rate</Pin>
      <Pin x={998} y={986} size={32} color="#f3f5f4" lh={38}>8.4%</Pin>
      <Pin x={1299} y={931} size={24} color="#ffffff" lh={40}>Revenue Risk</Pin>
      <Pin x={1299} y={986} size={32} color="#f3f5f4" lh={38}>680K AZN</Pin>
      <Pin x={1543} y={931} size={24} color="#ffffff" lh={40}>Field Verification Pending</Pin>
      <Pin x={1543} y={986} size={32} color="#f3f5f4" lh={38}>18</Pin>
    </Frame>
  )
}

function DemandChart() {
  const actual: [number, number][] = [
    [1.5, 22], [103.5, 91], [206.5, 93], [308.5, 170], [406.5, 262], [513.5, 277], [616.5, 277], [718.5, 279.5],
  ]
  const line = actual.map(([x, y], index) => `${index ? "L" : "M"}${x} ${y}`).join("")
  const forecast = "M0 39.5 L12 55.6 L24 74.5 L36 87.0 L48 98.5 L60 107.5 L72 114.5 L84 118.7 L96 120.0 L108 118.9 L120 115.0 L132 111.5 L144 108.0 L156 105.0 L168 102.2 L180 100.2 L192 99.0 L204 99.5 L216 103.5 L228 111.8 L240 120.8 L252 129.8 L264 138.8 L276 149.0 L288 158.5 L300 168.5 L312 178.6 L324 188.9 L336 201.5 L348 213.3 L360 226.5 L372 236.5 L384 247.5 L396 256.5 L408 263.5 L420 265.8 L432 267.8 L444 269.5 L456 272.0 L468 274.5 L480 276.8 L492 279.2 L504 280.6 L516 281.5 L528 281.5 L540 281.5 L552 281.5 L564 281.5 L576 281.5 L588 281.5 L600 281.5 L612 281.5 L624 281.5 L636 281.5 L648 281.5 L660 281.5 L672 281.5 L684 281.5 L696 281.5 L708 281.6 L720 282.5 L732 281.5 L744 281.5 L756 281.0 L768 281.0 L780 281.0 L792 280.0 L804 278.9 L816 277.4 L828 276.0 L840 273.0 L852 269.5 L864 265.0 L876 260.2 L888 255.4 L900 250.5 L912 243.5 L924 237.5 L936 230.5 L948 223.5 L960 216.5 L972 207.5 L984 200.5 L996 191.9 L1008 182.1 L1020 171.5 L1032 162.0 L1044 151.5 L1056 140.0 L1068 128.0 L1080 116.5 L1092 104.0 L1104 90.0 L1116 76.0 L1128 64.5"
  return (
    <svg className="at" viewBox="0 0 1130 368" style={{ left: 140, top: 500, width: 1130, height: 368 }}>
      {[0, 123, 244, 367].map((y) => (
        <line key={y} x1="1" x2="1129" y1={y} y2={y} stroke="#343838" strokeWidth="1" />
      ))}
      <path d={forecast} fill="none" stroke="#f2a65a" strokeWidth="3" strokeDasharray="8 7" />
      <path d={line} fill="none" stroke="#34ddcc" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {actual.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4" fill="#34ddcc" />
      ))}
    </svg>
  )
}

function Screen8() {
  const months = [
    [126, 30, "Jan"], [229, 30, "Feb"], [330, 32, "Mar"], [435, 28, "Apr"], [534, 34, "May"], [639, 30, "Jun"],
    [744, 25, "Jul"], [842, 32, "Aug"], [946, 31, "Sep"], [1049, 28, "Oct"], [1150, 32, "Nov"], [1253, 31, "Dec"],
  ] as const
  return (
    <Frame>
      <Pin x={37} y={28} size={32} weight={900} color="#34efde" lh={40}>GAS DEMAND & FLOW</Pin>
      <At x={34} y={97} w={910} h={165}><div className="kpi" /></At>
      <At x={959} y={97} w={910} h={165}><div className="kpi" /></At>
      <Pin x={64} y={101} size={24} weight={500} color="#34efde" lh={40}>Gas demand · Actual</Pin>
      <Pin x={64} y={159} size={60} weight={400} color="#ffffff" lh={40}>6.1M</Pin>
      <Pin x={246} y={165} size={24} color="#a0aaa8" lh={28}>MCM</Pin>
      <Pin x={64} y={220} size={18} color="#ffffff" lh={21}>Total for selected period</Pin>
      <Pin x={994} y={101} size={24} weight={500} color="#34efde" lh={40}>Demand forecast</Pin>
      <Pin x={994} y={159} size={60} weight={400} color="#ffffff" lh={40}>5.7M</Pin>
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
      <DemandChart />
      <At x={73} y={966} w={32} h={4}><div style={{ height: 3.5, background: "#34eddc", borderRadius: 2 }} /></At>
      <Pin x={119} y={948} size={24} color="#757171" lh={40}>Actual gas demand</Pin>
      <Pin x={491} y={948} size={24} color="#ffffff" lh={40}>Actual − forecast: −3.6 MCM (−4.6%)</Pin>
      <At x={1050} y={966} w={32} h={4}>
        <div style={{ height: 3, background: "repeating-linear-gradient(90deg, #f2a65a 0 7px, transparent 7px 13px)" }} />
      </At>
      <Pin x={1100} y={948} size={24} color="#757171" lh={40}>Demand forecast</Pin>

      <Pin x={1366} y={339} size={32} weight={700} color="#ffffff" lh={40}>Demand drivers</Pin>
      <Pin x={1366} y={389} size={24} color="#757171" lh={40}>Jan–Aug 2026 against the</Pin>
      <Pin x={1366} y={429} size={24} color="#757171" lh={40}>same months a year earlier</Pin>
      <Pin x={1366} y={523} size={24} color="#f3f5f4" lh={28}>Weather impact</Pin>
      <Pin x={1759} y={513} w={87} size={32} color="#f3f5f4" lh={38} align="right">−0.6%</Pin>
      <Pin x={1366} y={564} size={18} color="#76817f" lh={21}>Weather Underground → heating degree-days</Pin>
      <At x={1366} y={606} w={480} h={1}><div style={{ height: 1, background: "#343838" }} /></At>
      <Pin x={1366} y={629} size={24} color="#f3f5f4" lh={28}>Consumer growth impact</Pin>
      <Pin x={1759} y={619} w={87} size={32} color="#f3f5f4" lh={38} align="right">+4.5%</Pin>
      <Pin x={1366} y={671} size={18} color="#76817f" lh={21}>More customers × last year’s gas per customer</Pin>
      <At x={1360} y={710} w={512} h={186}>
        <div style={{ height: "100%", borderRadius: 20, background: "#232323", border: "1px solid #282b2a" }} />
      </At>
      <Pin x={1382} y={729} size={18} color="#76817f" lh={21}>Included within consumer growth</Pin>
      <Pin x={1382} y={765} size={24} color="#f3f5f4" lh={28}>Industrial growth impact</Pin>
      <Pin x={1784} y={759} w={62} size={23} color="#f3f5f4" lh={27} align="right">+1.2%</Pin>
      <At x={1382} y={806} w={464} h={1}><div style={{ height: 1, background: "#343838" }} /></At>
      <Pin x={1382} y={827} size={24} color="#f3f5f4" lh={28}>Commercial growth impact</Pin>
      <Pin x={1784} y={821} w={62} size={23} color="#f3f5f4" lh={27} align="right">+0.8%</Pin>
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

function RailDonut() {
  const radius = 95.8
  const turn = 2 * Math.PI * radius
  const dash = turn * 0.986
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
  const steps = [
    { x: 120, label: "Detected", lx: 87, lw: 96, time: "14:21", tx: 95, color: "#f2765b", to: "#8c4435" },
    { x: 660, label: "Dispatched", lx: 614.5, lw: 121, time: "14:28", tx: 635, color: "#ffb32c", to: "#996b1a" },
    { x: 1200, label: "Crew On Site", lx: 1146.5, lw: 137, time: "14:44", tx: 1175, color: "#35e5d7", to: "#1d7f77" },
    { x: 1740, label: "Resolved", lx: 1706, lw: 98, time: "15:30", tx: 1715, color: "#a9f45b", to: "#628e35" },
  ]
  return (
    <Frame>
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
      <Pin x={690} y={219} size={24} color="#34eddc" lh={28}>248/252</Pin>
      <Pin x={716} y={264} size={24} color="#34eddc" lh={28}>98.4%</Pin>
      <Pin x={716} y={309} size={24} color="#34eddc" lh={28}>97.8%</Pin>
      <Pin x={767} y={354} size={24} color="#eb7d5c" lh={28}>4</Pin>
      <Pin x={767} y={399} size={24} color="#eb7d5c" lh={28}>2</Pin>
      <Track x={338} y={222} track={322} fill={299} />
      <Track x={338} y={267} track={322} fill={299} />
      <Track x={338} y={312} track={322} fill={299} />
      <Track x={338} y={357} track={322} fill={32} heat />
      <Track x={338} y={402} track={322} fill={32} heat />
      <RailDonut />
      <Pin x={1021} y={300} w={140} size={50} color="#dff9f7" lh={40} align="center">98.6%</Pin>
      {[
        [1294, 219, "Corrective", 1685, "98.4%", 222],
        [1294, 306, "Overdue", 1685, "99.2%", 309],
        [1294, 393, "Repair", 1685, "98.6%", 396],
      ].map(([lx, ly, label, vx, value, bar]) => (
        <span key={label as string}>
          <Pin x={lx as number} y={ly as number} size={24} color="#8fa7a4" lh={28}>{label}</Pin>
          <Pin x={vx as number} y={ly as number} size={24} color="#34eddc" lh={28}>{value}</Pin>
          <Track x={1419} y={bar as number} track={247} fill={230} />
        </span>
      ))}
      <At x={922} y={119} w={2} h={318}><div style={{ height: "100%", background: "#293333" }} /></At>

      <Pin x={87} y={510} size={32} weight={900} color="#34efde" lh={40}>BILLING & EMERGENCY</Pin>
      {[
        [87, "Billing Sync", "99.7%", "#34eddc"],
        [552, "Open CRM", "1,284", "#e8f4f2"],
        [1017, "New Cases", "187", "#e8f4f2"],
        [1482, "Escalated", "18", "#eb7d5c"],
      ].map(([x, label, value, color]) => (
        <span key={label as string}>
          <Pin x={x as number} y={584} size={32} color="#8fa7a4" lh={38}>{label}</Pin>
          <Pin x={x as number} y={637} size={60} color={color as string} lh={70}>{value}</Pin>
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
  const cards = [
    { x: 29, w: 295, label: "Service Level", lx: 54, value: "84.9%", vx: 54 },
    { x: 339, w: 295, label: "Affected Customers", lx: 363, value: "20,853", vx: 361 },
    { x: 649, w: 290, label: "Emergency Complaints", lx: 669, value: "1,924", vx: 674 },
    { x: 954, w: 294, label: "FCR", lx: 977, value: "77.3%", vx: 977 },
    { x: 1263, w: 296, label: "Calls Answered", lx: 1303, value: "283.3K", vx: 1299 },
    { x: 1574, w: 295, label: "Queue Length", lx: 1602, value: "0.56", vx: 1602 },
  ]
  const bars = [
    { y: 298, label: "High consumption (spike)", value: "13,759", vx: 1737, fillW: 195, fill: "linear-gradient(to right, #80493c, #e6846b)" },
    { y: 331, label: "Low consumption", value: "42,053", vx: 1737, fillW: 593, fill: "linear-gradient(to right, #1e897f, #34efde)" },
    { y: 364, label: "Zero consumption", value: "57,436", vx: 1737, fillW: 816, fill: "linear-gradient(to right, #1e897f, #34efde)" },
    { y: 397, label: "Repeat calls", value: "11,879", vx: 1737, fillW: 168, fill: "linear-gradient(to right, #926f34, #f8bd58)" },
    { y: 430, label: "Reopened issues", value: "8,818", vx: 1751, fillW: 125, fill: "linear-gradient(to right, #80493c, #e6846b)" },
  ]
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
  const regions: [number, number, string][] = [
    [815, 615, "Ağsu"],
    [738, 639, "BRQİİ / BRQSD"],
    [806, 663, "Gəncə"],
    [783, 687, "Lənkəran"],
    [789, 712, "Qarabağ"],
    [804, 735, "Salyan"],
    [801, 760, "Şəmkir"],
    [781, 784, "Sumqayıt"],
    [808, 809, "Tərtər"],
    [791, 833, "Xaçmaz"],
    [786, 857, "Zaqatala"],
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
  const share: [number, number, string][] = [
    [65, 28, "linear-gradient(to bottom, #eb7e5d, #854735)"],
    [96, 138, "linear-gradient(to right, #187a72, #2ce0d2)"],
    [237, 75, "linear-gradient(to right, #98994d, #feff80)"],
    [315, 169, "linear-gradient(to right, #6b943b, #b4fa63)"],
    [487, 135, "linear-gradient(to right, #926f34, #f8bd58)"],
  ]
  const shareRows: [number, string, string, string][] = [
    [682, "#eb7e5d", "No supply", "5.5%"],
    [720, "#2ce0d2", "Gas leak", "25.2%"],
    [758, "#feff80", "Pressure", "13.9%"],
    [796, "#b4fa63", "Meter", "30.9%"],
    [834, "#f8bd58", "Other", "24.6%"],
  ]
  const sla = [
    { x: 335, fill: "linear-gradient(to right, #854735, #eb7e5d)", label: "Open CRM cases", value: "12,931" },
    { x: 641, fill: "linear-gradient(to right, #187a72, #2ce0d2)", label: "New cases", value: "92,498" },
    { x: 947, fill: "linear-gradient(to right, #187a72, #2ce0d2)", label: "Resolved cases", value: "79,567" },
    { x: 1253, fill: "linear-gradient(to right, #6b943b, #b4fa63)", label: "Escalated (serious)", value: "1,924" },
    { x: 1559, fill: "linear-gradient(to right, #6b943b, #b4fa63)", label: "Repeat complaints", value: "8,818" },
  ]
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
      <Pin x={54} y={364} size={70} weight={400} color="#ffffff" lh={85}>113.2K</Pin>
      {bars.map((bar) => (
        <span key={bar.label}>
          <Pin x={565} y={bar.y} size={24} weight={400} color="#dce3e3" lh={28}>{bar.label}</Pin>
          <Pin x={bar.vx} y={bar.y} size={24} weight={400} color="#e8ecec" lh={28}>{bar.value}</Pin>
          <At x={900} y={bar.y + 6} w={800} h={16}><div style={{ height: "100%", borderRadius: 33, background: "#303c3a" }} /></At>
          <At x={884} y={bar.y + 6} w={bar.fillW} h={16}><div style={{ height: "100%", borderRadius: 38, background: bar.fill }} /></At>
        </span>
      ))}
      <At x={29} y={479} w={633} h={422}><div className="panel shell dim" /></At>
      <At x={678} y={479} w={1191} h={422}><div className="panel shell dim" /></At>
      <Pin x={65} y={517} size={26} weight={700} color="#f1f4f4" lh={30}>COMPLAINT CATEGORY</Pin>
      <Pin x={65} y={555} size={20} weight={400} color="#a4adad" lh={23}>Share of accident calls by issue</Pin>
      {share.map((part) => (
        <At key={part[0]} x={part[0]} y={627} w={part[1]} h={36}>
          <div style={{ height: "100%", borderRadius: 2, background: part[2] }} />
        </At>
      ))}
      {shareRows.map((row) => (
        <span key={row[2]}>
          <At x={70} y={row[0] + 4} w={14} h={14}><div style={{ height: "100%", borderRadius: 3, background: row[1] }} /></At>
          <Pin x={98} y={row[0]} size={20} weight={400} color="#e9eeee" lh={23}>{row[2]}</Pin>
          <Pin x={520} y={row[0]} w={99} size={20} weight={400} color="#f0f4f4" lh={23} align="right">{row[3]}</Pin>
        </span>
      ))}
      <Pin x={740} y={502} size={26} weight={700} color="#f1f4f4" lh={30}>SERVICE LEVEL BY REGION & MONTH</Pin>
      <Pin x={740} y={540} size={18} weight={400} color="#a4adad" lh={21}>Calls answered within 20 seconds · synthetic</Pin>
      {monthLabels.map(([x, label]) => (
        <Pin key={label} x={x} y={581} size={18} weight={400} color="#a4adad" lh={21}>{label}</Pin>
      ))}
      {regions.map(([x, y, label]) => (
        <Pin key={label} x={x} y={y} size={18} weight={400} color="#c8d0d0" lh={21}>{label}</Pin>
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
      <Pin x={60} y={958} size={60} weight={400} color="#ffffff" lh={73}>90.6%</Pin>
      <Pin x={60} y={1030} size={15} weight={400} color="#a0aaa8" lh={18}>Closed within 1 hour</Pin>
      {sla.map((item) => (
        <span key={item.label}>
          <At x={item.x} y={945} w={280} h={11}><div style={{ height: "100%", borderRadius: 44, background: item.fill }} /></At>
          <Pin x={item.x} y={966} size={19} weight={400} color="#f3f5f4" lh={22}>{item.label}</Pin>
          <Pin x={item.x} y={1000} size={25} weight={400} color="#f3f5f4" lh={29}>{item.value}</Pin>
        </span>
      ))}
    </Frame>
  )
}

function Screen14() {
  const tamper = [
    { y: 442, bar: 443, fill: 276, label: "Running backwards", value: "3,677", vx: 658 },
    { y: 499, bar: 500, fill: 162, label: "Seal broken or missing", value: "2,425", vx: 656 },
    { y: 556, bar: 557, fill: 108, label: "Not recording", value: "1,996", vx: 660 },
    { y: 613, bar: 614, fill: 61, label: "Interference", value: "802", vx: 677 },
    { y: 670, bar: 671, fill: 33, label: "Display pierced", value: "98", vx: 692 },
  ]
  const alerts = [
    { y: 430.4, title: "UFG hotspot", note: "24.4% UFG", region: "Goychay", ry: 439.4, tone: "Critical", ty: 445.4, color: "#ff3c49", action: "Check network balance and meters", ay: 430.4, aw: 302 },
    { y: 501.4, title: "Outstanding balance", note: "34.3M AZN", region: "Sumqayit", ry: 510.4, tone: "Critical", ty: 516.4, color: "#ff3c49", action: "Collections and disconnection plan", ay: 510.4, aw: 323 },
    { y: 583.4, title: "Reconnection delay", note: "69% within 24 h", region: "Agstafa", ry: 592.4, tone: "Critical", ty: 598.4, color: "#ff3c49", action: "Clear reconnection backlog", ay: 592.4, aw: 291 },
    { y: 661.4, title: "Slow emergency response", note: "35 min median", region: "Ujar", ry: 670.4, tone: "Warning", ty: 676.4, color: "#ffcf32", action: "Dispatch crew capacity review", ay: 670.4, aw: 322 },
    { y: 738.4, title: "Meter tampering", note: "36.7 per 100 replacements", region: "Tartar", ry: 747.4, tone: "Warning", ty: 753.4, color: "#ffcf32", action: "Field verification and SOC review", ay: 747.4, aw: 348 },
    { y: 821.4, title: "Pressure violation", note: "20.6% sense-months", region: "Naftalan", ry: 830.4, tone: "Warning", ty: 836.4, color: "#ffcf32", action: "Inspect regulators, reduce load", ay: 830.4, aw: 329 },
  ]
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
      <Pin x={57} y={180} size={60} weight={700} color="#ffffff" lh={40}>9.9%</Pin>
      <Pin x={385} y={116} size={24} weight={500} color="#34efde" lh={40}>Collection Efficiency</Pin>
      <Pin x={382} y={180} size={60} weight={700} color="#ffffff" lh={40}>107.2%</Pin>
      <Pin x={669} y={113} size={24} color="#eb7d5c" lh={40}>Outstanding Balance</Pin>
      <Pin x={669} y={180} size={60} weight={700} color="#ffffff" lh={40}>15.3M <span style={{ fontSize: 33 }}>AZN</span></Pin>
      <Pin x={982} y={116} size={24} weight={500} color="#34efde" lh={40}>Emergency Response</Pin>
      <Pin x={1000} y={180} size={60} weight={700} color="#ffffff" lh={40}>26 <span style={{ fontSize: 33 }}>MIN</span></Pin>
      <Pin x={1301} y={116} size={24} color="#eb7d5c" lh={40}>Reconnect within 24 h</Pin>
      <Pin x={1299} y={180} size={60} weight={700} color="#ffffff" lh={40}>81.1%</Pin>
      <Pin x={1612} y={116} size={24} color="#eb7d5c" lh={40}>Meters Communicating</Pin>
      <Pin x={1610} y={180} size={60} weight={700} color="#ffffff" lh={40}>94.9%</Pin>

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

function RevenueChart() {
  const cyan = "M58 109 L66 108 L74 107 L82 107 L90 106 L98 102 L106 100 L114 97 L122 94 L130 91 L138 88 L146 85 L154 83 L162 80 L170 79 L178 77 L186 76 L194 75 L202 75 L210 75 L218 75 L226 76 L234 76 L242 77 L250 78 L258 80 L266 81 L274 83 L282 84 L290 86 L298 87 L306 88 L314 89 L322 90 L330 91 L338 91 L346 92 L354 92 L362 92 L370 91 L378 91 L386 90 L394 88 L402 87 L410 84 L418 82 L426 80 L434 77 L442 75 L450 73 L458 71 L466 69 L474 68 L482 67 L490 66 L498 65 L506 65 L514 65 L522 65 L530 64 L538 63 L546 62 L554 61 L562 59 L570 57 L578 55 L586 53 L594 51 L602 50 L610 48 L618 47 L626 46 L634 45 L642 44 L650 44 L658 44 L666 44 L674 45 L682 45 L690 46 L698 47 L706 49 L714 50 L722 52 L730 54 L738 56 L746 58 L754 59 L762 61 L770 62 L778 63 L786 64 L794 64 L802 64 L810 64 L818 64 L826 63 L834 62 L842 60 L850 58 L858 55 L866 52 L874 48 L882 45 L890 41 L898 38 L906 35 L914 32 L922 30 L930 29 L938 27 L946 27 L954 26 L962 26 L970 27 L978 28 L986 29 L994 30 L1002 32 L1010 35 L1018 37 L1026 40 L1034 43 L1042 46 L1050 49 L1058 51 L1066 53 L1074 55 L1082 56 L1090 57 L1098 58 L1106 58 L1114 58 L1122 58 L1130 57 L1138 56 L1146 55 L1154 53 L1162 52 L1170 50 L1178 47 L1186 45 L1194 43 L1202 41 L1210 39 L1218 38 L1226 36 L1234 36 L1242 35 L1250 35 L1258 34 L1266 34 L1274 34 L1282 33 L1290 33 L1298 31 L1306 30 L1314 29 L1322 27 L1330 25 L1338 23 L1346 21 L1354 20 L1362 18 L1370 17 L1378 16 L1386 15 L1394 15 L1402 15 L1410 14 L1418 15 L1426 15 L1434 15 L1442 16 L1450 16 L1458 17 L1466 18 L1474 19 L1482 21 L1490 22 L1498 23 L1506 24 L1514 25 L1522 25 L1530 26 L1538 26 L1546 27 L1554 27 L1562 27 L1570 27 L1578 26 L1586 26 L1594 25 L1602 24 L1610 22 L1618 21 L1626 19 L1634 18 L1642 16 L1650 14 L1658 13 L1666 11 L1674 10 L1682 9 L1690 9 L1698 8 L1706 8"
  const gold = "M80 109 L88 108 L96 106 L104 105 L112 104 L120 103 L128 102 L136 102 L144 102 L152 102 L160 102 L168 103 L176 103 L184 105 L192 105 L200 106 L208 107 L216 108 L224 110 L232 111 L240 113 L248 114 L256 116 L264 117 L272 119 L280 120 L288 121 L296 123 L304 124 L312 125 L320 125 L328 126 L336 127 L344 127 L352 127 L360 127 L368 126 L376 126 L384 124 L392 123 L400 121 L408 119 L416 117 L424 115 L432 112 L440 110 L448 107 L456 105 L464 103 L472 102 L480 101 L488 100 L496 99 L504 99 L512 99 L520 98 L528 97 L536 97 L544 95 L552 92 L560 89 L568 86 L576 81 L584 77 L592 74 L600 70 L608 67 L616 64 L624 62 L632 62 L640 60 L648 59 L656 60 L664 59 L672 60 L680 61 L688 62 L696 63 L704 65 L712 67 L720 69 L728 72 L736 74 L744 76 L752 78 L760 80 L768 81 L776 83 L784 83 L792 85 L800 84 L808 84 L816 84 L824 83 L832 81 L840 79 L848 77 L856 74 L864 71 L872 67 L880 63 L888 59 L896 56 L904 52 L912 49 L920 47 L928 45 L936 45 L944 43 L952 42 L960 42 L968 43 L976 43 L984 44 L992 46 L1000 48 L1008 50 L1016 53 L1024 56 L1032 59 L1040 62 L1048 65 L1056 68 L1064 70 L1072 72 L1080 73 L1088 75 L1096 75 L1104 75 L1112 75 L1120 75 L1128 75 L1136 74 L1144 73 L1152 71 L1160 71 L1168 68 L1176 66 L1184 64 L1192 62 L1200 60 L1208 59 L1216 57 L1224 56 L1232 55 L1240 54 L1248 54 L1256 54 L1264 54 L1272 53 L1280 53 L1288 51 L1296 50 L1304 48 L1312 46 L1320 45 L1328 41 L1336 39 L1344 36 L1352 34 L1360 31 L1368 30 L1376 28 L1384 27 L1392 26 L1400 25 L1408 25 L1416 25 L1424 25 L1432 26 L1440 27 L1448 28 L1456 29 L1464 30 L1472 32 L1480 34 L1488 35 L1496 38 L1504 39 L1512 40 L1520 41 L1528 42 L1536 43 L1544 43 L1552 44 L1560 44 L1568 44 L1576 44 L1584 43 L1592 42 L1600 39 L1608 38 L1616 35 L1624 33 L1632 30 L1640 28 L1648 25 L1656 23 L1664 21 L1672 19 L1680 17 L1688 16 L1696 16 L1704 15"
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
  const kpis = [
    { x: 34, w: 446, label: "Revenue Realization", lx: 69, value: "92.4%", vx: 69 },
    { x: 498, w: 447, label: "Collection Efficiency", lx: 530, value: "91.3%", vx: 530 },
    { x: 964, w: 445, label: "Outstanding Balance", lx: 992, value: "18.7M AZN", vx: 992 },
    { x: 1433, w: 446, label: "Recovery Rate", lx: 1467, value: "82.4%", vx: 1467 },
  ]
  const bars = [
    { x: 393, w: 276, fill: "linear-gradient(to right, #854734, #eb7d5c)", label: "Disconnect", lx: 396, value: "8,972", vx: 395 },
    { x: 678, w: 276, fill: "linear-gradient(to right, #1e897f, #34efde)", label: "Reconnect", lx: 679, value: "2,569", vx: 679 },
    { x: 963, w: 275, fill: "linear-gradient(to right, #1e897f, #34efde)", label: "Pending", lx: 963, value: "131", vx: 963 },
    { x: 1248, w: 276, fill: "linear-gradient(to right, #6e9838, #b7fe5d)", label: "Emergency", lx: 1248, value: "92,498", vx: 1248 },
    { x: 1533, w: 276, fill: "linear-gradient(to right, #6e9838, #b7fe5d)", label: "Tamper", lx: 1533, value: "8,761", vx: 1522 },
  ]
  const days = [
    [203, "5 Apr"], [493, "10 Apr"], [783, "15 Apr"], [1087, "20 Apr"], [1406, "25 Apr"], [1727, "30 Apr"],
  ] as const
  return (
    <Frame>
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
      <RevenueChart />

      <At x={34} y={701} w={1846} h={339}><div className="panel shell dim" /></At>
      <Pin x={67} y={733} size={32} weight={900} color="#ffffff" lh={40}>CONNECT / DISCONNECT OPERATIONS</Pin>
      <Pin x={67} y={811} size={32} color="#ffffff" lh={39}>Reconnect SLA</Pin>
      <Pin x={67} y={863} size={70} color="#ffffff" lh={85}>81.1%</Pin>
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
  const kpis = [
    { x: 34, w: 446, label: "Accident calls", lx: 92, value: "186", vx: 121, note: "Selected reporting period", nx: 274 },
    { x: 498, w: 447, label: "Resolved on first visit", lx: 539, value: "87.6%", vx: 532, note: "Accident calls", nx: 820 },
    { x: 964, w: 445, label: "Leaks sent to repair within 24h", lx: 991, value: "92.4%", vx: 985, note: "Dispatch to repair", nx: 1272 },
    { x: 1423, w: 446, label: "Suspected tamper / revenue loss", lx: 1455, value: "37", vx: 1498, note: "Suspected cases · not confirmed", nx: 1625 },
  ]
  const bars = [
    { x: 79, y: 602, track: 672, fill: 576 },
    { x: 79, y: 927, track: 672, fill: 601 },
    { x: 1146, y: 548, track: 320, fill: 292 },
    { x: 1520, y: 548, track: 320, fill: 307 },
    { x: 1146, y: 754, track: 320, fill: 298 },
    { x: 1520, y: 754, track: 320, fill: 283 },
    { x: 1146, y: 923, track: 320, fill: 292 },
  ]
  const rules = [
    [79, 656, 672],
    [810, 580, 1048],
    [810, 801, 1048],
  ] as const
  return (
    <Frame>
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
      <Pin x={79} y={497} size={43} color="#f3f5f4" lh={55}>428.6</Pin>
      <Pin x={201} y={516} size={22} color="#a3aeab" lh={29}>km</Pin>
      <Pin x={643} y={438} size={18} color="#a3aeab" lh={21}>Leaks per km</Pin>
      <Pin x={688} y={464} size={32} color="#eb7d5c" lh={38}>0.14</Pin>
      <Pin x={671} y={517} size={18} color="#7f8b87" lh={21}>Leaks/km</Pin>
      <Pin x={79} y={559} size={18} color="#a3aeab" lh={23}>Pipeline inspection coverage</Pin>
      <Pin x={665} y={547} size={32} color="#f3f5f4" lh={38}>85.7%</Pin>
      <Pin x={79} y={698} size={24} color="#f3f5f4" lh={28}>Regulator inspection</Pin>
      <Pin x={79} y={811} size={43} color="#f3f5f4" lh={55}>312</Pin>
      <Pin x={165} y={836} size={16} color="#a3aeab" lh={21}>Regulators inspected</Pin>
      <Pin x={79} y={878} size={24} color="#a3aeab" lh={28}>Regulator inspection coverage</Pin>
      <Pin x={665} y={877} size={32} color="#f3f5f4" lh={38}>89.1%</Pin>
      <Pin x={79} y={963} size={18} color="#7f8b87" lh={21}>Coverage uses the corresponding inspection scope.</Pin>
      <Pin x={836} y={278} size={32} weight={700} color="#ffffff" lh={40}>Meter service operations</Pin>
      <Pin x={836} y={329} size={18} color="#a3aeab" lh={21}>Work volumes and completion measures</Pin>
      <Pin x={836} y={419} size={24} color="#f3f5f4" lh={28}>Reconnection</Pin>
      <Pin x={836} y={497} size={41} color="#f3f5f4" lh={48}>284</Pin>
      <Pin x={836} y={548} size={15} color="#a3aeab" lh={18}>Recorded operations</Pin>
      <Pin x={1146} y={423} size={17} color="#a3aeab" lh={20}>Within 24h</Pin>
      <Pin x={1377} y={489} size={33} color="#f3f5f4" lh={39}>91.2%</Pin>
      <Pin x={1520} y={423} size={17} color="#a3aeab" lh={20}>Completion</Pin>
      <Pin x={1751} y={489} size={33} color="#f3f5f4" lh={39}>95.8%</Pin>
      <Pin x={836} y={665} size={24} color="#f3f5f4" lh={28}>Disconnection</Pin>
      <Pin x={836} y={706} size={41} color="#f3f5f4" lh={48}>146</Pin>
      <Pin x={836} y={762} size={15} color="#a3aeab" lh={18}>Recorded operations</Pin>
      <Pin x={1146} y={669} size={17} color="#a3aeab" lh={20}>Within 7 days</Pin>
      <Pin x={1377} y={695} size={33} color="#f3f5f4" lh={39}>93.2%</Pin>
      <Pin x={1520} y={669} size={17} color="#a3aeab" lh={20}>Meter cut off</Pin>
      <Pin x={1751} y={695} size={33} color="#f3f5f4" lh={39}>88.4%</Pin>
      <Pin x={836} y={834} size={24} color="#f3f5f4" lh={28}>Replacement acts</Pin>
      <Pin x={836} y={875} size={41} color="#f3f5f4" lh={48}>218</Pin>
      <Pin x={836} y={931} size={15} color="#a3aeab" lh={18}>Acts recorded</Pin>
      <Pin x={1146} y={838} size={17} color="#a3aeab" lh={20}>Done within 24h</Pin>
      <Pin x={1377} y={864} size={33} color="#f3f5f4" lh={39}>90.8%</Pin>
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
  const cards: { x: number; title: string; value: string; note?: string; rows: [string, string][]; bar?: { label: string; text: string; fill: number } }[] = [
    { x: 34, title: "GAS VOLUME", value: "74.8 MCM", note: "Utilization 81%", rows: [["Peak Flow Today", "82.1 мсм/day"], ["Available Capacity", "92.0 мсм/day"], ["System Margin", "18.7%"]], bar: { label: "Utilization", text: "81%", fill: 195 } },
    { x: 499, title: "LINE PACK", value: "18.6 MCM", note: "+2.4% variation", rows: [["Line Pack Variation", "+2.4%"], ["Pressure Balance", "Stable"], ["Low Pressure Corridors", "2"]] },
    { x: 964, title: "PIPELINE INFRA", value: "34,850 km", note: "248/252 active", rows: [["Transmission Lines", "4,200 km"], ["Distribution Network", "30,650 km"], ["Active Stations", "248/252"], ["Main Valves", "8,420"]] },
    { x: 1429, title: "COVERAGE", value: "2.18M", rows: [["Active Smart Metered", "2.12 M"], ["Customers Affected", "12,450"], ["High Impact Regions", "3"]], bar: { label: "Service Coverage", text: "92.4%", fill: 217 } },
  ]
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
          {card.rows.map(([label, value], index) => (
            <span key={label}>
              <Pin x={card.x + 39} y={rowY[index]} size={24} color="#ffffff" lh={40}>{label}</Pin>
              <Pin x={card.x + 39} y={valueY[index]} size={30} color="#339b9a" lh={40}>{value}</Pin>
            </span>
          ))}
          {card.bar && (
            <span>
              <Pin x={card.x + 39} y={790} size={24} color="#ffffff" lh={40}>{card.bar.label}</Pin>
              <Pin x={card.x + 291} y={837} size={30} color="#339b9a" lh={40}>{card.bar.text}</Pin>
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
  const rows = [
    { y: 840, label: "High Consumption", value: "1,248", fill: 60 },
    { y: 877, label: "Low Consumption", value: "2,317", fill: 524 },
    { y: 915, label: "Zero Consumption", value: "3,412", fill: 282 },
    { y: 953, label: "Sudden Drop", value: "684", fill: 404 },
    { y: 990, label: "Repeated Anomaly", value: "420", fill: 291 },
  ]
  return (
    <Frame border={false}>
      <At x={20} y={756} w={1391} h={290}><div className="panel shell dim" /></At>
      <Pin x={56} y={782} size={28} weight={500} color="#ffffff" lh={30}>CUSTOMER CONSUMPTION ANOMALY ALERTS</Pin>
      <Pin x={80} y={858} w={190} size={32} weight={500} color="#eb7d5c" lh={36} align="center">Total</Pin>
      <Pin x={80} y={900} w={190} size={32} weight={500} color="#eb7d5c" lh={36} align="center">Anomalies</Pin>
      <Pin x={89} y={953} size={72} color="#ffffff" lh={64}>3,412</Pin>
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
      <Pin x={1437} y={837} w={463} size={44} weight={500} color="#ffffff" lh={32} align="center">Baku</Pin>
      <Pin x={1437} y={888} w={463} size={72} weight={500} color="#ffffff" lh={76} align="center">21°</Pin>
      <Pin x={1437} y={976} w={463} size={22} weight={500} color="#ffffff" lh={26} align="center">Field risk low</Pin>
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

function Screen19() {
  const rings = [
    { x: 140, label: "Telecom", value: "98.6%" },
    { x: 421, label: "Critical", value: "2" },
    { x: 703, label: "Integration", value: "99.7%" },
    { x: 993, label: "Availability", value: "99.98%" },
    { x: 1274, label: "Response", value: "124 ms" },
    { x: 1556, label: "Comm.", value: "99.2%" },
  ]
  return (
    <Frame border={false}>
      <Pin x={425} y={657} size={32} weight={900} color="#34efde" lh={40}>SYSTEM HEALTH, CYBERSECURITY & ENTERPRISE ECOSYSTEM HEALTH</Pin>
      {rings.map((ring) => (
        <span key={ring.label}>
          <HealthRing x={ring.x} />
          <Pin x={ring.x - 20} y={842} w={264} size={48} color="#ffffff" lh={40} align="center">{ring.value}</Pin>
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
  const kpis = [
    { x: 29, label: "Total meters", lx: 60, value: "1,000" },
    { x: 495, label: "Residential meters", lx: 516, value: "940" },
    { x: 960, label: "Non-residential meters", lx: 980, value: "50" },
    { x: 1426, label: "Balance meters", lx: 1446, value: "10" },
  ]
  const expected = [
    { y: 429, label: "Overall", daily: "4,000", dx: 489, monthly: "1,000", mx: 768 },
    { y: 500, label: "Residential", daily: "3,760", dx: 489, monthly: "940", mx: 786 },
    { y: 571, label: "Non-residential", daily: "200", dx: 506, monthly: "50", mx: 800 },
    { y: 642, label: "Balance meter", daily: "40", dx: 519, monthly: "Not specified", mx: 685 },
  ]
  const complete = [
    { y: 434, bar: 440, label: "Overall", daily: "98.5%", monthly: "99.1%", py: 414 },
    { y: 502, bar: 508, label: "Residential", daily: "98.6%", monthly: "99.2%", py: 481 },
    { y: 572, bar: 578, label: "Non-residential", daily: "96.0%", monthly: "97.0%", py: 554 },
    { y: 644, bar: 650, label: "Balance meter", daily: "99.0%", monthly: "99.4%", py: 625 },
  ]
  const reads = [
    { y: 852, rule: 818, label: "Overall", daily: "4.2%", monthly: "3.1%", hourly: "5.4%", vy: 845 },
    { y: 907, rule: 884, label: "Residential", daily: "4.0%", monthly: "3.0%", hourly: "5.2%", vy: 900 },
    { y: 962, rule: 939, label: "Non-residential", daily: "7.2%", monthly: "5.0%", hourly: "8.5%", vy: 955 },
  ]
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
      <Pin x={1762} y={860} size={38} color="#f3f5f4" lh={45}>1.8%</Pin>
      <Rule x={1371} y={922} w={472} />
      <Pin x={1371} y={944} size={24} color="#ffffff" lh={28}>Edited</Pin>
      <Pin x={1762} y={942} size={38} color="#f3f5f4" lh={45}>0.6%</Pin>
    </Frame>
  )
}

function Screen21() {
  const kpis = [
    { x: 31, label: "Total pressure sensors", lx: 56, value: "1,633", note: "Selected sensor population" },
    { x: 649, label: "Low pressure sensors", lx: 674, value: "1,200", note: "Low pressure network" },
    { x: 1267, label: "Medium pressure sensors", lx: 1294, value: "433", note: "Medium pressure network" },
  ]
  const zones = [
    { y: 425, bar: 429, x: 1468, w: 228, label: "Zone 01", value: "920" },
    { y: 463, bar: 467, x: 1468, w: 172, label: "Zone 02", value: "685" },
    { y: 501, bar: 505, x: 1469, w: 132, label: "Zone 03", value: "528" },
    { y: 539, bar: 543, x: 1469, w: 96, label: "Zone 04", value: "347" },
  ]
  const grades = [
    { trackY: 829, trackH: 139, fillY: 857, fillH: 111, x: 1107, value: "8", vx: 1093, vy: 840, label: "Grade A", lx: 1122 },
    { trackY: 829, trackH: 139, fillY: 898, fillH: 70, x: 1365, value: "5", vx: 1349, vy: 881, label: "Grade B", lx: 1381 },
    { trackY: 829, trackH: 146, fillY: 942, fillH: 27, x: 1623, value: "2", vx: 1607, vy: 921, label: "Grade C", lx: 1638 },
  ]
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
      <Pin x={56} y={468} size={18} color="#76817f" lh={21}>36 / 1,200 sensors · demo</Pin>
      <At x={408} y={451} w={355} h={22}><div style={{ height: "100%", borderRadius: 27, background: "#33413f" }} /></At>
      <At x={408} y={451} w={19} h={22}><div style={{ height: "100%", borderRadius: 27, background: "linear-gradient(to right, #8c6034, #f2a65a)" }} /></At>
      <Pin x={816} y={445} size={30} color="#f3f5f4" lh={36}>3.0%</Pin>
      <Rule x={56} y={498} w={824} color="#343838" />
      <Pin x={56} y={509} size={24} color="#f3f5f4" lh={28}>Medium pressure violation</Pin>
      <Pin x={56} y={544} size={18} color="#76817f" lh={21}>26 / 433 sensors · demo</Pin>
      <At x={408} y={528} w={355} h={22}><div style={{ height: "100%", borderRadius: 27, background: "#33413f" }} /></At>
      <At x={408} y={528} w={37} h={22}><div style={{ height: "100%", borderRadius: 27, background: "linear-gradient(to right, #8c6034, #f2a65a)" }} /></At>
      <Pin x={816} y={522} size={30} color="#f3f5f4" lh={36}>6.0%</Pin>
      <At x={56} y={596} w={10} h={10}><div style={{ width: 10, height: 10, borderRadius: 5, background: "#f2ab65" }} /></At>
      <Pin x={76} y={590} size={18} color="#76817f" lh={21}>Sensors with pressure violations</Pin>

      <At x={953} y={320} w={919} h={314}><div className="panel shell dim" /></At>
      <Pin x={976} y={339} size={24} weight={700} color="#f3f5f4" lh={28}>Customers impacted</Pin>
      <Pin x={976} y={374} size={18} color="#a3aeab" lh={21}>By pressure violations</Pin>
      <Pin x={976} y={424} size={70} color="#ffffff" lh={85} font="Inter, sans-serif">2,480</Pin>
      <Pin x={976} y={517} w={171} size={18} color="#a3aeab" lh={21} wrap>Unique customers · illustrative definition</Pin>
      <Pin x={976} y={594} size={18} color="#7f8b87" lh={21}>Source: GIS</Pin>
      <Rule x={1267} y={424} w={1} h={139} color="#343838" />
      <Pin x={1343} y={339} size={24} weight={700} color="#f3f5f4" lh={28}>Top affected zones</Pin>
      <Pin x={1750} y={396} size={16} color="#8c9695" lh={19}>Customers</Pin>
      {zones.map((row) => (
        <span key={row.label}>
          <Pin x={1343} y={row.y} size={24} color="#e8f0ed" lh={28}>{row.label}</Pin>
          <At x={row.x} y={row.bar} w={280} h={20}><div style={{ height: "100%", borderRadius: 62, background: "#33413f" }} /></At>
          <At x={row.x} y={row.bar} w={row.w} h={20}><div style={{ height: "100%", borderRadius: 62, background: "linear-gradient(to right, #e6846b, #80493b)" }} /></At>
          <Pin x={1787} y={row.y} size={24} color="#e8f0ed" lh={28}>{row.value}</Pin>
        </span>
      ))}
      <Pin x={1343} y={594} size={18} color="#7f8b87" lh={21}>Source: GIS</Pin>

      <At x={31} y={644} w={910} h={388}><div className="panel shell dim" /></At>
      <Pin x={56} y={720} size={24} color="#ffffff" lh={28}>Leak indicators</Pin>
      <Pin x={56} y={758} size={18} color="#76817f" lh={21}>Counts and handling times for the selected context</Pin>
      <Pin x={56} y={812} size={18} color="#76817f" lh={21}>Suspected leaks</Pin>
      <Pin x={56} y={851} size={40} color="#f3f5f4" lh={47}>18</Pin>
      <Pin x={399} y={864} size={18} color="#76817f" lh={21}>MDMS</Pin>
      <Pin x={486} y={812} size={18} color="#76817f" lh={21}>Confirmed leaks</Pin>
      <Pin x={486} y={851} size={40} color="#f3f5f4" lh={47}>7</Pin>
      <Pin x={869} y={864} size={18} color="#76817f" lh={21}>LD</Pin>
      <Rule x={56} y={924} w={850} />
      <Rule x={471} y={825} w={1} h={183} />
      <Pin x={56} y={934} size={18} color="#76817f" lh={21}>Avg. leak response time</Pin>
      <Pin x={56} y={971} size={40} color="#f3f5f4" lh={47}>24</Pin>
      <Pin x={338} y={984} size={18} color="#76817f" lh={21}>MFS · minutes</Pin>
      <Pin x={486} y={934} size={18} color="#76817f" lh={21}>Avg. leak repair time</Pin>
      <Pin x={486} y={961} size={40} color="#f3f5f4" lh={47}>96</Pin>
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
  2: () => <Screen2 />,
  3: () => <Screen3 />,
  4: () => <Screen4 />,
  5: () => <Screen5 />,
  6: () => <Screen6 />,
  7: () => <Screen7 />,
  8: () => <Screen8 />,
  9: () => <Screen9 />,
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
