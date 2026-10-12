import type { EnvironmentId } from '../scene/model'
import type { EnvironmentInstance } from './types'
import { buildNightBar } from './nightBar'
import { buildRooftop } from './rooftop'
import { buildStage } from './stage'
export { ENVIRONMENTS, ENVIRONMENT_IDS } from './catalog'
export type { EnvironmentInstance } from './types'
const BUILDERS: Record<EnvironmentId, () => EnvironmentInstance> = {
  'night-bar': buildNightBar,
  rooftop: buildRooftop,
  stage: buildStage
}
export function buildEnvironment(id: EnvironmentId) {
  return BUILDERS[id]()
}
