import { duckdbUrl } from "./duckdb-origin.mjs"
const ttl = 10 * 60 * 1000
const cache = new Map()

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  res.end(JSON.stringify(body))
}

function nextDay(value) {
  return new Date(Date.parse(`${value}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)
}

function dominantMonth(from, to) {
  let cursor = from
  let best = from.slice(0, 7)
  let bestCount = 0
  const counts = new Map()
  while (cursor <= to) {
    const key = cursor.slice(0, 7)
    const count = (counts.get(key) || 0) + 1
    counts.set(key, count)
    if (count > bestCount || (count === bestCount && key > best)) {
      best = key
      bestCount = count
    }
    cursor = nextDay(cursor)
  }
  return { year: Number(best.slice(0, 4)), month: best.slice(5, 7) }
}

function scopeOf(region, zone) {
  const place = zone || region
  if (!place) return "all"
  if (place === "R01" || place === "Z_sumqayit") return "sumgayit"
  if (place === "R10" || place === "Z_sabuncu") return "baku"
  if (place === "R24" || place === "Z_agsu" || place === "Z_ismayilli" || place === "Z_kurdemir" || place === "Z_ucar") return "agsu"
  return "none"
}

function readFilter(url) {
  const region = url.searchParams.get("region") || ""
  const zone = url.searchParams.get("zone") || ""
  if ((region && !/^R\d+$/.test(region)) || (zone && !/^Z_[A-Za-z0-9_]+$/.test(zone))) return null
  return { region, zone }
}

async function loadReconnect(year, month, scope) {
  const key = `${year}|${month}|${scope}`
  const hit = cache.get(key)
  if (hit && hit.until > Date.now()) return hit.body
  const url = duckdbUrl("/api/reconnect")
  url.searchParams.set("year", String(year))
  url.searchParams.set("month", month)
  url.searchParams.set("scope", scope)
  const remote = await fetch(url)
  if (!remote.ok) throw new Error(String(remote.status))
  const body = await remote.json()
  cache.set(key, { until: Date.now() + ttl, body })
  return body
}

export function handleReconnect(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/reconnect") return false
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
  const filter = readFilter(url)
  if (!filter) {
    send(res, 400, { error: "bad filter" })
    return true
  }
  const scope = scopeOf(filter.region, filter.zone)
  if (scope === "none") {
    send(res, 200, { pct: null })
    return true
  }
  const { year, month } = dominantMonth(from, to)
  loadReconnect(year, month, scope)
    .then((body) => send(res, 200, body))
    .catch(() => res.writeHead(502).end())
  return true
}
