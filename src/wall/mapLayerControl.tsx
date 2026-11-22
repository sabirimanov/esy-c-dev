import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { invalidateMapApiCache } from "../data/mapApiCache"
import { CAROUSEL_SLIDES, DEFAULT_SLIDE_ID, SLIDE_MS, slideById, type MapSlideId } from "./mapSlides"
import { useWall } from "./useWall"
import { useWallScope } from "./wallScope"

/** Prefetch next carousel slide this many ms before the switch. */
const PREFETCH_AHEAD_MS = 2_500

type LoadApi = {
  /** True when at least one map tile screen is mounted. */
  mapMounted: boolean
  /** Slides that should fetch / poll right now. */
  wanted: ReadonlySet<MapSlideId>
  /** Active slide id (pinned or carousel index). */
  activeId: MapSlideId
  /** Shared clock for carousel progress (one ticker for the wall). */
  now: number
  registerMapScreen: () => void
  unregisterMapScreen: () => void
}

const LoadCtx = createContext<LoadApi | null>(null)

function carouselIndex(epoch: number, now: number) {
  if (!epoch || epoch <= 0) return 0
  const n = CAROUSEL_SLIDES.length || 1
  return Math.floor(Math.max(0, now - epoch) / SLIDE_MS) % n
}

function resolveActiveId(
  mapMode: string,
  mapPreviewSlide: string | null,
  epoch: number,
  now: number,
): MapSlideId {
  if (mapMode === "default" || mapPreviewSlide) {
    const raw = slideById(mapPreviewSlide || DEFAULT_SLIDE_ID)
    if (mapMode === "default" && raw.enabled === false) return DEFAULT_SLIDE_ID
    return raw.id
  }
  if (mapMode === "carousel") {
    return CAROUSEL_SLIDES[carouselIndex(epoch, now)]?.id ?? DEFAULT_SLIDE_ID
  }
  return DEFAULT_SLIDE_ID
}

function resolveWanted(
  mapMounted: boolean,
  mapMode: string,
  mapPreviewSlide: string | null,
  epoch: number,
  now: number,
): Set<MapSlideId> {
  const out = new Set<MapSlideId>()
  if (!mapMounted) return out

  const active = resolveActiveId(mapMode, mapPreviewSlide, epoch, now)
  out.add(active)

  // Carousel: prefetch the upcoming slide near the end of the current slot.
  if (mapMode === "carousel" && !mapPreviewSlide && CAROUSEL_SLIDES.length > 1) {
    const into = epoch > 0 ? Math.max(0, now - epoch) % SLIDE_MS : 0
    if (into >= SLIDE_MS - PREFETCH_AHEAD_MS) {
      const idx = carouselIndex(epoch, now)
      const next = CAROUSEL_SLIDES[(idx + 1) % CAROUSEL_SLIDES.length]
      if (next) out.add(next.id)
    }
  }
  return out
}

/**
 * Gates map-layer fetches: only while a map screen is mounted, and only for the
 * active slide (+ short carousel prefetch). Busts map API cache when wall seed changes.
 */
export function MapLayerControlProvider({ children }: { children: ReactNode }) {
  const { state } = useWall()
  const scope = useWallScope()
  const [mapCount, setMapCount] = useState(0)
  const [now, setNow] = useState(() => Date.now())
  const lastSeed = useRef(scope.seed)

  useEffect(() => {
    if (scope.seed === lastSeed.current) return
    lastSeed.current = scope.seed
    invalidateMapApiCache()
  }, [scope.seed])

  useEffect(() => {
    if (state.mapMode !== "carousel" || mapCount <= 0) return
    // 100ms for smooth progress bar; single shared ticker for all map tiles.
    const id = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(id)
  }, [state.mapMode, mapCount])

  const registerMapScreen = useCallback(() => {
    setMapCount((n) => n + 1)
  }, [])
  const unregisterMapScreen = useCallback(() => {
    setMapCount((n) => Math.max(0, n - 1))
  }, [])

  const mapMounted = mapCount > 0
  const activeId = resolveActiveId(state.mapMode, state.mapPreviewSlide, state.carouselEpoch, now)
  const wanted = useMemo(
    () => resolveWanted(mapMounted, state.mapMode, state.mapPreviewSlide, state.carouselEpoch, now),
    [mapMounted, state.mapMode, state.mapPreviewSlide, state.carouselEpoch, now],
  )

  const value = useMemo<LoadApi>(
    () => ({
      mapMounted,
      wanted,
      activeId,
      now,
      registerMapScreen,
      unregisterMapScreen,
    }),
    [mapMounted, wanted, activeId, now, registerMapScreen, unregisterMapScreen],
  )

  return <LoadCtx.Provider value={value}>{children}</LoadCtx.Provider>
}

function useLoadApi(): LoadApi {
  const ctx = useContext(LoadCtx)
  if (!ctx) throw new Error("MapLayerControlProvider is missing")
  return ctx
}

/** Register this screen as needing map layer data (call from map tile screens). */
export function useMapScreenPresence() {
  const { registerMapScreen, unregisterMapScreen } = useLoadApi()
  useEffect(() => {
    registerMapScreen()
    return () => unregisterMapScreen()
  }, [registerMapScreen, unregisterMapScreen])
}

/** Whether this slide’s provider should fetch / poll. */
export function useMapLayerEnabled(slideId: MapSlideId): boolean {
  const { wanted } = useLoadApi()
  return wanted.has(slideId)
}

export function useActiveMapSlideId(): MapSlideId {
  return useLoadApi().activeId
}

/** Shared wall clock — only advances while carousel + map screens are active. */
export function useMapCarouselNow(): number {
  return useLoadApi().now
}
