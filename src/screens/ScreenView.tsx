import { useEffect } from "react"
import { MapTile, tileOf } from "../wall/map"
import { cityById, mapRegionId } from "../wall/places"
import { useWall } from "../wall/useWall"
import { screenBody } from "./Screens"

// Screens in this set render gray and dim. Add or remove ids here.
const offScreens = new Set([6, 7])
const ufgScreens = new Set([2, 8, 9])

export function ScreenView({ id }: { id: number }) {
  const { state, patch } = useWall()
  const city = cityById(state.cityId)
  useEffect(() => {
    document.title = String(id)
  }, [id])

  const dimmed = state.ufgOpen && id !== 1 && !ufgScreens.has(id)
  const className = [
    "screen",
    id === 1 ? "is-toggle" : "",
    offScreens.has(id) ? "is-off" : "",
    dimmed ? "is-ufg-dim" : "",
  ].filter(Boolean).join(" ")

  return (
    <div
      className={className}
      data-screen={id}
      data-date={state.date}
      data-date-to={state.dateTo}
      data-region={state.regionId ?? ""}
      data-city={state.cityId ?? ""}
      data-ufg={state.ufgOpen ? "open" : "closed"}
      onClick={id === 1 ? () => patch({ ufgOpen: !state.ufgOpen }) : undefined}
    >
      {tileOf(id) && (
        <MapTile
          screen={id}
          selected={mapRegionId(state.regionId)}
          place={city ? { label: city.mapLabel, x: city.x, z: city.z } : null}
        />
      )}
      {screenBody(id, state)}
    </div>
  )
}
