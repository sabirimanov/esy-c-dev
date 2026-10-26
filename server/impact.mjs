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
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  res.end(JSON.stringify(body))
}

function readFilter(url) {
  const region = url.searchParams.get("region") || ""
  const zone = url.searchParams.get("zone") || ""
  const cluster = url.searchParams.get("cluster") || ""
  if ((region && !/^R\d+$/.test(region)) || (zone && !/^Z_[A-Za-z0-9_]+$/.test(zone)) || (cluster && !/^[A-Za-z0-9_]{1,80}$/.test(cluster))) return null
  return { region, zone, cluster }
}

function clusterNumber(cluster) {
  const match = /^c_(\d+)$/.exec(cluster)
  return match ? match[1] : ""
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
  if (filter.cluster && !clusterNumber(filter.cluster)) {
    send(res, 400, { error: "bad filter" })
    return true
  }
  const remote = duckdbUrl("/api/accident-impact")
  remote.searchParams.set("from", from)
  remote.searchParams.set("to", to)
  const region = regionNames[filter.region] || ""
  const rayon = rayonNames[filter.zone] || ""
  const cluster = filter.cluster ? clusterNumber(filter.cluster) : ""
  if (region) remote.searchParams.set("region", region)
  if (rayon) remote.searchParams.set("rayon", rayon)
  if (cluster) remote.searchParams.set("cluster", cluster)
  fetch(remote)
    .then(async (response) => {
      if (!response.ok) throw new Error(String(response.status))
      send(res, 200, await response.json())
    })
    .catch(() => res.writeHead(502).end())
  return true
}
