/**
 * Shared singleton audio player for TTS / voice playback.
 * Guarantees only one bubble plays audio at a time.
 */
let sharedAudio = null
let sharedOwner = null

export function register(audioEl, owner) {
  if (sharedAudio && sharedAudio !== audioEl) {
    try { sharedAudio.pause() } catch {}
    try { sharedOwner?.forceIdle?.() } catch {}
  }
  sharedAudio = audioEl
  sharedOwner = owner
}

export function unregister(audioEl) {
  if (sharedAudio === audioEl) { sharedAudio = null; sharedOwner = null }
}
