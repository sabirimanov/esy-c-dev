import { useEffect, useMemo, useRef } from "react"
import { useEmergencyCalls } from "../data/emergencyCalls"
import { useMapScreenPresence } from "../wall/mapLayerControl"
import { cityById, mapRegionId } from "../wall/places"
import { initTerrain, type Terrain } from "../wall/terrain"
import { useActiveMapOverlay } from "../wall/useMapCarousel"
import { useWall } from "../wall/useWall"
import { overviewTileSize } from "./overviewStage"

/**
 * One shared Three.js terrain covering the whole 3×3 map block on View All.
 * Avoids mounting nine WebGL contexts while keeping the live map visible immediately.
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

  useEffect(() => {
    const node = host.current
    if (!node) return
    let active = true
    initTerrain(node, { x: 0, y: 0 }, { fullWall: true }).then((api) => {
      if (!active) {
        api.dispose()
        return
      }
      terrain.current = api
      api.setRegion(selected)
      api.setPlace(place)
      if (overlayOn) {
        api.setCallHandlers(callHandlers)
        api.setCallUi(callUi)
      }
      api.setOverlay(overlay)
    })
    return () => {
      active = false
      terrain.current?.dispose()
      terrain.current = null
    }
    // Mount once for the overview session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    terrain.current?.setRegion(selected)
  }, [selected])

  useEffect(() => {
    terrain.current?.setPlace(place)
  }, [place])

  useEffect(() => {
    terrain.current?.setOverlay(overlay)
  }, [overlay])

  useEffect(() => {
    if (!overlayOn) return
    terrain.current?.setCallHandlers(callHandlers)
    terrain.current?.setCallUi(callUi)
  }, [overlayOn, callHandlers, callUi])

  const t = overviewTileSize()
  // Map block starts at screen 3 (col 2, row 0) and spans 3×3 tiles.
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
      <div
        style={{
          width: 5760,
          height: 3240,
          transform: "scale(0.5)",
          transformOrigin: "0 0",
        }}
      >
        <div ref={host} className="map-terrain" style={{ width: 5760, height: 3240 }} />
      </div>
    </div>
  )
}
