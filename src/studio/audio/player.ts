/**
 * Preview playback of a rendered mix: one buffer, started at the playhead's
 * offset. Nothing is computed live; what plays is exactly the export's audio.
 */
export class AudioPreview {
  private ctx?: AudioContext
  private source?: AudioBufferSourceNode
  private gain?: GainNode
  private buffer?: AudioBuffer
  muted = false
  volume = 1
  setBuffer(buffer: AudioBuffer | undefined) {
    this.buffer = buffer
  }
  /** Must be called from a user gesture the first time: browsers gate audio on it. */
  play(offset: number) {
    this.stop()
    if (!this.buffer || this.muted) return
    this.ctx ??= new AudioContext()
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    this.gain ??= this.ctx.createGain()
    this.gain.gain.value = this.volume
    this.gain.connect(this.ctx.destination)
    const src = this.ctx.createBufferSource()
    src.buffer = this.buffer
    src.connect(this.gain)
    const at = Math.max(0, Math.min(this.buffer.duration - 0.01, offset))
    src.start(0, at)
    this.source = src
  }
  stop() {
    try {
      this.source?.stop()
    } catch {
      /* already stopped */
    }
    this.source?.disconnect()
    this.source = undefined
  }
  setVolume(v: number) {
    this.volume = v
    if (this.gain) this.gain.gain.value = v
  }
  dispose() {
    this.stop()
    void this.ctx?.close()
  }
}
