export type LocationPrecision = "api_gps" | "locality_center" | "district_center" | "unlocated"

export type OverlayPoint = {
  id: string
  x: number
  z: number
  color: string
  count: number
  approx: boolean
  label: string
  statusId: string
  statusTitle: string
  nos: string[]
}

export type OverlayHeatSpot = {
  id: string
  x: number
  z: number
  weight: number
  color: string
}

export type OverlayRegionTint = {
  /** GLB region id, e.g. baku, absheron-khizi */
  regionId: string
  color: string
  intensity?: number
}

export type OverlayLegendRow = {
  id: string
  label: string
  color: string
  count?: number
}

export type MapOverlaySpec = {
  kind: "points" | "heatmap" | "region"
  title?: string
  legend?: OverlayLegendRow[]
  /** 0..1 fade for slide transitions */
  opacity?: number
  points?: OverlayPoint[]
  heat?: OverlayHeatSpot[]
  regions?: OverlayRegionTint[]
} | null
