import { cached } from "./cache.mjs"
import { pgQuery } from "./pg.mjs"

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  res.end(JSON.stringify(body))
}

function isoDay(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function clusterNo(clusterId) {
  if (!clusterId) return null
  const short = /^c_(\d+)$/i.exec(clusterId)
  if (short) return short[1]
  return null
}

function meterRegionSql(regionId, cityId, params) {
  if (cityId === "baku") {
    params.push("Baku")
    return `"Region" = $${params.length}`
  }
  if (cityId === "sumgayit") {
    params.push("Sumgayit/Sumgayit")
    return `"Region" = $${params.length}`
  }
  if (cityId === "agsu") {
    params.push("Agsu")
    return `"Region" = $${params.length}`
  }
  if (cityId === "kurdamir") {
    params.push("Kurdamir%")
    return `"Region" ILIKE $${params.length}`
  }
  if (cityId === "ujar") {
    params.push("Ujar%")
    return `"Region" ILIKE $${params.length}`
  }
  if (cityId === "ismayilli") {
    params.push("Ismayilli%")
    return `"Region" ILIKE $${params.length}`
  }
  if (regionId === "11") {
    params.push("Baku")
    return `"Region" = $${params.length}`
  }
  if (regionId === "8") {
    params.push("Sumgayit/Sumgayit")
    return `"Region" = $${params.length}`
  }
  if (regionId === "9") {
    params.push("Agsu", "Kurdamir%", "Ujar%", "Ismayilli%")
    const a = params.length - 3
    return `("Region" = $${a} OR "Region" ILIKE $${a + 1} OR "Region" ILIKE $${a + 2} OR "Region" ILIKE $${a + 3})`
  }
  return "TRUE"
}

function sensorRegionSql(regionId, cityId, params) {
  if (cityId === "baku" || regionId === "11") {
    params.push("Baku")
    return `region = $${params.length}`
  }
  if (cityId === "sumgayit" || regionId === "8") {
    params.push("Sumgait", "Sumgayit", "Sumgayit/Sumgayit")
    const a = params.length - 2
    return `region IN ($${a}, $${a + 1}, $${a + 2})`
  }
  if (regionId === "9" || cityId === "agsu" || cityId === "kurdamir" || cityId === "ujar" || cityId === "ismayilli") {
    params.push("Agsu", "Kurdamir%", "Ujar%", "Ismayilli%")
    const a = params.length - 3
    return `(region = $${a} OR region ILIKE $${a + 1} OR region ILIKE $${a + 2} OR region ILIKE $${a + 3})`
  }
  return "TRUE"
}

function meterClusterSql(clusterId, params) {
  const no = clusterNo(clusterId)
  if (!clusterId) return "TRUE"
  if (no) {
    params.push(no)
    return `"Cluster no" = $${params.length}`
  }
  params.push(clusterId)
  return `"Cluster no" = $${params.length}`
}

function sensorClusterSql(clusterId, params) {
  if (!clusterId) return "TRUE"
  const no = clusterNo(clusterId)
  if (no) {
    params.push(clusterId, `c_${no}`)
    const a = params.length - 1
    return `(cluster = $${a} OR cluster = $${a + 1})`
  }
  params.push(clusterId)
  return `cluster = $${params.length}`
}

function evcClusterSql(clusterId, params) {
  const no = clusterNo(clusterId)
  if (!clusterId) return "TRUE"
  if (no) {
    params.push(no)
    return `"Cluster No" = $${params.length}`
  }
  params.push(clusterId)
  return `"Cluster No" = $${params.length}`
}

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function pct(part, total) {
  if (!total) return null
  return (part / total) * 100
}

function mapTypeRow(row, hasRadio) {
  return {
    key: row.key,
    total: num(row.total),
    communicated: num(row.communicated),
    azercell: num(row.azercell),
    azercellTotal: num(row.azercell_total),
    bakcell: num(row.bakcell),
    bakcellTotal: num(row.bakcell_total),
    nc7: num(row.nc7),
    rsrp: hasRadio ? num(row.rsrp) : null,
    snr: hasRadio ? num(row.snr) : null,
    refDay: row.ref_day ? String(row.ref_day).slice(0, 10) : null,
    hasRadio,
  }
}

async function loadMeters(from, to, regionId, cityId, clusterId) {
  const params = [from, to]
  const meterRegion = meterRegionSql(regionId, cityId, params)
  const meterCluster = meterClusterSql(clusterId, params)
  const sql = `
  WITH master AS (
    SELECT d."Retrofit id" AS rid, d.operator,
           CASE WHEN d."New Msn" = d."Retrofit id" THEN 'smart' ELSE 'retrofit' END AS key
    FROM meters_signal.devices d
    WHERE d."New Msn" IS NOT NULL AND d."Retrofit id" IS NOT NULL
      AND (${meterRegion}) AND (${meterCluster})
  ),
  ref AS (
    SELECT COALESCE(
      (SELECT MAX(c."RTC"::date) FROM meters_signal.comms c
        JOIN master m ON m.rid = c."Retrofit Id"
        WHERE c."RTC"::date BETWEEN $1::date AND $2::date),
      (SELECT MAX(c."RTC"::date) FROM meters_signal.comms c
        JOIN master m ON m.rid = c."Retrofit Id")
    ) AS d
  ),
  on_ref AS (
    SELECT DISTINCT c."Retrofit Id" AS rid
    FROM meters_signal.comms c
    JOIN master m ON m.rid = c."Retrofit Id"
    WHERE c."RTC"::date = (SELECT d FROM ref)
  ),
  recent AS (
    SELECT DISTINCT c."Retrofit Id" AS rid
    FROM meters_signal.comms c
    JOIN master m ON m.rid = c."Retrofit Id"
    WHERE c."RTC"::date >= (SELECT d FROM ref) - 7
  )
  SELECT m.key,
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE o.rid IS NOT NULL)::int AS communicated,
         COUNT(*) FILTER (WHERE m.operator = 'Azercell')::int AS azercell_total,
         COUNT(*) FILTER (WHERE m.operator = 'Azercell' AND o.rid IS NOT NULL)::int AS azercell,
         COUNT(*) FILTER (WHERE m.operator = 'Bakcell')::int AS bakcell_total,
         COUNT(*) FILTER (WHERE m.operator = 'Bakcell' AND o.rid IS NOT NULL)::int AS bakcell,
         COUNT(*) FILTER (
           WHERE recent.rid IS NULL AND EXISTS (
             SELECT 1 FROM meters_signal.comms c
             WHERE c."Retrofit Id" = m.rid AND c."RTC"::date < (SELECT d FROM ref) - 7
           )
         )::int AS nc7,
         (SELECT d FROM ref) AS ref_day
  FROM master m
  LEFT JOIN on_ref o ON o.rid = m.rid
  LEFT JOIN recent ON recent.rid = m.rid
  GROUP BY m.key
  `
  const result = await pgQuery(sql, params)
  return result.rows.map((row) => mapTypeRow({ ...row, rsrp: 0, snr: 0 }, true))
}

async function loadMeterRadio(_from, _to, regionId, cityId, clusterId) {
  const params = []
  const meterRegion = meterRegionSql(regionId, cityId, params)
  const meterCluster = meterClusterSql(clusterId, params)
  const sql = `
  WITH master AS (
    SELECT d."Retrofit id" AS rid,
           CASE WHEN d."New Msn" = d."Retrofit id" THEN 'smart' ELSE 'retrofit' END AS key
    FROM meters_signal.devices d
    WHERE d."New Msn" IS NOT NULL AND d."Retrofit id" IS NOT NULL
      AND (${meterRegion}) AND (${meterCluster})
  ),
  latest AS (
    SELECT DISTINCT ON (g."Retrofit Id") g."Retrofit Id" AS rid, g."RSRP" AS rsrp, g."SNR" AS snr
    FROM meters_signal.gsm g
    JOIN master m ON m.rid = g."Retrofit Id"
    ORDER BY g."Retrofit Id", g."RTC" DESC
  )
  SELECT m.key,
         COUNT(*) FILTER (WHERE l.rsrp IS NOT NULL AND l.rsrp < -110)::int AS rsrp,
         COUNT(*) FILTER (WHERE l.snr IS NOT NULL AND l.snr < 13)::int AS snr
  FROM master m
  LEFT JOIN latest l ON l.rid = m.rid
  GROUP BY m.key
  `
  const result = await pgQuery(sql, params)
  return new Map(result.rows.map((row) => [row.key, { rsrp: num(row.rsrp), snr: num(row.snr) }]))
}

async function loadSensorsEvcs(from, to, regionId, cityId, clusterId) {
  const params = [from, to]
  const sensorRegion = sensorRegionSql(regionId, cityId, params)
  const sensorCluster = sensorClusterSql(clusterId, params)
  const evcRegion = meterRegionSql(regionId, cityId, params)
  const evcCluster = evcClusterSql(clusterId, params)
  const sql = `
  WITH
  pressure_master AS (
    SELECT s.device_id AS rid, s.operator, 'pressure'::text AS key
    FROM sensor_data.sensor_master s
    WHERE s.sensor_type = 'Pressure' AND (${sensorRegion}) AND (${sensorCluster})
  ),
  temperature_master AS (
    SELECT s.device_id AS rid, s.operator, 'temperature'::text AS key
    FROM sensor_data.sensor_master s
    WHERE s.sensor_type = 'Temperature' AND (${sensorRegion}) AND (${sensorCluster})
  ),
  evc_non_master AS (
    SELECT e."Device ID" AS rid, e.operator, 'evc-non'::text AS key
    FROM evc.evc_master e
    WHERE e."EVC type" = 'Non-Commercial' AND (${evcRegion}) AND (${evcCluster})
  ),
  evc_com_master AS (
    SELECT e."Device ID" AS rid, e.operator, 'evc-com'::text AS key
    FROM evc.evc_master e
    WHERE e."EVC type" = 'Commercial' AND (${evcRegion}) AND (${evcCluster})
  ),
  sensor_master AS (
    SELECT * FROM pressure_master UNION ALL SELECT * FROM temperature_master
  ),
  evc_master AS (
    SELECT * FROM evc_non_master UNION ALL SELECT * FROM evc_com_master
  ),
  sensor_ref AS (
    SELECT COALESCE(
      (SELECT MAX(r.reading_time::date) FROM sensor_data.sensor_readings r
        JOIN sensor_master m ON m.rid = r.device_id
        WHERE r.reading_time::date BETWEEN $1::date AND $2::date),
      (SELECT MAX(r.reading_time::date) FROM sensor_data.sensor_readings r
        JOIN sensor_master m ON m.rid = r.device_id)
    ) AS d
  ),
  -- Commercial EVCs have no rows in evc_pressure_raw; use communication_daily for both EVC types
  evc_ref AS (
    SELECT COALESCE(
      (SELECT MAX(c.communication_date) FROM evc.evc_communication_daily c
        JOIN evc_master m ON m.rid = c.device_id
        WHERE c.communication_date BETWEEN $1::date AND $2::date),
      (SELECT MAX(c.communication_date) FROM evc.evc_communication_daily c
        JOIN evc_master m ON m.rid = c.device_id)
    ) AS d
  ),
  sensor_on_ref AS (
    SELECT DISTINCT r.device_id AS rid
    FROM sensor_data.sensor_readings r
    JOIN sensor_master m ON m.rid = r.device_id
    WHERE r.reading_time::date = (SELECT d FROM sensor_ref)
  ),
  sensor_recent AS (
    SELECT DISTINCT r.device_id AS rid
    FROM sensor_data.sensor_readings r
    JOIN sensor_master m ON m.rid = r.device_id
    WHERE r.reading_time::date >= (SELECT d FROM sensor_ref) - 7
  ),
  evc_on_ref AS (
    SELECT DISTINCT c.device_id AS rid
    FROM evc.evc_communication_daily c
    JOIN evc_master m ON m.rid = c.device_id
    WHERE c.communication_date = (SELECT d FROM evc_ref)
  ),
  evc_recent AS (
    SELECT DISTINCT c.device_id AS rid
    FROM evc.evc_communication_daily c
    JOIN evc_master m ON m.rid = c.device_id
    WHERE c.communication_date >= (SELECT d FROM evc_ref) - 7
  ),
  sensor_stats AS (
    SELECT m.key,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE o.rid IS NOT NULL)::int AS communicated,
           COUNT(*) FILTER (WHERE m.operator = 'Azercell')::int AS azercell_total,
           COUNT(*) FILTER (WHERE m.operator = 'Azercell' AND o.rid IS NOT NULL)::int AS azercell,
           COUNT(*) FILTER (WHERE m.operator = 'Bakcell')::int AS bakcell_total,
           COUNT(*) FILTER (WHERE m.operator = 'Bakcell' AND o.rid IS NOT NULL)::int AS bakcell,
           COUNT(*) FILTER (
             WHERE recent.rid IS NULL AND EXISTS (
               SELECT 1 FROM sensor_data.sensor_readings r
               WHERE r.device_id = m.rid AND r.reading_time::date < (SELECT d FROM sensor_ref) - 7
             )
           )::int AS nc7,
           (SELECT d FROM sensor_ref) AS ref_day
    FROM sensor_master m
    LEFT JOIN sensor_on_ref o ON o.rid = m.rid
    LEFT JOIN sensor_recent recent ON recent.rid = m.rid
    GROUP BY m.key
  ),
  evc_stats AS (
    SELECT m.key,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE o.rid IS NOT NULL)::int AS communicated,
           COUNT(*) FILTER (WHERE m.operator = 'Azercell')::int AS azercell_total,
           COUNT(*) FILTER (WHERE m.operator = 'Azercell' AND o.rid IS NOT NULL)::int AS azercell,
           COUNT(*) FILTER (WHERE m.operator = 'Bakcell')::int AS bakcell_total,
           COUNT(*) FILTER (WHERE m.operator = 'Bakcell' AND o.rid IS NOT NULL)::int AS bakcell,
           COUNT(*) FILTER (
             WHERE recent.rid IS NULL AND EXISTS (
               SELECT 1 FROM evc.evc_communication_daily c
               WHERE c.device_id = m.rid AND c.communication_date < (SELECT d FROM evc_ref) - 7
             )
           )::int AS nc7,
           (SELECT d FROM evc_ref) AS ref_day
    FROM evc_master m
    LEFT JOIN evc_on_ref o ON o.rid = m.rid
    LEFT JOIN evc_recent recent ON recent.rid = m.rid
    GROUP BY m.key
  )
  SELECT * FROM sensor_stats
  UNION ALL SELECT * FROM evc_stats
  `
  const result = await pgQuery(sql, params)
  return result.rows.map((row) => mapTypeRow({ ...row, rsrp: null, snr: null }, false))
}

async function loadChart(from, to, regionId, cityId, clusterId) {
  const params = [from, to]
  const meterRegion = meterRegionSql(regionId, cityId, params)
  const meterCluster = meterClusterSql(clusterId, params)
  const sql = `
  WITH master AS (
    SELECT d."Retrofit id" AS rid
    FROM meters_signal.devices d
    WHERE d."New Msn" IS NOT NULL AND d."Retrofit id" IS NOT NULL
      AND (${meterRegion}) AND (${meterCluster})
  ),
  installed AS (
    SELECT COUNT(*)::int AS n FROM master
  ),
  days AS (
    SELECT generate_series($1::date, $2::date, INTERVAL '1 day')::date AS d
  ),
  daily AS (
    SELECT c."RTC"::date AS d, COUNT(DISTINCT c."Retrofit Id")::int AS communicated
    FROM meters_signal.comms c
    JOIN master m ON m.rid = c."Retrofit Id"
    WHERE c."RTC"::date BETWEEN $1::date AND $2::date
    GROUP BY 1
  )
  SELECT days.d::text AS day,
         (SELECT n FROM installed) AS installed,
         COALESCE(daily.communicated, 0)::int AS communicated
  FROM days
  LEFT JOIN daily ON daily.d = days.d
  ORDER BY days.d
  `
  const result = await pgQuery(sql, params)
  return result.rows.map((row) => ({
    day: String(row.day).slice(0, 10),
    installed: num(row.installed),
    communicated: num(row.communicated),
    rate: pct(num(row.communicated), num(row.installed)),
  }))
}

async function loadConnectivity(from, to, regionId, cityId, clusterId) {
  const key = `connectivity:v4:${from}|${to}|${regionId || ""}|${cityId || ""}|${clusterId || ""}`
  return cached(key, async () => {
    const [meters, radio, other, chart] = await Promise.all([
      loadMeters(from, to, regionId, cityId, clusterId),
      loadMeterRadio(from, to, regionId, cityId, clusterId),
      loadSensorsEvcs(from, to, regionId, cityId, clusterId),
      loadChart(from, to, regionId, cityId, clusterId),
    ])
    const order = ["smart", "retrofit", "pressure", "temperature", "evc-non", "evc-com"]
    const byKey = new Map([...meters, ...other].map((row) => [row.key, row]))
    for (const [keyName, radioRow] of radio.entries()) {
      const row = byKey.get(keyName)
      if (row) {
        row.rsrp = radioRow.rsrp
        row.snr = radioRow.snr
      }
    }
    const types = order.map((keyName) => byKey.get(keyName) || {
      key: keyName,
      total: 0,
      communicated: 0,
      azercell: 0,
      azercellTotal: 0,
      bakcell: 0,
      bakcellTotal: 0,
      nc7: 0,
      rsrp: keyName === "smart" || keyName === "retrofit" ? 0 : null,
      snr: keyName === "smart" || keyName === "retrofit" ? 0 : null,
      refDay: null,
      hasRadio: keyName === "smart" || keyName === "retrofit",
    })
    const total = types.reduce((sum, row) => sum + row.total, 0)
    const communicated = types.reduce((sum, row) => sum + row.communicated, 0)
    const nc7 = types.reduce((sum, row) => sum + row.nc7, 0)
    return {
      from,
      to,
      types,
      chart,
      kpis: {
        total,
        communicated,
        rate: pct(communicated, total),
        nc7,
      },
    }
  })
}

export function handleConnectivity(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/connectivity") return false
  if (req.method !== "GET") {
    res.writeHead(405).end()
    return true
  }
  const from = isoDay(url.searchParams.get("from") || "")
  const to = isoDay(url.searchParams.get("to") || "") || from
  if (!from || !to || from > to) {
    send(res, 400, { error: "bad range" })
    return true
  }
  const regionId = url.searchParams.get("region") || ""
  const cityId = url.searchParams.get("city") || ""
  const clusterId = url.searchParams.get("cluster") || ""
  if ((regionId && !/^\d{1,2}$/.test(regionId)) || (cityId && !/^[a-z0-9_-]{1,40}$/i.test(cityId)) || (clusterId && !/^[A-Za-z0-9_]{1,80}$/.test(clusterId))) {
    send(res, 400, { error: "bad filter" })
    return true
  }
  loadConnectivity(from, to, regionId || null, cityId || null, clusterId || null)
    .then((body) => send(res, 200, body))
    .catch((error) => {
      console.error(error)
      send(res, 502, { error: "connectivity unavailable" })
    })
  return true
}
