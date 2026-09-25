<template>
  <teleport to="body">
    <div class="vm-screen" role="dialog" aria-modal="true" aria-label="Voice mode with Buddy">

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
          <span>Buddy</span>
        </div>
        <div class="vm-top-actions">
          <button
            class="vm-toggle"
            :class="{ on: live }"
            @click="toggleLive"
            :aria-pressed="live ? 'true' : 'false'"
            title="Hands-free: keep listening after Buddy replies"
          >
            <i class="fas fa-infinity"></i><span class="vm-toggle-label">Hands-free</span>
          </button>
          <button
            class="vm-toggle"
            :class="{ on: autoSpeak }"
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
        <span class="vm-status-pill" :class="phase">{{ statusText }}</span>
        <BuddyStage
          :controller="controller"
          :audio-level="audioLevel"
          :talking="phase === 'speaking'"
          @poke="onPoke"
        />
      </div>

      <!-- Quick moves -->
      <div class="vm-moves" role="toolbar" aria-label="Ask Buddy to do a move">
        <button v-for="m in QUICK_MOVES" :key="m.name" class="vm-move-chip" @click="doMove(m.name)" :title="m.label">
          <span>{{ m.emoji }}</span>{{ m.label }}
        </button>
      </div>

      <!-- Conversation feed -->
      <section class="vm-feed" ref="feedRef">
        <div v-for="(t, i) in feed" :key="i" class="vm-turn" :class="t.role">
          <div class="vm-turn-head">
            <img v-if="t.role === 'assistant'" src="/logo.png" alt="" />
            <i v-else class="fas fa-user"></i>
            <span>{{ t.role === 'assistant' ? 'Buddy' : (userName || 'You') }}</span>
          </div>
          <p class="vm-turn-text">{{ t.text }}</p>
        </div>
        <div v-if="interim" class="vm-turn user interim">
          <div class="vm-turn-head"><i class="fas fa-user"></i><span>{{ userName || 'You' }}</span></div>
          <p class="vm-turn-text">{{ interim }}…</p>
        </div>
        <div v-if="!feed.length && !interim" class="vm-empty">Tap the mic and talk to Buddy, or type below.</div>
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
          <template v-if="phase === 'speaking'">
            <span class="vm-eq" aria-hidden="true"><i v-for="n in 4" :key="n" :style="`--i:${n}`"></i></span>
          </template>
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

      <div class="vm-foot-hint">
        <span class="vm-key"><b>Esc</b> exit</span>
        <span class="vm-dot">·</span>
        <span class="vm-key"><b>Space</b> {{ phase === 'listening' ? 'stop' : 'talk' }}</span>
      </div>
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
import { matchRequestedMove, matchReactionMove } from '../character/moves.js'

const emit = defineEmits(['close'])
const chatStore = useChatStore()
const authStore = useAuthStore()
const userName = computed(() => authStore.user?.username || '')

const QUICK_MOVES = [
  { name: 'wave', emoji: '👋', label: 'Wave' },
  { name: 'dance', emoji: '💃', label: 'Dance' },
  { name: 'jump', emoji: '🦘', label: 'Jump' },
  { name: 'clap', emoji: '👏', label: 'Clap' },
  { name: 'cheer', emoji: '🎉', label: 'Cheer' },
  { name: 'laugh', emoji: '😂', label: 'Laugh' },
  { name: 'spin', emoji: '🌀', label: 'Spin' },
  { name: 'bow', emoji: '🙇', label: 'Bow' },
]

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
const micLevel = ref(0)
const audioLevel = ref(0)
const feedRef = ref(null)

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
let meterRaf = 0
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
      micLevel.value = Math.min(1, Math.sqrt(sum / data.length) * 3.2)
      controller.pulse(micLevel.value)
      meterRaf = requestAnimationFrame(tick)
    }
    meterRaf = requestAnimationFrame(tick)
  } catch { /* metering is decorative */ }
}
function stopMicMeter() {
  cancelAnimationFrame(meterRaf); meterRaf = 0
  micAnalyser = null
  try { micCtx?.close() } catch {}
  micCtx = null
  micLevel.value = 0
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
    const move = requested || matchReactionMove(reply)
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

/* ── Poke / quick moves ───────────────────────────────────────── */
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
function doMove(name) { controller.perform(name) }

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
      ? `Hey ${userName.value}! I'm Buddy. Tap the mic and talk to me, or type below — I can also wave, dance, jump and more.`
      : `Hey! I'm Buddy. Tap the mic and talk to me, or type below — I can also wave, dance, jump and more.`,
  })
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  timers.forEach(clearTimeout)
  try { mediaRecorder?.state !== 'inactive' && mediaRecorder?.stop() } catch {}
  cleanupRec()
  stopSpeaking()
  try { audioCtx?.close() } catch {}
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
  overflow: hidden;
  padding: 0 12px calc(max(10px, env(safe-area-inset-bottom)));
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
  padding: max(12px, env(safe-area-inset-top)) 4px 6px;
  flex-shrink: 0; gap: 8px;
}
.vm-exit, .vm-toggle {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 13px; border-radius: 99px;
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14);
  color: rgba(255,255,255,.85); font-size: 12.5px; font-weight: 600;
  cursor: pointer; transition: all .2s; backdrop-filter: blur(8px);
}
.vm-exit:hover { background: rgba(239,68,68,.18); border-color: rgba(239,68,68,.4); color: #fca5a5; }
.vm-toggle:hover { background: rgba(255,255,255,.12); }
.vm-toggle.on { background: rgba(139,92,246,.22); border-color: rgba(139,92,246,.5); color: #d8ccff; }
.vm-top-actions { display: flex; gap: 8px; }
.vm-toggle-label { font-size: 11.5px; }
.vm-brand { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; letter-spacing: .01em; }
.vm-brand-logo { width: 24px; height: 24px; border-radius: 6px; object-fit: contain; }

/* ── 3D stage ──────────────────────────────────────────────────── */
.vm-stage-card {
  position: relative; z-index: 2; flex-shrink: 0;
  height: min(32vh, 260px); min-height: 190px;
  margin: 4px 0 8px; border-radius: 22px; overflow: hidden;
  background: radial-gradient(120% 120% at 50% 15%, rgba(255,255,255,.06), rgba(255,255,255,0) 60%), rgba(255,255,255,.03);
  border: 1px solid rgba(255,255,255,.1);
}
.vm-status-pill {
  position: absolute; top: 10px; left: 12px; z-index: 3;
  font-size: 11px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase;
  padding: 4px 10px; border-radius: 99px; color: rgba(255,255,255,.8);
  background: rgba(0,0,0,.3); border: 1px solid rgba(255,255,255,.14);
}
.vm-status-pill.listening { color: #c4b5fd; }
.vm-status-pill.thinking, .vm-status-pill.transcribing { color: #93c5fd; }
.vm-status-pill.speaking { color: #f5d0fe; }

/* ── Quick moves ───────────────────────────────────────────────── */
.vm-moves {
  position: relative; z-index: 2; flex-shrink: 0;
  display: flex; gap: 8px; overflow-x: auto; padding: 2px 2px 8px;
  scrollbar-width: none;
}
.vm-moves::-webkit-scrollbar { display: none; }
.vm-move-chip {
  flex-shrink: 0; display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 13px; border-radius: 99px; font-size: 12.5px; font-weight: 600;
  background: rgba(255,255,255,.07); border: 1px solid rgba(255,255,255,.14);
  color: #fff; cursor: pointer; transition: all .15s;
}
.vm-move-chip:hover { background: rgba(255,255,255,.14); }
.vm-move-chip:active { transform: scale(.94); }

/* ── Feed ──────────────────────────────────────────────────────── */
.vm-feed {
  position: relative; z-index: 2; flex: 1; min-height: 0;
  overflow-y: auto; display: flex; flex-direction: column; gap: 10px;
  padding: 4px 2px 10px;
}
.vm-turn { max-width: min(560px, 92%); animation: rise .25s ease both; }
.vm-turn.user { align-self: flex-end; }
.vm-turn.assistant { align-self: flex-start; }
@keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.vm-turn-head { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: rgba(255,255,255,.55); margin-bottom: 4px; letter-spacing: .03em; text-transform: uppercase; }
.vm-turn.user .vm-turn-head { justify-content: flex-end; }
.vm-turn-head img { width: 15px; height: 15px; border-radius: 4px; }
.vm-turn-text {
  font-size: 14.5px; line-height: 1.55; padding: 9px 13px; border-radius: 16px;
  background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  white-space: pre-wrap; word-break: break-word;
}
.vm-turn.user .vm-turn-text { background: rgba(124,58,237,.22); border-color: rgba(124,58,237,.35); }
.vm-turn.interim .vm-turn-text { opacity: .65; font-style: italic; }
.vm-empty { text-align: center; color: rgba(255,255,255,.4); font-size: 13px; padding: 18px 0; }

/* ── Error ─────────────────────────────────────────────────────── */
.vm-error {
  position: relative; z-index: 2; flex-shrink: 0;
  display: flex; align-items: center; gap: 10px;
  background: rgba(239,68,68,.14); border: 1px solid rgba(239,68,68,.38);
  border-radius: 12px; padding: 10px 13px; margin-bottom: 8px;
  color: #fecaca; font-size: 13px;
}
.vm-error span { flex: 1; }
.ve-x { background: none; border: none; color: rgba(254,202,202,.7); cursor: pointer; font-size: 14px; padding: 2px 5px; border-radius: 6px; }
.ve-x:hover { color: #fff; background: rgba(239,68,68,.25); }

/* ── Composer ──────────────────────────────────────────────────── */
.vm-composer {
  position: relative; z-index: 2; flex-shrink: 0;
  display: flex; align-items: center; gap: 10px; padding: 6px 2px 4px;
}
.vm-orb {
  flex-shrink: 0; position: relative; width: 52px; height: 52px; border-radius: 50%;
  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 19px;
  background: radial-gradient(circle at 30% 28%, rgba(255,255,255,.35), transparent 42%), conic-gradient(from 210deg, #6d28d9, #4f46e5, #a855f7, #ec4899, #6d28d9);
  box-shadow: 0 0 26px rgba(124,58,237,.45), inset 0 0 14px rgba(255,255,255,.14);
  transition: transform .12s ease, box-shadow .12s ease, filter .2s;
}
.vm-orb:hover:not(:disabled) { filter: brightness(1.1); }
.vm-orb:disabled { cursor: default; opacity: .85; }
.vm-orb.listening { box-shadow: 0 0 0 6px rgba(139,92,246,.28), 0 0 26px rgba(124,58,237,.5); }
.vm-orb.speaking { animation: none; }
.vm-eq { display: flex; align-items: center; gap: 4px; height: 24px; }
.vm-eq i { display: block; width: 4px; border-radius: 99px; background: linear-gradient(180deg, #f5d0fe, #c4b5fd); height: 8px; animation: eqBounce 1s ease-in-out infinite; animation-delay: calc(var(--i) * -.14s); }
@keyframes eqBounce { 0%, 100% { height: 6px; opacity: .75; } 50% { height: 20px; opacity: 1; } }

.vm-typed {
  flex: 1; min-width: 0; background: rgba(255,255,255,.07); color: #fff;
  border: 1px solid rgba(255,255,255,.16); border-radius: 99px;
  font-size: 14px; padding: 12px 16px; font-family: inherit; outline: none;
}
.vm-typed::placeholder { color: rgba(255,255,255,.4); }
.vm-typed:focus { border-color: rgba(167,139,250,.65); box-shadow: 0 0 0 3px rgba(139,92,246,.18); }
.vm-send {
  flex-shrink: 0; width: 44px; height: 44px; border-radius: 50%;
  background: rgba(255,255,255,.09); border: 1px solid rgba(255,255,255,.18);
  color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px;
}
.vm-send:disabled { opacity: .4; cursor: not-allowed; }
.vm-send:hover:not(:disabled) { background: rgba(255,255,255,.16); }

.vm-foot-hint {
  position: relative; z-index: 2; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 4px 0 2px; font-size: 11px; color: rgba(255,255,255,.4);
}
.vm-key b { display: inline-block; padding: 2px 6px; border-radius: 6px; background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.16); color: rgba(255,255,255,.8); font-size: 10px; font-weight: 700; }
.vm-dot { opacity: .5; }

@media (max-width: 560px) {
  .vm-foot-hint { display: none; }
  .vm-toggle-label { display: none; }
  .vm-toggle { padding: 8px 10px; }
}
@media (prefers-reduced-motion: reduce) {
  .vm-glow, .vm-eq i { animation: none !important; }
}
</style>
