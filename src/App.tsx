import { useEffect } from "react"
import { BrowserRouter, Route, Routes, useNavigate, useParams } from "react-router-dom"
import { WallProvider } from "./wall/useWall"
import { ScreenView } from "./screens/ScreenView"

function RouteScreen() {
  const { screenId } = useParams()
  const navigate = useNavigate()
  const id = Number(screenId)
  const active = Number.isInteger(id) && id >= 1 && id <= 21

  useEffect(() => {
    if (!active) return
    function onKey(event: KeyboardEvent) {
      if (!event.metaKey || event.altKey || event.shiftKey || event.ctrlKey) return
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      event.preventDefault()
      const next = event.key === "ArrowRight" ? Math.min(21, id + 1) : Math.max(1, id - 1)
      if (next !== id) navigate(`/${next}`)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [active, id, navigate])

  if (!active) return <div className="screen" />
  return <ScreenView id={id} />
}

export function App() {
  return (
    <WallProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<div className="screen" />} />
          <Route path="/:screenId" element={<RouteScreen />} />
        </Routes>
      </BrowserRouter>
    </WallProvider>
  )
}
