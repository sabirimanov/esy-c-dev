import fs from "node:fs"
import { clearCache } from "./cache.mjs"

const statePath = new URL("./wall-state.json", import.meta.url)
const clients = new Set()
const periods = new Set(["Today", "Last 7 Days", "Last 30 Days", "Last Month", "This Year", "This Month"])
const regions = new Set(["1", "2", "3", "4", "6", "7", "8", "9", "11", "12"])
const legacyRegions = { baku: "11", "absheron-khizi": "8", "daghlig-shirvan": "9" }
const cities = {
  "11": new Set(["baku"]),
  "8": new Set(["sumgayit"]),
  "9": new Set(["agsu", "kurdamir", "ujar", "ismayilli", "goychay"]),
}

function cleanRegion(id) {
  if (id == null || id === "") return null
  if (legacyRegions[id]) return legacyRegions[id]
  return regions.has(id) ? id : null
}

function cleanCity(regionId, cityId) {
  if (!regionId || typeof cityId !== "string" || !cityId) return null
  return cities[regionId]?.has(cityId) ? cityId : null
}

function cleanCluster(id) {
  if (id == null || id === "") return null
  return typeof id === "string" && /^[A-Za-z0-9_]{1,80}$/.test(id) ? id : null
}

function orderDates(date, dateTo) {
  return date <= dateTo ? [date, dateTo] : [dateTo, date]
}

function bakuView() {
  const date = new Date(Date.now() + 4 * 3600 * 1000)
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() }
}

function snocFields(raw) {
  const view = bakuView()
  const range = raw?.snocRange === "24h" || raw?.snocRange === "7d" ? raw.snocRange : "7d"
  const tab = raw?.snocTab === "day" || raw?.snocTab === "month" || raw?.snocTab === "year" || raw?.snocTab === "range" ? raw.snocTab : "range"
  const quick = raw?.snocQuick === "now" || raw?.snocQuick === "yesterday" || raw?.snocQuick === "custom" ? raw.snocQuick : "now"
  const viewY = Number.isInteger(raw?.snocViewY) ? raw.snocViewY : view.y
  const viewM = Number.isInteger(raw?.snocViewM) && raw.snocViewM >= 0 && raw.snocViewM <= 11 ? raw.snocViewM : view.m
  const storedEnd = Number.isInteger(raw?.snocEnd) && raw.snocEnd > 0 ? raw.snocEnd : null
  const end = quick === "now" ? Math.floor(Date.now() / 1000) : storedEnd
  return { snocRange: range, snocEnd: end, snocTab: tab, snocQuick: quick, snocViewY: viewY, snocViewM: viewM }
}

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(statePath, "utf8"))
    if (raw && typeof raw.date === "string") {
      const regionId = cleanRegion(raw.regionId)
      const dateTo = typeof raw.dateTo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.dateTo) ? raw.dateTo : raw.date
      const [date, end] = orderDates(raw.date, dateTo)
      return {
        date,
        dateTo: end,
        regionId,
        cityId: cleanCity(regionId, raw.cityId),
        clusterId: cleanCluster(raw.clusterId),
        regionSet: Boolean(raw.regionSet),
        rev: Number(raw.rev) || 1,
        seed: Number.isInteger(raw.seed) && raw.seed >= 0 ? raw.seed : 0,
        period: raw.period === "" || periods.has(raw.period) ? raw.period : "Last 30 Days",
        ufgOpen: Boolean(raw.ufgOpen),
        reload: Number.isInteger(raw.reload) && raw.reload >= 0 ? raw.reload : 0,
        ...snocFields(raw),
      }
    }
  } catch {
    // first boot
  }
  return {
    date: "2026-09-30",
    dateTo: "2026-09-30",
    regionId: null,
    cityId: null,
    clusterId: null,
    regionSet: false,
    rev: 1,
    seed: 0,
    period: "Last 30 Days",
    ufgOpen: false,
    reload: 0,
    ...snocFields(null),
  }
}

let state = load()

function persist() {
  fs.writeFileSync(statePath, JSON.stringify(state))
}

function broadcast() {
  const packet = `data: ${JSON.stringify({ ...state, now: Date.now() })}\n\n`
  for (const res of clients) res.write(packet)
}

setInterval(() => {
  for (const res of clients) res.write(":\n\n")
}, 20000).unref()

export function handleSync(req, res) {
  const path = (req.url || "").split("?")[0]
  if (path === "/cache/clear") {
    if (req.method !== "GET" && req.method !== "POST" && req.method !== "DELETE") {
      res.writeHead(405).end()
      return true
    }
    const info = clearCache()
    state = {
      ...state,
      seed: (Number(state.seed) || 0) + 1,
      rev: state.rev + 1,
    }
    persist()
    broadcast()
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" })
    res.end(JSON.stringify({ ...info, seed: state.seed, rev: state.rev }))
    return true
  }
  if (path !== "/sync") return false

  if (req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    })
    res.write("retry: 5000\n\n")
    res.write(`data: ${JSON.stringify({ ...state, now: Date.now() })}\n\n`)
    clients.add(res)
    req.on("close", () => clients.delete(res))
    return true
  }

  if (req.method === "POST") {
    const chunks = []
    let size = 0
    req.on("data", (chunk) => {
      size += chunk.length
      if (size < 2000) chunks.push(chunk)
    })
    req.on("end", () => {
      if (size >= 2000) {
        res.writeHead(413).end()
        return
      }
      let patch
      try {
        patch = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")
      } catch {
        res.writeHead(400).end()
        return
      }
      const next = { ...state }
      if (typeof patch.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(patch.date)) next.date = patch.date
      if (typeof patch.dateTo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(patch.dateTo)) next.dateTo = patch.dateTo
      if ("regionId" in patch && (patch.regionId === null || typeof patch.regionId === "string")) {
        next.regionId = cleanRegion(patch.regionId)
      }
      if ("cityId" in patch && (patch.cityId === null || typeof patch.cityId === "string")) {
        next.cityId = patch.cityId || null
      }
      next.cityId = cleanCity(next.regionId, next.cityId)
      if ("clusterId" in patch) next.clusterId = cleanCluster(patch.clusterId)
      else if ("regionId" in patch || "cityId" in patch) next.clusterId = null
      const [date, dateTo] = orderDates(next.date, next.dateTo || next.date)
      next.date = date
      next.dateTo = dateTo
      if ("regionSet" in patch) next.regionSet = Boolean(patch.regionSet)
      if (Number.isInteger(patch.seed) && patch.seed >= 0 && patch.seed < 1e10) next.seed = patch.seed
      if (typeof patch.period === "string" && (patch.period === "" || periods.has(patch.period))) next.period = patch.period
      if ("ufgOpen" in patch) next.ufgOpen = Boolean(patch.ufgOpen)
      if (patch.snocRange === "24h" || patch.snocRange === "7d") next.snocRange = patch.snocRange
      if (patch.snocTab === "day" || patch.snocTab === "month" || patch.snocTab === "year" || patch.snocTab === "range") next.snocTab = patch.snocTab
      if (patch.snocQuick === "now" || patch.snocQuick === "yesterday" || patch.snocQuick === "custom") next.snocQuick = patch.snocQuick
      if (Number.isInteger(patch.snocViewY) && patch.snocViewY > 2000 && patch.snocViewY < 3000) next.snocViewY = patch.snocViewY
      if (Number.isInteger(patch.snocViewM) && patch.snocViewM >= 0 && patch.snocViewM <= 11) next.snocViewM = patch.snocViewM
      if (patch.snocEnd === null || (Number.isInteger(patch.snocEnd) && patch.snocEnd > 0)) next.snocEnd = patch.snocEnd
      if (next.snocQuick === "now") next.snocEnd = Math.floor(Date.now() / 1000)
      if (patch.clearCache === true) {
        clearCache()
        next.seed = (Number(state.seed) || 0) + 1
      }
      if (patch.reload === true) {
        clearCache()
        next.reload = (Number(state.reload) || 0) + 1
      }
      next.rev = state.rev + 1
      state = next
      persist()
      broadcast()
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(state))
    })
    return true
  }

  res.writeHead(405).end()
  return true
}
