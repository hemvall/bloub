import * as T from 'three'
import { CharacterRig } from './rig'
import { flat, INK, oval, toon } from '../engine/toon'
/** Dev: hoodie, headphones around the neck, messy hair, heavy lids. The coat colour is the hoodie. */
export function buildDev(rig: CharacterRig) {
  const coat = rig.coat
  const skin = toon('#d9a98c')
  const hair = toon('#3a2a24')
  oval(rig.body, [0, 0.52, 0], [0.42, 0.56, 0.4], coat)
  const hood = new T.Mesh(new T.TorusGeometry(0.4, 0.14, 8, 24), coat)
  hood.rotation.x = Math.PI / 2
  hood.position.set(0, 1.0, -0.06)
  hood.castShadow = true
  rig.body.add(hood)
  const phones = new T.Mesh(new T.TorusGeometry(0.36, 0.045, 8, 24), flat(INK))
  phones.rotation.x = Math.PI / 2 + 0.35
  phones.position.set(0, 0.92, 0.1)
  rig.body.add(phones)
  oval(rig.body, [-0.18, 0.05, 0.1], [0.16, 0.07, 0.23], toon('#2b2b30'))
  oval(rig.body, [0.18, 0.05, 0.1], [0.16, 0.07, 0.23], toon('#2b2b30'))
  for (const [arm, side] of [
    [rig.leftArm, -1],
    [rig.rightArm, 1]
  ] as const) {
    arm.position.set(side * 0.42, 0.74, 0.02)
    oval(arm, [side * 0.03, -0.24, 0], [0.12, 0.28, 0.12], coat)
    oval(arm, [side * 0.03, -0.5, 0.03], [0.09, 0.08, 0.09], skin)
  }
  rig.metrics = {
    headHeight: 1.1,
    earRest: [0, 0],
    earLift: 0.2,
    armRest: [0.3, -0.3],
    mouthWidth: 0.09
  }
  oval(rig.head, [0, 0.3, 0], [0.5, 0.52, 0.48], skin)
  oval(rig.head, [0, 0.72, -0.06], [0.5, 0.22, 0.46], hair)
  oval(rig.head, [-0.2, 0.86, 0.1], [0.14, 0.12, 0.12], hair, false)
  oval(rig.head, [0.25, 0.84, -0.1], [0.16, 0.11, 0.12], hair, false)
  oval(rig.head, [0.05, 0.9, 0.0], [0.1, 0.14, 0.1], hair, false)
  for (const [ear, side] of [
    [rig.leftEar, -1],
    [rig.rightEar, 1]
  ] as const) {
    ear.position.set(side * 0.48, 0.3, 0)
    oval(ear, [0, 0, 0], [0.07, 0.11, 0.06], skin)
  }
  oval(rig.head, [-0.2, 0.3, 0.44], [0.12, 0.05, 0.03], flat('#c08f7c'), false, false)
  oval(rig.head, [0.2, 0.3, 0.44], [0.12, 0.05, 0.03], flat('#c08f7c'), false, false)
  rig.addEye([-0.2, 0.4, 0.42], 0.13, 0.8, skin)
  rig.addEye([0.2, 0.4, 0.42], 0.13, 0.8, skin)
  rig.mouth.position.set(0, 0.1, 0.47)
}
