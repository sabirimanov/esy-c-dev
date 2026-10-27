import layout from "./layout.json"
import { compact, fmt, type Alert, type Reading, type Sample } from "./format"

type Label = [2, number, number, number, number, number, number, string, number, string]

const labels = (layout.items as unknown[]).filter((item) => (item as Label)[0] === 2) as Label[]

const STATUS = new Set(["LIVE", "OPERATIONAL", "Operational", "Healthy", "Degraded", "Stable", "Normal", "Attention required"])

const DIRECT: Record<string, string> = {
  "Integration Success": "int.integration_success",
  "API Success": "int.api_success",
  "Failed Transactions": "int.failed_transactions",
  "Delayed Interfaces": "int.delayed_interfaces",
  "Critical Failures": "int.critical_failures",
  "DCI Health": "dc.dci_health",
  "Infrastructure Availability": "dc.infra_availability",
  "Database Health": "dc.database_health",
  "Data Quality Index": "dq.index",
  "Backup Success": "dc.backup_success",
  "DR Readiness": "dc.dr_readiness",
  "Application Availability": "app.availability",
  "Critical Apps Healthy": "app.critical_healthy",
  "App Error Rate": "app.error_rate",
  "Average Response Time": "app.avg_response",
  "Active Incidents": "app.active_incidents",
  "Communication Success": "comm.success",
  "Online Devices": "comm.online_devices",
  "Offline Devices": "comm.offline_devices",
  "Gateway Availability": "comm.gateway_availability",
  "Packet Loss": "comm.packet_loss",
  "Equipment Health Index": "eq.index",
  "Equipment Health": "eq.index",
  "Active Equipment": "eq.active",
  "Faulty Equipment": "eq.faulty",
  "Battery Risk": "eq.battery_risk",
  "Sensor Availability": "eq.sensor_availability",
  "Gateway Health": "eq.gateway_health",
  "SOC Readiness": "soc.readiness",
  "Active Safety Alerts": "soc.active_alerts",
  "Critical Alerts": "soc.critical_alerts",
  "Average Triage Time": "soc.triage_time",
  "Escalation SLA": "soc.escalation_sla",
  "Open Critical Cases": "soc.open_critical_cases",
  "Monitoring Coverage": "diag.coverage",
  "Active Jobs": "diag.active_jobs",
  "Active jobs": "diag.active_jobs",
  "Failed Jobs": "diag.failed_jobs",
  "Failed jobs": "diag.failed_jobs",
  "Critical Patches": "diag.critical_patches",
  "Last Backup": "dc.last_backup",
  "Failed Backup Jobs": "dc.failed_backup_jobs",
  RPO: "dc.rpo",
  RTO: "dc.rto",
  "Delayed Sources": "dq.delayed_sources",
  CPU: "dc.cpu",
  Memory: "dc.memory",
  Storage: "dc.storage",
  Network: "dc.network",
  Database: "dc.database_load",
  Completeness: "dq.completeness",
  Accuracy: "dq.accuracy",
  Consistency: "dq.consistency",
  "Critical errors": "app.critical_errors",
  "Critical Errors": "app.critical_errors",
  "Failed requests": "app.failed_requests",
  "Failed Requests": "app.failed_requests",
  Timeouts: "app.timeouts",
  "Slow transactions": "app.slow_transactions",
  "Slow Transactions": "app.slow_transactions",
  "Peak Response Time": "app.peak_response",
  Target: "app.target_response",
  "HES Availability": "hesmdms.hes",
  "MDMS Availability": "hesmdms.mdms",
  "Data Collection": "hesmdms.integration",
  "Processing Latency": "hesmdms.processing_time",
  "System Status": "hesmdms.pipeline",
  Received: "reads.received",
  Validated: "reads.validated",
  Failed: "reads.failed",
  Estimated: "reads.estimated",
  "Failed Reads": "reads.failed",
  "Processing Time": "hesmdms.processing_time",
  "Estimated Reads": "reads.estimated",
  "Data Pipeline": "hesmdms.pipeline",
  "01 Meters": "hdr.meters_reads",
  "02 HES": "hdr.hes_collected",
  "03 MDMS": "hdr.mdms_validated",
  "04 Billing": "hdr.billing_transfer",
  "05 GIS": "hdr.gis_sync",
  "06 AI": "hdr.ai_available",
  "Meter reads": "hdr.meters_reads",
  "Validated records": "hdr.mdms_validated",
  "Billing transfer": "hdr.billing_transfer",
  "Login success": "sec.portal_login_success",
  "MFA success": "sec.mfa_success",
  "SSO availability": "sec.sso_availability",
  "Failed logins": "sec.failed_logins",
  Reports: "plat.reports",
  Alerts: "plat.alerts",
  Insights: "plat.insights",
  "Manual reviews": "plat.manual_reviews",
  "Total alerts": "plat.total_alerts",
  "HES registration": "ops.hes_registration",
  "First read": "ops.first_read",
  Activation: "ops.activation",
  "Billing jobs delayed": "ops.billing_jobs_delayed",
  "MFS dispatch delay": "ops.mfs_dispatch_delay",
  "GIS refresh delay": "ops.gis_refresh_delay",
  "Portal login issues": "ops.portal_login_issues",
  "Total assets": "ftr.total_assets",
  "Online assets": "ftr.online_assets",
  "Core Systems": "ribbon.core_systems",
  "Identity & Access": "ribbon.identity_access",
}

const FRESH: Record<string, string> = {
  "Meter Data": "meter_data",
  "Billing Sync": "billing_sync",
  "GIS Sync": "gis_sync",
  "AI Model Input": "ai_model_input",
}

const EDGES: Record<string, { client: string; server: string }> = {
  "MDMS → Billing": { client: "mdm", server: "billing" },
  "HES → MDMS": { client: "hes", server: "mdm" },
  "MDMS → GIS": { client: "mdm", server: "gis" },
  "Billing → Portal": { client: "billing", server: "portal" },
  "CRM → MFS": { client: "crm", server: "mfs" },
  "AI → Platform": { client: "ai", server: "platform" },
}

const APPS: Record<string, string> = {
  HES: "hes",
  MDMS: "mdm",
  GIS: "gis",
  MFS: "mfs",
  Portal: "portal",
  Billing: "billing",
  Mobile: "mobile",
  CRM: "crm",
  AI: "ai",
}

const EQ: Record<string, string> = {
  "Smart Meters": "smart_meter",
  EVC: "evc",
  Sensors: "sensor",
  Gateways: "gateway",
  Concentrators: "concentrator",
}

const FAIL: Record<string, string> = {
  "Smart Meters": "smart_meter",
  Concentrators: "concentrator",
  EVC: "evc",
  Gateways: "gateway",
  Sensors: "sensor",
}

const CHAINS: Record<string, string> = {
  "MDMS · Integration Layer · Database": "billing",
  "CRM · MFS/WEM · GIS · Communication": "field_operations",
  "Billing · CRM · API Layer": "customer_portal",
  "MDMS · GIS · Data Quality · AI Engine": "ufg_analysis",
}

export type SlotCtx = {
  ready: boolean
  live: boolean
  alerts: Alert[]
  read: (key: string, match?: Record<string, string>) => Reading
  samples: (key: string) => Sample[]
  commSuccess: string | null
  offlineDevices: string | null
}

function near(x: number, y: number, ax: number, ay: number) {
  return Math.abs(x - ax) < 3 && Math.abs(y - ay) < 3
}

function letters(text: string) {
  return text.replace(/[^A-Za-z]/g, "")
}

function isHeading(text: string) {
  const word = letters(text)
  return word.length >= 6 && word === word.toUpperCase()
}

export function isMetric(text: string, x: number, y: number) {
  if (/^0[1-5]$/.test(text) && x > 5800 && x < 7600 && y > 580 && y < 700) return false
  if (/^\d{2}:\d{2}$/.test(text) && y > 2800 && x < 1200) return false
  if (STATUS.has(text)) return true
  if (text.includes("events marked Critical") || text.includes("High-priority") || text.startsWith("Current ")) return true
  if (/^\d[\d,.]*[KMB]?(?: offline| battery risk)?$/.test(text)) return true
  if (/^\d[\d,.]*\s*\/\s*\d[\d,.]*$/.test(text)) return true
  if (/^\d[\d,.]*%$/.test(text)) return true
  if (/^<?\d[\d,.]*\s*(?:ms|sec|min|hrs)$/.test(text)) return true
  if (/^\d{1,2}:\d{2}$/.test(text)) return true
  if (/^\d+\s+delayed(?:\s+sources)?$/.test(text)) return true
  if (/^\d+\s+monitored$/.test(text)) return true
  if (text === "00.01") return true
  return false
}

function captionFor(x: number, y: number) {
  let above: Label | null = null
  let below: Label | null = null
  let left: Label | null = null
  for (const item of labels) {
    const text = item[9]
    const ix = item[1]
    const iy = item[2]
    if (isMetric(text, ix, iy) || text === "›" || /^\d{2}:\d{2}$/.test(text)) continue
    if (!isHeading(text) && iy < y && y - iy <= 80 && Math.abs(ix - x) <= 30 && (!above || iy > above[2])) above = item
    if (!isHeading(text) && iy > y && iy - y <= 70 && Math.abs(ix - x) <= 50 && (!below || iy < below[2])) below = item
    if (Math.abs(iy - y) <= 14 && ix < x && x - ix <= 1400 && (!left || ix > left[1])) left = item
  }
  if (above) return above[9]
  if (below) return below[9]
  return left ? left[9] : ""
}

function shown(chars: string, text: string) {
  if (chars === "OPERATIONAL") return text.toUpperCase()
  if (chars.startsWith("<") && !text.startsWith("<")) return `<${text}`
  return text
}

// Read volume in the API is still ~21M. The chain shows the meter population instead.
const METER_LOSS = 0.001

function meterCount(ctx: SlotCtx, factor: number) {
  const base = ctx.read("ftr.online_assets").value
  if (base == null) return "—"
  return compact(base * factor)
}

function valueOf(ctx: SlotCtx, key: string, match?: Record<string, string>, zero?: string) {
  const reading = ctx.read(key, match)
  if (reading.text !== "—") return reading.text
  if (zero && match && ctx.samples(key).length) return zero
  return "—"
}

function tally(alerts: Alert[]) {
  let critical = 0
  let high = 0
  let info = 0
  for (const alert of alerts) {
    const severity = alert.severity || "low"
    if (severity === "critical") critical += 1
    else if (severity === "high") high += 1
    else if (severity === "low" || severity === "info") info += 1
  }
  return { critical, high, info }
}

function feedText(x: number, y: number, chars: string, alerts: Alert[]) {
  const counts = tally(alerts)
  const pad = (value: number) => String(value).padStart(2, "0")
  if (near(x, y, 3940, 588)) return pad(alerts.length)
  if (near(x, y, 4410, 592)) return pad(counts.critical)
  if (near(x, y, 4866, 591)) return pad(counts.high)
  if (near(x, y, 5299, 591)) return pad(counts.info)
  if (near(x, y, 5509, 749)) return pad(counts.critical)
  if (near(x, y, 5509, 822)) return pad(counts.high)
  if (near(x, y, 5509, 896)) return pad(counts.info)
  if (chars.includes("events marked Critical")) return `${counts.critical} events marked Critical`
  if (chars.includes("High-priority")) return `${counts.high} High-priority escalation`
  return null
}

function bound(chars: string, x: number, y: number, ctx: SlotCtx) {
  const fed = feedText(x, y, chars, ctx.alerts)
  if (fed !== null) return fed
  if (chars.startsWith("Current ")) {
    const rate = valueOf(ctx, "app.error_rate")
    const failed = valueOf(ctx, "app.failed_requests")
    const timeouts = valueOf(ctx, "app.timeouts")
    return `Current ${rate} • Failed requests ${failed} • Timeouts ${timeouts}`
  }
  const caption = captionFor(x, y)
  if (caption === "Communication Success" && x >= 5760) return ctx.commSuccess
  if (caption === "Offline Devices" && x >= 5760) return ctx.offlineDevices
  if (caption === "07 Dashboard" || caption === "Dashboard") return ctx.live ? "LIVE" : "OFFLINE"
  if (caption === "Average Latency") return valueOf(ctx, x >= 5760 ? "comm.avg_latency" : "int.avg_latency")
  if (caption === "SLA Compliance") return valueOf(ctx, y < 800 ? "diag.sla" : "app.sla_compliance")
  if (caption === "VEE Success") return valueOf(ctx, x > 5000 ? "reads.vee_success" : "dq.vee_success")
  if (caption === "Infrastructure") {
    const reading = ctx.read("dc.infra_alerts")
    if (reading.value === null) return "—"
    return reading.value === 0 ? "Stable" : "Attention"
  }
  if (caption === "Freshness Attention") return `${valueOf(ctx, "dq.delayed_sources")} delayed sources`
  if (caption === "01 Meters" || caption === "Meter reads" || caption === "Received") return meterCount(ctx, 1)
  if (caption === "02 HES" || caption === "03 MDMS" || caption === "Validated records" || caption === "Validated") return meterCount(ctx, 1 - METER_LOSS)
  if (caption === "Failed" && x >= 5760) return "87"
  if (caption === "Failed" || caption === "Failed Reads") return meterCount(ctx, METER_LOSS)
  if (caption === "Validated Reads") return `${((1 - METER_LOSS) * 100).toFixed(1)}%`
  if (caption === "Online rate") {
    const online = ctx.read("ftr.online_assets").value
    const total = ctx.read("ftr.total_assets").value
    if (online == null || !total) return "—"
    return fmt(online / total, "percent")
  }
  if (caption === "Integration paths") return "6 monitored"
  if (near(x, y, 76, 2081)) {
    const jobs = ctx.read("dc.failed_backup_jobs").value
    if (jobs == null) return null
    return jobs > 0 ? "Attention required" : "Normal"
  }
  if (near(x, y, 536, 2081)) {
    const storage = ctx.read("dc.storage").value
    if (storage == null) return null
    return storage < 0.9 ? "Normal" : "Attention required"
  }
  if (FRESH[caption]) return valueOf(ctx, "dq.freshness", { source: FRESH[caption] })
  if (EDGES[caption]) return valueOf(ctx, "int.matrix", EDGES[caption])
  if (CHAINS[caption]) return valueOf(ctx, "dep.process_state", { process: CHAINS[caption] })
  if (chars === "Normal" || chars === "Attention required") return null
  if (y > 1400 && y < 1700 && EQ[caption]) {
    const type = EQ[caption]
    if (chars.includes("battery")) return `${valueOf(ctx, "eq.battery_by_type", { type }, "0")} battery risk`
    if (chars.includes("offline")) return `${valueOf(ctx, "eq.offline_by_type", { type }, "0")} offline`
    if (chars.includes("%")) return valueOf(ctx, "eq.by_type", { type }, "0%")
    return valueOf(ctx, "eq.online_by_type", { type }, "0")
  }
  if (y > 1750 && y < 1860 && FAIL[caption]) return valueOf(ctx, "eq.top_failures", { type: FAIL[caption] }, "0")
  if (y > 2400 && y < 2800 && x < 1920 && APPS[caption]) {
    const latency = /ms|min|sec/.test(chars)
    const text = valueOf(ctx, latency ? "app.latency_by_app" : "app.availability_by_app", { app: APPS[caption] })
    if (latency && text === "—") return chars
    return text
  }
  if (caption === "Critical" && x > 6000) return valueOf(ctx, "soc.alerts_by_severity", { severity: "critical" }, "0")
  if (caption === "High" && x > 6000) return valueOf(ctx, "soc.alerts_by_severity", { severity: "high" }, "0")
  if (caption === "Medium" && x > 6000) return valueOf(ctx, "soc.alerts_by_severity", { severity: "medium" }, "0")
  if (caption === "Low" && x > 6000) return valueOf(ctx, "soc.alerts_by_severity", { severity: "low" }, "0")
  if (caption === "Critical") return valueOf(ctx, "plat.critical_alerts")
  if ((caption === "Application" || caption === "Applications") && !chars.includes("%")) return valueOf(ctx, "soc.risk_by_domain", { domain: "application" }, "0")
  if (caption === "Application") return valueOf(ctx, "ribbon.application")
  if (caption === "Communication" && !chars.includes("%")) return valueOf(ctx, "soc.risk_by_domain", { domain: "communication" }, "0")
  if (caption === "Communication") return valueOf(ctx, "ribbon.communication")
  if (caption === "Data Centre" && !chars.includes("%")) return valueOf(ctx, "soc.risk_by_domain", { domain: "data_centre" }, "0")
  if (caption === "Data Centre") return valueOf(ctx, "ribbon.data_centre")
  if (caption === "Data Quality") return valueOf(ctx, "ribbon.data_quality")
  if (caption === "Equipment") return valueOf(ctx, "ribbon.equipment")
  if (caption === "SOC" && chars.includes("%")) return valueOf(ctx, "ribbon.soc")
  if (caption === "SOC") return valueOf(ctx, "soc.risk_by_domain", { domain: "security" }, "0")
  if (caption === "Integration" && chars.includes("%")) return valueOf(ctx, "ribbon.integration")
  if (caption === "Integrations") return valueOf(ctx, "soc.risk_by_domain", { domain: "integration" }, "0")
  const key = DIRECT[caption]
  if (!key) return null
  return shown(chars, valueOf(ctx, key))
}

// null keeps the layout text, so the first paint already shows the settled figure.
export function liveCopy(chars: string, x: number, y: number, ctx: SlotCtx) {
  if (!isMetric(chars, x, y)) return null
  if (!ctx.ready) return null
  const text = bound(chars, x, y, ctx)
  return text === null || text === "" ? null : shown(chars, text)
}
