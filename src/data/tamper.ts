import { useCachedResource } from "./cachedFetch"
import type { WallState } from "../wall/state"

export type TamperCounts = {
  tampering: number
  disassembly: number
  interference: number
  magnetic: number
  battery: number
}

export function useTamper(state: WallState) {
  const query = new URLSearchParams({ from: state.date, to: state.dateTo })
  return useCachedResource<TamperCounts>(`/tamper?${query}`, state.seed)
}
