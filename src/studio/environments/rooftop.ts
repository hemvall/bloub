import * as T from 'three'
import { box, cylinder, disposeTree, glow, hash } from '../engine/geometry'
import type { EnvironmentInstance } from './types'
const SKY_VERTEX = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`
const SKY_FRAGMENT = `
varying vec3 vDir;
void main() {
  float h = clamp(vDir.y, -0.1, 1.0);
  vec3 horizon = vec3(0.98, 0.52, 0.30);
  vec3 mid = vec3(0.52, 0.22, 0.45);
  vec3 top = vec3(0.09, 0.07, 0.22);
  vec3 c = mix(horizon, mid, smoothstep(0.0, 0.28, h));
  c = mix(c, top, smoothstep(0.2, 0.75, h));
  gl_FragColor = vec4(c, 1.0);
}`
const BULB = new T.Color('#ffd58a')
export function buildRooftop(): EnvironmentInstance {
  const root = new T.Group()
  root.name = 'environment'
  root.add(new T.HemisphereLight('#8a6aa8', '#2a1a22', 1.0))
  const sun = new T.DirectionalLight('#ffb27a', 2.2)
  sun.position.set(-8, 3.5, -12)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = sun.shadow.camera.bottom = -10
  sun.shadow.camera.right = sun.shadow.camera.top = 10
  sun.shadow.camera.far = 60
  sun.shadow.normalBias = 0.03
  root.add(sun)
  const fill = new T.DirectionalLight('#6f7fd0', 0.6)
  fill.position.set(6, 5, 6)
  root.add(fill)
  // Sky dome, stars, moon, sun disc on the horizon.
  const sky = new T.Mesh(
    new T.SphereGeometry(140, 32, 16),
    new T.ShaderMaterial({ vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, side: T.BackSide, depthWrite: false, fog: false })
  )
  root.add(sky)
  const stars = new Float32Array(400 * 3)
  for (let i = 0; i < 400; i++) {
    const a = hash(i, 1) * Math.PI * 2,
      e = 0.15 + hash(i, 2) * 1.2,
      r = 120
    stars.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3)
  }
  const starGeo = new T.BufferGeometry()
  starGeo.setAttribute('position', new T.BufferAttribute(stars, 3))
  const starPoints = new T.Points(starGeo, new T.PointsMaterial({ color: '#ffffff', size: 0.5, transparent: true, opacity: 0.8, fog: false }))
  root.add(starPoints)
  const moon = glow(root, 2.6, [-40, 48, -110], '#fff2d4')
  ;(moon.material as T.MeshBasicMaterial).fog = false
  // Skyline: rings of towers at increasing distance, darker and bluer further away.
  const warm: [number, number, number][] = [],
    cool: [number, number, number][] = []
  for (let ring = 0; ring < 3; ring++)
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2 + ring * 0.13 + hash(i, ring) * 0.1
      const d = 26 + ring * 16 + hash(i, 10 + ring) * 6
      const x = Math.cos(a) * d,
        z = Math.sin(a) * d
      if (z > 10 && ring === 0) continue
      const h = 4 + hash(i, 20 + ring) * (10 + ring * 6),
        w = 2.5 + hash(i, 30 + ring) * 3
      const tower = box(root, [w, h, w], [x, h / 2 - 2, z], ['#2b2340', '#231d36', '#1c1830'][ring]!, { shadow: false })
      tower.receiveShadow = false
      if (ring < 2)
        for (let row = 0; row < Math.floor(h / 0.9); row++)
          for (let col = 0; col < 3; col++) {
            if (hash(i * 50 + row * 3 + col, 40 + ring) < 0.45) continue
            const side = Math.atan2(-z, -x)
            const ox = Math.cos(side) * (w / 2 + 0.02) - Math.sin(side) * (-w / 3 + col * (w / 3))
            const oz = Math.sin(side) * (w / 2 + 0.02) + Math.cos(side) * (-w / 3 + col * (w / 3))
            ;(hash(i + row, 60) < 0.55 ? warm : cool).push([x + ox, row * 0.9 - 1.5, z + oz])
          }
    }
  for (const [positions, color] of [
    [warm, '#f0b36a'],
    [cool, '#8fa5e0']
  ] as const) {
    const windows = new T.InstancedMesh(new T.BoxGeometry(0.35, 0.45, 0.35), new T.MeshBasicMaterial({ color }), positions.length)
    positions.forEach((p, i) => windows.setMatrixAt(i, new T.Matrix4().makeTranslation(...p)))
    windows.instanceMatrix.needsUpdate = true
    root.add(windows)
  }
  // The roof: slab, gravel tint, parapet, access box, water tower, AC units, vents.
  box(root, [22, 0.4, 22], [0, -0.2, 1], '#3a3238', { roughness: 1 })
  for (let i = 0; i < 14; i++) box(root, [22, 0.005, 0.02], [0, 0.003, -9.5 + i * 1.6], '#2e272c', { shadow: false })
  for (const [size, pos] of [
    [[22.4, 1.1, 0.4], [0, 0.55, -10]],
    [[22.4, 1.1, 0.4], [0, 0.55, 12]],
    [[0.4, 1.1, 22.4], [-11.2, 0.55, 1]],
    [[0.4, 1.1, 22.4], [11.2, 0.55, 1]]
  ] as [[number, number, number], [number, number, number]][])
    box(root, size, pos, '#5a4a4c', { roughness: 0.9 })
  box(root, [22.6, 0.12, 0.6], [0, 1.15, -10], '#7a6a6c')
  box(root, [2.6, 2.4, 2.2], [-7.5, 1.2, -7], '#4a3f47')
  box(root, [1, 1.9, 0.08], [-7.5, 0.95, -5.86], '#2d2630')
  cylinder(root, 1.3, 1.3, 2.2, [6.5, 4.4, -5.5], '#6b4a3e', { roughness: 0.9 })
  cylinder(root, 0, 1.35, 0.7, [6.5, 5.85, -5.5], '#4e3a35')
  for (const [dx, dz] of [
    [-0.9, -0.9],
    [0.9, -0.9],
    [-0.9, 0.9],
    [0.9, 0.9]
  ] as const)
    cylinder(root, 0.07, 0.07, 3.3, [6.5 + dx, 1.65, -5.5 + dz], '#3a3135', { metalness: 0.5 })
  for (const x of [2.2, 3.9]) {
    box(root, [1.3, 0.9, 1.1], [x, 0.45, -8.2], '#8a8a90', { metalness: 0.4, roughness: 0.5 })
    const fan = new T.Mesh(new T.TorusGeometry(0.38, 0.05, 8, 24), new T.MeshStandardMaterial({ color: '#3b3b40' }))
    fan.rotation.x = Math.PI / 2
    fan.position.set(x, 0.92, -8.2)
    root.add(fan)
  }
  for (let i = 0; i < 3; i++) cylinder(root, 0.16, 0.2, 0.6, [-2 + i * 1.1, 0.3, -9], '#55494e', { metalness: 0.3 })
  // String lights between two poles, with a few real point lights along the wire.
  const poles: [number, number][] = [
    [-7, 4],
    [7, 4]
  ]
  for (const [x, z] of poles) cylinder(root, 0.04, 0.05, 3.2, [x, 1.6, z], '#2f292d', { metalness: 0.4 })
  const bulbs: T.Mesh[] = []
  const wirePoints: T.Vector3[] = []
  for (let i = 0; i <= 40; i++) {
    const u = i / 40
    const sag = Math.sin(u * Math.PI) * 0.6
    wirePoints.push(new T.Vector3(-7 + u * 14, 3.2 - sag, 4 - Math.sin(u * Math.PI) * 5.2))
  }
  const wire = new T.Line(new T.BufferGeometry().setFromPoints(wirePoints), new T.LineBasicMaterial({ color: '#1f1b1e' }))
  root.add(wire)
  for (let i = 1; i < 40; i += 2) {
    const p = wirePoints[i]!
    const bulb = glow(root, 0.07, [p.x, p.y - 0.12, p.z], '#ffd58a')
    bulbs.push(bulb)
    if (i % 6 === 1) {
      const light = new T.PointLight('#ffc877', 5, 5, 2)
      light.position.set(p.x, p.y - 0.15, p.z)
      root.add(light)
    }
  }
  // Floating embers / dust in the warm light.
  const DUST = 60
  const dustArray = new Float32Array(DUST * 3),
    dustGeo = new T.BufferGeometry()
  dustGeo.setAttribute('position', new T.BufferAttribute(dustArray, 3))
  const dust = new T.Points(dustGeo, new T.PointsMaterial({ color: '#ffd9a8', size: 0.03, transparent: true, opacity: 0.5, depthWrite: false }))
  dust.frustumCulled = false
  root.add(dust)
  return {
    root,
    update(time) {
      for (let i = 0; i < DUST; i++)
        dustArray.set(
          [
            -8 + hash(i, 1) * 16 + Math.sin(time * 0.2 + i) * 0.3,
            0.3 + ((hash(i, 2) * 3.5 + time * 0.05) % 3.5),
            -6 + hash(i, 3) * 10 + Math.cos(time * 0.15 + i * 2) * 0.3
          ],
          i * 3
        )
      dustGeo.attributes.position!.needsUpdate = true
      bulbs.forEach((b, i) =>
        (b.material as T.MeshBasicMaterial).color
          .copy(BULB)
          .multiplyScalar(0.85 + 0.15 * Math.sin(time * 3 + i * 1.7))
      )
    },
    dispose() {
      disposeTree(root)
    }
  }
}
