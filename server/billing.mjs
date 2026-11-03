import { cached } from "./cache.mjs"
import { esyduckdbQuery } from "./esyduckdb.mjs"
import { pgQuery } from "./pg.mjs"

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
  if ((region && !/^R\d+$/.test(region)) || (zone && !/^Z_[A-Za-z0-9_]+$/.test(zone)) || (cluster && !/^[A-Za-z0-9_]{1,80}$/.test(cluster))) return null
  return { region, zone, cluster }
}

function clusterKey(cluster) {
  const match = /^c_(\d+)$/.exec(cluster)
  return match ? match[1] : cluster
}

function sqlLit(value) {
  return `'${String(value).replaceAll("'", "''")}'`
}

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function share(part, whole) {
  return whole > 0 ? (part / whole) * 100 : null
}

function regionExpr(alias = "b") {
  return `CASE
    WHEN btrim(${alias}."Region") IN ('BRQİİ', 'Bakı RQSD', 'Bakı RQİİ') THEN 'Bakı RQİİ'
    WHEN btrim(${alias}."Region") IN ('Sumqayıt RQİİ', 'Sumqayıt Qİİ') THEN 'Sumqayıt RQİİ'
    WHEN btrim(${alias}."Region") = 'Ağsu RQİİ' THEN 'Ağsu RQİİ'
    ELSE btrim(${alias}."Region")
  END`
}

function billingSql({ region, rayon, cluster }) {
  const filters = [
    `billing_month >= DATE '2026-07-01'`,
    `billing_month < DATE '2026-11-01'`,
  ]
  if (region) filters.push(`${regionExpr("b")} = ${sqlLit(region)}`)
  if (rayon) filters.push(`btrim(b."Xidmət sahəsi") = ${sqlLit(rayon)}`)
  if (cluster) {
    filters.push(`EXISTS (
      SELECT 1 FROM meters_signal.devices d
      WHERE btrim(d."AccountId") = btrim(b.subid)
        AND btrim(d."Cluster no") ~ '^[0-9]+$'
        AND btrim(d."Cluster no") = ${sqlLit(cluster)}
    )`)
  }
  return `SELECT
    to_char(billing_month, 'YYYY-MM') AS ym,
    count(*)::float8 AS consumers,
    count(*) FILTER (WHERE consumption_azn <> 0)::float8 AS consumption_consumers,
    count(*) FILTER (WHERE consumption_azn <> 0 AND payments_amount <> 0)::float8 AS paid_consumption_consumers,
    count(*) FILTER (WHERE "Qalıq məbləğ" > 0)::float8 AS positive_balance_consumers,
    coalesce(sum(consumption_azn), 0)::float8 AS consumption_azn,
    coalesce(sum(payments_amount), 0)::float8 AS collected,
    coalesce(sum(LEAST(GREATEST(payments_amount, 0), GREATEST(consumption_azn, 0))), 0)::float8 AS net_collected,
    coalesce(sum("Qalıq məbləğ") FILTER (WHERE "Qalıq məbləğ" < 0), 0)::float8 AS credit,
    coalesce(sum("Qalıq məbləğ") FILTER (WHERE "Qalıq məbləğ" > 0), 0)::float8 AS debt
  FROM billing.idp_data b
  WHERE ${filters.join(" AND ")}
  GROUP BY 1
  ORDER BY 1`
}

function mapMonths(rows) {
  return rows.map((row) => {
    const consumers = num(row.consumers)
    const consumptionConsumers = num(row.consumption_consumers)
    const paidConsumptionConsumers = num(row.paid_consumption_consumers)
    const positiveBalanceConsumers = num(row.positive_balance_consumers)
    const consumptionAzn = num(row.consumption_azn)
    const collected = num(row.collected)
    const netCollected = num(row.net_collected)
    return {
      ym: String(row.ym),
      consumers,
      consumptionConsumers,
      paidConsumptionConsumers,
      positiveBalanceConsumers,
      consumptionAzn,
      collected,
      netCollected,
      outstandingCredit: Math.abs(num(row.credit)),
      outstandingBalance: num(row.debt),
      revenueRealizationGross: share(collected, consumptionAzn),
      revenueRealizationNet: share(netCollected, consumptionAzn),
      billPaymentRate: share(paidConsumptionConsumers, consumptionConsumers),
      positiveBalanceShare: share(positiveBalanceConsumers, consumers),
    }
  })
}

async function loadBillingMonths(filter) {
  const sql = billingSql(filter)
  try {
    const rows = await esyduckdbQuery(sql, { limit: 24, timeoutMs: 20000 })
    return mapMonths(rows)
  } catch {
    // Hub often times out on fat billing scans; same SQL via configured PG keeps revenue live.
    const result = await pgQuery(sql)
    return mapMonths(result.rows)
  }
}

export function handleBilling(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/billing") return false
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
  const cluster = filter.cluster ? clusterKey(filter.cluster) : ""
  if (filter.region && !region) {
    send(res, 400, { error: "bad filter" })
    return true
  }
  if (filter.zone && !rayon) {
    send(res, 400, { error: "bad filter" })
    return true
  }
  const key = `billing:newapi:v1:${region}|${rayon}|${cluster}`
  cached(key, () => loadBillingMonths({ region, rayon, cluster }))
    .then((months) => send(res, 200, { months }))
    .catch(() => send(res, 502, { error: "upstream unavailable" }))
  return true
}
