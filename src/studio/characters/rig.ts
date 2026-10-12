import * as T from 'three'
import type { CharacterData } from '../scene/model'
import type { Gaze } from '../animation/gaze'
import type { FaceParams } from '../animation/expressions'
import type { ActionPose } from '../animation/actions'
import { DEFAULT_IDLE, idleAt, type IdleProfile } from '../animation/idle'
import { flat, ink, INK, oval, toon } from '../engine/toon'
import { disposeTree } from '../engine/geometry'
/**
 * Shared skeleton: root > body > (arms, head > (ears, eyes, mouth)). Builders
 * fill the groups with geometry and set the metrics; `update` animates every
 * character the same way and reads nothing from the previous frame.
 */
export interface Eye {
  group: T.Group
  pupil: T.Mesh
  lid: T.Mesh
  radius: number
  /** Pupil travel per radian of gaze. */
  travel: number
  pupilScale: T.Vector3
}
export interface RigMetrics {
  headHeight: number
  earRest: [number, number]
  earLift: number
  armRest: [number, number]
  mouthWidth: number
}
export interface CharacterFrame {
  data: CharacterData
  time: number
  seed: number
  gaze: Gaze
  face: FaceParams
  action: ActionPose
  /** 0 silent, 1 full voice; fractional values come from a real clip's envelope. */
  speaking: number
  idle?: IdleProfile
}
export class CharacterRig {
  readonly root = new T.Group()
  readonly body = new T.Group()
  readonly head = new T.Group()
  readonly leftEar = new T.Group()
  readonly rightEar = new T.Group()
  readonly leftArm = new T.Group()
  readonly rightArm = new T.Group()
  readonly mouth = new T.Group()
  readonly eyes: Eye[] = []
  readonly coat: T.MeshToonMaterial
  readonly smile: T.Mesh
  readonly openMouth: T.Mesh
  /** Optional lower beak/jaw that pivots instead of the oval mouth. */
  jaw?: T.Mesh
  metrics: RigMetrics = { headHeight: 1.2, earRest: [0, 0], earLift: 1, armRest: [0.4, -0.4], mouthWidth: 0.12 }
  constructor(data: CharacterData) {
    this.root.name = data.id
    this.root.userData.selectId = data.id
    this.coat = toon(data.color)
    this.root.add(this.body)
    this.body.add(this.head, this.leftArm, this.rightArm)
    this.head.add(this.leftEar, this.rightEar, this.mouth)
    // Two stacked mouths (closed curve, open oval) cross-faded by scale: no morph targets needed.
    this.smile = new T.Mesh(new T.TorusGeometry(1, 0.11, 6, 24, Math.PI), ink().clone())
    ;(this.smile.material as T.MeshBasicMaterial).side = T.FrontSide
    this.smile.rotation.z = Math.PI
    this.openMouth = new T.Mesh(new T.CircleGeometry(1, 20), flat('#3a1d2a'))
    this.mouth.add(this.smile, this.openMouth)
  }
  addEye(
    position: [number, number, number],
    radius: number,
    squash = 0.9,
    lidColor: T.Material = this.coat,
    white = '#fff8e8'
  ) {
    const group = new T.Group()
    group.position.set(...position)
    this.head.add(group)
    const r = radius
    oval(group, [0, 0, 0], [r, r * squash, r * 0.55], flat(white), true, false)
    const pupil = oval(group, [0, -0.05 * r, r * 0.42], [r * 0.3, r * 0.5, r * 0.18], flat(INK), false, false)
    oval(pupil, [-0.3, 0.45, 0.75], [0.28, 0.24, 0.3], flat('#ffffff'), false, false)
    const lid = oval(group, [0, r * squash * 1.02, r * 0.1], [r * 1.08, r * squash * 1.04, r * 0.62], lidColor, true, false)
    lid.castShadow = false
    const eye: Eye = { group, pupil, lid, radius: r * squash, travel: r * 0.62, pupilScale: pupil.scale.clone() }
    this.eyes.push(eye)
    return eye
  }
  update(frame: CharacterFrame) {
    const { data, gaze, face, action } = frame
    const profile = frame.idle ?? DEFAULT_IDLE
    const idle = idleAt(frame.time, frame.seed, profile)
    const m = this.metrics
    this.root.position.set(...data.position)
    this.root.rotation.set(...data.rotation)
    this.root.scale.setScalar(data.scale)
    this.coat.color.set(data.color)
    const squash = action.squash
    this.body.position.set(idle.shift, action.bodyY, 0)
    this.body.scale.set(1 - idle.breath * 0.5 - squash * 0.5, 1 + idle.breath + squash, 1 - squash * 0.4)
    this.body.rotation.set(action.bodyPitch + profile.posture, 0, idle.sway)
    this.head.position.y = m.headHeight
    this.head.rotation.set(
      -gaze.headPitch + idle.headPitch + action.headPitch + profile.headDrop,
      gaze.headYaw + idle.headYaw + action.headYaw,
      idle.headRoll + action.headRoll
    )
    const ears = (face.ears + action.ears) * m.earLift
    this.leftEar.rotation.z = m.earRest[0] + idle.ear * 0.6 + ears * 0.3
    this.rightEar.rotation.z = m.earRest[1] - idle.ear - ears * 0.3
    this.leftEar.rotation.x = -ears * 0.35
    this.rightEar.rotation.x = -ears * 0.35
    this.leftArm.rotation.z = m.armRest[0] + idle.breath * 0.4
    this.rightArm.rotation.z = m.armRest[1] - action.armRaise * 2.4 - action.armSwing
    this.rightArm.rotation.x = -action.armRaise * 0.3
    const lid = Math.min(1, Math.max(0, face.lid + action.lid))
    const blink = 1 - (1 - idle.blink) * (1 - lid * 0.6)
    this.eyes.forEach((eye, i) => {
      const side = i === 0 ? 1 : -1
      eye.group.scale.y = Math.max(0.06, blink)
      eye.pupil.position.x = gaze.eyeYaw * eye.travel + idle.eyeX
      eye.pupil.position.y = gaze.eyePitch * eye.travel * 0.8 + idle.eyeY + action.eyeY - 0.05 * eye.radius
      eye.pupil.scale.copy(eye.pupilScale).multiplyScalar(face.pupil)
      eye.lid.position.y = eye.radius * (1.02 - lid * 1.15)
      eye.lid.rotation.z = side * face.lidTilt * 0.6
    })
    // With a real envelope the loudness shapes the mouth; the sine only adds the syllable texture.
    const texture = 0.5 + 0.5 * Math.sin(frame.time * 21)
    const talk = frame.speaking >= 1 ? texture * (0.6 + 0.4 * Math.sin(frame.time * 7.3)) : frame.speaking * (0.55 + 0.45 * texture)
    const open = Math.min(1, face.open + action.open + talk * 0.55)
    const smile = Math.max(-1, Math.min(1, face.smile + action.smile))
    const w = m.mouthWidth
    this.smile.scale.set(w * (1 + Math.abs(smile) * 0.25), w * 0.45 * Math.abs(smile) + 0.004, w * 0.3)
    this.smile.rotation.z = smile >= 0 ? Math.PI : 0
    this.smile.position.y = smile >= 0 ? w * 0.2 : -w * 0.25
    this.openMouth.scale.set(w * (0.7 + open * 0.3), w * open * 0.9 + 0.001, 1)
    this.openMouth.position.y = -w * open * 0.35
    this.openMouth.visible = open > 0.03
    if (this.jaw) {
      this.jaw.rotation.x = Math.PI / 2 + open * 0.55
      this.jaw.position.y = this.jaw.userData.restY - open * 0.05
    }
  }
  dispose() {
    disposeTree(this.root)
  }
}
