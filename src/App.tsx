import { useEffect } from "react"
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom"
import { AlertScrollProvider } from "./data/alertScroll"
import { WallProvider } from "./wall/useWall"
import { ScreenView } from "./screens/ScreenView"
import { SnocRoute } from "./snoc/SnocRoute"

const COLS = 7
const TILE = { w: 1920, h: 1080 }

function parseScreens(param: string | undefined) {
  const ids = [...new Set((param ?? "").split("--").map(Number))]
  return ids.filter((id) => Number.isInteger(id) && id >= 1 && id <= 21)
}

function place(id: number) {
  const index = id - 1
  return { col: index % COLS, row: Math.floor(index / COLS) }
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
    fitPage(TILE.w, TILE.h)
    document.title = ids.join("--") || "CCC"
    return () => fitPage(TILE.w, TILE.h)
  }, [screenId])

  useEffect(() => {
    if (single === null) return
    const current = single
    function onKey(event: KeyboardEvent) {
      if (!event.metaKey || event.altKey || event.shiftKey || event.ctrlKey) return
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      event.preventDefault()
      const next = event.key === "ArrowRight" ? Math.min(21, current + 1) : Math.max(1, current - 1)
      if (next !== current) navigate(`/${next}`)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [single, navigate])

  if (!ids.length) return <div className="screen" />
  return (
    <div className="wall-fit">
      <div className="wall" style={{ width, height, transform: `scale(${scaleX}, ${scaleY})` }}>
        {spots.map((spot) => (
          <div key={spot.id} className="wall-tile" style={{ left: (spot.col - minCol) * TILE.w, top: (spot.row - minRow) * TILE.h }}>
            <ScreenView id={spot.id} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function App() {
  return (
    <AlertScrollProvider>
    <WallProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div className="screen" />} />
          <Route path="/snoc" element={<Navigate to="/snoc/1" replace />} />
          <Route path="/snoc/:screenId" element={<SnocRoute />} />
          <Route path="/:screenId" element={<RouteScreen />} />
        </Routes>
      </BrowserRouter>
    </WallProvider>
    </AlertScrollProvider>
  )
}
