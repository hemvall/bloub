import * as T from 'three'
export function box(
  parent: T.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  color: string,
  emissive = false
) {
  const mesh = new T.Mesh(
    new T.BoxGeometry(...size),
    new T.MeshStandardMaterial({
      color,
      roughness: 0.78,
      ...(emissive ? { emissive: color, emissiveIntensity: 2 } : {})
    })
  )
  mesh.position.set(...position)
  mesh.castShadow = true
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
  color: string
) {
  const mesh = new T.Mesh(
    new T.CylinderGeometry(top, bottom, height, 16),
    new T.MeshStandardMaterial({ color, roughness: 0.55 })
  )
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
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
