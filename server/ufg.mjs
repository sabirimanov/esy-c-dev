const origin = "https://cccdev.esyasoft.app/cccapi/"
const boardUrl = "http://127.0.0.1:4173/api/ufg"
const ttl = 10 * 60 * 1000
const boardCache = new Map()
const regionCache = new Map()
let hierarchyCache = null
let alarmCache = null

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  res.end(JSON.stringify(body))
}

async function fetchCcc(path, extra) {
  const url = new URL(origin)
  url.searchParams.set("system", "ufg")
  url.searchParams.set("path", path)
  for (const [key, value] of Object.entries(extra || {})) url.searchParams.set(key, value)
  const remote = await fetch(url)
  if (!remote.ok) throw new Error(String(remote.status))
  return remote.json()
}

async function hierarchy() {
  if (hierarchyCache && hierarchyCache.until > Date.now()) return hierarchyCache.body
  const data = await fetchCcc("/api/v1/hierarchy")
  const zones = new Map()
  for (const zone of data.zones || []) zones.set(zone.zone_id, zone.region_id)
  const clusters = new Map()
  for (const cluster of data.clusters || []) {
    clusters.set(cluster.cluster_id, { region_id: cluster.region_id, zone_id: cluster.zone_id })
  }
  const body = {
    zones: (data.zones || []).map((zone) => ({
      zone_id: zone.zone_id,
      region_id: zone.region_id,
      name_en: zone.name_en || zone.name_az || zone.zone_id,
    })),
    clusters: (data.clusters || []).map((cluster) => ({
      cluster_id: cluster.cluster_id,
      region_id: cluster.region_id,
      zone_id: cluster.zone_id,
      name_en: cluster.name_en || cluster.name_az || cluster.cluster_id,
    })),
    index: { zones, clusters },
  }
  hierarchyCache = { until: Date.now() + ttl, body }
  return body
}

async function loadBoard(from, to, cluster) {
  const key = `${from}|${to}|${cluster}`
  const hit = boardCache.get(key)
  if (hit && hit.until > Date.now()) return hit.rows
  const url = new URL(boardUrl)
  url.searchParams.set("from", from)
  url.searchParams.set("to", to)
  if (cluster) url.searchParams.set("cluster", cluster)
  const remote = await fetch(url)
  if (!remote.ok) throw new Error(String(remote.status))
  const data = await remote.json()
  const rows = Array.isArray(data.rows) ? data.rows : []
  boardCache.set(key, { until: Date.now() + ttl, rows })
  return rows
}

function daysOf(from, to) {
  const start = Date.parse(`${from}T00:00:00Z`)
  const end = Date.parse(`${to}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null
  const days = []
  for (let time = start; time <= end; time += 86400000) {
    days.push(new Date(time).toISOString().slice(0, 10))
    if (days.length > 366) return null
  }
  return days
}

function kept(row, filter, index) {
  const id = row["Cluster Number"]
  if (filter.cluster && id !== filter.cluster) return false
  if (filter.region && row.Region !== filter.region) return false
  if (filter.zone) {
    const known = index.clusters.get(id)
    if (!known || known.zone_id !== filter.zone) return false
  }
  const purchase = Number(row.Purchase)
  const ufg = Number(row["UFG%"])
  return purchase > 0 && Number.isFinite(ufg)
}

function summarize(rows) {
  let purchase = 0
  let weighted = 0
  let loss = 0
  for (const row of rows) {
    const bought = Number(row.Purchase)
    const sold = Number(row.Sale)
    const ufg = Number(row["UFG%"])
    purchase += bought
    weighted += bought * ufg
    if (Number.isFinite(sold)) loss += bought - sold
  }
  const current = purchase > 0 ? (weighted / purchase) * 100 : null
  const target = 5
  const closure = current ? (target / current) * 100 : null
  return { current, target, loss: purchase > 0 ? loss : null, closure, supply: purchase }
}

function extremes(rows, names) {
  const buckets = new Map()
  for (const row of rows) {
    const id = row["Cluster Number"]
    const bucket = buckets.get(id) || { purchase: 0, weighted: 0 }
    const bought = Number(row.Purchase)
    bucket.purchase += bought
    bucket.weighted += bought * Number(row["UFG%"])
    buckets.set(id, bucket)
  }
  let high = null
  let low = null
  for (const [id, bucket] of buckets) {
    if (!(bucket.purchase > 0)) continue
    const value = (bucket.weighted / bucket.purchase) * 100
    const item = { id, name: names.get(id) || id, value }
    if (value <= 40 && (!high || value > high.value)) high = item
    if (!low || value < low.value) low = item
  }
  return low ? { high, low } : null
}

function seriesFor(rows, days) {
  const buckets = new Map()
  for (const row of rows) {
    const day = String(row.Date).slice(0, 10)
    const bucket = buckets.get(day) || { purchase: 0, weighted: 0 }
    const bought = Number(row.Purchase)
    bucket.purchase += bought
    bucket.weighted += bought * Number(row["UFG%"])
    buckets.set(day, bucket)
  }
  return days.map((day) => {
    const bucket = buckets.get(day)
    return bucket && bucket.purchase > 0 ? (bucket.weighted / bucket.purchase) * 100 : null
  })
}

async function trend(filter, index, from, to, prevFrom, prevTo) {
  const currentDays = daysOf(from, to)
  const previousDays = daysOf(prevFrom, prevTo)
  const spanFrom = prevFrom < from ? prevFrom : from
  const spanTo = prevTo > to ? prevTo : to
  const loaded = (await loadBoard(spanFrom, spanTo, filter.cluster)).filter((row) => kept(row, filter, index))
  const on = (row, start, end) => {
    const day = String(row.Date).slice(0, 10)
    return day >= start && day <= end
  }
  return {
    current: seriesFor(loaded.filter((row) => on(row, from, to)), currentDays),
    previous: seriesFor(loaded.filter((row) => on(row, prevFrom, prevTo)), previousDays),
    hourly: false,
    hours: [],
  }
}

async function loadRegions(gasDay) {
  const hit = regionCache.get(gasDay)
  if (hit && hit.until > Date.now()) return hit.rows
  const data = await fetchCcc("/api/v1/map_regions", { gasDay })
  const rows = Array.isArray(data.regions) ? data.regions : []
  regionCache.set(gasDay, { until: Date.now() + ttl, rows })
  return rows
}

async function latestRegions(days) {
  const tail = days.slice(-14).reverse()
  for (const day of tail) {
    const rows = await loadRegions(day)
    if (rows.length) return { day, rows }
  }
  return { day: null, rows: [] }
}

async function loadAlarms() {
  if (alarmCache && alarmCache.until > Date.now()) return alarmCache.body
  const data = await fetchCcc("/api/v1/alarms")
  const body = (Array.isArray(data.alarms) ? data.alarms : []).map((row) => ({
    id: row.id,
    category: row.category || "",
    source: row.source || "",
    severity: row.severity || "",
    state: row.state || "",
    currentValue: row.currentValue || "",
    time: row.time || "",
  }))
  alarmCache = { until: Date.now() + ttl, body }
  return body
}

function readinessOf(clusters, snapshot) {
  const status = new Map()
  for (const row of snapshot.rows) status.set(row.cluster_id, row.run_status?.readiness || "")
  const counts = { ready: 0, qualified: 0, blocked: 0 }
  const zones = new Map()
  for (const cluster of clusters) {
    if (cluster.zone_id === "Z_goycay") continue
    const readiness = status.get(cluster.cluster_id)
    const bucket = readiness === "Ready" ? "ready" : readiness === "Qualified" ? "qualified" : "blocked"
    counts[bucket] += 1
    const zone = zones.get(cluster.zone_id) || { ready: 0, qualified: 0, blocked: 0 }
    zone[bucket] += 1
    zones.set(cluster.zone_id, zone)
  }
  const areas = { total: 0, ready: 0, qualified: 0, blocked: 0 }
  for (const zone of zones.values()) {
    areas.total += 1
    if (zone.blocked) areas.blocked += 1
    else if (zone.qualified) areas.qualified += 1
    else areas.ready += 1
  }
  return { day: snapshot.day, areas, clusters: { total: counts.ready + counts.qualified + counts.blocked, ...counts } }
}

function readFilter(url) {
  const region = url.searchParams.get("region") || ""
  const zone = url.searchParams.get("zone") || ""
  const cluster = url.searchParams.get("cluster") || ""
  if ((region && !/^R\d+$/.test(region)) || (zone && !/^Z_[A-Za-z0-9_]+$/.test(zone)) || (cluster && !/^[A-Za-z0-9_]{1,80}$/.test(cluster))) return null
  return { region, zone, cluster }
}

export function handleUfg(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/ufg/hierarchy" && url.pathname !== "/ufg/summary" && url.pathname !== "/ufg/trend" && url.pathname !== "/ufg/readiness" && url.pathname !== "/ufg/alarms") return false
  if (req.method !== "GET") {
    res.writeHead(405).end()
    return true
  }
  if (url.pathname === "/ufg/alarms") {
    loadAlarms().then(
      (body) => send(res, 200, { alarms: body }),
      () => res.writeHead(502).end(),
    )
    return true
  }
  if (url.pathname === "/ufg/hierarchy") {
    hierarchy().then(
      (body) => send(res, 200, { zones: body.zones, clusters: body.clusters }),
      () => res.writeHead(502).end(),
    )
    return true
  }
  const from = url.searchParams.get("from") || ""
  const to = url.searchParams.get("to") || from
  const days = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) ? daysOf(from, to) : null
  if (!days) {
    send(res, 400, { error: "bad range" })
    return true
  }
  const filter = readFilter(url)
  if (!filter) {
    send(res, 400, { error: "bad filter" })
    return true
  }
  if (url.pathname === "/ufg/readiness") {
    hierarchy()
      .then((body) => latestRegions(days).then((snapshot) => readinessOf(body.clusters, snapshot)))
      .then((body) => send(res, 200, body))
      .catch(() => res.writeHead(502).end())
    return true
  }
  if (url.pathname === "/ufg/trend") {
    const prevFrom = url.searchParams.get("prevFrom") || ""
    const prevTo = url.searchParams.get("prevTo") || ""
    const previous = /^\d{4}-\d{2}-\d{2}$/.test(prevFrom) && /^\d{4}-\d{2}-\d{2}$/.test(prevTo) ? daysOf(prevFrom, prevTo) : null
    if (!previous) {
      send(res, 400, { error: "bad range" })
      return true
    }
    hierarchy()
      .then((body) => trend(filter, body.index, from, to, prevFrom, prevTo))
      .then((body) => send(res, 200, body))
      .catch(() => res.writeHead(502).end())
    return true
  }
  hierarchy()
    .then((body) => {
      const names = new Map(body.clusters.map((cluster) => [cluster.cluster_id, cluster.name_en]))
      return loadBoard(from, to, "").then((rows) => {
        const summary = summarize(rows.filter((row) => kept(row, filter, body.index)))
        const scope = { region: filter.region, zone: filter.zone, cluster: "" }
        const compared = filter.region ? rows.filter((row) => kept(row, scope, body.index)) : []
        return { ...summary, extremes: filter.region ? extremes(compared, names) : null }
      })
    })
    .then((body) => send(res, 200, body))
    .catch(() => res.writeHead(502).end())
  return true
}
