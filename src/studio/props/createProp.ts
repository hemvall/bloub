import * as T from 'three'
import type { PropData } from '../scene/model'
import { cylinder, box } from '../engine/geometry'
import { oval, toon } from '../engine/toon'
import { isScreenId, isScreenImage, paintScreen, paintWhiteboard } from './screens'
function screenMaterial(content: string | undefined, width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  if (content && isScreenImage(content)) {
    const texture = new T.TextureLoader().load(content)
    texture.colorSpace = T.SRGBColorSpace
    return new T.MeshBasicMaterial({ map: texture, toneMapped: false })
  }
  paintScreen(content && isScreenId(content) ? content : 'blank', canvas)
  const texture = new T.CanvasTexture(canvas)
  texture.colorSpace = T.SRGBColorSpace
  return new T.MeshBasicMaterial({ map: texture, toneMapped: false })
}
function screen(parent: T.Object3D, size: [number, number], position: [number, number, number], content: string | undefined, pixels: [number, number]) {
  const mesh = new T.Mesh(new T.PlaneGeometry(...size), screenMaterial(content, ...pixels))
  mesh.position.set(...position)
  parent.add(mesh)
  const light = new T.PointLight('#9fc4ff', 0.6, 1.4, 2)
  light.position.set(position[0], position[1], position[2] + 0.15)
  parent.add(light)
  return mesh
}
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
    // Screens face +z: rotate the prop so its display looks where it should.
    case 'laptop': {
      tint(box(root, [0.62, 0.025, 0.42], [0, 0.0125, 0], data.color, { roughness: 0.5, metalness: 0.3 }))
      box(root, [0.5, 0.004, 0.2], [0, 0.027, 0.02], '#15171c', { shadow: false })
      box(root, [0.16, 0.003, 0.1], [0, 0.027, 0.15], '#1d2027', { shadow: false })
      const hinge = new T.Group()
      hinge.position.set(0, 0.025, -0.2)
      hinge.rotation.x = -0.32
      root.add(hinge)
      tint(box(hinge, [0.62, 0.42, 0.02], [0, 0.21, 0], data.color, { roughness: 0.5, metalness: 0.3 }))
      screen(hinge, [0.56, 0.35], [0, 0.215, 0.011], data.screen, [512, 320])
      break
    }
    case 'monitor': {
      cylinder(root, 0.16, 0.18, 0.02, [0, 0.01, 0], '#2a2d35', { metalness: 0.5, roughness: 0.4 })
      box(root, [0.05, 0.3, 0.04], [0, 0.17, -0.02], '#2a2d35', { metalness: 0.5, roughness: 0.4 })
      tint(box(root, [0.9, 0.52, 0.035], [0, 0.58, 0], data.color, { roughness: 0.5, metalness: 0.2 }))
      screen(root, [0.84, 0.46], [0, 0.58, 0.019], data.screen, [768, 420])
      break
    }
    case 'phone': {
      const body = new T.Group()
      body.rotation.x = -0.35
      body.position.y = 0.01
      root.add(body)
      tint(box(body, [0.09, 0.18, 0.012], [0, 0.09, 0], data.color, { roughness: 0.3, metalness: 0.4 }))
      screen(body, [0.08, 0.165], [0, 0.09, 0.0065], data.screen, [288, 608])
      break
    }
    case 'coffee': {
      cylinder(root, 0.06, 0.045, 0.14, [0, 0.07, 0], '#f1ece2', { roughness: 0.7 })
      tint(cylinder(root, 0.062, 0.054, 0.06, [0, 0.085, 0], data.color, { roughness: 0.8 }))
      cylinder(root, 0.065, 0.062, 0.018, [0, 0.149, 0], '#3a3a40', { roughness: 0.5 })
      cylinder(root, 0.02, 0.02, 0.012, [0, 0.163, 0], '#3a3a40', { roughness: 0.5 })
      break
    }
    case 'whiteboard': {
      box(root, [1.6, 1.05, 0.04], [0, 0, 0], '#c9ccd2', { metalness: 0.4, roughness: 0.4 })
      const canvas = document.createElement('canvas')
      canvas.width = 768
      canvas.height = 500
      paintWhiteboard(canvas)
      const texture = new T.CanvasTexture(canvas)
      texture.colorSpace = T.SRGBColorSpace
      const face = new T.Mesh(new T.PlaneGeometry(1.52, 0.97), new T.MeshStandardMaterial({ map: texture, roughness: 0.6 }))
      face.position.set(0, 0, 0.021)
      face.receiveShadow = true
      root.add(face)
      box(root, [1.0, 0.03, 0.08], [0, -0.52, 0.05], '#b9bcc4', { metalness: 0.4 })
      for (const [x, color] of [
        [-0.2, '#c24b3a'],
        [-0.1, '#24324a'],
        [0, '#2f7a4e']
      ] as const) {
        const marker = cylinder(root, 0.012, 0.012, 0.12, [x, -0.49, 0.06], color, { roughness: 0.4 })
        marker.rotation.z = Math.PI / 2
      }
      break
    }
    case 'documents': {
      for (let i = 0; i < 4; i++) {
        const sheet = tint(box(root, [0.3, 0.004, 0.4], [i * 0.012, 0.002 + i * 0.005, -i * 0.01], data.color, { roughness: 1, shadow: false }))
        sheet.rotation.y = i * 0.06
      }
      for (let i = 0; i < 6; i++) box(root, [0.2 - (i % 3) * 0.03, 0.002, 0.012], [0.03, 0.026, -0.14 + i * 0.045], '#8a8f98', { shadow: false })
      box(root, [0.1, 0.002, 0.02], [-0.07, 0.026, -0.17], '#3b6e8f', { shadow: false })
      break
    }
    case 'server': {
      tint(box(root, [0.6, 1.9, 0.8], [0, 0.95, 0], data.color, { roughness: 0.5, metalness: 0.5 }))
      for (let i = 0; i < 9; i++) {
        const y = 0.2 + i * 0.19
        box(root, [0.52, 0.14, 0.02], [0, y, 0.405], i % 3 === 2 ? '#2a3240' : '#222a36', { metalness: 0.4, roughness: 0.5 })
        for (let j = 0; j < 4; j++) {
          const on = (i * 7 + j * 3) % 5 !== 0
          const led = new T.Mesh(new T.BoxGeometry(0.02, 0.02, 0.01), new T.MeshBasicMaterial({ color: on ? (j === 3 ? '#f6b042' : '#5fd68a') : '#243029' }))
          led.position.set(-0.2 + j * 0.05, y, 0.42)
          root.add(led)
        }
      }
      const light = new T.PointLight('#5fd6e6', 1.5, 2.5, 2)
      light.position.set(0, 1, 0.6)
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
/** Kinds with a display: their `screen` field is meaningful and the inspector shows a picker. */
export const SCREEN_PROPS: PropData['kind'][] = ['laptop', 'monitor', 'phone']
