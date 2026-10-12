import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import type { CameraPose, SceneData, Vec3 } from '../scene/model'
import { cameraAt, characterAt } from '../timeline/evaluate'
import { gazeAt } from '../animation/gaze'
import { Kit } from '../characters/Kit'
import { nightBar, type NightBar } from '../environments/nightBar'
import { createProp } from '../props/createProp'
import { disposeTree } from './geometry'
export interface EngineEvents {
  frame: (time: number, fps: number, ms: number) => void
  select: (id: string) => void
  camera: (pose: CameraPose) => void
  transform: (id: string, position: Vec3, rotation: Vec3, scale: number) => void
  error: (message: string) => void
}
export class SceneEngine {
  readonly renderer: T.WebGLRenderer
  readonly world = new T.Scene()
  readonly camera = new T.PerspectiveCamera(40, 1, 0.1, 80)
  readonly controls: OrbitControls
  private readonly transforms: TransformControls
  private readonly environment: NightBar
  private readonly characters = new Map<string, Kit>()
  private readonly props = new Map<string, T.Group>()
  private readonly lights = new Map<string, T.PointLight>()
  private readonly resizeObserver: ResizeObserver
  private readonly selection = new T.BoxHelper(new T.Object3D(), '#d4bc83')
  private selected = ''
  private disposed = false
  private dragging = false
  private frameId = 0
  private previous = 0
  private measureStart = 0
  private frameCount = 0
  private fps = 0
  private ms = 0
  private manualCamera: CameraPose | null = null
  private pointerStart: [number, number] = [0, 0]
  private scene: SceneData
  time = 0
  playing = false
  constructor(
    private readonly host: HTMLElement,
    scene: SceneData,
    private readonly events: EngineEvents
  ) {
    this.scene = scene
    this.renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true
    })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = T.PCFSoftShadowMap
    this.renderer.toneMapping = T.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.3
    this.renderer.outputColorSpace = T.SRGBColorSpace
    host.append(this.renderer.domElement)
    this.world.background = new T.Color('#171c29')
    this.world.fog = new T.FogExp2('#242431', scene.environment.fog)
    this.world.add(new T.HemisphereLight('#b7c8e3', '#5c3d36', 1.5))
    const key = new T.DirectionalLight('#ffe4b6', 2.1)
    key.position.set(-3, 7, 5)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.left = -8
    key.shadow.camera.right = 8
    key.shadow.camera.top = 8
    key.shadow.camera.bottom = -8
    key.shadow.normalBias = 0.035
    this.world.add(key)
    this.environment = nightBar()
    this.world.add(this.environment.root)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = false
    this.controls.minDistance = 0.8
    this.controls.maxDistance = 28
    this.controls.maxPolarAngle = Math.PI * 0.93
    this.controls.addEventListener('start', this.orbitStart)
    this.controls.addEventListener('change', this.orbitChange)
    this.transforms = new TransformControls(this.camera, this.renderer.domElement)
    this.transforms.setSize(0.8)
    this.world.add(this.transforms.getHelper())
    this.transforms.addEventListener('dragging-changed', (e) => {
      this.dragging = !!e.value
      this.controls.enabled = !this.dragging
      if (this.dragging) this.playing = false
    })
    this.transforms.addEventListener('objectChange', () => {
      const obj = this.transforms.object
      if (obj)
        this.events.transform(
          this.selected,
          obj.position.toArray() as Vec3,
          [obj.rotation.x, obj.rotation.y, obj.rotation.z],
          obj.scale.x
        )
    })
    this.selection.visible = false
    this.world.add(this.selection)
    this.renderer.domElement.addEventListener('pointerdown', this.pointerDown)
    this.renderer.domElement.addEventListener('pointerup', this.pointerUp)
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost)
    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(host)
    this.setScene(scene)
    this.resize()
    this.frameId = requestAnimationFrame(this.tick)
  }
  private contextLost = (event: Event) => {
    event.preventDefault()
    this.playing = false
    cancelAnimationFrame(this.frameId)
    this.events.error(
      'The graphics context was lost. Reload the page to restore the viewport; export your scene first.'
    )
  }
  private orbitStart = () => {
    this.playing = false
    this.manualCamera = this.getCameraPose()
  }
  private orbitChange = () => {
    if (this.manualCamera) {
      this.manualCamera = this.getCameraPose()
      this.events.camera(this.manualCamera)
    }
  }
  getCameraPose(): CameraPose {
    return {
      position: this.camera.position.toArray() as Vec3,
      target: this.controls.target.toArray() as Vec3,
      fov: this.camera.fov
    }
  }
  setCameraPose(pose: CameraPose) {
    this.manualCamera = structuredClone(pose)
    this.applyCamera(pose)
  }
  private applyCamera(pose: CameraPose) {
    this.camera.position.set(...pose.position)
    this.controls.target.set(...pose.target)
    this.camera.fov = pose.fov
    this.camera.lookAt(this.controls.target)
    this.camera.updateProjectionMatrix()
  }
  setScene(scene: SceneData) {
    this.scene = scene
    this.time = Math.min(this.time, scene.duration)
    for (const [id, kit] of this.characters)
      if (!scene.characters.some((c) => c.id === id)) {
        this.world.remove(kit.root)
        disposeTree(kit.root)
        this.characters.delete(id)
      }
    for (const c of scene.characters)
      if (!this.characters.has(c.id)) {
        const kit = new Kit(c)
        this.characters.set(c.id, kit)
        this.world.add(kit.root)
      }
    for (const [id, prop] of this.props)
      if (!scene.props.some((p) => p.id === id && p.kind === prop.userData.kind)) {
        this.world.remove(prop)
        disposeTree(prop)
        this.props.delete(id)
      }
    for (const p of scene.props) {
      let obj = this.props.get(p.id)
      if (!obj) {
        obj = createProp(p)
        obj.userData.kind = p.kind
        this.props.set(p.id, obj)
        this.world.add(obj)
      }
      if (!(this.dragging && this.selected === p.id)) {
        obj.position.set(...p.position)
        obj.rotation.set(...p.rotation)
        obj.scale.setScalar(p.scale)
      }
      const body = obj.children[0]
      if (body instanceof T.Mesh) (body.material as T.MeshStandardMaterial).color.set(p.color)
    }
    for (const [id, light] of this.lights)
      if (!scene.lights.some((l) => l.id === id)) {
        this.world.remove(light)
        this.lights.delete(id)
      }
    for (const l of scene.lights) {
      let light = this.lights.get(l.id)
      if (!light) {
        light = new T.PointLight()
        this.lights.set(l.id, light)
        this.world.add(light)
      }
      light.position.set(...l.position)
      light.color.set(l.color)
      light.intensity = l.intensity
      light.distance = 12
    }
    ;(this.world.fog as T.FogExp2).density = scene.environment.fog
    if (!this.dragging) this.select(this.selected)
  }
  select(id: string) {
    this.selected = id
    this.transforms.detach()
    this.selection.visible = false
    const object = this.characters.get(id)?.root ?? this.props.get(id)
    if (object) {
      this.transforms.attach(object)
      this.selection.setFromObject(object)
      this.selection.visible = true
    }
  }
  setTransformMode(mode: 'translate' | 'rotate' | 'scale') {
    this.transforms.setMode(mode)
  }
  seek(time: number) {
    this.time = T.MathUtils.clamp(time, 0, this.scene.duration)
    this.manualCamera = null
    this.renderFrame(this.time)
  }
  play() {
    if (this.time >= this.scene.duration) this.seek(0)
    this.manualCamera = null
    this.playing = true
  }
  pause() {
    this.playing = false
  }
  private resolveTarget = (id: string, time: number): Vec3 | undefined => {
    const c = this.scene.characters.find((c) => c.id === id)
    if (c) {
      const p = characterAt(this.scene, c, time).position
      return [p[0], p[1] + 1.55 * c.scale, p[2]]
    }
    const p = this.scene.props.find((p) => p.id === id)
    if (p) return p.position
    return this.world.getObjectByName(id)?.getWorldPosition(new T.Vector3()).toArray() as
      Vec3 | undefined
  }
  /** Evaluates an arbitrary timestamp synchronously. No RAF or previous frame needed. */
  renderFrame(time: number, options: { camera?: CameraPose; overlays?: boolean } = {}) {
    const t = T.MathUtils.clamp(time, 0, this.scene.duration)
    this.applyCamera(options.camera ?? cameraAt(this.scene, t))
    this.scene.characters.forEach((c, i) => {
      const evaluated = characterAt(this.scene, c, t)
      const gazeScene = options.camera
        ? {
            ...this.scene,
            camera: options.camera,
            timeline: this.scene.timeline.filter((e) => e.type !== 'camera')
          }
        : this.scene
      const gaze = gazeAt(gazeScene, c, t, this.resolveTarget)
      this.characters
        .get(c.id)!
        .update(evaluated, t, gaze.eyeYaw, gaze.eyePitch, gaze.headYaw, gaze.headPitch, i)
    })
    this.environment.update(t, this.scene.environment.rain)
    const show = options.overlays ?? false
    this.transforms.getHelper().visible = show && !!this.transforms.object
    this.selection.visible = show && !!this.transforms.object
    if (this.selection.visible) this.selection.update()
    this.renderer.render(this.world, this.camera)
  }
  private resize = () => {
    if (this.disposed) return
    const width = Math.max(1, this.host.clientWidth),
      height = Math.max(1, this.host.clientHeight)
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }
  private tick = (now: number) => {
    if (this.disposed) return
    if (!this.measureStart) this.measureStart = now
    const elapsed = this.previous ? (now - this.previous) / 1000 : 0
    this.previous = now
    if (this.playing) {
      this.time = Math.min(this.scene.duration, this.time + elapsed)
      if (this.time >= this.scene.duration) this.playing = false
    }
    if (!this.dragging)
      this.renderFrame(this.time, { camera: this.manualCamera ?? undefined, overlays: true })
    else this.renderer.render(this.world, this.camera)
    this.frameCount++
    if (now - this.measureStart > 500) {
      this.ms = (now - this.measureStart) / this.frameCount
      this.fps = 1000 / this.ms
      this.frameCount = 0
      this.measureStart = now
    }
    this.events.frame(this.time, this.fps, this.ms)
    this.frameId = requestAnimationFrame(this.tick)
  }
  private pointerDown = (e: PointerEvent) => {
    this.pointerStart = [e.clientX, e.clientY]
  }
  private pointerUp = (e: PointerEvent) => {
    if (
      this.dragging ||
      this.transforms.axis ||
      Math.hypot(e.clientX - this.pointerStart[0], e.clientY - this.pointerStart[1]) > 4
    )
      return
    const rect = this.renderer.domElement.getBoundingClientRect(),
      ray = new T.Raycaster()
    ray.setFromCamera(
      new T.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        1 - ((e.clientY - rect.top) / rect.height) * 2
      ),
      this.camera
    )
    const hits = ray.intersectObjects(
      [...this.characters.values()]
        .map((c) => c.root)
        .concat([...this.props.values()], [this.environment.root]),
      true
    )
    let object: T.Object3D | null = hits[0]?.object ?? null
    while (object && !object.userData.selectId) object = object.parent
    if (object) this.events.select(String(object.userData.selectId))
  }
  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frameId)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    this.transforms.dispose()
    this.renderer.domElement.removeEventListener('pointerdown', this.pointerDown)
    this.renderer.domElement.removeEventListener('pointerup', this.pointerUp)
    this.renderer.domElement.removeEventListener('webglcontextlost', this.contextLost)
    disposeTree(this.world)
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
