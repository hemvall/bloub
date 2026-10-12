import * as T from 'three'
/**
 * Illustrated look shared by characters and props: a stepped gradient map for
 * cel shading, and inverted-hull outlines whose width is set in world units so
 * the line weighs the same on a big body and a small ear.
 */
let gradient: T.DataTexture | undefined
export function toonGradient() {
  if (!gradient) {
    gradient = new T.DataTexture(new Uint8Array([92, 92, 92, 255, 160, 160, 160, 255, 212, 212, 212, 255, 236, 236, 236, 255]), 4, 1, T.RGBAFormat)
    gradient.minFilter = T.NearestFilter
    gradient.magFilter = T.NearestFilter
    gradient.generateMipmaps = false
    gradient.needsUpdate = true
  }
  return gradient
}
export const INK = '#1f2029'
export function toon(color: string) {
  return new T.MeshToonMaterial({ color, gradientMap: toonGradient() })
}
export function flat(color: string) {
  return new T.MeshBasicMaterial({ color })
}
let inkMaterial: T.MeshBasicMaterial | undefined
export function ink() {
  inkMaterial ??= new T.MeshBasicMaterial({ color: INK, side: T.BackSide })
  return inkMaterial
}
export const LINE = 0.026
export function outline(mesh: T.Mesh, width = LINE) {
  const shell = new T.Mesh(mesh.geometry, ink())
  shell.scale.set(
    1 + width / Math.max(1e-3, mesh.scale.x),
    1 + width / Math.max(1e-3, mesh.scale.y),
    1 + width / Math.max(1e-3, mesh.scale.z)
  )
  shell.renderOrder = -1
  mesh.add(shell)
  return shell
}
let sphere: T.SphereGeometry | undefined
export function sphereGeometry() {
  sphere ??= new T.SphereGeometry(1, 28, 20)
  return sphere
}
export function oval(
  parent: T.Object3D,
  position: [number, number, number],
  scale: [number, number, number],
  material: T.Material,
  outlined = true,
  shadow = true
) {
  const mesh = new T.Mesh(sphereGeometry(), material)
  mesh.position.set(...position)
  mesh.scale.set(...scale)
  mesh.castShadow = shadow
  mesh.receiveShadow = false
  parent.add(mesh)
  if (outlined) outline(mesh)
  return mesh
}
