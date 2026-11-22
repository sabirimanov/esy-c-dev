import { useMemo } from "react"
import type { WallState } from "./state"
import { useWall } from "./useWall"

/**
 * Stable key for wall filters + cache bust (seed).
 * Any data layer that depends on date / region / city / cluster / clearCache
 * should treat a key change as “refetch”.
 */
export function wallScopeKey(state: WallState): string {
  return [
    state.date,
    state.dateTo,
    state.regionId ?? "",
    state.cityId ?? "",
    state.clusterId ?? "",
    state.period ?? "",
    String(state.seed),
  ].join("|")
}

export type WallScope = {
  key: string
  seed: number
  date: string
  dateTo: string
  regionId: string | null
  cityId: string | null
  clusterId: string | null
  period: string
}

export function wallScopeFrom(state: WallState): WallScope {
  return {
    key: wallScopeKey(state),
    seed: state.seed,
    date: state.date,
    dateTo: state.dateTo,
    regionId: state.regionId,
    cityId: state.cityId,
    clusterId: state.clusterId,
    period: state.period,
  }
}

/** Shared filter recognition for hooks — one place to depend on wall scope. */
export function useWallScope(): WallScope {
  const { state } = useWall()
  return useMemo(() => wallScopeFrom(state), [
    state.date,
    state.dateTo,
    state.regionId,
    state.cityId,
    state.clusterId,
    state.period,
    state.seed,
  ])
}
