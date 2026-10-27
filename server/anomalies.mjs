import { cached } from "./cache.mjs"
import { duckdbUrl } from "./duckdb-origin.mjs"

const regionNames = {
  R10: "Bakı RQİİ",
  R01: "Sumqayıt RQİİ",
  R24: "Ağsu RQİİ",
}

const rayonNames = {
  Z_sumqayit: "Sumqayıt",
  Z_agsu: "Ağsu",
  Z_ismayilli: "İsmayıllı",
  Z_kurdemir: "Kürdəmir",
  Z_ucar: "Ucar",
  Z_sabuncu: "Sabunçu",
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  res.end(JSON.stringify(body))
}

function readFilter(url) {
  const region = url.searchParams.get("region") || ""
  const zone = url.searchParams.get("zone") || ""
  const cluster = url.searchParams.get("cluster") || ""
  const from = url.searchParams.get("from") || ""
  const to = url.searchParams.get("to") || ""
  if ((region && !/^R\d+$/.test(region)) || (zone && !/^Z_[A-Za-z0-9_]+$/.test(zone)) || (cluster && !/^[A-Za-z0-9_]{1,80}$/.test(cluster))) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null
  return { region, zone, cluster, from, to }
}

export function handleAnomalies(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/anomalies") return false
  if (req.method !== "GET") {
    res.writeHead(405).end()
    return true
  }
  const filter = readFilter(url)
  if (!filter) {
    send(res, 400, { error: "bad filter" })
    return true
  }
  const region = regionNames[filter.region] || ""
  const rayon = rayonNames[filter.zone] || ""
  if (filter.region && !region) {
    send(res, 400, { error: "bad filter" })
    return true
  }
  if (filter.zone && !rayon) {
    send(res, 400, { error: "bad filter" })
    return true
  }
  const key = `anomalies:${region}|${rayon}|${filter.cluster}|${filter.from}|${filter.to}`
  cached(key, async () => {
    const remote = duckdbUrl("/api/anomalies")
    remote.searchParams.set("from", filter.from)
    remote.searchParams.set("to", filter.to)
    if (region) remote.searchParams.set("region", region)
    if (rayon) remote.searchParams.set("rayon", rayon)
    if (filter.cluster) remote.searchParams.set("cluster", filter.cluster)
    const response = await fetch(remote)
    if (!response.ok) throw new Error(String(response.status))
    return response.json()
  })
    .then((body) => send(res, 200, body))
    .catch(() => send(res, 502, { error: "upstream unavailable" }))
  return true
}
