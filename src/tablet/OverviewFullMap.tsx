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
 * Shared map for View All: per-tile green glow immediately + one Three.js full-map terrain.
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
    initTerrain(node, { x: 0, y: 0 }, { fullWall: true })
      .then((api) => {
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
      .catch((err) => {
        console.error("OverviewFullMap terrain failed", err)
      })
    return () => {
      active = false
      terrain.current?.dispose()
      terrain.current = null
    }
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
  // Map block = screens 3,4,5 / 10,11,12 / 17,18,19 → starts at col 2.
  const left = 2 * t.w
  const top = 0
  const w = 3 * t.w
  const h = 3 * t.h
  // Block is 2880×1620 (half of 5760×3240). Terrain canvas is also 2880×1620 → 1:1.

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
      {/* Green glow — visible immediately while WebGL loads */}
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

      {/* One shared 3D map on top of glows */}
      <div
        ref={host}
        className="overview-full-map-host"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 2880,
          height: 1620,
        }}
      />
    </div>
  )
}
