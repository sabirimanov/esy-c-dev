import { cached } from "./cache.mjs"
import { esyduckdbQuery } from "./esyduckdb.mjs"
import { pgQuery } from "./pg.mjs"

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  res.end(JSON.stringify(body))
}

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

// Only meters present in meter master, classified by consumer meter-number match.
// Non-residential = QEYRİ-ƏHALİ; residential = ƏHALİ; unmatched master rows are excluded.
const COUNTS_SQL = `WITH devices AS (
  SELECT btrim("New Msn") AS msn, btrim("Retrofit id") AS rid
  FROM meters_signal.devices
  WHERE "New Msn" IS NOT NULL AND "Retrofit id" IS NOT NULL
),
qeyri AS (
  SELECT DISTINCT btrim("SAYGAC_ NOMRE_") AS msn
  FROM consumers."QEYRİ-ƏHALİ"
  WHERE NULLIF(btrim("SAYGAC_ NOMRE_"), '') IS NOT NULL
),
ahali AS (
  SELECT DISTINCT btrim("Sayğac №") AS msn
  FROM consumers."ƏHALİ"
  WHERE NULLIF(btrim("Sayğac №"), '') IS NOT NULL
),
meter_counts AS (
  SELECT
    count(*) FILTER (WHERE q_msn.msn IS NOT NULL OR q_rid.msn IS NOT NULL)::int AS non_residential,
    count(*) FILTER (
      WHERE (a_msn.msn IS NOT NULL OR a_rid.msn IS NOT NULL)
        AND q_msn.msn IS NULL AND q_rid.msn IS NULL
    )::int AS residential
  FROM devices d
  LEFT JOIN qeyri q_msn ON q_msn.msn = d.msn
  LEFT JOIN qeyri q_rid ON q_rid.msn = d.rid
  LEFT JOIN ahali a_msn ON a_msn.msn = d.msn
  LEFT JOIN ahali a_rid ON a_rid.msn = d.rid
)
SELECT
  m.residential,
  m.non_residential,
  (SELECT count(*)::int FROM evc.evc_master) AS evc,
  (SELECT count(*)::int FROM sensor_data.sensor_master WHERE sensor_type = 'Pressure') AS pressure,
  (SELECT count(*)::int FROM sensor_data.sensor_master WHERE sensor_type = 'Temperature') AS temperature
FROM meter_counts m`

async function loadCounts() {
  try {
    const rows = await esyduckdbQuery(COUNTS_SQL, { limit: 1, timeoutMs: 20000 })
    return rows[0] || null
  } catch {
    const result = await pgQuery(COUNTS_SQL)
    return result.rows[0] || null
  }
}

export function handleCalibration(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/calibration") return false
  if (req.method !== "GET") {
    res.writeHead(405).end()
    return true
  }
  cached("calibration:counts:v2-meter-master", async () => {
    const row = await loadCounts()
    if (!row) throw new Error("empty")
    const residential = num(row.residential)
    const nonResidential = num(row.non_residential)
    const balance = num(row.evc)
    const pressure = num(row.pressure)
    const temperature = num(row.temperature)
    return {
      residential,
      nonResidential,
      balance,
      pressure,
      temperature,
      total: residential + nonResidential + balance + pressure + temperature,
    }
  })
    .then((body) => send(res, 200, body))
    .catch(() => send(res, 502, { error: "upstream unavailable" }))
  return true
}
