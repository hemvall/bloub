import * as T from 'three'
import { CharacterRig } from './rig'
import { flat, INK, oval, outline, toon } from '../engine/toon'
/** Kit: light grey cat, oversized head, one bent ear, heavy lids. Built to read from far away. */
export function buildKit(rig: CharacterRig) {
  const coat = rig.coat
  const belly = toon('#ece8de')
  oval(rig.body, [0, 0.56, 0], [0.42, 0.6, 0.38], coat)
  oval(rig.body, [0, 0.46, 0.2], [0.26, 0.38, 0.2], belly, false)
  oval(rig.body, [-0.26, 0.07, 0.16], [0.2, 0.11, 0.28], coat)
  oval(rig.body, [0.26, 0.07, 0.16], [0.2, 0.11, 0.28], coat)
  const tail = new T.Mesh(
    new T.TubeGeometry(
      new T.CatmullRomCurve3([
        new T.Vector3(0.2, 0.25, -0.3),
        new T.Vector3(0.7, 0.3, -0.45),
        new T.Vector3(0.95, 0.75, -0.35),
        new T.Vector3(0.75, 0.95, -0.2)
      ]),
      24,
      0.085,
      8
    ),
    coat
  )
  tail.castShadow = true
  rig.body.add(tail)
  outline(tail, 0.03)
  for (const [arm, side] of [
    [rig.leftArm, -1],
    [rig.rightArm, 1]
  ] as const) {
    arm.position.set(side * 0.38, 0.72, 0.05)
    oval(arm, [side * 0.02, -0.2, 0], [0.12, 0.26, 0.12], coat)
  }
  rig.metrics = {
    headHeight: 1.2,
    earRest: [0.08, -0.16],
    earLift: 1,
    armRest: [0.35, -0.35],
    mouthWidth: 0.1
  }
  oval(rig.head, [0, 0.28, 0], [0.86, 0.66, 0.62], coat)
  oval(rig.head, [-0.2, 0.08, 0.5], [0.22, 0.14, 0.12], belly, false)
  oval(rig.head, [0.2, 0.08, 0.5], [0.22, 0.14, 0.12], belly, false)
  oval(rig.head, [0, 0.11, 0.6], [0.06, 0.04, 0.03], flat(INK), false, false)
  // Left ear up, right ear bent: the asymmetry is the character.
  for (const [ear, side, bent] of [
    [rig.leftEar, -1, false],
    [rig.rightEar, 1, true]
  ] as const) {
    ear.position.set(side * 0.5, 0.74, 0)
    const shape = new T.Shape()
    shape.moveTo(-0.24, -0.1)
    shape.lineTo(0.24, -0.1)
    if (bent) {
      shape.quadraticCurveTo(0.22, 0.25, side * 0.3, 0.42)
      shape.quadraticCurveTo(-0.05, 0.4, -0.24, -0.1)
    } else {
      shape.quadraticCurveTo(0.2, 0.3, side * 0.04, 0.66)
      shape.quadraticCurveTo(-0.2, 0.3, -0.24, -0.1)
    }
    const mesh = new T.Mesh(
      new T.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }),
      coat
    )
    mesh.position.z = -0.05
    mesh.castShadow = true
    ear.add(mesh)
    outline(mesh, 0.03)
    oval(ear, [0, 0.12, 0.08], [0.09, 0.2, 0.03], flat('#d9a8a2'), false, false)
  }
  rig.addEye([-0.3, 0.3, 0.5], 0.21, 0.92)
  rig.addEye([0.3, 0.3, 0.5], 0.21, 0.92)
  rig.mouth.position.set(0, -0.02, 0.6)
  const whisker = new T.LineBasicMaterial({ color: INK })
  for (const side of [-1, 1])
    for (let i = 0; i < 3; i++) {
      const y = 0.05 - i * 0.07
      const geometry = new T.BufferGeometry().setFromPoints([
        new T.Vector3(side * 0.42, y, 0.5),
        new T.Vector3(side * 0.95, y + 0.08 - i * 0.1, 0.4)
      ])
      rig.head.add(new T.Line(geometry, whisker))
    }
}
