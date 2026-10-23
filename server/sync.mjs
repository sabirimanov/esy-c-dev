import fs from "node:fs"

const statePath = new URL("./wall-state.json", import.meta.url)
const clients = new Set()

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(statePath, "utf8"))
    if (raw && typeof raw.date === "string") {
      return {
        date: raw.date,
        regionId: raw.regionId ?? null,
        regionSet: Boolean(raw.regionSet),
        rev: Number(raw.rev) || 1,
      }
    }
  } catch {
    // first boot
  }
  return { date: "2026-09-30", regionId: null, regionSet: false, rev: 1 }
}

let state = load()

function persist() {
  fs.writeFileSync(statePath, JSON.stringify(state))
}

function broadcast() {
  const packet = `data: ${JSON.stringify(state)}\n\n`
  for (const res of clients) res.write(packet)
}

setInterval(() => {
  for (const res of clients) res.write(":\n\n")
}, 20000).unref()

export function handleSync(req, res) {
  const path = (req.url || "").split("?")[0]
  if (path !== "/sync") return false

  if (req.method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    })
    res.write("retry: 5000\n\n")
    res.write(`data: ${JSON.stringify(state)}\n\n`)
    clients.add(res)
    req.on("close", () => clients.delete(res))
    return true
  }

  if (req.method === "POST") {
    const chunks = []
    let size = 0
    req.on("data", (chunk) => {
      size += chunk.length
      if (size < 2000) chunks.push(chunk)
    })
    req.on("end", () => {
      if (size >= 2000) {
        res.writeHead(413).end()
        return
      }
      let patch
      try {
        patch = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")
      } catch {
        res.writeHead(400).end()
        return
      }
      const next = { ...state }
      if (typeof patch.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(patch.date)) next.date = patch.date
      if ("regionId" in patch && (patch.regionId === null || typeof patch.regionId === "string")) {
        next.regionId = patch.regionId || null
      }
      if ("regionSet" in patch) next.regionSet = Boolean(patch.regionSet)
      next.rev = state.rev + 1
      state = next
      persist()
      broadcast()
      res.writeHead(200, { "Content-Type": "application/json" })
      res.end(JSON.stringify(state))
    })
    return true
  }

  res.writeHead(405).end()
  return true
}
