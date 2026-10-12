import * as T from 'three'
import { disposeTree, hash } from '../engine/geometry'
import type { EnvironmentInstance } from './types'
export function buildStage(): EnvironmentInstance {
  const root = new T.Group()
  root.name = 'environment'
  root.add(new T.HemisphereLight('#6a6f88', '#1e1b22', 0.7))
  const key = new T.SpotLight('#ffe2c0', 110, 22, Math.PI / 5, 0.6, 1.6)
  key.position.set(3, 7, 5)
  key.target.position.set(0, 1, 0)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.normalBias = 0.03
  key.shadow.bias = -0.0004
  root.add(key, key.target)
  const rim = new T.SpotLight('#7fa8ff', 70, 20, Math.PI / 5, 0.7, 1.6)
  rim.position.set(-4, 5.5, -4)
  rim.target.position.set(0, 1.2, 0)
  root.add(rim, rim.target)
  const fill = new T.DirectionalLight('#c9b8d6', 0.35)
  fill.position.set(-3, 3, 6)
  root.add(fill)
  // Seamless cyclorama: floor, curved cove, back wall, one material.
  const cyc = new T.MeshStandardMaterial({ color: '#2a2b33', roughness: 0.95 })
  const floor = new T.Mesh(new T.PlaneGeometry(40, 40), cyc)
  floor.rotation.x = -Math.PI / 2
  floor.position.z = 2
  floor.receiveShadow = true
  root.add(floor)
  const cove = new T.Mesh(new T.CylinderGeometry(3, 3, 40, 24, 1, true, Math.PI, Math.PI / 2), cyc)
  cove.rotation.z = Math.PI / 2
  cove.position.set(0, 3, -6)
  cove.receiveShadow = true
  root.add(cove)
  const wall = new T.Mesh(new T.PlaneGeometry(40, 30), cyc)
  wall.position.set(0, 18, -9)
  wall.receiveShadow = true
  root.add(wall)
  // Soft pool of light on the floor, painted once.
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(128, 128, 10, 128, 128, 128)
  grad.addColorStop(0, 'rgba(255,230,200,0.55)')
  grad.addColorStop(0.5, 'rgba(255,220,190,0.18)')
  grad.addColorStop(1, 'rgba(255,220,190,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)
  const pool = new T.Mesh(
    new T.PlaneGeometry(9, 9),
    new T.MeshBasicMaterial({ map: new T.CanvasTexture(canvas), transparent: true, depthWrite: false })
  )
  pool.rotation.x = -Math.PI / 2
  pool.position.set(0, 0.005, 0.4)
  root.add(pool)
  // Light motes drifting in the beam.
  const N = 50
  const arr = new Float32Array(N * 3),
    geo = new T.BufferGeometry()
  geo.setAttribute('position', new T.BufferAttribute(arr, 3))
  const motes = new T.Points(geo, new T.PointsMaterial({ color: '#ffe9d0', size: 0.028, transparent: true, opacity: 0.4, depthWrite: false }))
  motes.frustumCulled = false
  root.add(motes)
  return {
    root,
    update(time) {
      for (let i = 0; i < N; i++)
        arr.set(
          [
            -3 + hash(i, 1) * 6 + Math.sin(time * 0.25 + i) * 0.2,
            0.3 + ((hash(i, 2) * 4 + time * 0.04) % 4),
            -2 + hash(i, 3) * 5
          ],
          i * 3
        )
      geo.attributes.position!.needsUpdate = true
    },
    dispose() {
      disposeTree(root)
    }
  }
}
