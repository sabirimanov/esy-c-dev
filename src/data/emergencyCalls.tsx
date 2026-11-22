import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { BILLING_REGIONS_URL } from "../wall/billingRegions"
import { parseCoordinate, projectLatLng, type LatLng } from "../wall/geo"
import { geocodePlaces } from "../wall/geocode"
import { statusColor, statusLabelEn, bucketOrderIndex, statusBucket } from "../wall/emergencyStatus"
import { useMapLayerEnabled } from "../wall/mapLayerControl"
import type { LocationPrecision, MapOverlaySpec, OverlayPoint } from "../wall/mapOverlay"
import {
  districtById,
  ensureDistrict,
  foldAz,
  ingestBillingRegions,
  ingestHierarchyPlaces,
  localityCenter,
  localityFromAddress,
  placeCenterForRqii,
  placeLabel,
  regionSeatById,
  regionSeatByRqii,
  registerGeocodedCenter,
} from "../wall/placesGazetteer"
import { useWallScope } from "../wall/wallScope"
import { mapCachedGetJson } from "./mapApiCache"
import { useLayerPoll } from "./useLayerPoll"
import { useUfgHierarchy } from "./ufg"

const URL = "/newapi/hub/mfs/api/v1/integration/accident-call/recent"
/** Calls refresh more often than other map layers. */
const POLL_MS = 10 * 60 * 1000

type ApiNamed = { id?: number | string | null; title?: string | null }
type ApiCall = {
  no?: string
  /** RQİİ — use region.title (same role as billing.regions.rqii). */
  region?: ApiNamed | null
  district?: ApiNamed | null
  address?: string | null
  coordinate?: unknown
  status?: ApiNamed | null
  sub_category?: ApiNamed | null
}

export type ResolvedCall = {
  no: string
  rqii: string | null
  statusId: string
  statusTitle: string
  color: string
  placeLabel: string
  gps: LatLng | null
  displayCoordinates: LatLng | null
  locationPrecision: LocationPrecision
  /** Names worth geocoding when still unlocated. */
  geocodeHints: string[]
}

function resolveCall(raw: ApiCall): ResolvedCall | null {
  const no = typeof raw.no === "string" && raw.no.trim() ? raw.no.trim() : null
  if (!no) return null
  const statusId = raw.status?.id == null ? "" : String(raw.status.id)
  const statusTitle = statusLabelEn(statusId, raw.status?.title)
  const color = statusColor(statusId)

  // Accident-call RQİİ lives on region.title (not a separate `rqii` key).
  const rqii = typeof raw.region?.title === "string" && raw.region.title.trim() ? raw.region.title.trim() : null
  const regionId = raw.region?.id == null ? null : Number(raw.region.id)

  const districtId = raw.district?.id == null ? null : Number(raw.district.id)
  const districtTitle = typeof raw.district?.title === "string" ? raw.district.title : ""
  const district =
    districtId != null && Number.isFinite(districtId)
      ? ensureDistrict(districtId, districtTitle || `District ${districtId}`)
      : districtById(districtId)

  const locality = localityFromAddress(raw.address, district)
  const label = placeLabel(district, locality)

  const gps = parseCoordinate(raw.coordinate)
  let displayCoordinates: LatLng | null = null
  let locationPrecision: LocationPrecision = "unlocated"
  const geocodeHints: string[] = []

  if (gps) {
    displayCoordinates = gps
    locationPrecision = "api_gps"
  } else if (district && locality) {
    const center = localityCenter(district.id, locality)
    if (center) {
      displayCoordinates = center
      locationPrecision = "locality_center"
    } else {
      geocodeHints.push(locality)
    }
  }

  if (!displayCoordinates) {
    const fromBilling = placeCenterForRqii(rqii, districtTitle || null)
    if (fromBilling) {
      displayCoordinates = fromBilling
      locationPrecision = "district_center"
    } else if (district?.center) {
      displayCoordinates = district.center
      locationPrecision = "district_center"
    } else if (districtTitle) {
      geocodeHints.push(districtTitle)
    }
  }

  if (!displayCoordinates) {
    const seat = regionSeatByRqii(rqii) ?? regionSeatById(regionId)
    if (seat) {
      displayCoordinates = seat.center
      locationPrecision = "district_center"
    } else if (rqii) {
      geocodeHints.push(rqii)
    }
  }

  return {
    no,
    rqii,
    statusId,
    statusTitle,
    color,
    placeLabel: label,
    gps,
    displayCoordinates,
    locationPrecision,
    geocodeHints,
  }
}

async function fillMissingWithGeocode(calls: ResolvedCall[]): Promise<ResolvedCall[]> {
  const hints: string[] = []
  for (const call of calls) {
    if (call.displayCoordinates) continue
    hints.push(...call.geocodeHints)
    if (call.placeLabel && call.placeLabel !== "Location unknown") hints.push(call.placeLabel)
  }
  if (!hints.length) return calls
  const found = await geocodePlaces(hints)
  if (!found.size) return calls
  return calls.map((call) => {
    if (call.displayCoordinates) return call
    for (const hint of [...call.geocodeHints, call.placeLabel]) {
      const coords = found.get(foldAz(hint))
      if (!coords) continue
      registerGeocodedCenter(hint, coords, call.rqii)
      return {
        ...call,
        displayCoordinates: coords,
        locationPrecision: "locality_center" as const,
      }
    }
    return call
  })
}

/** One mesh point per call — clustering happens in screen space on the map. */
export function callsToOverlayPoints(calls: ResolvedCall[]): OverlayPoint[] {
  const points: OverlayPoint[] = []
  for (const call of calls) {
    if (!call.displayCoordinates || call.locationPrecision === "unlocated") continue
    const mesh = projectLatLng(call.displayCoordinates.lat, call.displayCoordinates.lon)
    if (!mesh) continue
    points.push({
      id: call.no,
      x: mesh.x,
      z: mesh.z,
      color: statusColor(call.statusId),
      count: 1,
      approx: call.locationPrecision !== "api_gps",
      label: call.placeLabel,
      statusId: call.statusId,
      statusTitle: call.statusTitle,
      nos: [call.no],
    })
  }
  return points
}

export type EmergencyLegendRow = {
  statusId: string
  statusTitle: string
  color: string
  count: number
}

export type EmergencyCallsState = {
  calls: ResolvedCall[]
  overlay: MapOverlaySpec
  legend: EmergencyLegendRow[]
  unlocated: number
  total: number
  updatedAt: number | null
  error: string | null
  /** Selected call no — thin ring on map + detail card. */
  selectedNo: string | null
  /** Cluster opened as a list (same coords / cannot split further). */
  listNos: string[] | null
  /** Cluster temporarily spiderfied on the map (locked wall camera). */
  expandedClusterId: string | null
  selectCall: (no: string | null) => void
  openCallList: (nos: string[]) => void
  expandCluster: (clusterId: string | null) => void
  clearMapSelection: () => void
}

const noop = () => {}

const empty: EmergencyCallsState = {
  calls: [],
  overlay: null,
  legend: [],
  unlocated: 0,
  total: 0,
  updatedAt: null,
  error: null,
  selectedNo: null,
  listNos: null,
  expandedClusterId: null,
  selectCall: noop,
  openCallList: noop,
  expandCluster: noop,
  clearMapSelection: noop,
}

function buildData(calls: ResolvedCall[]) {
  const points = callsToOverlayPoints(calls)
  const legendMap = new Map<string, EmergencyLegendRow>()
  for (const call of calls) {
    const row = legendMap.get(call.statusId)
    if (row) row.count += 1
    else {
      legendMap.set(call.statusId, {
        statusId: call.statusId,
        statusTitle: call.statusTitle,
        color: call.color,
        count: 1,
      })
    }
  }
  const legend = [...legendMap.values()].sort(
    (a, b) => bucketOrderIndex(statusBucket(a.statusId)) - bucketOrderIndex(statusBucket(b.statusId)),
  )
  return {
    calls,
    overlay: (points.length ? { kind: "points" as const, points } : null) as MapOverlaySpec,
    legend,
    unlocated: calls.filter((c) => c.locationPrecision === "unlocated").length,
    total: calls.length,
    updatedAt: Date.now(),
    error: null as string | null,
  }
}

const EmergencyContext = createContext<EmergencyCallsState>(empty)

export function EmergencyCallsProvider({ children }: { children: ReactNode }) {
  const hierarchy = useUfgHierarchy()
  const enabled = useMapLayerEnabled("emergency-calls")
  const scope = useWallScope()
  const [data, setData] = useState(() => buildData([]))
  const [selectedNo, setSelectedNo] = useState<string | null>(null)
  const [listNos, setListNos] = useState<string[] | null>(null)
  const [expandedClusterId, setExpandedClusterId] = useState<string | null>(null)

  const selectCall = useCallback((no: string | null) => {
    setSelectedNo(no)
    if (no) setListNos(null)
  }, [])
  const openCallList = useCallback((nos: string[]) => {
    setListNos(nos)
    setSelectedNo(null)
    setExpandedClusterId(null)
  }, [])
  const expandCluster = useCallback((clusterId: string | null) => {
    setExpandedClusterId(clusterId)
    setListNos(null)
  }, [])
  const clearMapSelection = useCallback(() => {
    setSelectedNo(null)
    setListNos(null)
    setExpandedClusterId(null)
  }, [])

  useEffect(() => {
    if (!enabled) return
    ingestHierarchyPlaces({
      regions: hierarchy.regions.map((r) => ({ region_id: r.region_id, name_en: r.name_en })),
      zones: hierarchy.zones.map((z) => ({ zone_id: z.zone_id, region_id: z.region_id, name_en: z.name_en })),
    })
  }, [enabled, hierarchy.regions, hierarchy.zones])

  useEffect(() => {
    if (!enabled) return
    let live = true
    mapCachedGetJson<{ rows?: { rqii?: string; region?: string }[] }>(BILLING_REGIONS_URL, { ttlMs: 60 * 60 * 1000 })
      .then((body) => {
        if (!live || !body?.rows) return
        ingestBillingRegions(body.rows)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [enabled])

  useLayerPoll(enabled, scope, POLL_MS, async ({ force }) => {
    try {
      const body = await mapCachedGetJson<{ data?: ApiCall[] }>(URL, { ttlMs: POLL_MS, force })
      const rows = Array.isArray(body.data) ? body.data : []
      let calls = rows.map(resolveCall).filter((c): c is ResolvedCall => Boolean(c))
      calls = await fillMissingWithGeocode(calls)
      // Keep camera/selection; only refresh call data + overlay points.
      setData(buildData(calls))
      setSelectedNo((no) => (no && calls.some((c) => c.no === no) ? no : null))
      setListNos((nos) => {
        if (!nos) return null
        const next = nos.filter((n) => calls.some((c) => c.no === n))
        return next.length ? next : null
      })
    } catch (err) {
      setData((current) => ({
        ...current,
        error: err instanceof Error ? err.message : "fetch failed",
      }))
    }
  })

  const value = useMemo<EmergencyCallsState>(
    () => ({
      ...data,
      selectedNo,
      listNos,
      expandedClusterId,
      selectCall,
      openCallList,
      expandCluster,
      clearMapSelection,
    }),
    [data, selectedNo, listNos, expandedClusterId, selectCall, openCallList, expandCluster, clearMapSelection],
  )

  return <EmergencyContext.Provider value={value}>{children}</EmergencyContext.Provider>
}

export function useEmergencyCalls(): EmergencyCallsState {
  return useContext(EmergencyContext)
}

export function useEmergencyOverlay(enabled: boolean): MapOverlaySpec {
  const state = useEmergencyCalls()
  return useMemo(() => (enabled ? state.overlay : null), [enabled, state.overlay])
}
