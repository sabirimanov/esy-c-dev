import { useEffect, useRef } from "react"
import glowUrl from "../assets/map-glow.png"
import { initTerrain, type Terrain } from "./terrain"

// Master map is 3×3 tiles, 5760×3240. Each screen renders its own 1920×1080
// window of one shared camera, so the land meets at the bezels.
// The glow is one ellipse from the full wall, sliced the same way.

export const MAP_SCREENS = [3, 4, 5, 10, 11, 12, 17, 18, 19]
export const MAP_SIZE = { w: 5760, h: 3240 }

export function tileOf(screen: number) {
  const index = MAP_SCREENS.indexOf(screen)
  if (index < 0) return null
  return { x: (index % 3) * 1920, y: Math.floor(index / 3) * 1080 }
}

export function MapTile({ screen, selected }: { screen: number; selected: string | null }) {
  const tile = tileOf(screen)
  const host = useRef<HTMLDivElement>(null)
  const terrain = useRef<Terrain | null>(null)
  const selectedRef = useRef(selected)
  selectedRef.current = selected

  useEffect(() => {
    const node = host.current
    if (!tile || !node) return
    let active = true
    initTerrain(node, tile).then((api) => {
      if (!active) {
        api.dispose()
        return
      }
      terrain.current = api
      api.setRegion(selectedRef.current)
    })
    return () => {
      active = false
      terrain.current?.dispose()
      terrain.current = null
    }
  }, [screen])

  useEffect(() => {
    terrain.current?.setRegion(selected)
  }, [selected])

  if (!tile) return null
  return (
    <>
      <img
        className="map-glow"
        src={glowUrl}
        alt=""
        style={{ left: -tile.x, top: -tile.y, width: MAP_SIZE.w, height: MAP_SIZE.h }}
      />
      <div ref={host} className="map-terrain" />
    </>
  )
}
