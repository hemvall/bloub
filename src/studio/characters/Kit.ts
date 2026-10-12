import * as T from 'three'
import type { CharacterData } from '../scene/model'
import { idleAt } from '../animation/idle'
export class Kit {
  readonly root = new T.Group()
  readonly body = new T.Group()
  readonly head = new T.Group()
  readonly leftEar = new T.Group()
  readonly rightEar = new T.Group()
  readonly eyes: T.Group[] = []
  readonly pupils: T.Mesh[] = []
  readonly lids: T.Mesh[] = []
  readonly mouth = new T.Group()
  private readonly coat: T.MeshToonMaterial
  private readonly ink = new T.MeshBasicMaterial({ color: '#20212b' })
  constructor(data: CharacterData) {
    this.root.name = data.id
    this.root.userData.selectId = data.id
    this.coat = new T.MeshToonMaterial({ color: data.color })
    this.root.add(this.body)
    this.body.add(this.head)
    this.head.position.y = 1.28
    this.head.add(this.leftEar, this.rightEar, this.mouth)
    this.oval(this.body, [0, 0.58, 0], [0.43, 0.61, 0.28], this.coat)
    this.oval(this.body, [-0.28, 0.07, 0.16], [0.23, 0.12, 0.32], this.coat)
    this.oval(this.body, [0.28, 0.07, 0.16], [0.23, 0.12, 0.32], this.coat)
    this.oval(this.body, [-0.48, 0.69, 0.02], [0.13, 0.36, 0.15], this.coat).rotation.z = -0.22
    this.oval(this.body, [0.48, 0.69, 0.02], [0.13, 0.36, 0.15], this.coat).rotation.z = 0.22
    this.oval(this.head, [0, 0.24, 0], [0.88, 0.68, 0.36], this.coat)
    this.leftEar.position.set(-0.55, 0.72, 0)
    this.rightEar.position.set(0.55, 0.72, 0)
    this.rightEar.rotation.z = -0.22
    for (const [ear, flip] of [
      [this.leftEar, -1],
      [this.rightEar, 1]
    ] as const) {
      const shape = new T.Shape()
      shape.moveTo(-0.24, -0.13)
      shape.lineTo(0.22, -0.1)
      shape.quadraticCurveTo(0.24, 0.05, flip * 0.11, 0.67)
      shape.quadraticCurveTo(-0.17, 0.43, -0.24, -0.13)
      const mesh = new T.Mesh(
        new T.ExtrudeGeometry(shape, {
          depth: 0.13,
          bevelEnabled: true,
          bevelSize: 0.035,
          bevelThickness: 0.03,
          bevelSegments: 2,
          steps: 1
        }),
        this.coat
      )
      mesh.position.z = -0.1
      ear.add(mesh)
      const outline = new T.LineSegments(
        new T.EdgesGeometry(mesh.geometry, 45),
        new T.LineBasicMaterial({ color: '#20212b' })
      )
      mesh.add(outline)
      this.oval(
        ear,
        [0, 0.2, 0.12],
        [0.095, 0.24, 0.025],
        new T.MeshBasicMaterial({ color: '#c7a7a5' }),
        false
      )
    }
    const cream = new T.MeshBasicMaterial({ color: '#fff6d9' })
    for (const x of [-0.35, 0.35]) {
      const eye = new T.Group()
      eye.position.set(x, 0.29, 0.345)
      this.head.add(eye)
      this.eyes.push(eye)
      this.oval(eye, [0, 0, 0], [0.265, 0.235, 0.055], this.ink, false)
      this.oval(eye, [0, 0, 0.018], [0.237, 0.206, 0.045], cream, false)
      const pupil = this.oval(eye, [0, -0.025, 0.062], [0.067, 0.125, 0.024], this.ink, false)
      this.pupils.push(pupil)
      this.oval(
        pupil,
        [-0.25, 0.38, 0.7],
        [0.2, 0.18, 0.3],
        new T.MeshBasicMaterial({ color: '#ffffff' }),
        false
      )
      const lid = this.oval(eye, [0, 0.16, 0.065], [0.26, 0.105, 0.03], this.coat, false)
      this.lids.push(lid)
    }
    this.oval(this.head, [0, 0.045, 0.38], [0.075, 0.044, 0.026], this.ink, false)
    this.mouth.position.set(0, -0.14, 0.37)
    const curve = new T.QuadraticBezierCurve3(
      new T.Vector3(-0.13, 0, 0),
      new T.Vector3(0, 0.055, 0.015),
      new T.Vector3(0.13, -0.012, 0)
    )
    this.mouth.add(new T.Mesh(new T.TubeGeometry(curve, 16, 0.014, 6, false), this.ink))
    for (const side of [-1, 1])
      for (let i = 0; i < 2; i++) {
        const points = [
          new T.Vector3(side * 0.58, 0.04 - i * 0.1, 0.29),
          new T.Vector3(side * 0.92, 0.1 - i * 0.19, 0.25)
        ]
        this.head.add(
          new T.Line(
            new T.BufferGeometry().setFromPoints(points),
            new T.LineBasicMaterial({ color: '#20212b' })
          )
        )
      }
    // Curled tail is a graphic punctuation mark, with a dark outline shell.
    const tailPath = new T.CatmullRomCurve3([
      new T.Vector3(0.3, 0.25, -0.2),
      new T.Vector3(0.75, 0.35, -0.3),
      new T.Vector3(0.93, 0.7, -0.2),
      new T.Vector3(0.8, 0.83, -0.1)
    ])
    this.body.add(new T.Mesh(new T.TubeGeometry(tailPath, 24, 0.09, 8, false), this.coat))
  }
  private oval(
    parent: T.Object3D,
    position: [number, number, number],
    scale: [number, number, number],
    material: T.Material,
    outline = true
  ) {
    const mesh = new T.Mesh(new T.SphereGeometry(1, 24, 16), material)
    mesh.position.set(...position)
    mesh.scale.set(...scale)
    mesh.castShadow = true
    parent.add(mesh)
    if (outline) {
      const shell = new T.Mesh(
        mesh.geometry,
        new T.MeshBasicMaterial({ color: '#20212b', side: T.BackSide })
      )
      shell.scale.set(1.045, 1.045, 1.045)
      mesh.add(shell)
    }
    return mesh
  }
  update(
    data: CharacterData,
    time: number,
    eyeYaw: number,
    eyePitch: number,
    headYaw: number,
    headPitch: number,
    seed: number
  ) {
    const idle = idleAt(time, seed)
    this.root.position.set(...data.position)
    this.root.rotation.set(...data.rotation)
    this.root.scale.setScalar(data.scale)
    this.coat.color.set(data.color)
    this.body.scale.y = 1 + idle.breath
    this.body.rotation.z = idle.drift * 0.25
    this.head.rotation.set(-headPitch + idle.drift, headYaw, idle.tilt)
    this.leftEar.rotation.z = 0.1 + idle.ear
    this.rightEar.rotation.z = -0.22 - idle.ear * 0.6
    this.mouth.scale.y = data.expression === 'happy' ? -1 : 1
    this.eyes.forEach((eye, i) => {
      eye.scale.y = idle.blink
      this.pupils[i]!.position.x = eyeYaw * 0.15 + idle.eye
      this.pupils[i]!.position.y = eyePitch * 0.12 - 0.025
      this.lids[i]!.position.y =
        data.expression === 'tired' ? 0.08 : data.expression === 'curious' ? 0.2 : 0.16
      this.lids[i]!.rotation.z = (i ? -1 : 1) * (data.expression === 'tired' ? 0.16 : -0.1)
    })
  }
}
