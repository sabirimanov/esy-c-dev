import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { normalizeCity, normalizeCluster, normalizeRegion } from "./places"
import { defaultWall, type WallState } from "./state"

type WallPatch = Partial<Pick<WallState, "date" | "dateTo" | "regionId" | "cityId" | "clusterId" | "regionSet" | "seed" | "period" | "ufgOpen">>

type WallApi = {
  state: WallState
  patch: (partial: WallPatch) => void
}

const WallContext = createContext<WallApi | null>(null)
const storageKey = "ccc-wall"

function normalize(raw: Partial<WallState> | null): WallState {
  if (!raw || typeof raw.date !== "string") return defaultWall
  const regionId = normalizeRegion(raw.regionId)
  const dateTo = typeof raw.dateTo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.dateTo) ? raw.dateTo : raw.date
  return {
    date: raw.date <= dateTo ? raw.date : dateTo,
    dateTo: raw.date <= dateTo ? dateTo : raw.date,
    regionId,
    cityId: normalizeCity(regionId, raw.cityId),
    clusterId: normalizeCluster(raw.clusterId),
    regionSet: Boolean(raw.regionSet),
    rev: Number(raw.rev) || 0,
    seed: Number.isInteger(raw.seed) && (raw.seed as number) >= 0 ? (raw.seed as number) : 0,
    period: raw.period === "" || (typeof raw.period === "string" && raw.period) ? raw.period : defaultWall.period,
    ufgOpen: Boolean(raw.ufgOpen),
  }
}

function readStored(): WallState {
  try {
    return normalize(JSON.parse(localStorage.getItem(storageKey) || ""))
  } catch {
    return defaultWall
  }
}

export function WallProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WallState>(readStored)

  useEffect(() => {
    const source = new EventSource("/sync")
    source.onmessage = (event) => {
      const next = normalize(JSON.parse(event.data) as WallState)
      localStorage.setItem(storageKey, JSON.stringify(next))
      setState(next)
    }
    return () => source.close()
  }, [])

  function patch(partial: WallPatch) {
    void fetch("/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partial),
    })
  }

  useEffect(() => {
    window.setRegion = (id: string | null) => {
      const regionId = normalizeRegion(id)
      if (id && !regionId) {
        console.warn("Unknown region:", id)
        return
      }
      patch({ regionId, regionSet: true, cityId: null, clusterId: null })
    }
  })

  return <WallContext.Provider value={{ state, patch }}>{children}</WallContext.Provider>
}

export function useWall() {
  const value = useContext(WallContext)
  if (!value) throw new Error("WallProvider is missing")
  return value
}
