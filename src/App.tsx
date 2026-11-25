import { useEffect } from "react"
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom"
import { AlertScrollProvider } from "./data/alertScroll"
import { ConsumptionExceedanceProvider } from "./data/consumptionExceedance"
import { EmergencyCallsProvider } from "./data/emergencyCalls"
import { MetersOfflineProvider } from "./data/metersOffline"
import { RepeatedReadingsProvider } from "./data/repeatedReadings"
import { TamperingEventsProvider } from "./data/tamperingEvents"
import { MeterAnomaliesProvider } from "./data/meterAnomalies"
import { NetworkAlarmsProvider } from "./data/networkAlarms"
import { NetworkPressureProvider } from "./data/networkPressure"
import { UfgByRegionProvider } from "./data/ufgByRegion"
import { MapLayerControlProvider } from "./wall/mapLayerControl"
import { WallProvider } from "./wall/useWall"
import { ScreenView } from "./screens/ScreenView"
import { SnocRoute } from "./snoc/SnocRoute"
import { SocnocRoute } from "./socnoc/SocnocRoute"
import { SocnocScreen } from "./socnoc/screens"
import { applyTabletDomClass, withTabletQuery } from "./tablet/mode"
import "./socnoc/socnoc.css"

function SnocLegacyRedirect() {
  const { screenId } = useParams()
  return <Navigate to={`/socnoc2/${screenId ?? "1"}`} replace />
}

const COLS = 7
const SOCNOC_COLS = 4
const TILE = { w: 1920, h: 1080 }

function parseScreens(param: string | undefined) {
  const ids = [...new Set((param ?? "").split("--").map(Number))]
  return ids.filter((id) => Number.isInteger(id) && id >= 1 && id <= 21)
}

function place(id: number, cols = COLS) {
  const index = id - 1
  return { col: index % cols, row: Math.floor(index / cols) }
}

function fitPage(width: number, height: number) {
  for (const node of [document.documentElement, document.body, document.getElementById("root")]) {
    if (!node) continue
    node.style.width = `${width}px`
    node.style.height = `${height}px`
  }
}

function RouteScreen() {
  const { screenId } = useParams()
  const navigate = useNavigate()
  const ids = parseScreens(screenId)
  const single = ids.length === 1 ? ids[0] : null
  const spots = ids.map((id) => ({ id, ...place(id) }))
  const minCol = Math.min(...spots.map((spot) => spot.col))
  const maxCol = Math.max(...spots.map((spot) => spot.col))
  const minRow = Math.min(...spots.map((spot) => spot.row))
  const maxRow = Math.max(...spots.map((spot) => spot.row))
  const width = ids.length ? (maxCol - minCol + 1) * TILE.w : TILE.w
  const height = ids.length ? (maxRow - minRow + 1) * TILE.h : TILE.h
  const scaleX = TILE.w / width
  const scaleY = TILE.h / height

  useEffect(() => {
    applyTabletDomClass()
    fitPage(TILE.w, TILE.h)
    document.title = ids.join("--") || "CCC"
    return () => fitPage(TILE.w, TILE.h)
  }, [screenId])

  useEffect(() => {
    if (single === null) return
    const current = single
    function onKey(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      event.preventDefault()
      const next = event.key === "ArrowRight" ? Math.min(21, current + 1) : Math.max(1, current - 1)
      if (next !== current) navigate(withTabletQuery(`/${next}`))
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [single, navigate])

  if (!ids.length) return <div className="screen" />
  return (
    <div className="wall-fit">
      <div className="wall" style={{ width, height, transform: scaleX === 1 && scaleY === 1 ? undefined : `scale(${scaleX}, ${scaleY})` }}>
        {spots.map((spot) => (
          <div key={spot.id} className="wall-tile" style={{ left: (spot.col - minCol) * TILE.w, top: (spot.row - minRow) * TILE.h }}>
            <ScreenView id={spot.id} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** Full Operations wall (7×3) at native 16:9 tile size — for tablet View All + pinch zoom. */
function OpsOverview() {
  const ids = Array.from({ length: 21 }, (_, i) => i + 1)
  const width = COLS * TILE.w
  const height = 3 * TILE.h

  useEffect(() => {
    applyTabletDomClass()
    fitPage(width, height)
    document.title = "overview"
    return () => fitPage(TILE.w, TILE.h)
  }, [width, height])

  return (
    <div className="wall wall-overview" style={{ width, height }}>
      {ids.map((id) => {
        const { col, row } = place(id)
        return (
          <div key={id} className="wall-tile" style={{ left: col * TILE.w, top: row * TILE.h }}>
            <ScreenView id={id} />
          </div>
        )
      })}
    </div>
  )
}

/** Full SOC/NOC wall (4×3) at native tile size. */
function SocnocOverview() {
  const ids = Array.from({ length: 12 }, (_, i) => i + 1)
  const width = SOCNOC_COLS * TILE.w
  const height = 3 * TILE.h

  useEffect(() => {
    applyTabletDomClass()
    fitPage(width, height)
    document.title = "socnoc overview"
    return () => fitPage(TILE.w, TILE.h)
  }, [width, height])

  return (
    <div className="wall wall-overview" style={{ width, height }}>
      {ids.map((id) => {
        const { col, row } = place(id, SOCNOC_COLS)
        return (
          <div key={id} className="wall-tile" style={{ left: col * TILE.w, top: row * TILE.h }}>
            <div className="screen" data-socnoc={id}>
              <SocnocScreen id={id} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function App() {
  return (
    <AlertScrollProvider>
    <WallProvider>
      <MapLayerControlProvider>
      <EmergencyCallsProvider>
      <ConsumptionExceedanceProvider>
      <MetersOfflineProvider>
      <RepeatedReadingsProvider>
      <TamperingEventsProvider>
      <MeterAnomaliesProvider>
      <NetworkAlarmsProvider>
      <NetworkPressureProvider>
      <UfgByRegionProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div className="screen" />} />
          <Route path="/overview" element={<OpsOverview />} />
          <Route path="/snoc" element={<Navigate to="/socnoc2/1" replace />} />
          <Route path="/snoc/:screenId" element={<SnocLegacyRedirect />} />
          <Route path="/socnoc2" element={<Navigate to="/socnoc2/1" replace />} />
          <Route path="/socnoc2/:screenId" element={<SnocRoute />} />
          <Route path="/socnoc/overview" element={<SocnocOverview />} />
          <Route path="/socnoc" element={<Navigate to="/socnoc/1" replace />} />
          <Route path="/socnoc/:screenId" element={<SocnocRoute />} />
          <Route path="/:screenId" element={<RouteScreen />} />
        </Routes>
      </BrowserRouter>
      </UfgByRegionProvider>
      </NetworkPressureProvider>
      </NetworkAlarmsProvider>
      </MeterAnomaliesProvider>
      </TamperingEventsProvider>
      </RepeatedReadingsProvider>
      </MetersOfflineProvider>
      </ConsumptionExceedanceProvider>
      </EmergencyCallsProvider>
      </MapLayerControlProvider>
    </WallProvider>
    </AlertScrollProvider>
  )
}
