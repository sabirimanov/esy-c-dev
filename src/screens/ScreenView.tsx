import { useEffect } from "react"
import { MapTile, tileOf } from "../wall/map"
import { mapConfig } from "../wall/mapConfig"
import { useWall } from "../wall/useWall"
import { screenBody } from "./Screens"

// Screens in this set render gray and dim. Add or remove ids here.
const offScreens = new Set([6, 7])

export function ScreenView({ id }: { id: number }) {
  const { state, patch } = useWall()
  const region = state.regionSet ? state.regionId : mapConfig.regionId
  useEffect(() => {
    document.title = String(id)
  }, [id])

  return (
    <div
      className={offScreens.has(id) ? "screen is-off" : id === 1 ? "screen is-toggle" : "screen"}
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
