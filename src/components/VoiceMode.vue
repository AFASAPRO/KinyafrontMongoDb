<template>
  <teleport to="body">
    <div class="vm-screen" role="dialog" aria-modal="true" aria-label="Voice mode with Buddy">

      <!-- Top bar -->
      <header class="vm-top">
        <button class="vm-icon-btn" @click="exit" aria-label="Exit voice mode" title="Exit (Esc)">
          <i class="fas fa-arrow-left"></i>
        </button>
        <div class="vm-brand">
          <span class="vm-brand-dot" :class="phase"></span>
          <span>Buddy</span>
        </div>
        <div class="vm-top-actions">
          <button
            class="vm-icon-btn"
            :class="{ active: live }"
            @click="toggleLive"
            :aria-pressed="live ? 'true' : 'false'"
            title="Hands-free: keep listening after Buddy replies"
          >
            <i class="fas fa-infinity"></i>
          </button>
          <button
            class="vm-icon-btn"
            :class="{ active: autoSpeak }"
            @click="autoSpeak = !autoSpeak"
            :aria-pressed="autoSpeak ? 'true' : 'false'"
            :title="autoSpeak ? 'Spoken answers: on' : 'Spoken answers: off'"
          >
            <i :class="autoSpeak ? 'fas fa-volume-high' : 'fas fa-volume-xmark'"></i>
          </button>
        </div>
      </header>

      <!-- 3D stage -->
      <div class="vm-stage-card">
        <span class="vm-status-pill" :class="phase">
          <i class="vm-status-dot"></i>{{ statusText }}
        </span>
        <BuddyStage
          :controller="controller"
          :audio-level="audioLevel"
          :talking="phase === 'speaking'"
          @poke="onPoke"
        />
        <div class="vm-stage-hint" v-if="phase === 'idle' && !feed.length">Tap Buddy to say hi</div>
        <canvas class="vm-wave" ref="waveRef" aria-hidden="true"></canvas>
      </div>

      <!-- Conversation feed -->
      <section class="vm-feed" ref="feedRef">
        <div v-for="(t, i) in feed" :key="i" class="vm-turn" :class="t.role">
          <div class="vm-turn-head">
            <span class="vm-turn-avatar" :class="t.role">{{ t.role === 'assistant' ? 'B' : (userInitial) }}</span>
            <span>{{ t.role === 'assistant' ? 'Buddy' : (userName || 'You') }}</span>
          </div>
          <p class="vm-turn-text">{{ t.text }}</p>
        </div>
        <div v-if="interim" class="vm-turn user interim">
          <div class="vm-turn-head"><span class="vm-turn-avatar user">{{ userInitial }}</span><span>{{ userName || 'You' }}</span></div>
          <p class="vm-turn-text">{{ interim }}…</p>
        </div>
      </section>

      <!-- Errors -->
      <div v-if="error" class="vm-error" role="alert">
        <i class="fas fa-triangle-exclamation"></i><span>{{ error }}</span>
        <button class="ve-x" @click="error=''" aria-label="Dismiss error"><i class="fas fa-xmark"></i></button>
      </div>

      <!-- Composer -->
      <footer class="vm-composer">
        <button
          class="vm-orb"
          :class="phase"
          @click="toggleTalk"
          :disabled="!canTalk"
          :aria-label="orbAria"
          :title="orbTitle"
        >
          <span v-if="phase === 'speaking'" class="vm-eq" aria-hidden="true"><i v-for="n in 4" :key="n" :style="`--i:${n}`"></i></span>
          <i v-else-if="phase === 'thinking' || phase === 'transcribing'" class="fas fa-circle-notch fa-spin"></i>
          <i v-else :class="phase === 'listening' ? 'fas fa-stop' : 'fas fa-microphone'"></i>
        </button>
        <input
          v-model="typed"
          class="vm-typed"
          type="text"
          placeholder="Type to Buddy…"
          :disabled="phase === 'thinking'"
          @keydown.enter="sendTyped"
        />
        <button class="vm-send" @click="sendTyped" :disabled="!typed.trim() || phase === 'thinking'" aria-label="Send">
          <i class="fas fa-paper-plane"></i>
        </button>
      </footer>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useChatStore } from '../stores/chat'
import { useAuthStore } from '../stores/auth'
import api from '../api'
import BuddyStage from './BuddyStage.vue'
import { CharacterController } from '../character/controller.js'
import { matchRequestedMove, matchReactionMove, pickAmbientMove } from '../character/moves.js'

const emit = defineEmits(['close'])
const chatStore = useChatStore()
const authStore = useAuthStore()
const userName = computed(() => authStore.user?.username || '')
const userInitial = computed(() => (userName.value ? userName.value.trim()[0].toUpperCase() : 'Y'))

const controller = new CharacterController()

/* ── State machine: idle → listening → transcribing → thinking → speaking → idle ── */
const phase = ref('idle')
const interim = ref('')
const typed = ref('')
const feed = ref([])
const error = ref('')
const busyTts = ref(false)
const autoSpeak = ref(true)
const live = ref(false)
const audioLevel = ref(0)
const feedRef = ref(null)
const waveRef = ref(null)

const canTalk = computed(() => !['transcribing', 'thinking'].includes(phase.value))

const statusText = computed(() => ({
  idle: 'Ready',
  listening: 'Listening…',
  transcribing: 'Transcribing…',
  thinking: 'Thinking…',
  speaking: 'Talking',
}[phase.value] || 'Ready'))

const orbAria = computed(() => ({
  idle: 'Start listening', listening: 'Stop and transcribe',
  transcribing: 'Transcribing', thinking: 'Buddy is thinking', speaking: 'Speaking',
}[phase.value]))
const orbTitle = computed(() => phase.value === 'listening' ? 'Stop & transcribe' : 'Tap to talk')

let mediaRecorder = null
let recStream = null
let recChunks = []
let micCtx = null
let micAnalyser = null
let audioCtx = null
let speakAnalyser = null
let speakRaf = 0
let audioEl = null
const timers = []
function later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id }

function scrollFeed() {
  nextTick(() => { if (feedRef.value) feedRef.value.scrollTop = feedRef.value.scrollHeight })
}

/* ── Web Audio helpers ────────────────────────────────────────── */
function ensureAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  return audioCtx
}

function startMicMeter(stream) {
  try {
    micCtx = new (window.AudioContext || window.webkitAudioContext)()
    const src = micCtx.createMediaStreamSource(stream)
    micAnalyser = micCtx.createAnalyser()
    micAnalyser.fftSize = 256
    src.connect(micAnalyser)
    const data = new Uint8Array(micAnalyser.fftSize)
    const tick = () => {
      if (!micAnalyser) return
      micAnalyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v }
      controller.pulse(Math.min(1, Math.sqrt(sum / data.length) * 3.2))
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  } catch { /* metering is decorative */ }
}
function stopMicMeter() {
  micAnalyser = null
  try { micCtx?.close() } catch {}
  micCtx = null
}

function startSpeakMeter() {
  const data = new Uint8Array(speakAnalyser.fftSize)
  const tick = () => {
    if (!speakAnalyser) return
    speakAnalyser.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v }
    audioLevel.value = Math.min(1, Math.sqrt(sum / data.length) * 3.6)
    speakRaf = requestAnimationFrame(tick)
  }
  speakRaf = requestAnimationFrame(tick)
}
function stopSpeakMeter() {
  cancelAnimationFrame(speakRaf); speakRaf = 0
  audioLevel.value = 0
}

/* ── Waveform visualizer (canvas, flat solid bars — no gradients) ─ */
const ACCENT_RGB = '245,165,36'
let waveRaf = 0
let waveRo = null
function sizeWave() {
  const c = waveRef.value
  if (!c) return
  const rect = c.getBoundingClientRect()
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  c.width = Math.max(1, Math.round(rect.width * dpr))
  c.height = Math.max(1, Math.round(rect.height * dpr))
}
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}
function drawWave() {
  const c = waveRef.value
  if (c && c.width > 0) {
    const ctx = c.getContext('2d')
    const w = c.width, h = c.height
    ctx.clearRect(0, 0, w, h)
    const n = 30
    const gap = w / n
    const barW = Math.max(2, gap * 0.46)
    let bins = null, active = false
    if (phase.value === 'listening' && micAnalyser) {
      bins = new Uint8Array(micAnalyser.frequencyBinCount); micAnalyser.getByteFrequencyData(bins); active = true
    } else if (phase.value === 'speaking' && speakAnalyser) {
      bins = new Uint8Array(speakAnalyser.frequencyBinCount); speakAnalyser.getByteFrequencyData(bins); active = true
    }
    const t = performance.now() / 1000
    for (let i = 0; i < n; i++) {
      let v
      if (active && bins) {
        const idx = 2 + Math.floor((i / n) * Math.min(60, bins.length - 2))
        v = bins[idx] / 255
      } else {
        v = 0.1 + 0.05 * Math.sin(t * 1.6 + i * 0.45)
      }
      const barH = Math.max(3, v * h * 0.92)
      const x = i * gap + (gap - barW) / 2
      const y = (h - barH) / 2
      ctx.fillStyle = active ? `rgba(${ACCENT_RGB},${0.5 + v * 0.5})` : `rgba(${ACCENT_RGB},0.25)`
      roundRect(ctx, x, y, barW, barH, barW / 2)
      ctx.fill()
    }
  }
  waveRaf = requestAnimationFrame(drawWave)
}

/* ── Recording ─────────────────────────────────────────────────── */
function pickMime() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
  return candidates.find(c => window.MediaRecorder?.isTypeSupported?.(c)) || ''
}

async function startRec() {
  if (!canTalk.value) return
  error.value = ''
  interim.value = ''
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    error.value = 'Voice input is not supported in this browser. Try Chrome, Edge or Safari.'
    return
  }
  stopSpeaking()
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
    controller.setMode('listen')
    interim.value = 'Listening'
    startMicMeter(recStream)
  } catch {
    cleanupRec()
    error.value = 'Recording could not start. Please try again.'
  }
}

function stopRec() {
  try { mediaRecorder?.state !== 'inactive' && mediaRecorder?.stop() } catch {}
  phase.value = 'transcribing'
  stopMicMeter()
}

function toggleTalk() {
  if (phase.value === 'speaking') { stopSpeaking(); goIdle(); return }
  if (phase.value === 'listening') { stopRec(); return }
  if (phase.value === 'idle') startRec()
}

async function onRecStop() {
  cleanupRec()
  interim.value = ''
  if (!recChunks.length) { goIdle(); error.value = 'The recording was empty. Please try again.'; return }
  const mime = mediaRecorder?.mimeType || 'audio/webm'
  const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'
  const blob = new Blob(recChunks, { type: mime })
  recChunks = []
  if (blob.size < 1200) { goIdle(); error.value = 'The recording was too short — hold a little longer.'; return }

  phase.value = 'transcribing'
  try {
    const fd = new FormData()
    fd.append('audio', blob, `voice-${Date.now()}.${ext}`)
    const { data } = await api.post('/stt', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 })
    const text = (data?.text || '').trim()
    if (!text) { goIdle(); error.value = 'Buddy could not hear anything. Try speaking a bit louder.'; return }
    await handleUserText(text)
  } catch (err) {
    goIdle()
    error.value = err?.response?.data?.error || 'Transcription failed. Please try again.'
  }
}

function cleanupRec() {
  recStream?.getTracks?.().forEach(t => t.stop())
  recStream = null
  mediaRecorder = null
  stopMicMeter()
}

/* ── Send + spoken reply ───────────────────────────────────────── */
async function sendTyped() {
  const t = typed.value.trim()
  if (!t || phase.value === 'thinking') return
  typed.value = ''
  await handleUserText(t)
}

async function handleUserText(text) {
  error.value = ''
  feed.value.push({ role: 'user', text })
  scrollFeed()

  const requested = matchRequestedMove(text)
  if (requested) controller.perform(requested)

  phase.value = 'thinking'
  controller.setMode('think')
  try {
    if (!chatStore.activeChat) await chatStore.createChat()
    await chatStore.sendMessage(text)
    const lastAi = [...chatStore.messages].reverse().find(m => m.role === 'assistant' && !m._error && m.content)
    const reply = lastAi ? lastAi.content : ''
    if (!reply) { goIdle(); return }
    feed.value.push({ role: 'assistant', text: reply })
    scrollFeed()
    // Every move Buddy makes is chosen automatically — never from a menu.
    const move = requested || matchReactionMove(reply) || pickAmbientMove()
    if (autoSpeak.value) await speak(reply, move)
    else { if (move) controller.perform(move); goIdle() }
  } catch (err) {
    goIdle()
    error.value = err?.message || 'Buddy could not answer right now. Please try again.'
  }
}

async function speak(text, move) {
  if (!text) return
  error.value = ''
  busyTts.value = true
  try {
    const res = await api.post('/tts', { text }, { responseType: 'blob', timeout: 90000 })
    stopAudioEl()
    const ctx = ensureAudioCtx()
    audioEl = new Audio(URL.createObjectURL(res.data))
    audioEl.crossOrigin = 'anonymous'
    const src = ctx.createMediaElementSource(audioEl)
    speakAnalyser = ctx.createAnalyser()
    speakAnalyser.fftSize = 256
    src.connect(speakAnalyser)
    speakAnalyser.connect(ctx.destination)

    controller.setMode('talk')
    controller.setSpeaking(true)
    phase.value = 'speaking'
    if (move) later(() => controller.perform(move), 200)
    startSpeakMeter()

    audioEl.onended = () => { if (phase.value === 'speaking') finishSpeaking() }
    await audioEl.play()
  } catch (err) {
    finishSpeaking()
    let msg = null
    const d = err?.response?.data
    if (d instanceof Blob) { try { msg = JSON.parse(await d.text()).error } catch {} }
    else msg = err?.response?.data?.error
    error.value = msg || err?.message || 'Buddy could not generate audio for this response. Please try again.'
  } finally {
    busyTts.value = false
  }
}

function stopAudioEl() {
  try { audioEl?.pause() } catch {}
  if (audioEl) audioEl.currentTime = 0
  audioEl = null
  try { speakAnalyser?.disconnect() } catch {}
  speakAnalyser = null
}

function stopSpeaking() {
  stopSpeakMeter()
  stopAudioEl()
  controller.setSpeaking(false)
}

function finishSpeaking() {
  stopSpeaking()
  goIdle()
  if (live.value) later(() => startRec(), 500)
}

function goIdle() {
  phase.value = 'idle'
  controller.setMode('idle')
  controller.setSpeaking(false)
}

function toggleLive() {
  live.value = !live.value
  if (live.value && phase.value === 'idle') startRec()
}

/* ── Poke: tapping Buddy directly triggers an automatic reaction ── */
const POKES = [
  ['wave', 'Hey! Over here!'],
  ['jump', 'Boing!'],
  ['laugh', 'Hehe, that tickles!'],
  ['wow', 'Oh! You surprised me!'],
  ['cheer', 'Yay, you found me!'],
]
function onPoke() {
  if (phase.value !== 'idle') { controller.perform('wow'); return }
  const [move, line] = POKES[Math.floor(Math.random() * POKES.length)]
  if (autoSpeak.value) speak(line, move)
  else controller.perform(move)
}

function exit() {
  stopSpeaking()
  try { mediaRecorder?.state !== 'inactive' && mediaRecorder?.stop() } catch {}
  cleanupRec()
  emit('close')
}

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

onMounted(() => {
  window.addEventListener('keydown', onKey)
  feed.value.push({
    role: 'assistant',
    text: userName.value
      ? `Hey ${userName.value}! I'm Buddy. Tap the mic and talk to me, or type below.`
      : `Hey! I'm Buddy. Tap the mic and talk to me, or type below.`,
  })
  sizeWave()
  waveRo = new ResizeObserver(sizeWave)
  if (waveRef.value) waveRo.observe(waveRef.value)
  waveRaf = requestAnimationFrame(drawWave)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  timers.forEach(clearTimeout)
  cancelAnimationFrame(waveRaf)
  waveRo?.disconnect()
  try { mediaRecorder?.state !== 'inactive' && mediaRecorder?.stop() } catch {}
  cleanupRec()
  stopSpeaking()
  try { audioCtx?.close() } catch {}
})
</script>

<style scoped>
/* ── Flat, gradient-free palette ──────────────────────────────── */
.vm-screen {
  --vm-bg: #0b0c10;
  --vm-panel: #16181f;
  --vm-panel-2: #1c1f28;
  --vm-border: #292d38;
  --vm-text: #f4f5f7;
  --vm-text-dim: #9aa1b0;
  --vm-text-faint: #616a7c;
  --vm-accent: #f5a524;
  --vm-accent-ink: #22150a;
  --vm-danger: #ef4444;

  position: fixed; inset: 0; z-index: 1300;
  display: flex; flex-direction: column;
  background: var(--vm-bg);
  color: var(--vm-text);
  overflow: hidden;
  padding: 0 12px calc(max(10px, env(safe-area-inset-bottom)));
  animation: vmIn .2s ease;
}
@keyframes vmIn { from { opacity: 0; } to { opacity: 1; } }

/* ── Top bar ───────────────────────────────────────────────────── */
.vm-top {
  display: flex; align-items: center; justify-content: space-between;
  padding: max(12px, env(safe-area-inset-top)) 2px 10px;
  flex-shrink: 0; gap: 8px;
}
.vm-icon-btn {
  width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center;
  border-radius: 12px; background: var(--vm-panel); border: 1px solid var(--vm-border);
  color: var(--vm-text-dim); font-size: 14px; cursor: pointer; transition: background .15s, color .15s, border-color .15s;
}
.vm-icon-btn:hover { background: var(--vm-panel-2); color: var(--vm-text); }
.vm-icon-btn.active { background: var(--vm-accent); border-color: var(--vm-accent); color: var(--vm-accent-ink); }
.vm-top-actions { display: flex; gap: 8px; }
.vm-brand { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; letter-spacing: .02em; color: var(--vm-text); }
.vm-brand-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--vm-text-faint); flex-shrink: 0; }
.vm-brand-dot.listening, .vm-brand-dot.speaking { background: var(--vm-accent); }
.vm-brand-dot.thinking, .vm-brand-dot.transcribing { background: #5b8cff; }

/* ── 3D stage ──────────────────────────────────────────────────── */
.vm-stage-card {
  position: relative; flex-shrink: 0;
  height: min(40vh, 320px); min-height: 220px;
  border-radius: 20px; overflow: hidden;
  background: var(--vm-panel);
  border: 1px solid var(--vm-border);
}
.vm-status-pill {
  position: absolute; top: 10px; left: 10px; z-index: 3;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase;
  padding: 5px 10px 5px 8px; border-radius: 8px; color: var(--vm-text-dim);
  background: var(--vm-panel-2); border: 1px solid var(--vm-border);
}
.vm-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--vm-text-faint); }
.vm-status-pill.listening .vm-status-dot, .vm-status-pill.speaking .vm-status-dot { background: var(--vm-accent); }
.vm-status-pill.thinking .vm-status-dot, .vm-status-pill.transcribing .vm-status-dot { background: #5b8cff; }
.vm-status-pill.listening, .vm-status-pill.speaking { color: var(--vm-accent); }
.vm-status-pill.thinking, .vm-status-pill.transcribing { color: #8fadff; }
.vm-stage-hint {
  position: absolute; top: 10px; right: 10px; z-index: 3;
  font-size: 11px; font-weight: 600; color: var(--vm-text-faint);
  background: var(--vm-panel-2); border: 1px solid var(--vm-border);
  padding: 5px 10px; border-radius: 8px;
}
.vm-wave {
  position: absolute; left: 12px; right: 12px; bottom: 10px; height: 34px; z-index: 3;
  width: calc(100% - 24px);
}

/* ── Feed ──────────────────────────────────────────────────────── */
.vm-feed {
  flex: 1; min-height: 0;
  overflow-y: auto; display: flex; flex-direction: column; gap: 10px;
  padding: 12px 2px 10px;
}
.vm-turn { max-width: min(560px, 92%); animation: rise .2s ease both; }
.vm-turn.user { align-self: flex-end; }
.vm-turn.assistant { align-self: flex-start; }
@keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
.vm-turn-head { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; color: var(--vm-text-faint); margin-bottom: 5px; letter-spacing: .02em; }
.vm-turn.user .vm-turn-head { justify-content: flex-end; }
.vm-turn-avatar {
  width: 18px; height: 18px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 800; color: var(--vm-accent-ink); background: var(--vm-accent);
}
.vm-turn-avatar.user { background: var(--vm-panel-2); color: var(--vm-text-dim); border: 1px solid var(--vm-border); }
.vm-turn-text {
  font-size: 14.5px; line-height: 1.55; padding: 10px 13px; border-radius: 14px;
  background: var(--vm-panel); border: 1px solid var(--vm-border);
  white-space: pre-wrap; word-break: break-word; color: var(--vm-text);
}
.vm-turn.user .vm-turn-text { background: var(--vm-accent); border-color: var(--vm-accent); color: var(--vm-accent-ink); font-weight: 500; }
.vm-turn.interim .vm-turn-text { opacity: .6; font-style: italic; }

/* ── Error ─────────────────────────────────────────────────────── */
.vm-error {
  display: flex; align-items: center; gap: 10px;
  background: #241315; border: 1px solid #4a2226;
  border-radius: 12px; padding: 10px 13px; margin-bottom: 8px;
  color: #fca5a5; font-size: 13px; flex-shrink: 0;
}
.vm-error span { flex: 1; }
.ve-x { background: none; border: none; color: #fca5a5; opacity: .75; cursor: pointer; font-size: 14px; padding: 2px 5px; border-radius: 6px; }
.ve-x:hover { opacity: 1; background: rgba(239,68,68,.18); }

/* ── Composer ──────────────────────────────────────────────────── */
.vm-composer {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 10px; padding: 8px 2px 8px;
}
.vm-orb {
  flex-shrink: 0; width: 52px; height: 52px; border-radius: 16px;
  border: 1px solid var(--vm-accent); cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: var(--vm-accent-ink); font-size: 18px;
  background: var(--vm-accent);
  transition: transform .12s ease, opacity .15s ease;
}
.vm-orb:hover:not(:disabled) { transform: translateY(-1px); }
.vm-orb:active:not(:disabled) { transform: scale(.95); }
.vm-orb:disabled { cursor: default; opacity: .55; }
.vm-orb.listening { background: var(--vm-danger); border-color: var(--vm-danger); color: #fff; }
.vm-orb.thinking, .vm-orb.transcribing { background: var(--vm-panel-2); border-color: var(--vm-border); color: var(--vm-text-dim); }
.vm-eq { display: flex; align-items: center; gap: 3px; height: 20px; }
.vm-eq i { display: block; width: 3.5px; border-radius: 2px; background: var(--vm-accent-ink); height: 7px; animation: eqBounce 1s ease-in-out infinite; animation-delay: calc(var(--i) * -.14s); }
@keyframes eqBounce { 0%, 100% { height: 5px; opacity: .7; } 50% { height: 18px; opacity: 1; } }

.vm-typed {
  flex: 1; min-width: 0; background: var(--vm-panel); color: var(--vm-text);
  border: 1px solid var(--vm-border); border-radius: 14px;
  font-size: 14px; padding: 13px 16px; font-family: inherit; outline: none;
}
.vm-typed::placeholder { color: var(--vm-text-faint); }
.vm-typed:focus { border-color: var(--vm-accent); }
.vm-send {
  flex-shrink: 0; width: 46px; height: 46px; border-radius: 14px;
  background: var(--vm-panel); border: 1px solid var(--vm-border);
  color: var(--vm-text-dim); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;
  transition: background .15s, color .15s, border-color .15s;
}
.vm-send:disabled { opacity: .4; cursor: not-allowed; }
.vm-send:not(:disabled):hover { background: var(--vm-accent); border-color: var(--vm-accent); color: var(--vm-accent-ink); }

@media (prefers-reduced-motion: reduce) {
  .vm-eq i { animation: none !important; }
}
</style>
