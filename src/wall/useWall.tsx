import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { mapRegions } from "./mapConfig"
import { defaultWall, type WallState } from "./state"

type WallApi = {
  state: WallState
  patch: (partial: Partial<Pick<WallState, "date" | "regionId" | "regionSet">>) => void
}

const WallContext = createContext<WallApi | null>(null)
const storageKey = "ccc-wall"

function readStored(): WallState {
  try {
    const raw = JSON.parse(localStorage.getItem(storageKey) || "")
    if (raw && typeof raw.date === "string") {
      return {
        date: raw.date,
        regionId: raw.regionId ?? null,
        regionSet: Boolean(raw.regionSet),
        rev: Number(raw.rev) || 0,
      }
    }
  } catch {
    // ignore a broken local snapshot
  }
  return defaultWall
}

export function WallProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WallState>(readStored)

  useEffect(() => {
    const source = new EventSource("/sync")
    source.onmessage = (event) => {
      const next = JSON.parse(event.data) as WallState
      localStorage.setItem(storageKey, JSON.stringify(next))
      setState(next)
    }
    return () => source.close()
  }, [])

  function patch(partial: Partial<Pick<WallState, "date" | "regionId" | "regionSet">>) {
    void fetch("/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    })
  }

  useEffect(() => {
    const known = new Set(mapRegions.map((region) => region.id))
    window.setRegion = (id: string | null) => {
      const regionId = id ? String(id) : null
      if (regionId && !known.has(regionId)) {
        console.warn("Unknown region:", regionId)
        return
      }
      patch({ regionId, regionSet: true })
    }
  })

  return <WallContext.Provider value={{ state, patch }}>{children}</WallContext.Provider>
}

export function useWall() {
  const value = useContext(WallContext)
  if (!value) throw new Error("WallProvider is missing")
  return value
}
