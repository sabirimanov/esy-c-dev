import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

/**
 * Embedded SOC/NOC dashboard mock — port of soc-noc-dashboard (ccc-dashboard)
 * CCC_DATA_SOURCE=mock. Serves the same /api/dashboard JSON shape without
 * VictoriaMetrics / Alertmanager / the Go binary.
 */

const ROOT = path.dirname(fileURLToPath(import.meta.url))
const SNAPSHOT = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "soc-mock.json"), "utf8"))

const RANGES = new Set(["now", "1h", "24h", "7d"])

/** Same templates as soc-noc-dashboard/mock.go — feed stays populated when range=now. */
const ALERT_TEMPLATES = [
  { domain: "application", severity: "critical", name: "AppLatencyHigh", summary: "MFS response time above target" },
  { domain: "application", severity: "critical", name: "AppDown", summary: "AI model service not responding" },
  { domain: "application", severity: "high", name: "AppErrorRateHigh", summary: "Billing API error rate above 1%" },
  { domain: "application", severity: "high", name: "AppQueueBacklog", summary: "HES job queue backlog" },
  { domain: "application", severity: "medium", name: "AppLatencyHigh", summary: "Portal p95 latency above 400 ms" },
  { domain: "application", severity: "medium", name: "AppErrorRateHigh", summary: "MDMS validation errors above 0.5%" },
  { domain: "application", severity: "medium", name: "AppLatencyHigh", summary: "GIS map tiles slow" },
  { domain: "application", severity: "low", name: "AppLatencyHigh", summary: "Mobile app sync slow" },
  { domain: "integration", severity: "critical", name: "IntegrationDelay", summary: "CRM: MFS integration delay" },
  { domain: "integration", severity: "high", name: "IntegrationErrors", summary: "WFM → MFS API retries" },
  { domain: "integration", severity: "medium", name: "IntegrationDelay", summary: "MDMS → GIS sync delayed" },
  { domain: "integration", severity: "low", name: "IntegrationRecovered", summary: "API retry completed — Green" },
  { domain: "communication", severity: "high", name: "ConcentratorOffline", summary: "Sumgayit concentrator offline" },
  { domain: "communication", severity: "medium", name: "GatewayPacketLoss", summary: "Yashma gateway packet loss above 2%" },
  { domain: "communication", severity: "low", name: "MeterClusterOffline", summary: "Sumqayit meter cluster 41 reconnecting" },
  { domain: "data_quality", severity: "high", name: "DuplicateReads", summary: "Duplicate reads in HES batch" },
  { domain: "data_quality", severity: "medium", name: "EstimatedReadsHigh", summary: "Estimated reads above 1%" },
  { domain: "data_quality", severity: "low", name: "SourceDelayed", summary: "Billing sync data delayed" },
  { domain: "equipment", severity: "high", name: "RegulatorFault", summary: "Regulator fault reported (Baku)" },
  { domain: "equipment", severity: "medium", name: "TamperEvents", summary: "Smart meter tamper events" },
  { domain: "equipment", severity: "low", name: "BatteryRisk", summary: "EVC battery low voltage" },
  { domain: "data_centre", severity: "critical", name: "BackupFailed", summary: "3 backup jobs failed" },
  { domain: "data_centre", severity: "high", name: "DatastoreUsageHigh", summary: "Datastore usage above 85%" },
  { domain: "data_centre", severity: "medium", name: "HostCpuHigh", summary: "SRV-ELK01 CPU above 90%" },
  { domain: "data_centre", severity: "low", name: "DiskGrowth", summary: "SRV-HES-DB01 disk growth above trend" },
  { domain: "security", severity: "critical", name: "SocEscalation", summary: "SOC critical alert escalated" },
  { domain: "security", severity: "high", name: "PrivilegedLogin", summary: "Privileged login outside business hours" },
  { domain: "security", severity: "medium", name: "FailedLoginsSpike", summary: "Failed logins spike on portal" },
]

const RANK = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }

function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function stampPanels(panels, at) {
  const out = {}
  for (const [id, panel] of Object.entries(panels)) {
    out[id] = { ...panel, updated: at }
  }
  return out
}

function liveAlerts(at, limit) {
  const slot = Math.floor(at / 300) * 300
  const picked = []
  for (let i = 0; i < ALERT_TEMPLATES.length; i++) {
    const t = ALERT_TEMPLATES[i]
    const seed = hash(`${t.name}|${t.summary}|${slot}`)
    // ~half of templates fire in a given 5-minute bucket (deterministic).
    if (seed % 100 < 55) continue
    const age = (seed % 48) * 300
    picked.push({
      name: t.name,
      severity: t.severity,
      domain: t.domain,
      summary: t.summary,
      starts: slot - age,
    })
  }
  picked.sort(
    (a, b) =>
      (RANK[a.severity] ?? 9) - (RANK[b.severity] ?? 9) ||
      b.starts - a.starts ||
      a.name.localeCompare(b.name),
  )
  return picked.slice(0, limit)
}

function snapshotAlerts(rows, at, limit) {
  if (!rows?.length) return liveAlerts(at, limit)
  const span = Math.max(3600, rows.length * 400)
  return rows.slice(0, limit).map((row, i) => ({
    ...row,
    starts: at - ((i * 317 + 90) % span),
  }))
}

/**
 * @param {{ range?: string, end?: string | null }} query
 */
export function buildSocDashboard(query = {}) {
  const range = RANGES.has(query.range) ? query.range : "now"
  const snap = SNAPSHOT[range] || SNAPSHOT.now
  const now = Math.floor(Date.now() / 1000)
  let end = 0
  if (query.end) {
    const n = Number(query.end)
    if (Number.isFinite(n) && n > 0) {
      // Accept wall clocks a bit ahead; clamp future to now.
      end = n > now + 60 ? 0 : n
    }
  }
  const at = end || now
  const alertLimit = range === "now" || range === "1h" ? 30 : 50
  const alerts =
    range === "now"
      ? liveAlerts(at, alertLimit)
      : snapshotAlerts(snap.alerts, at, alertLimit)

  return {
    range,
    end,
    generated: now,
    live: true,
    panels: stampPanels(snap.panels, at),
    alerts,
    alerts_ok: true,
    alerts_n: alerts.length,
  }
}

export function isSocRange(name) {
  return RANGES.has(name)
}
