import * as T from 'three'
import { box, cylinder, disposeTree, glow, hash } from '../engine/geometry'
import { createProp } from '../props/createProp'
import { skyline } from './city'
import type { EnvironmentInstance } from './types'
/** Lew's office at night: the desk is at z ≈ -1.2, the window on the back wall at z = -4. */
export function buildOfficeNight(): EnvironmentInstance {
  const root = new T.Group()
  root.name = 'environment'
  root.add(new T.HemisphereLight('#7f93b8', '#2a211f', 0.75))
  const moon = new T.DirectionalLight('#8fb0e6', 1.1)
  moon.position.set(2, 6, -6)
  moon.castShadow = true
  moon.shadow.mapSize.set(2048, 2048)
  moon.shadow.camera.left = moon.shadow.camera.bottom = -8
  moon.shadow.camera.right = moon.shadow.camera.top = 8
  moon.shadow.normalBias = 0.03
  moon.shadow.bias = -0.0005
  root.add(moon)
  const fill = new T.DirectionalLight('#ffd3a0', 0.5)
  fill.position.set(-4, 4, 5)
  root.add(fill)
  // Shell: plank floor, walls, ceiling, a rug under the desk.
  box(root, [10, 0.2, 9], [0, -0.1, 0], '#1d1a1e', { roughness: 0.6 })
  for (let i = 0; i < 16; i++) box(root, [0.02, 0.012, 9], [-4.8 + i * 0.64, 0.004, 0], '#2f282c', { shadow: false })
  box(root, [4.4, 0.03, 3.2], [-0.4, 0.015, -1.2], '#2a2f3d', { roughness: 1, shadow: false })
  box(root, [0.3, 3.8, 9], [-5, 1.9, 0], '#262a35')
  box(root, [0.3, 3.8, 9], [5, 1.9, 0], '#262a35')
  box(root, [10, 0.3, 9], [0, 3.8, 0], '#1b1c24', { shadow: false })
  // Back wall with a wide window: two piers and a lintel leave the opening.
  box(root, [1.5, 3.8, 0.3], [-4.25, 1.9, -4.05], '#2b2f3a')
  box(root, [1.5, 3.8, 0.3], [4.25, 1.9, -4.05], '#2b2f3a')
  box(root, [7, 0.5, 0.3], [0, 3.55, -4.05], '#2b2f3a')
  box(root, [7, 1.1, 0.3], [0, 0.55, -4.05], '#2b2f3a')
  box(root, [7.2, 0.1, 0.5], [0, 1.1, -3.95], '#4a4036')
  for (const x of [-2.33, 0, 2.33]) box(root, [0.06, 2.2, 0.08], [x, 2.2, -3.98], '#3d4350', { shadow: false })
  box(root, [7, 0.06, 0.08], [0, 2.2, -3.98], '#3d4350', { shadow: false })
  const pane = new T.Mesh(
    new T.PlaneGeometry(7, 2.2),
    new T.MeshPhysicalMaterial({ color: '#8fb0d8', transparent: true, opacity: 0.07, roughness: 0.05, metalness: 0.2 })
  )
  pane.position.set(0, 2.2, -4.0)
  root.add(pane)
  box(root, [60, 30, 0.1], [0, 8, -26], '#0a1020', { shadow: false })
  skyline(root, { x: 0, z: -9, count: 30, spread: 36, seed: 40 })
  // The desk, its lamp and shelves; the props on it come from the catalog dressing.
  box(root, [2.6, 0.07, 1.1], [-0.6, 0.755, -1.3], '#4d3a2c', { roughness: 0.4 })
  for (const x of [-1.8, 0.6]) box(root, [0.08, 0.72, 0.9], [x, 0.36, -1.3], '#2c2a2e')
  box(root, [0.9, 0.5, 0.95], [0.15, 0.25, -1.3], '#2f2d33')
  cylinder(root, 0.1, 0.13, 0.03, [-1.75, 0.805, -1.7], '#2b2a2e', { metalness: 0.4 })
  cylinder(root, 0.012, 0.012, 0.5, [-1.75, 1.05, -1.7], '#2b2a2e', { metalness: 0.4 })
  cylinder(root, 0.09, 0.17, 0.16, [-1.62, 1.33, -1.6], '#e2b069', { roughness: 0.7 })
  glow(root, 0.04, [-1.62, 1.28, -1.6], '#ffe3ad')
  const lamp = new T.PointLight('#ffcf8f', 9, 5.5, 2)
  lamp.position.set(-1.62, 1.25, -1.6)
  root.add(lamp)
  const screenGlow = new T.PointLight('#8fb7ff', 3, 3, 2)
  screenGlow.position.set(-0.9, 1.2, -1.4)
  root.add(screenGlow)
  for (let row = 0; row < 4; row++) {
    const y = 0.9 + row * 0.7
    box(root, [0.3, 0.04, 2.4], [-4.7, y, -1.5], '#5c4634')
    for (let i = 0; i < 7; i++) {
      const h = 0.22 + hash(row * 10 + i, 2) * 0.12
      box(root, [0.18, h, 0.06 + hash(row * 10 + i, 3) * 0.05], [-4.7, y + h / 2 + 0.02, -2.6 + i * 0.33], ['#9c4f45', '#4b7466', '#5d6a9c', '#b6894b', '#7a5a7c'][(i + row) % 5]!, { shadow: false })
    }
  }
  box(root, [0.08, 2.2, 0.9], [-4.84, 1.1, 2.2], '#2d2b32')
  box(root, [0.06, 1.9, 0.75], [-4.85, 1.0, 2.2], '#1f1e24', { shadow: false })
  root.add(createProp({ id: 'office-plant-2', kind: 'plant', position: [3.9, 0, 2.6], rotation: [0, 1, 0], scale: 1.5, color: '#4f8a55' }))
  // Dust in the lamp light.
  const DUST = 60
  const dustArray = new Float32Array(DUST * 3),
    dustGeo = new T.BufferGeometry()
  dustGeo.setAttribute('position', new T.BufferAttribute(dustArray, 3))
  const dust = new T.Points(dustGeo, new T.PointsMaterial({ color: '#f0cfa0', size: 0.022, transparent: true, opacity: 0.4, depthWrite: false }))
  dust.frustumCulled = false
  root.add(dust)
  return {
    root,
    update(time) {
      for (let i = 0; i < DUST; i++)
        dustArray.set(
          [-3 + hash(i, 11) * 5 + Math.sin(time * 0.17 + i) * 0.1, ((hash(i, 12) * 2.6 + time * 0.02) % 2.6) + 0.4, -3 + hash(i, 13) * 4],
          i * 3
        )
      dustGeo.attributes.position!.needsUpdate = true
      lamp.intensity = 9 + 0.25 * Math.sin(time * 11.3)
    },
    dispose() {
      disposeTree(root)
    }
  }
}
