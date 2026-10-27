import { cached } from "./cache.mjs"
import { loadClusterDemand, loadUfgHierarchy } from "./ufg.mjs"
import { duckdbUrl } from "./duckdb-origin.mjs"

const empty = { total: 0, supply: 0, points: [], peak: null, forecast: null }

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  res.end(JSON.stringify(body))
}

function clusterNumber(cluster) {
  const fromId = /^c_(\d+)$/.exec(cluster.cluster_id || "")
  if (fromId) return fromId[1]
  const fromName = /^(\d+)\./.exec(cluster.name_en || "")
  return fromName ? fromName[1] : ""
}

function forecastId(clusters, filter) {
  if (!filter.cluster) return ""
  const cluster = clusters.find((item) => item.cluster_id === filter.cluster)
  const number = cluster ? clusterNumber(cluster) : ""
  if (number === "41" || number === "42") return `c_${number}`
  return /^c_(41|42)$/.test(filter.cluster) ? filter.cluster : ""
}

function clusterIds(clusters, filter) {
  if (filter.cluster) {
    return clusters.some((item) => item.cluster_id === filter.cluster) ? [filter.cluster] : []
  }
  const ids = []
  for (const cluster of clusters) {
    if (cluster.zone_id === "Z_goycay") continue
    if (filter.region && cluster.region_id !== filter.region) continue
    if (filter.zone && cluster.zone_id !== filter.zone) continue
    ids.push(cluster.cluster_id)
  }
  return ids
}

function scopeOf(clusters, filter) {
  const forecast = forecastId(clusters, filter)
  const ids = clusterIds(clusters, filter)
  if (!ids.length && !forecast) return null
  return { clusters: ids, forecast }
}

function readFilter(url) {
  const region = url.searchParams.get("region") || ""
  const zone = url.searchParams.get("zone") || ""
  const cluster = url.searchParams.get("cluster") || ""
  if ((region && !/^R\d+$/.test(region)) || (zone && !/^Z_[A-Za-z0-9_]+$/.test(zone)) || (cluster && !/^[A-Za-z0-9_]{1,80}$/.test(cluster))) return null
  return { region, zone, cluster }
}

async function loadActual(ids, from, to) {
  const series = await Promise.all(ids.map((id) => loadClusterDemand(id, from, to)))
  const totals = new Map()
  let peak = null
  let supply = 0
  for (const days of series) {
    for (const [date, value] of days) {
      totals.set(date, (totals.get(date) || 0) + value.demand)
      supply += value.supply
      if (peak == null || value.demand > peak) peak = value.demand
    }
  }
  const points = [...totals.keys()].sort().map((date) => ({ date, value: totals.get(date) }))
  return { total: points.reduce((sum, point) => sum + point.value, 0), supply, points, peak }
}

function shiftDay(value, days) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

async function loadForecast(forecast, from, to) {
  if (!forecast) return null
  const url = duckdbUrl("/api/demand")
  url.searchParams.set("from", from)
  url.searchParams.set("to", shiftDay(to, 120))
  url.searchParams.set("balance", "none")
  url.searchParams.set("forecast", forecast)
  const remote = await fetch(url)
  if (!remote.ok) throw new Error(String(remote.status))
  const body = await remote.json()
  return body.forecast ?? null
}

async function loadDemand(scope, from, to) {
  const key = `demand:${JSON.stringify({ clusters: scope.clusters, forecast: scope.forecast, from, to })}`
  return cached(key, async () => {
    const [actual, forecast] = await Promise.all([
      loadActual(scope.clusters, from, to),
      loadForecast(scope.forecast, from, to),
    ])
    return { ...actual, forecast }
  })
}

export function handleDemand(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/demand") return false
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
  loadUfgHierarchy()
    .then((body) => {
      const scope = scopeOf(body.clusters, filter)
      if (!scope) return empty
      return loadDemand(scope, from, to)
    })
    .then((body) => send(res, 200, body))
    .catch(() => send(res, 502, { error: "upstream unavailable" }))
  return true
}
