import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import { handleSync } from "./server/sync.mjs"
import { handleUfg } from "./server/ufg.mjs"
import { handlePressure } from "./server/pressure.mjs"
import { handleLeaks, handleQuality } from "./server/quality.mjs"
import { handleDemand } from "./server/demand.mjs"
import { handleGis } from "./server/gis.mjs"
import { handleImpact } from "./server/impact.mjs"
import { handleField } from "./server/field.mjs"
import { handleBilling } from "./server/billing.mjs"
import { handleAnomalies } from "./server/anomalies.mjs"
import { handleReconnect } from "./server/reconnect.mjs"
import { handleTamper } from "./server/tamper.mjs"
import { handleWeather } from "./server/weather.mjs"
import { handleDisplay } from "./server/display.mjs"
import { handleSoc } from "./server/soc.mjs"
import { app as duckdbApp } from "./duckdb/server.js"
import { isDuckdbRequest, setDuckdbOrigin } from "./server/duckdb-origin.mjs"
import { applyCors } from "./server/cors.mjs"

setDuckdbOrigin("http://127.0.0.1:4317")

function wallSync(): Plugin {
  return {
    name: "wall-sync",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (applyCors(req, res)) return
        if (isDuckdbRequest(req.url)) {
          duckdbApp(req, res)
          return
        }
        if (!handleSoc(req, res) && !handleUfg(req, res) && !handlePressure(req, res) && !handleQuality(req, res) && !handleLeaks(req, res) && !handleDemand(req, res) && !handleGis(req, res) && !handleImpact(req, res) && !handleField(req, res) && !handleBilling(req, res) && !handleAnomalies(req, res) && !handleReconnect(req, res) && !handleTamper(req, res) && !handleWeather(req, res) && !handleSync(req, res) && !handleDisplay(req, res)) next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (applyCors(req, res)) return
        if (isDuckdbRequest(req.url)) {
          duckdbApp(req, res)
          return
        }
        if (!handleSoc(req, res) && !handleUfg(req, res) && !handlePressure(req, res) && !handleQuality(req, res) && !handleLeaks(req, res) && !handleDemand(req, res) && !handleGis(req, res) && !handleImpact(req, res) && !handleField(req, res) && !handleBilling(req, res) && !handleAnomalies(req, res) && !handleReconnect(req, res) && !handleTamper(req, res) && !handleWeather(req, res) && !handleSync(req, res) && !handleDisplay(req, res)) next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), wallSync()],
  server: {
    host: "127.0.0.1",
    port: 4317,
    strictPort: true,
    proxy: {
      "/socnoc": { target: "https://cccdev.esyasoft.app", changeOrigin: true, secure: true },
    },
  },
})
