import * as T from 'three'
import { disposeTree, hash } from '../engine/geometry'
import type { EnvironmentInstance } from './types'
const NODES = 14
/** An abstract dark space: a lit grid floor and a constellation of agent nodes that turns with time. */
export function buildAiLab(): EnvironmentInstance {
  const root = new T.Group()
  root.name = 'environment'
  root.add(new T.HemisphereLight('#4a6a8a', '#0a0c14', 0.9))
  const key = new T.SpotLight('#dfe9ff', 60, 20, Math.PI / 4, 0.6, 1.4)
  key.position.set(2.5, 6, 4)
  key.target.position.set(0, 1, 0)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.normalBias = 0.03
  root.add(key, key.target)
  const cyan = new T.PointLight('#43d9e8', 14, 12, 2)
  cyan.position.set(-4, 2.5, -2)
  root.add(cyan)
  const amber = new T.PointLight('#f6b042', 10, 12, 2)
  amber.position.set(4, 2, 1)
  root.add(amber)
  // Floor: a dark disc with a glowing grid drawn as line segments.
  const floor = new T.Mesh(new T.CircleGeometry(30, 48), new T.MeshStandardMaterial({ color: '#0b0f1a', roughness: 0.9 }))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  root.add(floor)
  const lines: number[] = []
  for (let i = -20; i <= 20; i++) lines.push(-20, 0.005, i, 20, 0.005, i, i, 0.005, -20, i, 0.005, 20)
  const gridGeo = new T.BufferGeometry()
  gridGeo.setAttribute('position', new T.Float32BufferAttribute(lines, 3))
  root.add(new T.LineSegments(gridGeo, new T.LineBasicMaterial({ color: '#1f3a5a', transparent: true, opacity: 0.55 })))
  // Constellation: nodes on a tilted ring behind the characters, linked to their neighbours.
  const graph = new T.Group()
  graph.position.set(0, 3.0, -4.5)
  graph.rotation.x = 0.35
  root.add(graph)
  const nodes: T.Mesh[] = []
  const nodeGeo = new T.SphereGeometry(1, 14, 10)
  for (let i = 0; i < NODES; i++) {
    const material = new T.MeshBasicMaterial({ color: i % 3 === 0 ? '#f6b042' : '#5fd6e6' })
    const node = new T.Mesh(nodeGeo, material)
    const r = 0.1 + hash(i, 1) * 0.1
    node.scale.setScalar(r)
    graph.add(node)
    nodes.push(node)
  }
  const linkArray = new Float32Array(NODES * 6)
  const linkGeo = new T.BufferGeometry()
  linkGeo.setAttribute('position', new T.BufferAttribute(linkArray, 3))
  graph.add(new T.LineSegments(linkGeo, new T.LineBasicMaterial({ color: '#2f7f99', transparent: true, opacity: 0.7 })))
  const place = (i: number, time: number) => {
    const a = (i / NODES) * Math.PI * 2 + time * 0.07
    const rad = 3 + hash(i, 2) * 1.2
    return [Math.cos(a) * rad, Math.sin(a * 2 + hash(i, 3) * 6) * 0.6, Math.sin(a) * rad * 0.55] as const
  }
  return {
    root,
    update(time) {
      for (let i = 0; i < NODES; i++) {
        const p = place(i, time)
        nodes[i]!.position.set(...p)
        const q = place((i + 1) % NODES, time)
        linkArray.set([...p, ...q], i * 6)
        const pulse = 0.85 + 0.15 * Math.sin(time * 2.1 + i * 1.3)
        nodes[i]!.scale.setScalar((0.1 + hash(i, 1) * 0.1) * pulse)
      }
      linkGeo.attributes.position!.needsUpdate = true
      cyan.intensity = 14 + Math.sin(time * 0.9) * 2
    },
    dispose() {
      nodeGeo.dispose()
      disposeTree(root)
    }
  }
}
