import { Frame, KPI_GRAD_ALT, KpiCard, LiveBadge, Panel, Pin, TEAL, TEAL_GRAD, TRACK } from "./ui"

const PANEL_MAIN_GRAD = "linear-gradient(126.01deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)"
const VDC_CPU_GRAD = "linear-gradient(to bottom, rgba(0,0,0,0) 71.104%, #f2c45d 122.31%)"

const KPIS: {
  x: number
  y: number
  w: number
  label: string
  value: string
  accent?: string
  grad?: string
}[] = [
  { x: 42, y: 76, w: 297, label: "Monitored VMs", value: "66" },
  { x: 350, y: 75, w: 297, label: "Powered on", value: "66", grad: KPI_GRAD_ALT },
  { x: 658, y: 75, w: 297, label: "Reachable", value: "66" },
  { x: 967, y: 75, w: 297, label: "Agents reporting", value: "58" },
  { x: 1275, y: 75, w: 297, label: "VDC CPU allocation", value: "93.8%", accent: "#f2c45d", grad: VDC_CPU_GRAD },
  { x: 1583, y: 75, w: 297, label: "VDC memory allocation", value: "84.6%" },
]

type ZoneRow = {
  zone: string
  vms: number
  powered: number
  reachable: number
  agents: number | string
  cpu: number | null
  mem: number | null
  y: number
  barY: number
  vmsCx: number
}

const ZONES: ZoneRow[] = [
  { zone: "Admin & shared", vms: 10, powered: 10, reachable: 10, agents: 10, cpu: 23.4, mem: 52.1, y: 374, barY: 383, vmsCx: 478 },
  { zone: "HES", vms: 13, powered: 13, reachable: 13, agents: 13, cpu: 30.9, mem: 56.1, y: 429, barY: 438, vmsCx: 478 },
  { zone: "MDM / WFM", vms: 14, powered: 14, reachable: 14, agents: 14, cpu: 32.1, mem: 52.4, y: 484, barY: 494, vmsCx: 478 },
  { zone: "GIS", vms: 11, powered: 11, reachable: 11, agents: 11, cpu: 32.7, mem: 56.5, y: 539, barY: 549, vmsCx: 478 },
  { zone: "Gas Sim / UFG", vms: 10, powered: 10, reachable: 10, agents: 10, cpu: 38.7, mem: 57.4, y: 594, barY: 604, vmsCx: 478 },
  { zone: "Network", vms: 8, powered: 8, reachable: 8, agents: 0, cpu: null, mem: null, y: 649, barY: 659, vmsCx: 485 },
]

const COL_HEADERS: { label: string; x: number }[] = [
  { label: "ZONE", x: 62 },
  { label: "VMS", x: 462 },
  { label: "POWERED ON", x: 560 },
  { label: "REACHABLE", x: 754 },
  { label: "AGENTS", x: 950 },
  { label: "CPU AVG", x: 1052 },
  { label: "MEMORY AVG", x: 1470 },
]

const CPU_BAR_X = 1136
const MEM_BAR_X = 1545
const ZONE_BAR_TRACK = 310

function ZoneBar({ x, y, trackW, pct, fillGrad = TEAL_GRAD }: { x: number; y: number; trackW: number; pct: number; fillGrad?: string }) {
  const fillW = (pct / 100) * trackW
  return (
    <>
      <div className="at" style={{ left: x, top: y, width: trackW, height: 12, borderRadius: 50, background: TRACK }} />
      <div className="at" style={{ left: x, top: y, width: fillW, height: 12, borderRadius: 38, background: fillGrad, maxWidth: trackW }} />
    </>
  )
}

type TopRow = { name: string; pct: number; color: string; fill: string; nameY: number; barY: number }

const TOP_CPU: TopRow[] = [
  { name: "SRV-UFG-APP02", pct: 95, color: "#f18064", fill: "linear-gradient(to right, #a85a45, #eb8a77)", nameY: 833, barY: 872 },
  { name: "SRV-HES-APP01", pct: 52, color: "#35e5d6", fill: TEAL_GRAD, nameY: 904, barY: 943 },
  { name: "SRV-UFG-APP01", pct: 50.1, color: "#35e5d6", fill: TEAL_GRAD, nameY: 975, barY: 1013 },
]

const TOP_MEM: TopRow[] = [
  { name: "SRV-ELK03", pct: 80, color: "#f2c45d", fill: "linear-gradient(to right, #a88a45, #f2c45d)", nameY: 829, barY: 868 },
  { name: "SRV-ELK02", pct: 78.1, color: "#35e5d6", fill: TEAL_GRAD, nameY: 900, barY: 939 },
  { name: "SRV-ELK01", pct: 77.9, color: "#35e5d6", fill: TEAL_GRAD, nameY: 971, barY: 1009 },
]

const TOP_DISK: TopRow[] = [
  { name: "SRV-ELK02", pct: 74.2, color: "#35e5d6", fill: TEAL_GRAD, nameY: 833, barY: 872 },
  { name: "SRV-ELK01", pct: 73.9, color: "#35e5d6", fill: TEAL_GRAD, nameY: 904, barY: 943 },
  { name: "SRV-ELK03", pct: 73.6, color: "#35e5d6", fill: TEAL_GRAD, nameY: 975, barY: 1013 },
]

function fmtPct(pct: number) {
  return `${Number.isInteger(pct) ? pct.toFixed(1) : pct}%`
}

function TopPanel({
  title, titleX, titleY, rows, barX, barW, pctX,
}: {
  title: string
  titleX: number
  titleY: number
  rows: TopRow[]
  barX: number
  barW: number
  pctX: number
}) {
  return (
    <>
      <Pin x={titleX} y={titleY} size={21} weight={700} color="#e8f2f0">{title}</Pin>
      {rows.map((row) => (
        <div key={row.name}>
          <Pin x={titleX} y={row.nameY} size={22.8} weight={400} color="#e6eded">{row.name}</Pin>
          <Pin x={pctX} y={row.nameY} size={22.8} weight={400} color={row.color} w={62} align="right">{fmtPct(row.pct)}</Pin>
          <div className="at" style={{ left: barX, top: row.barY, width: barW, height: 12, borderRadius: 50, background: TRACK }} />
          <div className="at" style={{ left: barX, top: row.barY, width: (row.pct / 100) * barW, height: 12, borderRadius: 38, background: row.fill, maxWidth: barW }} />
        </div>
      ))}
    </>
  )
}

export function Screen4() {
  return (
    <Frame>
      <Pin x={67} y={30} size={32} weight={900} color={TEAL} lh={40}>VM FLEET & TENANT CAPACITY</Pin>
      <LiveBadge />

      {KPIS.map((k) => (
        <KpiCard
          key={k.label}
          x={k.x}
          y={k.y}
          w={k.w}
          label={k.label}
          value={k.value}
          accent={k.accent}
          grad={k.grad}
        />
      ))}

      <Panel x={42} y={250} w={1838} h={484} grad={PANEL_MAIN_GRAD} />
      <Panel x={42} y={756} w={603} h={291} />
      <Panel x={660} y={756} w={602} h={291} />
      <Panel x={1277} y={756} w={603} h={291} />

      <div className="at" style={{ left: 79, top: 230, width: 1764, height: 1, background: "#252b2b" }} />
      <Pin x={70} y={278} size={25} weight={700} color="#f2f5f5">BY ZONE</Pin>

      {COL_HEADERS.map((col) => (
        <Pin key={col.label} x={col.x} y={328} size={16.8} weight={400} color="#607171">{col.label}</Pin>
      ))}

      <div className="at" style={{ left: 62, top: 360, width: 1800, height: 1, background: "#203333" }} />

      {ZONES.map((row, i) => (
        <div key={row.zone}>
          {i > 0 && <div className="at" style={{ left: 62, top: row.y - 14, width: 1800, height: 1, background: "#203333" }} />}
          <Pin x={62} y={row.y} size={22.8} weight={700} color="#f1f2f2">{row.zone}</Pin>
          <Pin x={row.vmsCx - 20} y={row.y} size={22.8} weight={400} color="#e6eded" w={40} align="center">{row.vms}</Pin>
          <Pin x={661 - 20} y={row.y} size={22.8} weight={400} color="#e6eded" w={40} align="center">{row.powered}</Pin>
          <Pin x={841 - 20} y={row.y} size={22.8} weight={400} color="#e6eded" w={40} align="center">{row.reachable}</Pin>
          <Pin x={998 - 20} y={row.y} size={22.8} weight={400} color="#e6eded" w={40} align="center">{row.agents}</Pin>
          {row.cpu != null ? (
            <>
              <Pin x={1052} y={row.y + 1} size={21.6} weight={400} color="#e6eded">{`${row.cpu}%`}</Pin>
              <ZoneBar x={CPU_BAR_X} y={row.barY} trackW={ZONE_BAR_TRACK} pct={row.cpu} />
            </>
          ) : (
            <Pin x={1052} y={row.y + 1} size={21.6} weight={400} color="#657777">—</Pin>
          )}
          {row.mem != null ? (
            <>
              <Pin x={1470} y={row.y + 1} size={21.6} weight={400} color="#e6eded">{`${row.mem}%`}</Pin>
              <ZoneBar x={MEM_BAR_X} y={row.barY} trackW={ZONE_BAR_TRACK} pct={row.mem} />
            </>
          ) : (
            <Pin x={1470} y={row.y + 1} size={21.6} weight={400} color="#657777">—</Pin>
          )}
        </div>
      ))}

      <TopPanel title="TOP CPU" titleX={72} titleY={777} rows={TOP_CPU} barX={72} barW={545} pctX={553} />
      <TopPanel title="TOP MEMORY" titleX={687} titleY={773} rows={TOP_MEM} barX={687} barW={545} pctX={1168} />
      <TopPanel title="TOP DISK" titleX={1307} titleY={777} rows={TOP_DISK} barX={1307} barW={545} pctX={1788} />
    </Frame>
  )
}
