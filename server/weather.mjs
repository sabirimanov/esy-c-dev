import { cached } from "./cache.mjs"

const cities = {
  baku: { name: "Baku", lat: 40.3667, lon: 49.8352 },
  sumgayit: { name: "Sumgayit", lat: 40.5961, lon: 49.67 },
  agsu: { name: "Agsu", lat: 40.5703, lon: 48.4009 },
  kurdamir: { name: "Kurdamir", lat: 40.3383, lon: 48.1608 },
  ujar: { name: "Ujar", lat: 40.5183, lon: 47.6542 },
  ismayilli: { name: "Ismayilli", lat: 40.7847, lon: 48.1514 },
  goychay: { name: "Goychay", lat: 40.6553, lon: 47.7389 },
}

const phrases = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Freezing fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  56: "Freezing drizzle",
  57: "Freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Rain showers",
  82: "Heavy showers",
  85: "Snow showers",
  86: "Snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm",
  99: "Thunderstorm",
}

const ttl = 10 * 60 * 1000

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  res.end(JSON.stringify(body))
}

async function load(id) {
  const city = cities[id] || cities.baku
  return cached(
    `weather:${city.name}`,
    async () => {
      const url = new URL("https://api.open-meteo.com/v1/forecast")
      url.searchParams.set("latitude", String(city.lat))
      url.searchParams.set("longitude", String(city.lon))
      url.searchParams.set("current", "temperature_2m,weather_code")
      url.searchParams.set("timezone", "Asia/Baku")
      const remote = await fetch(url)
      if (!remote.ok) throw new Error(String(remote.status))
      const data = await remote.json()
      return {
        city: city.name,
        temp: `${Math.round(data.current.temperature_2m)}°`,
        summary: phrases[data.current.weather_code] || "Unknown",
      }
    },
    ttl,
  )
}

export function handleWeather(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/weather") return false
  if (req.method !== "GET") {
    res.writeHead(405).end()
    return true
  }
  const id = url.searchParams.get("city") || "baku"
  load(id).then(
    (body) => send(res, 200, body),
    () => send(res, 502, { error: "upstream unavailable" }),
  )
  return true
}
