import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import type { CameraPose, EnvironmentId, SceneData, Vec3 } from '../scene/model'
import { cameraAt, characterAt, eyesOf, faceAt, speechLevelAt } from '../timeline/evaluate'
import { gazeAt } from '../animation/gaze'
import { actionsAt } from '../animation/actions'
import { createCharacter, type CharacterRig } from '../characters'
import { CHARACTERS, idleProfile } from '../characters/catalog'
import { buildEnvironment, ENVIRONMENTS, type EnvironmentInstance } from '../environments'
import { createProp, tintProp } from '../props/createProp'
import { disposeTree } from './geometry'
import { drawOverlay } from './overlay'
export interface EngineEvents {
  frame: (time: number, fps: number, ms: number) => void
  select: (id: string) => void
  camera: (pose: CameraPose) => void
  transform: (id: string, position: Vec3, rotation: Vec3, scale: number) => void
  error: (message: string) => void
}
export type TransformMode = 'translate' | 'rotate' | 'scale'
/**
 * Owns every Three.js object and the render loop. Vue hands it documents; it
 * reconciles its scene graph against them and otherwise reads them per frame.
 * `renderFrame(t)` is synchronous and depends on nothing but the document.
 */
export class SceneEngine {
  readonly renderer: T.WebGLRenderer
  readonly world = new T.Scene()
  readonly camera = new T.PerspectiveCamera(40, 1, 0.1, 400)
  readonly controls: OrbitControls
  private readonly composer: EffectComposer
  private readonly bloom: UnrealBloomPass
  private readonly transforms: TransformControls
  private readonly overlay: HTMLCanvasElement
  private readonly overlayCtx: CanvasRenderingContext2D
  private readonly resizeObserver: ResizeObserver
  private readonly selection = new T.BoxHelper(new T.Object3D(), '#e6c98a')
  private environment: EnvironmentInstance
  private environmentId: EnvironmentId
  private readonly characters = new Map<string, CharacterRig>()
  private readonly props = new Map<string, T.Group>()
  private readonly lights = new Map<string, T.PointLight>()
  private scene: SceneData
  private selected = ''
  private disposed = false
  private dragging = false
  private capturing = false
  private frameId = 0
  private previous = 0
  private measureStart = 0
  private frameCount = 0
  private fps = 0
  private ms = 0
  private manualCamera: CameraPose | null = null
  private pointerStart: [number, number] = [0, 0]
  time = 0
  playing = false
  constructor(
    private readonly host: HTMLElement,
    scene: SceneData,
    private readonly events: EngineEvents
  ) {
    this.scene = scene
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = T.PCFSoftShadowMap
    this.renderer.toneMapping = T.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.outputColorSpace = T.SRGBColorSpace
    host.append(this.renderer.domElement)
    this.overlay = document.createElement('canvas')
    this.overlay.className = 'studio-overlay'
    this.overlayCtx = this.overlay.getContext('2d')!
    host.append(this.overlay)
    this.world.fog = new T.FogExp2('#000000', scene.environment.fog)
    this.environmentId = scene.environment.id
    this.environment = this.mountEnvironment(scene.environment.id)
    this.composer = new EffectComposer(this.renderer)
    this.composer.addPass(new RenderPass(this.world, this.camera))
    this.bloom = new UnrealBloomPass(new T.Vector2(1, 1), 0.4, 0.5, 0.92)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = false
    this.controls.minDistance = 0.6
    this.controls.maxDistance = 60
    this.controls.maxPolarAngle = Math.PI * 0.95
    this.controls.addEventListener('start', this.orbitStart)
    this.controls.addEventListener('change', this.orbitChange)
    this.transforms = new TransformControls(this.camera, this.renderer.domElement)
    this.transforms.setSize(0.75)
    this.world.add(this.transforms.getHelper())
    this.transforms.addEventListener('dragging-changed', (e) => {
      this.dragging = !!e.value
      this.controls.enabled = !this.dragging
      if (this.dragging) this.playing = false
      else if (this.transforms.object) this.emitTransform()
    })
    this.transforms.addEventListener('objectChange', () => this.emitTransform())
    this.selection.visible = false
    this.world.add(this.selection)
    this.renderer.domElement.addEventListener('pointerdown', this.pointerDown)
    this.renderer.domElement.addEventListener('pointerup', this.pointerUp)
    this.renderer.domElement.addEventListener('webglcontextlost', this.contextLost)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(host)
    this.setScene(scene)
    this.resize()
    this.frameId = requestAnimationFrame(this.tick)
  }
  private emitTransform() {
    const obj = this.transforms.object
    if (!obj) return
    this.events.transform(this.selected, obj.position.toArray() as Vec3, [obj.rotation.x, obj.rotation.y, obj.rotation.z], obj.scale.x)
  }
  private mountEnvironment(id: EnvironmentId) {
    const def = ENVIRONMENTS[id]
    const instance = buildEnvironment(id)
    instance.root.traverse((o) => {
      o.userData.selectId = 'environment'
    })
    this.world.add(instance.root)
    this.world.background = new T.Color(def.background)
    ;(this.world.fog as T.FogExp2).color.set(def.fogColor)
    return instance
  }
  private contextLost = (event: Event) => {
    event.preventDefault()
    this.playing = false
    cancelAnimationFrame(this.frameId)
    this.events.error('The graphics context was lost. Export your scene JSON, then reload the page.')
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
    return { position: this.camera.position.toArray() as Vec3, target: this.controls.target.toArray() as Vec3, fov: this.camera.fov }
  }
  /** Editor-only camera: the view drifts from the timeline until the next seek or play. */
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
    if (scene.environment.id !== this.environmentId) {
      this.world.remove(this.environment.root)
      this.environment.dispose()
      this.environmentId = scene.environment.id
      this.environment = this.mountEnvironment(scene.environment.id)
      this.manualCamera = null
    }
    ;(this.world.fog as T.FogExp2).density = scene.environment.fog
    for (const [id, rig] of this.characters) {
      const data = scene.characters.find((c) => c.id === id)
      if (!data || data.kind !== rig.root.userData.kind) {
        this.world.remove(rig.root)
        rig.dispose()
        this.characters.delete(id)
      }
    }
    for (const c of scene.characters)
      if (!this.characters.has(c.id)) {
        const rig = createCharacter(c)
        rig.root.userData.kind = c.kind
        this.characters.set(c.id, rig)
        this.world.add(rig.root)
      }
    // A prop is rebuilt when its kind or its screen content changes; everything else updates in place.
    for (const [id, prop] of this.props)
      if (!scene.props.some((p) => p.id === id && p.kind === prop.userData.kind && (p.screen ?? '') === prop.userData.screen)) {
        this.world.remove(prop)
        disposeTree(prop)
        this.props.delete(id)
      }
    for (const p of scene.props) {
      let obj = this.props.get(p.id)
      if (!obj) {
        obj = createProp(p)
        obj.userData.kind = p.kind
        obj.userData.screen = p.screen ?? ''
        this.props.set(p.id, obj)
        this.world.add(obj)
      }
      if (!(this.dragging && this.selected === p.id)) {
        obj.position.set(...p.position)
        obj.rotation.set(...p.rotation)
        obj.scale.setScalar(p.scale)
      }
      tintProp(obj, p.color)
    }
    for (const [id, light] of this.lights)
      if (!scene.lights.some((l) => l.id === id)) {
        this.world.remove(light)
        this.lights.delete(id)
      }
    for (const l of scene.lights) {
      let light = this.lights.get(l.id)
      if (!light) {
        light = new T.PointLight(l.color, l.intensity, 14, 2)
        light.name = l.id
        this.lights.set(l.id, light)
        this.world.add(light)
      }
      light.position.set(...l.position)
      light.color.set(l.color)
      light.intensity = l.intensity
    }
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
  setTransformMode(mode: TransformMode) {
    this.transforms.setMode(mode)
  }
  seek(time: number) {
    this.time = T.MathUtils.clamp(time, 0, this.scene.duration)
    this.manualCamera = null
    if (!this.capturing) this.renderFrame(this.time, { overlays: true })
  }
  play() {
    if (this.time >= this.scene.duration - 1e-3) this.time = 0
    this.manualCamera = null
    this.playing = true
  }
  pause() {
    this.playing = false
  }
  private resolveTarget = (id: string, time: number): Vec3 | undefined => {
    const c = this.scene.characters.find((c) => c.id === id)
    if (c) return eyesOf(this.scene, c, time)
    const p = this.scene.props.find((p) => p.id === id)
    if (p) return [p.position[0], p.position[1] + 0.2 * p.scale, p.position[2]]
    const l = this.scene.lights.find((l) => l.id === id)
    if (l) return l.position
    return ENVIRONMENTS[this.scene.environment.id].anchors[id]
  }
  /** Evaluate and draw one timestamp. No frame history is read or written. */
  renderFrame(time: number, options: { camera?: CameraPose; overlays?: boolean } = {}) {
    const t = T.MathUtils.clamp(time, 0, this.scene.duration)
    const scene = this.scene
    this.applyCamera(options.camera ?? cameraAt(scene, t))
    const gazeScene = options.camera
      ? { ...scene, camera: options.camera, timeline: scene.timeline.filter((e) => e.type !== 'camera') }
      : scene
    scene.characters.forEach((c, i) => {
      const rig = this.characters.get(c.id)
      if (!rig) return
      if (this.dragging && this.selected === c.id) return
      rig.update({
        data: characterAt(scene, c, t),
        time: t,
        seed: i,
        gaze: gazeAt(gazeScene, c, t, this.resolveTarget),
        face: faceAt(scene, c, t),
        action: actionsAt(scene.timeline, c.id, t),
        speaking: speechLevelAt(scene, c.id, t),
        idle: idleProfile(CHARACTERS[c.kind].personality)
      })
    })
    this.environment.update(t, scene.environment)
    const show = options.overlays ?? false
    this.transforms.getHelper().visible = show && !!this.transforms.object
    this.selection.visible = show && !!this.transforms.object
    if (this.selection.visible) this.selection.update()
    if (scene.environment.bloom > 0.001) {
      this.bloom.strength = scene.environment.bloom
      this.composer.render()
    } else this.renderer.render(this.world, this.camera)
    if (show) {
      const w = this.overlay.width,
        h = this.overlay.height
      drawOverlay(this.overlayCtx, scene, t, w, h, true)
    }
  }
  /**
   * Offline rendering at an explicit size. The returned `frame` draws the
   * composited image (3D + subtitles) into any 2D context, for any timestamp.
   */
  capture(width: number, height: number) {
    this.capturing = true
    this.playing = false
    this.renderer.setPixelRatio(1)
    this.renderer.setSize(width, height, false)
    this.composer.setPixelRatio(1)
    this.composer.setSize(width, height)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    const source = this.renderer.domElement
    return {
      frame: (time: number, target: CanvasRenderingContext2D) => {
        this.renderFrame(time)
        target.drawImage(source, 0, 0, width, height)
        drawOverlay(target, this.scene, time, width, height, false)
      },
      end: () => {
        this.capturing = false
        this.resize()
      }
    }
  }
  private resize() {
    if (this.disposed || this.capturing) return
    const width = Math.max(1, this.host.clientWidth),
      height = Math.max(1, this.host.clientHeight),
      ratio = Math.min(devicePixelRatio, 2)
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height)
    this.composer.setPixelRatio(ratio)
    this.composer.setSize(width, height)
    this.overlay.width = Math.round(width * ratio)
    this.overlay.height = Math.round(height * ratio)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }
  private tick = (now: number) => {
    if (this.disposed) return
    this.frameId = requestAnimationFrame(this.tick)
    if (this.capturing) return
    if (!this.measureStart) this.measureStart = now
    const elapsed = this.previous ? Math.min(0.1, (now - this.previous) / 1000) : 0
    this.previous = now
    if (this.playing) {
      this.time = Math.min(this.scene.duration, this.time + elapsed)
      if (this.time >= this.scene.duration) this.playing = false
    }
    this.renderFrame(this.time, { camera: this.manualCamera ?? undefined, overlays: true })
    this.frameCount++
    if (now - this.measureStart > 500) {
      this.ms = (now - this.measureStart) / this.frameCount
      this.fps = 1000 / this.ms
      this.frameCount = 0
      this.measureStart = now
    }
    this.events.frame(this.time, this.fps, this.ms)
  }
  private pointerDown = (e: PointerEvent) => {
    this.pointerStart = [e.clientX, e.clientY]
  }
  private pointerUp = (e: PointerEvent) => {
    if (e.button !== 0 || this.dragging || this.transforms.axis) return
    if (Math.hypot(e.clientX - this.pointerStart[0], e.clientY - this.pointerStart[1]) > 4) return
    const rect = this.renderer.domElement.getBoundingClientRect(),
      ray = new T.Raycaster()
    ray.setFromCamera(
      new T.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, 1 - ((e.clientY - rect.top) / rect.height) * 2),
      this.camera
    )
    const hits = ray.intersectObjects(
      [...this.characters.values()].map((c) => c.root).concat([...this.props.values()], [this.environment.root]),
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
    for (const rig of this.characters.values()) rig.dispose()
    this.environment.dispose()
    disposeTree(this.world)
    this.composer.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
    this.overlay.remove()
  }
}
