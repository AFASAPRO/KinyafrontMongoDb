<template>
  <teleport to="body">
    <div class="vm-screen" role="dialog" aria-modal="true" aria-label="Voice mode">

      <!-- Ambient background -->
      <div class="vm-bg" aria-hidden="true">
        <div class="vm-glow g1"></div>
        <div class="vm-glow g2"></div>
        <div class="vm-glow g3"></div>
      </div>

      <!-- Top bar -->
      <header class="vm-top">
        <button class="vm-exit" @click="exit" aria-label="Exit voice mode" title="Exit (Esc)">
          <i class="fas fa-xmark"></i><span>Exit</span>
        </button>
        <div class="vm-brand">
          <img src="/logo.png" alt="" class="vm-brand-logo" />
          <span>Voice Mode</span>
        </div>
        <button
          class="vm-autoplay"
          :class="{ on: autoSpeak }"
          @click="autoSpeak = !autoSpeak"
          :aria-pressed="autoSpeak ? 'true' : 'false'"
          :title="autoSpeak ? 'Spoken answers: on' : 'Spoken answers: off'"
        >
          <i :class="autoSpeak ? 'fas fa-volume-high' : 'fas fa-volume-xmark'"></i>
          <span class="vm-ap-label">{{ autoSpeak ? 'Voice on' : 'Voice off' }}</span>
        </button>
      </header>

      <!-- Center stage: reactive orb -->
      <main class="vm-stage">
        <div class="vm-orb-wrap">
          <!-- Sonar rings (listening) -->
          <div v-if="phase === 'listening'" class="vm-ring r1" aria-hidden="true"></div>
          <div v-if="phase === 'listening'" class="vm-ring r2" aria-hidden="true"></div>
          <div v-if="phase === 'listening'" class="vm-ring r3" aria-hidden="true"></div>
          <!-- Halo (thinking) -->
          <div v-if="phase === 'thinking' || phase === 'transcribing'" class="vm-halo" aria-hidden="true"></div>

          <!-- The orb IS the push-to-talk button -->
          <button
            class="vm-orb"
            :class="phase"
            :style="orbStyle"
            @click="toggleTalk"
            :disabled="!canTalk"
            :aria-label="orbAria"
            :title="orbTitle"
          >
            <!-- Speaking: equalizer -->
            <template v-if="phase === 'speaking'">
              <span class="vm-eq" aria-hidden="true"><i v-for="n in 5" :key="n" :style="`--i:${n}`"></i></span>
            </template>
            <!-- Thinking / transcribing: spinner -->
            <i v-else-if="phase === 'thinking' || phase === 'transcribing'" class="fas fa-circle-notch fa-spin"></i>
            <!-- Listening / idle: mic or stop -->
            <i v-else :class="phase === 'listening' ? 'fas fa-stop' : 'fas fa-microphone'"></i>
          </button>
        </div>

        <p class="vm-status" aria-live="polite">{{ statusText }}</p>
        <p v-if="phase === 'idle' && !transcript && !answer" class="vm-sub">Tap the orb and start speaking</p>
      </main>

      <!-- You said (editable before sending) -->
      <section v-if="transcript && phase !== 'listening'" class="vm-panel">
        <div class="vp-head you">
          <i class="fas fa-user"></i><span>You said</span>
          <button v-if="!sent && phase === 'idle'" class="vp-clear" @click="resetTurn" aria-label="Clear transcript">
            <i class="fas fa-xmark"></i>
          </button>
        </div>
        <textarea
          v-if="!sent && phase === 'idle'"
          v-model="transcript"
          class="vp-ta"
          rows="2"
          aria-label="Transcribed speech — edit before sending"
        ></textarea>
        <p v-else class="vp-text">{{ transcript }}</p>
        <div v-if="!sent && phase === 'idle'" class="vp-actions">
          <button class="vm-chip primary" @click="sendTranscript" :disabled="!transcript.trim()">
            <i class="fas fa-paper-plane"></i> Send
          </button>
          <button class="vm-chip" @click="startRec"><i class="fas fa-rotate-right"></i> Redo</button>
        </div>
      </section>

      <!-- KinyaBot's answer -->
      <section v-if="answer" class="vm-panel answer">
        <div class="vp-head bot">
          <img src="/logo.png" alt="" /><span>KinyaBot</span>
          <span v-if="phase === 'speaking'" class="vp-live"><i class="fas fa-circle"></i> speaking</span>
        </div>
        <p class="vp-text answer-text">{{ answer }}</p>
        <div class="vp-actions">
          <button v-if="phase !== 'speaking'" class="vm-chip" @click="playAnswer" :disabled="busyTts" aria-label="Play answer aloud">
            <i :class="busyTts ? 'fas fa-spinner fa-spin' : 'fas fa-volume-high'"></i> {{ busyTts ? 'Generating…' : 'Play again' }}
          </button>
          <button v-else class="vm-chip danger" @click="stopAnswer" aria-label="Stop audio">
            <i class="fas fa-stop"></i> Stop
          </button>
        </div>
      </section>

      <!-- Errors -->
      <div v-if="error" class="vm-error" role="alert">
        <i class="fas fa-triangle-exclamation"></i><span>{{ error }}</span>
        <button class="ve-x" @click="error=''" aria-label="Dismiss error"><i class="fas fa-xmark"></i></button>
      </div>

      <!-- Footer hint -->
      <footer class="vm-foot">
        <span class="vm-key"><b>Esc</b> exit</span>
        <span class="vm-dot">·</span>
        <span class="vm-key"><b>Space</b> {{ phase === 'listening' ? 'stop' : 'talk' }}</span>
        <span class="vm-dot">·</span>
        <span>Your speech is transcribed first so you can correct it before sending</span>
      </footer>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useChatStore } from '../stores/chat'
import api from '../api'

const emit = defineEmits(['close'])
const chatStore = useChatStore()

/* ── State machine: idle → listening → transcribing → thinking → speaking → idle ── */
const phase        = ref('idle')
const transcript   = ref('')
const sent         = ref(false)
const answer       = ref('')
const error        = ref('')
const busyTts      = ref(false)
const autoSpeak    = ref(true)
const micLevel     = ref(0)   // 0..1 live microphone loudness

const isRec        = computed(() => phase.value === 'listening')
const unsupported  = ref(false)

let mediaRecorder = null
let recStream     = null
let recChunks     = []
let audioCtx      = null
let analyser      = null
let meterRaf      = 0
let audioEl       = null

const canTalk = computed(() => !['transcribing', 'thinking'].includes(phase.value))

const statusText = computed(() => ({
  idle:         answer.value ? 'Tap to ask a follow-up' : transcript.value ? 'Review your words, then press Send' : 'Tap the orb to start talking',
  listening:    'Listening — tap the orb to stop',
  transcribing: 'Transcribing your speech…',
  thinking:     'KinyaBot is thinking…',
  speaking:     'Playing the answer aloud',
}[phase.value] || ''))

const orbAria = computed(() => ({
  idle: 'Start listening', listening: 'Stop and transcribe',
  transcribing: 'Transcribing', thinking: 'KinyaBot is thinking', speaking: 'Speaking',
}[phase.value]))

const orbTitle = computed(() => phase.value === 'listening' ? 'Stop & transcribe' : 'Tap to talk')

const orbStyle = computed(() => {
  if (phase.value !== 'listening') return {}
  const s = 1 + Math.min(0.28, micLevel.value * 0.55)
  const glow = 40 + micLevel.value * 90
  return { transform: `scale(${s.toFixed(3)})`, boxShadow: `0 0 ${glow}px rgba(139,92,246,${(0.45 + micLevel * 0.4).toFixed(2)})` }
})

/* ── Recording ─────────────────────────────────────────────────── */
function pickMime() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return candidates.find(c => window.MediaRecorder?.isTypeSupported?.(c)) || ''
}

async function startRec() {
  error.value = ''
  transcript.value = ''
  sent.value = false
  answer.value = ''
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    unsupported.value = true
    error.value = 'Voice input is not supported in this browser. Try Chrome, Edge or Safari.'
    return
  }
  try {
    recStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch (err) {
    error.value = err?.name === 'NotAllowedError'
      ? 'Microphone access was denied. Allow it in your browser settings and try again.'
      : 'The microphone could not be started. Please try again.'
    return
  }
  try {
    recChunks = []
    const mime = pickMime()
    mediaRecorder = mime ? new MediaRecorder(recStream, { mimeType: mime }) : new MediaRecorder(recStream)
    mediaRecorder.ondataavailable = (e) => { if (e.data?.size) recChunks.push(e.data) }
    mediaRecorder.onstop = onRecStop
    mediaRecorder.start(250)
    phase.value = 'listening'
    startMeter(recStream)
  } catch {
    cleanupRec()
    error.value = 'Recording could not start. Please try again.'
  }
}

function stopRec() {
  try { mediaRecorder?.state !== 'inactive' && mediaRecorder?.stop() } catch {}
  phase.value = 'transcribing'
  stopMeter()
}

function toggleTalk() {
  if (phase.value === 'speaking') { stopAnswer(); return }
  if (phase.value === 'listening') { stopRec(); return }
  if (phase.value === 'idle') startRec()
}

function resetTurn() { transcript.value = ''; sent.value = false; error.value = '' }

/* Live mic loudness → orb reactivity */
function startMeter(stream) {
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const src = audioCtx.createMediaStreamSource(stream)
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    src.connect(analyser)
    const data = new Uint8Array(analyser.fftSize)
    const tick = () => {
      if (!analyser) return
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v }
      micLevel.value = Math.min(1, Math.sqrt(sum / data.length) * 3.2)
      meterRaf = requestAnimationFrame(tick)
    }
    meterRaf = requestAnimationFrame(tick)
  } catch { /* metering is decorative — never blocks the flow */ }
}

function stopMeter() {
  cancelAnimationFrame(meterRaf)
  meterRaf = 0
  analyser = null
  try { audioCtx?.close() } catch {}
  audioCtx = null
  micLevel.value = 0
}

async function onRecStop() {
  cleanupRec()
  if (!recChunks.length) { phase.value = 'idle'; error.value = 'The recording was empty. Please try again.'; return }
  const mime = mediaRecorder?.mimeType || 'audio/webm'
  const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'
  const blob = new Blob(recChunks, { type: mime })
  recChunks = []
  if (blob.size < 1200) { phase.value = 'idle'; error.value = 'The recording was too short — hold a little longer.'; return }

  phase.value = 'transcribing'
  try {
    const fd = new FormData()
    fd.append('audio', blob, `voice-${Date.now()}.${ext}`)
    const { data } = await api.post('/stt', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 })
    const text = (data?.text || '').trim()
    if (!text) { phase.value = 'idle'; error.value = 'KinyaBot could not hear anything. Try speaking a bit louder.'; return }
    transcript.value = text
    phase.value = 'idle'
  } catch (err) {
    phase.value = 'idle'
    error.value = err?.response?.data?.error || 'Transcription failed. Please try again.'
  }
}

function cleanupRec() {
  recStream?.getTracks?.().forEach(t => t.stop())
  recStream = null
  mediaRecorder = null
  stopMeter()
}

/* ── Send + spoken reply ───────────────────────────────────────── */
async function sendTranscript() {
  if (!transcript.value.trim() || phase.value === 'thinking') return
  error.value = ''
  sent.value = true
  answer.value = ''
  phase.value = 'thinking'
  try {
    if (!chatStore.activeChat) await chatStore.createChat()
    await chatStore.sendMessage(transcript.value)
    const lastAi = [...chatStore.messages].reverse().find(m => m.role === 'assistant' && !m._error && m.content)
    answer.value = lastAi ? lastAi.content : ''
    if (!answer.value) { phase.value = 'idle'; return }
    if (autoSpeak.value) await playAnswer()
    else phase.value = 'idle'
  } catch (err) {
    phase.value = 'idle'
    error.value = err?.message || 'KinyaBot could not answer right now. Please try again.'
  }
}

async function playAnswer() {
  if (!answer.value) return
  error.value = ''
  busyTts.value = true
  try {
    const res = await api.post('/tts', { text: answer.value }, { responseType: 'blob', timeout: 90000 })
    audioEl?.pause()
    audioEl = new Audio(URL.createObjectURL(res.data))
    audioEl.onended = () => { if (phase.value === 'speaking') phase.value = 'idle' }
    phase.value = 'speaking'
    await audioEl.play()
  } catch (err) {
    phase.value = 'idle'
    let msg = null
    const d = err?.response?.data
    if (d instanceof Blob) { try { msg = JSON.parse(await d.text()).error } catch {} }
    else msg = err?.response?.data?.error
    error.value = msg || 'KinyaBot could not generate audio for this response. Please try again.'
  } finally {
    busyTts.value = false
  }
}

function stopAnswer() {
  try { audioEl?.pause() } catch {}
  if (audioEl) audioEl.currentTime = 0
  phase.value = 'idle'
}

function exit() { emit('close') }

/* ── Keyboard ──────────────────────────────────────────────────── */
function onKey(e) {
  if (e.key === 'Escape') { e.preventDefault(); exit(); return }
  if (e.code === 'Space' && canTalk.value) {
    const t = e.target
    const typing = t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')
    if (typing) return
    e.preventDefault()
    toggleTalk()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  try { mediaRecorder?.state !== 'inactive' && mediaRecorder?.stop() } catch {}
  cleanupRec()
  try { audioEl?.pause() } catch {}
  audioEl = null
})
</script>

<style scoped>
/* ── Full-screen stage ─────────────────────────────────────────── */
.vm-screen {
  position: fixed; inset: 0; z-index: 1300;
  display: flex; flex-direction: column;
  background:
    radial-gradient(1100px 620px at 50% -10%, rgba(109,40,217,.28), transparent 60%),
    radial-gradient(900px 520px at 85% 110%, rgba(79,70,229,.20), transparent 55%),
    radial-gradient(760px 480px at 8% 100%, rgba(236,72,153,.12), transparent 55%),
    #0b0714;
  color: #fff;
  animation: vmIn .28s ease;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 16px calc(max(12px, env(safe-area-inset-bottom)));
}
@keyframes vmIn { from { opacity: 0; } to { opacity: 1; } }

.vm-bg { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
.vm-glow { position: absolute; border-radius: 50%; filter: blur(90px); opacity: .5; }
.g1 { width: 420px; height: 420px; top: 8%; left: 50%; transform: translateX(-50%); background: rgba(124,58,237,.35); animation: drift 9s ease-in-out infinite alternate; }
.g2 { width: 340px; height: 340px; bottom: 6%; left: 4%; background: rgba(79,70,229,.28); animation: drift 11s ease-in-out infinite alternate-reverse; }
.g3 { width: 300px; height: 300px; bottom: 12%; right: 2%; background: rgba(236,72,153,.20); animation: drift 13s ease-in-out infinite alternate; }
@keyframes drift { from { transform: translate3d(0,0,0) scale(1); } to { transform: translate3d(24px,-30px,0) scale(1.12); } }

/* ── Top bar ───────────────────────────────────────────────────── */
.vm-top {
  position: relative; z-index: 2;
  display: flex; align-items: center; justify-content: space-between;
  padding: max(14px, env(safe-area-inset-top)) 6px 6px;
  flex-shrink: 0;
}
.vm-exit, .vm-autoplay {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 16px; border-radius: 99px;
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14);
  color: rgba(255,255,255,.85); font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all .2s; backdrop-filter: blur(8px);
}
.vm-exit:hover { background: rgba(239,68,68,.18); border-color: rgba(239,68,68,.4); color: #fca5a5; }
.vm-autoplay:hover { background: rgba(255,255,255,.12); }
.vm-autoplay.on { background: rgba(139,92,246,.22); border-color: rgba(139,92,246,.5); color: #d8ccff; }
.vm-ap-label { font-size: 12px; }
.vm-brand { display: flex; align-items: center; gap: 9px; font-size: 14.5px; font-weight: 700; letter-spacing: .01em; }
.vm-brand-logo { width: 26px; height: 26px; border-radius: 7px; object-fit: contain; }

/* ── Stage ─────────────────────────────────────────────────────── */
.vm-stage {
  position: relative; z-index: 2;
  flex: 1; min-height: 300px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 18px; padding: 12px 0;
}
.vm-orb-wrap { position: relative; width: 240px; height: 240px; display: flex; align-items: center; justify-content: center; }

.vm-orb {
  position: relative; z-index: 3;
  width: 170px; height: 170px; border-radius: 50%;
  border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 44px;
  background:
    radial-gradient(circle at 30% 28%, rgba(255,255,255,.35), transparent 42%),
    conic-gradient(from 210deg, #6d28d9, #4f46e5, #a855f7, #ec4899, #6d28d9);
  box-shadow: 0 0 60px rgba(124,58,237,.45), inset 0 0 34px rgba(255,255,255,.14);
  transition: transform .09s ease-out, box-shadow .09s ease-out, filter .3s ease;
  will-change: transform;
}
.vm-orb:hover:not(:disabled) { filter: brightness(1.1); }
.vm-orb:disabled { cursor: default; opacity: .9; }
.vm-orb:focus-visible { outline: 3px solid rgba(216,180,254,.85); outline-offset: 5px; }

.vm-orb.idle { animation: breathe 3.4s ease-in-out infinite; }
@keyframes breathe {
  0%, 100% { transform: scale(1); box-shadow: 0 0 48px rgba(124,58,237,.4), inset 0 0 34px rgba(255,255,255,.14); }
  50%      { transform: scale(1.045); box-shadow: 0 0 80px rgba(124,58,237,.62), inset 0 0 34px rgba(255,255,255,.18); }
}
.vm-orb.listening { font-size: 38px; }
.vm-orb.thinking, .vm-orb.transcribing { font-size: 40px; opacity: .92; animation: none; }
.vm-orb.speaking { animation: none; }

/* Sonar rings while listening */
.vm-ring {
  position: absolute; inset: 0; border-radius: 50%;
  border: 2px solid rgba(167,139,250,.55);
  animation: sonar 1.8s cubic-bezier(.2,.6,.3,1) infinite;
  pointer-events: none;
}
.r2 { animation-delay: .45s; }
.r3 { animation-delay: .9s; }
@keyframes sonar {
  0%   { transform: scale(.62); opacity: .85; }
  100% { transform: scale(1.55); opacity: 0; }
}

/* Halo while thinking */
.vm-halo {
  position: absolute; width: 208px; height: 208px; border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: rgba(216,180,254,.9);
  border-right-color: rgba(99,102,241,.5);
  animation: orbit 1.05s linear infinite;
  pointer-events: none;
}
@keyframes orbit { to { transform: rotate(360deg); } }

/* Equalizer while speaking */
.vm-eq { display: flex; align-items: center; gap: 6px; height: 62px; }
.vm-eq i {
  display: block; width: 9px; border-radius: 99px;
  background: linear-gradient(180deg, #f5d0fe, #c4b5fd);
  height: 18px;
  animation: eqBounce 1s ease-in-out infinite;
  animation-delay: calc(var(--i) * -.14s);
}
@keyframes eqBounce {
  0%, 100% { height: 14px; opacity: .75; }
  50%      { height: 52px; opacity: 1; }
}

.vm-status { font-size: 16.5px; font-weight: 600; text-align: center; letter-spacing: .01em; }
.vm-sub { font-size: 13px; color: rgba(255,255,255,.55); margin-top: -10px; }

/* ── Panels ────────────────────────────────────────────────────── */
.vm-panel {
  position: relative; z-index: 2;
  width: min(620px, 100%);
  margin: 0 auto 14px;
  background: rgba(255,255,255,.055);
  border: 1px solid rgba(255,255,255,.12);
  border-radius: 18px;
  padding: 13px 15px 13px;
  backdrop-filter: blur(14px);
  animation: rise .3s cubic-bezier(.3,1.2,.5,1);
}
@keyframes rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }

.vp-head { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: rgba(255,255,255,.66); margin-bottom: 8px; letter-spacing: .04em; text-transform: uppercase; }
.vp-head img { width: 18px; height: 18px; border-radius: 5px; }
.vp-clear { margin-left: auto; background: none; border: none; color: rgba(255,255,255,.5); cursor: pointer; font-size: 13px; padding: 3px 6px; border-radius: 6px; }
.vp-clear:hover { color: #fff; background: rgba(255,255,255,.1); }
.vp-live { margin-left: auto; display: inline-flex; align-items: center; gap: 5px; color: #c4b5fd; text-transform: none; letter-spacing: 0; }
.vp-live i { font-size: 7px; animation: blink 1.1s ease infinite; }
@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: .25; } }

.vp-ta {
  width: 100%; background: rgba(0,0,0,.28); color: #fff;
  border: 1px solid rgba(255,255,255,.16); border-radius: 12px;
  font-size: 14.5px; line-height: 1.6; padding: 10px 13px;
  resize: vertical; font-family: inherit; outline: none;
}
.vp-ta:focus { border-color: rgba(167,139,250,.65); box-shadow: 0 0 0 3px rgba(139,92,246,.18); }
.vp-text { font-size: 14.5px; line-height: 1.65; color: rgba(255,255,255,.92); white-space: pre-wrap; word-break: break-word; }
.answer-text { max-height: 210px; overflow-y: auto; }

.vp-actions { display: flex; gap: 9px; margin-top: 11px; flex-wrap: wrap; }
.vm-chip {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 18px; border-radius: 99px; font-size: 13px; font-weight: 600;
  background: rgba(255,255,255,.09); border: 1px solid rgba(255,255,255,.18);
  color: #fff; cursor: pointer; transition: all .2s;
}
.vm-chip:hover:not(:disabled) { background: rgba(255,255,255,.16); }
.vm-chip:disabled { opacity: .45; cursor: not-allowed; }
.vm-chip.primary { background: linear-gradient(135deg, #6d28d9, #4f46e5); border-color: transparent; box-shadow: 0 6px 20px rgba(109,40,217,.45); }
.vm-chip.primary:hover:not(:disabled) { filter: brightness(1.15); }
.vm-chip.danger { background: rgba(220,38,38,.2); border-color: rgba(248,113,113,.45); color: #fecaca; }
.vm-chip i { font-size: 12px; }

/* Error */
.vm-error {
  position: relative; z-index: 2;
  width: min(620px, 100%); margin: 0 auto 14px;
  display: flex; align-items: center; gap: 10px;
  background: rgba(239,68,68,.14); border: 1px solid rgba(239,68,68,.38);
  border-radius: 12px; padding: 11px 14px;
  color: #fecaca; font-size: 13px;
}
.vm-error span { flex: 1; }
.ve-x { background: none; border: none; color: rgba(254,202,202,.7); cursor: pointer; font-size: 14px; padding: 2px 5px; border-radius: 6px; }
.ve-x:hover { color: #fff; background: rgba(239,68,68,.25); }

/* Footer */
.vm-foot {
  position: relative; z-index: 2;
  display: flex; align-items: center; justify-content: center; gap: 9px; flex-wrap: wrap;
  padding: 10px 0 4px;
  font-size: 11.5px; color: rgba(255,255,255,.45);
}
.vm-key b {
  display: inline-block; padding: 2px 7px; border-radius: 6px;
  background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.16);
  color: rgba(255,255,255,.8); font-size: 10.5px; font-weight: 700;
}
.vm-dot { opacity: .5; }

/* ── Small screens ─────────────────────────────────────────────── */
@media (max-width: 560px) {
  .vm-orb-wrap { width: 210px; height: 210px; }
  .vm-orb { width: 150px; height: 150px; font-size: 38px; }
  .vm-halo { width: 184px; height: 184px; }
  .vm-status { font-size: 15px; }
  .vm-ap-label { display: none; }
  .vm-autoplay { padding: 9px 12px; }
  .vm-stage { min-height: 250px; }
}
@media (prefers-reduced-motion: reduce) {
  .vm-orb.idle, .vm-ring, .vm-halo, .vm-eq i, .vm-glow { animation: none !important; }
}
</style>
