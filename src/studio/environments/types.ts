import type * as T from 'three'
import type { EnvironmentSettings } from '../scene/model'
export interface EnvironmentInstance {
  root: T.Group
  /** Pure function of scene time: particles and practicals never keep per-frame state. */
  update: (time: number, settings: EnvironmentSettings) => void
  dispose: () => void
}
