import dividerTop from "../assets/socnoc/screen2/divider-top.svg"
import dividerV from "../assets/socnoc/screen2/divider-v.svg"
import { AreaLineChart, ChartGrid, ProgBar } from "./charts"
import { Frame, ImgAt, KPI_GRAD_ALT, KpiCard, LiveBadge, Panel, Pin, TEAL, TEAL_GRAD } from "./ui"

const PANEL_BOTTOM_GRAD = "linear-gradient(146.94deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)"

/** Reads over 24h — peaks near 1.21M. */
const READS_SERIES = [
  720_000, 680_000, 640_000, 590_000, 520_000, 480_000, 510_000, 560_000, 620_000, 700_000, 780_000, 850_000,
  920_000, 980_000, 1_050_000, 1_100_000, 1_150_000, 1_190_000, 1_210_000, 1_180_000, 1_140_000, 1_080_000, 1_020_000, 960_000,
]

const Y_AXIS: { label: string; cx: number; y: number; w: number }[] = [
  { label: "1.21M", cx: 95.5, y: 410, w: 51 },
  { label: "910K", cx: 100, y: 471, w: 42 },
  { label: "607K", cx: 100, y: 532, w: 42 },
  { label: "303K", cx: 100, y: 593, w: 42 },
  { label: "0", cx: 115.5, y: 654, w: 11 },
]

const X_AXIS = [167.5, 295.5, 423.5, 552, 680.5, 808.5, 936.5]

const BAR_X = 1039
const BAR_TRACK_W = 804

const CHART_X = 132
const CHART_Y = 393
const CHART_W = 836
const CHART_H = 286

/** Hardcoded KPIs / right-panel flow (collection 99.0%, validation 99.5%). */
const COLLECTED = 28_200
const VALIDATED = 28_100
const NOT_COLLECTED = Math.round(COLLECTED / 0.99 - COLLECTED) // ~285
const FAILED = COLLECTED - VALIDATED // 100
const FLOW_MAX = COLLECTED + NOT_COLLECTED

const FLOW = [
  { label: "Collected", value: "28.2K", labelY: 397, barY: 432, fillW: BAR_TRACK_W },
  { label: "Collected via HES", value: "28.2K", labelY: 470, barY: 505, fillW: BAR_TRACK_W },
  { label: "Validated", value: "28.1K", labelY: 543, barY: 578, fillW: Math.max(8, Math.round((VALIDATED / FLOW_MAX) * BAR_TRACK_W)) },
  {
    label: "Not collected",
    value: String(NOT_COLLECTED),
    labelY: 616,
    barY: 651,
    fillW: Math.max(8, Math.round((NOT_COLLECTED / FLOW_MAX) * BAR_TRACK_W)),
  },
  {
    label: "Failed validation",
    value: String(FAILED),
    labelY: 689,
    barY: 724,
    fillW: Math.max(8, Math.round((FAILED / FLOW_MAX) * BAR_TRACK_W)),
  },
]

const KPIS = [
  { x: 42, y: 76, w: 296.897, label: "Reads collected", value: "28.2K" },
  { x: 350, y: 75, w: 297, label: "Collected by HES", value: "28.2K", grad: KPI_GRAD_ALT },
  { x: 658, y: 75, w: 297, label: "Validated by MDM", value: "28.1K" },
  { x: 967, y: 75, w: 297, label: "Failed validation", value: String(FAILED) },
  { x: 1275, y: 75, w: 297, label: "Collection rate", value: "99.0%" },
  { x: 1583, y: 75, w: 297, label: "Validation rate", value: "99.5%" },
]

export function Screen2() {

  return (
    <Frame>
      <Pin x={67} y={30} size={32} weight={900} color={TEAL} lh={40}>METER DATA PIPELINE · HES → MDM</Pin>
      <LiveBadge />

      {KPIS.map((k) => (
        <KpiCard key={k.label} x={k.x} y={k.y} w={k.w} label={k.label} value={k.value} grad={k.grad} />
      ))}

      <Panel x={42} y={250} w={958} h={555} />
      <Panel x={1011} y={250} w={869} h={555} />
      <Panel x={42} y={818} w={1838} h={229} grad={PANEL_BOTTOM_GRAD} />

      <ImgAt x={79} y={230} w={1764} h={2} src={dividerTop} />
      <Pin x={70} y={278} size={25} weight={700} color="#f2f5f5">LAST 30 DAYS</Pin>
      <Pin x={1050} y={278} size={25} weight={700} color="#f2f5f5">READS → VALIDATION / 24H</Pin>

      <ChartGrid x={133} y={439} w={837} rows={5} rowH={59} />

      {Y_AXIS.map((t) => (
        <Pin key={t.label} x={t.cx - t.w / 2} y={t.y} size={18} weight={400} color="#a4a7ae" w={t.w} lh={41} align="center">{t.label}</Pin>
      ))}

      {X_AXIS.map((cx) => (
        <Pin key={cx} x={cx - 24.5} y={695} size={18} weight={400} color="#a4a7ae" w={49} lh={40} align="center">
          {cx === 552 ? "07:45" : cx === 167.5 ? "19:50" : cx === 295.5 ? "23:48" : cx === 423.5 ? "03:46" : cx === 680.5 ? "11:43" : cx === 808.5 ? "15:41" : "19:40"}
        </Pin>
      ))}

      <AreaLineChart x={CHART_X} y={CHART_Y} w={CHART_W} h={CHART_H} series={READS_SERIES} yMax={1_210_000} />

      {FLOW.map((row) => (
        <div key={row.label}>
          <Pin x={BAR_X} y={row.labelY} size={19} weight={400} color="#8ba4a2">{row.label}</Pin>
          <Pin x={1752} y={row.labelY - 3} size={23} weight={700} color="#e8f2f0" w={120} align="right">{row.value}</Pin>
          <ProgBar x={BAR_X} y={row.barY} trackW={BAR_TRACK_W} fillW={row.fillW} fill={TEAL_GRAD} />
        </div>
      ))}

      <Pin x={70} y={846} size={21} weight={700} color="#e8f2f0">PROCESSING</Pin>
      <ImgAt x={414} y={909} w={1} h={99} src={dividerV} />
      <ImgAt x={966} y={909} w={1} h={99} src={dividerV} />
      <ImgAt x={1482} y={909} w={1} h={99} src={dividerV} />

      {[
        { label: "Last batch", value: "19:27", x: 120 },
        { label: "Processing delay", value: "55 sec", x: 614, valueX: 636 },
        { label: "Pending jobs", value: "148", x: 1166, valueX: 1193 },
        { label: "Avg response", value: "172 ms", x: 1682 },
      ].map((m) => (
        <div key={m.label}>
          <Pin x={m.x} y={920} size={20} weight={400} color="#8ba4a2">{m.label}</Pin>
          <Pin x={m.valueX ?? m.x} y={955} size={36} weight={700} color="#34edda" lh={36}>{m.value}</Pin>
        </div>
      ))}
    </Frame>
  )
}
