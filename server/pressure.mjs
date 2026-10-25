import { loadUfgHierarchy } from "./ufg.mjs"

const pressureUrl = "http://127.0.0.1:4173/api/pressure"
const ttl = 10 * 60 * 1000
const cache = new Map()

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

function scopeOf(clusters, filter) {
  if (filter.cluster) {
    const cluster = clusters.find((item) => item.cluster_id === filter.cluster)
    if (!cluster) return null
    const number = clusterNumber(cluster)
    return {
      lowRegion: lowRegion(filter.region, filter.zone),
      clusterName: cluster.name_en || cluster.cluster_id,
      medium: "sites",
      sites: [number ? `Cluster ${number}` : cluster.name_en || ""],
    }
  }
  const low = lowRegion(filter.region, filter.zone)
  return { lowRegion: low, clusterName: "", medium: mediumMode(filter.region, filter.zone), sites: [] }
}

function lowRegion(region, zone) {
  const place = zone || region
  if (!place) return "all"
  if (place === "R01" || place === "Z_sumqayit") return "Sumgait"
  if (place === "R10" || place === "Z_sabuncu") return "Baku"
  return "none"
}

function mediumMode(region, zone) {
  const place = zone || region
  if (!place) return "all"
  if (place === "R01" || place === "Z_sumqayit") return "sumgayit"
  if (place === "R10" || place === "Z_sabuncu") return "baku"
  return "none"
}

function readFilter(url) {
  const region = url.searchParams.get("region") || ""
  const zone = url.searchParams.get("zone") || ""
  const cluster = url.searchParams.get("cluster") || ""
  if ((region && !/^R\d+$/.test(region)) || (zone && !/^Z_[A-Za-z0-9_]+$/.test(zone)) || (cluster && !/^[A-Za-z0-9_]{1,80}$/.test(cluster))) return null
  return { region, zone, cluster }
}

async function loadPressure(scope, from, to) {
  const key = JSON.stringify({ ...scope, from, to })
  const hit = cache.get(key)
  if (hit && hit.until > Date.now()) return hit.body
  const url = new URL(pressureUrl)
  url.searchParams.set("from", from)
  url.searchParams.set("to", to)
  url.searchParams.set("lowRegion", scope.lowRegion)
  url.searchParams.set("medium", scope.medium)
  if (scope.clusterName) url.searchParams.set("clusterName", scope.clusterName)
  for (const site of scope.sites) url.searchParams.append("site", site)
  const remote = await fetch(url)
  if (!remote.ok) throw new Error(String(remote.status))
  const body = await remote.json()
  cache.set(key, { until: Date.now() + ttl, body })
  return body
}

export function handlePressure(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/pressure") return false
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
      if (!scope) return { lowSensors: 0, mediumSensors: 0, lowViolations: 0, mediumViolations: 0 }
      return loadPressure(scope, from, to)
    })
    .then((body) => send(res, 200, body))
    .catch(() => res.writeHead(502).end())
  return true
}
