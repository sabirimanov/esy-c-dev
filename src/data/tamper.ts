import { useEffect, useState } from "react"
import type { WallState } from "../wall/state"

export type TamperCounts = {
  tampering: number
  disassembly: number
  interference: number
  magnetic: number
  battery: number
}

export function useTamper(state: WallState) {
  const [counts, setCounts] = useState<TamperCounts | null>(null)
  useEffect(() => {
    const query = new URLSearchParams({ from: state.date, to: state.dateTo })
    let live = true
    setCounts(null)
    fetch(`/tamper?${query}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status))
        return res.json() as Promise<TamperCounts>
      })
      .then((body) => {
        if (live) setCounts(body)
      })
      .catch(() => {
        if (live) setCounts(null)
      })
    return () => {
      live = false
    }
  }, [state.date, state.dateTo, state.seed])
  return counts
}
