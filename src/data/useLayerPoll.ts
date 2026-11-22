import { useEffect, useRef } from "react"
import type { WallScope } from "../wall/wallScope"

type Pull = (opts: { force: boolean; scope: WallScope }) => Promise<void>

/**
 * Common lifecycle for wall / map data layers:
 * - idle while `enabled` is false (keeps last good state)
 * - pulls when enabled becomes true
 * - re-pulls when wall scope (filters / seed) changes
 * - polls on `pollMs` while enabled
 */
export function useLayerPoll(enabled: boolean, scope: WallScope, pollMs: number, pull: Pull) {
  const pullRef = useRef(pull)
  pullRef.current = pull
  const scopeRef = useRef(scope)
  scopeRef.current = scope

  useEffect(() => {
    if (!enabled) return
    let live = true

    async function run(force: boolean) {
      if (!live) return
      try {
        await pullRef.current({ force, scope: scopeRef.current })
      } catch {
        /* callers set error state inside pull */
      }
    }

    void run(false)
    const id = window.setInterval(() => {
      void run(true)
    }, Math.max(5_000, pollMs))

    return () => {
      live = false
      window.clearInterval(id)
    }
  }, [enabled, scope.key, pollMs])
}
