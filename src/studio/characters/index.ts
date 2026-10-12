import type { CharacterData } from '../scene/model'
import { CharacterRig } from './rig'
import { buildKit } from './kit'
import { buildPip } from './pip'
import { buildBo } from './bo'
export { CharacterRig } from './rig'
export type { CharacterFrame } from './rig'
export function createCharacter(data: CharacterData) {
  const rig = new CharacterRig(data)
  ;({ kit: buildKit, pip: buildPip, bo: buildBo })[data.kind](rig)
  rig.root.traverse((o) => {
    o.userData.selectId = data.id
  })
  return rig
}
