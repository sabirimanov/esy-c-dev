import { useCachedResource } from "./cachedFetch"
import type { WallState } from "../wall/state"

export type CalibrationCounts = {
  residential: number
  nonResidential: number
  balance: number
  pressure: number
  temperature: number
  total: number
}

export function useCalibration(state: WallState) {
  return useCachedResource<CalibrationCounts>("/calibration", state.seed)
}
