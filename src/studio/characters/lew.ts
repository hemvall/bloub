import * as T from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { CharacterRig } from './rig'
import { flat, INK, outline, oval, toon } from '../engine/toon'
export const LEW_ACCENT = '#f6b042'
/**
 * Lew: the brand character. Soft squared head, one amber fin swept back, half-lidded
 * eyes and low brows. The fin is what makes the silhouette readable in profile; the
 * square head is what separates it from every round character on screen.
 */
export function buildLew(rig: CharacterRig) {
  const coat = rig.coat
  const accent = toon(LEW_ACCENT)
  const dark = toon('#28394a')
  oval(rig.body, [0, 0.5, 0], [0.36, 0.5, 0.32], coat)
  const collar = new T.Mesh(new T.TorusGeometry(0.29, 0.065, 8, 24), accent)
  collar.rotation.x = Math.PI / 2
  collar.position.y = 0.94
  collar.castShadow = true
  rig.body.add(collar)
  outline(collar, 0.02)
  oval(rig.body, [-0.17, 0.05, 0.1], [0.15, 0.07, 0.21], dark)
  oval(rig.body, [0.17, 0.05, 0.1], [0.15, 0.07, 0.21], dark)
  for (const [arm, side] of [
    [rig.leftArm, -1],
    [rig.rightArm, 1]
  ] as const) {
    arm.position.set(side * 0.35, 0.7, 0.02)
    oval(arm, [side * 0.02, -0.22, 0], [0.1, 0.25, 0.1], coat)
  }
  rig.metrics = {
    headHeight: 1.02,
    earRest: [0, 0],
    earLift: 0.8,
    armRest: [0.3, -0.3],
    mouthWidth: 0.085
  }
  const head = new T.Mesh(new RoundedBoxGeometry(1.24, 1.0, 0.98, 5, 0.3), coat)
  head.position.set(0, 0.5, 0)
  head.castShadow = true
  rig.head.add(head)
  outline(head)
  // One fin, swept back: built in the XY plane then turned so +x points behind the head.
  const fin = new T.Shape()
  fin.moveTo(-0.14, 0)
  fin.lineTo(0.16, 0)
  fin.quadraticCurveTo(0.35, 0.3, 0.6, 0.55)
  fin.quadraticCurveTo(0.2, 0.42, -0.14, 0)
  const finMesh = new T.Mesh(
    new T.ExtrudeGeometry(fin, { depth: 0.09, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 2 }),
    accent
  )
  finMesh.rotation.y = Math.PI / 2
  finMesh.position.set(0.045, 0, -0.08)
  finMesh.castShadow = true
  rig.leftEar.position.set(0, 0.98, -0.05)
  rig.leftEar.add(finMesh)
  outline(finMesh, 0.025)
  for (const side of [-1, 1]) {
    const brow = new T.Mesh(new T.BoxGeometry(0.21, 0.04, 0.03), flat(INK))
    brow.position.set(side * 0.27, 0.84, 0.49)
    brow.rotation.z = side * 0.14
    rig.head.add(brow)
  }
  rig.addEye([-0.27, 0.6, 0.46], 0.165, 0.85, coat, '#f3f7fa')
  rig.addEye([0.27, 0.6, 0.46], 0.165, 0.85, coat, '#f3f7fa')
  rig.mouth.position.set(0, 0.24, 0.5)
}
