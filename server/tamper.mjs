import { duckdbUrl } from "./duckdb-origin.mjs"
const ttl = 10 * 60 * 1000
const cache = new Map()

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  res.end(JSON.stringify(body))
}

async function loadTamper(from, to) {
  const key = `${from}|${to}`
  const hit = cache.get(key)
  if (hit && hit.until > Date.now()) return hit.body
  const url = duckdbUrl("/api/tamper")
  url.searchParams.set("from", from)
  url.searchParams.set("to", to)
  const remote = await fetch(url)
  if (!remote.ok) throw new Error(String(remote.status))
  const body = await remote.json()
  cache.set(key, { until: Date.now() + ttl, body })
  return body
}

export function handleTamper(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/tamper") return false
  if (req.method !== "GET") {
    res.writeHead(405).end()
    return true
  }
  const from = url.searchParams.get("from") || ""
  const to = url.searchParams.get("to") || from
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to) || from > to) {
    send(res, 400, { error: "bad range" })
    return true
  }
  loadTamper(from, to)
    .then((body) => send(res, 200, body))
    .catch(() => send(res, 502, { error: "tamper unavailable" }))
  return true
}
