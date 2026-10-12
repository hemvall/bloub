import * as T from 'three'
import { CharacterRig } from './rig'
import { flat, INK, oval, toon } from '../engine/toon'
/** CEO: round body in a navy suit, bald head, round glasses, red tie. The coat colour is the suit. */
export function buildCeo(rig: CharacterRig) {
  const coat = rig.coat
  const skin = toon('#e8b78f')
  const shirt = toon('#f4f1ea')
  const tie = toon('#d23c3c')
  oval(rig.body, [0, 0.6, 0], [0.52, 0.6, 0.46], coat)
  oval(rig.body, [0, 0.7, 0.33], [0.2, 0.4, 0.18], shirt, false)
  const knot = new T.Mesh(new T.CylinderGeometry(0.025, 0.065, 0.44, 8), tie)
  knot.position.set(0, 0.64, 0.47)
  knot.castShadow = true
  rig.body.add(knot)
  oval(rig.body, [0, 0.88, 0.46], [0.05, 0.04, 0.04], tie, false, false)
  oval(rig.body, [-0.2, 0.05, 0.12], [0.17, 0.07, 0.24], toon('#2a2d3e'))
  oval(rig.body, [0.2, 0.05, 0.12], [0.17, 0.07, 0.24], toon('#2a2d3e'))
  for (const [arm, side] of [
    [rig.leftArm, -1],
    [rig.rightArm, 1]
  ] as const) {
    arm.position.set(side * 0.5, 0.84, 0.02)
    oval(arm, [side * 0.03, -0.26, 0], [0.13, 0.3, 0.13], coat)
    oval(arm, [side * 0.03, -0.54, 0.03], [0.1, 0.09, 0.1], skin)
  }
  rig.metrics = {
    headHeight: 1.14,
    earRest: [0.1, -0.1],
    earLift: 0.3,
    armRest: [0.3, -0.3],
    mouthWidth: 0.1
  }
  oval(rig.head, [0, 0.34, 0], [0.52, 0.5, 0.5], skin)
  oval(rig.head, [0, 0.38, 0.5], [0.07, 0.06, 0.07], skin, false)
  for (const [ear, side] of [
    [rig.leftEar, -1],
    [rig.rightEar, 1]
  ] as const) {
    ear.position.set(side * 0.5, 0.34, 0)
    oval(ear, [0, 0, 0], [0.08, 0.12, 0.06], skin)
  }
  for (const side of [-1, 1]) {
    const brow = new T.Mesh(new T.BoxGeometry(0.17, 0.05, 0.03), flat(INK))
    brow.position.set(side * 0.19, 0.69, 0.45)
    brow.rotation.z = side * -0.1
    rig.head.add(brow)
    const ring = new T.Mesh(new T.TorusGeometry(0.135, 0.013, 6, 24), flat(INK))
    ring.position.set(side * 0.19, 0.52, 0.5)
    rig.head.add(ring)
  }
  const bridge = new T.Mesh(new T.BoxGeometry(0.1, 0.02, 0.02), flat(INK))
  bridge.position.set(0, 0.53, 0.5)
  rig.head.add(bridge)
  rig.addEye([-0.19, 0.52, 0.42], 0.1, 1, skin)
  rig.addEye([0.19, 0.52, 0.42], 0.1, 1, skin)
  rig.mouth.position.set(0, 0.16, 0.48)
}
