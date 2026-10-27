import { useEffect, useState } from "react"
import { apiRegionId, zoneIdForCity } from "../wall/places"
import type { WallState } from "../wall/state"

export type BillingMonth = {
  ym: string
  consumers: number
  consumptionConsumers: number
  paidConsumptionConsumers: number
  positiveBalanceConsumers: number
  consumptionAzn: number
  collected: number
  netCollected: number
  outstandingCredit: number
  outstandingBalance: number
  revenueRealizationGross: number | null
  revenueRealizationNet: number | null
  billPaymentRate: number | null
  positiveBalanceShare: number | null
}

export type BillingData = {
  months: BillingMonth[]
}

const billingMonths = ["2026-07", "2026-08", "2026-09"]

function monthEnd(ym: string) {
  const year = Number(ym.slice(0, 4))
  const month = Number(ym.slice(5, 7))
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${ym}-${String(day).padStart(2, "0")}`
}

export function billingMonthsFor(date: string, dateTo: string) {
  const from = date <= dateTo ? date : dateTo
  const to = date <= dateTo ? dateTo : date
  const months = billingMonths.filter((ym) => `${ym}-01` <= to && monthEnd(ym) >= from)
  if (months.length) return months
  if (to >= "2026-10-01") return ["2026-09"]
  return []
}

function share(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : null
}

export function combineBilling(months: BillingMonth[]): BillingMonth | null {
  if (!months.length) return null
  const total = (pick: (month: BillingMonth) => number) => months.reduce((sum, month) => sum + pick(month), 0)
  const consumers = total((month) => month.consumers)
  const consumptionConsumers = total((month) => month.consumptionConsumers)
  const paidConsumptionConsumers = total((month) => month.paidConsumptionConsumers)
  const positiveBalanceConsumers = total((month) => month.positiveBalanceConsumers)
  const consumptionAzn = total((month) => month.consumptionAzn)
  const collected = total((month) => month.collected)
  const netCollected = total((month) => month.netCollected)
  return {
    ym: months.map((month) => month.ym).join("+"),
    consumers,
    consumptionConsumers,
    paidConsumptionConsumers,
    positiveBalanceConsumers,
    consumptionAzn,
    collected,
    netCollected,
    outstandingCredit: total((month) => month.outstandingCredit),
    outstandingBalance: total((month) => month.outstandingBalance),
    revenueRealizationGross: share(collected, consumptionAzn),
    revenueRealizationNet: share(netCollected, consumptionAzn),
    billPaymentRate: share(paidConsumptionConsumers, consumptionConsumers),
    positiveBalanceShare: share(positiveBalanceConsumers, consumers),
  }
}

export function billingForRange(data: BillingData | null, date: string, dateTo: string) {
  if (!data) return null
  const wanted = new Set(billingMonthsFor(date, dateTo))
  return combineBilling(data.months.filter((month) => wanted.has(month.ym)))
}

export function useBilling(state: WallState) {
  const [data, setData] = useState<BillingData | null>(null)
  useEffect(() => {
    const query = new URLSearchParams()
    const region = apiRegionId(state.regionId)
    const zone = zoneIdForCity(state.cityId)
    if (region) query.set("region", region)
    if (zone) query.set("zone", zone)
    if (state.clusterId) query.set("cluster", state.clusterId)
    let live = true
    setData(null)
    fetch(`/billing?${query}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<BillingData>
      })
      .then((body) => {
        if (live) setData(body)
      })
      .catch(() => {
        if (live) setData(null)
      })
    return () => {
      live = false
    }
  }, [state.regionId, state.cityId, state.clusterId, state.seed])
  return data
}
