<template>
  <teleport to="body">
    <div class="vm-screen" role="dialog" aria-modal="true" aria-label="Voice mode with Kinya">

      <!-- LEFT (desktop) / TOP (mobile): Kinya's full-bleed living environment -->
      <section class="vm-character-pane">
        <div class="vm-character-bg" aria-hidden="true">
          <span class="vm-blob vm-blob-a"></span>
          <span class="vm-blob vm-blob-b"></span>
          <span class="vm-particle" v-for="n in 9" :key="n"></span>
        </div>

        <button class="vm-icon-btn vm-exit" @click="exit" aria-label="Exit voice mode" title="Exit (Esc)">
          <i class="fas fa-arrow-left"></i>
        </button>

        <div class="vm-brand">
          <span class="vm-brand-dot" :class="phase"></span>
          <span>Kinya</span>
        </div>

        <span class="vm-status-pill" :class="phase">
          <i class="vm-status-dot"></i>{{ statusText }}
        </span>

        <RiveStage
          class="vm-rive"
          :controller="controller"
          :audio-level="audioLevel"
          :talking="phase === 'speaking'"
          @poke="onPoke"
        />

        <p v-if="currentCaption" class="vm-caption">{{ currentCaption }}</p>
        <div v-else-if="phase === 'idle' && feed.length <= 1" class="vm-stage-hint">Tap Kinya to say hi</div>

        <canvas class="vm-wave" ref="waveRef" aria-hidden="true"></canvas>
      </section>

      <!-- RIGHT (desktop) / BOTTOM (mobile): conversation + voice command -->
      <section class="vm-chat-pane">
        <header class="vm-top">
          <div class="vm-top-left">
            <h2 class="vm-top-title">Conversation</h2>
            <button class="vm-view-chat" @click="exit" title="This conversation is saved — open it in the full chat view">
              <i class="fas fa-arrow-right-arrow-left"></i> View full chat
            </button>
          </div>
          <div class="vm-top-actions">
            <button
              v-if="Object.keys(memory).length"
              class="vm-icon-btn vm-mem-btn"
              @click="showMemory = !showMemory"
              :aria-pressed="showMemory ? 'true' : 'false'"
              title="What Kinya remembers about you"
            >
              <i class="fas fa-brain"></i>
            </button>
            <button
              class="vm-icon-btn"
              :class="{ active: live }"
              @click="toggleLive"
              :aria-pressed="live ? 'true' : 'false'"
              title="Hands-free: keep listening after Kinya replies"
            >
              <i class="fas fa-infinity"></i>
            </button>
            <button
              class="vm-icon-btn"
              :class="{ active: autoSpeak }"
              @click="toggleAutoSpeak"
              :aria-pressed="autoSpeak ? 'true' : 'false'"
              :title="autoSpeak ? 'Spoken answers: on' : 'Spoken answers: off'"
            >
              <i :class="autoSpeak ? 'fas fa-volume-high' : 'fas fa-volume-xmark'"></i>
            </button>
          </div>
        </header>

        <!-- "What Kinya remembers about you" panel -->
        <transition name="fade">
          <div v-if="showMemory" class="vm-memory-panel">
            <div class="vm-memory-head">
              <span><i class="fas fa-brain"></i> Kinya knows</span>
              <button class="vm-mem-clear" @click="forgetAll" title="Forget everything">Forget all</button>
            </div>
            <ul class="vm-memory-list">
              <li v-for="(val, key) in memory" :key="key">
                <span class="vm-mem-key">{{ friendlyMemoryKey(key) }}</span>
                <span class="vm-mem-val">{{ val }}</span>
                <button class="vm-mem-x" @click="forgetKey(key)" :aria-label="`Forget ${friendlyMemoryKey(key)}`">
                  <i class="fas fa-xmark"></i>
                </button>
              </li>
            </ul>
          </div>
        </transition>

        <!-- Conversation feed -->
        <section class="vm-feed" ref="feedRef">
          <div v-for="(t, i) in feed" :key="i" class="vm-turn" :class="t.role">
            <div class="vm-turn-head">
              <span class="vm-turn-avatar" :class="t.role">{{ t.role === 'assistant' ? 'K' : (userInitial) }}</span>
              <span>{{ t.role === 'assistant' ? 'Kinya' : (userName || 'You') }}</span>
            </div>
            <div
              class="vm-turn-text"
              :class="{ prose: t.role === 'assistant', streaming: t._streaming }"
              v-html="t.role === 'assistant' ? renderMarkdown(t.text || (t._streaming ? '…' : '')) : renderPlainText(t.text)"
            ></div>
            <div v-if="t.role === 'assistant' && i === lastAssistantIndex && phase === 'idle'" class="vm-turn-actions">
              <button class="vm-turn-act" @click="replay(t.text)" title="Read again">
                <i class="fas fa-rotate"></i> Read again
              </button>
              <button class="vm-turn-act" @click="regenerateLast" :class="{ spin: regenBusy }" title="Regenerate response">
                <i class="fas fa-arrows-rotate"></i> Regenerate
              </button>
            </div>
          </div>
          <div v-if="interim" class="vm-turn user interim">
            <div class="vm-turn-head"><span class="vm-turn-avatar user">{{ userInitial }}</span><span>{{ userName || 'You' }}</span></div>
            <p class="vm-turn-text">{{ interim }}…</p>
          </div>

          <div v-if="showSuggestions" class="vm-suggest">
            <button v-for="s in suggestions" :key="s.label" class="vm-suggest-chip" @click="useSuggestion(s)">
              <i :class="s.icon"></i>{{ s.label }}
            </button>
          </div>
        </section>

        <!-- Errors -->
        <div v-if="error" class="vm-error" role="alert">
          <i class="fas fa-triangle-exclamation"></i><span>{{ error }}</span>
          <button class="ve-x" @click="error=''" aria-label="Dismiss error"><i class="fas fa-xmark"></i></button>
        </div>

        <!-- Composer / voice command -->
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
            placeholder="Type to Kinya… or say “stop”, “repeat that”, “go back to chat”"
            :disabled="phase === 'thinking'"
            @keydown.enter="sendTyped"
          />
          <button class="vm-send" @click="sendTyped" :disabled="!typed.trim() || phase === 'thinking'" aria-label="Send">
            <i class="fas fa-paper-plane"></i>
          </button>
        </footer>
      </section>

      <!-- Pre-permission mic explainer -->
      <teleport to="body">
        <div v-if="showMicExplainer" class="vm-mic-overlay" @click.self="showMicExplainer=false">
          <div class="vm-mic-modal">
            <div class="vm-mic-icon"><i class="fas fa-microphone"></i></div>
            <h3>Let Kinya hear you</h3>
            <p>Kinya uses your microphone only while you're talking to her — to transcribe your voice and reply out loud. Nothing is recorded or shared beyond this conversation.</p>
            <div class="vm-mic-actions">
              <button class="vm-mic-skip" @click="showMicExplainer=false">Not now</button>
              <button class="vm-mic-allow" @click="confirmMicExplainer">
                <i class="fas fa-microphone"></i> Allow microphone
              </button>
            </div>
          </div>
        </div>
      </teleport>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useChatStore } from '../stores/chat'
import { useAuthStore } from '../stores/auth'
import api from '../api'
import RiveStage from './RiveStage.vue'
import { RiveCharacterController } from '../character/riveController.js'
import { matchRequestedMove, matchReactionMove, pickAmbientMove } from '../character/moves.js'
import { matchCommand } from '../character/commands.js'
import { renderMarkdown, renderPlainText } from '../utils/markdown.js'

const emit = defineEmits(['close'])
const chatStore = useChatStore()
const authStore = useAuthStore()
const userName = computed(() => authStore.user?.username || '')
const userInitial = computed(() => (userName.value ? userName.value.trim()[0].toUpperCase() : 'Y'))

const controller = new RiveCharacterController()

/* ── What Kinya remembers about you ──────────────────────────────
   Backed by the existing userMemory GET/DELETE endpoints. Surfaced as a
   small chip + panel so personalization feels earned/visible, and reused
   below to make the greeting proactively continue past conversations
   instead of only saying a generic "hi". */
const memory = ref({})
const showMemory = ref(false)
const MEMORY_LABELS = {
  name: 'Name', profession: 'Profession',
}
function friendlyMemoryKey(key) {
  if (MEMORY_LABELS[key]) return MEMORY_LABELS[key]
  if (key.startsWith('preference_')) return 'Prefers'
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
async function loadMemory() {
  try {
    const { data } = await api.get('/memory')
    memory.value = data || {}
  } catch { /* memory is a nice-to-have, never block voice mode on it */ }
}
async function forgetKey(key) {
  try { await api.delete(`/memory/${encodeURIComponent(key)}`) } catch {}
  const next = { ...memory.value }
  delete next[key]
  memory.value = next
}
async function forgetAll() {
  try { await api.delete('/memory') } catch {}
  memory.value = {}
  showMemory.value = false
}

/* ── Personalized + proactive greeting ─────────────────────────────
   Kinya already knows the user's profession/interests from onboarding
   (authStore.user.profession / .use_cases), and now also whatever she's
   picked up in userMemory (e.g. "preference_*" entries with timestamps).
   Prefer a proactive continuity line ("last time you mentioned X — still
   on that?") over the static greeting whenever memory has something
   recent to reference. */
const PROFESSION_GREETINGS = {
  developer: (n) => `Hey ${n}! Ready to code? Tell me what you're building, or paste a bug and I'll dig in.`,
  designer: (n) => `Hey ${n}! Got something to design today? I can riff on ideas or give feedback.`,
  marketer: (n) => `Hey ${n}! Need copy, a campaign angle, or some content ideas?`,
  researcher: (n) => `Hey ${n}! What are we digging into today?`,
  entrepreneur: (n) => `Hey ${n}! Ready to build something? Let's get to work.`,
  teacher: (n) => `Hey ${n}! Planning a lesson, or need something explained simply?`,
  manager: (n) => `Hey ${n}! Need a plan, a summary, or help with a tricky message?`,
  writer: (n) => `Hey ${n}! Ready to write something great today?`,
  student: (n) => `Hey ${n}! Studying, or stuck on homework? Let's figure it out together.`,
}
const USE_CASE_LABELS = {
  code: 'generating some code',
  learn: 'learning something new',
  write: 'writing content',
  analyze: 'analyzing data',
  image: 'generating images',
  kinyarwanda: 'chatting en français',
}
function mostRecentPreference() {
  const entries = Object.entries(memory.value).filter(([k]) => k.startsWith('preference_'))
  if (!entries.length) return null
  // preference_<timestamp> keys sort naturally by recency
  entries.sort((a, b) => (a[0] < b[0] ? 1 : -1))
  return entries[0][1]
}
function buildGreeting() {
  const name = userName.value
  const recent = mostRecentPreference()
  if (name && recent) {
    return `Hey ${name}! Last time you mentioned ${recent} — still on that, or starting something new today?`
  }
  const profession = authStore.user?.profession
  if (name && profession && PROFESSION_GREETINGS[profession]) {
    return PROFESSION_GREETINGS[profession](name)
  }
  const useCase = authStore.user?.use_cases?.[0]
  const label = useCase && USE_CASE_LABELS[useCase]
  if (name && label) {
    return `Hey ${name}! Last time you were into ${label} — want to pick that back up, or try something new?`
  }
  if (name) return `Hey ${name}! I'm Kinya. Tap the mic and talk to me, or type below.`
  return `Hey! I'm Kinya. Tap the mic and talk to me, or type below.`
}

/* ── Live caption over Kinya while she speaks (karaoke-style) ────── */
function stripMdForCaption(t) {
  return (t || '')
    .replace(/```[\s\S]*?```/g, ' (code) ')
    .replace(/[*_`#>~-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
const currentCaption = computed(() => {
  if (phase.value !== 'speaking') return ''
  const last = [...feed.value].reverse().find((f) => f.role === 'assistant')
  return stripMdForCaption(last?.text || '')
})

/* ── Quick-start suggestions — reuses what onboarding already learned
   about the user so the empty state is a helpful nudge, not a blank
   screen. Shown only until the conversation actually starts. ────── */
const SUGGESTIONS_BY_PROFESSION = {
  developer: [
    { label: 'Debug an error', icon: 'fas fa-bug', prompt: 'I have a bug I need help debugging. Can I paste the error?' },
    { label: 'Review my code', icon: 'fas fa-code', prompt: 'Can you review a piece of code and suggest improvements?' },
    { label: 'Explain a concept', icon: 'fas fa-lightbulb', prompt: 'Can you explain a programming concept to me, step by step?' },
  ],
  designer: [
    { label: 'Critique a design', icon: 'fas fa-pen-ruler', prompt: 'Can you give me feedback on a design idea I have?' },
    { label: 'Brainstorm concepts', icon: 'fas fa-wand-magic-sparkles', prompt: "Let's brainstorm some design concepts together." },
  ],
  marketer: [
    { label: 'Write ad copy', icon: 'fas fa-bullhorn', prompt: 'Help me write some ad copy for a campaign.' },
    { label: 'Campaign ideas', icon: 'fas fa-lightbulb', prompt: 'Give me a few creative campaign ideas.' },
  ],
  writer: [
    { label: 'Beat writer\'s block', icon: 'fas fa-pen-nib', prompt: "I'm stuck on something I'm writing — can you help me get unstuck?" },
    { label: 'Polish my draft', icon: 'fas fa-feather', prompt: 'Can you help me polish a draft I\'ve written?' },
  ],
  student: [
    { label: 'Explain a topic', icon: 'fas fa-graduation-cap', prompt: 'Can you explain a topic I\'m studying in simple terms?' },
    { label: 'Help with homework', icon: 'fas fa-book-open', prompt: "I'm stuck on homework — can you walk me through it?" },
  ],
}
const DEFAULT_SUGGESTIONS = [
  { label: 'Give me an idea', icon: 'fas fa-lightbulb', prompt: 'Surprise me with something useful you can help with today.' },
  { label: 'Explain something', icon: 'fas fa-graduation-cap', prompt: 'Can you explain a topic of your choice, simply?' },
  { label: 'Write for me', icon: 'fas fa-pen-nib', prompt: 'Help me write something — ask me what first.' },
]
const suggestions = computed(() => {
  const profession = authStore.user?.profession
  return (profession && SUGGESTIONS_BY_PROFESSION[profession]) || DEFAULT_SUGGESTIONS
})
const showSuggestions = computed(() => phase.value === 'idle' && feed.value.length <= 1)
function useSuggestion(s) {
  handleUserText(s.prompt)
}

/* ── State machine: idle → listening → transcribing → thinking → speaking → idle ── */
const phase = ref('idle')
const interim = ref('')
const typed = ref('')
const feed = ref([])
const error = ref('')
const busyTts = ref(false)
const regenBusy = ref(false)
const autoSpeak = ref(true)
const live = ref(false)
const audioLevel = ref(0)
const feedRef = ref(null)
const waveRef = ref(null)
const rate = ref(Number(localStorage.getItem('kb_vm_rate')) || 1)

const canTalk = computed(() => !['transcribing', 'thinking'].includes(phase.value))
const lastAssistantIndex = computed(() => {
  for (let i = feed.value.length - 1; i >= 0; i--) if (feed.value[i].role === 'assistant') return i
  return -1
})

const statusText = computed(() => ({
  idle: 'Ready',
  listening: 'Listening…',
  transcribing: 'Transcribing…',
  thinking: 'Thinking…',
  speaking: 'Talking',
}[phase.value] || 'Ready'))

const orbAria = computed(() => ({
  idle: 'Start listening', listening: 'Stop and transcribe',
  transcribing: 'Transcribing', thinking: 'Kinya is thinking', speaking: 'Speaking',
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

/* ── Barge-in: start talking over Kinya and she stops ───────────────
   While she's speaking, we quietly watch the mic (only once the person
   has already granted permission once this session — we never pop the
   browser's mic prompt mid-sentence, that would be jarring). Sustained
   loud input stops her audio and drops straight into listening, so the
   user never has to manually tap the orb to interrupt her. */
let micPermissionGranted = false
let bargeStream = null
let bargeCtx = null
let bargeAnalyser = null
let bargeRaf = 0
let bargeLoudFrames = 0
const BARGE_THRESHOLD = 0.16
const BARGE_FRAMES_NEEDED = 4

async function startBargeInWatch() {
  if (!micPermissionGranted || bargeStream) return
  try {
    bargeStream = await navigator.mediaDevices.getUserMedia({ audio: true })
  } catch { bargeStream = null; return }
  bargeCtx = new (window.AudioContext || window.webkitAudioContext)()
  const src = bargeCtx.createMediaStreamSource(bargeStream)
  bargeAnalyser = bargeCtx.createAnalyser()
  bargeAnalyser.fftSize = 256
  src.connect(bargeAnalyser)
  const data = new Uint8Array(bargeAnalyser.fftSize)
  bargeLoudFrames = 0
  const tick = () => {
    if (!bargeAnalyser) return
    bargeAnalyser.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i++) { const v = (data[i] - 128) / 128; sum += v * v }
    const level = Math.sqrt(sum / data.length)
    if (level > BARGE_THRESHOLD) bargeLoudFrames++
    else bargeLoudFrames = 0
    if (bargeLoudFrames >= BARGE_FRAMES_NEEDED) {
      stopBargeInWatch()
      stopSpeaking()
      ttsQueue.length = 0
      startRec()
      return
    }
    bargeRaf = requestAnimationFrame(tick)
  }
  bargeRaf = requestAnimationFrame(tick)
}
function stopBargeInWatch() {
  cancelAnimationFrame(bargeRaf); bargeRaf = 0
  bargeAnalyser = null
  try { bargeCtx?.close() } catch {}
  bargeCtx = null
  try { bargeStream?.getTracks?.().forEach(t => t.stop()) } catch {}
  bargeStream = null
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

const MIC_EXPLAINER_KEY = 'kb_vm_mic_explained'
const showMicExplainer = ref(false)
let pendingAfterExplainer = null
function confirmMicExplainer() {
  showMicExplainer.value = false
  try { localStorage.setItem(MIC_EXPLAINER_KEY, '1') } catch {}
  const fn = pendingAfterExplainer
  pendingAfterExplainer = null
  if (fn) fn()
}

function startRec() {
  if (!canTalk.value) return
  if (!localStorage.getItem(MIC_EXPLAINER_KEY) && !micPermissionGranted) {
    pendingAfterExplainer = () => startRecReal()
    showMicExplainer.value = true
    return
  }
  startRecReal()
}

async function startRecReal() {
  error.value = ''
  interim.value = ''
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    error.value = 'Voice input is not supported in this browser. Try Chrome, Edge or Safari.'
    return
  }
  stopSpeaking()
  try {
    recStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    micPermissionGranted = true
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
    if (!text) { goIdle(); error.value = 'Kinya could not hear anything. Try speaking a bit louder.'; return }
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

/* ── Functional voice commands (stop / repeat / slower / exit / …) ── */
async function handleCommand(cmd) {
  switch (cmd.type) {
    case 'stop':
      stopSpeaking(); goIdle()
      feed.value.push({ role: 'assistant', text: 'Stopped.' })
      scrollFeed()
      break
    case 'repeat': {
      const last = [...feed.value].reverse().find(f => f.role === 'assistant')
      if (last?.text) { goIdle(); await speak(last.text) }
      else { goIdle(); error.value = "There's nothing to repeat yet." }
      break
    }
    case 'slower':
      rate.value = Math.max(0.6, rate.value - 0.2)
      localStorage.setItem('kb_vm_rate', String(rate.value))
      if (audioEl) audioEl.playbackRate = rate.value
      feed.value.push({ role: 'assistant', text: `Reading slower now (${Math.round(rate.value * 100)}% speed).` })
      goIdle(); scrollFeed()
      break
    case 'faster':
      rate.value = Math.min(1.6, rate.value + 0.2)
      localStorage.setItem('kb_vm_rate', String(rate.value))
      if (audioEl) audioEl.playbackRate = rate.value
      feed.value.push({ role: 'assistant', text: `Reading faster now (${Math.round(rate.value * 100)}% speed).` })
      goIdle(); scrollFeed()
      break
    case 'mute':
      autoSpeak.value = false
      stopSpeaking(); goIdle()
      feed.value.push({ role: 'assistant', text: "Okay, I'll reply in text only." })
      scrollFeed()
      break
    case 'unmute':
      autoSpeak.value = true
      feed.value.push({ role: 'assistant', text: "I'll speak my replies again." })
      goIdle(); scrollFeed()
      break
    case 'exit':
      exit()
      break
    case 'forget_me':
      await forgetAll()
      feed.value.push({ role: 'assistant', text: "Done — I've cleared everything I remembered about you." })
      goIdle(); scrollFeed()
      break
    case 'what_do_you_know': {
      const entries = Object.entries(memory.value)
      const text = entries.length
        ? `Here's what I know: ${entries.map(([k, v]) => `${friendlyMemoryKey(k).toLowerCase()} — ${v}`).join('; ')}.`
        : "I don't have anything saved about you yet."
      feed.value.push({ role: 'assistant', text })
      goIdle(); scrollFeed()
      if (autoSpeak.value) await speak(text)
      break
    }
    case 'language': {
      // TTS itself runs on a single server-configured voice, so we can't
      // change the spoken accent — but we CAN ask the AI to reply in the
      // requested language, which is the honest, real version of this.
      const note = `(Switching replies to ${cmd.language}. My speaking voice stays the same — only one voice is configured — but I'll write and read my replies in ${cmd.language} from here.)`
      feed.value.push({ role: 'assistant', text: note })
      scrollFeed()
      await submitToAI(`From now on, please reply to me in ${cmd.language}.`, { silent: true })
      break
    }
  }
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

  // Functional commands ("stop", "repeat that", "go back to chat"...) are
  // handled entirely on the client and never reach the AI.
  const cmd = matchCommand(text)
  if (cmd) { await handleCommand(cmd); return }

  await submitToAI(text)
}

/**
 * Sends `text` to the AI and streams the reply: as soon as the first
 * complete sentence has arrived we start TTS on it while the rest of the
 * reply is still generating, instead of waiting for the whole answer —
 * this is what makes voice mode feel responsive instead of laggy.
 * `opts.silent` skips pushing the user's own text into the feed again
 * (used for commands that inject an instruction behind the scenes, e.g.
 * the language-switch command).
 */
async function submitToAI(text, opts = {}) {
  const requested = matchRequestedMove(text)
  if (requested) controller.perform(requested)

  phase.value = 'thinking'
  controller.setMode('think')

  let feedIdx = -1
  let spokenChars = 0
  let sentenceQueue = []
  let streamDone = false
  let stopWatching = null

  function flushNewSentences(fullText, isFinal) {
    const unseen = fullText.slice(spokenChars)
    if (!unseen) return
    // Sentence-boundary split: keep decimals/abbreviations ("3.5", "Mr.")
    // reasonably intact by requiring the end of a sentence to be followed
    // by whitespace + a capital letter/quote, or to be the very end.
    const re = /[^.!?]+(?:[.!?]+(?=\s+[A-Z"'“(]|\s*$)|\s*$)/g
    let m, lastEnd = 0
    while ((m = re.exec(unseen))) {
      const chunk = m[0].trim()
      if (chunk) {
        if (!isFinal && re.lastIndex >= unseen.length) break // wait for more text, might not be a real sentence end
        sentenceQueue.push(chunk)
      }
      lastEnd = re.lastIndex
    }
    if (lastEnd > 0) spokenChars += lastEnd
    if (isFinal && spokenChars < fullText.length) {
      const rest = fullText.slice(spokenChars).trim()
      if (rest) sentenceQueue.push(rest)
      spokenChars = fullText.length
    }
    pumpQueue()
  }

  let pumping = false
  async function pumpQueue() {
    if (pumping || !autoSpeak.value) return
    const next = sentenceQueue.shift()
    if (!next) return
    pumping = true
    await speak(next, null, { chain: true })
    pumping = false
    if (sentenceQueue.length) pumpQueue()
    else if (streamDone && phase.value === 'speaking') finishSpeaking()
  }

  stopWatching = watch(
    () => chatStore.messages.map(m => ({ id: m.id, content: m.content, streaming: m._streaming, role: m.role })),
    (list) => {
      const liveMsg = [...list].reverse().find(m => m.role === 'assistant' && m.content)
      if (!liveMsg) return
      if (feedIdx === -1) {
        feed.value.push({ role: 'assistant', text: liveMsg.content, _streaming: true })
        feedIdx = feed.value.length - 1
        scrollFeed()
      } else {
        feed.value[feedIdx].text = liveMsg.content
      }
      flushNewSentences(liveMsg.content, !liveMsg.streaming)
      if (!liveMsg.streaming) streamDone = true
      scrollFeed()
    },
    { deep: true }
  )

  try {
    if (!chatStore.activeChat) await chatStore.createChat()
    await chatStore.sendMessage(text)
    streamDone = true
    const lastAi = [...chatStore.messages].reverse().find(m => m.role === 'assistant' && !m._error && m.content)
    const reply = lastAi ? lastAi.content : ''
    if (feedIdx !== -1) {
      feed.value[feedIdx].text = reply
      feed.value[feedIdx]._streaming = false
    } else if (reply) {
      feed.value.push({ role: 'assistant', text: reply })
      feedIdx = feed.value.length - 1
    }
    if (!reply) { goIdle(); return }
    flushNewSentences(reply, true)
    const move = requested || matchReactionMove(reply) || pickAmbientMove()
    if (move) later(() => controller.perform(move), 300)
    if (!autoSpeak.value) goIdle()
    // if autoSpeak is on, the sentence queue (already pumping/pumped) owns
    // the phase transition back to idle via finishSpeaking().
    else if (!sentenceQueue.length && phase.value !== 'speaking') goIdle()
  } catch (err) {
    goIdle()
    error.value = err?.message || 'Kinya could not answer right now. Please try again.'
  } finally {
    stopWatching?.()
  }
}

async function regenerateLast() {
  if (regenBusy.value) return
  regenBusy.value = true
  error.value = ''
  // Drop the last assistant turn from the visible feed — a fresh one
  // streams in to replace it via the same watcher-driven path.
  const idx = lastAssistantIndex.value
  if (idx !== -1) feed.value.splice(idx, 1)
  phase.value = 'thinking'
  controller.setMode('think')
  try {
    await chatStore.regenerate()
    const lastAi = [...chatStore.messages].reverse().find(m => m.role === 'assistant' && !m._error && m.content)
    const reply = lastAi ? lastAi.content : ''
    if (!reply) { goIdle(); return }
    feed.value.push({ role: 'assistant', text: reply })
    scrollFeed()
    const move = matchReactionMove(reply) || pickAmbientMove()
    if (autoSpeak.value) await speak(reply, move)
    else { if (move) controller.perform(move); goIdle() }
  } catch (err) {
    goIdle()
    error.value = err?.message || 'Could not regenerate that reply. Please try again.'
  } finally {
    regenBusy.value = false
  }
}

function replay(text) {
  if (!text) return
  goIdle()
  speak(text)
}

/* ── TTS: speak one line of text, cached so repeats are instant ──── */
const ttsQueue = [] // kept for barge-in to clear in-flight chained speech
const ttsCache = new Map() // text -> blob URL, lives for the app session

async function speak(text, move, opts = {}) {
  if (!text) return
  error.value = ''
  busyTts.value = true
  try {
    let url = ttsCache.get(text)
    if (!url) {
      const res = await api.post('/tts', { text }, { responseType: 'blob', timeout: 90000 })
      url = URL.createObjectURL(res.data)
      ttsCache.set(text, url)
    }
    await new Promise((resolve, reject) => {
      stopAudioEl()
      const ctx = ensureAudioCtx()
      audioEl = new Audio(url)
      audioEl.crossOrigin = 'anonymous'
      audioEl.playbackRate = rate.value
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
      startBargeInWatch()

      audioEl.onended = () => {
        stopBargeInWatch()
        if (!opts.chain) { if (phase.value === 'speaking') finishSpeaking() }
        resolve()
      }
      audioEl.play().catch(reject)
    })
  } catch (err) {
    finishSpeaking()
    let msg = null
    const d = err?.response?.data
    if (d instanceof Blob) { try { msg = JSON.parse(await d.text()).error } catch {} }
    else msg = err?.response?.data?.error
    error.value = msg || err?.message || 'Kinya could not generate audio for this response. Please try again.'
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
  stopBargeInWatch()
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

function toggleAutoSpeak() {
  autoSpeak.value = !autoSpeak.value
  if (!autoSpeak.value) stopSpeaking()
}

/* ── Poke: tapping Kinya directly triggers an automatic reaction ── */
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

onMounted(async () => {
  window.addEventListener('keydown', onKey)
  await loadMemory()
  feed.value.push({ role: 'assistant', text: buildGreeting() })
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
  stopBargeInWatch()
  try { audioCtx?.close() } catch {}
  // Release cached TTS blob URLs.
  ttsCache.forEach(url => { try { URL.revokeObjectURL(url) } catch {} })
  ttsCache.clear()
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
  animation: vmIn .2s ease;
}
@keyframes vmIn { from { opacity: 0; } to { opacity: 1; } }

/* Desktop: true split screen — Kinya fills the left pane, chat + voice
   command live in the right pane. Below the breakpoint we fall back to a
   full-bleed stacked layout (no boxed "widget" card — Kinya's pane spans
   the full width at the top, exactly like the chat pane below it). */
@media (min-width: 900px) {
  .vm-screen { flex-direction: row; }
}

.vm-icon-btn {
  width: 38px; height: 38px; display: inline-flex; align-items: center; justify-content: center;
  border-radius: 12px; background: var(--vm-panel); border: 1px solid var(--vm-border);
  color: var(--vm-text-dim); font-size: 14px; cursor: pointer; transition: background .15s, color .15s, border-color .15s;
}
.vm-icon-btn:hover { background: var(--vm-panel-2); color: var(--vm-text); }
.vm-icon-btn.active { background: var(--vm-accent); border-color: var(--vm-accent); color: var(--vm-accent-ink); }

/* ══════════════════════════════════════════════════════════════════
   LEFT / TOP — Kinya's living environment
   ══════════════════════════════════════════════════════════════════ */
.vm-character-pane {
  position: relative;
  flex: 0 0 auto;
  height: min(42vh, 360px);
  overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  background: #16261f;
}
@media (min-width: 900px) {
  .vm-character-pane { flex: 0 0 clamp(360px, 42%, 600px); height: 100%; }
}

/* Soft, living gradient backdrop echoing the character's own palette
   (sage greens → warm coral), with two slow-drifting blobs and a handful
   of ambient particles — a believable environment, not a flat box. */
.vm-character-bg {
  position: absolute; inset: 0; overflow: hidden;
  background: radial-gradient(120% 90% at 50% 12%, #d9c86a 0%, #8fae6e 38%, #4d7a66 70%, #1c3530 100%);
}
.vm-blob {
  position: absolute; border-radius: 50%; filter: blur(40px); opacity: .45;
  animation: vmDrift 16s ease-in-out infinite;
}
.vm-blob-a { width: 60%; aspect-ratio: 1; background: #ffd27d; top: -10%; left: -10%; }
.vm-blob-b { width: 50%; aspect-ratio: 1; background: #ef9a8d; bottom: -12%; right: -8%; animation-duration: 20s; animation-delay: -6s; }
@keyframes vmDrift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(6%, 5%) scale(1.08); }
}
.vm-particle {
  position: absolute; width: 5px; height: 5px; border-radius: 50%;
  background: rgba(255,255,255,.55);
  animation: vmFloat 9s ease-in-out infinite;
}
.vm-particle:nth-child(3) { left: 12%; top: 70%; animation-delay: -1s; }
.vm-particle:nth-child(4) { left: 24%; top: 30%; animation-delay: -3s; width: 3px; height: 3px; }
.vm-particle:nth-child(5) { left: 40%; top: 85%; animation-delay: -5s; }
.vm-particle:nth-child(6) { left: 58%; top: 20%; animation-delay: -2s; width: 4px; height: 4px; }
.vm-particle:nth-child(7) { left: 72%; top: 65%; animation-delay: -7s; }
.vm-particle:nth-child(8) { left: 85%; top: 35%; animation-delay: -4s; width: 3px; height: 3px; }
.vm-particle:nth-child(9) { left: 94%; top: 78%; animation-delay: -6.5s; }
.vm-particle:nth-child(10) { left: 8%; top: 15%; animation-delay: -8s; width: 3px; height: 3px; }
.vm-particle:nth-child(11) { left: 50%; top: 50%; animation-delay: -2.5s; }
@keyframes vmFloat {
  0%, 100% { transform: translateY(0); opacity: .25; }
  50% { transform: translateY(-18px); opacity: .7; }
}

.vm-rive { position: relative; z-index: 1; width: 100%; height: 100%; }

.vm-exit {
  position: absolute; top: max(12px, env(safe-area-inset-top)); left: 12px; z-index: 4;
  background: rgba(10,12,10,.38); border-color: rgba(255,255,255,.18); backdrop-filter: blur(6px);
  color: #fff;
}
.vm-exit:hover { background: rgba(10,12,10,.55); }

.vm-brand {
  position: absolute; top: max(14px, env(safe-area-inset-top)); left: 62px; z-index: 4;
  display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; letter-spacing: .02em;
  color: #fff; text-shadow: 0 1px 4px rgba(0,0,0,.35);
}
.vm-brand-dot { width: 8px; height: 8px; border-radius: 50%; background: rgba(255,255,255,.5); flex-shrink: 0; }
.vm-brand-dot.listening, .vm-brand-dot.speaking { background: var(--vm-accent); }
.vm-brand-dot.thinking, .vm-brand-dot.transcribing { background: #5b8cff; }

.vm-status-pill {
  position: absolute; top: max(12px, env(safe-area-inset-top)); right: 12px; z-index: 4;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase;
  padding: 5px 10px 5px 8px; border-radius: 8px; color: #fff;
  background: rgba(10,12,10,.38); border: 1px solid rgba(255,255,255,.18); backdrop-filter: blur(6px);
}
.vm-status-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,.5); }
.vm-status-pill.listening .vm-status-dot, .vm-status-pill.speaking .vm-status-dot { background: var(--vm-accent); }
.vm-status-pill.thinking .vm-status-dot, .vm-status-pill.transcribing .vm-status-dot { background: #8fadff; }

.vm-stage-hint, .vm-caption {
  position: absolute; left: 50%; bottom: 46px; transform: translateX(-50%); z-index: 4;
  max-width: calc(100% - 48px);
  font-size: 12.5px; font-weight: 600; color: #fff; text-align: center;
  background: rgba(10,12,10,.45); border: 1px solid rgba(255,255,255,.16); backdrop-filter: blur(6px);
  padding: 7px 14px; border-radius: 99px;
}
.vm-caption {
  border-radius: 14px; font-weight: 500; line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
}
.vm-wave {
  position: absolute; left: 16px; right: 16px; bottom: 10px; height: 30px; z-index: 4;
  width: calc(100% - 32px);
}

/* ══════════════════════════════════════════════════════════════════
   RIGHT / BOTTOM — conversation + voice command
   ══════════════════════════════════════════════════════════════════ */
.vm-chat-pane {
  flex: 1 1 auto; min-height: 0; min-width: 0;
  display: flex; flex-direction: column;
  padding: 0 14px calc(max(10px, env(safe-area-inset-bottom)));
}
@media (min-width: 900px) {
  /* Keep reading lines a sane length on ultra-wide monitors without
     wasting the extra vertical space the split layout gives us. */
  .vm-chat-pane { max-width: 860px; width: 100%; margin: 0 auto; padding: 0 28px 20px; }
}

/* ── Top bar ───────────────────────────────────────────────────── */
.vm-top {
  display: flex; align-items: center; justify-content: space-between;
  padding: max(12px, env(safe-area-inset-top)) 2px 10px;
  flex-shrink: 0; gap: 8px;
}
.vm-top-left { display: flex; align-items: center; gap: 10px; min-width: 0; }
.vm-top-title { margin: 0; font-size: 13px; font-weight: 700; letter-spacing: .03em; text-transform: uppercase; color: var(--vm-text-faint); }
.vm-view-chat {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11.5px; font-weight: 600; color: var(--vm-text-dim);
  background: var(--vm-panel); border: 1px solid var(--vm-border); border-radius: 99px;
  padding: 5px 11px; cursor: pointer; transition: background .15s, color .15s, border-color .15s; white-space: nowrap;
}
.vm-view-chat:hover { background: var(--vm-panel-2); color: var(--vm-accent); border-color: var(--vm-accent); }
.vm-top-actions { display: flex; gap: 8px; flex-shrink: 0; }
.vm-mem-btn.active, .vm-mem-btn[aria-pressed="true"] { background: var(--vm-accent); border-color: var(--vm-accent); color: var(--vm-accent-ink); }

/* ── Memory panel ──────────────────────────────────────────────── */
.vm-memory-panel {
  flex-shrink: 0; margin-bottom: 8px;
  background: var(--vm-panel); border: 1px solid var(--vm-border); border-radius: 14px;
  padding: 10px 12px;
}
.vm-memory-head {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 12px; font-weight: 700; color: var(--vm-text-dim); margin-bottom: 8px;
}
.vm-memory-head i { color: var(--vm-accent); margin-right: 5px; }
.vm-mem-clear {
  background: none; border: none; color: var(--vm-text-faint); font-size: 11px; cursor: pointer;
  text-decoration: underline;
}
.vm-mem-clear:hover { color: var(--vm-danger); }
.vm-memory-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.vm-memory-list li { display: flex; align-items: baseline; gap: 7px; font-size: 13px; }
.vm-mem-key { color: var(--vm-text-faint); font-weight: 600; flex-shrink: 0; }
.vm-mem-val { color: var(--vm-text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.vm-mem-x { background: none; border: none; color: var(--vm-text-faint); cursor: pointer; font-size: 11px; padding: 2px; flex-shrink: 0; }
.vm-mem-x:hover { color: var(--vm-danger); }
.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── Feed ──────────────────────────────────────────────────────── */
.vm-feed {
  flex: 1; min-height: 0;
  overflow-y: auto; display: flex; flex-direction: column; gap: 10px;
  padding: 12px 2px 10px;
}
.vm-suggest { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 4px; }
.vm-suggest-chip {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 12.5px; font-weight: 600; color: var(--vm-text-dim);
  background: var(--vm-panel); border: 1px solid var(--vm-border); border-radius: 99px;
  padding: 8px 14px; cursor: pointer; transition: background .15s, color .15s, border-color .15s;
}
.vm-suggest-chip i { color: var(--vm-accent); }
.vm-suggest-chip:hover { background: var(--vm-panel-2); color: var(--vm-text); border-color: var(--vm-accent); }
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
.vm-turn-text.prose :deep(p) { margin: 0 0 8px; }
.vm-turn-text.prose :deep(p:last-child) { margin-bottom: 0; }
.vm-turn-text.prose :deep(ul), .vm-turn-text.prose :deep(ol) { margin: 6px 0; padding-left: 20px; }
.vm-turn-text.prose :deep(code:not(.hljs code)) { background: var(--vm-panel-2); padding: 1px 5px; border-radius: 5px; font-size: 13px; }
.vm-turn-text.streaming::after { content: ''; display: inline-block; width: 6px; height: 13px; margin-left: 3px; background: var(--vm-accent); animation: vmBlink 1s step-end infinite; vertical-align: middle; }
@keyframes vmBlink { 50% { opacity: 0; } }
.vm-turn.user .vm-turn-text { background: var(--vm-accent); border-color: var(--vm-accent); color: var(--vm-accent-ink); font-weight: 500; }
.vm-turn.interim .vm-turn-text { opacity: .6; font-style: italic; }
.vm-turn-actions { display: flex; gap: 8px; margin-top: 6px; }
.vm-turn-act {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11.5px; font-weight: 600; color: var(--vm-text-faint);
  background: none; border: 1px solid var(--vm-border); border-radius: 99px;
  padding: 4px 10px; cursor: pointer; transition: color .15s, border-color .15s;
}
.vm-turn-act:hover { color: var(--vm-accent); border-color: var(--vm-accent); }
.vm-turn-act.spin i { animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

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

/* ── Pre-permission mic explainer ─────────────────────────────── */
.vm-mic-overlay {
  position: fixed; inset: 0; z-index: 1400;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.6); padding: 20px;
}
.vm-mic-modal {
  background: var(--vm-panel, #16181f); border: 1px solid var(--vm-border, #292d38);
  border-radius: 18px; padding: 26px; max-width: 360px; text-align: center;
  color: var(--vm-text, #f4f5f7);
}
.vm-mic-icon {
  width: 52px; height: 52px; border-radius: 50%; margin: 0 auto 14px;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
  background: var(--vm-accent, #f5a524); color: var(--vm-accent-ink, #22150a);
}
.vm-mic-modal h3 { margin: 0 0 8px; font-size: 16px; }
.vm-mic-modal p { margin: 0 0 18px; font-size: 13px; line-height: 1.5; color: var(--vm-text-dim, #9aa1b0); }
.vm-mic-actions { display: flex; gap: 10px; }
.vm-mic-skip, .vm-mic-allow {
  flex: 1; padding: 11px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer;
}
.vm-mic-skip { background: none; border: 1px solid var(--vm-border, #292d38); color: var(--vm-text-dim, #9aa1b0); }
.vm-mic-allow { background: var(--vm-accent, #f5a524); border: 1px solid var(--vm-accent, #f5a524); color: var(--vm-accent-ink, #22150a); display: inline-flex; align-items: center; justify-content: center; gap: 6px; }

@media (prefers-reduced-motion: reduce) {
  .vm-eq i, .vm-blob, .vm-particle { animation: none !important; }
}
</style>
