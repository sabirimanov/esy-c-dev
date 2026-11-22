import * as THREE from "three"
import { clusterCallsNoOverlap, spiderfyPositions, type CallCluster, type ColorSegment } from "./callCluster"
import { statusColor } from "./emergencyStatus"
import { mapConfig } from "./mapConfig"
import { roundedPointer } from "./marker"
import type { MapOverlaySpec, OverlayPoint } from "./mapOverlay"

type Tile = { x: number; y: number }

export type CallMapUi = {
  selectedNo: string | null
  expandedClusterId: string | null
}

export type CallMapHandlers = {
  onSelectCall: (no: string) => void
  onOpenList: (nos: string[]) => void
  onExpandCluster: (clusterId: string) => void
  onClear: () => void
}

type GltfAccessor = { bufferView: number; byteOffset?: number; count: number; type: string }
type Gltf = {
  accessors: GltfAccessor[]
  bufferViews: { byteOffset?: number }[]
  nodes: { name: string; mesh: number; extras: { label: string } }[]
  meshes: {
    primitives: {
      mode?: number
      material?: number
      attributes: { POSITION: number; NORMAL: number; TEXCOORD_0: number }
    }[]
  }[]
}

type Region = {
  id: string
  label: string
  group: THREE.Group
  mats: THREE.MeshStandardMaterial[]
  progress: number
  from: number
  to: number
  start: number
  lastRise: number
}

export type MapPlace = { label: string; x: number; z: number } | null

export type Terrain = {
  setRegion: (id: string | null) => void
  setPlace: (place: MapPlace) => void
  setOverlay: (spec: MapOverlaySpec) => void
  setCallUi: (ui: CallMapUi) => void
  setCallHandlers: (handlers: CallMapHandlers) => void
  dispose: () => void
}

const TILE = { w: 1920, h: 1080 }
const WALL = { w: 5760, h: 3240 }

function validate(value: number, min: number, max: number, name: string) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new RangeError(`${name}: ${min}–${max}`)
  }
  return value
}

export async function initTerrain(host: HTMLElement, tile: Tile): Promise<Terrain> {
  const response = await fetch(mapConfig.model)
  if (!response.ok) throw new Error("Model load failed: " + response.status)
  const raw = new Uint8Array(await response.arrayBuffer())
  const view = new DataView(raw.buffer)
  const jsonLength = view.getUint32(12, true)
  const doc = JSON.parse(new TextDecoder().decode(raw.subarray(20, 20 + jsonLength))) as Gltf
  const bin = 28 + jsonLength

  const scene = new THREE.Scene()
  const borderResolution = new THREE.Vector2(TILE.w, TILE.h)
  let lift = validate(mapConfig.lift, 0, 1, "Lift")
  let dim = validate(mapConfig.dimPercent, 0, 100, "Dim") / 100
  const borderWidth = validate(mapConfig.borderWidth, 0.5, 6, "Border")

  function makeBorder(pos: ArrayLike<number>) {
    const geo = new THREE.InstancedBufferGeometry()
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute([0, -1, 0, 1, -1, 0, 0, 1, 0, 0, 1, 0, 1, -1, 0, 1, 1, 0], 3),
    )
    const starts: number[] = []
    const ends: number[] = []
    for (let i = 0; i < pos.length; i += 6) {
      starts.push(pos[i], pos[i + 1], pos[i + 2])
      ends.push(pos[i + 3], pos[i + 4], pos[i + 5])
    }
    geo.setAttribute("start", new THREE.InstancedBufferAttribute(new Float32Array(starts), 3))
    geo.setAttribute("end", new THREE.InstancedBufferAttribute(new Float32Array(ends), 3))
    geo.instanceCount = pos.length / 6
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        resolution: { value: borderResolution },
        width: { value: borderWidth },
        rise: { value: 0 },
        color: { value: new THREE.Color("#b0d6c7") },
      },
      vertexShader: `attribute vec3 start;attribute vec3 end;uniform vec2 resolution;uniform float width;uniform float rise;void main(){vec4 a=projectionMatrix*modelViewMatrix*vec4(start+vec3(0.,rise,0.),1.);vec4 b=projectionMatrix*modelViewMatrix*vec4(end+vec3(0.,rise,0.),1.);vec2 d=(b.xy/b.w-a.xy/a.w)*resolution;vec2 normal=vec2(-d.y,d.x)/max(length(d),0.00001);vec4 p=mix(a,b,position.x);p.xy+=normal*position.y*width/resolution*p.w;p.z-=0.00002*p.w;gl_Position=p;}`,
      fragmentShader:
        "uniform vec3 color;void main(){gl_FragColor=vec4(color,1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}",
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.frustumCulled = false
    mesh.renderOrder = 2
    mesh.userData.border = true
    return mesh
  }

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(1)
  renderer.setSize(TILE.w, TILE.h, false)
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  renderer.domElement.style.width = `${TILE.w}px`
  renderer.domElement.style.height = `${TILE.h}px`
  host.append(renderer.domElement)

  const camera = new THREE.OrthographicCamera(-2.5, 2.5, 2, -2, 0.01, 100)
  const target = new THREE.Vector3(mapConfig.targetX, mapConfig.targetY, mapConfig.targetZ)
  const azimuth = mapConfig.cameraAzimuth
  const elevation = mapConfig.cameraElevation
  const zoom = mapConfig.zoom
  const ar = WALL.w / WALL.h
  const size = Math.max(2.05, 2.25 / ar) / zoom
  camera.left = -size * ar
  camera.right = size * ar
  camera.top = size
  camera.bottom = -size
  camera.setViewOffset(WALL.w, WALL.h, tile.x, tile.y, TILE.w, TILE.h)
  camera.updateProjectionMatrix()
  camera.position
    .set(
      Math.sin(azimuth) * Math.cos(elevation) * 7,
      Math.sin(elevation) * 7,
      Math.cos(azimuth) * Math.cos(elevation) * 7,
    )
    .add(target)
  camera.lookAt(target)

  const ambient = new THREE.HemisphereLight(0xc5edff, 0x122635, 1)
  scene.add(ambient)
  const sun = new THREE.DirectionalLight(0xe0faff, 1)
  scene.add(sun)
  const side = validate(mapConfig.sideLight, 0, 6, "Side light")
  const fill = validate(mapConfig.ambientLight, 0, 3, "Ambient")
  const lightAzimuth = (validate(mapConfig.lightAzimuth, 0, 360, "Light angle") * Math.PI) / 180
  const lightElevation = (validate(mapConfig.lightElevation, 5, 85, "Light height") * Math.PI) / 180
  ambient.intensity = fill
  sun.intensity = side
  sun.position.set(
    7 * Math.cos(lightElevation) * Math.sin(lightAzimuth),
    7 * Math.sin(lightElevation),
    7 * Math.cos(lightElevation) * Math.cos(lightAzimuth),
  )

  const loader = new THREE.TextureLoader()
  async function loadTexture(url: string, percent: number) {
    const texture = await loader.loadAsync(url)
    texture.flipY = false
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
    texture.repeat.setScalar(100 / validate(percent, 10, 500, "Pattern"))
    return texture
  }
  const baseTexture = await loadTexture(mapConfig.baseTexture, mapConfig.patternPercent)
  const selectedTexture = await loadTexture(mapConfig.selectedTexture, mapConfig.selectedPatternPercent)

  function attr(index: number) {
    const accessor = doc.accessors[index]
    const bufferView = doc.bufferViews[accessor.bufferView]
    const size = accessor.type === "VEC2" ? 2 : 3
    return new THREE.BufferAttribute(
      new Float32Array(raw.buffer, bin + (bufferView.byteOffset || 0) + (accessor.byteOffset || 0), accessor.count * size),
      size,
    )
  }

  const regions: Region[] = []
  const surfaces: THREE.Mesh[] = []
  for (const node of doc.nodes) {
    const group = new THREE.Group()
    group.name = node.name
    const mats: THREE.MeshStandardMaterial[] = []
    for (const primitive of doc.meshes[node.mesh].primitives) {
      if (primitive.mode === 1) {
        group.add(makeBorder(attr(primitive.attributes.POSITION).array))
        continue
      }
      const geo = new THREE.BufferGeometry()
      const source = attr(primitive.attributes.POSITION)
      geo.setAttribute("position", source.clone())
      geo.userData.basePosition = source.array
      geo.setAttribute("normal", attr(primitive.attributes.NORMAL))
      geo.setAttribute("uv", attr(primitive.attributes.TEXCOORD_0))
      const mat =
        primitive.material === 0
          ? new THREE.MeshStandardMaterial({
              map: baseTexture,
              color: 0xffffff,
              metalness: 0.08,
              roughness: 0.88,
              side: THREE.DoubleSide,
            })
          : new THREE.MeshStandardMaterial({
              color: 0x123643,
              metalness: 0.12,
              roughness: 0.8,
              side: THREE.DoubleSide,
            })
      mat.userData.base = mat.color.clone()
      const mesh = new THREE.Mesh(geo, mat)
      mesh.userData.region = regions.length
      mesh.userData.top = primitive.material === 0
      geo.computeBoundingSphere()
      if (geo.boundingSphere) geo.boundingSphere.radius += 1
      group.add(mesh)
      mats.push(mat)
      if (primitive.material === 0) surfaces.push(mesh)
    }
    scene.add(group)
    regions.push({ id: node.name, label: node.extras.label, group, mats, progress: 0, from: 0, to: 0, start: 0, lastRise: -1 })
  }

  const markerMat = new THREE.MeshStandardMaterial({
    color: 0xb0d6c7,
    roughness: 0.65,
    metalness: 0,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  })
  const marker = new THREE.Group()
  marker.add(new THREE.Mesh(roundedPointer(), markerMat))
  scene.add(marker)

  const cityLabel = document.createElement("div")
  cityLabel.className = "map-city"
  cityLabel.style.fontSize = `${validate(mapConfig.textSize, 10, 48, "Text size")}px`
  cityLabel.style.opacity = "0"
  host.append(cityLabel)

  const ray = new THREE.Raycaster()
  const markerPos = { x: mapConfig.markerX, y: mapConfig.markerY }
  let targetX = markerPos.x
  let targetZ = markerPos.y
  let markerAlpha = 0
  let alphaTarget = 0
  let markerRegion = -1
  let markerHeight = 0
  let selected: string | null = null
  const duration = 850

  function locateMarker() {
    scene.updateMatrixWorld(true)
    ray.set(new THREE.Vector3(markerPos.x, 3, markerPos.y), new THREE.Vector3(0, -1, 0))
    const hit = ray.intersectObjects(surfaces, false)[0]
    if (!hit) return
    markerRegion = hit.object.userData.region as number
    markerHeight = hit.point.y
  }

  function setPlace(place: MapPlace) {
    if (!place) {
      alphaTarget = 0
      return
    }
    targetX = place.x
    targetZ = place.z
    cityLabel.textContent = place.label
    alphaTarget = 1
  }

  function setRegion(id: string | null, immediate = false) {
    const match = id ? regions.find((region) => region.id === id || region.label === id) : undefined
    if (id && !match) {
      console.warn("Unknown map region:", id)
      return
    }
    selected = match?.id ?? null
    for (const mesh of surfaces) {
      const key = regions[mesh.userData.region as number].id === selected ? selectedTexture : baseTexture
      const mat = mesh.material as THREE.MeshStandardMaterial
      if (mat.map !== key) {
        mat.map = key
        mat.needsUpdate = true
      }
    }
    const now = performance.now()
    for (const region of regions) {
      region.from = immediate ? (region.id === selected ? 1 : 0) : region.progress
      region.to = region.id === selected ? 1 : 0
      region.start = now
      if (immediate) region.progress = region.to
    }
  }

  locateMarker()
  setRegion(null, true)

  const overlayGroup = new THREE.Group()
  overlayGroup.name = "overlay"
  scene.add(overlayGroup)
  const overlayPlane = new THREE.PlaneGeometry(2, 2)
  overlayPlane.rotateX(-Math.PI / 2)
  // Unit-height stem; scaled to MARKER_LIFT when placed.
  const overlayStem = new THREE.CylinderGeometry(1, 1, 1, 6)
  const overlayMats: THREE.Material[] = []
  const overlayTextures: THREE.Texture[] = []
  const markerTexCache = new Map<string, THREE.CanvasTexture>()
  const pickables: THREE.Object3D[] = []
  let overlaySpec: MapOverlaySpec = null
  let callUi: CallMapUi = { selectedNo: null, expandedClusterId: null }
  let callHandlers: CallMapHandlers = {
    onSelectCall: () => {},
    onOpenList: () => {},
    onExpandCluster: () => {},
    onClear: () => {},
  }
  // Full-wall camera for CSS-pixel clustering (bezels stay locked — no zoom).
  const wallCam = new THREE.OrthographicCamera(-2.5, 2.5, 2, -2, 0.01, 100)
  wallCam.left = camera.left
  wallCam.right = camera.right
  wallCam.top = camera.top
  wallCam.bottom = camera.bottom
  wallCam.near = camera.near
  wallCam.far = camera.far
  wallCam.position.copy(camera.position)
  wallCam.quaternion.copy(camera.quaternion)
  wallCam.up.copy(camera.up)
  wallCam.updateProjectionMatrix()
  wallCam.updateMatrixWorld(true)
  const pxToWorld = (2 * size) / WALL.h
  const DOT_PX = 32
  const HIT_PX = 48
  // Visual sizes drive clustering so dots/donuts never paint on top of each other.
  const CLUSTER_PX = 58
  const CLUSTER_SEED_PX = Math.max(DOT_PX, CLUSTER_PX) * 0.55
  const RING_GAP_PX = 6
  const MARKER_LIFT = 0.06

  function markerRadiusPx(total: number) {
    if (total <= 1) return DOT_PX * 0.52
    const digits = String(total).length
    const diameter = CLUSTER_PX + Math.max(0, digits - 2) * 8
    return diameter * 0.52
  }

  function clearOverlay() {
    while (overlayGroup.children.length) {
      const child = overlayGroup.children.pop()
      if (!child) break
      overlayGroup.remove(child)
    }
    for (const mat of overlayMats) mat.dispose()
    overlayMats.length = 0
    pickables.length = 0
  }

  function makeCanvasTexture(key: string, paint: (ctx: CanvasRenderingContext2D, size: number) => void, canvasSize = 128) {
    const hit = markerTexCache.get(key)
    if (hit) return hit
    const canvas = document.createElement("canvas")
    canvas.width = canvasSize
    canvas.height = canvasSize
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("canvas")
    ctx.clearRect(0, 0, canvasSize, canvasSize)
    paint(ctx, canvasSize)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    markerTexCache.set(key, texture)
    overlayTextures.push(texture)
    return texture
  }

  function markerTexture(hex: string) {
    return makeCanvasTexture(`${hex.toLowerCase()}:glow`, (ctx, size) => {
      const c = new THREE.Color(hex)
      const r = Math.round(c.r * 255)
      const g = Math.round(c.g * 255)
      const b = Math.round(c.b * 255)
      const cx = size / 2
      const cy = size / 2
      const colorGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.42)
      colorGlow.addColorStop(0, `rgba(${r},${g},${b},0.55)`)
      colorGlow.addColorStop(0.4, `rgba(${r},${g},${b},0.22)`)
      colorGlow.addColorStop(0.75, `rgba(${r},${g},${b},0.06)`)
      colorGlow.addColorStop(1, `rgba(${r},${g},${b},0)`)
      ctx.fillStyle = colorGlow
      ctx.fillRect(0, 0, size, size)
    })
  }

  /** Prefer point.color (band/slide palette); statusColor only for emergency ids. */
  function statusHex(statusId: string, fallback?: string) {
    if (fallback) return fallback.toLowerCase()
    return statusColor(statusId).toLowerCase() || "#94a3b8"
  }

  function flatDotTexture(hex: string) {
    const fill = hex.toLowerCase()
    return makeCanvasTexture(`dot:${fill}:v5`, (ctx, size) => {
      const cx = size / 2
      const cy = size / 2
      const r = size * 0.4
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = fill
      ctx.fill()
      ctx.lineWidth = Math.max(1.5, size * 0.04)
      ctx.strokeStyle = "rgba(8, 16, 20, 0.85)"
      ctx.stroke()
    })
  }

  function selectRingTexture() {
    return makeCanvasTexture("select-ring-v2", (ctx, size) => {
      const cx = size / 2
      const cy = size / 2
      const r = size * 0.4
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.lineWidth = size * 0.055
      ctx.strokeStyle = "rgba(231,240,237,0.95)"
      ctx.stroke()
    })
  }

  function softShadowTexture() {
    return makeCanvasTexture("shadow-v2", (ctx, size) => {
      const cx = size / 2
      const cy = size / 2
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.45)
      grad.addColorStop(0, "rgba(0,0,0,0.45)")
      grad.addColorStop(0.45, "rgba(0,0,0,0.16)")
      grad.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, size, size)
    })
  }

  function addContactShadow(parent: THREE.Group, worldPx: number, fade: number) {
    const mat = new THREE.MeshBasicMaterial({
      map: softShadowTexture(),
      transparent: true,
      opacity: 0.5 * fade,
      depthWrite: false,
      toneMapped: false,
    })
    overlayMats.push(mat)
    const mesh = new THREE.Mesh(overlayPlane, mat)
    // Slight cast offset with the wall light direction
    mesh.position.set(0.012, 0.003, 0.014)
    mesh.scale.setScalar((worldPx * pxToWorld) / 2)
    mesh.renderOrder = 2
    parent.add(mesh)
  }

  /** Thin vertical line from ground up to the floating marker. */
  function addStem(parent: THREE.Group, hex: string, fade: number) {
    const mat = new THREE.MeshBasicMaterial({
      color: hex,
      transparent: fade < 0.99,
      opacity: 0.9 * fade,
      depthWrite: false,
      toneMapped: false,
    })
    overlayMats.push(mat)
    const stem = new THREE.Mesh(overlayStem, mat)
    const radius = 0.9 * pxToWorld
    stem.position.y = MARKER_LIFT * 0.5
    stem.scale.set(radius, MARKER_LIFT, radius)
    stem.renderOrder = 3
    parent.add(stem)
  }

  function clusterDonutTexture(segments: ColorSegment[], total: number) {
    const key = `donut:v4:${total}:${segments.map((s) => `${s.color}:${s.weight}`).join("|")}`
    return makeCanvasTexture(
      key,
      (ctx, size) => {
        const cx = size / 2
        const cy = size / 2
        // Thicker ring so status hue matches solid dots (less blue bleed from map AA).
        const outer = size * 0.46
        const inner = size * 0.28
        let angle = -Math.PI / 2
        for (const seg of segments) {
          const sweep = (seg.weight / total) * Math.PI * 2
          ctx.beginPath()
          ctx.arc(cx, cy, outer, angle, angle + sweep)
          ctx.arc(cx, cy, inner, angle + sweep, angle, true)
          ctx.closePath()
          ctx.fillStyle = seg.color.toLowerCase()
          ctx.fill()
          angle += sweep
        }
        ctx.beginPath()
        ctx.arc(cx, cy, inner - 1, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(6,18,22,0.62)"
        ctx.fill()
        const label = String(total)
        const fontPx = total >= 100 ? size * 0.26 : size * 0.34
        ctx.font = `700 ${fontPx}px ui-sans-serif, system-ui, sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillStyle = "#e7f0ed"
        ctx.fillText(label, cx, cy + fontPx * 0.04)
      },
      192,
    )
  }

  function addSprite(map: THREE.Texture, worldPx: number, fade: number, renderOrder: number) {
    const mat = new THREE.SpriteMaterial({
      map,
      color: 0xffffff,
      transparent: true,
      opacity: fade,
      depthWrite: false,
      sizeAttenuation: true,
      toneMapped: false,
    })
    overlayMats.push(mat)
    const sprite = new THREE.Sprite(mat)
    const world = worldPx * pxToWorld
    sprite.scale.set(world, world, 1)
    sprite.renderOrder = renderOrder
    return sprite
  }

  /** Snap to land top; rejects water and vertical cliff/side hits. */
  function landAt(x: number, z: number) {
    scene.updateMatrixWorld(true)
    ray.set(new THREE.Vector3(x, 3, z), new THREE.Vector3(0, -1, 0))
    const hits = ray.intersectObjects(surfaces, false)
    for (const hit of hits) {
      if (!hit.face) continue
      const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld)
      if (normal.y < 0.55) continue
      return { x: hit.point.x, y: hit.point.y, z: hit.point.z }
    }
    return null
  }

  function snapLand(x: number, z: number) {
    const direct = landAt(x, z)
    if (direct) return direct
    for (let ring = 1; ring <= 14; ring += 1) {
      const step = 0.018 * ring
      const spokes = 8 + ring * 2
      for (let k = 0; k < spokes; k += 1) {
        const angle = (k / spokes) * Math.PI * 2
        const hit = landAt(x + Math.cos(angle) * step, z + Math.sin(angle) * step)
        if (hit) return hit
      }
    }
    return null
  }

  function restoreRegionColors() {
    for (const region of regions) {
      for (const mat of region.mats) {
        mat.userData.overlayTint = null
        mat.userData.overlayMix = 0
        mat.userData.overlayEmissive = 0
        const base = mat.userData.base as THREE.Color
        if (base) mat.color.copy(base)
        mat.emissive.setRGB(0, 0, 0)
        mat.emissiveIntensity = 0
      }
    }
  }

  const projectScratch = new THREE.Vector3()
  /** Fast wall CSS projection for clustering (no land raycast). */
  function toWallScreenFast(x: number, z: number) {
    projectScratch.set(x, 0.04, z).project(wallCam)
    if (Math.abs(projectScratch.z) > 1) return null
    return {
      sx: (projectScratch.x * 0.5 + 0.5) * WALL.w,
      sy: (-projectScratch.y * 0.5 + 0.5) * WALL.h,
    }
  }

  function placeCallMarker(point: OverlayPoint, x: number, z: number, fade: number, selected: boolean) {
    const land = snapLand(x, z)
    if (!land) return
    const group = new THREE.Group()
    group.position.set(land.x, land.y, land.z)
    group.userData.pick = { kind: "call", no: point.id, nos: point.nos }

    addContactShadow(group, DOT_PX * 1.35, fade)

    const fill = statusHex(point.statusId, point.color)
    addStem(group, fill, fade)

    const air = new THREE.Group()
    air.position.y = MARKER_LIFT
    group.add(air)

    const hit = addSprite(flatDotTexture(fill), HIT_PX, 0.001, 4)
    air.add(hit)

    const dot = addSprite(flatDotTexture(fill), DOT_PX, fade, 5)
    air.add(dot)

    if (selected) {
      const ring = addSprite(selectRingTexture(), DOT_PX + RING_GAP_PX * 2, fade, 6)
      air.add(ring)
    }

    overlayGroup.add(group)
    pickables.push(group)
  }

  function placeClusterMarker(cluster: CallCluster, fade: number) {
    const land = snapLand(cluster.x, cluster.z)
    if (!land) return
    const digits = String(cluster.total).length
    const diameter = CLUSTER_PX + Math.max(0, digits - 2) * 8
    const group = new THREE.Group()
    group.position.set(land.x, land.y, land.z)
    group.userData.pick = {
      kind: "cluster",
      clusterId: cluster.id,
      nos: cluster.members.map((m) => m.id),
      coincident: cluster.coincident,
    }

    addContactShadow(group, diameter * 1.15, fade)

    const stemColor = cluster.segments[0]?.color ?? "#94a3b8"
    addStem(group, stemColor, fade)

    const air = new THREE.Group()
    air.position.y = MARKER_LIFT
    group.add(air)

    const hit = addSprite(clusterDonutTexture(cluster.segments, cluster.total), Math.max(HIT_PX, diameter), 0.001, 4)
    air.add(hit)

    const donut = addSprite(clusterDonutTexture(cluster.segments, cluster.total), diameter, fade, 5)
    air.add(donut)

    overlayGroup.add(group)
    pickables.push(group)
  }

  function rebuildPointsOverlay(points: OverlayPoint[], fade: number) {
    const clusters = clusterCallsNoOverlap(points, toWallScreenFast, CLUSTER_SEED_PX, markerRadiusPx)
    const expanded = callUi.expandedClusterId
      ? clusters.find((c) => c.id === callUi.expandedClusterId) ?? null
      : null

    for (const cluster of clusters) {
      if (expanded && cluster.id === expanded.id && !expanded.coincident && expanded.members.length > 1) {
        const fans = spiderfyPositions(expanded.members, expanded.x, expanded.z, Math.max(DOT_PX, CLUSTER_PX) * pxToWorld)
        const byId = new Map(fans.map((f) => [f.id, f]))
        for (const point of expanded.members) {
          const fan = byId.get(point.id)
          placeCallMarker(point, fan?.x ?? point.x, fan?.z ?? point.z, fade, callUi.selectedNo === point.id)
        }
        continue
      }
      if (cluster.total === 1) {
        const point = cluster.members[0]
        placeCallMarker(point, point.x, point.z, fade, callUi.selectedNo === point.id)
      } else {
        placeClusterMarker(cluster, fade)
      }
    }
  }

  function paintOverlay() {
    clearOverlay()
    restoreRegionColors()
    const spec = overlaySpec
    if (!spec) return
    const fade = spec.opacity == null ? 1 : Math.max(0, Math.min(1, spec.opacity))
    overlayGroup.visible = fade > 0.02

    if (spec.kind === "points" && spec.points) {
      rebuildPointsOverlay(spec.points, fade)
      return
    }

    if (spec.kind === "heatmap" && spec.heat) {
      for (const spot of spec.heat) {
        const land = snapLand(spot.x, spot.z)
        if (!land) continue
        const scale = 0.09 + Math.min(0.32, spot.weight * 0.18)
        const mat = new THREE.MeshBasicMaterial({
          map: markerTexture(spot.color),
          transparent: true,
          opacity: 0.65 * fade,
          depthWrite: false,
        })
        overlayMats.push(mat)
        const mesh = new THREE.Mesh(overlayPlane, mat)
        mesh.position.set(land.x, land.y + 0.01, land.z)
        mesh.scale.setScalar(scale)
        mesh.renderOrder = 3
        overlayGroup.add(mesh)
      }
      return
    }

    if (spec.kind === "region") {
      if (spec.regions?.length) {
        const tint = new Map(spec.regions.map((r) => [r.regionId, r]))
        for (const region of regions) {
          const hit = tint.get(region.id)
          if (!hit) continue
          const mix = Math.max(0, Math.min(1, (hit.intensity == null ? 0.75 : hit.intensity) * fade))
          const color = new THREE.Color(hit.color)
          for (const mat of region.mats) {
            // Survives the per-frame brightness pass (see frame loop).
            mat.userData.overlayTint = color.clone()
            mat.userData.overlayMix = mix
            mat.userData.overlayEmissive = 0.45 * mix
            const base = (mat.userData.base as THREE.Color).clone()
            mat.color.copy(base.lerp(color, mix))
            mat.emissive.copy(color)
            mat.emissiveIntensity = 0.45 * mix
          }
        }
      }

      // Approximate admin footprints (e.g. Sumqayıt) when GLB has no matching mesh.
      for (const poly of spec.polygons ?? []) {
        if (!poly.ring || poly.ring.length < 3) continue
        const shape = new THREE.Shape()
        shape.moveTo(poly.ring[0].x, -poly.ring[0].z)
        for (let i = 1; i < poly.ring.length; i += 1) {
          shape.lineTo(poly.ring[i].x, -poly.ring[i].z)
        }
        shape.closePath()
        const geo = new THREE.ShapeGeometry(shape)
        geo.rotateX(-Math.PI / 2)
        let cx = 0
        let cz = 0
        for (const p of poly.ring) {
          cx += p.x
          cz += p.z
        }
        cx /= poly.ring.length
        cz /= poly.ring.length
        const land = snapLand(cx, cz)
        const intensity = poly.intensity == null ? 0.55 : poly.intensity
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(poly.color),
          transparent: true,
          opacity: Math.max(0.15, intensity * fade),
          depthWrite: false,
          side: THREE.DoubleSide,
        })
        overlayMats.push(mat)
        const mesh = new THREE.Mesh(geo, mat)
        mesh.position.y = (land?.y ?? 0) + 0.025
        mesh.renderOrder = 2
        overlayGroup.add(mesh)
      }
    }
  }

  function setOverlay(spec: MapOverlaySpec) {
    overlaySpec = spec
    paintOverlay()
  }

  function setCallUi(ui: CallMapUi) {
    callUi = ui
    if (overlaySpec?.kind === "points") paintOverlay()
  }

  function setCallHandlers(handlers: CallMapHandlers) {
    callHandlers = handlers
  }

  function onPointerDown(event: PointerEvent) {
    if (!overlaySpec || overlaySpec.kind !== "points") return
    const rect = renderer.domElement.getBoundingClientRect()
    const ndcX = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const ndcY = -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    ray.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
    const hits = ray.intersectObjects(pickables, true)
    if (!hits.length) {
      callHandlers.onClear()
      return
    }
    let obj: THREE.Object3D | null = hits[0].object
    while (obj && !obj.userData.pick) obj = obj.parent
    const pick = obj?.userData.pick as
      | { kind: "call"; no: string }
      | { kind: "cluster"; clusterId: string; nos: string[]; coincident: boolean }
      | undefined
    if (!pick) {
      callHandlers.onClear()
      return
    }
    event.stopPropagation()
    if (pick.kind === "call") {
      callHandlers.onSelectCall(pick.no)
      return
    }
    if (pick.coincident || callUi.expandedClusterId === pick.clusterId) {
      callHandlers.onOpenList(pick.nos)
      return
    }
    callHandlers.onExpandCluster(pick.clusterId)
  }
  renderer.domElement.style.pointerEvents = "auto"
  renderer.domElement.addEventListener("pointerdown", onPointerDown)

  let dimCurrent = selected ? dim : 0
  let last = performance.now()
  let frameId = 0
  function frame(now: number) {
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    dimCurrent += ((selected ? dim : 0) - dimCurrent) * (1 - Math.exp(-dt * 7))
    for (const region of regions) {
      const t = Math.min(1, (now - region.start) / duration)
      const ease = t * t * t * (t * (t * 6 - 15) + 10)
      region.progress = region.from + (region.to - region.from) * ease
      const rise = lift * region.progress
      if (region.lastRise !== rise) {
        for (const mesh of region.group.children) {
          if (mesh.userData.border) {
            ;(mesh as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>).material.uniforms.rise.value = rise
            continue
          }
          const geometry = (mesh as THREE.Mesh).geometry
          const positions = geometry.attributes.position.array as Float32Array
          const base = geometry.userData.basePosition as ArrayLike<number>
          for (let i = 1; i < positions.length; i += 3) positions[i] = base[i] + (base[i] > -0.001 ? rise : 0)
          geometry.attributes.position.needsUpdate = true
        }
        region.lastRise = rise
      }
      const brightness = 1 - dimCurrent * (1 - region.progress)
      for (const mat of region.mats) {
        const base = (mat.userData.base as THREE.Color).clone()
        const tint = mat.userData.overlayTint as THREE.Color | null | undefined
        const mix = typeof mat.userData.overlayMix === "number" ? mat.userData.overlayMix : 0
        const emit = typeof mat.userData.overlayEmissive === "number" ? mat.userData.overlayEmissive : 0
        if (tint && mix > 0) base.lerp(tint, mix)
        mat.color.copy(base).multiplyScalar(brightness)
        if (tint && emit > 0) {
          mat.emissive.copy(tint).multiplyScalar(brightness)
          mat.emissiveIntensity = emit
        } else {
          mat.emissive.setRGB(0, 0, 0)
          mat.emissiveIntensity = 0
        }
      }
      for (const mesh of region.group.children) {
        if (!mesh.userData.border) continue
        const material = (mesh as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>).material
        material.uniforms.color.value.set("#b0d6c7").multiplyScalar(brightness)
      }
    }
    const glide = 1 - Math.exp(-dt * 3.2)
    markerPos.x += (targetX - markerPos.x) * glide
    markerPos.y += (targetZ - markerPos.y) * glide
    markerAlpha += (alphaTarget - markerAlpha) * (1 - Math.exp(-dt * 5))
    locateMarker()
    markerMat.opacity = markerAlpha
    marker.visible = markerAlpha > 0.02 && markerRegion >= 0
    cityLabel.style.opacity = markerAlpha.toFixed(3)
    if (markerRegion >= 0) {
      const bob = 0 // 0.012 * Math.sin((now * 2 * Math.PI) / 3600)
      marker.position.set(markerPos.x, markerHeight + 0.037 + bob, markerPos.y)
      const anchor = marker.position.clone().add(new THREE.Vector3(0, 0.19, 0)).project(camera)
      cityLabel.style.left = `${(anchor.x * 0.5 + 0.5) * TILE.w + mapConfig.labelOffset}px`
      cityLabel.style.top = `${(-anchor.y * 0.5 + 0.5) * TILE.h}px`
    }
    renderer.render(scene, camera)
    frameId = requestAnimationFrame(frame)
  }
  frameId = requestAnimationFrame(frame)

  return {
    setRegion: (id) => setRegion(id),
    setPlace,
    setOverlay,
    setCallUi,
    setCallHandlers,
    dispose() {
      cancelAnimationFrame(frameId)
      renderer.domElement.removeEventListener("pointerdown", onPointerDown)
      clearOverlay()
      overlayPlane.dispose()
      overlayStem.dispose()
      wallCam.clearViewOffset?.()
      for (const texture of overlayTextures) texture.dispose()
      markerTexCache.clear()
      renderer.dispose()
      renderer.forceContextLoss()
      baseTexture.dispose()
      selectedTexture.dispose()
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        mesh.geometry?.dispose()
        const material = mesh.material
        if (Array.isArray(material)) material.forEach((item) => item.dispose())
        else material?.dispose()
      })
      renderer.domElement.remove()
      cityLabel.remove()
    },
  }
}
