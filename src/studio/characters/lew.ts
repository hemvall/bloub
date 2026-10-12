import * as T from 'three'
import { CharacterRig } from './rig'
import { outline, toonGradient } from '../engine/toon'
/**
 * Lew: the brand character, a low-poly raccoon. What must read at reel scale and
 * as a flat icon: the black eye mask with half-lidded eyes, the pointed ears, the
 * striped tail, the elongated body. Everything is a faceted ball or a cone; the
 * mask carries the expression (the lids are mask-coloured, so they read as mask).
 */
export const LEW_MASK = '#0f0f14'
export const LEW_PALE = '#ebe8ea'
export const LEW_DARK = '#3b4252'
let ballGeometry: T.IcosahedronGeometry | undefined
function ball() {
  ballGeometry ??= new T.IcosahedronGeometry(1, 1)
  return ballGeometry
}
/** Polyhedron geometry is non-indexed, so its normals are per face: the facets come free. */
function lowpoly(color: string) {
  return new T.MeshToonMaterial({ color, gradientMap: toonGradient() })
}
function facetedCone(radius: number, height: number) {
  const geometry = new T.ConeGeometry(radius, height, 4).toNonIndexed()
  geometry.computeVertexNormals()
  return geometry
}
function poly(parent: T.Object3D, position: [number, number, number], scale: [number, number, number], material: T.Material, outlined = true, shadow = true) {
  const mesh = new T.Mesh(ball(), material)
  mesh.position.set(...position)
  mesh.scale.set(...scale)
  mesh.castShadow = shadow
  parent.add(mesh)
  if (outlined) outline(mesh)
  return mesh
}
export function buildLew(rig: CharacterRig) {
  const coat = rig.coat
  const pale = lowpoly(LEW_PALE)
  const dark = lowpoly(LEW_DARK)
  const mask = lowpoly(LEW_MASK)
  // Body: an elongated ball with a pale front, dark feet.
  poly(rig.body, [0, 0.5, 0], [0.33, 0.5, 0.3], coat)
  poly(rig.body, [0, 0.45, 0.17], [0.21, 0.34, 0.15], pale, false)
  poly(rig.body, [-0.15, 0.06, 0.1], [0.13, 0.07, 0.19], dark)
  poly(rig.body, [0.15, 0.06, 0.1], [0.13, 0.07, 0.19], dark)
  // Tail: six rings on a curve, alternating coat and dark.
  const spine: [number, number, number][] = [
    [0.15, 0.22, -0.3],
    [0.32, 0.3, -0.45],
    [0.47, 0.45, -0.5],
    [0.58, 0.62, -0.45],
    [0.64, 0.8, -0.35],
    [0.66, 0.97, -0.22]
  ]
  const radii = [0.12, 0.135, 0.135, 0.125, 0.11, 0.09]
  spine.forEach((p, i) => poly(rig.body, p, [radii[i]!, radii[i]!, radii[i]!], i % 2 ? dark : coat))
  for (const [arm, side] of [
    [rig.leftArm, -1],
    [rig.rightArm, 1]
  ] as const) {
    arm.position.set(side * 0.32, 0.68, 0.04)
    poly(arm, [side * 0.02, -0.2, 0], [0.09, 0.22, 0.09], coat)
    poly(arm, [side * 0.02, -0.4, 0.02], [0.08, 0.07, 0.08], dark)
  }
  rig.metrics = {
    headHeight: 1.0,
    earRest: [0.25, -0.25],
    earLift: 0.8,
    armRest: [0.3, -0.3],
    mouthWidth: 0.07
  }
  // Head: a wide ball, the mask as a band plus two lobes that sweep down and out, a forehead stripe.
  poly(rig.head, [0, 0.42, 0], [0.6, 0.5, 0.54], coat)
  poly(rig.head, [0, 0.5, 0.36], [0.5, 0.17, 0.22], mask, false)
  for (const side of [-1, 1]) {
    const lobe = poly(rig.head, [side * 0.43, 0.42, 0.2], [0.2, 0.15, 0.2], mask, false)
    lobe.rotation.z = side * 0.5
  }
  poly(rig.head, [0, 0.7, 0.42], [0.05, 0.09, 0.07], mask, false)
  // Muzzle: pale, tiny, with a black nose.
  poly(rig.head, [0, 0.27, 0.49], [0.17, 0.12, 0.14], pale, false)
  poly(rig.head, [0, 0.31, 0.62], [0.06, 0.045, 0.05], mask, false, false)
  // Ears: four-sided cones, outward, with a pale inner face.
  for (const [ear, side] of [
    [rig.leftEar, -1],
    [rig.rightEar, 1]
  ] as const) {
    ear.position.set(side * 0.38, 0.82, -0.02)
    const cone = new T.Mesh(facetedCone(0.14, 0.32), coat)
    cone.position.y = 0.12
    cone.rotation.y = Math.PI / 4
    cone.castShadow = true
    ear.add(cone)
    outline(cone, 0.02)
    const inner = new T.Mesh(facetedCone(0.07, 0.18), pale)
    inner.position.set(0, 0.1, 0.06)
    inner.rotation.y = Math.PI / 4
    ear.add(inner)
  }
  // Eyes sit on the mask; their lids are mask-coloured so a half-lid reads as the mask's edge.
  rig.addEye([-0.22, 0.5, 0.47], 0.145, 0.85, mask, '#f5f4f0')
  rig.addEye([0.22, 0.5, 0.47], 0.145, 0.85, mask, '#f5f4f0')
  rig.mouth.position.set(0, 0.18, 0.6)
}
