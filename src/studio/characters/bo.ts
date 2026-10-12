import { CharacterRig } from './rig'
import { flat, INK, oval, toon } from '../engine/toon'
/** Bo: a big soft bear, round ears, pale muzzle, small calm eyes. */
export function buildBo(rig: CharacterRig) {
  const coat = rig.coat
  const muzzle = toon('#d9c3a5')
  oval(rig.body, [0, 0.72, 0], [0.62, 0.78, 0.56], coat)
  oval(rig.body, [0, 0.62, 0.3], [0.38, 0.5, 0.28], muzzle, false)
  oval(rig.body, [-0.34, 0.1, 0.2], [0.24, 0.13, 0.34], coat)
  oval(rig.body, [0.34, 0.1, 0.2], [0.24, 0.13, 0.34], coat)
  for (const [arm, side] of [
    [rig.leftArm, -1],
    [rig.rightArm, 1]
  ] as const) {
    arm.position.set(side * 0.58, 1.0, 0.05)
    oval(arm, [side * 0.03, -0.3, 0], [0.17, 0.36, 0.17], coat)
    oval(arm, [side * 0.03, -0.62, 0.05], [0.15, 0.12, 0.16], muzzle, true)
  }
  rig.metrics = {
    headHeight: 1.48,
    earRest: [0.15, -0.15],
    earLift: 0.6,
    armRest: [0.25, -0.25],
    mouthWidth: 0.11
  }
  oval(rig.head, [0, 0.3, 0], [0.72, 0.64, 0.64], coat)
  oval(rig.head, [0, 0.12, 0.5], [0.34, 0.24, 0.24], muzzle)
  oval(rig.head, [0, 0.24, 0.72], [0.1, 0.07, 0.06], flat(INK), false, false)
  for (const [ear, side] of [
    [rig.leftEar, -1],
    [rig.rightEar, 1]
  ] as const) {
    ear.position.set(side * 0.5, 0.78, -0.08)
    oval(ear, [0, 0.1, 0], [0.2, 0.2, 0.1], coat)
    oval(ear, [0, 0.1, 0.07], [0.11, 0.11, 0.05], muzzle, false, false)
  }
  rig.addEye([-0.26, 0.4, 0.54], 0.11, 1)
  rig.addEye([0.26, 0.4, 0.54], 0.11, 1)
  rig.mouth.position.set(0, 0.06, 0.74)
}
