import { useEffect } from "react"
import { MapTile, tileOf } from "../wall/map"
import { mapConfig } from "../wall/mapConfig"
import { useWall } from "../wall/useWall"
import { screenBody } from "./Screens"

export function ScreenView({ id }: { id: number }) {
  const { state } = useWall()
  const region = state.regionSet ? state.regionId : mapConfig.regionId
  useEffect(() => {
    document.title = String(id)
  }, [id])

  return (
    <div className="screen" data-screen={id} data-date={state.date} data-region={state.regionId ?? ""}>
      {tileOf(id) && <MapTile screen={id} selected={region} />}
      {screenBody(id, state)}
    </div>
  )
}
