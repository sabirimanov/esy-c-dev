import { loadUfgHierarchy } from "./ufg.mjs"

import { duckdbUrl } from "./duckdb-origin.mjs"
const ttl = 10 * 60 * 1000
const cache = new Map()

const zoneNames = {
  Z_sabuncu: "Baku City",
  Z_sumqayit: "Sumqayit City",
  Z_agsu: "Agsu District",
  Z_ismayilli: "Ismailli District",
  Z_kurdemir: "Kurdamir District",
  Z_ucar: "Ujar District",
  Z_goycay: "Goychay District",
}

const rqiiNames = {
  R10: "BRQİİ / BRQSD",
  R01: "Sumqayıt RQİİ",
  R24: "Ağsu RQİİ",
}

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

function selectedPeriod(from, to) {
  if (from.slice(0, 4) === to.slice(0, 4) && from.endsWith("-01-01") && to.endsWith("-12-31")) {
    return { year: Number(from.slice(0, 4)), month: "All" }
  }
  return dominantMonth(from, to)
}

function readFilter(url) {
  const region = url.searchParams.get("region") || ""
  const zone = url.searchParams.get("zone") || ""
  const cluster = url.searchParams.get("cluster") || ""
  if ((region && !/^R\d+$/.test(region)) || (zone && !/^Z_[A-Za-z0-9_]+$/.test(zone)) || (cluster && !/^[A-Za-z0-9_]{1,80}$/.test(cluster))) return null
  return { region, zone, cluster }
}

function scopeOf(clusters, filter) {
  if (filter.cluster) {
    const cluster = clusters.find((item) => item.cluster_id === filter.cluster)
    const name = cluster ? zoneNames[cluster.zone_id] : ""
    return name ? { level: "region", name } : null
  }
  if (filter.zone) {
    const name = zoneNames[filter.zone]
    return name ? { level: "region", name } : null
  }
  if (filter.region) {
    const name = rqiiNames[filter.region]
    return name ? { level: "rqii", name } : null
  }
  return { level: "republic", name: "" }
}

async function loadImpact(year, month, scope) {
  const key = `${year}|${month}|${scope.level}|${scope.name}`
  const hit = cache.get(key)
  if (hit && hit.until > Date.now()) return hit.body
  const url = duckdbUrl("/api/impact")
  url.searchParams.set("year", String(year))
  url.searchParams.set("month", month)
  url.searchParams.set("level", scope.level)
  if (scope.name) url.searchParams.set("name", scope.name)
  const remote = await fetch(url)
  if (!remote.ok) throw new Error(String(remote.status))
  const body = await remote.json()
  cache.set(key, { until: Date.now() + ttl, body })
  return body
}

const empty = {
  serviceLevel: null,
  affected: null,
  serious: null,
  fcr: null,
  answered: null,
  queue: null,
  anomalies: null,
  repeatCalls: null,
  reopened: null,
  share: null,
  open: null,
  calls: null,
  closed: null,
  crmSla: null,
  heat: [],
  calibration: null,
  calibrationAsOf: null,
  operations: null,
}

export function handleImpact(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/impact") return false
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
  const { year, month } = selectedPeriod(from, to)
  loadUfgHierarchy()
    .then(async (body) => {
      const scope = scopeOf(body.clusters, filter)
      const loaded = await loadImpact(year, month, scope ?? { level: "republic", name: "" })
      if (scope) return loaded
      return { ...empty, heat: loaded.heat }
    })
    .then((body) => send(res, 200, body))
    .catch(() => res.writeHead(502).end())
  return true
}
