/** Word-level timing derived from a line's text and window: no audio needed, deterministic. */
export interface TimedWord {
  text: string
  start: number
  end: number
  /** Index of the chunk (group of words shown together) this word belongs to. */
  chunk: number
}
/** A word's share of the line: letters count, punctuation adds a beat after it. */
function weight(word: string) {
  const letters = word.replace(/[^\p{L}\p{N}]/gu, '').length
  const pause = /[.!?…]$/.test(word) ? 2.2 : /[,;:]$/.test(word) ? 1.1 : 0
  return Math.max(1, letters) + 1.2 + pause
}
export function wordTimings(text: string, start: number, duration: number, wordsPerChunk = 3): TimedWord[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  const weights = words.map(weight)
  // The pause after a word belongs to its end, but a sentence end also closes the chunk.
  const total = weights.reduce((a, b) => a + b, 0)
  const result: TimedWord[] = []
  let t = start,
    chunk = 0,
    inChunk = 0
  words.forEach((word, i) => {
    const d = (weights[i]! / total) * duration
    result.push({ text: word, start: t, end: t + d, chunk })
    t += d
    inChunk++
    if (inChunk >= wordsPerChunk || /[.!?…]$/.test(word)) {
      chunk++
      inChunk = 0
    }
  })
  return result
}
