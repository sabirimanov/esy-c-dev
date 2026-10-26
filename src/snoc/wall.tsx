import { useMemo } from "react"
import layout from "./layout.json"
import { SHOW_DATE_SELECTION, SnocCalendar } from "./calendar"
import { useDash } from "./dashboard"
import { EventsFeed, tallyAlerts } from "./feed"
import type { Alert } from "./format"

type Box = [0 | 1, number, number, number, number, number, string, string, number]
type Label = [2, number, number, number, number, number, number, string, number, string]
type Mark = [3, number, number, number, number, string, string, string, number]
type Item = Box | Label | Mark

const items = layout.items as Item[]

const KEYS: Record<string, string> = {
  "Integration Success": "int.integration_success",
  "API Success": "int.api_success",
  "Failed Transactions": "int.failed_transactions",
  "Delayed Interfaces": "int.delayed_interfaces",
  "Critical Failures": "int.critical_failures",
  "DCI Health": "dc.dci_health",
  "Infrastructure Availability": "dc.infra_availability",
  "Database Health": "dc.database_health",
  "Backup Success": "dc.backup_success",
  "DR Readiness": "dc.dr_readiness",
  "Application Availability": "app.availability",
  "Critical Apps Healthy": "app.critical_healthy",
  "App Error Rate": "app.error_rate",
  "Active Incidents": "app.active_incidents",
  "SLA Compliance": "app.sla_compliance",
  "Communication Success": "comm.success",
  "Online Devices": "comm.online_devices",
  "Offline Devices": "comm.offline_devices",
  "Gateway Availability": "comm.gateway_availability",
  "Packet Loss": "comm.packet_loss",
  "Equipment Health Index": "eq.health_index",
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
}

function keyFor(label: string, x: number) {
  if (label === "Average Latency") return x < 1920 ? "int.avg_latency" : x >= 5760 ? "comm.avg_latency" : ""
  if (label === "Average Response Time") return x < 1920 ? "app.avg_response" : ""
  return KEYS[label] ?? ""
}

function paintVisible(paint: string) {
  if (!paint) return false
  if (paint.includes("#")) return true
  return [...paint.matchAll(/rgba\([^)]*?,\s*([0-9.]+)\)/g)].some((match) => Number(match[1]) > 0.01)
}

function isLabel(item: Item): item is Label {
  return item[0] === 2
}

function isKpiShell(kind: number, h: number, radius: number, fill: string) {
  return kind === 0 && radius >= 28 && h >= 120 && h <= 160 && fill.includes("180deg") && fill.includes("#34efde")
}

function near(x: number, y: number, ax: number, ay: number) {
  return Math.abs(x - ax) < 3 && Math.abs(y - ay) < 3
}

function hiddenNode(item: Item) {
  const x = item[1]
  const y = item[2]
  if (y >= 1180 && y <= 3240 && x >= 3890 && x <= 5750) return true
  if (item[0] === 1 && near(x, y, 4590.5, 310)) return true
  if (item[0] === 0 && (near(x, y, 5452.5, 140) || (Math.abs(y - 339) < 2 && x >= 4939 && x <= 5310))) return true
  if (!SHOW_DATE_SELECTION && item[0] === 0 && Math.abs(x - 4939.5) < 2 && Math.abs(y - 138) < 2) return true
  if (item[0] !== 2) return false
  const chars = item[9]
  if (!SHOW_DATE_SELECTION && (chars === "DATE SELECTION" || chars === "Choose a date, month, year or range")) return true
  if (chars === "October 2026") return true
  if (y < 450 && ["Day", "Month", "Year", "Date Range", "Now", "Yesterday", "Custom Date"].includes(chars)) return true
  return /^\d{1,2}$/.test(chars) && x >= 3980 && x <= 4700 && y >= 150 && y <= 430
}

function feedCopy(x: number, y: number, chars: string, alerts: Alert[]) {
  const counts = tallyAlerts(alerts)
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

function feedBar(x: number, y: number, fill: string, alerts: Alert[]) {
  if (Math.abs(x - 3981) > 2 || !fill.includes("90deg")) return null
  const counts = tallyAlerts(alerts)
  const max = Math.max(counts.critical, counts.high, counts.info, 1)
  const value = Math.abs(y - 786) < 8 ? counts.critical : Math.abs(y - 860) < 8 ? counts.high : Math.abs(y - 933) < 8 ? counts.info : null
  if (value == null) return null
  return Math.round((value / max) * 1627)
}

export function SnocScreen({ id }: { id: number }) {
  const { read, ready, alerts } = useDash()
  const col = (id - 1) % 4
  const row = Math.floor((id - 1) / 4)
  const text = useMemo(() => {
    const next = new Map<number, string>()
    if (!ready) return next
    const labels = items.filter(isLabel)
    labels.forEach((value, index) => {
      if (value[5] < 30) return
      const label = labels
        .filter((item) => item[5] <= 28 && item[2] < value[2] && value[2] - item[2] <= 80 && Math.abs(item[1] - value[1]) <= 20)
        .sort((a, b) => b[2] - a[2])[0]
      if (!label) return
      const key = keyFor(label[9], value[1])
      if (!key) return
      const reading = read(key)
      if (reading.text !== "—") next.set(index, reading.text)
    })
    return next
  }, [read, ready])

  let labelIndex = -1
  return (
    <div className="snoc-clip">
      <div className="snoc-wall" style={{ transform: `translate(${-col * 1920}px, ${-row * 1080}px)` }}>
        {items.map((item, index) => {
          if (hiddenNode(item)) {
            if (item[0] === 2) labelIndex += 1
            return null
          }
          if (item[0] === 3) {
            const [, x, y, w, h, d, fill, stroke, sw] = item
            return (
              <svg key={index} className="snoc-node" style={{ left: x, top: y, width: w, height: h }}>
                <path d={d} fill={paintVisible(fill) ? fill : "none"} stroke={paintVisible(stroke) ? stroke : "none"} strokeWidth={sw} />
              </svg>
            )
          }
          if (item[0] === 2) {
            labelIndex += 1
            const [, x, y, w, h, size, weight, color, align, chars] = item
            const quickLift = chars === "QUICK SELECT" || chars === "Common time periods" ? 95 : 0
            return (
              <div
                key={index}
                className="snoc-node snoc-copy"
                style={{
                  left: x,
                  top: y - quickLift,
                  width: w,
                  height: h,
                  fontSize: size,
                  fontWeight: weight,
                  color,
                  lineHeight: `${h}px`,
                  textAlign: align === 1 ? "center" : align === 2 ? "right" : "left",
                }}
              >
                {(ready ? feedCopy(x, y, chars, alerts) : null) ?? text.get(labelIndex) ?? chars}
              </div>
            )
          }
          const [kind, x, y, w, h, radius, fill, stroke, sw] = item
          const kpi = isKpiShell(kind, h, radius, fill)
          const edge = !kpi && paintVisible(stroke)
          const bar = ready ? feedBar(x, y, fill, alerts) : null
          return (
            <div
              key={index}
              className={kpi ? "snoc-node kpi" : "snoc-node"}
              style={{
                left: x,
                top: y,
                width: bar ?? w,
                height: h,
                borderRadius: kind === 1 ? "50%" : radius,
                background: kpi || !paintVisible(fill) ? "transparent" : fill,
              }}
            >
              {edge && <span className="snoc-edge" style={{ padding: sw || 1, background: stroke }} />}
            </div>
          )
        })}
        <SnocCalendar />
        <EventsFeed />
      </div>
    </div>
  )
}
