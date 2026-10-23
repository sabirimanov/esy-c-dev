import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import { handleSync } from "./server/sync.mjs"

function wallSync(): Plugin {
  return {
    name: "wall-sync",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!handleSync(req, res)) next()
      })
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!handleSync(req, res)) next()
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), wallSync()],
  server: { host: "127.0.0.1", port: 4317, strictPort: true },
})
