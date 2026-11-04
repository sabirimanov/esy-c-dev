import { AreaLineChart, ChartGrid, ProgBar } from "./charts"
import { Frame, KPI_GRAD_ALT, KpiCard, LiveBadge, Panel, Pin, TEAL, TEAL_GRAD } from "./ui"

const KPI_X = [42, 350, 658, 967, 1275, 1583]

type FlowRow = {
  title: string
  sub: string
  calls: string
  success: string
  latency: string
  latencyColor?: string
  y: number
}

const FLOWS: FlowRow[] = [
  { title: "HES → MDM", sub: "Meter readings · RabbitMQ", calls: "450/s", success: "99.7%", latency: "96 ms", y: 337 },
  { title: "MDM → WFM", sub: "Work orders", calls: "6.1/s", success: "99.8%", latency: "235 ms", y: 390 },
  { title: "WFM → MDM", sub: "Job results · meter exchanges", calls: "9.8/s", success: "99.8%", latency: "191 ms", y: 443 },
  { title: "MDM → UFG", sub: "Consumption reconciliation", calls: "2.0/s", success: "99.8%", latency: "556 ms", y: 496 },
  { title: "GIS → WFM", sub: "Asset locations", calls: "15.1/s", success: "99.8%", latency: "295 ms", y: 549 },
  { title: "GIS → UFG", sub: "Network model", calls: "1.0/s", success: "99.8%", latency: "741 ms", y: 602 },
  { title: "GIS → Gas Simulation", sub: "Network topology", calls: "0.5/s", success: "99.9%", latency: "1,105 ms", latencyColor: "#f1c76a", y: 655 },
]

const QUEUES = [
  { name: "hes.readings", value: 185, y: 313 },
  { name: "hes.events", value: 84, y: 396 },
  { name: "mdm.vee", value: 50, y: 477 },
  { name: "wfm.workorders", value: 17, y: 555 },
]

const QUEUE_MAX = 185
const QUEUE_BAR_X = 1226
const QUEUE_TRACK = 520
const QUEUE_VALUE_X = 1788
const QUEUE_VALUE_W = 72
const QUEUE_RIGHT = QUEUE_VALUE_X + QUEUE_VALUE_W

const CHART_X = [
  { label: "19:51", x: 123 },
  { label: "23:49", x: 317 },
  { label: "03:47", x: 511 },
  { label: "07:46", x: 705 },
  { label: "11:44", x: 899 },
  { label: "19:41", x: 1093 },
]

/** Messages waiting last 24h — synthetic series matching Figma shape. */
const MSG_SERIES = [
  240, 210, 180, 95, 70, 110, 160, 220, 310, 380, 420, 450, 430, 390, 340, 280, 230, 200, 175, 160, 150, 145, 140, 135,
]

export function Screen9() {
  return (
    <Frame>
      <Pin x={67} y={30} size={32} weight={900} color={TEAL} lh={40}>INTEGRATION & MESSAGING</Pin>
      <LiveBadge />

      <KpiCard x={KPI_X[0]} y={76} label="RabbitMQ nodes" value="3 / 3" hint={"All brokers\nonline"} />
      <KpiCard x={KPI_X[1]} y={75} label="Messages waiting" value="336" hint={"Across all\nqueues"} grad={KPI_GRAD_ALT} />
      <KpiCard x={KPI_X[2]} y={75} label="Published / sec" value="1,550" hint={"Messages per\nsecond"} />
      <KpiCard x={KPI_X[3]} y={75} label="Delivered / sec" value="1,550" hint={"Messages per\nsecond"} />
      <KpiCard x={KPI_X[4]} y={75} label="Consumers" value="24" hint={"Active\nconsumers"} />
      <KpiCard x={KPI_X[5]} y={75} label="UFG task queue" value="22" hint={"Celery /\nRedis"} />

      <div className="at" style={{ left: 79, top: 230, width: 1764, height: 1, background: "#252b2b" }} />

      <Panel x={42} y={237} w={1132} h={499} grad="linear-gradient(113deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />
      <Panel x={42} y={755} w={1132} h={304} grad="linear-gradient(125deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />
      <Panel x={1188} y={237} w={692} h={499} grad="linear-gradient(105deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />
      <Panel x={1188} y={755} w={692} h={304} grad="linear-gradient(114deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />

      <div className="at" style={{ left: 62, top: 292, width: 1081, height: 35, borderRadius: 95, background: "#232323", border: "1px solid #282b2a" }} />
      <Pin x={84} y={251} size={25} weight={700} color="#f2f5f5">Service flows</Pin>
      {(["INTEGRATION", "CALLS / SEC", "SUCCESS", "P95 LATENCY", "STATE"] as const).map((h, i) => (
        <Pin key={h} x={[92, 530, 707, 873, 1054][i]} y={304} size={13} weight={700} color="#8da9a5">{h}</Pin>
      ))}

      {FLOWS.map((row) => (
        <div key={row.title}>
          {row.y > 337 && <div className="at" style={{ left: 70, top: row.y - 8, width: 1076, height: 1, background: "#203333" }} />}
          <Pin x={92} y={row.y} size={18} weight={700} color="#eaf4f2">{row.title}</Pin>
          <Pin x={92} y={row.y + 26} size={12} weight={400} color="#7d9692">{row.sub}</Pin>
          <Pin x={548} y={row.y + 8} size={19} weight={400} color="#e7f1f0">{row.calls}</Pin>
          <Pin x={725} y={row.y + 8} size={19} weight={400} color={TEAL}>{row.success}</Pin>
          <Pin x={887} y={row.y + 8} size={19} weight={400} color={row.latencyColor ?? "#dceae7"}>{row.latency}</Pin>
          <div className="at" style={{ left: 1056, top: row.y + 14, width: 12, height: 12, borderRadius: 99, background: TEAL }} />
          <Pin x={1074} y={row.y + 10} size={16} weight={400} color="#9bb9b4">Healthy</Pin>
        </div>
      ))}

      <Pin x={1224} y={251} size={25} weight={700} color="#f2f5f5">Queue backlog</Pin>
      <Pin x={QUEUE_RIGHT - 120} y={263} size={13} weight={400} color="#809694" w={120} align="right">READY MESSAGES</Pin>
      {QUEUES.map((q) => (
        <div key={q.name}>
          <Pin x={QUEUE_BAR_X} y={q.y} size={19} weight={400} color="#ddeae8">{q.name}</Pin>
          <Pin x={QUEUE_VALUE_X} y={q.y - 2} size={23} weight={700} color="#edf5f3" w={QUEUE_VALUE_W} align="right">{String(q.value)}</Pin>
          <ProgBar
            x={QUEUE_BAR_X}
            y={q.y + 28}
            trackW={QUEUE_TRACK}
            fillW={(q.value / QUEUE_MAX) * QUEUE_TRACK}
            fill={TEAL_GRAD}
          />
        </div>
      ))}
      <div className="at" style={{ left: QUEUE_BAR_X, top: 655, width: QUEUE_TRACK, height: 1, background: "#2a3535" }} />
      <Pin x={QUEUE_BAR_X} y={669} size={15} weight={400} color="#8da6a2">Unacknowledged</Pin>
      <Pin x={QUEUE_VALUE_X} y={663} size={25} weight={700} color="#e8f2f0" w={QUEUE_VALUE_W} align="right">207</Pin>

      <Pin x={96} y={797} size={25} weight={700} color="#f2f5f5">Messages waiting · last 24 hours</Pin>
      <Pin x={1072} y={797} size={15} weight={400} color="#8aa29f" w={100} align="right">RabbitMQ</Pin>
      {["450", "300", "150", "0"].map((label, i) => (
        <Pin key={label} x={84} y={852 + i * 38} size={12} weight={400} color="#7d9390" w={40} align="right">{label}</Pin>
      ))}
      <ChartGrid x={122} y={851} w={1005} rows={4} rowH={38} />
      <AreaLineChart x={122} y={851} w={1005} h={115} series={MSG_SERIES} yMax={450} />
      {CHART_X.map(({ label, x }) => (
        <Pin key={label} x={x} y={984} size={13} weight={400} color="#849a97" w={49} align="center">{label}</Pin>
      ))}

      <Pin x={1277} y={797} size={25} weight={700} color="#f2f5f5">UFG tasks · Celery / Redis</Pin>
      <div className="at" style={{ left: 1487, top: 860, width: 1, height: 95, background: "#2a3535" }} />
      <div className="at" style={{ left: 1719, top: 860, width: 1, height: 95, background: "#2a3535" }} />
      <Pin x={1278} y={866} size={16} weight={400} color="#85b7b1">Queued</Pin>
      <Pin x={1278} y={907} size={36} weight={700} color="#f0f8f6">22</Pin>
      <Pin x={1508} y={866} size={16} weight={400} color="#85b7b1">Redis memory</Pin>
      <Pin x={1508} y={907} size={36} weight={700} color="#f0f8f6">37.3%</Pin>
      <Pin x={1742} y={866} size={16} weight={400} color="#85b7b1">Failed · 24h</Pin>
      <Pin x={1742} y={907} size={36} weight={700} color="#f0f8f6">0</Pin>
    </Frame>
  )
}
