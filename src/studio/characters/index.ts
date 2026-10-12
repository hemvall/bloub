import type { CharacterData } from '../scene/model'
import { CharacterRig } from './rig'
import { buildKit } from './kit'
import { buildPip } from './pip'
import { buildBo } from './bo'
import { buildLew } from './lew'
import { buildCeo } from './ceo'
import { buildDev } from './dev'
export { CharacterRig } from './rig'
export type { CharacterFrame } from './rig'
export function createCharacter(data: CharacterData) {
  const rig = new CharacterRig(data)
  ;({ kit: buildKit, pip: buildPip, bo: buildBo, lew: buildLew, ceo: buildCeo, dev: buildDev })[data.kind](rig)
  rig.root.traverse((o) => {
    o.userData.selectId = data.id
  })
  return rig
}
