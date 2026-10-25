import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import { handleSync } from "./server/sync.mjs"
import { handleUfg } from "./server/ufg.mjs"
import { handlePressure } from "./server/pressure.mjs"
import { handleLeaks, handleQuality } from "./server/quality.mjs"
import { handleDemand } from "./server/demand.mjs"
import { handleWeather } from "./server/weather.mjs"

function wallSync(): Plugin {
  return {
    name: "wall-sync",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!handleUfg(req, res) && !handlePressure(req, res) && !handleQuality(req, res) && !handleLeaks(req, res) && !handleDemand(req, res) && !handleWeather(req, res) && !handleSync(req, res)) next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!handleUfg(req, res) && !handlePressure(req, res) && !handleQuality(req, res) && !handleLeaks(req, res) && !handleDemand(req, res) && !handleWeather(req, res) && !handleSync(req, res)) next()
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
