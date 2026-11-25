import { useEffect, useState, type CSSProperties, type ReactNode } from "react"
import { applyTabletDomClass } from "./mode"

const NATIVE_TILE = { w: 1920, h: 1080 }
/** Half-res overview: 4× fewer pixels, same 16:9 proportions. */
export const OVERVIEW_TILE_SCALE = 0.5

export function overviewTileSize() {
  return {
    w: NATIVE_TILE.w * OVERVIEW_TILE_SCALE,
    h: NATIVE_TILE.h * OVERVIEW_TILE_SCALE,
  }
}

export function overviewWallSize(cols: number, rows: number) {
  const t = overviewTileSize()
  return { w: cols * t.w, h: rows * t.h }
}

/**
 * Fits the whole wall into the WebView by CSS scale(fit-width), vertically centered.
 * Android ZoomPanLayout then pinch-zooms this already-fitted page — so View All
 * ALWAYS opens with every screen visible, with no WebView viewport hacks.
 */
export function useOverviewFit(wallW: number, wallH: number) {
  useEffect(() => {
    applyTabletDomClass()
    document.documentElement.classList.add("is-overview")

    const meta = document.querySelector('meta[name="viewport"]')
    const prev = meta?.getAttribute("content") ?? "width=1920"
    meta?.setAttribute(
      "content",
      "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
    )

    const apply = () => {
      const vw = Math.max(1, window.innerWidth)
      const vh = Math.max(1, window.innerHeight)
      const fit = vw / wallW
      const stageH = wallH * fit
      const stageTop = Math.max(0, (vh - stageH) / 2)

      for (const node of [document.documentElement, document.body, document.getElementById("root")]) {
        if (!node) continue
        node.style.width = `${vw}px`
        node.style.height = `${vh}px`
        node.style.margin = "0"
        node.style.overflow = "hidden"
        node.style.background = "#000"
      }

      const wall = document.getElementById("overview-wall")
      if (wall) {
        wall.style.width = `${wallW}px`
        wall.style.height = `${wallH}px`
        wall.style.transform = `scale(${fit})`
        wall.style.transformOrigin = "0 0"
      }

      const stage = document.getElementById("overview-stage")
      if (stage) {
        stage.style.position = "absolute"
        stage.style.left = "0"
        stage.style.top = `${stageTop}px`
        stage.style.width = `${vw}px`
        stage.style.height = `${stageH}px`
      }
    }

    apply()
    window.addEventListener("resize", apply)
    return () => {
      window.removeEventListener("resize", apply)
      document.documentElement.classList.remove("is-overview")
      meta?.setAttribute("content", prev)
      for (const node of [document.documentElement, document.body, document.getElementById("root")]) {
        if (!node) continue
        node.style.width = `${NATIVE_TILE.w}px`
        node.style.height = `${NATIVE_TILE.h}px`
      }
    }
  }, [wallW, wallH])
}

/** Half-res tile cell: layout stays 1920×1080 inside, displayed at 50%. */
export function OverviewHalfTile({
  x,
  y,
  children,
}: {
  x: number
  y: number
  children: ReactNode
}) {
  const t = overviewTileSize()
  return (
    <div
      className="overview-half-tile"
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: t.w,
        height: t.h,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: NATIVE_TILE.w,
          height: NATIVE_TILE.h,
          transform: `scale(${OVERVIEW_TILE_SCALE})`,
          transformOrigin: "0 0",
        }}
      >
        {children}
      </div>
    </div>
  )
}

export function OverviewSkeleton({ id, style }: { id: number; style?: CSSProperties }) {
  return (
    <div className="overview-skeleton" style={style}>
      Screen {id}
    </div>
  )
}

export function useStaggeredReady(delayMs: number) {
  const [ready, setReady] = useState(delayMs <= 0)
  useEffect(() => {
    if (ready) return
    const t = window.setTimeout(() => setReady(true), delayMs)
    return () => window.clearTimeout(t)
  }, [delayMs, ready])
  return ready
}
