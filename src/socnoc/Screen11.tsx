import { ProgBarPct } from "./charts"
import { Frame, LiveBadge, Panel, Pin, TEAL, TEAL_GRAD } from "./ui"

type DbRow = {
  name: string
  engine: string
  nodes: string
  ha: string
  haSize?: number
  lag: string
  connPct: number
  txn: string
  diskPct: number
  y: number
  engineY: number
}

const DB_ROWS: DbRow[] = [
  { name: "HES DB", engine: "PostgreSQL 16", nodes: "2 / 2", ha: "Up", lag: "345 ms", connPct: 41.2, txn: "986/s", diskPct: 65.3, y: 233, engineY: 254 },
  { name: "MDM / WFM DB", engine: "PostgreSQL 16", nodes: "2 / 2", ha: "Up", lag: "852 ms", connPct: 58.6, txn: "1,397/s", diskPct: 54.1, y: 307, engineY: 328 },
  { name: "UFG DB", engine: "PostgreSQL 16 + TimescaleDB", nodes: "2 / 2", ha: "—", haSize: 22.8, lag: "613 ms", connPct: 25.0, txn: "138/s", diskPct: 62.4, y: 381, engineY: 402 },
  { name: "Gas Simulation DB", engine: "SQL Server", nodes: "2 / 2", ha: "—", haSize: 22.8, lag: "1.2 sec", connPct: 32.7, txn: "48.9/s", diskPct: 64.4, y: 455, engineY: 476 },
  { name: "GIS geodatabase", engine: "ArcGIS / SQL Server", nodes: "3 / 3", ha: "—", haSize: 22.8, lag: "448 ms", connPct: 36.3, txn: "96.4/s", diskPct: 38.2, y: 529, engineY: 550 },
]

const COL = {
  status: 61,
  cluster: 231,
  nodes: 517,
  ha: 660,
  lag: 809,
  conn: 1005,
  connBar: 1100,
  txn: 1310,
  disk: 1455,
  diskBar: 1565,
}

const BAR_W = 185

export function Screen11() {
  return (
    <Frame>
      <Pin x={67} y={30} size={32} weight={900} color={TEAL} lh={40}>DATABASES & PLATFORM SERVICES</Pin>
      <LiveBadge />

      <Panel x={42} y={90} w={1838} h={504} grad="linear-gradient(125deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />
      <Panel x={42} y={605} w={604} h={455} grad="linear-gradient(104deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />
      <Panel x={659} y={605} w={604} h={455} grad="linear-gradient(104deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />
      <Panel x={1276} y={605} w={604} h={455} grad="linear-gradient(104deg, rgba(48, 48, 48, 0.33) 0%, rgba(26, 26, 26, 0.33) 100%)" />

      <Pin x={69} y={112} size={25} weight={700} color="#f2f5f5">DATABASE CLUSTERS</Pin>
      {(["STATUS", "CLUSTER", "NODES UP", "HA PROXY", "REPLICATION LAG", "CONNECTIONS", "TRANSACTIONS / S", "DISK (FULLEST NODE)"] as const).map((h, i) => (
        <Pin key={h} x={[COL.status, COL.cluster, COL.nodes, COL.ha, COL.lag, COL.conn, COL.txn, COL.disk][i]} y={179} size={16.8} weight={400} color="#627173">{h}</Pin>
      ))}

      {DB_ROWS.map((row, i) => (
        <div key={row.name}>
          {i > 0 && <div className="at" style={{ left: 61, top: row.y - 15, width: 1798, height: 1, background: "#203333" }} />}
          <div className="at" style={{ left: 62, top: row.y + 6, width: 14, height: 14, borderRadius: 99, background: TEAL }} />
          <Pin x={92} y={row.y} size={19.2} weight={400} color="#89999a">OK</Pin>
          <Pin x={COL.cluster} y={row.y - 11} size={24} weight={700} color="#f2f5f5">{row.name}</Pin>
          <Pin x={COL.cluster} y={row.engineY} size={16.8} weight={400} color="#627173">{row.engine}</Pin>
          <Pin x={COL.nodes} y={row.y} size={24} weight={400} color="#e3eded" w={80} align="right">{row.nodes}</Pin>
          <Pin x={COL.ha} y={row.y + 2} size={row.haSize ?? 21.6} weight={400} color="#e3eded">{row.ha}</Pin>
          <Pin x={COL.lag} y={row.y + 2} size={21.6} weight={400} color="#e3eded" w={100} align="right">{row.lag}</Pin>
          <Pin x={COL.conn} y={row.y + 2} size={21.6} weight={400} color="#e3eded" w={80} align="right">{`${row.connPct}%`}</Pin>
          <ProgBarPct x={COL.connBar} y={row.y + 8} trackW={BAR_W} pct={row.connPct} fill={TEAL_GRAD} />
          <Pin x={COL.txn} y={row.y + 2} size={21.6} weight={400} color="#e3eded" w={100} align="right">{row.txn}</Pin>
          <Pin x={COL.disk} y={row.y + 2} size={21.6} weight={400} color="#e3eded" w={90} align="right">{`${row.diskPct}%`}</Pin>
          <ProgBarPct x={COL.diskBar} y={row.y + 8} trackW={BAR_W} pct={row.diskPct} fill={TEAL_GRAD} />
        </div>
      ))}

      <Pin x={72} y={660} size={25} weight={700} color="#f2f5f5">ACTIVE DIRECTORY / DNS</Pin>
      <Pin x={446} y={670} size={16.8} weight={400} color="#627173" w={200} align="right">SRV-AD-01, SRV-AD-02</Pin>
      <Pin x={72} y={757} size={19.2} weight={400} color={TEAL}>Domain controllers</Pin>
      <Pin x={72} y={784} size={43.2} weight={400} color="#d7e9e9">2 / 2</Pin>
      <Pin x={343} y={757} size={19.2} weight={400} color={TEAL}>DNS lookup</Pin>
      <Pin x={343} y={784} size={43.2} weight={400} color="#d7e9e9">3 ms</Pin>
      <Pin x={72} y={876} size={19.2} weight={400} color={TEAL}>Replication</Pin>
      <Pin x={72} y={903} size={43.2} weight={400} color="#d7e9e9">Up</Pin>

      <Pin x={688} y={660} size={25} weight={700} color="#f2f5f5">ELK LOGGING</Pin>
      <Pin x={1124} y={670} size={16.8} weight={400} color="#627173" w={120} align="right">SRV-ELK01-03</Pin>
      <Pin x={688} y={757} size={19.2} weight={400} color={TEAL}>Cluster</Pin>
      <Pin x={688} y={784} size={43.2} weight={400} color="#d7e9e9">Green</Pin>
      <Pin x={959} y={757} size={19.2} weight={400} color={TEAL}>Nodes</Pin>
      <Pin x={959} y={784} size={43.2} weight={400} color="#d7e9e9">3 / 3</Pin>
      <Pin x={688} y={876} size={19.2} weight={400} color={TEAL}>Disk used</Pin>
      <Pin x={688} y={903} size={43.2} weight={400} color="#d7e9e9">73.9%</Pin>
      <Pin x={959} y={876} size={19.2} weight={400} color={TEAL}>Indexing</Pin>
      <Pin x={959} y={903} size={43.2} weight={400} color="#d7e9e9">3,508/s</Pin>

      <Pin x={1306} y={660} size={25} weight={700} color="#f2f5f5">CENTRAL NGINX</Pin>
      <Pin x={1744} y={670} size={16.8} weight={400} color="#627173" w={100} align="right">SRV-NGINX01</Pin>
      <Pin x={1306} y={757} size={19.2} weight={400} color={TEAL}>Requests</Pin>
      <Pin x={1306} y={784} size={43.2} weight={400} color="#d7e9e9">193/s</Pin>
      <Pin x={1577} y={757} size={19.2} weight={400} color={TEAL}>5xx rate</Pin>
      <Pin x={1577} y={784} size={43.2} weight={400} color="#d7e9e9">0.2%</Pin>
      <Pin x={1306} y={876} size={19.2} weight={400} color={TEAL}>Connections</Pin>
      <Pin x={1306} y={903} size={43.2} weight={400} color="#d7e9e9">214</Pin>
    </Frame>
  )
}
