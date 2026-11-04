import { Sparkline } from "./charts"
import { Frame, KPI_GRAD_ALT, KpiCard, LiveBadge, Panel, Pin, TEAL } from "./ui"

const KPI_X = [42, 350, 658, 967, 1275, 1583]

type AppRow = {
  name: string
  y: number
  avail: string
  p95: string
  err: string
  rps: string
  vms: string
  p95Spark: number[]
  errSpark: number[]
}

function wave(seed: number, n = 32, amp = 1, base = 0.5): number[] {
  return Array.from({ length: n }, (_, i) => {
    const t = i / n
    return base + amp * (0.35 * Math.sin((t + seed) * 14) + 0.25 * Math.sin((t + seed * 1.7) * 7) + 0.15 * Math.sin((t + seed) * 31))
  })
}

const APPS: AppRow[] = [
  { name: "HES", y: 412, avail: "100%", p95: "148 ms", err: "0.1%", rps: "84.8/s", vms: "13/13", p95Spark: wave(0.1, 40, 0.4, 0.45), errSpark: wave(0.4, 40, 0.35, 0.5) },
  { name: "MDM", y: 517, avail: "100%", p95: "262 ms", err: "0.3%", rps: "61.7/s", vms: "10/10", p95Spark: wave(0.6, 40, 0.5, 0.4), errSpark: wave(0.9, 40, 0.4, 0.45) },
  { name: "WFM", y: 622, avail: "100%", p95: "328 ms", err: "0.4%", rps: "22.1/s", vms: "7/7", p95Spark: wave(1.2, 40, 0.45, 0.5), errSpark: wave(1.5, 40, 0.3, 0.55) },
  { name: "GIS", y: 727, avail: "100%", p95: "681 ms", err: "0.5%", rps: "15/s", vms: "9/9", p95Spark: wave(1.8, 40, 0.55, 0.4), errSpark: wave(2.1, 40, 0.45, 0.4) },
  { name: "UFG", y: 821, avail: "100%", p95: "395 ms", err: "0.3%", rps: "6.5/s", vms: "6/6", p95Spark: [...wave(0.2, 28, 0.3, 0.35), 0.95, 0.9, ...wave(2.5, 10, 0.2, 0.4)], errSpark: [...wave(0.3, 28, 0.25, 0.4), 0.92, 0.85, ...wave(2.8, 10, 0.2, 0.45)] },
  { name: "Gas Simulation", y: 936, avail: "100%", p95: "930 ms", err: "0.6%", rps: "3.2/s", vms: "4/4", p95Spark: wave(3.0, 40, 0.6, 0.35), errSpark: wave(3.3, 40, 0.5, 0.4) },
]

export function Screen8() {
  return (
    <Frame>
      <Pin x={67} y={30} size={32} weight={900} color={TEAL} lh={40}>APPLICATION HEALTH</Pin>
      <LiveBadge />

      <KpiCard x={KPI_X[0]} y={76} label="Apps healthy" value="6 / 6" hint={"up, no\ndegradation"} />
      <KpiCard x={KPI_X[1]} y={75} label="Open app incidents" value="0" hint={"outages,\ndegradations"} grad={KPI_GRAD_ALT} />
      <KpiCard x={KPI_X[2]} y={75} label="Lowest availability" value="100%" hint={"HES · last\n24 h"} />
      <KpiCard
        x={KPI_X[3]}
        y={75}
        label="Slowest p95"
        value={
          <>
            930{" "}
            <span style={{ fontSize: 40, fontWeight: 400 }}>ms</span>
          </>
        }
        hint={"Gas\nSimulation"}
      />
      <KpiCard x={KPI_X[4]} y={75} label="Highest error rate" value="0.6%" hint={"Gas\nSimulation"} />
      <KpiCard x={KPI_X[5]} y={75} label="Requests / s" value="193/s" hint={"all business\nservices"} />

      <div className="at" style={{ left: 79, top: 230, width: 1764, height: 1, background: "#252b2b" }} />
      <Panel x={42} y={250} w={1838} h={792} grad="linear-gradient(113.95deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />

      <Pin x={67} y={275} size={25} weight={700} color="#f2f5f5">PER APPLICATION</Pin>
      <Pin x={1475} y={282} size={16.8} weight={400} color="#5f6c6c" w={420} align="right">
        p95 and error-rate trends: one line per application
      </Pin>

      <Pin x={88} y={342} size={16.8} weight={400} color="#647273">STATUS</Pin>
      <Pin x={242} y={342} size={16.8} weight={400} color="#647273">APPLICATION</Pin>
      <Pin x={464} y={342} size={16.8} weight={400} color="#647273">AVAILABILITY · LAST 24 H</Pin>
      <Pin x={745} y={342} size={16.8} weight={400} color="#647273">P95 LATENCY</Pin>
      <Pin x={1195} y={342} size={16.8} weight={400} color="#647273">ERROR RATE</Pin>
      <Pin x={1614} y={342} size={16.8} weight={400} color="#647273">REQUESTS / S</Pin>
      <Pin x={1785} y={342} size={16.8} weight={400} color="#647273">VMS</Pin>

      <div className="at" style={{ left: 89, top: 376, width: 1764, height: 1, background: "#203333" }} />

      {APPS.map((row) => (
        <div key={row.name}>
          <div className="at" style={{ left: 89, top: row.y + 63, width: 1764, height: 1, background: "#203333" }} />
          <div className="at" style={{ left: 89, top: row.y + 6, width: 14, height: 14, borderRadius: 99, background: TEAL }} />
          <Pin x={119} y={row.y} size={21.6} weight={400} color="#8b9b9b">Up</Pin>
          <Pin x={242} y={row.y} size={24} weight={700} color="#e5eeee">{row.name}</Pin>
          <Pin x={464} y={row.y} size={24} weight={400} color="#e5eeee">{row.avail}</Pin>
          <Pin x={745} y={row.y} size={24} weight={400} color="#e5eeee">{row.p95}</Pin>
          <Sparkline x={871} y={row.y + 4} w={255} h={22} values={row.p95Spark} />
          <Pin x={1195} y={row.y} size={24} weight={400} color="#e5eeee">{row.err}</Pin>
          <Sparkline x={1299} y={row.y + 4} w={248} h={22} values={row.errSpark} />
          <Pin x={1614} y={row.y} size={24} weight={400} color="#e5eeee" w={120} align="center">{row.rps}</Pin>
          <Pin x={1785} y={row.y} size={24} weight={400} color="#e5eeee" w={80} align="center">{row.vms}</Pin>
        </div>
      ))}
    </Frame>
  )
}
