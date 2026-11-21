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
import type { MapOverlaySpec } from "./mapOverlay"
import { initTerrain, type CallMapHandlers, type CallMapUi, type Terrain } from "./terrain"

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

function overlayKey(spec: MapOverlaySpec) {
  if (!spec) return ""
  const opacity = spec.opacity == null ? 1 : spec.opacity
  if (spec.kind === "points") {
    const pts = (spec.points ?? []).map((p) => `${p.id}:${p.count}:${p.color}:${p.x.toFixed(3)}:${p.z.toFixed(3)}:${p.approx ? 1 : 0}`).join("|")
    return `points:${opacity.toFixed(2)}:${pts}`
  }
  if (spec.kind === "heatmap") {
    const heat = (spec.heat ?? []).map((p) => `${p.id}:${p.weight}:${p.color}:${p.x.toFixed(3)}:${p.z.toFixed(3)}`).join("|")
    return `heat:${opacity.toFixed(2)}:${heat}`
  }
  const regions = (spec.regions ?? []).map((r) => `${r.regionId}:${r.color}:${r.intensity ?? 0}`).join("|")
  return `region:${opacity.toFixed(2)}:${regions}`
}

export function MapTile({
  screen,
  selected,
  place,
  overlay,
  callUi,
  callHandlers,
}: {
  screen: number
  selected: string | null
  place: { label: string; x: number; z: number } | null
  overlay: MapOverlaySpec
  callUi?: CallMapUi
  callHandlers?: CallMapHandlers
}) {
  const tile = tileOf(screen)
  const host = useRef<HTMLDivElement>(null)
  const terrain = useRef<Terrain | null>(null)
  const selectedRef = useRef(selected)
  const placeRef = useRef(place)
  const overlayRef = useRef(overlay)
  const callUiRef = useRef(callUi)
  const callHandlersRef = useRef(callHandlers)
  selectedRef.current = selected
  placeRef.current = place
  overlayRef.current = overlay
  callUiRef.current = callUi
  callHandlersRef.current = callHandlers
  const placeKey = place ? `${place.label}:${place.x}:${place.z}` : ""
  const overlaySig = overlayKey(overlay)
  const callUiKey = `${callUi?.selectedNo ?? ""}|${callUi?.expandedClusterId ?? ""}`

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
      if (callHandlersRef.current) api.setCallHandlers(callHandlersRef.current)
      if (callUiRef.current) api.setCallUi(callUiRef.current)
      api.setOverlay(overlayRef.current)
    })
    return () => {
      active = false
      terrain.current?.dispose()
      terrain.current = null
    }
  }, [screen])

  useEffect(() => {
    // Defer heavy mesh morph so region/cluster dropdowns stay responsive
    const frame = window.requestAnimationFrame(() => {
      terrain.current?.setRegion(selected)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [selected])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      terrain.current?.setPlace(placeRef.current)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [placeKey])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      terrain.current?.setOverlay(overlayRef.current)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [overlaySig])

  useEffect(() => {
    if (!callHandlers) return
    terrain.current?.setCallHandlers(callHandlers)
  }, [callHandlers])

  useEffect(() => {
    if (!callUi) return
    const frame = window.requestAnimationFrame(() => {
      terrain.current?.setCallUi(callUi)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [callUiKey])

  if (!tile) return null
  return (
    <>
      <img className="map-glow" src={GLOW[screen]} alt="" />
      <div ref={host} className="map-terrain" />
    </>
  )
}
