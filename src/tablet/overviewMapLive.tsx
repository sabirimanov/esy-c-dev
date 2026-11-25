import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { MAP_SCREENS } from "../wall/map"
import { isOverviewPath } from "./mode"
import { OVERVIEW_TILE_SCALE } from "./overviewStage"

const TILE_W = 1920 * OVERVIEW_TILE_SCALE
const TILE_H = 1080 * OVERVIEW_TILE_SCALE
const COLS = 7

/** Native ZoomPanLayout scale above this unlocks live Three.js (page already shows all 21 at scale=1). */
const LIVE_NATIVE_SCALE = 2.2
const MAX_LIVE_TILES = 4

type OverviewMapLiveValue = {
  zoomedIn: boolean
  liveIds: ReadonlySet<number>
  nativeScale: number
}

const OverviewMapLiveContext = createContext<OverviewMapLiveValue>({
  zoomedIn: false,
  liveIds: new Set(),
  nativeScale: 1,
})

function wallRect(screenId: number) {
  const index = screenId - 1
  const col = index % COLS
  const row = Math.floor(index / COLS)
  return {
    left: col * TILE_W,
    top: row * TILE_H,
    right: col * TILE_W + TILE_W,
    bottom: row * TILE_H + TILE_H,
    cx: col * TILE_W + TILE_W / 2,
    cy: row * TILE_H + TILE_H / 2,
  }
}

/**
 * Approximate which map tiles are under the zoomed viewport.
 * content is CSS-fit into the WebView; native scale/pan come from Android ZoomPanLayout.
 */
function liveIdsForTransform(scale: number, transX: number, transY: number, viewW: number, viewH: number, wallW: number) {
  if (scale < LIVE_NATIVE_SCALE) return new Set<number>()

  const fit = viewW / wallW
  // Point in wall CSS space under the view center:
  const vcx = (viewW / 2 - transX) / (fit * scale)
  const vcy = (viewH / 2 - transY) / (fit * scale)
  // Visible wall size:
  const visW = viewW / (fit * scale)
  const visH = viewH / (fit * scale)
  const left = vcx - visW / 2
  const top = vcy - visH / 2
  const right = vcx + visW / 2
  const bottom = vcy + visH / 2

  return new Set(
    MAP_SCREENS.map((id) => {
      const r = wallRect(id)
      const intersects = r.left < right && r.right > left && r.top < bottom && r.bottom > top
      const dist = intersects ? (r.cx - vcx) ** 2 + (r.cy - vcy) ** 2 : Number.POSITIVE_INFINITY
      return { id, intersects, dist }
    })
      .filter((t) => t.intersects)
      .sort((a, b) => a.dist - b.dist)
      .slice(0, MAX_LIVE_TILES)
      .map((t) => t.id),
  )
}

declare global {
  interface Window {
    __CCC_OVERVIEW_ZOOM?: (scale: number, transX: number, transY: number, viewW: number, viewH: number) => void
  }
}

export function OverviewMapLiveProvider({
  children,
  cols = 7,
}: {
  children: ReactNode
  cols?: number
}) {
  const active = isOverviewPath()
  const wallW = cols * TILE_W
  const [nativeScale, setNativeScale] = useState(1)
  const [liveIds, setLiveIds] = useState<ReadonlySet<number>>(() => new Set())

  useEffect(() => {
    if (!active) {
      setNativeScale(1)
      setLiveIds(new Set())
      return
    }

    const apply = (scale: number, transX: number, transY: number, viewW: number, viewH: number) => {
      setNativeScale(scale)
      const next = liveIdsForTransform(scale, transX, transY, viewW, viewH, wallW)
      setLiveIds((prev) => {
        if (prev.size === next.size && [...prev].every((id) => next.has(id))) return prev
        return next
      })
    }

    window.__CCC_OVERVIEW_ZOOM = apply
    const onEvent = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        scale: number
        transX: number
        transY: number
        viewW: number
        viewH: number
      }
      apply(detail.scale, detail.transX, detail.transY, detail.viewW, detail.viewH)
    }
    window.addEventListener("ccc-overview-zoom", onEvent)
    return () => {
      delete window.__CCC_OVERVIEW_ZOOM
      window.removeEventListener("ccc-overview-zoom", onEvent)
    }
  }, [active, wallW])

  const value = useMemo(
    () => ({
      zoomedIn: nativeScale >= LIVE_NATIVE_SCALE,
      liveIds,
      nativeScale,
    }),
    [nativeScale, liveIds],
  )

  return <OverviewMapLiveContext.Provider value={value}>{children}</OverviewMapLiveContext.Provider>
}

export function useOverviewMapLiveFor(screenId: number) {
  const { liveIds } = useContext(OverviewMapLiveContext)
  return liveIds.has(screenId)
}
