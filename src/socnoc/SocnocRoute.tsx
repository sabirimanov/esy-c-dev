import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { SocnocScreen } from "./screens"
import "./socnoc.css"

function fitPage() {
  for (const node of [document.documentElement, document.body, document.getElementById("root")]) {
    if (!node) continue
    node.style.width = "1920px"
    node.style.height = "1080px"
  }
}

export function SocnocRoute() {
  const { screenId } = useParams()
  const navigate = useNavigate()
  const id = Number(screenId)
  const ok = Number.isInteger(id) && id >= 1 && id <= 12

  useEffect(() => {
    fitPage()
    document.title = ok ? `socnoc ${id}` : "socnoc"
  }, [id, ok])

  useEffect(() => {
    if (!ok) return
    function onKey(event: KeyboardEvent) {
      if (!event.metaKey || event.altKey || event.shiftKey || event.ctrlKey) return
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      event.preventDefault()
      const next = event.key === "ArrowRight" ? Math.min(12, id + 1) : Math.max(1, id - 1)
      if (next !== id) navigate(`/socnoc/${next}`)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [id, navigate, ok])

  if (!ok) return <div className="screen" />
  return (
    <div className="screen" data-socnoc={id}>
      <SocnocScreen id={id} />
    </div>
  )
}
