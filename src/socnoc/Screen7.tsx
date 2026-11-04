import { ProgBarPct, Sparkline } from "./charts"
import { Frame, KPI_GRAD_ALT, KpiCard, LiveBadge, Panel, Pin, TEAL } from "./ui"

const KPI_X = [42, 350, 658, 967, 1275, 1583]

const CPU_BAR_X = 545.1
const CPU_TRACK_W = 97.9
const MEM_BAR_X = 747.1
const MEM_TRACK_W = 99.8
const BAR_H = 11
const SPARK_X = 1215
const SPARK_W = 286.1

type FwRow = {
  name: string
  sub: string
  nameY: number
  subY: number
  statusY: number
  dotY: number
  barY: number
  sparkY: number
  sparkH: number
  cpuPct: number
  memPct: number
  sessions?: string
  inOut: string
  vpn: string
  uptime: string
  ips: string
  spark: number[]
}

const FW_ROWS: FwRow[] = [
  {
    name: "FW-GLOBAL-01",
    sub: "Edge (uplinks)",
    nameY: 394,
    subY: 422,
    statusY: 405,
    dotY: 407.1,
    barY: 410,
    sparkY: 404,
    sparkH: 22.2,
    cpuPct: 25.4,
    memPct: 53.7,
    inOut: "193 / 131",
    vpn: "2/2",
    uptime: "38 d",
    ips: "162",
    spark: [42, 58, 52, 68, 62, 75, 70, 78, 72, 80, 85, 82, 88, 84, 90, 86, 92, 88, 94, 90],
  },
  {
    name: "ZONE_ADMIN_FW",
    sub: "Admin & shared",
    nameY: 460,
    subY: 488.1,
    statusY: 471,
    dotY: 473,
    barY: 476,
    sparkY: 471,
    sparkH: 21.6,
    cpuPct: 16.3,
    memPct: 47.0,
    sessions: "5,383",
    inOut: "39 / 58",
    vpn: "—",
    uptime: "41 d",
    ips: "6",
    spark: [28, 32, 30, 35, 33, 38, 36, 40, 38, 42, 40, 44, 42, 46, 44, 48, 46, 50, 48, 52],
  },
  {
    name: "ZONE_GAS_SIM_FW",
    sub: "Gas Sim / UFG",
    nameY: 526,
    subY: 554,
    statusY: 537,
    dotY: 539,
    barY: 542.1,
    sparkY: 537,
    sparkH: 21,
    cpuPct: 6.6,
    memPct: 42.7,
    sessions: "1,477",
    inOut: "9 / 7",
    vpn: "—",
    uptime: "103 d",
    ips: "0",
    spark: [12, 14, 13, 15, 14, 16, 15, 17, 16, 18, 17, 19, 18, 20, 19, 21, 20, 22, 21, 23],
  },
  {
    name: "ZONE_HES_FW",
    sub: "HES",
    nameY: 591.9,
    subY: 620,
    statusY: 603,
    dotY: 605,
    barY: 608,
    sparkY: 603,
    sparkH: 21.2,
    cpuPct: 17.1,
    memPct: 46.6,
    sessions: "9,673",
    inOut: "62 / 46",
    vpn: "—",
    uptime: "58 d",
    ips: "9",
    spark: [55, 60, 58, 65, 62, 68, 66, 72, 70, 75, 73, 78, 76, 80, 78, 82, 80, 85, 83, 88],
  },
  {
    name: "ZONE_MDM-WFM_FW",
    sub: "MDM / WFM",
    nameY: 658,
    subY: 686,
    statusY: 669,
    dotY: 671,
    barY: 675,
    sparkY: 669,
    sparkH: 23.1,
    cpuPct: 12.9,
    memPct: 44.9,
    sessions: "7,459",
    inOut: "47 / 43",
    vpn: "—",
    uptime: "54 d",
    ips: "4",
    spark: [38, 42, 40, 45, 43, 48, 46, 50, 48, 52, 50, 54, 52, 56, 54, 58, 56, 60, 58, 62],
  },
  {
    name: "ZONE-GIS-FW",
    sub: "GIS",
    nameY: 724,
    subY: 752,
    statusY: 735,
    dotY: 737,
    barY: 741,
    sparkY: 735,
    sparkH: 23,
    cpuPct: 13.5,
    memPct: 45.0,
    sessions: "3,227",
    inOut: "37 / 22",
    vpn: "—",
    uptime: "33 d",
    ips: "0",
    spark: [22, 26, 24, 28, 26, 30, 28, 32, 30, 34, 32, 36, 34, 38, 36, 40, 38, 42, 40, 44],
  },
]

function StatusDot({ y }: { y: number }) {
  return (
    <div
      className="at"
      style={{
        left: 62,
        top: y,
        width: 18,
        height: 18,
        borderRadius: "50%",
        background: TEAL,
      }}
    />
  )
}

export function Screen7() {
  return (
    <Frame>
      <LiveBadge />
      <Pin x={67.0} y={30.0} size={32.0} weight={900} color={TEAL} lh={40}>NETWORK · FORTIGATE</Pin>

      <KpiCard x={KPI_X[0]} y={76} label="Firewalls up" value="6 / 6" hint={"of the\nFortiGate VMs"} />
      <KpiCard x={KPI_X[1]} y={75} label="Sessions" value="65.1K" grad={KPI_GRAD_ALT} />
      <KpiCard
        x={KPI_X[2]}
        y={75}
        label="Throughput"
        value={
          <>
            695{" "}
            <span style={{ fontSize: 40, fontWeight: 400 }}>Mbit/s</span>
          </>
        }
      />
      <KpiCard x={KPI_X[3]} y={75} label="IPsec tunnels up" value="2 / 2" hint="site-to-site" />
      <KpiCard x={KPI_X[4]} y={75} label="Threats blocked" value="181" hint={"IPS,\nlast 24 h"} />
      <KpiCard x={KPI_X[5]} y={75} label="FortiAnalyzer / Manager" value="2 / 2" hint="up" />

      <div className="at" style={{ left: 79, top: 230, width: 1764, height: 1, background: "#252b2b" }} />

      <Panel x={42.0} y={250.0} w={1838.0} h={560.0} grad="linear-gradient(122.13796892683153deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />
      <Pin x={62.0} y={280.0} size={25.0} weight={700} color="#f2f5f5" w={131.9}>FIREWALLS</Pin>
      <Pin x={62.0} y={348.9} size={16.0} weight={400} color="#647574" w={58.0}>STATUS</Pin>
      <Pin x={190.1} y={348.9} size={16.0} weight={400} color="#647574" w={73.9}>FIREWALL</Pin>
      <Pin x={461.0} y={348.9} size={16.0} weight={400} color="#647574" w={30.9}>CPU</Pin>
      <Pin x={663.0} y={348.9} size={16.0} weight={400} color="#647574" w={68.0}>MEMORY</Pin>
      <Pin x={905.1} y={348.9} size={16.0} weight={400} color="#647574" w={73.9}>SESSIONS</Pin>
      <Pin x={1045.1} y={348.9} size={16.0} weight={400} color="#647574" w={121.0}>IN / OUT, MBIT/S</Pin>
      <Pin x={1213.1} y={348.9} size={16.0} weight={400} color="#647574" w={105.0}>THROUGHPUT</Pin>
      <Pin x={1565.0} y={348.9} size={16.0} weight={400} color="#647574" w={32.1}>VPN</Pin>
      <Pin x={1662.0} y={348.9} size={16.0} weight={400} color="#647574" w={58.0}>UPTIME</Pin>
      <Pin x={1800.0} y={348.9} size={16.0} weight={400} color="#647574" w={62.0}>IPS 24 H</Pin>

      {FW_ROWS.map((row) => (
        <div key={row.name}>
          <Pin x={190.1} y={row.nameY} size={23.0} weight={700} color="#f0f2f1" w={230}>{row.name}</Pin>
          <Pin x={190.1} y={row.subY} size={17.0} weight={400} color="#657776">{row.sub}</Pin>
          <Pin x={91.0} y={row.statusY} size={20.0} weight={400} color="#8fa3a0">Up</Pin>
          <StatusDot y={row.dotY} />
          <Pin x={461.0} y={row.barY - 7} size={21.0} weight={400} color="#dce8e7" w={57.0}>{row.cpuPct}%</Pin>
          <Pin x={663.0} y={row.barY - 7} size={21.0} weight={400} color="#dce8e7" w={57.0}>{row.memPct}%</Pin>
          {row.sessions != null && (
            <Pin x={905.1} y={row.barY - 7} size={21.0} weight={400} color="#dce8e7" w={51.8} align="right">{row.sessions}</Pin>
          )}
          <Pin x={1045.1} y={row.barY - 7} size={21.0} weight={400} color="#dce8e7" w={89.9} align="right">{row.inOut}</Pin>
          <Pin x={1565.0} y={row.barY - 7} size={21.0} weight={400} color="#dce8e7" w={33.0} align="center">{row.vpn}</Pin>
          <Pin x={1662.0} y={row.barY - 7} size={21.0} weight={400} color="#dce8e7" w={41.1}>{row.uptime}</Pin>
          <Pin x={1800.0} y={row.barY - 7} size={21.0} weight={400} color="#dce8e7" w={35.9} align="center">{row.ips}</Pin>
          <ProgBarPct x={CPU_BAR_X} y={row.barY} trackW={CPU_TRACK_W} pct={row.cpuPct} h={BAR_H} />
          <ProgBarPct x={MEM_BAR_X} y={row.barY} trackW={MEM_TRACK_W} pct={row.memPct} h={BAR_H} />
          <Sparkline x={SPARK_X} y={row.sparkY} w={SPARK_W} h={row.sparkH} values={row.spark} />
        </div>
      ))}

      <Panel x={42.0} y={819.0} w={1123.0} h={235.0} grad="linear-gradient(132.44845500977448deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />
      <Panel x={1172.0} y={819.0} w={708.0} h={235.0} grad="linear-gradient(119.97042491512431deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />
      <Pin x={60.1} y={853.0} size={25.0} weight={700} color="#f2f5f5" w={223.9}>INTERFACES DOWN</Pin>
      <Pin x={1217.1} y={853.0} size={25.0} weight={700} color="#f2f5f5" w={295.9}>FORTINET MANAGEMENT</Pin>
      <Pin x={1219.0} y={908.0} size={19.0} weight={400} color="#34efde" w={111.9}>FortiAnalyzer</Pin>
      <Pin x={1714.0} y={908.0} size={19.0} weight={400} color="#34efde" w={114.0}>FortiManager</Pin>
      <Pin x={447.0} y={925.0} size={22.0} weight={900} color="#34efde" w={338.1}>ALL MONITORED INTERFACES UP</Pin>
      <Pin x={1219.0} y={935.0} size={43.0} weight={400} color="#dce8e7" w={53.0}>Up</Pin>
      <Pin x={1714.0} y={935.0} size={43.0} weight={400} color="#dce8e7" w={53.0}>Up</Pin>
      <Pin x={1219.0} y={996.0} size={16.0} weight={400} color="#657574" w={173.0}>SRV-FORTIANALYZER01</Pin>
      <Pin x={1714.0} y={996.0} size={16.0} weight={400} color="#657574" w={121.0}>SRV-FortiMNG01</Pin>
    </Frame>
  )
}
