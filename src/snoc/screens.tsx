import { useState } from "react"
import { useDash } from "./dashboard"
import { clock, fmt, SOURCE_NAME, TONE_COLOR, type Tone } from "./format"
import { AreaChart, BarRow, Chip, Plate, Ribbon, RIBBON, Stage, Stat, Title } from "./ui"

const IFACES: [string, string, string][] = [
  ["mdm", "billing", "MDMS → Billing"],
  ["hes", "mdm", "HES → MDMS"],
  ["mdm", "gis", "MDMS → GIS"],
  ["billing", "portal", "Billing → Portal"],
  ["crm", "mfs", "CRM → MFS"],
  ["ai", "platform", "AI → Platform"],
]

const LOADS: [string, string][] = [
  ["dc.cpu", "CPU"],
  ["dc.memory", "Memory"],
  ["dc.storage", "Storage"],
  ["dc.network", "Network"],
  ["dc.database_load", "Database"],
]

const FRESH: [string, string][] = [
  ["meter_data", "Meter Data"],
  ["billing_sync", "Billing Sync"],
  ["gis_sync", "GIS Sync"],
  ["ai_model_input", "AI Model Input"],
]

const TYPES: [string, string, "offline" | "battery"][] = [
  ["smart_meter", "Smart Meters", "offline"],
  ["evc", "EVC", "battery"],
  ["sensor", "Sensors", "offline"],
  ["gateway", "Gateways", "offline"],
  ["concentrator", "Concentrators", "offline"],
]

const FAILS: [string, string][] = [
  ["smart_meter", "Smart Meters"],
  ["regulator", "Regulators"],
  ["evc", "EVC"],
  ["gateway", "Gateways"],
  ["sensor", "Sensors"],
]

const FLOWS: { process: string; label: string; parts: [string, string][] }[] = [
  { process: "billing", label: "Billing", parts: [["mdm", "MDMS"], ["integration_layer", "Integration Layer"], ["database", "Database"]] },
  { process: "field_operations", label: "Field Operations", parts: [["crm", "CRM"], ["mfs", "MFS / WEM"], ["gis", "GIS"], ["communication", "Communication"]] },
  { process: "customer_portal", label: "Customer Portal", parts: [["billing", "Billing"], ["crm", "CRM"], ["api_layer", "API Layer"]] },
  { process: "ufg_analysis", label: "UFG Analysis", parts: [["mdm", "MDMS"], ["gis", "GIS"], ["data_quality", "Data Quality"], ["ai_engine", "AI Engine"]] },
]

const SEV = [
  ["critical", "Critical", "#eb7d5c"],
  ["high", "High", "#f0a06a"],
  ["medium", "Medium", "#f3c85b"],
  ["low", "Low", "#34efde"],
] as const

const RISK: [string, string][] = [
  ["application", "Applications"],
  ["communication", "Communication"],
  ["security", "SOC"],
  ["data_centre", "Data Centre"],
  ["integration", "Integrations"],
]

function paren(text: string) {
  return text === "—" ? "" : `(${text})`
}

function fullCount(value: number | null) {
  return value === null ? "—" : Math.round(value).toLocaleString("en-US")
}

function chartTarget(points: [number, number][], target: number | null) {
  if (target == null) return null
  const peak = Math.max(0, ...points.map((point) => point[1]))
  if (peak > 0 && target > peak * 20) return target / 1000
  return target
}

function Snoc1() {
  const { read } = useDash()
  const kpis: [string, string][] = [
    ["int.integration_success", "Integration Success"],
    ["int.api_success", "API Success"],
    ["int.failed_transactions", "Failed Transactions"],
    ["int.avg_latency", "Average Latency"],
    ["int.delayed_interfaces", "Delayed Interfaces"],
    ["int.critical_failures", "Critical Failures"],
  ]
  const dc: [string, string][] = [
    ["dc.dci_health", "DCI Health"],
    ["dc.infra_availability", "Infrastructure Availability"],
    ["dc.database_health", "Database Health"],
    ["dc.storage_utilization", "Storage Utilization"],
    ["dc.backup_success", "Backup Success"],
    ["dc.dr_readiness", "DR Readiness"],
  ]
  const backupTone = read("dc.failed_backup_jobs").tone
  const storageTone = read("dc.storage").tone
  const infra = read("dc.infra_alerts")
  return (
    <Stage>
      <Title>INTEGRATION HEALTH</Title>
      <div className="kpis n6">
        {kpis.map(([key, label]) => {
          const item = read(key)
          return <Stat key={key} label={label} text={item.text} tone={item.tone} />
        })}
      </div>
      <div className="snoc-split snoc-grow">
        <Plate title="INTEGRATION PERFORMANCE" hint="Success rate by interface">
          <div className="snoc-stack">
            {IFACES.map(([client, server, label]) => {
              const item = read("int.matrix", { client, server })
              return <BarRow key={label} label={label} text={item.text} ratio={item.value ?? 0} tone={item.tone} />
            })}
          </div>
        </Plate>
        <Plate title="PLATFORM OPERATIONS">
          <div className="snoc-quad">
            {(
              [
                ["diag.coverage", "Monitoring coverage"],
                ["diag.active_jobs", "Active jobs"],
                ["diag.failed_jobs", "Failed jobs"],
                ["diag.sla", "SLA compliance"],
              ] as [string, string][]
            ).map(([key, label]) => {
              const item = read(key)
              return (
                <div key={key}>
                  <span>{label}</span>
                  <b style={{ color: item.tone === "bad" || item.tone === "warn" ? TONE_COLOR[item.tone] : "#fff" }}>{item.text}</b>
                </div>
              )
            })}
          </div>
        </Plate>
        <Plate title="ATTENTION REQUIRED">
          <div className="snoc-lines">
            {(
              [
                ["int.delayed_interfaces", "Delayed interfaces"],
                ["diag.critical_patches", "Critical patches"],
                ["diag.failed_jobs", "Failed jobs"],
              ] as [string, string][]
            ).map(([key, label]) => {
              const item = read(key)
              return (
                <div key={key}>
                  <span>{label}</span>
                  <b style={{ color: "#eb7d5c" }}>{item.text}</b>
                </div>
              )
            })}
          </div>
        </Plate>
      </div>
      <Title>DATA CENTRE HEALTH</Title>
      <div className="kpis n6">
        {dc.map(([key, label]) => {
          const item = read(key)
          return <Stat key={key} label={label} text={item.text} tone={item.tone} />
        })}
      </div>
      <div className="snoc-split snoc-grow">
        <Plate title="RESOURCE UTILIZATION">
          <div className="snoc-stack">
            {LOADS.map(([key, label]) => {
              const item = read(key)
              return <BarRow key={key} label={label} text={item.text} ratio={item.value ?? 0} tone={item.tone} />
            })}
          </div>
        </Plate>
        <Plate title="BACKUP & RECOVERY">
          <div className="snoc-quad">
            {(
              [
                ["dc.last_backup", "Last backup"],
                ["dc.failed_backup_jobs", "Failed backup jobs"],
                ["dc.rpo", "RPO"],
                ["dc.rto", "RTO"],
              ] as [string, string][]
            ).map(([key, label]) => {
              const item = read(key)
              return (
                <div key={key}>
                  <span>{label}</span>
                  <b style={{ color: item.tone === "bad" || item.tone === "warn" ? TONE_COLOR[item.tone] : "#fff" }}>{item.text}</b>
                </div>
              )
            })}
          </div>
        </Plate>
        <Plate title="INFRASTRUCTURE STATUS">
          <div className="snoc-lines">
            <Status label="Backup" text={backupTone === "bad" || backupTone === "warn" ? "Attention required" : "Normal"} tone={backupTone} />
            <Status label="Storage" text={storageTone === "ok" ? "Normal" : "Attention"} tone={storageTone} />
            <Status label="Infrastructure" text={(infra.value ?? 0) === 0 ? "Stable" : "Attention"} tone={(infra.value ?? 0) === 0 ? "ok" : "bad"} />
          </div>
        </Plate>
      </div>
    </Stage>
  )
}

function Status({ label, text, tone }: { label: string; text: string; tone: Tone }) {
  return (
    <div>
      <span>{label}</span>
      <b>
        <i className="snoc-dot" style={{ background: TONE_COLOR[tone === "none" ? "ok" : tone] }} />
        {text}
      </b>
    </div>
  )
}

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function Snoc2() {
  const today = new Date()
  const [cursor, setCursor] = useState({ y: today.getFullYear(), m: today.getMonth() })
  const [picked, setPicked] = useState<Date>(today)
  const first = new Date(cursor.y, cursor.m, 1)
  const pad = (first.getDay() + 6) % 7
  const count = new Date(cursor.y, cursor.m + 1, 0).getDate()
  const cells: (number | null)[] = [...Array(pad).fill(null)]
  for (let day = 1; day <= count; day++) cells.push(day)
  while (cells.length % 7) cells.push(null)
  const same = (day: number) => picked.getFullYear() === cursor.y && picked.getMonth() === cursor.m && picked.getDate() === day
  function shift(delta: number) {
    const next = new Date(cursor.y, cursor.m + delta, 1)
    setCursor({ y: next.getFullYear(), m: next.getMonth() })
  }
  return (
    <Stage frame={false} className="snoc-center">
      <div className="snoc-cal">
        <div className="snoc-cal-kicker">DATE SELECTION</div>
        <p>Choose a date, month, year or range</p>
        <div className="snoc-cal-tabs">
          <span>Day</span>
          <span>Month</span>
          <span>Year</span>
          <span className="is-on">Date Range</span>
        </div>
        <div className="snoc-cal-nav">
          <button type="button" onClick={() => shift(-1)} aria-label="Previous month">‹</button>
          <strong>
            {MONTHS[cursor.m]} {cursor.y}
          </strong>
          <button type="button" onClick={() => shift(1)} aria-label="Next month">›</button>
        </div>
        <div className="snoc-cal-grid">
          {WEEK.map((name) => (
            <span key={name} className="snoc-cal-dow">
              {name}
            </span>
          ))}
          {cells.map((day, index) =>
            day ? (
              <button key={index} type="button" className={same(day) ? "is-on" : ""} onClick={() => setPicked(new Date(cursor.y, cursor.m, day))}>
                {day}
              </button>
            ) : (
              <span key={index} />
            ),
          )}
        </div>
        <div className="snoc-cal-kicker is-split">QUICK SELECT</div>
        <p>Common time periods</p>
        <div className="snoc-cal-quick">
          <button
            type="button"
            className="is-on"
            onClick={() => {
              const now = new Date()
              setPicked(now)
              setCursor({ y: now.getFullYear(), m: now.getMonth() })
            }}
          >
            Now
          </button>
          <button
            type="button"
            onClick={() => {
              const day = new Date()
              day.setDate(day.getDate() - 1)
              setPicked(day)
              setCursor({ y: day.getFullYear(), m: day.getMonth() })
            }}
          >
            Yesterday
          </button>
          <button type="button">Custom Date</button>
        </div>
      </div>
    </Stage>
  )
}

function Snoc3() {
  const { alerts } = useDash()
  const rows = [...alerts].sort((a, b) => b.starts - a.starts).slice(0, 6)
  const count = (name: string) => alerts.filter((alert) => (alert.severity || "low") === name).length
  const info = alerts.filter((alert) => alert.severity === "low" || alert.severity === "info").length
  const cards: [string, string, Tone][] = [
    ["Total events", String(alerts.length).padStart(2, "0"), "ok"],
    ["Critical", String(count("critical")).padStart(2, "0"), "bad"],
    ["High", String(count("high")).padStart(2, "0"), "warn"],
    ["Information", String(info).padStart(2, "0"), "ok"],
  ]
  const tick: Record<string, string> = { critical: "#e07a55", high: "#e0a45c", medium: "#f3c85b", low: "#34efde", info: "#34efde" }
  const dist: [string, number, Tone][] = [
    ["Critical", count("critical"), "bad"],
    ["High", count("high"), "warn"],
    ["Info", info, "ok"],
  ]
  const max = Math.max(1, ...dist.map((item) => item[1]))
  return (
    <Stage className="is-feed">
      <Title stack hint="Live operational event overview · Latest reported events">DIGITAL EVENTS FEED</Title>
      <div className="kpis n4">
        {cards.map(([label, text]) => (
          <Stat key={label} label={label} text={text} />
        ))}
      </div>
      <div className="snoc-feed snoc-grow">
        <Plate title="RECENT EVENTS" extra={<span className="snoc-hint">TIME / SEVERITY</span>}>
          <div className="snoc-events">
            {rows.map((alert, index) => {
              const sev = alert.severity || "low"
              return (
                <div key={`${alert.starts}-${index}`} className={`is-${sev}`}>
                  <i style={{ background: tick[sev] || "#34efde" }} />
                  <b>{clock(alert.starts)}</b>
                  <span>{alert.summary || alert.name}</span>
                  <Chip tone={sev}>{sev === "info" || sev === "low" ? "INFO" : sev.toUpperCase()}</Chip>
                </div>
              )
            })}
            {!rows.length && <p className="snoc-hint">No active events</p>}
          </div>
        </Plate>
        <div className="snoc-col">
          <Plate title="SEVERITY DISTRIBUTION">
            <div className="snoc-stack">
              {dist.map(([label, value, tone]) => (
                <BarRow key={label} label={label} text={String(value).padStart(2, "0")} ratio={value / max} tone={tone} />
              ))}
            </div>
          </Plate>
          <Plate title="OPERATIONAL ATTENTION">
            <p className="snoc-attn">
              <b>{count("critical")}</b> events marked Critical
            </p>
            <p className="snoc-attn is-warn">
              <b>{count("high")}</b> High-priority escalation
            </p>
            <p className="snoc-hint">Severity reflects source feed labels</p>
          </Plate>
        </div>
      </div>
      <div className="snoc-foot-row">
        <span>CCC OVERVIEW / STATIC EVENT SNAPSHOT</span>
        <span>SOURCE STATUS: AS REPORTED</span>
      </div>
    </Stage>
  )
}

function Snoc4() {
  const { read } = useDash()
  const kpis: [string, string][] = [
    ["comm.success", "Communication Success"],
    ["comm.online_devices", "Online Devices"],
    ["comm.offline_devices", "Offline Devices"],
    ["comm.gateway_availability", "Gateway Availability"],
    ["comm.packet_loss", "Packet Loss"],
    ["comm.avg_latency", "Average Latency"],
  ]
  const received = read("reads.received")
  const validated = read("reads.validated")
  const share = received.value && validated.value !== null ? validated.value / received.value : 0
  const failed = read("reads.failed")
  const estimated = read("reads.estimated")
  const steps: [string, string, Tone][] = [
    ["reads.received", "Received", read("reads.received").tone],
    ["reads.validated", "Validated", read("reads.validated").tone],
    ["reads.failed", "Failed", (failed.value ?? 0) > 0 ? "bad" : "ok"],
    ["reads.estimated", "Estimated", (estimated.value ?? 0) > 0.01 ? "warn" : "ok"],
    ["reads.vee_success", "VEE Success", read("reads.vee_success").tone],
  ]
  const diags: [string, string, number][] = [
    ["reads.vee_success", "VEE Success", read("reads.vee_success").value ?? 0],
    ["reads.failed", "Failed Reads", Math.min(1, (failed.value ?? 0) / 400000)],
    ["hesmdms.processing_time", "Processing Time", Math.min(1, (read("hesmdms.processing_time").value ?? 0) / 90)],
    ["reads.estimated", "Estimated Reads", Math.min(1, (estimated.value ?? 0) / 0.05)],
  ]
  return (
    <Stage>
      <Title hint="End-to-end connectivity, HES / MDMS availability and meter read processing">COMMUNICATION & METER DATA HEALTH</Title>
      <div className="kpis n6">
        {kpis.map(([key, label]) => {
          const item = read(key)
          return <Stat key={key} label={label} text={item.text} tone={item.tone} />
        })}
      </div>
      <Plate className="is-flat" title="HES / MDMS SYSTEM HEALTH" hint="Core ingestion and validation services">
        <div className="snoc-five">
          {(
            [
              ["hesmdms.hes", "HES Availability"],
              ["hesmdms.mdms", "MDMS Availability"],
              ["hesmdms.integration", "Data Collection"],
              ["hesmdms.processing_time", "Processing Latency"],
              ["hesmdms.pipeline", "System Status"],
            ] as [string, string][]
          ).map(([key, label]) => {
            const item = read(key)
            return (
              <div key={key}>
                <span>{label}</span>
                <b style={{ color: item.tone === "bad" ? TONE_COLOR.bad : "#34efde" }}>{item.text}</b>
              </div>
            )
          })}
        </div>
      </Plate>
      <div className="snoc-split-2 snoc-grow">
        <Plate title="METER READ PROCESSING" hint="Latest processing cycle · end-to-end throughput">
          <div className="snoc-steps">
            {steps.map(([key, label, tone], index) => (
              <div key={key}>
                <i className="snoc-ring" style={{ borderColor: TONE_COLOR[tone], color: TONE_COLOR[tone] }}>
                  {index + 1}
                </i>
                <span>{label}</span>
                <b>{read(key).text}</b>
              </div>
            ))}
          </div>
          <div className="snoc-outcome">Processing outcome</div>
          <div className="snoc-validated">
            <span>Validated reads</span>
            <div className="snoc-track">
              <i style={{ width: `${share * 100}%` }} />
            </div>
            <b>{fmt(share, "percent")}</b>
          </div>
        </Plate>
        <Plate title="PROCESSING DIAGNOSTICS" hint="Current processing and data pipeline status">
          <div className="snoc-stack">
            {diags.map(([key, label, ratio]) => {
              const item = read(key)
              return <BarRow key={key} label={label} text={item.text} ratio={ratio} tone={item.tone} />
            })}
          </div>
          <div className="snoc-pipe">
            <span>Data pipeline</span>
            <b>{read("hesmdms.pipeline").text.toUpperCase()}</b>
          </div>
        </Plate>
      </div>
    </Stage>
  )
}

function Snoc5() {
  const { read, samples } = useDash()
  const kpis: [string, string][] = [
    ["dq.index", "Data Quality Index"],
    ["dq.completeness", "Completeness"],
    ["dq.accuracy", "Accuracy"],
    ["dq.consistency", "Consistency"],
    ["dq.vee_success", "VEE Success"],
  ]
  const delayed = read("dq.delayed_sources")
  const fresh = samples("dq.freshness")
  const worst = [...fresh].sort((a, b) => b.value - a.value)[0]
  return (
    <Stage>
      <Title>DATA QUALITY & MIS REPORTING DASHBOARD</Title>
      <div className="kpis n5">
        {kpis.map(([key, label]) => {
          const item = read(key)
          return <Stat key={key} label={label} text={item.text} tone={item.tone} />
        })}
      </div>
        <Plate title="Data Freshness by Source" className="snoc-grow">
        <div className="snoc-steps is-lg">
          {FRESH.map(([source, label], index) => {
            const item = read("dq.freshness", { source })
            const ink = item.tone === "bad" || item.tone === "warn" ? TONE_COLOR[item.tone] : "#d7e4e2"
            return (
              <div key={source}>
                <i className="snoc-ring" style={{ borderColor: TONE_COLOR[item.tone], color: TONE_COLOR[item.tone] }}>
                  {index + 1}
                </i>
                <span style={{ color: ink }}>{label}</span>
                <b style={{ color: ink }}>{item.text}</b>
              </div>
            )
          })}
          <div>
            <i className="snoc-ring" style={{ borderColor: TONE_COLOR[delayed.tone], color: TONE_COLOR[delayed.tone] }}>
              5
            </i>
            <span>Delayed Sources</span>
            <b>{delayed.text}</b>
          </div>
        </div>
      </Plate>
      <Plate
        title="FRESHNESS ATTENTION"
        extra={<span className="snoc-pill">{delayed.text === "—" ? "—" : `${delayed.text} DELAYED SOURCES`}</span>}
      >
        <div className="snoc-fresh">
          <div>
            <b className="is-hot">{worst ? SOURCE_NAME[worst.labels.source] || worst.labels.source : "—"}</b>
            <p>Last update {worst ? fmt(worst.value, "duration") : "—"} ago</p>
            <div className="snoc-fresh-nums">
              <div>
                <span>Delayed sources</span>
                <b>{delayed.text}</b>
              </div>
              <div>
                <span>Source checks</span>
                <b>{fresh.length}</b>
              </div>
            </div>
          </div>
          <div className="snoc-fresh-note">
            <span>PRIORITY</span>
            <b>Review delayed data feeds</b>
            <p className="snoc-hint">No interactive controls on CCC wall</p>
          </div>
        </div>
      </Plate>
    </Stage>
  )
}

function Snoc6() {
  const { read } = useDash()
  const band: [string, string][] = [
    ["hdr.dci_health", "DCI Health"],
    ["hdr.integration_success", "Integration Success"],
    ["hdr.app_availability", "Application Availability"],
    ["hdr.comm_success", "Communication Success"],
    ["hdr.equipment_index", "Equipment Health Index"],
  ]
  return (
    <Stage frame={false}>
      <div className="snoc-band">
        {band.map(([key, label]) => {
          const item = read(key)
          return (
            <div key={key}>
              <span>{label}</span>
              <b style={{ color: item.tone === "bad" || item.tone === "warn" ? TONE_COLOR[item.tone] : "#fff" }}>{item.text}</b>
            </div>
          )
        })}
      </div>
      <Ribbon side="left" values={RIBBON.map(([key]) => read(key))} />
    </Stage>
  )
}

function Snoc7() {
  const { read, live } = useDash()
  const band: [string, string, string][] = [
    ["hdr.meters_reads", "Meters", "Reads"],
    ["hdr.hes_collected", "HES", "Collected"],
    ["hdr.mdms_validated", "MDMS", "Validated"],
    ["hdr.billing_transfer", "Billing", "Transfer"],
    ["hdr.gis_sync", "GIS", "Sync"],
    ["hdr.ai_available", "AI", "Available"],
  ]
  return (
    <Stage frame={false}>
      <div className="snoc-band">
        {band.map(([key, label, caption]) => {
          const item = read(key)
          return (
            <div key={key}>
              <span>{label}</span>
              <b>{item.text}</b>
              <em>{caption}</em>
            </div>
          )
        })}
        <div>
          <span>Dashboard</span>
          <b className="is-live">{live ? "LIVE" : "STALE"}</b>
          <em>Displayed</em>
        </div>
      </div>
      <Ribbon side="right" values={RIBBON.map(([key]) => read(key))} />
    </Stage>
  )
}

function Snoc8() {
  const { read } = useDash()
  const kpis: [string, string][] = [
    ["eq.index", "Equipment Health Index"],
    ["eq.active", "Active Equipment"],
    ["eq.faulty", "Faulty Equipment"],
    ["eq.battery_risk", "Battery Risk"],
    ["eq.sensor_availability", "Sensor Availability"],
    ["eq.gateway_health", "Gateway Health"],
  ]
  return (
    <Stage>
      <Title>EQUIPMENT HEALTH</Title>
      <div className="kpis n6">
        {kpis.map(([key, label]) => {
          const item = read(key)
          return <Stat key={key} label={label} text={item.text} tone={item.tone} />
        })}
      </div>
      <div className="snoc-types">
        {TYPES.map(([type, label, second]) => {
          const online = read("eq.online_by_type", { type })
          const other = read(second === "battery" ? "eq.battery_by_type" : "eq.offline_by_type", { type })
          const good = read("eq.by_type", { type })
          const bad = read(second === "battery" ? "eq.battery_ratio_by_type" : "eq.offline_ratio_by_type", { type })
          return (
            <div key={type} className="snoc-type">
              <strong>{label}</strong>
              <div className="snoc-type-caps">
                <span>Active</span>
                <span>{second === "battery" ? "Battery" : "Offline"}</span>
              </div>
              <div className="snoc-duo">
                <i style={{ width: `${(good.value ?? 0) * 100}%` }} />
                <i className="hot" style={{ width: `${Math.max(0, 1 - (good.value ?? 0)) * 100}%` }} />
              </div>
              <div className="snoc-type-nums">
                <div>
                  <b>
                    {online.text} <em>{paren(good.text)}</em>
                  </b>
                </div>
                <div>
                  <b>
                    {other.text} <em>{paren(bad.text)}</em>
                  </b>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      <div className="snoc-fails">
        <span>TOP FAILURE TYPE</span>
        {FAILS.map(([type, label]) => {
          const item = read("eq.top_failures", { type })
          const max = Math.max(1, ...FAILS.map(([key]) => read("eq.top_failures", { type: key }).value ?? 0))
          return (
            <div key={type}>
              <i style={{ width: `${((item.value ?? 0) / max) * 100}%` }} />
              <span>{label}</span>
              <b>{item.text}</b>
            </div>
          )
        })}
      </div>
      <Plate title="SERVICE DEPENDENCY MAP" className="snoc-grow">
        <div className="snoc-flow-head">
          <span>BUSINESS PROCESS</span>
          <span>DEPENOS ON</span>
          <span>CURRENT STATUS</span>
        </div>
        <div className="snoc-flows">
          {FLOWS.map((flow) => {
            const state = read("dep.process_state", { process: flow.process })
            const status = state.tone === "ok" ? "All Healthy" : state.tone === "warn" ? "1 Degraded" : state.tone === "bad" ? "Down" : "—"
            const edge = TONE_COLOR[state.tone === "none" ? "ok" : state.tone]
            return (
              <div key={flow.process} className="snoc-flow">
                <div className="dep-proc" style={{ borderColor: edge }}>
                  {flow.label}
                  <i style={{ background: edge }} />
                </div>
                <div className="dep-chain" style={{ color: edge }}>
                  {flow.parts.map(([component, label]) => {
                    const part = read("dep.component_state", { component })
                    const color = TONE_COLOR[part.tone === "none" ? "ok" : part.tone]
                    return (
                      <span key={component} className="dep-node" style={{ borderColor: color }}>
                        <i style={{ background: color }} />
                        {label}
                      </span>
                    )
                  })}
                </div>
                <div className="dep-status" style={{ borderColor: edge, color: edge }}>
                  <i style={{ background: edge }} />
                  {status}
                </div>
              </div>
            )
          })}
        </div>
      </Plate>
    </Stage>
  )
}

function Snoc9() {
  const { read, samples, series } = useDash()
  const kpis: [string, string][] = [
    ["app.availability", "Application Availability"],
    ["app.critical_healthy", "Critical Apps Healthy"],
    ["app.error_rate", "App Error Rate"],
    ["app.avg_response", "Average Response Time"],
    ["app.active_incidents", "Active App Incidents"],
    ["app.sla_compliance", "SLA Compliance"],
  ]
  const apps = [...samples("app.catalog")].sort((a, b) => Number(a.labels.order ?? 0) - Number(b.labels.order ?? 0))
  const error = read("app.error_rate")
  const response = read("app.avg_response")
  const target = read("app.target_response")
  return (
    <Stage>
      <Title>APPLICATION HEALTH</Title>
      <div className="kpis n6">
        {kpis.map(([key, label]) => {
          const item = read(key)
          return <Stat key={key} label={label} text={item.text} tone={item.tone} />
        })}
      </div>
      <div className="snoc-apps">
        {apps.map((app) => {
          const name = app.labels.app
          const avail = read("app.availability_by_app", { app: name })
          const lat = read("app.latency_by_app", { app: name })
          return (
            <div key={name} className="snoc-app">
              <i className="snoc-dot" style={{ background: TONE_COLOR[avail.tone === "none" ? "ok" : avail.tone] }} />
              <b>{app.labels.display_name || name}</b>
              <span style={{ color: avail.tone === "bad" || avail.tone === "warn" ? TONE_COLOR[avail.tone] : "#fff" }}>{avail.text}</span>
              <em>{lat.text}</em>
            </div>
          )
        })}
      </div>
      <div className="snoc-split-2 snoc-grow">
        <Plate title="APPLICATION ERROR RATE">
          <div className="snoc-chart-row">
            <AreaChart points={series("app.error_rate_chart")} color="#eb7d5c" fill />
            <div className="snoc-legend">
              <div>
                <span>App Error Rate</span>
                <b>{error.text}</b>
              </div>
              <div>
                <span>Failed Requests</span>
                <b>{read("app.failed_requests").text}</b>
              </div>
              <div>
                <span>Timeouts</span>
                <b>{read("app.timeouts").text}</b>
              </div>
              <div>
                <span>Critical Errors</span>
                <b>{read("app.critical_errors").text}</b>
              </div>
            </div>
          </div>
        </Plate>
        <Plate title="APPLICATION RESPONSE TIME">
          <div className="snoc-chart-row">
            <AreaChart points={series("app.response_time_chart")} color="#d6ef6a" target={chartTarget(series("app.response_time_chart"), target.value)} dashed />
            <div className="snoc-legend">
              <div>
                <span>Average Response Time</span>
                <b>{response.text}</b>
              </div>
              <div>
                <span>Peak Response Time</span>
                <b className="is-lime">{read("app.peak_response").text}</b>
              </div>
              <div>
                <span>Target</span>
                <b>&lt;{target.text}</b>
              </div>
              <div>
                <span>Slow Transactions</span>
                <b className="is-hot">{read("app.slow_transactions").text}</b>
              </div>
            </div>
          </div>
        </Plate>
      </div>
    </Stage>
  )
}

function Snoc10() {
  const { read } = useDash()
  const total = read("ftr.total_assets")
  const online = read("ftr.online_assets")
  const rate = total.value && online.value !== null ? online.value / total.value : 0
  const bars: [string, string][] = [
    ["ops.hes_registration", "HES registration"],
    ["ops.first_read", "First read"],
    ["ops.activation", "Activation"],
  ]
  const exceptions: [string, string][] = [
    ["ops.billing_jobs_delayed", "Billing jobs delayed"],
    ["ops.mfs_dispatch_delay", "MFS dispatch delay"],
    ["ops.gis_refresh_delay", "GIS refresh delay"],
    ["ops.portal_login_issues", "Portal login issues"],
  ]
  return (
    <Stage frame={false}>
      <div className="snoc-bottom">
        <Plate title="OPERATIONS & FIELD EXECUTION" hint="Meter rollout, operational delays and asset availability · CCC summary">
          <div className="snoc-ops">
            <div>
              <h3>METER INSTALLATION</h3>
              {bars.map(([key, label]) => {
                const item = read(key)
                return <BarRow key={key} label={label} text={item.text} ratio={item.value ?? 0} tone={item.tone} />
              })}
            </div>
            <div>
              <h3>OPERATIONAL EXCEPTIONS</h3>
              {exceptions.map(([key, label]) => {
                const item = read(key)
                return (
                  <div key={key} className="snoc-ex">
                    <span>{label}</span>
                    <b style={{ color: item.tone === "bad" ? "#eb7d5c" : item.tone === "warn" ? "#f3c85b" : "#fff" }}>{item.text}</b>
                    <em className={`snoc-word is-${item.tone}`}>{item.tone === "bad" ? "HIGH" : item.tone === "warn" ? "MEDIUM" : "LOW"}</em>
                  </div>
                )
              })}
            </div>
            <div>
              <h3>ASSET AVAILABILITY</h3>
              <div className="snoc-assets">
                <div>
                  <span>Total assets</span>
                  <b>{fullCount(total.value)}</b>
                </div>
                <div>
                  <span>Online assets</span>
                  <b>{fullCount(online.value)}</b>
                </div>
              </div>
              <div className="snoc-rate">
                <div>
                  <span>ONLINE RATE</span>
                  <b>{fmt(rate, "percent")}</b>
                </div>
                <div className="snoc-rate-bar">
                  <div className="snoc-track">
                    <i style={{ width: `${rate * 100}%` }} />
                  </div>
                  <p>{fmt(rate, "percent")} of total</p>
                </div>
              </div>
            </div>
          </div>
          <p className="snoc-foot">OPERATIONS / STATUS OVERVIEW</p>
        </Plate>
      </div>
    </Stage>
  )
}

function Snoc11() {
  const { read, samples } = useDash()
  const rates: [string, string][] = [
    ["sec.portal_login_success", "Login success"],
    ["sec.mfa_success", "MFA success"],
    ["sec.sso_availability", "SSO availability"],
  ]
  const mis: [string, string][] = [
    ["plat.reports", "Reports"],
    ["plat.alerts", "Alerts"],
    ["plat.insights", "Insights"],
    ["plat.manual_reviews", "Manual reviews"],
    ["plat.delivery", "Delivery"],
    ["plat.refresh_delay", "Refresh delay"],
  ]
  const risk = samples("soc.risk_by_domain")
  const riskValue = (domain: string) => Math.round(risk.find((item) => item.labels.domain === domain)?.value ?? 0)
  return (
    <Stage frame={false}>
      <div className="snoc-bottom">
        <Plate title="SECURITY & PLATFORM HEALTH" hint="Access reliability, reporting and diagnostic attention · CCC summary">
          <div className="snoc-ops">
            <div>
              <h3>IDENTITY & ACCESS</h3>
              {rates.map(([key, label]) => {
                const item = read(key)
                return <BarRow key={key} label={label} text={item.text} ratio={item.value ?? 0} tone={item.tone} />
              })}
              <div className="snoc-pair">
                <div>
                  <span>FAILED LOGINS</span>
                  <b className="is-hot">{fullCount(read("sec.failed_logins").value)}</b>
                </div>
                <div>
                  <span>PRIVILEGED ALERTS</span>
                  <b>{read("sec.privileged_alerts").text}</b>
                </div>
              </div>
            </div>
            <div>
              <h3>MIS / ANALYTICS</h3>
              <div className="snoc-mis">
                {mis.map(([key, label]) => {
                  const item = read(key)
                  return (
                    <div key={key}>
                      <span>{label}</span>
                      <b style={{ color: key === "plat.alerts" || key === "plat.refresh_delay" ? "#f3c85b" : "#34efde" }}>{item.text}</b>
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <h3>PATCH & DIAGNOSTICS</h3>
              <div className="snoc-pair">
                <div>
                  <span>TOTAL ALERTS</span>
                  <b>{read("plat.total_alerts").text}</b>
                </div>
                <div>
                  <span>CRITICAL</span>
                  <b className="is-hot">{read("plat.critical_alerts").text}</b>
                </div>
              </div>
              <p className="snoc-hint">ALERT DISTRIBUTION</p>
              <div className="snoc-risk-grid">
                {(
                  [
                    ["application", "Application"],
                    ["communication", "Communication"],
                    ["data_quality", "Data quality"],
                    ["integration", "Integration"],
                    ["equipment", "Equipment"],
                  ] as [string, string][]
                ).map(([domain, label]) => (
                  <div key={domain}>
                    <i className="snoc-dot" style={{ background: "#eb7d5c" }} />
                    {label}
                    <b>{riskValue(domain)}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="snoc-foot">SECURITY & PLATFORM / STATUS OVERVIEW</p>
        </Plate>
      </div>
    </Stage>
  )
}

function Snoc12() {
  const { read, samples } = useDash()
  const kpis: [string, string][] = [
    ["soc.readiness", "SOC Readiness"],
    ["soc.active_alerts", "Active Safety Alerts"],
    ["soc.critical_alerts", "Critical Alerts"],
    ["soc.triage_time", "Average Triage Time"],
    ["soc.escalation_sla", "Escalation SLA"],
    ["soc.open_critical_cases", "Open Critical Cases"],
  ]
  const counts = SEV.map(([key, label, color]) => ({
    key,
    label,
    color,
    value: Math.round(samples("soc.alerts_by_severity").find((item) => item.labels.severity === key)?.value ?? 0),
  }))
  const total = counts.reduce((sum, item) => sum + item.value, 0)
  const risk = samples("soc.risk_by_domain")
  const rows = RISK.map(([domain, label]) => ({
    label,
    value: Math.round(risk.find((item) => item.labels.domain === domain)?.value ?? 0),
  }))
  const max = Math.max(1, ...rows.map((row) => row.value))
  const r = 78
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <Stage>
      <Title>SAFETY OPERATIONS CENTER / SOC HEALTH</Title>
      <div className="kpis n6">
        {kpis.map(([key, label]) => {
          const item = read(key)
          return <Stat key={key} label={label} text={item.text} tone={item.tone} />
        })}
      </div>
      <div className="snoc-split-2 snoc-grow">
        <Plate title="RISK BY DOMAIN" className="is-risk">
          <div className="snoc-stack">
            {rows.map((row) => (
              <BarRow key={row.label} label={row.label} text={String(row.value)} ratio={row.value / max} tone="bad" />
            ))}
          </div>
        </Plate>
        <Plate title="ALERTS BY SEVERITY">
          <div className="snoc-donut">
            <svg viewBox="0 0 220 220">
              <circle cx="110" cy="110" r={r} fill="none" stroke="#1c2a2a" strokeWidth="28" />
              {counts.map((item) => {
                if (!item.value || !total) return null
                const len = (item.value / total) * circ
                const node = (
                  <circle
                    key={item.key}
                    cx="110"
                    cy="110"
                    r={r}
                    fill="none"
                    stroke={item.color}
                    strokeWidth="28"
                    strokeDasharray={`${len} ${circ - len}`}
                    strokeDashoffset={-offset}
                    transform="rotate(-90 110 110)"
                  />
                )
                offset += len
                return node
              })}
              <text x="110" y="108" textAnchor="middle" fill="#fff" fontSize="40">
                {total}
              </text>
              <text x="110" y="134" textAnchor="middle" fill="#cfe" fontSize="14">
                Total Alerts
              </text>
            </svg>
            <div className="snoc-donut-legend">
              {counts.map((item) => (
                <div key={item.key}>
                  <span>{item.label}</span>
                  <i style={{ background: item.color }}>{item.value}</i>
                  <em>({total ? Math.round((item.value / total) * 100) : 0}%)</em>
                </div>
              ))}
            </div>
          </div>
        </Plate>
      </div>
    </Stage>
  )
}

const BODIES = [Snoc1, Snoc2, Snoc3, Snoc4, Snoc5, Snoc6, Snoc7, Snoc8, Snoc9, Snoc10, Snoc11, Snoc12]

export function SnocScreen({ id }: { id: number }) {
  const Body = BODIES[id - 1]
  return Body ? <Body /> : null
}
