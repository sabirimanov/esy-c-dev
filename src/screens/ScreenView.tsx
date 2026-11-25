import { useEffect, useMemo } from "react"
import { useEmergencyCalls } from "../data/emergencyCalls"
import { MapTile, tileOf } from "../wall/map"
import { useMapScreenPresence } from "../wall/mapLayerControl"
import { cityById, mapRegionId } from "../wall/places"
import { useActiveMapOverlay } from "../wall/useMapCarousel"
import { useWall } from "../wall/useWall"
import { isOverviewPath } from "../tablet/mode"
import { screenBody } from "./Screens"

// Screens in this set render gray and dim. Add or remove ids here.
const offScreens = new Set([6])
const ufgScreens = new Set([2, 8, 9])

/** Map tiles only — registers presence so layers fetch, and binds overlay/call UI. */
function MapScreenLayer({ id }: { id: number }) {
  useMapScreenPresence()
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

  return (
    <MapTile
      screen={id}
      selected={selected}
      place={place}
      overlay={overlay}
      callUi={overlayOn ? callUi : undefined}
      callHandlers={overlayOn ? callHandlers : undefined}
    />
  )
}

export function ScreenView({ id }: { id: number }) {
  const { state, patch } = useWall()
  useEffect(() => {
    document.title = String(id)
  }, [id])

  const dimmed = state.ufgOpen && id !== 1 && !ufgScreens.has(id)
  const off = offScreens.has(id) && !(state.ufgOpen && ufgScreens.has(id))
  const className = [
    "screen",
    id === 1 ? "is-toggle" : "",
    off ? "is-off" : "",
    dimmed ? "is-ufg-dim" : "",
  ].filter(Boolean).join(" ")

  const hasMap = Boolean(tileOf(id))
  const overview = isOverviewPath()

  return (
    <div
      className={className}
      data-screen={id}
      data-date={state.date}
      data-date-to={state.dateTo}
      data-region={state.regionId ?? ""}
      data-city={state.cityId ?? ""}
      data-ufg={state.ufgOpen ? "open" : "closed"}
      data-map-mode={state.mapMode}
      data-map-preview={state.mapPreviewSlide ?? ""}
      onClick={!overview && id === 1 ? () => patch({ ufgOpen: !state.ufgOpen }) : undefined}
    >
      {/* View All uses one shared OverviewFullMap — skip per-tile WebGL here. */}
      {hasMap && !overview ? <MapScreenLayer id={id} /> : null}
      {screenBody(id, state)}
    </div>
  )
}
