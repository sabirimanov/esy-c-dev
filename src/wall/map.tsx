import { useEffect, useRef } from "react"
import glow3 from "../assets/map-glow-3.jpg"
import glow4 from "../assets/map-glow-4.jpg"
import glow5 from "../assets/map-glow-5.jpg"
import glow10 from "../assets/map-glow-10.jpg"
import glow11 from "../assets/map-glow-11.jpg"
import glow12 from "../assets/map-glow-12.jpg"
import glow17 from "../assets/map-glow-17.jpg"
import glow18 from "../assets/map-glow-18.jpg"
import glow19 from "../assets/map-glow-19.jpg"
import { initTerrain, type Terrain } from "./terrain"

// Master map is 3×3 tiles, 5760×3240. Each screen renders its own 1920×1080
// window of one shared camera, so the land meets at the bezels.
// The glow is the same ellipse, already cut into one 1920×1080 file per screen.

export const MAP_SCREENS = [3, 4, 5, 10, 11, 12, 17, 18, 19]

const GLOW: Record<number, string> = {
  3: glow3,
  4: glow4,
  5: glow5,
  10: glow10,
  11: glow11,
  12: glow12,
  17: glow17,
  18: glow18,
  19: glow19,
}

export function tileOf(screen: number) {
  const index = MAP_SCREENS.indexOf(screen)
  if (index < 0) return null
  return { x: (index % 3) * 1920, y: Math.floor(index / 3) * 1080 }
}

export function MapTile({
  screen,
  selected,
  place,
}: {
  screen: number
  selected: string | null
  place: { label: string; x: number; z: number } | null
}) {
  const tile = tileOf(screen)
  const host = useRef<HTMLDivElement>(null)
  const terrain = useRef<Terrain | null>(null)
  const selectedRef = useRef(selected)
  const placeRef = useRef(place)
  selectedRef.current = selected
  placeRef.current = place
  const placeKey = place ? `${place.label}:${place.x}:${place.z}` : ""

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
      api.setPlace(placeRef.current)
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

  useEffect(() => {
    terrain.current?.setPlace(placeRef.current)
  }, [placeKey])

  if (!tile) return null
  return (
    <>
      <img className="map-glow" src={GLOW[screen]} alt="" />
      <div ref={host} className="map-terrain" />
    </>
  )
}
