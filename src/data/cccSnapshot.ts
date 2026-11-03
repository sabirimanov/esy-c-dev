import snapshot from "./cccSnapshot.json"

export type WeatherDemandDay = {
  date: string
  c41: number
  c42: number
  c160: number
  temp: number
  day: string
}

export type PressureSpan = {
  rank: string
  name: string
  sub: string | null
  sensor: string
  position: string
  start: string
  end: string
  span: string
  fill: number
  hours: number
}

export type PressureCluster = {
  rank: string
  name: string
  sub: string | null
  violations: string
  readings: number
}

export const cccQmax = snapshot.qmax as number
export const cccZeroConsumption = snapshot.zeroConsumption as number
export const cccMinConsumption = snapshot.minConsumption as number
export const cccTopPressureClusters = snapshot.topPressureClusters as PressureCluster[]
export const cccPressureSpans = snapshot.pressureSpans as PressureSpan[]
export const cccWeatherDemandForecast = snapshot.weatherDemandForecast as WeatherDemandDay[]

export function weatherForecastForCluster(clusterNo: string): { date: string; value: number }[] {
  const key = clusterNo === "41" ? "c41" : clusterNo === "42" ? "c42" : clusterNo === "160" ? "c160" : null
  if (!key) return []
  return cccWeatherDemandForecast.map((row) => ({ date: row.date, value: row[key] }))
}
