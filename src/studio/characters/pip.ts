import * as T from 'three'
import { CharacterRig } from './rig'
import { flat, oval, outline, toon } from '../engine/toon'
/** Pip: a yellow ball with huge eyes, a tiny beak and a three-feather tuft. */
export function buildPip(rig: CharacterRig) {
  const coat = rig.coat
  const belly = toon('#fbe7a1')
  const orange = toon('#ee8a3c')
  oval(rig.body, [0, 0.36, 0], [0.34, 0.36, 0.32], coat)
  oval(rig.body, [0, 0.3, 0.16], [0.22, 0.24, 0.16], belly, false)
  for (const side of [-1, 1]) {
    oval(rig.body, [side * 0.12, 0.04, 0.08], [0.1, 0.05, 0.17], orange)
    const toes = oval(rig.body, [side * 0.12, 0.03, 0.22], [0.12, 0.04, 0.06], orange, false)
    toes.castShadow = false
  }
  for (const [arm, side] of [
    [rig.leftArm, -1],
    [rig.rightArm, 1]
  ] as const) {
    arm.position.set(side * 0.3, 0.46, 0)
    oval(arm, [side * 0.03, -0.14, 0], [0.09, 0.2, 0.15], coat)
  }
  rig.metrics = {
    headHeight: 0.68,
    earRest: [0.2, -0.2],
    earLift: 1.4,
    armRest: [0.55, -0.55],
    mouthWidth: 0.06
  }
  oval(rig.head, [0, 0.3, 0], [0.58, 0.54, 0.54], coat)
  const beak = new T.Mesh(new T.ConeGeometry(0.09, 0.2, 10), orange)
  beak.rotation.x = Math.PI / 2
  beak.position.set(0, 0.2, 0.56)
  beak.castShadow = true
  rig.head.add(beak)
  outline(beak, 0.02)
  // The two side feathers of the tuft play the ears' role in the rig.
  for (const [ear, side] of [
    [rig.leftEar, -1],
    [rig.rightEar, 1]
  ] as const) {
    ear.position.set(side * 0.12, 0.78, -0.05)
    const feather = oval(ear, [side * 0.06, 0.14, 0], [0.05, 0.2, 0.04], coat)
    feather.rotation.z = side * -0.5
  }
  const crest = oval(rig.head, [0, 0.98, -0.05], [0.05, 0.22, 0.04], coat)
  crest.rotation.z = 0.05
  rig.addEye([-0.2, 0.36, 0.42], 0.2, 1)
  rig.addEye([0.2, 0.36, 0.42], 0.2, 1)
  oval(rig.head, [-0.34, 0.17, 0.4], [0.09, 0.05, 0.05], flat('#f4a7a0'), false, false)
  oval(rig.head, [0.34, 0.17, 0.4], [0.09, 0.05, 0.05], flat('#f4a7a0'), false, false)
  rig.mouth.position.set(0, 0.08, 0.57)
  rig.mouth.visible = false
  const jaw = new T.Mesh(new T.ConeGeometry(0.075, 0.16, 10), orange)
  jaw.rotation.x = Math.PI / 2
  jaw.position.set(0, 0.14, 0.54)
  jaw.userData.restY = 0.14
  rig.head.add(jaw)
  outline(jaw, 0.02)
  rig.jaw = jaw
}
