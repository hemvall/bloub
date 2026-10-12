import * as T from 'three'
import { box, cylinder, disposeTree, glow, hash } from '../engine/geometry'
import { createProp } from '../props/createProp'
import type { EnvironmentInstance } from './types'
export function buildNightBar(): EnvironmentInstance {
  const root = new T.Group()
  root.name = 'environment'
  // Light rig: cool ambient from the window side, warm key from the lamps.
  root.add(new T.HemisphereLight('#8ea3c9', '#4a2f2a', 0.8))
  const key = new T.DirectionalLight('#ffd7a6', 1.1)
  key.position.set(-3, 7, 5)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = key.shadow.camera.bottom = -9
  key.shadow.camera.right = key.shadow.camera.top = 9
  key.shadow.normalBias = 0.03
  key.shadow.bias = -0.0005
  root.add(key)
  const moon = new T.DirectionalLight('#7a9ad8', 0.9)
  moon.position.set(5, 6, -8)
  root.add(moon)
  // Floor with planks, walls, back wall with the arched window cut out.
  box(root, [14, 0.2, 12], [0, -0.13, 0], '#211c21', { roughness: 0.55 })
  for (let i = 0; i < 22; i++) box(root, [0.022, 0.012, 12], [-6.8 + i * 0.64, -0.022, 0], '#3b2c30', { shadow: false })
  box(root, [0.3, 7, 12], [-7, 3.4, 0], '#2b262c')
  box(root, [0.3, 7, 12], [7, 3.4, 0], '#2b262c')
  box(root, [14, 0.3, 12], [0, 7, 0], '#1b181c', { shadow: false })
  const wall = new T.Shape()
  wall.moveTo(-7, 0)
  wall.lineTo(7, 0)
  wall.lineTo(7, 7)
  wall.lineTo(-7, 7)
  wall.closePath()
  const opening = new T.Path()
  opening.moveTo(1.3, 1.1)
  opening.lineTo(1.3, 3.7)
  opening.absarc(3.3, 3.7, 2, Math.PI, 0, true)
  opening.lineTo(5.3, 1.1)
  opening.closePath()
  wall.holes.push(opening)
  const wallMesh = new T.Mesh(
    new T.ExtrudeGeometry(wall, { depth: 0.2, bevelEnabled: false }),
    new T.MeshStandardMaterial({ color: '#34292f', roughness: 1 })
  )
  wallMesh.position.z = -4.8
  wallMesh.receiveShadow = true
  root.add(wallMesh)
  for (let x = -6.8; x < 7; x += 0.4) box(root, [0.018, 1.05, 0.025], [x, 0.55, -4.56], '#5a443b', { shadow: false })
  box(root, [14, 0.08, 0.12], [0, 1.05, -4.5], '#7a614a')
  // Window frame, sill, mullions.
  const frameCurve = new T.CurvePath<T.Vector3>()
  frameCurve.add(new T.LineCurve3(new T.Vector3(1.3, 1.1, -4.5), new T.Vector3(1.3, 3.7, -4.5)))
  const arc: T.Vector3[] = []
  for (let i = 0; i <= 40; i++) {
    const a = Math.PI - (i / 40) * Math.PI
    arc.push(new T.Vector3(3.3 + Math.cos(a) * 2, 3.7 + Math.sin(a) * 2, -4.5))
  }
  for (let i = 1; i < arc.length; i++) frameCurve.add(new T.LineCurve3(arc[i - 1]!, arc[i]!))
  frameCurve.add(new T.LineCurve3(new T.Vector3(5.3, 3.7, -4.5), new T.Vector3(5.3, 1.1, -4.5)))
  root.add(
    new T.Mesh(
      new T.TubeGeometry(frameCurve, 64, 0.09, 8, false),
      new T.MeshStandardMaterial({ color: '#a8866c', metalness: 0.35, roughness: 0.4 })
    )
  )
  box(root, [4.25, 0.14, 0.5], [3.3, 1.1, -4.4], '#82705e')
  box(root, [0.07, 4.5, 0.1], [3.3, 3.3, -4.48], '#967c67')
  box(root, [4, 0.07, 0.1], [3.3, 3.5, -4.48], '#967c67')
  // Glass pane: faint, catches the practicals.
  const pane = new T.Mesh(
    new T.PlaneGeometry(4.2, 4.8),
    new T.MeshPhysicalMaterial({ color: '#9fb7d8', transparent: true, opacity: 0.08, roughness: 0.05, metalness: 0.2 })
  )
  pane.position.set(3.3, 3.3, -4.7)
  root.add(pane)
  // City beyond the window: layered towers with instanced lit windows, plus a far haze plane.
  box(root, [40, 24, 0.1], [3, 8, -22], '#0d1424', { shadow: false })
  const warm: [number, number, number][] = [],
    cool: [number, number, number][] = []
  for (let i = 0; i < 26; i++) {
    const x = -12 + i * 1.3 + hash(i, 1) * 0.5,
      h = 2 + hash(i, 2) * 7,
      z = -8.5 - (i % 4) * 2.2 - hash(i, 3)
    box(root, [1 + hash(i, 4) * 0.6, h, 1.2], [x, h / 2 - 1, z], i % 2 ? '#141f30' : '#182538', { shadow: false })
    for (let row = 0; row < Math.floor(h / 0.5); row++)
      for (let col = 0; col < 3; col++) {
        if (hash(i * 100 + row * 3 + col, 5) < 0.35) continue
        ;(hash(i * 7 + row, 6) < 0.6 ? warm : cool).push([x - 0.3 + col * 0.3, row * 0.5 - 0.6, z + 0.62])
      }
  }
  for (const [positions, color] of [
    [warm, '#d99a5f'],
    [cool, '#7f90bb']
  ] as const) {
    const windows = new T.InstancedMesh(new T.BoxGeometry(0.12, 0.17, 0.03), new T.MeshBasicMaterial({ color }), positions.length)
    positions.forEach((p, i) => windows.setMatrixAt(i, new T.Matrix4().makeTranslation(...p)))
    windows.instanceMatrix.needsUpdate = true
    root.add(windows)
  }
  // Counter, foot rail, stools.
  const counter = new T.Group()
  counter.name = 'counter'
  root.add(counter)
  box(counter, [10.8, 1.72, 1.05], [0, 0.86, 0], '#33232a')
  for (let i = 0; i < 28; i++) box(counter, [0.18, 1.5, 0.07], [-5.2 + i * 0.385, 0.86, 0.56], '#56403a', { shadow: false })
  box(counter, [11.2, 0.21, 1.65], [0, 1.82, 0], '#8f6440', { roughness: 0.35, metalness: 0.05 })
  box(counter, [11.25, 0.035, 0.06], [0, 1.9, 0.84], '#d4a76b', { metalness: 0.5, roughness: 0.3 })
  for (let i = 0; i < 4; i++) box(counter, [11.1, 0.012, 0.008], [0, 1.931, -0.6 + i * 0.36], '#5a4330', { shadow: false })
  const rail = cylinder(root, 0.035, 0.035, 10, [0, 0.35, 0.85], '#b48a53', { metalness: 0.7, roughness: 0.3 })
  rail.rotation.z = Math.PI / 2
  for (const x of [-4, -1.8, 1.8, 4]) {
    cylinder(root, 0.42, 0.43, 0.14, [x, 1.2, 1.65], '#5a3d44', { roughness: 0.6 })
    cylinder(root, 0.045, 0.045, 1.12, [x, 0.58, 1.65], '#a18566', { metalness: 0.6, roughness: 0.35 })
    cylinder(root, 0.35, 0.38, 0.055, [x, 0.035, 1.65], '#403943', { metalness: 0.4 })
    const ring = new T.Mesh(new T.TorusGeometry(0.25, 0.025, 8, 24), new T.MeshStandardMaterial({ color: '#a18566', metalness: 0.6 }))
    ring.rotation.x = Math.PI / 2
    ring.position.set(x, 0.43, 1.65)
    root.add(ring)
  }
  // Bottle shelves with practical strips.
  box(root, [6.4, 3, 0.24], [-3.5, 3.1, -4.47], '#1a1f26')
  for (let row = 0; row < 3; row++) {
    const y = 1.8 + row * 1.05
    box(root, [6.4, 0.12, 0.55], [-3.5, y, -4.15], '#6b4e3b')
    box(root, [6.2, 0.025, 0.025], [-3.5, y - 0.05, -3.88], '#ffb866', { emissive: 2.5, shadow: false })
    const strip = new T.PointLight('#ffb866', 4, 3.5, 2)
    strip.position.set(-3.5, y + 0.3, -4)
    root.add(strip)
    for (let i = 0; i < 12; i++)
      root.add(
        createProp({
          id: `shelf-${row}-${i}`,
          kind: 'bottle',
          position: [-6.3 + i * 0.5, y + 0.08, -4.12],
          rotation: [0, 0, 0],
          scale: 0.65 + ((i * 7 + row) % 4) * 0.12,
          color: ['#4b8676', '#bb774c', '#637aa0', '#a95569', '#c9a24a'][(i + row) % 5]!
        })
      )
  }
  // Hanging lamps over the counter.
  for (const x of [-3.6, 0, 3.6]) {
    cylinder(root, 0.018, 0.018, 1.6, [x, 5.7, 0], '#2a2529')
    cylinder(root, 0.18, 0.58, 0.36, [x, 4.77, 0], '#3a333b', { metalness: 0.3, roughness: 0.5 })
    glow(root, 0.11, [x, 4.53, 0], '#ffe3ad')
    const lamp = new T.PointLight('#ffcf8f', 12, 7.5, 2)
    lamp.position.set(x, 4.42, 0)
    root.add(lamp)
  }
  // Neon sign, drawn once into a canvas texture.
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.textAlign = 'center'
  ctx.font = 'italic 104px Georgia, serif'
  ctx.lineJoin = 'round'
  ctx.shadowColor = '#ff6f86'
  ctx.shadowBlur = 28
  ctx.strokeStyle = '#ff9fb0'
  ctx.lineWidth = 6
  ctx.strokeText('the last light', 512, 158)
  ctx.shadowBlur = 0
  ctx.fillStyle = '#fff0f3'
  ctx.fillText('the last light', 512, 158)
  const sign = new T.Mesh(
    new T.PlaneGeometry(3.8, 0.95),
    new T.MeshBasicMaterial({ map: new T.CanvasTexture(canvas), transparent: true, depthWrite: false })
  )
  sign.position.set(-3.4, 5.15, -4.31)
  root.add(sign)
  const neon = new T.PointLight('#ff7a8e', 14, 5.5, 2)
  neon.position.set(-3.4, 4.8, -3.8)
  root.add(neon)
  // Rain outside the window and dust inside: positions are functions of (index, time).
  const RAIN = 220,
    DUST = 90
  const rainArray = new Float32Array(RAIN * 6),
    rainGeo = new T.BufferGeometry()
  rainGeo.setAttribute('position', new T.BufferAttribute(rainArray, 3))
  const rain = new T.LineSegments(rainGeo, new T.LineBasicMaterial({ color: '#9db8dc', transparent: true, opacity: 0.4 }))
  rain.frustumCulled = false
  root.add(rain)
  const dustArray = new Float32Array(DUST * 3),
    dustGeo = new T.BufferGeometry()
  dustGeo.setAttribute('position', new T.BufferAttribute(dustArray, 3))
  const dust = new T.Points(dustGeo, new T.PointsMaterial({ color: '#f0cfa0', size: 0.025, transparent: true, opacity: 0.45, depthWrite: false }))
  dust.frustumCulled = false
  root.add(dust)
  const flicker = (sign.material as T.MeshBasicMaterial)
  return {
    root,
    update(time, settings) {
      const amount = settings.rain
      rain.visible = amount > 0
      ;(rain.material as T.LineBasicMaterial).opacity = amount * 0.55
      for (let i = 0; i < RAIN; i++) {
        const x = 0.6 + hash(i, 7) * 6.2,
          speed = 3 + hash(i, 8) * 2,
          y = 7.5 - (((time * speed + hash(i, 9) * 7) % 7.5) + 7.5) % 7.5,
          z = -5.2 - hash(i, 10) * 3.5
        rainArray.set([x, y, z, x - 0.05, y + 0.22 + amount * 0.1, z], i * 6)
      }
      rainGeo.attributes.position!.needsUpdate = true
      for (let i = 0; i < DUST; i++)
        dustArray.set(
          [
            -6 + hash(i, 11) * 12 + Math.sin(time * 0.17 + i) * 0.12,
            ((hash(i, 12) * 5 + time * 0.02) % 5) + 0.2,
            -4 + hash(i, 13) * 7
          ],
          i * 3
        )
      dustGeo.attributes.position!.needsUpdate = true
      // Neon buzz: a slow pulse plus a rare dip, both from time only.
      const dip = Math.pow(Math.max(0, Math.sin(time * 1.3 + 0.4)), 40)
      const pulse = 0.92 + 0.08 * Math.sin(time * 9) - dip * 0.35
      flicker.opacity = pulse
      neon.intensity = 14 * pulse
    },
    dispose() {
      disposeTree(root)
    }
  }
}
