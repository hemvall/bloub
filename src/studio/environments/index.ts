import type { EnvironmentId } from '../scene/model'
import type { EnvironmentInstance } from './types'
import { buildNightBar } from './nightBar'
import { buildRooftop } from './rooftop'
import { buildStage } from './stage'
import { buildOfficeNight } from './officeNight'
import { buildMeetingRoom } from './meetingRoom'
import { buildAiLab } from './aiLab'
export { ENVIRONMENTS, ENVIRONMENT_IDS } from './catalog'
export type { EnvironmentInstance } from './types'
const BUILDERS: Record<EnvironmentId, () => EnvironmentInstance> = {
  'night-bar': buildNightBar,
  rooftop: buildRooftop,
  stage: buildStage,
  'office-night': buildOfficeNight,
  'meeting-room': buildMeetingRoom,
  'ai-lab': buildAiLab
}
export function buildEnvironment(id: EnvironmentId) {
  return BUILDERS[id]()
}
