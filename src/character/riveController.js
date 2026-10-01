/**
 * RiveCharacterController
 * -----------------------
 * Kinya is now a Rive (.riv) vector character instead of a 3D rig, so there's
 * no per-frame pose math to own any more — the state machine baked into the
 * .riv file handles blending between Idle/Listen/Talk and the blink/tap
 * reactions on its own. This class's only job is to be a small, stable
 * event bus that VoiceMode.vue can call exactly like it called the old 3D
 * controller (setMode, perform, setSpeaking, pulse), so VoiceMode.vue's
 * conversation logic didn't need to change — only *who's listening* did.
 * RiveStage.vue subscribes via onMode/onAction/onSpeaking and drives the
 * real Rive inputs from those callbacks.
 */
export class RiveCharacterController {
  constructor() {
    this.mode = 'idle' // 'idle' | 'listen' | 'think' | 'talk'
    this.speaking = false
    this.action = null // last one-shot move name (e.g. 'wave'), or null
    this._modeCbs = new Set()
    this._actionCbs = new Set()
    this._speakCbs = new Set()
    this._actionTimer = null
  }

  onMode(cb) {
    this._modeCbs.add(cb)
    cb(this.mode)
    return () => this._modeCbs.delete(cb)
  }

  onAction(cb) {
    this._actionCbs.add(cb)
    return () => this._actionCbs.delete(cb)
  }

  onSpeaking(cb) {
    this._speakCbs.add(cb)
    cb(this.speaking)
    return () => this._speakCbs.delete(cb)
  }

  /** kept for API compatibility with code written for the old 3D rig */
  subscribe(cb) {
    return this.onAction(cb)
  }

  setMode(mode) {
    if (mode === this.mode) return
    this.mode = mode
    for (const cb of this._modeCbs) cb(mode)
  }

  setSpeaking(on) {
    on = !!on
    if (on === this.speaking) return
    this.speaking = on
    for (const cb of this._speakCbs) cb(on)
  }

  /** Fire a one-shot reaction. Always "succeeds" — RiveStage decides how
   *  (or whether) the .riv file can actually express it — so callers never
   *  need to branch on the result. */
  perform(name) {
    this.action = name
    for (const cb of this._actionCbs) cb(name)
    clearTimeout(this._actionTimer)
    this._actionTimer = setTimeout(() => {
      this.action = null
      for (const cb of this._actionCbs) cb(null)
    }, 1600)
    return true
  }

  /** Speech-boundary pulse from the old mic meter. The Rive mouth is driven
   *  directly from live audio level in RiveStage instead, so this is kept
   *  only so VoiceMode.vue's existing call site doesn't need an `if`. */
  pulse() {}
}
