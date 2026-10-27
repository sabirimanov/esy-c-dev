import { cached, getCached, setCached } from "./cache.mjs"
import { duckdbUrl } from "./duckdb-origin.mjs"

const origin = "https://cccdev.esyasoft.app/cccapi/"

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

export function loadUfgHierarchy() {
  return hierarchy()
}

export async function loadClusterDemand(clusterId, from, to) {
  if (!/^[A-Za-z0-9_]{1,80}$/.test(clusterId)) return new Map()
  const key = `ufg:hourly:${clusterId}|${from}|${to}`
  const record = await cached(key, async () => {
    const data = await fetchCcc(`/api/v1/cluster_hourly/${clusterId}`, {
      gasDay: to,
      gasDayFrom: from,
      series: "true",
    })
    const out = {}
    for (const row of data.hours || []) {
      const date = String(row.gas_day || "").slice(0, 10)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
      const bucket = out[date] || { supply: 0, demand: 0 }
      const supply = Number(row.supply_kwh)
      const demand = Number(row.demand_kwh)
      if (Number.isFinite(supply)) bucket.supply += supply
      if (Number.isFinite(demand)) bucket.demand += demand
      out[date] = bucket
    }
    return out
  })
  return new Map(Object.entries(record || {}))
}

async function hierarchy() {
  return cached("ufg:hierarchy", async () => {
    const data = await fetchCcc("/api/v1/hierarchy")
    return {
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
    }
  })
}

async function loadClusterView(clusterId, gasDay) {
  if (!/^[A-Za-z0-9_]{1,80}$/.test(clusterId)) return null
  const key = `ufg:view:${clusterId}|${gasDay}`
  return cached(key, async () => {
    const data = await fetchCcc(`/api/v1/cluster_view/${clusterId}`, { gasDay, version: "1" })
    const supply = Number(data.sheet?.supply_kwh)
    const demand = Number(data.sheet?.demand_kwh)
    return Number.isFinite(supply) && Number.isFinite(demand) ? { supply, demand } : null
  })
}

function scopedClusters(clusters, filter) {
  if (filter.cluster) {
    const cluster = clusters.find((item) => item.cluster_id === filter.cluster)
    return cluster ? [cluster] : []
  }
  return clusters.filter((cluster) => {
    if (cluster.zone_id === "Z_goycay") return false
    if (filter.region && cluster.region_id !== filter.region) return false
    if (filter.zone && cluster.zone_id !== filter.zone) return false
    return true
  })
}

function ufgPercent(supply, demand) {
  return supply > 0 ? ((supply - demand) / supply) * 100 : null
}

async function collectSheets(clusters, days) {
  const byDay = new Map(days.map((day) => [day, { supply: 0, demand: 0, found: false }]))
  const byCluster = new Map(clusters.map((cluster) => [cluster.cluster_id, { supply: 0, demand: 0, found: false }]))
  if (!clusters.length || !days.length) return { byDay, byCluster }

  const uncachedClusters = new Set()
  for (const cluster of clusters) {
    for (const day of days) {
      if (getCached(`ufg:view:${cluster.cluster_id}|${day}`) === undefined) {
        uncachedClusters.add(cluster.cluster_id)
      }
    }
  }

  if (uncachedClusters.size > 0 && days.length > 1) {
    const firstDay = days[0]
    const lastDay = days[days.length - 1]
    await Promise.all(
      [...uncachedClusters].map(async (clusterId) => {
        try {
          const hourlyDays = await loadClusterDemand(clusterId, firstDay, lastDay)
          for (const day of days) {
            const viewKey = `ufg:view:${clusterId}|${day}`
            if (getCached(viewKey) !== undefined) continue
            const bucket = hourlyDays.get(day)
            if (!bucket || !(bucket.supply > 0)) {
              setCached(viewKey, null)
            }
          }
        } catch {
          // fallback to direct cluster_view calls
        }
      }),
    )
  }

  const jobs = []
  for (const cluster of clusters) {
    for (const day of days) jobs.push([cluster.cluster_id, day])
  }
  const queue = jobs.slice()
  async function worker() {
    while (queue.length) {
      const next = queue.shift()
      if (!next) return
      try {
        const sheet = await loadClusterView(next[0], next[1])
        if (!sheet) continue
        const day = byDay.get(next[1])
        const cluster = byCluster.get(next[0])
        day.supply += sheet.supply
        day.demand += sheet.demand
        day.found = true
        cluster.supply += sheet.supply
        cluster.demand += sheet.demand
        cluster.found = true
      } catch {
        // A missing day stays out of the total.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(48, jobs.length) }, () => worker()))
  return { byDay, byCluster }
}

function volumeOf(clusters, sheets) {
  let supply = 0
  let sale = 0
  let found = false
  for (const cluster of clusters) {
    const bucket = sheets.byCluster.get(cluster.cluster_id)
    if (!bucket?.found) continue
    supply += bucket.supply
    sale += bucket.demand
    found = true
  }
  if (!found) return { supply: 0, sale: null, loss: null, current: null }
  return { supply, sale, loss: supply - sale, current: ufgPercent(supply, sale) }
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

function extremesFrom(clusters, sheets) {
  let high = null
  let low = null
  for (const cluster of clusters) {
    const bucket = sheets.byCluster.get(cluster.cluster_id)
    if (!bucket?.found) continue
    const value = ufgPercent(bucket.supply, bucket.demand)
    if (value == null) continue
    const item = { id: cluster.cluster_id, name: cluster.name_en, value }
    if (value <= 40 && (!high || value > high.value)) high = item
    if (!low || value < low.value) low = item
  }
  return low ? { high, low } : null
}

function seriesFrom(days, sheets) {
  return days.map((day) => {
    const bucket = sheets.byDay.get(day)
    if (!bucket?.found) return null
    return ufgPercent(bucket.supply, bucket.demand)
  })
}

async function trend(filter, clusters, from, to, prevFrom, prevTo) {
  const key = `ufg:trend:${filter.region}|${filter.zone}|${filter.cluster}|${from}|${to}|${prevFrom}|${prevTo}`
  return cached(key, async () => {
    const currentDays = daysOf(from, to)
    const previousDays = daysOf(prevFrom, prevTo)
    const scope = scopedClusters(clusters, filter)
    const [currentSheets, previousSheets] = await Promise.all([
      collectSheets(scope, currentDays),
      collectSheets(scope, previousDays),
    ])
    return {
      current: seriesFrom(currentDays, currentSheets),
      previous: seriesFrom(previousDays, previousSheets),
      hourly: false,
      hours: [],
    }
  })
}

async function loadRegions(gasDay) {
  return cached(`ufg:regions:${gasDay}`, async () => {
    const data = await fetchCcc("/api/v1/map_regions", { gasDay })
    return Array.isArray(data.regions) ? data.regions : []
  })
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
  return cached("ufg:alarms", async () => {
    const data = await fetchCcc("/api/v1/alarms")
    return (Array.isArray(data.alarms) ? data.alarms : []).map((row) => ({
      id: row.id,
      category: row.category || "",
      source: row.source || "",
      severity: row.severity || "",
      state: row.state || "",
      currentValue: row.currentValue || "",
      time: row.time || "",
    }))
  })
}

function readinessOf(clusters, snapshot, filter) {
  const status = new Map()
  for (const row of snapshot.rows) status.set(row.cluster_id, row.run_status?.readiness || "")
  const counts = { ready: 0, qualified: 0, blocked: 0 }
  const zones = new Map()
  for (const cluster of clusters) {
    if (cluster.zone_id === "Z_goycay") continue
    if (filter.region && cluster.region_id !== filter.region) continue
    if (filter.zone && cluster.zone_id !== filter.zone) continue
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

function clusterNumber(cluster) {
  const fromId = /^c_(\d+)$/.exec(cluster.cluster_id || "")
  if (fromId) return fromId[1]
  const fromName = /^(\d+)\./.exec(cluster.name_en || "")
  return fromName ? fromName[1] : ""
}

function consumerNumbers(clusters, filter) {
  if (filter.cluster) {
    const cluster = clusters.find((item) => item.cluster_id === filter.cluster)
    const number = cluster ? clusterNumber(cluster) : ""
    return number ? [number] : []
  }
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

function consumerRegion(filter, cluster) {
  const place = filter.zone || filter.region || cluster?.region_id || ""
  if (place === "R01" || place === "Z_sumqayit") return "Sumgayit/Sumgayit"
  if (place === "R10" || place === "Z_sabuncu") return "Baku"
  if (place === "R24" || place === "Z_agsu" || place === "Z_ismayilli" || place === "Z_kurdemir" || place === "Z_ucar" || place === "Z_goycay") return "Agsu"
  return ""
}

async function loadConsumers(numbers, region = "") {
  const key = `ufg:consumers:${region ? `region:${region}` : numbers == null ? "*" : numbers.slice().sort().join(",")}`
  return cached(key, async () => {
    const remote = await fetch(duckdbUrl("/api/query"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        database: "meters-signal.duckdb",
        table: "devices",
        limit: 1,
        filters: region
          ? [{ column: "Region", op: "eq", value: region }]
          : numbers == null ? [] : [{ column: "Cluster no", op: "in", values: numbers }],
      }),
    })
    if (!remote.ok) throw new Error(String(remote.status))
    const data = await remote.json()
    const total = Number(data.total)
    if (!Number.isFinite(total)) throw new Error("bad total")
    return total
  })
}

async function loadMeterSplit(numbers, region = "") {
  const byRegion = Boolean(region) && !(numbers && numbers.length)
  if (numbers && numbers.length === 0 && !byRegion) return { smart: 0, retrofit: 0 }
  const key = `ufg:meters:${byRegion ? `region:${region}` : numbers == null ? "*" : numbers.slice().sort().join(",")}`
  return cached(key, async () => {
    const url = duckdbUrl("/api/meters")
    if (byRegion) url.searchParams.set("region", region)
    else if (numbers) url.searchParams.set("clusters", numbers.join(","))
    const remote = await fetch(url)
    if (!remote.ok) throw new Error(String(remote.status))
    const data = await remote.json()
    const smart = Number(data.smart)
    const retrofit = Number(data.retrofit)
    if (!Number.isFinite(smart) || !Number.isFinite(retrofit)) throw new Error("bad meters")
    return { smart, retrofit }
  })
}

const bakuCapacitySite = "Hacı Seyfəlli xətti (Nardaran QPS)"

async function loadCapacityMap() {
  return cached("ufg:capacityMap", async () => {
    const remote = await fetch(duckdbUrl("/api/query"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ database: "evc.duckdb", table: "Master Sheet", limit: 50, filters: [] }),
    })
    if (!remote.ok) throw new Error(String(remote.status))
    const data = await remote.json()
    const clusters = {}
    let baku = null
    for (const row of data.rows || []) {
      const site = String(row["Site Name / QPS ID/ Cluster ID / Customer ID"] || "")
      const value = Number(row.max_capacity)
      if (!Number.isFinite(value)) continue
      const daily = value * 24
      const match = /^Cluster (\d+)$/.exec(site)
      if (match) clusters[match[1]] = daily
      else if (site === bakuCapacitySite) baku = daily
    }
    return { clusters, baku }
  })
}

function capacityTotal(clustersObj, numbers) {
  const keys = numbers == null ? Object.keys(clustersObj || {}) : numbers
  let sum = 0
  let found = false
  for (const key of keys) {
    const value = clustersObj?.[key]
    if (value == null) continue
    sum += value
    found = true
  }
  return found ? sum : null
}

function capacityFor(sheet, filter, numbers) {
  const bakuPlace = filter.region === "R10" || filter.zone === "Z_sabuncu"
  const sumgayitPlace = filter.region === "R01" || filter.zone === "Z_sumqayit"
  if (filter.cluster || sumgayitPlace) return capacityTotal(sheet.clusters, numbers)
  if (bakuPlace) return sheet.baku
  if (!filter.region && !filter.zone) {
    const clusters = capacityTotal(sheet.clusters, null) ?? 0
    return sheet.baku == null ? clusters || null : clusters + sheet.baku
  }
  return null
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
  if (url.pathname !== "/ufg/hierarchy" && url.pathname !== "/ufg/summary" && url.pathname !== "/ufg/trend" && url.pathname !== "/ufg/readiness" && url.pathname !== "/ufg/alarms" && url.pathname !== "/ufg/meters" && url.pathname !== "/ufg/capacity") return false
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
  if (url.pathname === "/ufg/capacity") {
    const filter = readFilter(url)
    if (!filter) {
      send(res, 400, { error: "bad filter" })
      return true
    }
    hierarchy()
      .then(async (body) => {
        const numbers = filter.region || filter.zone || filter.cluster ? consumerNumbers(body.clusters, filter) : null
        const sheet = await loadCapacityMap()
        return { capacity: capacityFor(sheet, filter, numbers) }
      })
      .then((body) => send(res, 200, body))
      .catch(() => res.writeHead(502).end())
    return true
  }
  if (url.pathname === "/ufg/meters") {
    const filter = readFilter(url)
    if (!filter) {
      send(res, 400, { error: "bad filter" })
      return true
    }
    hierarchy()
      .then((body) => {
        const scoped = Boolean(filter.region || filter.zone || filter.cluster)
        const numbers = scoped ? consumerNumbers(body.clusters, filter) : null
        const selected = filter.cluster ? body.clusters.find((item) => item.cluster_id === filter.cluster) : null
        const regionName = scoped && !(numbers && numbers.length) ? consumerRegion(filter, selected) : ""
        return loadMeterSplit(numbers, regionName)
      })
      .then((body) => send(res, 200, body))
      .catch(() => res.writeHead(502).end())
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
    const key = `ufg:readiness:${filter.region}|${filter.zone}|${from}|${to}`
    cached(key, async () => {
      const body = await hierarchy()
      const snapshot = await latestRegions(days)
      return readinessOf(body.clusters, snapshot, filter)
    })
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
      .then((body) => trend(filter, body.clusters, from, to, prevFrom, prevTo))
      .then((body) => send(res, 200, body))
      .catch(() => res.writeHead(502).end())
    return true
  }
  const summaryKey = `ufg:summary:${filter.region}|${filter.zone}|${filter.cluster}|${from}|${to}`
  cached(summaryKey, async () => {
    const body = await hierarchy()
    const selectedClusters = scopedClusters(body.clusters, filter)
    const compared = filter.region ? scopedClusters(body.clusters, { region: filter.region, zone: filter.zone, cluster: "" }) : []
    const union = []
    const seen = new Set()
    for (const cluster of [...selectedClusters, ...compared]) {
      if (seen.has(cluster.cluster_id)) continue
      seen.add(cluster.cluster_id)
      union.push(cluster)
    }
    const numbers = filter.region || filter.zone || filter.cluster ? consumerNumbers(body.clusters, filter) : null
    const selected = filter.cluster ? body.clusters.find((item) => item.cluster_id === filter.cluster) : null
    const regionName = filter.region || filter.zone || filter.cluster ? consumerRegion(filter, selected) : ""
    const consumersPromise = (async () => {
      try {
        if (filter.cluster && numbers && numbers.length) return await loadConsumers(numbers)
        if (regionName) return await loadConsumers(null, regionName)
        if (numbers && numbers.length === 0) return 0
        return await loadConsumers(numbers)
      } catch {
        return null
      }
    })()
    const [sheets, consumers] = await Promise.all([collectSheets(union, days), consumersPromise])
    const volume = volumeOf(selectedClusters, sheets)
    const target = 5
    const current = volume.current
    return {
      current,
      target,
      loss: volume.loss,
      closure: current ? (target / current) * 100 : null,
      supply: volume.supply,
      sale: volume.sale,
      extremes: filter.region ? extremesFrom(compared, sheets) : null,
      consumers,
    }
  })
    .then((body) => send(res, 200, body))
    .catch(() => res.writeHead(502).end())
  return true
}
