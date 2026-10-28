import { useEffect, useState } from "react"

export const FRESH_MS = 5 * 60 * 1000

type Entry = { at: number; generation: number; body: unknown }

const store = new Map<string, Entry>()
const inflight = new Map<string, Promise<unknown>>()

export function cachedJson<T>(url: string, generation = 0, force = false): Promise<T> {
  if (!force) {
    const hit = store.get(url)
    if (hit && hit.generation === generation && Date.now() - hit.at < FRESH_MS) return Promise.resolve(hit.body as T)
  }
  const flight = `${generation}\n${url}`
  const pending = inflight.get(flight)
  if (pending) return pending as Promise<T>
  const promise = fetch(url)
    .then(async (res) => {
      if (!res.ok) throw new Error(String(res.status))
      return (await res.json()) as T
    })
    .then((body) => {
      store.set(url, { at: Date.now(), generation, body })
      return body
    })
    .finally(() => {
      inflight.delete(flight)
    })
  inflight.set(flight, promise)
  return promise
}

export function useCachedResource<T>(url: string, generation = 0, reset = true): T | null {
  const [data, setData] = useState<T | null>(null)
  useEffect(() => {
    let live = true
    function pull(first: boolean) {
      if (first && reset) setData(null)
      cachedJson<T>(url, generation, !first)
        .then((body) => {
          if (live) setData(body)
        })
        .catch(() => {
          if (live && first && reset) setData(null)
        })
    }
    pull(true)
    const id = window.setInterval(() => pull(false), FRESH_MS + 1000)
    return () => {
      live = false
      window.clearInterval(id)
    }
  }, [url, generation, reset])
  return data
}
