import { cached } from "./cache.mjs"

const CCC_HUB = (process.env.CCC_HUB_BASE || "https://cccdev.esyasoft.app/newapi/hub/ccc").replace(/\/$/, "")

/** Snapshot shares from Screen 13 (base total 59,875). */
const BASE_TOTAL = 59875
const SHARES = {
  answeredOfTotal: 1,
  ahtSeconds: 161,
  aht: "02:41",
  serviceSatisfaction: 76.03,
  reasons: [
    { label: "Gas supply interruption", share: 4014 / BASE_TOTAL, paint: "teal" },
    { label: "Subscriber data update", share: 3079 / BASE_TOTAL, paint: "teal" },
    { label: "Address clarification", share: 1479 / BASE_TOTAL, paint: "orange" },
    { label: "Gas supply issue", share: 1285 / BASE_TOTAL, paint: "orange" },
    { label: "Request registration", share: 921 / BASE_TOTAL, paint: "orange" },
    { label: "Meter number verification", share: 899 / BASE_TOTAL, paint: "orange" },
    { label: "Meter replacement", share: 621 / BASE_TOTAL, paint: "orange" },
    { label: "Meter number confirmation", share: 615 / BASE_TOTAL, paint: "orange" },
  ],
  issues: [
    { label: "Supply interruption", share: 4014 / BASE_TOTAL, color: "#34efde" },
    { label: "Subscriber data", share: 3079 / BASE_TOTAL, color: "#4aa3d8" },
    { label: "Address", share: 1479 / BASE_TOTAL, color: "#2f5f9a" },
    { label: "Supply issue", share: 1285 / BASE_TOTAL, color: "#e07058" },
    { label: "Registration", share: 921 / BASE_TOTAL, color: "#e8a078" },
  ],
  quality: [
    { label: "Greeting & professionalism", value: 54.09, paint: "orange" },
    { label: "Customer verification", value: 76.03, paint: "teal" },
    { label: "Issue understanding & resolution", value: 74.59, paint: "blue" },
    { label: "Communication quality", value: 69.53, paint: "orange" },
    { label: "Process compliance", value: 74.73, paint: "teal" },
    { label: "Call closure", value: 67.05, paint: "orange" },
  ],
  operators: [
    { name: "Samirə Əliyeva", share: 6577 / BASE_TOTAL, ahtSeconds: 163, aht: "02:43", score: 86 },
    { name: "Kamandar Məmmədov", share: 6793 / BASE_TOTAL, ahtSeconds: 161, aht: "02:41", score: 87 },
    { name: "Fərid Rzayev", share: 6718 / BASE_TOTAL, ahtSeconds: 161, aht: "02:41", score: 87 },
    { name: "Murad Abdullayev", share: 6625 / BASE_TOTAL, ahtSeconds: 161, aht: "02:41", score: 87 },
  ],
}

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  res.end(JSON.stringify(body))
}

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

/** Deterministic RNG from date range so ±5% jitter does not flicker on refresh. */
function seededRand(seed) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function jitterShare(share, rand) {
  return share * (0.95 + rand() * 0.1)
}

function scaleCount(total, share, rand) {
  return Math.max(0, Math.round(total * jitterShare(share, rand)))
}

function buildFromTotal(total, from, to) {
  const rand = seededRand(`${from}|${to}|call-center`)
  const answered = Math.min(total, scaleCount(total, SHARES.answeredOfTotal, rand))
  return {
    totalCalls: total,
    answeredCalls: answered,
    ahtSeconds: SHARES.ahtSeconds,
    aht: SHARES.aht,
    serviceSatisfaction: SHARES.serviceSatisfaction,
    reasons: SHARES.reasons.map((row) => ({
      label: row.label,
      value: scaleCount(total, row.share, rand),
      paint: row.paint,
    })),
    issues: SHARES.issues.map((row) => ({
      label: row.label,
      value: scaleCount(total, row.share, rand),
      color: row.color,
    })),
    quality: SHARES.quality.map((row) => ({ ...row })),
    operators: SHARES.operators.map((row) => ({
      name: row.name,
      calls: scaleCount(total, row.share, rand),
      ahtSeconds: row.ahtSeconds,
      aht: row.aht,
      score: row.score,
    })),
  }
}

async function loadTotalCalls(from, to) {
  const url = new URL(`${CCC_HUB}/CallCenter/total_calls`)
  url.searchParams.set("date_from", from)
  url.searchParams.set("date_to", to)
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 25000)
  try {
    const response = await fetch(url, { signal: ctrl.signal })
    if (!response.ok) throw new Error(`ccc total_calls ${response.status}`)
    const body = await response.json()
    const total = num(body?.data?.data?.total_calls ?? body?.data?.total_calls ?? body?.total_calls)
    if (!(total >= 0)) throw new Error("bad total_calls")
    return total
  } finally {
    clearTimeout(timer)
  }
}

async function loadCallCenter(from, to) {
  const key = `brain-call-center:v2:${from}|${to}`
  return cached(key, async () => {
    const total = await loadTotalCalls(from, to)
    return buildFromTotal(total, from, to)
  })
}

export function handleBrainCallCenter(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/brain-call-center") return false
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
  loadCallCenter(from, to)
    .then((body) => send(res, 200, body))
    .catch((error) => {
      console.error(error)
      send(res, 502, { error: "call center unavailable" })
    })
  return true
}
