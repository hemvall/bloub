import * as T from 'three'
import type { PropData } from '../scene/model'
import { cylinder } from '../engine/geometry'
export function createProp(data: PropData) {
  const root = new T.Group()
  root.name = data.id
  root.userData.selectId = data.id
  if (data.kind === 'bottle') {
    cylinder(root, 0.105, 0.11, 0.4, [0, 0.2, 0], data.color)
    cylinder(root, 0.045, 0.07, 0.23, [0, 0.49, 0], data.color)
    cylinder(root, 0.049, 0.049, 0.06, [0, 0.63, 0], '#b8a379')
    cylinder(root, 0.112, 0.112, 0.13, [0, 0.22, 0], '#d5c6a2')
  } else {
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
    cylinder(root, 0.125, 0.105, 0.12, [0, 0.08, 0], '#b56b29')
  }
  root.position.set(...data.position)
  root.rotation.set(...data.rotation)
  root.scale.setScalar(data.scale)
  return root
}
