import { cached } from "./cache.mjs"
import { esyduckdbQuery } from "./esyduckdb.mjs"
import { pgQuery } from "./pg.mjs"

const TELCO_ESCALATIONS = 50

const ACTION_ORDER = [
  "Onsite reconfiguration / force-push",
  "Physical SIM change",
  "Retrofit replacement",
  "Other resolution action",
  "Asset verification / mismatch",
  "SIM seating correction",
  "Meter change",
]

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  res.end(JSON.stringify(body))
}

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function isoDay(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function sqlLit(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function regionClause(regionId, cityId) {
  if (cityId === "baku" || regionId === "11") return `region = 'Baku'`
  if (cityId === "sumgayit" || regionId === "8") return `region = 'Sumgayit/Sumgayit'`
  if (cityId === "agsu") return `region = 'Agsu'`
  if (cityId === "kurdamir") return `region ILIKE 'Kurdamir%'`
  if (cityId === "ujar") return `region ILIKE 'Ujar%'`
  if (cityId === "ismayilli") return `region ILIKE 'Ismayilli%'`
  if (regionId === "9") return `(region = 'Agsu' OR region ILIKE 'Kurdamir%' OR region ILIKE 'Ujar%' OR region ILIKE 'Ismayilli%')`
  return "TRUE"
}

function buildSql(from, to, regionId, cityId) {
  const region = regionClause(regionId, cityId)
  return `WITH scoped AS (
  SELECT
    attendance,
    final_status,
    resolution_action,
    coalesce(last_visit, first_visit)::date AS visit_day
  FROM om_jobs.om_jobs
  WHERE coalesce(last_visit, first_visit)::date BETWEEN DATE ${sqlLit(from)} AND DATE ${sqlLit(to)}
    AND (${region})
),
ref AS (
  SELECT COALESCE(MAX(visit_day), DATE ${sqlLit(to)}) AS d FROM scoped
),
summary AS (
  SELECT
    count(*)::int AS assigned,
    count(*) FILTER (WHERE attendance = 'Attended')::int AS attended,
    count(*) FILTER (WHERE final_status = 'Resolved')::int AS resolved,
    count(*) FILTER (WHERE attendance = 'Attended' AND final_status IS DISTINCT FROM 'Resolved')::int AS attended_not_resolved,
    count(*) FILTER (WHERE attendance = 'Not attended')::int AS not_attended,
    count(*) FILTER (WHERE visit_day > (SELECT d FROM ref) - 7)::int AS visits_7,
    count(*) FILTER (WHERE visit_day > (SELECT d FROM ref) - 30)::int AS visits_30,
    (SELECT d FROM ref) AS ref_day
  FROM scoped
),
actions AS (
  SELECT
    CASE
      WHEN resolution_action = ANY(ARRAY[
        'Other resolution action',
        'Replacement pending',
        'Requested Cell Tower Optimization'
      ]) OR resolution_action IS NULL OR btrim(resolution_action) = ''
      THEN 'Other resolution action'
      ELSE resolution_action
    END AS action,
    count(*)::int AS n
  FROM scoped
  WHERE final_status = 'Resolved'
  GROUP BY 1
),
months AS (
  SELECT
    to_char(date_trunc('month', visit_day), 'YYYY-MM') AS ym,
    count(*)::int AS assigned,
    count(*) FILTER (WHERE attendance = 'Attended')::int AS attended,
    count(*) FILTER (WHERE final_status = 'Resolved')::int AS resolved
  FROM scoped
  GROUP BY 1
),
daily AS (
  SELECT
    visit_day AS day,
    count(*)::int AS assigned,
    count(*) FILTER (WHERE final_status = 'Resolved')::int AS resolved,
    count(*) FILTER (WHERE final_status = 'Pending')::int AS pending
  FROM scoped
  GROUP BY 1
)
SELECT
  (SELECT row_to_json(summary) FROM summary) AS summary,
  (SELECT coalesce(json_agg(row_to_json(actions) ORDER BY n DESC), '[]'::json) FROM actions) AS actions,
  (SELECT coalesce(json_agg(row_to_json(months) ORDER BY ym), '[]'::json) FROM months) AS months,
  (SELECT coalesce(json_agg(row_to_json(daily) ORDER BY day), '[]'::json) FROM daily) AS daily`
}

function share(part, whole) {
  return whole > 0 ? (part / whole) * 100 : null
}

function mapPayload(row) {
  const summary = typeof row.summary === "string" ? JSON.parse(row.summary) : row.summary || {}
  const actionsRaw = typeof row.actions === "string" ? JSON.parse(row.actions) : row.actions || []
  const monthsRaw = typeof row.months === "string" ? JSON.parse(row.months) : row.months || []
  const dailyRaw = typeof row.daily === "string" ? JSON.parse(row.daily) : row.daily || []

  const assigned = num(summary.assigned)
  const attended = num(summary.attended)
  const resolved = num(summary.resolved)
  const byAction = new Map(actionsRaw.map((item) => [String(item.action), num(item.n)]))
  // Fold any unexpected labels into Other
  let other = num(byAction.get("Other resolution action"))
  for (const [action, count] of byAction) {
    if (ACTION_ORDER.includes(action)) continue
    other += count
    byAction.delete(action)
  }
  byAction.set("Other resolution action", other)

  const actions = ACTION_ORDER.map((label) => {
    const count = num(byAction.get(label))
    return {
      label,
      count,
      share: share(count, resolved),
    }
  })

  const months = monthsRaw.map((item) => {
    const monthAssigned = num(item.assigned)
    const monthResolved = num(item.resolved)
    return {
      ym: String(item.ym),
      assigned: monthAssigned,
      attended: num(item.attended),
      resolved: monthResolved,
      rate: share(monthResolved, monthAssigned),
    }
  })

  const daily = dailyRaw.map((item) => ({
    day: String(item.day).slice(0, 10),
    assigned: num(item.assigned),
    resolved: num(item.resolved),
    pending: num(item.pending),
  }))

  return {
    assigned,
    attended,
    resolved,
    attendedNotResolved: num(summary.attended_not_resolved),
    notAttended: num(summary.not_attended),
    resolutionRate: share(resolved, assigned),
    visits7: num(summary.visits_7),
    visits30: num(summary.visits_30),
    refDay: summary.ref_day ? String(summary.ref_day).slice(0, 10) : null,
    telco: TELCO_ESCALATIONS,
    actions,
    months,
    daily,
  }
}

async function loadOmJobs(from, to, regionId, cityId) {
  const sql = buildSql(from, to, regionId, cityId)
  try {
    const rows = await esyduckdbQuery(sql, { limit: 1, timeoutMs: 20000 })
    return mapPayload(rows[0] || {})
  } catch {
    const result = await pgQuery(sql)
    return mapPayload(result.rows[0] || {})
  }
}

export function handleOmJobs(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/om-jobs") return false
  if (req.method !== "GET") {
    res.writeHead(405).end()
    return true
  }
  const from = isoDay(url.searchParams.get("from"))
  const to = isoDay(url.searchParams.get("to"))
  const regionId = url.searchParams.get("region") || ""
  const cityId = url.searchParams.get("city") || ""
  if (!from || !to || from > to) {
    send(res, 400, { error: "bad range" })
    return true
  }
  if ((regionId && !/^\d{1,3}$/.test(regionId)) || (cityId && !/^[a-z0-9_]+$/i.test(cityId))) {
    send(res, 400, { error: "bad filter" })
    return true
  }
  const key = `om-jobs:v1:${from}|${to}|${regionId}|${cityId}`
  cached(key, () => loadOmJobs(from, to, regionId, cityId))
    .then((body) => send(res, 200, body))
    .catch(() => send(res, 502, { error: "upstream unavailable" }))
  return true
}
