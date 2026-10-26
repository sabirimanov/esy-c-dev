import { loadUfgHierarchy } from "./ufg.mjs"

import { duckdbUrl } from "./duckdb-origin.mjs"
const ttl = 10 * 60 * 1000
const cache = new Map()

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  res.end(JSON.stringify(body))
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

function readFilter(url) {
  const region = url.searchParams.get("region") || ""
  const zone = url.searchParams.get("zone") || ""
  const cluster = url.searchParams.get("cluster") || ""
  if ((region && !/^R\d+$/.test(region)) || (zone && !/^Z_[A-Za-z0-9_]+$/.test(zone)) || (cluster && !/^[A-Za-z0-9_]{1,80}$/.test(cluster))) return null
  return { region, zone, cluster }
}

async function loadGis(ids) {
  const key = ids.join(",")
  const hit = cache.get(key)
  if (hit && hit.until > Date.now()) return hit.body
  const url = duckdbUrl("/api/gis")
  for (const id of ids) url.searchParams.append("cluster", id)
  const remote = await fetch(url)
  if (!remote.ok) throw new Error(String(remote.status))
  const body = await remote.json()
  cache.set(key, { until: Date.now() + ttl, body })
  return body
}

export function handleGis(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/gis") return false
  if (req.method !== "GET") {
    res.writeHead(405).end()
    return true
  }
  const filter = readFilter(url)
  if (!filter) {
    send(res, 400, { error: "bad filter" })
    return true
  }
  loadUfgHierarchy()
    .then((body) => {
      const ids = clusterIds(body.clusters, filter)
      if (!ids.length) return { rows: [] }
      return loadGis(ids)
    })
    .then((body) => send(res, 200, body))
    .catch(() => res.writeHead(502).end())
  return true
}
