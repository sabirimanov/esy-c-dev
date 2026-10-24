import * as THREE from "three"
import { mapConfig } from "./mapConfig"
import { roundedPointer } from "./marker"

type Tile = { x: number; y: number }

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
      for (const mat of region.mats) mat.color.copy(mat.userData.base as THREE.Color).multiplyScalar(brightness)
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
    dispose() {
      cancelAnimationFrame(frameId)
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
