import * as T from 'three'
import type { PropData } from '../scene/model'
import { cylinder, box } from '../engine/geometry'
import { oval, toon } from '../engine/toon'
export function createProp(data: PropData) {
  const root = new T.Group()
  root.name = data.id
  const tint = (mesh: T.Mesh) => {
    mesh.userData.tint = true
    return mesh
  }
  switch (data.kind) {
    case 'bottle':
      tint(cylinder(root, 0.105, 0.11, 0.4, [0, 0.2, 0], data.color, { roughness: 0.3 }))
      tint(cylinder(root, 0.045, 0.07, 0.23, [0, 0.49, 0], data.color, { roughness: 0.3 }))
      cylinder(root, 0.049, 0.049, 0.06, [0, 0.63, 0], '#b8a379')
      cylinder(root, 0.112, 0.112, 0.13, [0, 0.22, 0], '#d5c6a2', { roughness: 0.9 })
      break
    case 'glass': {
      const glass = cylinder(root, 0.15, 0.11, 0.3, [0, 0.15, 0], data.color)
      glass.material.dispose()
      glass.material = new T.MeshPhysicalMaterial({
        color: data.color,
        transparent: true,
        opacity: 0.55,
        roughness: 0.1,
        metalness: 0.1,
        side: T.DoubleSide
      })
      tint(glass)
      cylinder(root, 0.125, 0.105, 0.12, [0, 0.08, 0], '#b56b29', { roughness: 0.2 })
      break
    }
    case 'cup': {
      tint(cylinder(root, 0.13, 0.1, 0.22, [0, 0.11, 0], data.color, { roughness: 0.5 }))
      cylinder(root, 0.115, 0.115, 0.02, [0, 0.215, 0], '#4a2a1c', { roughness: 0.4 })
      const handle = new T.Mesh(new T.TorusGeometry(0.07, 0.02, 8, 16), new T.MeshStandardMaterial({ color: data.color }))
      handle.position.set(0.14, 0.12, 0)
      tint(handle)
      root.add(handle)
      break
    }
    case 'plant': {
      cylinder(root, 0.16, 0.12, 0.26, [0, 0.13, 0], '#b8674a', { roughness: 0.9 })
      const leaf = toon(data.color)
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2
        const l = oval(root, [Math.cos(a) * 0.12, 0.42 + (i % 2) * 0.08, Math.sin(a) * 0.12], [0.07, 0.22, 0.14], leaf, false)
        l.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5)
        tint(l)
      }
      break
    }
    case 'book':
      tint(box(root, [0.42, 0.06, 0.3], [0, 0.03, 0], data.color, { roughness: 0.9 }))
      box(root, [0.43, 0.04, 0.27], [0.02, 0.03, 0], '#f1e8d6', { roughness: 1, shadow: false })
      break
    case 'lamp': {
      cylinder(root, 0.12, 0.14, 0.03, [0, 0.015, 0], '#2b2a2e', { metalness: 0.4, roughness: 0.4 })
      cylinder(root, 0.015, 0.015, 0.5, [0, 0.26, 0], '#2b2a2e', { metalness: 0.4, roughness: 0.4 })
      tint(cylinder(root, 0.1, 0.19, 0.2, [0, 0.58, 0], data.color, { roughness: 0.8 }))
      const bulb = new T.Mesh(new T.SphereGeometry(0.05, 10, 8), new T.MeshBasicMaterial({ color: '#ffe6b8' }))
      bulb.position.set(0, 0.52, 0)
      root.add(bulb)
      const light = new T.PointLight('#ffd9a0', 6, 4, 2)
      light.position.set(0, 0.5, 0)
      root.add(light)
      break
    }
  }
  root.traverse((o) => {
    o.userData.selectId = data.id
  })
  root.position.set(...data.position)
  root.rotation.set(...data.rotation)
  root.scale.setScalar(data.scale)
  return root
}
/** Props recolour in place; only meshes flagged at build time follow the document colour. */
export function tintProp(root: T.Object3D, color: string) {
  root.traverse((o) => {
    if (o instanceof T.Mesh && o.userData.tint)
      (o.material as T.MeshStandardMaterial | T.MeshToonMaterial).color.set(color)
  })
}
