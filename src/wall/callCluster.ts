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

/** Stable pie arcs: canonical statusColor(statusId), same as single dots. */
export function colorSegments(members: OverlayPoint[]): ColorSegment[] {
  const byColor = new Map<string, { weight: number; order: number }>()
  for (const m of members) {
    const color = statusColor(m.statusId).toLowerCase()
    const order = bucketOrderIndex(statusBucket(m.statusId))
    const hit = byColor.get(color)
    if (hit) hit.weight += 1
    else byColor.set(color, { weight: 1, order })
  }
  return [...byColor.entries()]
    .sort((a, b) => a[1].order - b[1].order || a[0].localeCompare(b[0]))
    .map(([color, { weight }]) => ({ color, weight }))
}

/**
 * Greedy screen-space clustering. `toScreen` maps mesh (x,z) → wall CSS pixels.
 * Radius is CSS pixels (32–40). Each point appears in at most one cluster.
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
    // Absorb any earlier leftover that sits in radius of the growing set (grid gap).
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

    const members = group.map((g) => g.point)
    const x = members.reduce((s, m) => s + m.x, 0) / members.length
    const z = members.reduce((s, m) => s + m.z, 0) / members.length
    let coincident = true
    for (const m of members) {
      if (Math.abs(m.x - members[0].x) > EPS || Math.abs(m.z - members[0].z) > EPS) {
        coincident = false
        break
      }
    }
    clusters.push({
      id: members.length === 1 ? members[0].id : `c:${members.map((m) => m.id).sort().join("+")}`,
      x,
      z,
      members,
      total: members.length,
      segments: colorSegments(members),
      coincident,
    })
  }

  return clusters
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
