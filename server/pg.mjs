import fs from "node:fs"
import path from "node:path"
import pg from "pg"

function loadEnv() {
  const file = path.resolve(process.cwd(), ".env")
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq < 1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (process.env[key] == null) process.env[key] = value
  }
}

pg.types.setTypeParser(1082, (value) => value)
pg.types.setTypeParser(1114, (value) => value)
pg.types.setTypeParser(1184, (value) => value)

let pool

export function getPgPool() {
  if (pool) return pool
  loadEnv()
  const { PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD } = process.env
  if (!PGHOST || !PGDATABASE || !PGUSER || !PGPASSWORD) {
    const error = new Error("Postgres is not configured")
    error.status = 500
    throw error
  }
  pool = new pg.Pool({
    host: PGHOST,
    port: Number(PGPORT || 5432),
    database: PGDATABASE,
    user: PGUSER,
    password: PGPASSWORD,
    max: 12,
    statement_timeout: 180000,
  })
  pool.on("error", (error) => console.error(error))
  return pool
}

export async function pgQuery(sql, params = []) {
  return getPgPool().query(sql, params)
}
