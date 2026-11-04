import { useCachedResource } from "./cachedFetch"
import { BRAIN_SHARE_BASE_TOTAL, brainCallCenterShares } from "./brainCallCenterShares"
import type { WallState } from "../wall/state"

export type BrainReason = { label: string; value: number; paint: "teal" | "orange" }
export type BrainIssue = { label: string; value: number; color: string }
export type BrainQuality = { label: string; value: number | null; paint: "teal" | "orange" | "blue" }
export type BrainOperator = {
  name: string
  calls: number
  ahtSeconds: number
  aht: string
  score: number | null
}

export type BrainCallCenter = {
  totalCalls: number | null
  answeredCalls: number | null
  ahtSeconds: number | null
  aht: string | null
  serviceSatisfaction: number | null
  reasons: BrainReason[]
  issues: BrainIssue[]
  quality: BrainQuality[]
  operators: BrainOperator[]
}

function scale(total: number, share: number) {
  return Math.max(0, Math.round(total * share))
}

/** Static fallback built from saved shares × snapshot total (used before live total_calls). */
export const brainCallCenterFallback: BrainCallCenter = {
  totalCalls: BRAIN_SHARE_BASE_TOTAL,
  answeredCalls: scale(BRAIN_SHARE_BASE_TOTAL, brainCallCenterShares.answeredOfTotal),
  ahtSeconds: brainCallCenterShares.ahtSeconds,
  aht: brainCallCenterShares.aht,
  serviceSatisfaction: brainCallCenterShares.serviceSatisfaction,
  reasons: brainCallCenterShares.reasons.map((row) => ({
    label: row.label,
    value: scale(BRAIN_SHARE_BASE_TOTAL, row.share),
    paint: row.paint,
  })),
  issues: brainCallCenterShares.issues.map((row) => ({
    label: row.label,
    value: scale(BRAIN_SHARE_BASE_TOTAL, row.share),
    color: row.color,
  })),
  quality: brainCallCenterShares.quality.map((row) => ({ ...row })),
  operators: brainCallCenterShares.operators.map((row) => ({
    name: row.name,
    calls: scale(BRAIN_SHARE_BASE_TOTAL, row.share),
    ahtSeconds: row.ahtSeconds,
    aht: row.aht,
    score: row.score,
  })),
}

export function useBrainCallCenter(state: WallState) {
  const from = state.date <= state.dateTo ? state.date : state.dateTo
  const to = state.date <= state.dateTo ? state.dateTo : state.date
  const query = new URLSearchParams({ from, to })
  return useCachedResource<BrainCallCenter>(`/brain-call-center?${query}`, state.seed)
}

export function withBrainFallback(live: BrainCallCenter | null): BrainCallCenter {
  if (!live) return brainCallCenterFallback
  return {
    totalCalls: live.totalCalls ?? brainCallCenterFallback.totalCalls,
    answeredCalls: live.answeredCalls ?? brainCallCenterFallback.answeredCalls,
    ahtSeconds: live.ahtSeconds ?? brainCallCenterFallback.ahtSeconds,
    aht: live.aht ?? brainCallCenterFallback.aht,
    serviceSatisfaction: live.serviceSatisfaction ?? brainCallCenterFallback.serviceSatisfaction,
    reasons: live.reasons?.length ? live.reasons : brainCallCenterFallback.reasons,
    issues: live.issues?.length ? live.issues : brainCallCenterFallback.issues,
    quality: live.quality?.length ? live.quality : brainCallCenterFallback.quality,
    operators: live.operators?.length ? live.operators : brainCallCenterFallback.operators,
  }
}
