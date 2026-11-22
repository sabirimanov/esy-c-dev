import { useMemo } from "react"
import { useConsumptionExceedance } from "../data/consumptionExceedance"
import { useEmergencyCalls } from "../data/emergencyCalls"
import { useMetersOffline } from "../data/metersOffline"
import { useRepeatedReadings } from "../data/repeatedReadings"
import { useTamperingEvents } from "../data/tamperingEvents"
import { useMeterAnomalies } from "../data/meterAnomalies"
import { useNetworkAlarms } from "../data/networkAlarms"
import { useNetworkPressure } from "../data/networkPressure"
import { useUfgByRegion } from "../data/ufgByRegion"
import type { MapOverlaySpec, OverlayLegendRow } from "./mapOverlay"
import { useMapCarouselNow } from "./mapLayerControl"
import { mockOverlayForSlide } from "./mapSlideData"
import { CAROUSEL_SLIDES, MAP_SLIDES, SLIDE_MS, slideById, type MapSlide, type MapSlideId } from "./mapSlides"
import { useWall } from "./useWall"

export { SLIDE_MS }
const FADE_MS = 700

export type CarouselView = {
  slide: MapSlide
  index: number
  progress: number
  opacity: number
  overlay: MapOverlaySpec
  legend: OverlayLegendRow[]
}

function indexFromEpoch(epoch: number, now: number) {
  if (!epoch || epoch <= 0) return 0
  const n = CAROUSEL_SLIDES.length || 1
  const elapsed = Math.max(0, now - epoch)
  return Math.floor(elapsed / SLIDE_MS) % n
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
  const now = useMapCarouselNow()
  const emergency = useEmergencyCalls()
  const exceedance = useConsumptionExceedance()
  const offline = useMetersOffline()
  const repeated = useRepeatedReadings()
  const tampering = useTamperingEvents()
  const anomalies = useMeterAnomalies()
  const networkAlarms = useNetworkAlarms()
  const networkPressure = useNetworkPressure()
  const ufgRegions = useUfgByRegion()

  return useMemo(() => {
    const epoch = state.carouselEpoch || 0
    // Single mode always pins one slide (default Emergency Calls).
    const previewId =
      state.mapMode === "default" ? state.mapPreviewSlide || "emergency-calls" : state.mapPreviewSlide
    const previewRaw = previewId ? slideById(previewId) : null
    // Disabled slides stay selectable only if already pinned; carousel never uses them.
    const preview =
      previewRaw && state.mapMode === "default" && previewRaw.enabled === false
        ? slideById("emergency-calls")
        : previewRaw
    const carousel = !preview && state.mapMode === "carousel"
    const index = preview
      ? Math.max(0, CAROUSEL_SLIDES.findIndex((s) => s.id === preview.id))
      : carousel
        ? indexFromEpoch(epoch, now)
        : 0
    const slide = preview ?? CAROUSEL_SLIDES[index] ?? MAP_SLIDES[0]
    const progress = carousel ? progressFromEpoch(epoch, now) : preview ? 1 : 0
    const opacity = carousel ? fadeOpacity(epoch, now) : 1

    if (slide.id === "emergency-calls") {
      const overlay: MapOverlaySpec = emergency.overlay
        ? { ...emergency.overlay, title: slide.title, opacity, legend: emergency.legend.map((r) => ({ id: r.statusId, label: r.statusTitle, color: r.color, count: r.count })) }
        : { kind: "points", title: slide.title, opacity, points: [], legend: [] }
      return { slide, index, progress, opacity, overlay, legend: overlay.legend ?? [] }
    }

    if (slide.id === "consumption-exceedance") {
      const overlay: MapOverlaySpec = exceedance.overlay
        ? { ...exceedance.overlay, title: slide.title, opacity, legend: exceedance.legend }
        : { kind: "points", title: slide.title, opacity, points: [], legend: exceedance.legend }
      return { slide, index, progress, opacity, overlay, legend: overlay.legend ?? [] }
    }

    if (slide.id === "meters-offline") {
      const overlay: MapOverlaySpec = offline.overlay
        ? { ...offline.overlay, title: slide.title, opacity, legend: offline.legend }
        : { kind: "points", title: slide.title, opacity, points: [], legend: offline.legend }
      return { slide, index, progress, opacity, overlay, legend: overlay.legend ?? [] }
    }

    if (slide.id === "repeated-readings") {
      const overlay: MapOverlaySpec = repeated.overlay
        ? { ...repeated.overlay, title: slide.title, opacity, legend: repeated.legend }
        : { kind: "points", title: slide.title, opacity, points: [], legend: repeated.legend }
      return { slide, index, progress, opacity, overlay, legend: overlay.legend ?? [] }
    }

    if (slide.id === "meter-alarms") {
      const overlay: MapOverlaySpec = tampering.overlay
        ? { ...tampering.overlay, title: slide.title, opacity, legend: tampering.legend }
        : { kind: "points", title: slide.title, opacity, points: [], legend: tampering.legend }
      return { slide, index, progress, opacity, overlay, legend: overlay.legend ?? [] }
    }

    if (slide.id === "meter-anomalies") {
      const overlay: MapOverlaySpec = anomalies.overlay
        ? { ...anomalies.overlay, title: slide.title, opacity, legend: anomalies.legend }
        : { kind: "points", title: slide.title, opacity, points: [], legend: anomalies.legend }
      return { slide, index, progress, opacity, overlay, legend: overlay.legend ?? [] }
    }

    if (slide.id === "network-alarms") {
      const overlay: MapOverlaySpec = networkAlarms.overlay
        ? { ...networkAlarms.overlay, title: slide.title, opacity, legend: networkAlarms.legend }
        : { kind: "points", title: slide.title, opacity, points: [], legend: networkAlarms.legend }
      return { slide, index, progress, opacity, overlay, legend: overlay.legend ?? [] }
    }

    if (slide.id === "network-pressure") {
      const overlay: MapOverlaySpec = networkPressure.overlay
        ? { ...networkPressure.overlay, title: slide.title, opacity, legend: networkPressure.legend }
        : { kind: "points", title: slide.title, opacity, points: [], legend: networkPressure.legend }
      return { slide, index, progress, opacity, overlay, legend: overlay.legend ?? [] }
    }

    if (slide.id === "ufg-regions") {
      const overlay: MapOverlaySpec = ufgRegions.overlay
        ? { ...ufgRegions.overlay, title: slide.title, opacity, legend: ufgRegions.legend }
        : { kind: "region", title: slide.title, opacity, regions: [], polygons: [], legend: ufgRegions.legend }
      return { slide, index, progress, opacity, overlay, legend: overlay.legend ?? [] }
    }

    const overlay = mockOverlayForSlide(slide.id as MapSlideId, opacity)
    return { slide, index, progress, opacity, overlay, legend: overlay?.legend ?? [] }
  }, [
    state.mapMode,
    state.mapPreviewSlide,
    state.carouselEpoch,
    now,
    emergency.overlay,
    emergency.legend,
    exceedance.overlay,
    exceedance.legend,
    offline.overlay,
    offline.legend,
    repeated.overlay,
    repeated.legend,
    tampering.overlay,
    tampering.legend,
    anomalies.overlay,
    anomalies.legend,
    networkAlarms.overlay,
    networkAlarms.legend,
    networkPressure.overlay,
    networkPressure.legend,
    ufgRegions.overlay,
    ufgRegions.legend,
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
