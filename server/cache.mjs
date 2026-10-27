import fs from "node:fs"

const cachePath = new URL("./api-cache.json", import.meta.url)
const store = new Map()
const inflight = new Map()
const clearListeners = new Set()
let saveTimer = null

try {
  const raw = JSON.parse(fs.readFileSync(cachePath, "utf8"))
  if (raw && typeof raw === "object") {
    const now = Date.now()
    for (const [key, entry] of Object.entries(raw)) {
      if (entry && typeof entry === "object" && (!entry.until || entry.until > now)) {
        store.set(key, entry)
      }
    }
  }
} catch {
  // first boot or empty cache
}

function scheduleSave() {
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    try {
      const obj = {}
      const now = Date.now()
      for (const [key, entry] of store.entries()) {
        if (!entry.until || entry.until > now) obj[key] = entry
      }
      fs.writeFileSync(cachePath, JSON.stringify(obj))
    } catch {
      // ignore disk write errors
    }
  }, 400)
  saveTimer.unref?.()
}

export function getCached(key) {
  const hit = store.get(key)
  if (!hit) return undefined
  if (hit.until && hit.until <= Date.now()) {
    store.delete(key)
    return undefined
  }
  return hit.value
}

export function setCached(key, value, ttlMs = 0) {
  store.set(key, { value, until: ttlMs > 0 ? Date.now() + ttlMs : 0 })
  scheduleSave()
  return value
}

export async function cached(key, loader, ttlMs = 0) {
  const hit = getCached(key)
  if (hit !== undefined) return hit
  const pending = inflight.get(key)
  if (pending) return pending
  const promise = Promise.resolve()
    .then(loader)
    .then((value) => {
      setCached(key, value, ttlMs)
      return value
    })
    .finally(() => {
      inflight.delete(key)
    })
  inflight.set(key, promise)
  return promise
}

export function onClearCache(listener) {
  clearListeners.add(listener)
}

export function clearCache() {
  store.clear()
  inflight.clear()
  if (saveTimer) {
    clearTimeout(saveTimer)
    saveTimer = null
  }
  for (const listener of clearListeners) {
    try {
      listener()
    } catch {
      // ignore listener errors
    }
  }
  try {
    fs.writeFileSync(cachePath, "{}")
  } catch {
    // ignore disk errors
  }
  return { ok: true, clearedAt: Date.now() }
}
