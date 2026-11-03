const DEFAULT_HUB = "https://cccdev.esyasoft.app/newapi/hub/esyduckdb/db/query"

export function esyduckdbUrl() {
  return process.env.ESYDUCKDB_URL || DEFAULT_HUB
}

/** Raw SELECT via API Hub. Hub does not accept bind params — embed literals carefully. */
export async function esyduckdbQuery(sql, { limit = 100, timeoutMs = 25000 } = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const response = await fetch(esyduckdbUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sql, limit }),
      signal: ctrl.signal,
    })
    if (!response.ok) {
      const error = new Error(`esyduckdb ${response.status}`)
      error.status = response.status
      throw error
    }
    const body = await response.json()
    return Array.isArray(body?.rows) ? body.rows : []
  } finally {
    clearTimeout(timer)
  }
}
