import type { ActionId } from '../scene/model'
import { CHARACTERS } from '../characters/catalog'
import type { ActingCue, CastMember, DialogueLine } from './project'
/**
 * What makes a cast look alive between the written beats: speakers turn to
 * whoever they talk to, listeners turn to the speaker and react a little, in
 * proportion to their personality. Pure function of the lines, so it is
 * replayable and an explicit cue always wins over it.
 */
export interface AutoBeat {
  time: number
  actor: string
  gaze?: string
  action?: ActionId
}
const LOOK_LEAD = 0.2,
  LISTEN_LEAD = 0.1,
  GAZE_OVERRIDE_WINDOW = 0.6
const REACTION: Record<'subtle' | 'medium' | 'strong', { action: ActionId; minDuration: number }> = {
  subtle: { action: 'blink', minDuration: 1.4 },
  medium: { action: 'listen', minDuration: 1.6 },
  strong: { action: 'nod', minDuration: 1.6 }
}
export function conversationBeats(lines: DialogueLine[], cast: CastMember[], cues: ActingCue[]): AutoBeat[] {
  const beats: AutoBeat[] = []
  const sorted = [...lines].sort((a, b) => a.start - b.start)
  const explicitGaze = (actor: string, time: number) =>
    cues.some((c) => c.actor === actor && (c.command === 'lookAt' || c.command === 'lookAway') && Math.abs(c.time - time) <= GAZE_OVERRIDE_WINDOW)
  const intensity = (role: string) => {
    const member = cast.find((c) => c.role === role)
    return member ? CHARACTERS[member.kind].personality.reactionIntensity : 'medium'
  }
  let previousSpeaker: string | undefined
  sorted.forEach((line, i) => {
    const others = cast.filter((c) => c.role !== line.speaker)
    const listener = others.find((c) => c.role === previousSpeaker) ?? others[0]
    const lookTime = Math.max(0, line.start - LOOK_LEAD)
    if (!explicitGaze(line.speaker, lookTime)) beats.push({ time: lookTime, actor: line.speaker, gaze: listener?.role ?? 'camera' })
    for (const other of others) {
      const t = Math.max(0, line.start - LISTEN_LEAD)
      if (!explicitGaze(other.role, t)) beats.push({ time: t, actor: other.role, gaze: line.speaker })
      const reaction = REACTION[intensity(other.role)]
      if (line.duration >= reaction.minDuration) beats.push({ time: line.start + line.duration * 0.45, actor: other.role, action: reaction.action })
    }
    const words = line.text.split(/\s+/).length
    if (words >= 5) beats.push({ time: line.start + line.duration * 0.3, actor: line.speaker, action: 'emphasis' })
    if (i === sorted.length - 1 && line.text.trim().endsWith('?') && intensity(line.speaker) !== 'subtle')
      beats.push({ time: line.start + line.duration * 0.7, actor: line.speaker, action: 'tilt' })
    previousSpeaker = line.speaker
  })
  return beats.map((b) => ({ ...b, time: Math.round(b.time * 100) / 100 }))
}
