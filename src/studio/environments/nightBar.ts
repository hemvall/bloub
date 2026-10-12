import * as T from 'three'
import { box, cylinder } from '../engine/geometry'
import { createProp } from '../props/createProp'
export interface NightBar {
  root: T.Group
  rain: T.LineSegments
  dust: T.Points
  update: (time: number, rain: number) => void
}
export function nightBar(): NightBar {
  const root = new T.Group()
  root.name = 'environment'
  root.userData.selectId = 'environment'
  box(root, [14, 0.2, 12], [0, -0.13, 0], '#241f23')
  for (let i = 0; i < 22; i++) box(root, [0.022, 0.01, 12], [-6.8 + i * 0.64, -0.022, 0], '#423235')
  box(root, [0.3, 7, 12], [-7, 3.4, 0], '#302b32')
  box(root, [0.3, 7, 12], [7, 3.4, 0], '#302b32')
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
    new T.MeshStandardMaterial({ color: '#393039', roughness: 1 })
  )
  wallMesh.position.z = -4.8
  wallMesh.receiveShadow = true
  root.add(wallMesh)
  for (let x = -6.8; x < 7; x += 0.4) box(root, [0.018, 1.05, 0.025], [x, 0.55, -4.56], '#58433c')
  box(root, [14, 0.08, 0.12], [0, 1.05, -4.5], '#78604a')
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
      new T.MeshStandardMaterial({ color: '#aa8770', metalness: 0.35, roughness: 0.4 })
    )
  )
  box(root, [4.25, 0.14, 0.5], [3.3, 1.1, -4.4], '#82705e')
  box(root, [0.07, 4.5, 0.1], [3.3, 3.3, -4.48], '#967c67')
  box(root, [4, 0.07, 0.1], [3.3, 3.5, -4.48], '#967c67')
  const windowTarget = new T.Object3D()
  windowTarget.name = 'window'
  windowTarget.position.set(3.3, 3.4, -5)
  root.add(windowTarget)
  box(root, [30, 20, 0.1], [3, 6, -18], '#10192b')
  const windowPositions: [number, number, number][][] = [[], []]
  for (let i = 0; i < 18; i++) {
    const x = -10 + i * 1.4,
      h = 2.2 + ((i * 17) % 9) * 0.55,
      z = -10 - (i % 3) * 2
    box(root, [1.1, h, 1], [x, h / 2 - 1, z], i % 2 ? '#152232' : '#1b2a3b')
    for (let row = 0; row < Math.floor(h / 0.55); row++)
      for (let col = 0; col < 3; col++) {
        if ((i + row * 3 + col) % 4 === 0) continue
        windowPositions[(i + row) % 3 ? 0 : 1]!.push([
          x - 0.32 + col * 0.32,
          row * 0.55 - 0.5,
          z + 0.52
        ])
      }
  }
  windowPositions.forEach((positions, index) => {
    const color = index ? '#b78355' : '#6e7ca0'
    const windows = new T.InstancedMesh(
      new T.BoxGeometry(0.13, 0.19, 0.03),
      new T.MeshBasicMaterial({ color }),
      positions.length
    )
    positions.forEach((position, i) =>
      windows.setMatrixAt(i, new T.Matrix4().makeTranslation(...position))
    )
    windows.instanceMatrix.needsUpdate = true
    root.add(windows)
  })
  // Counter, brass foot rail, and individually spaced stools reveal real parallax.
  const counter = new T.Group()
  counter.name = 'counter'
  counter.userData.selectId = 'counter'
  root.add(counter)
  box(counter, [10.8, 1.72, 1.05], [0, 0.86, 0], '#35252a')
  for (let i = 0; i < 28; i++)
    box(counter, [0.18, 1.5, 0.07], [-5.2 + i * 0.385, 0.86, 0.56], '#584036')
  box(counter, [11.2, 0.21, 1.65], [0, 1.82, 0], '#986945')
  box(counter, [11.25, 0.035, 0.06], [0, 1.9, 0.84], '#d4a76b')
  for (let i = 0; i < 4; i++)
    box(counter, [11.1, 0.012, 0.008], [0, 1.931, -0.6 + i * 0.36], '#604934')
  const rail = cylinder(root, 0.035, 0.035, 10, [0, 0.35, 0.85], '#b48a53')
  rail.rotation.z = Math.PI / 2
  for (const x of [-4, -1.8, 1.8, 4]) {
    cylinder(root, 0.42, 0.43, 0.14, [x, 1.2, 1.65], '#543d40')
    cylinder(root, 0.045, 0.045, 1.12, [x, 0.58, 1.65], '#a18566')
    cylinder(root, 0.35, 0.38, 0.055, [x, 0.035, 1.65], '#403943')
    const ring = new T.Mesh(
      new T.TorusGeometry(0.25, 0.025, 8, 24),
      new T.MeshStandardMaterial({ color: '#a18566' })
    )
    ring.rotation.x = Math.PI / 2
    ring.position.set(x, 0.43, 1.65)
    root.add(ring)
  }
  // Recessed bottle shelves, each with a small practical strip light.
  box(root, [6.4, 3, 0.24], [-3.5, 3.1, -4.47], '#1e242b')
  for (let row = 0; row < 3; row++) {
    const y = 1.8 + row * 1.05
    box(root, [6.4, 0.12, 0.55], [-3.5, y, -4.15], '#725541')
    box(root, [6.2, 0.025, 0.025], [-3.5, y - 0.05, -3.88], '#dc9b51', true)
    for (let i = 0; i < 12; i++)
      root.add(
        createProp({
          id: `shelf-${row}-${i}`,
          kind: 'bottle',
          position: [-6.3 + i * 0.5, y + 0.08, -4.12],
          rotation: [0, 0, 0],
          scale: 0.65 + ((i * 7 + row) % 4) * 0.12,
          color: ['#4b8676', '#bb774c', '#637aa0', '#a95569'][i % 4]!
        })
      )
  }
  for (const x of [-3.6, 0, 3.6]) {
    cylinder(root, 0.018, 0.018, 1.6, [x, 5.7, 0], '#302b31')
    cylinder(root, 0.18, 0.58, 0.36, [x, 4.77, 0], '#39353c')
    const bulb = new T.Mesh(
      new T.SphereGeometry(0.11, 12, 8),
      new T.MeshBasicMaterial({ color: '#ffe0a2' })
    )
    bulb.position.set(x, 4.53, 0)
    root.add(bulb)
    const lamp = new T.PointLight('#ffd39a', 22, 7, 2)
    lamp.position.set(x, 4.42, 0)
    root.add(lamp)
  }
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, 1024, 256)
  ctx.textAlign = 'center'
  ctx.font = 'italic 100px Georgia'
  ctx.shadowColor = '#ff837e'
  ctx.shadowBlur = 22
  ctx.fillStyle = '#ffd1b9'
  ctx.fillText('the last light', 512, 155)
  const sign = new T.Mesh(
    new T.PlaneGeometry(3.8, 0.95),
    new T.MeshBasicMaterial({
      map: new T.CanvasTexture(canvas),
      transparent: true,
      depthWrite: false
    })
  )
  sign.position.set(-3.4, 5.15, -4.31)
  root.add(sign)
  const neon = new T.PointLight('#ff737d', 12, 5)
  neon.position.set(-3.4, 4.7, -3.8)
  root.add(neon)
  const rainArray = new Float32Array(180 * 6),
    rainGeo = new T.BufferGeometry()
  rainGeo.setAttribute('position', new T.BufferAttribute(rainArray, 3))
  const rain = new T.LineSegments(
    rainGeo,
    new T.LineBasicMaterial({ color: '#90b3da', transparent: true, opacity: 0.38 })
  )
  rain.frustumCulled = false
  root.add(rain)
  const dustArray = new Float32Array(70 * 3),
    dustGeo = new T.BufferGeometry()
  dustGeo.setAttribute('position', new T.BufferAttribute(dustArray, 3))
  const dust = new T.Points(
    dustGeo,
    new T.PointsMaterial({
      color: '#efc89f',
      size: 0.022,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    })
  )
  dust.frustumCulled = false
  root.add(dust)
  return {
    root,
    rain,
    dust,
    update(time, amount) {
      rain.visible = amount > 0
      ;(rain.material as T.LineBasicMaterial).opacity = amount * 0.5
      for (let i = 0; i < 180; i++) {
        const x = -1 + ((i * 0.618033) % 1) * 9,
          y = 7 - ((time * 3.4 + i * 0.371) % 7),
          z = -5.3 - ((i * 0.4142) % 1) * 3
        rainArray.set([x, y, z, x - 0.08, y + 0.28, z], i * 6)
      }
      rainGeo.attributes.position!.needsUpdate = true
      for (let i = 0; i < 70; i++)
        dustArray.set(
          [
            -6 + ((i * 0.618) % 1) * 12 + Math.sin(time * 0.17 + i) * 0.1,
            (i * 0.37 + time * 0.018) % 5,
            -4 + ((i * 0.414) % 1) * 7
          ],
          i * 3
        )
      dustGeo.attributes.position!.needsUpdate = true
    }
  }
}
