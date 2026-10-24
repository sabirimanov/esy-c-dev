import { useEffect } from "react"
import { MapTile, tileOf } from "../wall/map"
import { mapConfig } from "../wall/mapConfig"
import { useWall } from "../wall/useWall"
import { screenBody } from "./Screens"

// Screens in this set render gray and dim. Add or remove ids here.
const offScreens = new Set([6, 7])
const ufgScreens = new Set([2, 8, 9])

export function ScreenView({ id }: { id: number }) {
  const { state, patch } = useWall()
  const region = state.regionSet ? state.regionId : mapConfig.regionId
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
      data-region={state.regionId ?? ""}
      data-ufg={state.ufgOpen ? "open" : "closed"}
      onClick={id === 1 ? () => patch({ ufgOpen: !state.ufgOpen }) : undefined}
    >
      {tileOf(id) && <MapTile screen={id} selected={region} />}
      {screenBody(id, state)}
    </div>
  )
}
