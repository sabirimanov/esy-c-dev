import fs from "node:fs"

const envPath = new URL("../.env", import.meta.url)

export function alertScrollMode() {
  let value = process.env.ALERT_SCROLL || ""
  try {
    const text = fs.readFileSync(envPath, "utf8")
    for (const line of text.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq < 1) continue
      if (trimmed.slice(0, eq).trim() !== "ALERT_SCROLL") continue
      value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "")
    }
  } catch {
    // .env missing: process.env stands
  }
  return value.toLowerCase() === "smooth" ? "smooth" : "step"
}

export function handleDisplay(req, res) {
  const url = new URL(req.url || "/", "http://localhost")
  if (url.pathname !== "/display") return false
  if (req.method !== "GET") {
    res.writeHead(405).end()
    return true
  }
  res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  res.end(JSON.stringify({ alertScroll: alertScrollMode(), now: Date.now() }))
  return true
}
