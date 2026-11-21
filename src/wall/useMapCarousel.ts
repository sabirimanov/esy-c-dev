import { useEffect, useMemo, useState } from "react"
import { useConsumptionExceedance } from "../data/consumptionExceedance"
import { useEmergencyCalls } from "../data/emergencyCalls"
import type { MapOverlaySpec, OverlayLegendRow } from "./mapOverlay"
import { mockOverlayForSlide } from "./mapSlideData"
import { MAP_SLIDES, slideById, type MapSlide, type MapSlideId } from "./mapSlides"
import { useWall } from "./useWall"

export const SLIDE_MS = 10_000
const FADE_MS = 700

export type CarouselView = {
  slide: MapSlide
  index: number
  progress: number
  opacity: number
  overlay: MapOverlaySpec
  legend: OverlayLegendRow[]
  subtitle: string
}

function indexFromEpoch(epoch: number, now: number) {
  if (!epoch || epoch <= 0) return 0
  const elapsed = Math.max(0, now - epoch)
  return Math.floor(elapsed / SLIDE_MS) % MAP_SLIDES.length
}

function progressFromEpoch(epoch: number, now: number) {
  if (!epoch || epoch <= 0) return 0
  return (Math.max(0, now - epoch) % SLIDE_MS) / SLIDE_MS
}

function fadeOpacity(epoch: number, now: number) {
  if (!epoch || epoch <= 0) return 1
  const into = Math.max(0, now - epoch) % SLIDE_MS
  if (into < FADE_MS) return into / FADE_MS
  if (into > SLIDE_MS - FADE_MS) return Math.max(0, (SLIDE_MS - into) / FADE_MS)
  return 1
}

export function useMapCarousel(): CarouselView {
  const { state } = useWall()
  const emergency = useEmergencyCalls()
  const exceedance = useConsumptionExceedance()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (state.mapMode !== "carousel") return
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [state.mapMode])

  return useMemo(() => {
    const epoch = state.carouselEpoch || 0
    // Single mode always pins one slide (default Emergency Calls).
    const previewId =
      state.mapMode === "default" ? state.mapPreviewSlide || "emergency-calls" : state.mapPreviewSlide
    const preview = previewId ? slideById(previewId) : null
    const carousel = !preview && state.mapMode === "carousel"
    const index = preview
      ? Math.max(0, MAP_SLIDES.findIndex((s) => s.id === preview.id))
      : carousel
        ? indexFromEpoch(epoch, now)
        : 0
    const slide = preview ?? MAP_SLIDES[index] ?? MAP_SLIDES[0]
    const progress = carousel ? progressFromEpoch(epoch, now) : preview ? 1 : 0
    const opacity = carousel ? fadeOpacity(epoch, now) : 1

    if (slide.id === "emergency-calls") {
      const overlay: MapOverlaySpec = emergency.overlay
        ? { ...emergency.overlay, title: slide.title, opacity, legend: emergency.legend.map((r) => ({ id: r.statusId, label: r.statusTitle, color: r.color, count: r.count })) }
        : { kind: "points", title: slide.title, opacity, points: [], legend: [] }
      return {
        slide,
        index,
        progress,
        opacity,
        overlay,
        legend: overlay.legend ?? [],
        subtitle: emergency.total
          ? `${emergency.total} calls · last 24h${emergency.unlocated ? ` · ${emergency.unlocated} unlocated` : ""}`
          : "Loading…",
      }
    }

    if (slide.id === "consumption-exceedance") {
      const overlay: MapOverlaySpec = exceedance.overlay
        ? { ...exceedance.overlay, title: slide.title, opacity, legend: exceedance.legend }
        : { kind: "points", title: slide.title, opacity, points: [], legend: exceedance.legend }
      return {
        slide,
        index,
        progress,
        opacity,
        overlay,
        legend: overlay.legend ?? [],
        subtitle: exceedance.error
          ? `Error · ${exceedance.error}`
          : exceedance.updatedAt
            ? `${exceedance.withGps} meters on map · ${exceedance.total} flagged`
            : "Loading…",
      }
    }

    const overlay = mockOverlayForSlide(slide.id as MapSlideId, opacity)
    return {
      slide,
      index,
      progress,
      opacity,
      overlay,
      legend: overlay?.legend ?? [],
      subtitle: slide.source ? slide.source : "Mock data · source TBD",
    }
  }, [
    state.mapMode,
    state.mapPreviewSlide,
    state.carouselEpoch,
    now,
    emergency.overlay,
    emergency.legend,
    emergency.total,
    emergency.unlocated,
    exceedance.overlay,
    exceedance.legend,
    exceedance.total,
    exceedance.withGps,
    exceedance.updatedAt,
    exceedance.error,
  ])
}

/** Active overlay: Single (pinned slide) or Carousel. */
export function useActiveMapOverlay(): MapOverlaySpec {
  const { state } = useWall()
  const carousel = useMapCarousel()

  if (state.mapMode === "default" || state.mapMode === "carousel" || state.mapPreviewSlide) {
    return carousel.overlay
  }
  return null
}
