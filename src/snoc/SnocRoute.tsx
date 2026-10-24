import { useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { SnocProvider } from "./dashboard"
import { SnocScreen } from "./screens"
import "./snoc.css"

function fitPage() {
  for (const node of [document.documentElement, document.body, document.getElementById("root")]) {
    if (!node) continue
    node.style.width = "1920px"
    node.style.height = "1080px"
  }
}

export function SnocRoute() {
  const { screenId } = useParams()
  const navigate = useNavigate()
  const id = Number(screenId)
  const ok = Number.isInteger(id) && id >= 1 && id <= 12

  useEffect(() => {
    fitPage()
    document.title = ok ? `snoc ${id}` : "snoc"
  }, [id, ok])

  useEffect(() => {
    if (!ok) return
    function onKey(event: KeyboardEvent) {
      if (!event.metaKey || event.altKey || event.shiftKey || event.ctrlKey) return
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return
      event.preventDefault()
      const next = event.key === "ArrowRight" ? Math.min(12, id + 1) : Math.max(1, id - 1)
      if (next !== id) navigate(`/snoc/${next}`)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [id, navigate, ok])

  if (!ok) return <div className="screen" />
  return (
    <SnocProvider>
      <div className="screen" data-snoc={id}>
        <SnocScreen id={id} />
      </div>
    </SnocProvider>
  )
}
