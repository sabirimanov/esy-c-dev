import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { handleSync } from "./server/sync.mjs"
import { handleUfg } from "./server/ufg.mjs"
import { handlePressure } from "./server/pressure.mjs"
import { handleLeaks, handleQuality } from "./server/quality.mjs"
import { handleDemand } from "./server/demand.mjs"
import { handleWeather } from "./server/weather.mjs"

const root = path.resolve("dist")
const port = Number(process.env.PORT || 3089)
const host = process.env.HOST || "0.0.0.0"
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".glb": "model/gltf-binary",
  ".json": "application/json",
}

const server = http.createServer((req, res) => {
  if (handleUfg(req, res)) return
  if (handlePressure(req, res)) return
  if (handleQuality(req, res)) return
  if (handleLeaks(req, res)) return
  if (handleDemand(req, res)) return
  if (handleWeather(req, res)) return
  if (handleSync(req, res)) return
  const url = new URL(req.url || "/", "http://localhost")
  const pathname = decodeURIComponent(url.pathname)
  if (pathname.includes("\0") || pathname.includes("..")) {
    res.writeHead(400).end()
    return
  }
  let file = path.join(root, pathname)
  if (!file.startsWith(root)) {
    res.writeHead(400).end()
    return
  }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(root, "index.html")
  const ext = path.extname(file)
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" })
  fs.createReadStream(file).pipe(res)
})

server.listen(port, host, () => {
  console.log(`wall http://${host}:${port}/1`)
})
