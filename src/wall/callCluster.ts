import { bucketOrderIndex, statusBucket, statusColor } from "./emergencyStatus"
import type { OverlayPoint } from "./mapOverlay"

export type ColorSegment = { color: string; weight: number }

export type CallCluster = {
  id: string
  x: number
  z: number
  members: OverlayPoint[]
  total: number
  segments: ColorSegment[]
  /** True when every member shares the same mesh x/z (city pin / identical GPS). */
  coincident: boolean
}

const EPS = 1e-5

/** Pie arcs from point.color (matches single dots / legend bands). */
export function colorSegments(members: OverlayPoint[]): ColorSegment[] {
  const byColor = new Map<string, { weight: number; order: number }>()
  for (const m of members) {
    const color = (m.color || statusColor(m.statusId)).toLowerCase()
    const order = bucketOrderIndex(statusBucket(m.statusId))
    const hit = byColor.get(color)
    if (hit) hit.weight += 1
    else byColor.set(color, { weight: 1, order })
  }
  return [...byColor.entries()]
    .sort((a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0]))
    .map(([color, { weight }]) => ({ color, weight }))
}

function buildCluster(members: OverlayPoint[]): CallCluster {
  const x = members.reduce((s, m) => s + m.x, 0) / members.length
  const z = members.reduce((s, m) => s + m.z, 0) / members.length
  let coincident = true
  for (const m of members) {
    if (Math.abs(m.x - members[0].x) > EPS || Math.abs(m.z - members[0].z) > EPS) {
      coincident = false
      break
    }
  }
  return {
    id: members.length === 1 ? members[0].id : `c:${members.map((m) => m.id).sort().join("+")}`,
    x,
    z,
    members,
    total: members.length,
    segments: colorSegments(members),
    coincident,
  }
}

/**
 * Greedy screen-space clustering. `toScreen` maps mesh (x,z) → wall CSS pixels.
 * Radius is CSS pixels. Each point appears in at most one cluster.
 */
export function clusterCalls(
  points: OverlayPoint[],
  toScreen: (x: number, z: number) => { sx: number; sy: number } | null,
  radiusPx: number,
): CallCluster[] {
  type Node = { point: OverlayPoint; sx: number; sy: number; used: boolean }
  const nodes: Node[] = []
  for (const point of points) {
    const screen = toScreen(point.x, point.z)
    if (!screen) continue
    nodes.push({ point, sx: screen.sx, sy: screen.sy, used: false })
  }
  nodes.sort((a, b) => a.sx - b.sx || a.sy - b.sy)

  const clusters: CallCluster[] = []
  const r2 = radiusPx * radiusPx

  for (let i = 0; i < nodes.length; i += 1) {
    if (nodes[i].used) continue
    const seed = nodes[i]
    const group = [seed]
    seed.used = true
    for (let j = i + 1; j < nodes.length; j += 1) {
      const other = nodes[j]
      if (other.used) continue
      if (other.sx - seed.sx > radiusPx) break
      const dx = other.sx - seed.sx
      const dy = other.sy - seed.sy
      if (dx * dx + dy * dy <= r2) {
        other.used = true
        group.push(other)
      }
    }
    // Absorb any leftover that sits in radius of the growing set (grid gap).
    for (let j = 0; j < nodes.length; j += 1) {
      const other = nodes[j]
      if (other.used) continue
      const near = group.some((g) => {
        const dx = other.sx - g.sx
        const dy = other.sy - g.sy
        return dx * dx + dy * dy <= r2
      })
      if (near) {
        other.used = true
        group.push(other)
      }
    }

    clusters.push(buildCluster(group.map((g) => g.point)))
  }

  return clusters
}

/**
 * Merge clusters whose screen markers would overlap (centers closer than sum of radii).
 * Runs until stable so donuts/dots never stack on point maps.
 */
export function mergeOverlappingClusters(
  clusters: CallCluster[],
  toScreen: (x: number, z: number) => { sx: number; sy: number } | null,
  markerRadiusPx: (total: number) => number,
): CallCluster[] {
  let current = clusters.slice()
  if (current.length <= 1) return current

  let guard = 0
  while (guard < 64) {
    guard += 1
    type Item = { cluster: CallCluster; sx: number; sy: number; r: number; index: number }
    const items: Item[] = []
    for (let i = 0; i < current.length; i += 1) {
      const cluster = current[i]
      const screen = toScreen(cluster.x, cluster.z)
      if (!screen) continue
      items.push({
        cluster,
        sx: screen.sx,
        sy: screen.sy,
        r: markerRadiusPx(cluster.total),
        index: i,
      })
    }
    items.sort((a, b) => a.sx - b.sx || a.sy - b.sy)

    let mergeA = -1
    let mergeB = -1
    outer: for (let i = 0; i < items.length; i += 1) {
      const a = items[i]
      for (let j = i + 1; j < items.length; j += 1) {
        const b = items[j]
        if (b.sx - a.sx > a.r + b.r) break
        const dx = b.sx - a.sx
        const dy = b.sy - a.sy
        const need = a.r + b.r
        if (dx * dx + dy * dy < need * need) {
          mergeA = a.index
          mergeB = b.index
          break outer
        }
      }
    }

    if (mergeA < 0 || mergeB < 0) break
    const lo = Math.min(mergeA, mergeB)
    const hi = Math.max(mergeA, mergeB)
    const merged = buildCluster([...current[lo].members, ...current[hi].members])
    current = current.filter((_, i) => i !== lo && i !== hi)
    current.push(merged)
  }

  return current
}

/** Cluster then merge until markers would not overlap on screen. */
export function clusterCallsNoOverlap(
  points: OverlayPoint[],
  toScreen: (x: number, z: number) => { sx: number; sy: number } | null,
  seedRadiusPx: number,
  markerRadiusPx: (total: number) => number,
): CallCluster[] {
  const seeded = clusterCalls(points, toScreen, seedRadiusPx)
  return mergeOverlappingClusters(seeded, toScreen, markerRadiusPx)
}

/** Fan members around centroid for temporary expand when zoom is locked. */
export function spiderfyPositions(
  members: OverlayPoint[],
  cx: number,
  cz: number,
  step: number,
): { id: string; x: number; z: number }[] {
  const n = members.length
  if (n <= 1) return members.map((m) => ({ id: m.id, x: m.x, z: m.z }))
  const radius = step * (0.55 + Math.min(1.2, n * 0.12))
  return members.map((m, index) => {
    const angle = (index / n) * Math.PI * 2 - Math.PI / 2
    return { id: m.id, x: cx + Math.cos(angle) * radius, z: cz + Math.sin(angle) * radius }
  })
}
