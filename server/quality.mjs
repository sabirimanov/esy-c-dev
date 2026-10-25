import { loadUfgHierarchy } from "./ufg.mjs"

const qualityUrl = "http://127.0.0.1:4173/api/quality"
const leaksUrl = "http://127.0.0.1:4173/api/leaks"
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

function deviceRegion(region, zone) {
  const place = zone || region
  if (!place) return ""
  if (place === "R01" || place === "Z_sumqayit") return "Sumgayit/Sumgayit"
  if (place === "R10" || place === "Z_sabuncu") return "Baku"
  if (place === "R24" || place === "Z_agsu") return "Agsu"
  return "none"
}

function balanceMode(region, zone) {
  const place = zone || region
  if (!place) return "all"
  if (place === "R01" || place === "Z_sumqayit") return "sumgayit"
  if (place === "R10" || place === "Z_sabuncu") return "baku"
  return "none"
}

function scopeOf(clusters, filter) {
  if (filter.cluster) {
    const cluster = clusters.find((item) => item.cluster_id === filter.cluster)
    if (!cluster) return { deviceRegion: "none", clusterNo: "", balance: "none", sites: [] }
    const number = clusterNumber(cluster)
    return {
      deviceRegion: deviceRegion(filter.region, filter.zone),
      clusterNo: number || cluster.cluster_id,
      balance: "sites",
      sites: [number ? `Cluster ${number}` : cluster.name_en || ""],
    }
  }
  return { deviceRegion: deviceRegion(filter.region, filter.zone), clusterNo: "", balance: balanceMode(filter.region, filter.zone), sites: [] }
}

function readFilter(url) {
  const region = url.searchParams.get("region") || ""
  const zone = url.searchParams.get("zone") || ""
  const cluster = url.searchParams.get("cluster") || ""
  if ((region && !/^R\d+$/.test(region)) || (zone && !/^Z_[A-Za-z0-9_]+$/.test(zone)) || (cluster && !/^[A-Za-z0-9_]{1,80}$/.test(cluster))) return null
  return { region, zone, cluster }
}

async function loadQuality(scope, from, to) {
  const key = JSON.stringify({ ...scope, from, to })
  const hit = cache.get(key)
  if (hit && hit.until > Date.now()) return hit.body
  const url = new URL(qualityUrl)
  url.searchParams.set("from", from)
  url.searchParams.set("to", to)
  url.searchParams.set("deviceRegion", scope.deviceRegion)
  url.searchParams.set("clusterNo", scope.clusterNo)
  url.searchParams.set("balance", scope.balance)
  for (const site of scope.sites) url.searchParams.append("site", site)
  const remote = await fetch(url)
  if (!remote.ok) throw new Error(String(remote.status))
  const body = await remote.json()
  cache.set(key, { until: Date.now() + ttl, body })
  return body
}

export function handleQuality(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/quality") return false
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
    .then((body) => loadQuality(scopeOf(body.clusters, filter), from, to))
    .then((body) => send(res, 200, body))
    .catch(() => res.writeHead(502).end())
  return true
}

function leakClusters(clusters, filter) {
  if (filter.cluster) {
    const cluster = clusters.find((item) => item.cluster_id === filter.cluster)
    const number = cluster ? clusterNumber(cluster) : ""
    return number ? [number] : []
  }
  if (!filter.region && !filter.zone) return null
  const numbers = []
  for (const cluster of clusters) {
    if (cluster.zone_id === "Z_goycay") continue
    if (filter.region && cluster.region_id !== filter.region) continue
    if (filter.zone && cluster.zone_id !== filter.zone) continue
    const number = clusterNumber(cluster)
    if (number) numbers.push(number)
  }
  return numbers
}

const emptyLeaks = { suspected: 0, grades: { "Grade A": 0, "Grade B": 0, "Grade C": 0 } }

async function loadLeaks(clusters, from, to) {
  const key = `leaks|${from}|${to}|${clusters == null ? "*" : clusters.slice().sort().join(",")}`
  const hit = cache.get(key)
  if (hit && hit.until > Date.now()) return hit.body
  const url = new URL(leaksUrl)
  url.searchParams.set("from", from)
  url.searchParams.set("to", to)
  if (clusters) url.searchParams.set("clusters", clusters.join(","))
  const remote = await fetch(url)
  if (!remote.ok) throw new Error(String(remote.status))
  const body = await remote.json()
  cache.set(key, { until: Date.now() + ttl, body })
  return body
}

export function handleLeaks(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/leaks") return false
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
      const clusters = leakClusters(body.clusters, filter)
      if (clusters && clusters.length === 0) return emptyLeaks
      return loadLeaks(clusters, from, to)
    })
    .then((body) => send(res, 200, body))
    .catch(() => res.writeHead(502).end())
  return true
}
