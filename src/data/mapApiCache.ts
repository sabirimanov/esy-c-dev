/** Shared cache for wall map API calls — minimum 1 hour. */

export const MAP_CACHE_MS = 60 * 60 * 1000

type Entry = { at: number; body: unknown }

const memory = new Map<string, Entry>()
const inflight = new Map<string, Promise<unknown>>()
const STORAGE_PREFIX = "map-api-cache:v1:"

/** Drop in-memory + session entries (e.g. wall clearCache / seed bump). */
export function invalidateMapApiCache() {
  memory.clear()
  try {
    const keys: string[] = []
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k?.startsWith(STORAGE_PREFIX)) keys.push(k)
    }
    for (const k of keys) sessionStorage.removeItem(k)
  } catch {
    /* private mode */
  }
}

function readStorage(key: string): Entry | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_PREFIX + key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Entry
    if (!parsed || typeof parsed.at !== "number") return null
    return parsed
  } catch {
    return null
  }
}

function writeStorage(key: string, entry: Entry) {
  try {
    sessionStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry))
  } catch {
    /* quota / private mode */
  }
}

function freshHit(key: string, ttlMs: number): Entry | null {
  const mem = memory.get(key)
  if (mem && Date.now() - mem.at < ttlMs) return mem
  const stored = readStorage(key)
  if (stored && Date.now() - stored.at < ttlMs) {
    memory.set(key, stored)
    return stored
  }
  return null
}

function remember(key: string, body: unknown) {
  const entry = { at: Date.now(), body }
  memory.set(key, entry)
  writeStorage(key, entry)
}

async function runCached<T>(
  key: string,
  loader: () => Promise<T>,
  opts: { force?: boolean; ttlMs?: number } = {},
): Promise<T> {
  const ttlMs = opts.ttlMs ?? MAP_CACHE_MS
  if (!opts.force) {
    const hit = freshHit(key, ttlMs)
    if (hit) return hit.body as T
  }
  const pending = inflight.get(key)
  if (pending) return pending as Promise<T>
  const promise = loader()
    .then((body) => {
      remember(key, body)
      return body
    })
    .finally(() => {
      inflight.delete(key)
    })
  inflight.set(key, promise)
  return promise
}

export type MapCacheOpts = { force?: boolean; ttlMs?: number }

/** GET JSON — default cache 1h (memory + sessionStorage). */
export function mapCachedGetJson<T>(url: string, opts: MapCacheOpts = {}): Promise<T> {
  return runCached(
    `GET:${url}`,
    async () => {
      const res = await fetch(url)
      if (!res.ok) throw new Error(String(res.status))
      return (await res.json()) as T
    },
    opts,
  )
}

/** POST JSON body — default cache 1h by url+body. */
export function mapCachedPostJson<T>(url: string, body: unknown, opts: MapCacheOpts = {}): Promise<T> {
  const key = `POST:${url}:${JSON.stringify(body)}`
  return runCached(
    key,
    async () => {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(String(res.status))
      return (await res.json()) as T
    },
    opts,
  )
}
