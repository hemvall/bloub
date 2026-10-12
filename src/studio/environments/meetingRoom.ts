import * as T from 'three'
import { box, cylinder, disposeTree } from '../engine/geometry'
import type { EnvironmentInstance } from './types'
/** A daylight meeting room: the table runs along z around z ≈ -0.6, the wall screen hangs at z = -4.4. */
export function buildMeetingRoom(): EnvironmentInstance {
  const root = new T.Group()
  root.name = 'environment'
  root.add(new T.HemisphereLight('#dfe7f2', '#6b6560', 1.1))
  const sun = new T.DirectionalLight('#fff3e0', 1.6)
  sun.position.set(6, 7, 3)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.camera.left = sun.shadow.camera.bottom = -8
  sun.shadow.camera.right = sun.shadow.camera.top = 8
  sun.shadow.normalBias = 0.03
  sun.shadow.bias = -0.0005
  root.add(sun)
  const fill = new T.DirectionalLight('#c8d8f0', 0.5)
  fill.position.set(-5, 4, 5)
  root.add(fill)
  // Shell: carpet, three walls, the glass wall on the right with blinds.
  box(root, [10, 0.2, 9], [0, -0.1, 0], '#5a6068', { roughness: 1 })
  box(root, [10, 0.3, 9], [0, 3.4, 0], '#eceff3', { shadow: false })
  box(root, [10, 3.4, 0.3], [0, 1.7, -4.6], '#dde2e8')
  box(root, [0.3, 3.4, 9], [-5, 1.7, 0], '#d6dbe2')
  for (let i = 0; i < 24; i++) box(root, [0.04, 0.05, 9], [4.95, 0.45 + i * 0.12, 0], '#f2f4f6', { shadow: false })
  box(root, [0.1, 3.4, 0.1], [4.95, 1.7, -4.5], '#aab2bc')
  box(root, [0.1, 3.4, 0.1], [4.95, 1.7, 4.5], '#aab2bc')
  const glass = new T.Mesh(
    new T.PlaneGeometry(9, 3.4),
    new T.MeshPhysicalMaterial({ color: '#cfe0f0', transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.1, side: T.DoubleSide })
  )
  glass.rotation.y = -Math.PI / 2
  glass.position.set(4.96, 1.7, 0)
  root.add(glass)
  box(root, [0.1, 20, 30], [12, 6, 0], '#9fb6cc', { shadow: false })
  // Ceiling panels: three emissive slabs plus the lights that actually do the work.
  for (const z of [-2.6, -0.6, 1.4]) {
    box(root, [2.4, 0.04, 0.9], [0, 3.24, z], '#ffffff', { emissive: 1.4, shadow: false })
    const panel = new T.PointLight('#f5f7ff', 6, 7, 2)
    panel.position.set(0, 3.1, z)
    root.add(panel)
  }
  // Table and chairs.
  box(root, [3.8, 0.07, 1.4], [0, 0.755, -0.6], '#e9e4da', { roughness: 0.35 })
  box(root, [3.4, 0.68, 0.5], [0, 0.35, -0.6], '#b9b1a4')
  for (const [x, z, yaw] of [
    [-1.2, 0.5, Math.PI],
    [0, 0.5, Math.PI],
    [1.2, 0.5, Math.PI],
    [-1.2, -1.7, 0],
    [1.2, -1.7, 0]
  ] as const) {
    const chair = new T.Group()
    chair.position.set(x, 0, z)
    chair.rotation.y = yaw
    root.add(chair)
    box(chair, [0.5, 0.06, 0.5], [0, 0.46, 0], '#3b3f48', { roughness: 0.6 })
    box(chair, [0.5, 0.5, 0.06], [0, 0.74, -0.24], '#3b3f48', { roughness: 0.6 })
    cylinder(chair, 0.03, 0.03, 0.44, [0, 0.22, 0], '#8b8f98', { metalness: 0.6 })
    cylinder(chair, 0.26, 0.28, 0.03, [0, 0.015, 0], '#8b8f98', { metalness: 0.6 })
  }
  // Wall screen mount and a plant in the corner.
  box(root, [2.6, 1.5, 0.05], [0, 2.1, -4.43], '#2a2d33')
  cylinder(root, 0.22, 0.18, 0.4, [-4.3, 0.2, 3.6], '#9aa0a8')
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    const leaf = box(root, [0.1, 0.7, 0.04], [-4.3 + Math.cos(a) * 0.15, 0.75, 3.6 + Math.sin(a) * 0.15], '#5b8f5f', { shadow: false })
    leaf.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5)
  }
  return {
    root,
    update() {
      /* Daylight is still; nothing moves on its own in this set. */
    },
    dispose() {
      disposeTree(root)
    }
  }
}
