import * as THREE from "three"

export function roundedPointer() {
  const positions: number[] = []
  const indices: number[] = []
  const rings: number[][] = []
  const cornerSteps = 8
  const ringDefs = [
    [0.00001, 0.000003, 0.000001],
    [0.19, 0.034, 0.0068],
    [0.215, 0.0377, 0.0075],
    [0.219, 0.0372, 0.0075],
    [0.223, 0.0355, 0.0075],
    [0.2247, 0.0325, 0.006],
    [0.225, 0.0302, 0.004],
  ]
  for (const [y, half, r] of ringDefs) {
    const ring: number[] = []
    for (let c = 0; c < 4; c++) {
      const ang = (c * Math.PI) / 2
      const cx = (c === 0 || c === 3 ? 1 : -1) * (half - r)
      const cz = (c < 2 ? 1 : -1) * (half - r)
      for (let k = 0; k <= cornerSteps; k++) {
        const a = ang + ((k / cornerSteps) * Math.PI) / 2
        ring.push(positions.length / 3)
        positions.push(cx + r * Math.cos(a), y, cz + r * Math.sin(a))
      }
    }
    rings.push(ring)
  }
  const len = rings[0].length
  for (let j = 0; j < rings.length - 1; j++) {
    for (let i = 0; i < len; i++) {
      const a = rings[j][i]
      const b = rings[j][(i + 1) % len]
      const c = rings[j + 1][i]
      const d = rings[j + 1][(i + 1) % len]
      indices.push(a, c, b, b, c, d)
    }
  }
  const top = positions.length / 3
  positions.push(0, 0.225, 0)
  const cap = rings[rings.length - 1]
  for (let i = 0; i < len; i++) indices.push(top, cap[(i + 1) % len], cap[i])
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}
