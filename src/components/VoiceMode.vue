<template>
  <teleport to="body">
    <div class="vm-overlay" role="dialog" aria-modal="true" aria-label="Voice mode">
      <div class="vm-card">
        <button class="vm-close" @click="exit" aria-label="Exit voice mode" title="Exit voice mode (Esc)">
          <i class="fas fa-xmark"></i>
        </button>

        <div class="vm-head">
          <div class="vm-orb" :class="{ live: isRec, busy: chatStore.sending }">
            <i :class="isRec ? 'fas fa-stop' : 'fas fa-microphone'"></i>
          </div>
          <h2>Voice Mode</h2>
          <p class="vm-sub">{{ statusText }}</p>
        </div>

        <!-- Transcript of what you said (editable before sending) -->
        <div v-if="transcript || isRec" class="vm-block">
          <div class="vb-label"><i class="fas fa-user"></i> You</div>
          <textarea
            v-if="!isRec && transcript && !sent"
            v-model="transcript"
            class="vm-ta"
            rows="3"
            aria-label="Transcribed speech — edit before sending"
          ></textarea>
          <div v-else class="vb-text" :class="{ interim: isRec }">{{ transcript || 'Listening…' }}</div>
        </div>

        <!-- KinyaBot's answer -->
        <div v-if="answer" class="vm-block">
          <div class="vb-label bot"><img src="/logo.png" alt="" /> KinyaBot</div>
          <div class="vb-text answer">{{ answer }}</div>
        </div>

        <!-- Errors -->
        <div v-if="error" class="vm-error" role="alert"><i class="fas fa-triangle-exclamation"></i> {{ error }}</div>

        <!-- Controls -->
        <div class="vm-controls">
          <button v-if="!isRec && !chatStore.sending && !busyTts" class="vm-btn main" @click="startRec" :disabled="unsupported" aria-label="Start listening">
            <i class="fas fa-microphone"></i> {{ transcript && !sent ? 'Listen again' : 'Start listening' }}
          </button>
          <button v-else-if="isRec" class="vm-btn main stop" @click="stopRec" aria-label="Stop and transcribe">
            <i class="fas fa-stop"></i> Stop &amp; transcribe
          </button>

          <button v-if="transcript && !sent && !isRec" class="vm-btn send" @click="sendTranscript" :disabled="chatStore.sending" aria-label="Send transcript">
            <i class="fas fa-paper-plane"></i> Send
          </button>
          <button v-if="answer && !busyTts && ttsState !== 'playing'" class="vm-btn" @click="playAnswer" aria-label="Play answer aloud">
            <i class="fas fa-volume-high"></i> Play answer
          </button>
          <button v-if="ttsState === 'playing'" class="vm-btn" @click="stopAnswer" aria-label="Stop audio">
            <i class="fas fa-stop"></i> Stop audio
          </button>
        </div>

        <p class="vm-hint">Press <b>Esc</b> to exit · Your speech is transcribed first so you can correct it before sending.</p>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useChatStore } from '../stores/chat'
import api from '../api'

const emit = defineEmits(['close'])

const chatStore = useChatStore()

const isRec        = ref(false)
const transcript   = ref('')
const sent         = ref(false)
const answer       = ref('')
const error        = ref('')
const busyTts      = ref(false)
const ttsState     = ref('idle')
const unsupported  = ref(false)

let mediaRecorder = null
let recStream = null
let recChunks = []

const statusText = computed(() => {
  if (isRec.value) return 'Listening — speak naturally, then press stop.'
  if (chatStore.sending) return 'KinyaBot is thinking…'
  if (busyTts.value) return 'Generating voice…'
  if (ttsState.value === 'playing') return 'Playing the answer aloud.'
  if (answer.value) return 'Ask a follow-up or exit voice mode.'
  if (transcript.value && !sent.value) return 'Review the transcript, then press Send.'
  return 'Speak to KinyaBot and hear the answer back.'
})

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
    isRec.value = true
  } catch {
    cleanup()
    error.value = 'Recording could not start. Please try again.'
  }
}

function stopRec() {
  try { mediaRecorder?.state !== 'inactive' && mediaRecorder?.stop() } catch {}
  isRec.value = false
}

async function onRecStop() {
  cleanup()
  if (!recChunks.length) { error.value = 'The recording was empty. Please try again.'; return }
  const mime = mediaRecorder?.mimeType || 'audio/webm'
  const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'
  const blob = new Blob(recChunks, { type: mime })
  recChunks = []
  if (blob.size < 1200) { error.value = 'The recording was too short — hold a little longer.'; return }

  try {
    const fd = new FormData()
    fd.append('audio', blob, `voice-${Date.now()}.${ext}`)
    const { data } = await api.post('/stt', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 })
    const text = (data?.text || '').trim()
    if (!text) { error.value = 'KinyaBot could not hear anything. Try speaking a bit louder.'; return }
    transcript.value = text
  } catch (err) {
    error.value = err?.response?.data?.error || 'Transcription failed. Please try again.'
  }
}

async function sendTranscript() {
  if (!transcript.value.trim()) return
  error.value = ''
  sent.value = true
  answer.value = ''
  try {
    if (!chatStore.activeChat) await chatStore.createChat()
    await chatStore.sendMessage(transcript.value)
    const lastAi = [...chatStore.messages].reverse().find(m => m.role === 'assistant' && !m._error && m.content)
    answer.value = lastAi ? lastAi.content : ''
    if (answer.value) playAnswer()
  } catch (err) {
    error.value = err?.message || 'KinyaBot could not answer right now. Please try again.'
  }
}

async function playAnswer() {
  if (!answer.value) return
  error.value = ''
  busyTts.value = true
  ttsState.value = 'loading'
  try {
    const res = await api.post('/tts', { text: answer.value }, { responseType: 'blob', timeout: 90000 })
    const el = new Audio(URL.createObjectURL(res.data))
    el.onended = () => { ttsState.value = 'idle' }
    await el.play()
    ttsState.value = 'playing'
  } catch (err) {
    ttsState.value = 'idle'
    let msg = null
    const d = err?.response?.data
    if (d instanceof Blob) { try { msg = JSON.parse(await d.text()).error } catch {} }
    else msg = err?.response?.data?.error
    error.value = msg || 'Voice output is unavailable right now.'
  } finally {
    busyTts.value = false
  }
}

function stopAnswer() { ttsState.value = 'idle' }

function cleanup() {
  recStream?.getTracks?.().forEach(t => t.stop())
  recStream = null
  mediaRecorder = null
}

function exit() { emit('close') }
function onKey(e) { if (e.key === 'Escape') exit() }

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => { window.removeEventListener('keydown', onKey); try { mediaRecorder?.state !== 'inactive' && mediaRecorder?.stop() } catch {}; cleanup() })
</script>

<style scoped>
.vm-overlay {
  position:fixed; inset:0; z-index:1200;
  background:rgba(0,0,0,.72); backdrop-filter:blur(8px);
  display:flex; align-items:center; justify-content:center; padding:16px;
  animation:fadeIn .2s ease;
}
.vm-card {
  position:relative; width:min(480px, 100%);
  max-height:92dvh; overflow-y:auto;
  background:var(--bg-card); border:1px solid var(--border-md);
  border-radius:24px; padding:1.75rem 1.5rem 1.25rem;
  box-shadow:0 30px 90px rgba(0,0,0,.6);
  animation:fadeUp .28s cubic-bezier(.34,1.4,.64,1);
}
.vm-close {
  position:absolute; top:14px; right:14px; width:34px; height:34px;
  border-radius:50%; background:none; border:none; color:var(--text-3);
  font-size:15px; cursor:pointer; transition:all .2s;
}
.vm-close:hover { background:var(--bg-hover); color:var(--text-1); }

.vm-head { text-align:center; margin-bottom:1.1rem; }
.vm-orb {
  width:74px; height:74px; margin:0 auto .75rem; border-radius:50%;
  background:linear-gradient(135deg,#4f46e5,#a855f7);
  display:flex; align-items:center; justify-content:center;
  color:#fff; font-size:26px;
  box-shadow:0 0 40px rgba(109,40,217,.45);
  transition:all .3s;
}
.vm-orb.live { animation:vmPulse 1.1s ease-in-out infinite; }
.vm-orb.busy { opacity:.7; }
@keyframes vmPulse { 0%,100% { transform:scale(1); box-shadow:0 0 40px rgba(109,40,217,.45); } 50% { transform:scale(1.07); box-shadow:0 0 60px rgba(109,40,217,.65); } }
.vm-head h2 { font-size:1.15rem; font-weight:700; color:#fff; margin-bottom:.3rem; }
.vm-sub { font-size:12.5px; color:var(--text-2); }

.vm-block { margin-bottom:.9rem; }
.vb-label {
  display:flex; align-items:center; gap:7px;
  font-size:11.5px; font-weight:600; color:var(--text-2); margin-bottom:5px;
}
.vb-label img { width:16px; height:16px; border-radius:4px; }
.vm-ta {
  width:100%; background:var(--bg-input); border:1px solid var(--border-md);
  border-radius:12px; color:var(--text-1); font-size:13.5px; line-height:1.55;
  padding:10px 12px; resize:vertical; font-family:inherit; outline:none;
}
.vm-ta:focus { border-color:rgba(109,40,217,.5); }
.vb-text {
  background:var(--bg-panel); border:1px solid var(--border);
  border-radius:12px; padding:10px 12px;
  font-size:13.5px; line-height:1.6; color:var(--text-1);
}
.vb-text.interim { color:var(--text-3); font-style:italic; }
.vb-text.answer { white-space:pre-wrap; word-break:break-word; max-height:180px; overflow-y:auto; }

.vm-error {
  display:flex; align-items:center; gap:8px;
  background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.25);
  border-radius:10px; padding:9px 12px; margin-bottom:.9rem;
  color:#f87171; font-size:12.5px;
}

.vm-controls { display:flex; flex-wrap:wrap; gap:9px; justify-content:center; margin-bottom:.9rem; }
.vm-btn {
  display:inline-flex; align-items:center; gap:8px;
  padding:10px 18px; border-radius:99px; font-size:13px; font-weight:600;
  background:var(--bg-panel); border:1px solid var(--border-md);
  color:var(--text-1); cursor:pointer; transition:all .2s;
}
.vm-btn:hover:not(:disabled) { background:var(--bg-hover); }
.vm-btn:disabled { opacity:.5; cursor:not-allowed; }
.vm-btn.main { background:var(--accent); border:1px solid transparent; color:#fff; box-shadow:0 4px 16px rgba(109,40,217,.35); }
.vm-btn.main:hover:not(:disabled) { filter:brightness(1.12); }
.vm-btn.main.stop { background:linear-gradient(135deg,#dc2626,#b91c1c); box-shadow:0 4px 16px rgba(220,38,38,.35); }
.vm-btn i { font-size:12px; }

.vm-hint { font-size:11px; color:var(--text-3); text-align:center; line-height:1.6; }
.vm-hint b { color:var(--text-2); }

html:global(.light-mode) .vm-head h2 { color:#1a1a2e; }

@keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
@keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:none; } }

@media (max-width:480px) {
  .vm-card { padding:1.35rem 1rem 1rem; border-radius:20px; }
  .vm-orb { width:62px; height:62px; font-size:22px; }
}
</style>
