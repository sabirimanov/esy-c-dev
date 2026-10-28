import { readPanel, type Panel } from "../snoc/format"
import { useCachedResource } from "./cachedFetch"
import { useWall } from "../wall/useWall"

const BASE_URL = String(import.meta.env.VITE_SOC_DASHBOARD_URL || "/socnoc/monitoring/screen1/api/dashboard").replace(/^https?:\/\/127\.0\.0\.1:8443\/api\/dashboard$/, "/soc-live")

export function useSocPanel() {
  const { state } = useWall()
  const body = useCachedResource<{ panels?: Record<string, Panel> }>(`${BASE_URL}?range=now`, state.seed, false)
  return (key: string) => readPanel(body?.panels?.[key]).text
}
