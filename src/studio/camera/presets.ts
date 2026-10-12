import type { CameraPose } from '../scene/model'
/** World-space camera poses. Recording a preset writes a normal camera key. */
export const CAMERA_PRESETS: Record<string, CameraPose> = {
  Wide: { position: [7, 4.4, 10], target: [0, 2, -1], fov: 43 },
  Medium: { position: [3.7, 3.1, 7.8], target: [0, 2.5, -1.4], fov: 40 },
  'Close-up': { position: [1.4, 2.9, 3.2], target: [0, 2.7, -1.3], fov: 36 },
  Profile: { position: [6, 2.9, -0.2], target: [0, 2.5, -1.3], fov: 40 },
  'Over-the-shoulder': { position: [-2, 3.5, -3.2], target: [1.3, 2.4, 1], fov: 48 }
}
