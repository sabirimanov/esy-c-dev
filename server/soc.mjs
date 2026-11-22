import { buildSocDashboard, isSocRange } from "./socMock.mjs"

/**
 * SOC/NOC dashboard API (mock, embedded).
 * Replaces remote cccdev …/socnoc/monitoring/… (504) and local :8443 Go binary.
 * Same JSON shape as soc-noc-dashboard GET /api/dashboard.
 */
const PATHS = new Set(["/soc-live", "/socnoc/monitoring/screen1/api/dashboard"])

export function handleSoc(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (!PATHS.has(url.pathname)) return false
  if (req.method !== "GET") {
    res.writeHead(405).end()
    return true
  }
  const range = url.searchParams.get("range") || "now"
  if (!isSocRange(range)) {
    res.writeHead(400, { "Content-Type": "application/json", "Cache-Control": "no-store" })
    res.end(JSON.stringify({ error: "range must be now, 1h, 24h or 7d" }))
    return true
  }
  const body = buildSocDashboard({
    range,
    end: url.searchParams.get("end"),
  })
  res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  res.end(JSON.stringify(body))
  return true
}
