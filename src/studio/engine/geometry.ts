import * as T from 'three'
export function box(
  parent: T.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  color: string,
  options: { emissive?: number; roughness?: number; metalness?: number; shadow?: boolean } = {}
) {
  const mesh = new T.Mesh(
    new T.BoxGeometry(...size),
    new T.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.8,
      metalness: options.metalness ?? 0,
      ...(options.emissive ? { emissive: color, emissiveIntensity: options.emissive } : {})
    })
  )
  mesh.position.set(...position)
  mesh.castShadow = options.shadow ?? true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}
export function cylinder(
  parent: T.Object3D,
  top: number,
  bottom: number,
  height: number,
  position: [number, number, number],
  color: string,
  options: { roughness?: number; metalness?: number; segments?: number; emissive?: number } = {}
) {
  const mesh = new T.Mesh(
    new T.CylinderGeometry(top, bottom, height, options.segments ?? 18),
    new T.MeshStandardMaterial({
      color,
      roughness: options.roughness ?? 0.6,
      metalness: options.metalness ?? 0,
      ...(options.emissive ? { emissive: color, emissiveIntensity: options.emissive } : {})
    })
  )
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}
export function glow(parent: T.Object3D, radius: number, position: [number, number, number], color: string) {
  const mesh = new T.Mesh(new T.SphereGeometry(radius, 12, 8), new T.MeshBasicMaterial({ color }))
  mesh.position.set(...position)
  parent.add(mesh)
  return mesh
}
/** Deterministic pseudo-random in [0, 1) from an index: layouts never change between loads. */
export function hash(i: number, salt = 0) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}
export function disposeTree(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>(),
    textures = new Set<T.Texture>()
  root.traverse((o) => {
    if (o instanceof T.Mesh || o instanceof T.Points || o instanceof T.Line) {
      geometries.add(o.geometry)
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        materials.add(m)
        for (const value of Object.values(m)) if (value instanceof T.Texture) textures.add(value)
      }
    }
    if (o instanceof T.Light && 'shadow' in o) (o as T.DirectionalLight).shadow?.dispose()
  })
  textures.forEach((t) => t.dispose())
  materials.forEach((m) => m.dispose())
  geometries.forEach((g) => g.dispose())
}
