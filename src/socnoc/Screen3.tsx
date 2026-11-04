import type { ReactNode } from "react"
import dividerTop from "../assets/socnoc/screen3/divider-top.svg"
import dividerV from "../assets/socnoc/screen3/divider-v.svg"
import { ChartGrid, MultiLineChart, ProgBarPct } from "./charts"
import { Frame, ImgAt, KPI_GRAD_ALT, KpiCard, LiveBadge, Panel, Pin, TEAL, TEAL_GRAD } from "./ui"

const PANEL_BOTTOM_GRAD = "linear-gradient(146.94deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)"

const KPIS: {
  x: number
  y: number
  w: number
  label: string
  value: ReactNode
  grad?: string
}[] = [
  { x: 42, y: 76, w: 296.897, label: "VM availability", value: "99.99%" },
  { x: 350, y: 75, w: 297, label: "CPU usage", value: "31.6%", grad: KPI_GRAD_ALT },
  { x: 658, y: 75, w: 297, label: "Memory usage", value: "54.8%" },
  { x: 967, y: 75, w: 297, label: "Storage usage", value: "66.6%" },
  {
    x: 1275,
    y: 75,
    w: 297,
    label: "Avg throughput",
    value: <><span style={{ fontSize: 60 }}>325 </span><span style={{ fontSize: 40, fontWeight: 400 }}>Mbit/s</span></>,
  },
  { x: 1583, y: 75, w: 297, label: "Monitoring disk", value: "41.4%" },
]

const CPU_SERIES = [
  28, 26, 24, 22, 20, 19, 21, 25, 30, 34, 38, 41, 39, 36, 33, 31, 29, 28, 27, 26, 25, 24, 23, 22,
]
const MEM_SERIES = [
  48, 49, 50, 51, 52, 53, 54, 55, 56, 55, 54, 55, 56, 55, 54, 53, 52, 51, 50, 49, 48, 47, 46, 45,
]

const Y_AXIS: { label: string; cx: number; y: number }[] = [
  { label: "100%", cx: 99, y: 410 },
  { label: "75%", cx: 104, y: 471 },
  { label: "50%", cx: 104, y: 532 },
  { label: "25%", cx: 104, y: 593 },
  { label: "0%", cx: 109, y: 654 },
]

const X_AXIS = [167.5, 295.5, 423.5, 552, 680.5, 808.5, 936.5]
const X_LABELS = ["19:50", "23:48", "03:46", "07:45", "11:43", "15:41", "19:40"]

const DISKS: { label: string; sub: string; value: string; labelY: number; barY: number; pct: number }[] = [
  { label: "Admin & shared", sub: "SRV-ELK02", value: "74.2%", labelY: 397, barY: 432, pct: 74.2 },
  { label: "HES", sub: "SRV-GIS-PORTAL01", value: "69.0%", labelY: 470, barY: 505, pct: 69.0 },
  { label: "MDM / WFM", sub: "SRV-HES-INTG01", value: "68.0%", labelY: 543, barY: 578, pct: 68.0 },
  { label: "Gas Sim / UFG", sub: "SRV-CCC01", value: "64.4%", labelY: 616, barY: 651, pct: 64.4 },
  { label: "GIS", sub: "SRV-GSIM-DB01", value: "61.0%", labelY: 689, barY: 724, pct: 61.0 },
]

const BAR_X = 1039
const BAR_TRACK_W = 804

const CHART_X = 133
const CHART_Y = 386
const CHART_W = 837
const CHART_H = 295

export function Screen3() {
  return (
    <Frame>
      <Pin x={67} y={30} size={32} weight={900} color={TEAL} lh={40}>DATA CENTRE</Pin>
      <LiveBadge />

      {KPIS.map((k) => (
        <KpiCard key={k.label} x={k.x} y={k.y} w={k.w} label={k.label} value={k.value} grad={k.grad} />
      ))}

      <Panel x={42} y={250} w={958} h={555} />
      <Panel x={1011} y={250} w={869} h={555} />
      <Panel x={42} y={818} w={1838} h={229} grad={PANEL_BOTTOM_GRAD} />

      <ImgAt x={79} y={230} w={1764} h={2} src={dividerTop} />
      <Pin x={70} y={278} size={25} weight={700} color="#f2f5f5">CPU & MEMORY USED / TENANT AVERAGE</Pin>
      <Pin x={1050} y={278} size={25} weight={700} color="#f2f5f5">FULLEST DISK BY ZONE</Pin>
      <Pin x={802} y={342} size={19} weight={400} color="#34edda">CPU</Pin>
      <Pin x={890} y={342} size={19} weight={400} color="#7799ed">MEMORY</Pin>

      <ChartGrid x={133} y={439} w={837} rows={5} rowH={59} />

      {Y_AXIS.map((t) => (
        <Pin key={t.label} x={t.cx - 30} y={t.y} size={18} weight={400} color="#a4a7ae" w={60} lh={41} align="center">{t.label}</Pin>
      ))}

      {X_AXIS.map((cx, i) => (
        <Pin key={cx} x={cx - 24.5} y={695} size={18} weight={400} color="#a4a7ae" w={49} lh={40} align="center">{X_LABELS[i]}</Pin>
      ))}

      <MultiLineChart
        x={CHART_X}
        y={CHART_Y}
        w={CHART_W}
        h={CHART_H}
        yMax={100}
        series={[
          { color: "#7799ed", area: "#7799ed", values: MEM_SERIES },
          { color: TEAL, values: CPU_SERIES },
        ]}
      />

      {DISKS.map((row) => (
        <div key={row.label}>
          <Pin x={BAR_X} y={row.labelY} size={24} weight={400} color="#fff">{row.label}</Pin>
          <Pin x={1296} y={row.labelY} size={19} weight={400} color="#555">{row.sub}</Pin>
          <Pin x={1752} y={row.labelY - 3} size={23} weight={700} color="#e8f2f0" w={120} align="right">{row.value}</Pin>
          <ProgBarPct x={BAR_X} y={row.barY} trackW={BAR_TRACK_W} pct={row.pct} fill={TEAL_GRAD} />
        </div>
      ))}

      <Pin x={70} y={846} size={21} weight={700} color="#e8f2f0">BACKUP / NIGHTLY RUN</Pin>
      <ImgAt x={467} y={909} w={1} h={99} src={dividerV} />
      <ImgAt x={975} y={909} w={1} h={99} src={dividerV} />
      <ImgAt x={1467} y={909} w={1} h={99} src={dividerV} />

      {[
        { label: "Last successful", value: "03:14", x: 127 },
        { label: "Run duration", value: "1.5 h", x: 667, valueX: 682 },
        { label: "Failed jobs", value: "1", x: 1177, valueX: 1211 },
        { label: "Protected VMs", value: "57 / 58", x: 1666, valueX: 1673 },
      ].map((m) => (
        <div key={m.label}>
          <Pin x={m.x} y={920} size={20} weight={400} color="#8ba4a2">{m.label}</Pin>
          <Pin x={m.valueX ?? m.x} y={955} size={36} weight={700} color="#34edda" lh={36}>{m.value}</Pin>
        </div>
      ))}
    </Frame>
  )
}
