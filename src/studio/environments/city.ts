import * as T from 'three'
import { box, hash } from '../engine/geometry'
/** A layered block of lit towers behind a window: shared by the sets that look over a city. */
export function skyline(root: T.Group, options: { x: number; z: number; count: number; spread: number; seed: number; lit?: number }) {
  const warm: [number, number, number][] = [],
    cool: [number, number, number][] = []
  for (let i = 0; i < options.count; i++) {
    const s = options.seed + i
    const x = options.x - options.spread / 2 + (i / options.count) * options.spread + hash(s, 1) * 0.8,
      h = 2.5 + hash(s, 2) * 8,
      z = options.z - (i % 4) * 2.4 - hash(s, 3) * 2
    box(root, [1 + hash(s, 4) * 0.8, h, 1.2], [x, h / 2 - 1, z], i % 2 ? '#111a2b' : '#162238', { shadow: false })
    for (let row = 0; row < Math.floor(h / 0.5); row++)
      for (let col = 0; col < 3; col++) {
        if (hash(s * 100 + row * 3 + col, 5) < 1 - (options.lit ?? 0.65)) continue
        ;(hash(s * 7 + row, 6) < 0.6 ? warm : cool).push([x - 0.3 + col * 0.3, row * 0.5 - 0.6, z + 0.62])
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
}
