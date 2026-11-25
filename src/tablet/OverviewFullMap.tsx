import { useEffect, useMemo, useRef } from "react"
import { useEmergencyCalls } from "../data/emergencyCalls"
import { MAP_SCREENS, MapGlowOnly } from "../wall/map"
import { useMapScreenPresence } from "../wall/mapLayerControl"
import { cityById, mapRegionId } from "../wall/places"
import { initTerrain, type Terrain } from "../wall/terrain"
import { useActiveMapOverlay } from "../wall/useMapCarousel"
import { useWall } from "../wall/useWall"
import { OVERVIEW_TILE_SCALE, overviewTileSize } from "./overviewStage"

/**
 * Shared map for View All: per-tile green glow immediately + one Three.js full-map terrain
 * (with overlays / circles / counts).
 */
export function OverviewFullMap() {
  useMapScreenPresence()
  const host = useRef<HTMLDivElement>(null)
  const terrain = useRef<Terrain | null>(null)
  const { state } = useWall()
  const emergency = useEmergencyCalls()
  const city = cityById(state.cityId)
  const overlayOn =
    Boolean(state.mapPreviewSlide) || state.mapMode === "default" || state.mapMode === "carousel"
  const overlay = useActiveMapOverlay()
  const showPlace = !overlayOn
  const selected = showPlace ? mapRegionId(state.regionId) : null
  const place = showPlace && city ? { label: city.mapLabel, x: city.x, z: city.z } : null
  const callUi = useMemo(
    () => ({ selectedNo: emergency.selectedNo, expandedClusterId: emergency.expandedClusterId }),
    [emergency.selectedNo, emergency.expandedClusterId],
  )
  const callHandlers = useMemo(
    () => ({
      onSelectCall: emergency.selectCall,
      onOpenList: emergency.openCallList,
      onExpandCluster: emergency.expandCluster,
      onClear: emergency.clearMapSelection,
    }),
    [emergency.selectCall, emergency.openCallList, emergency.expandCluster, emergency.clearMapSelection],
  )

  // Keep latest values for async terrain init.
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

  useEffect(() => {
    const node = host.current
    if (!node) return
    let active = true
    initTerrain(node, { x: 0, y: 0 }, { fullWall: true })
      .then((api) => {
        if (!active) {
          api.dispose()
          return
        }
        terrain.current = api
        api.setRegion(selectedRef.current)
        api.setPlace(placeRef.current)
        api.setCallHandlers(callHandlersRef.current)
        api.setCallUi(callUiRef.current)
        api.setOverlay(overlayRef.current)
      })
      .catch((err) => {
        console.error("OverviewFullMap terrain failed", err)
      })
    return () => {
      active = false
      terrain.current?.dispose()
      terrain.current = null
    }
  }, [])

  useEffect(() => {
    terrain.current?.setRegion(selected)
  }, [selected])

  useEffect(() => {
    terrain.current?.setPlace(place)
  }, [place])

  useEffect(() => {
    const api = terrain.current
    if (!api) return
    api.setCallHandlers(callHandlers)
    api.setCallUi(callUi)
    api.setOverlay(overlay)
  }, [overlay, callUi, callHandlers])

  const t = overviewTileSize()
  const left = 2 * t.w
  const top = 0
  const w = 3 * t.w
  const h = 3 * t.h

  return (
    <div
      className="overview-full-map"
      style={{
        position: "absolute",
        left,
        top,
        width: w,
        height: h,
        overflow: "hidden",
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      {MAP_SCREENS.map((id) => {
        const index = MAP_SCREENS.indexOf(id)
        const col = index % 3
        const row = Math.floor(index / 3)
        return (
          <div
            key={id}
            style={{
              position: "absolute",
              left: col * t.w,
              top: row * t.h,
              width: t.w,
              height: t.h,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: 1920,
                height: 1080,
                transform: `scale(${OVERVIEW_TILE_SCALE})`,
                transformOrigin: "0 0",
              }}
            >
              <MapGlowOnly screen={id} />
            </div>
          </div>
        )
      })}

      <div
        ref={host}
        className="overview-full-map-host"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 2880,
          height: 1620,
          zIndex: 1,
        }}
      />
    </div>
  )
}
