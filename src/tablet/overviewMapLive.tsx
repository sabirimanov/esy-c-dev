import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { MAP_SCREENS } from "../wall/map"
import { isOverviewPath } from "./mode"

const TILE_W = 1920
const TILE_H = 1080
const COLS = 7
const WALL_W = COLS * TILE_W

/** Live Three.js when the visible CSS width is ≤ ~4 screens (user zoomed in from full wall). */
const LIVE_MAX_VISIBLE_WIDTH = TILE_W * 4.2
/** Max simultaneous WebGL terrains — keeps the tablet from locking up. */
const MAX_LIVE_TILES = 4
const VIEW_PAD = 240

type OverviewMapLiveValue = {
  zoomedIn: boolean
  liveIds: ReadonlySet<number>
}

const OverviewMapLiveContext = createContext<OverviewMapLiveValue>({
  zoomedIn: false,
  liveIds: new Set(),
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

function computeLiveIds(offsetLeft: number, offsetTop: number, width: number, height: number) {
  // Prefer visible CSS width: works with Android WebView pinch even when scale reporting is odd.
  const zoomedIn = width > 0 && width <= LIVE_MAX_VISIBLE_WIDTH
  if (!zoomedIn) return { zoomedIn: false, liveIds: new Set<number>() }

  const left = offsetLeft - VIEW_PAD
  const top = offsetTop - VIEW_PAD
  const right = offsetLeft + width + VIEW_PAD
  const bottom = offsetTop + height + VIEW_PAD
  const vcx = offsetLeft + width / 2
  const vcy = offsetTop + height / 2

  const visible = MAP_SCREENS.map((id) => {
    const r = wallRect(id)
    const intersects = r.left < right && r.right > left && r.top < bottom && r.bottom > top
    const dist = intersects ? (r.cx - vcx) ** 2 + (r.cy - vcy) ** 2 : Number.POSITIVE_INFINITY
    return { id, intersects, dist }
  })
    .filter((t) => t.intersects)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, MAX_LIVE_TILES)
    .map((t) => t.id)

  return { zoomedIn: true, liveIds: new Set(visible) }
}

function readViewport() {
  const vv = window.visualViewport
  if (vv) {
    return {
      offsetLeft: vv.pageLeft ?? vv.offsetLeft,
      offsetTop: vv.pageTop ?? vv.offsetTop,
      width: vv.width,
      height: vv.height,
    }
  }
  // Fallback: approximate from scroll + layout width.
  const scale = Math.min(1, window.innerWidth / WALL_W)
  return {
    offsetLeft: window.scrollX / (scale || 1),
    offsetTop: window.scrollY / (scale || 1),
    width: window.innerWidth / (scale || 1),
    height: window.innerHeight / (scale || 1),
  }
}

export function OverviewMapLiveProvider({ children }: { children: ReactNode }) {
  const active = isOverviewPath()
  const [zoomedIn, setZoomedIn] = useState(false)
  const [liveIds, setLiveIds] = useState<ReadonlySet<number>>(() => new Set())

  useEffect(() => {
    if (!active) {
      setZoomedIn(false)
      setLiveIds(new Set())
      return
    }

    const vv = window.visualViewport
    let timer = 0

    const read = () => {
      const vp = readViewport()
      const next = computeLiveIds(vp.offsetLeft, vp.offsetTop, vp.width, vp.height)
      setZoomedIn(next.zoomedIn)
      setLiveIds((prev) => {
        if (prev.size === next.liveIds.size && [...prev].every((id) => next.liveIds.has(id))) return prev
        return next.liveIds
      })
    }

    const schedule = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(read, 120)
    }

    read()
    vv?.addEventListener("resize", schedule)
    vv?.addEventListener("scroll", schedule)
    window.addEventListener("scroll", schedule, true)
    window.addEventListener("touchend", schedule)
    return () => {
      window.clearTimeout(timer)
      vv?.removeEventListener("resize", schedule)
      vv?.removeEventListener("scroll", schedule)
      window.removeEventListener("scroll", schedule, true)
      window.removeEventListener("touchend", schedule)
    }
  }, [active])

  const value = useMemo(() => ({ zoomedIn, liveIds }), [zoomedIn, liveIds])
  return <OverviewMapLiveContext.Provider value={value}>{children}</OverviewMapLiveContext.Provider>
}

export function useOverviewMapLive() {
  return useContext(OverviewMapLiveContext)
}

export function useOverviewMapLiveFor(screenId: number) {
  const { liveIds } = useOverviewMapLive()
  return liveIds.has(screenId)
}
