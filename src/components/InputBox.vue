<template>
  <div class="input-area">
    <!-- File preview -->
    <transition name="fade">
      <div v-if="filePreview" class="fp-row">
        <img v-if="filePreview.isImg" :src="filePreview.url" class="fp-thumb" />
        <div v-else class="fp-icon"><i class="fas fa-file-lines"></i></div>
        <div class="fp-meta">
          <span class="fp-name">{{ filePreview.name }}</span>
          <span class="fp-size">{{ filePreview.size }}</span>
        </div>
        <button class="fp-x" @click="removeFile"><i class="fas fa-xmark"></i></button>
      </div>
    </transition>

    <div class="input-box" :class="{ focused, sending: disabled }">
      <!-- Voice waveform -->
      <transition name="fade">
        <div v-if="isRec" class="wave-bar">
          <div class="wave-info">
            <i class="fas fa-microphone" style="color:#f28b82"></i>
            <span>Listening{{ detectedLang ? ` · ${detectedLang}` : '' }}…</span>
            <span v-if="interimText" class="wave-interim">{{ interimText }}</span>
          </div>
          <div class="wave-bars">
            <div v-for="n in 16" :key="n" class="wb" :style="waveStyle(n)"></div>
          </div>
        </div>
      </transition>

      <!-- Textarea -->
      <textarea
        ref="taRef"
        v-model="inputVal"
        class="chat-ta"
        :placeholder="placeholder"
        rows="1"
        :disabled="disabled"
        @focus="focused=true"
        @blur="focused=false"
        @keydown.enter.exact.prevent="submit"
        @keydown.enter.shift.exact="() => {}"
        @input="resize"
      ></textarea>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="tl-left">
          <label class="tb-btn" title="Attach file">
            <i class="fas fa-paperclip"></i>
            <span class="tb-label">Attach</span>
            <input ref="fileRef" type="file" accept="*/*" @change="handleFile" hidden />
          </label>
          <button class="tb-btn" :class="{on: deepThink}" @click="deepThink=!deepThink" title="Deep Think">
            <i class="fas fa-brain"></i>
            <span class="tb-label">Deep Think</span>
          </button>
        </div>
        <div class="tl-right">
          <button class="tb-ico" :class="{rec: isRec}" @click="toggleVoice" :title="isRec?'Stop recording':'Voice input'">
            <i :class="isRec ? 'fas fa-stop' : 'fas fa-microphone'"></i>
          </button>
          <button class="send-btn" :disabled="disabled || (!inputVal.trim() && !selectedFile)" @click="submit" title="Send (Enter)">
            <i v-if="disabled" class="fas fa-spinner fa-spin"></i>
            <i v-else class="fas fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>

    <p class="disclaimer">KinyaBot may make mistakes. Verify important info. · POWERED BY AFASA</p>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, computed } from 'vue'

const props = defineProps({ disabled: Boolean })
const emit  = defineEmits(['send', 'focus'])

const inputVal     = ref('')
const selectedFile = ref(null)
const filePreview  = ref(null)
const focused      = ref(false)
const deepThink    = ref(false)
const isRec        = ref(false)
const interimText  = ref('')
const detectedLang = ref('')
const taRef        = ref(null)
const fileRef      = ref(null)
const waveH        = ref(Array(16).fill(4))
let   recog        = null
let   waveInterval = null

const placeholder = computed(() =>
  window.innerWidth < 480 ? 'Ask anything…' : 'Ask me anything…'
)

function resize() {
  const el = taRef.value; if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 160) + 'px'
}

function submit() {
  const content = inputVal.value.trim()
  if (!content && !selectedFile.value) return
  emit('send', { content, file: selectedFile.value })
  inputVal.value = ''; selectedFile.value = null; filePreview.value = null
  if (fileRef.value) fileRef.value.value = ''
  nextTick(() => { if (taRef.value) { taRef.value.style.height = 'auto'; taRef.value.focus() } })
}

function handleFile(e) {
  const f = e.target.files[0]; if (!f) return
  selectedFile.value = f
  const isImg = f.type.startsWith('image/')
  filePreview.value = { name:f.name, size:(f.size/1024).toFixed(1)+' KB', isImg, url:isImg?URL.createObjectURL(f):null }
}

function removeFile() { selectedFile.value=null; filePreview.value=null; if(fileRef.value) fileRef.value.value='' }

/* Voice */
function startWave() { waveInterval = setInterval(()=>{ waveH.value = Array(16).fill(0).map(()=>Math.random()*22+4) }, 80) }
function stopWave()  { clearInterval(waveInterval); waveH.value = Array(16).fill(4) }
function waveStyle(i){ return { height: waveH.value[i-1]+'px' } }

const LANG_MAP = { rw:'Kinyarwanda', en:'English', fr:'Français', sw:'Swahili', de:'Deutsch', es:'Español', zh:'中文', ar:'العربية', pt:'Português', hi:'हिन्दी' }

function toggleVoice() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRec) { alert('Voice input not supported. Use Chrome or Edge.'); return }
  if (isRec.value) { recog?.stop(); return }
  recog = new SpeechRec()
  recog.continuous = true; recog.interimResults = true; recog.lang = ''
  recog.onstart = () => { isRec.value=true; interimText.value=''; detectedLang.value=''; startWave() }
  recog.onresult = (e) => {
    let interim='',final=''
    for (let i=e.resultIndex;i<e.results.length;i++){
      const t=e.results[i][0].transcript
      if (e.results[i].isFinal) { final+=t; const lc=(e.results[i][0].lang||'').split('-')[0]; if(LANG_MAP[lc]) detectedLang.value=LANG_MAP[lc]; else if(lc) detectedLang.value=lc }
      else interim+=t
    }
    interimText.value=interim
    if (final) { inputVal.value+=(inputVal.value?' ':'')+final; resize() }
  }
  recog.onerror  = ()=>{ isRec.value=false; interimText.value=''; stopWave() }
  recog.onend    = ()=>{ isRec.value=false; interimText.value=''; stopWave() }
  recog.start()
}

function onKey(e) {
  if ((e.ctrlKey||e.metaKey) && e.key==='l') { e.preventDefault(); nextTick(()=>taRef.value?.focus()) }
  if (e.key==='Escape') { taRef.value?.blur(); if(isRec.value) recog?.stop() }
}

onMounted(()=> window.addEventListener('keydown', onKey))
onBeforeUnmount(()=>{ window.removeEventListener('keydown', onKey); recog?.stop(); stopWave() })
</script>

<style scoped>
.input-area {
  flex-shrink: 0;
  padding: 4px 12px 10px;
  background: var(--bg-base);
  position: sticky;
  bottom: 0;
  z-index: 10;
}
 

/* File preview */
.fp-row { display:flex; align-items:center; gap:9px; padding:7px 11px; margin-bottom:5px; background:var(--bg-card); border:1px solid var(--border-md); border-radius:10px; }
.fp-thumb { width:38px; height:38px; object-fit:cover; border-radius:6px; flex-shrink:0; }
.fp-icon { width:38px; height:38px; border-radius:6px; background:var(--bg-input); display:flex; align-items:center; justify-content:center; color:var(--text-2); flex-shrink:0; }
.fp-meta { flex:1; min-width:0; }
.fp-name { display:block; font-size:12px; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:var(--text-1); }
.fp-size { font-size:11px; color:var(--text-3); }
.fp-x { background:none; border:none; color:var(--text-3); font-size:13px; cursor:pointer; padding:4px; border-radius:5px; transition:all .2s; flex-shrink:0; }
.fp-x:hover { background:var(--bg-hover); color:var(--red); }

/* Input box */
.input-box {
  border: 1px solid var(--border-md); border-radius: 14px;
  background: var(--bg-input); overflow: hidden;
  transition: border-color .2s, box-shadow .2s;
}
.input-box.focused { border-color:rgba(109,40,217,.5); box-shadow:0 0 0 3px rgba(109,40,217,.1); }
.input-box.sending { opacity:.75; }

/* Voice waveform */
.wave-bar { padding:8px 13px 4px; border-bottom:1px solid var(--border); display:flex; flex-direction:column; gap:5px; }
.wave-info { display:flex; align-items:center; gap:7px; font-size:12px; color:var(--text-2); flex-wrap:wrap; }
.wave-info span:first-of-type { color:#f28b82; font-weight:500; }
.wave-interim { color:var(--text-2); font-style:italic; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.wave-bars { display:flex; align-items:center; gap:2px; height:28px; }
.wb { width:3px; border-radius:99px; background:linear-gradient(180deg,#f28b82,#a855f7); transition:height .08s ease; min-height:3px; }

/* Textarea */
.chat-ta {
  width:100%; min-height:42px; max-height:160px;
  background:none; border:none; color:var(--text-1);
  font-size:14px; line-height:1.55; padding:11px 13px 4px;
  resize:none; display:block; outline:none; font-family:inherit;
}
.chat-ta::placeholder { color:var(--text-3); }
.chat-ta:disabled { cursor:not-allowed; opacity:.5; }

/* Toolbar */
.toolbar {
  display:flex; align-items:center; justify-content:space-between;
  padding:5px 8px 7px; gap:6px;
}
.tl-left,.tl-right { display:flex; align-items:center; gap:5px; }

.tb-btn {
  display:flex; align-items:center; gap:5px; padding:5px 10px;
  background:var(--bg-card); border:1px solid var(--border-md);
  border-radius:99px; color:var(--text-2); font-size:12.5px;
  cursor:pointer; transition:all .2s; white-space:nowrap;
}
.tb-btn:hover { background:var(--bg-hover); color:var(--text-1); }
.tb-btn.on { background:rgba(109,40,217,.2); border-color:rgba(109,40,217,.4); color:#c4b5fd; }
.tb-btn i { font-size:12px; }

.tb-ico {
  width:32px; height:32px; border-radius:50%;
  background:none; border:none; color:var(--text-2); font-size:14px;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .2s; flex-shrink:0;
}
.tb-ico:hover { background:var(--bg-hover); color:var(--text-1); }
.tb-ico.rec { color:#f28b82; background:rgba(242,139,130,.15); animation:pulse 1.1s infinite; }

.send-btn {
  width:34px; height:34px; border-radius:50%;
  background:linear-gradient(135deg,#4f46e5,#7c3aed);
  border:none; color:#fff; font-size:13px;
  display:flex; align-items:center; justify-content:center;
  cursor:pointer; transition:all .2s; flex-shrink:0;
  box-shadow:0 2px 8px rgba(79,70,229,.35);
}
.send-btn:hover:not(:disabled) { transform:scale(1.1); box-shadow:0 4px 14px rgba(79,70,229,.5); }
.send-btn:disabled { opacity:.32; cursor:not-allowed; transform:none; }

.disclaimer { font-size:11px; color:var(--text-3); text-align:center; margin-top:5px; padding:0 4px; }

/* ── MOBILE ─── */
@media(max-width:600px) {
  .input-area {
    padding: 4px 8px env(safe-area-inset-bottom, 8px);
    padding-bottom: max(8px, env(safe-area-inset-bottom));
  }
  .tb-label   { display:none; }
  .tb-btn     { padding:6px 8px; }
  .chat-ta    { font-size:16px; padding:11px 11px 4px; }
  .disclaimer { font-size:10px; }
}

@media(max-width:380px) {
  .wave-info  { font-size:11px; }
  .wave-interim { display:none; }
  .wave-bars  { height:22px; }
}
</style>
