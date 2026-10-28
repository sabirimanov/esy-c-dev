import { cached, FRESH_MS } from "./cache.mjs"

const upstream = "http://127.0.0.1:8443/api/dashboard"

function bucket(value) {
  const end = Number(value)
  if (!Number.isFinite(end) || end <= 0) return ""
  return String(Math.floor(end / 300) * 300)
}

export function handleSoc(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/soc-live") return false
  if (req.method !== "GET") {
    res.writeHead(405).end()
    return true
  }
  const range = url.searchParams.get("range") || "now"
  if (!/^[a-z0-9]{1,16}$/i.test(range)) {
    res.writeHead(400).end()
    return true
  }
  const end = bucket(url.searchParams.get("end"))
  cached(`soc:${range}:${end}`, async () => {
    const target = new URL(upstream)
    target.searchParams.set("range", range)
    if (end) target.searchParams.set("end", end)
    const remote = await fetch(target)
    if (!remote.ok) throw new Error(String(remote.status))
    return remote.json()
  }, FRESH_MS)
    .then((body) => {
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" })
      res.end(JSON.stringify(body))
    })
    .catch(() => {
      res.writeHead(502, { "Content-Type": "application/json", "Cache-Control": "no-store" })
      res.end(JSON.stringify({ error: "upstream unavailable" }))
    })
  return true
}
