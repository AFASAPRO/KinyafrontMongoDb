<template>
  <div class="chat-window">
    <div class="chat-topbar">
      <button class="model-pill">
        <i class="fas fa-star" style="color:#a855f7;font-size:11px"></i>
        <span>KinyaBot AI</span>
        <i class="fas fa-chevron-down" style="font-size:10px;opacity:.6"></i>
      </button>
      <div v-if="chatStore.activeChat" class="chat-title-pill">
        {{ chatStore.activeChat.title }}
      </div>
      <!-- Voice Mode (optional, authed users) -->
      <button v-if="!guest" class="voice-pill" @click="showVoiceMode=true" title="Voice mode" aria-label="Enable voice mode">
        <i class="fas fa-microphone-lines"></i>
        <span class="vp-label">Voice</span>
      </button>
    </div>

    <!-- Admin broadcast notifications banner -->
    <transition name="notif-drop">
      <div v-if="activeNotif" class="notif-banner" :class="activeNotif.type" @click="dismissNotif">
        <i :class="notifIcon(activeNotif.type)"></i>
        <div class="nb-text">
          <strong>{{ activeNotif.title }}</strong>
          <span>{{ activeNotif.message }}</span>
        </div>
        <button class="nb-close" @click.stop="dismissNotif"><i class="fas fa-xmark"></i></button>
      </div>
    </transition>

    <!-- Messages area -->
    <div class="msg-area" ref="msgArea" @scroll="handleScroll">
      <!-- Welcome screen -->
      <div v-if="!chatStore.activeChat || !chatStore.messages.length" class="welcome">
        <div class="welcome-inner">
          <div class="welcome-logo">
            <img src="/logo.png" alt="KinyaBot" class="wl-img" />
            <div class="wl-dots">
              <div v-for="i in 4" :key="i" class="wl-dot" :class="`d${i}`"></div>
            </div>
          </div>
          <h1 class="welcome-heading">
            <template v-if="guest">How can I <span class="g-text">help you</span> today?</template>
            <template v-else>
              <span class="g-text">Think bigger</span> with KinyaBot AI<br />
              <span style="color:var(--text-2);font-size:.65em;font-weight:400">innovation at your command</span>
            </template>
          </h1>
          <p class="welcome-desc">
            <template v-if="guest">
              Ask anything, attach documents or images, or talk with your voice —
              try a suggestion below, or type your own.
              <strong>Sign in to start chatting.</strong>
            </template>
            <template v-else>
              Turn imagination into impact — ask anything, attach documents and images, use your voice, and more.
            </template>
          </p>

          <!-- Pinned cards (authenticated users) -->
          <div v-if="!guest && chatStore.pinnedChats.length" class="pinned-section">
            <div class="pinned-header">
              <i class="fas fa-thumbtack" style="color:var(--text-2)"></i>
              <span>Pinned Chats</span>
              <i class="fas fa-chevron-down" style="font-size:11px;color:var(--text-3);margin-left:4px"></i>
              <button class="sm-icon-btn" style="margin-left:auto"><i class="fas fa-ellipsis"></i></button>
            </div>
            <div class="pinned-cards">
              <div v-for="chat in chatStore.pinnedChats.slice(0,3)" :key="chat.id"
                class="pinned-card" @click="chatStore.loadChat(chat.id)">
                <div class="pc-icon"><i class="fas fa-file-lines"></i></div>
                <div class="pc-info">
                  <div class="pc-title">{{ chat.title }}</div>
                  <div class="pc-sub">{{ (chat.last_message || 'No messages yet').slice(0,50) }}</div>
                  <div class="pc-date">{{ relTime(chat.updated_at) }}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick chips -->
          <div class="quick-chips">
            <button v-for="c in chips" :key="c.label" class="chip" @click="useChip(c.prompt)">
              <i :class="c.icon"></i>
              <span>{{ c.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Message list -->
      <transition-group v-else name="msg" tag="div" class="msgs-list">
        <MessageBubble
          v-for="(msg, i) in chatStore.messages"
          :key="msg.id"
          :message="msg"
          :is-last="isLastAssistant(msg, i)"
          :regen-busy="chatStore.sending || chatStore.streaming"
          @delete="chatStore.deleteMessage(msg.id)"
          @copy="handleCopy(msg.content)"
          @retry="handleRetry"
          @regenerate="handleRegenerate"
        />
      </transition-group>

      <!-- Stop generation -->
      <transition name="fade">
        <button v-if="chatStore.streaming" class="stop-btn" @click="chatStore.stopGeneration()" aria-label="Stop generating" title="Stop generating">
          <i class="fas fa-stop"></i> Stop generating
        </button>
      </transition>
    </div>

    <!-- Voice mode overlay -->
    <VoiceMode v-if="showVoiceMode" @close="showVoiceMode=false" />

    <!-- Scroll FAB -->
    <transition name="fade">
      <button v-if="showScrollBtn" class="scroll-fab" @click="scrollBottom">
        <i class="fas fa-arrow-down"></i>
      </button>
    </transition>

    <!-- Copy toast -->
    <transition name="fade">
      <div v-if="copyToast" class="copy-toast">
        <i class="fas fa-check"></i> Copied to clipboard
      </div>
    </transition>

    <!-- Restored-draft hint (message preserved across sign-in) -->
    <transition name="fade">
      <div v-if="restoredDraft" class="restored-hint">
        <i class="fas fa-circle-info"></i>
        <span>Your message is ready below — press Send to chat with KinyaBot.</span>
        <button class="rh-x" @click="$emit('draft-consumed')"><i class="fas fa-xmark"></i></button>
      </div>
    </transition>

    <InputBox
      @send="handleSend"
      :disabled="chatStore.sending"
      :preserve-on-send="guest"
      :injected-text="composerInject"
      :injected-file="restoredFile"
      @focus="scrollBottom"
    />
  </div>
</template>

<script setup>
import { ref, nextTick, watch, computed, onMounted, onBeforeUnmount, defineAsyncComponent } from 'vue'
import { useChatStore } from '../stores/chat'
import { getSocket } from '../socket'
import api from '../api'
import MessageBubble from './MessageBubble.vue'
import InputBox from './InputBox.vue'
// Lazy-loaded: Voice Mode pulls in three.js + the 3D character, so it
// should only be downloaded when the person actually opens it.
const VoiceMode = defineAsyncComponent(() => import('./VoiceMode.vue'))

const props = defineProps({
  guest: { type: Boolean, default: false },
  restoredDraft: { type: String, default: null },
  restoredFile: { type: [Object, File], default: null }
})
const emit = defineEmits(['toggle-sidebar', 'auth-required', 'draft-consumed'])

const chatStore = useChatStore()
const msgArea = ref(null)
const showScrollBtn = ref(false)
const copyToast = ref(false)
const activeNotif = ref(null)
const dismissedIds = ref(new Set())
const showVoiceMode = ref(false)

// Draft text injected into the composer (guest chips + restored drafts)
const chipDraft = ref('')
const composerInject = computed(() => props.restoredDraft || chipDraft.value)

// Load active notifications on mount and listen for new ones
onMounted(async () => {
  window.visualViewport?.addEventListener?.('resize', onVisualViewportChange)
  try {
    const { data } = await api.get('/notifications')
    if (data.length) {
      const notif = data.find(n => !dismissedIds.value.has(n.id))
      if (notif) activeNotif.value = notif
    }
  } catch {}

  // Real-time admin notifications via socket
  const socket = getSocket()
  if (socket) {
    socket.on('admin_notification', (notif) => {
      if (!dismissedIds.value.has(notif.id)) {
        activeNotif.value = notif
      }
    })
  }
})

function dismissNotif() {
  if (activeNotif.value) {
    dismissedIds.value.add(activeNotif.value.id)
    activeNotif.value = null
  }
}

function notifIcon(type) {
  return { info:'fas fa-circle-info', success:'fas fa-circle-check', warning:'fas fa-triangle-exclamation', error:'fas fa-circle-exclamation' }[type] || 'fas fa-bell'
}

const chips = [
  { icon:'fas fa-pen-nib', label:'Help me write', prompt:'Help me write a professional cover letter' },
  { icon:'fas fa-wand-magic-sparkles', label:'Design Smart', prompt:'Give me UI/UX best practices for a mobile app' },
  { icon:'fas fa-graduation-cap', label:'Learn about AI', prompt:'Explain how transformer neural networks work' },
  { icon:'fas fa-code', label:'Generate Code', prompt:'Write a responsive HTML/CSS landing page with a modern dark theme' },
]

function handleScroll() {
  const el = msgArea.value
  if (!el) return
  showScrollBtn.value = el.scrollHeight - el.scrollTop - el.clientHeight > 180
}

function scrollBottom() {
  nextTick(() => {
    if (msgArea.value) msgArea.value.scrollTo({ top: msgArea.value.scrollHeight, behavior: 'smooth' })
  })
}

watch(() => chatStore.messages.length, scrollBottom)
watch(() => chatStore.activeChat?.id, scrollBottom)

// Keep the newest message visible when the mobile keyboard opens/closes
function onVisualViewportChange() {
  if (document.documentElement.classList.contains('kb-open')) {
    nextTick(() => {
      if (msgArea.value) msgArea.value.scrollTop = msgArea.value.scrollHeight
    })
  }
}

async function handleSend({ content, file }) {
  // GUESTS: the AI is never contacted before authentication.
  // The typed message AND the attached file are handed to the auth
  // gate — the file is kept in memory (SPA navigation keeps it alive)
  // so the exact message the guest wrote can be sent after sign-in.
  if (props.guest) {
    emit('auth-required', { content, file })
    return
  }
  if (props.restoredDraft || props.restoredFile) emit('draft-consumed')
  if (!chatStore.activeChat) await chatStore.createChat()
  try {
    await chatStore.sendMessage(content, file)
  } catch {} // errors are rendered as retryable bubbles
  scrollBottom()
}

function isLastAssistant(msg, index) {
  if (msg.role !== 'assistant' || msg._error || msg._streaming) return false
  // true when no other completed assistant message comes after it
  for (let j = index + 1; j < chatStore.messages.length; j++) {
    const m = chatStore.messages[j]
    if (m.role === 'assistant' && !m._error) return false
  }
  return true
}

async function handleRetry(failedId) {
  try { await chatStore.retry(failedId) } catch {}
  scrollBottom()
}

async function handleRegenerate() {
  try { await chatStore.regenerate() } catch {}
  scrollBottom()
}

function useChip(prompt) {
  // Guests: a chip fills the composer (the auth gate fires on Send),
  // so they can see and edit the exact message they are about to send.
  if (props.guest) {
    chipDraft.value = prompt
    return
  }
  handleSend({ content: prompt, file: null })
}

function handleCopy(text) {
  navigator.clipboard.writeText(text || '').catch(() => {})
  copyToast.value = true
  setTimeout(() => { copyToast.value = false }, 2000)
}

function relTime(date) {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff/60000), h = Math.floor(diff/3600000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  return new Date(date).toLocaleDateString()
}

onBeforeUnmount(() => {
  window.visualViewport?.removeEventListener?.('resize', onVisualViewportChange)
})
</script>

<style scoped>
.chat-window { display:flex; flex-direction:column; height:100%; overflow:hidden; background:var(--bg-base); position:relative; }

.chat-topbar { display:flex; align-items:center; gap:10px; padding:8px 16px; flex-shrink:0; }
.voice-pill {
  display:flex; align-items:center; gap:6px; margin-left:auto;
  padding:6px 12px; background:var(--bg-card); border:1px solid var(--border);
  border-radius:99px; color:var(--text-2); font-size:12.5px; font-weight:500;
  cursor:pointer; transition:all .2s;
}
.voice-pill:hover { background:rgba(109,40,217,.14); color:#c4b5fd; border-color:rgba(109,40,217,.4); }
.voice-pill i { font-size:12px; }
@media(max-width:600px){ .voice-pill .vp-label { display:none; } .voice-pill { padding:6px 10px; } }
.model-pill { display:flex; align-items:center; gap:6px; padding:6px 12px; background:var(--bg-card); border:1px solid var(--border); border-radius:99px; color:var(--text-1); font-size:13px; font-weight:500; cursor:pointer; transition:all .2s; }
.model-pill:hover { background:var(--bg-hover); }
.chat-title-pill { font-size:12.5px; color:var(--text-2); background:var(--bg-card); border:1px solid var(--border); border-radius:99px; padding:4px 12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:300px; }

.msg-area { flex:1; overflow-y:auto; padding:12px 16px; display:flex; flex-direction:column; scroll-behavior:smooth; -webkit-overflow-scrolling: touch;  }

/* Welcome */
.welcome { flex:1; display:flex; align-items:center; justify-content:center; min-height:100%; }
.welcome-inner { max-width:620px; width:100%; padding:20px 12px; animation:fadeUp .5s ease; }

.welcome-logo { display:flex; align-items:center; justify-content:center; margin-bottom:1.25rem; position:relative; height:76px; }
.wl-img { width:60px; height:60px; object-fit:contain; border-radius:14px; position:relative; z-index:2; box-shadow:0 0 28px rgba(109,40,217,.3); }
.wl-dots { position:absolute; inset:0; pointer-events:none; }
.wl-dot { position:absolute; width:9px; height:9px; border-radius:50%; background:linear-gradient(135deg,#4f46e5,#a855f7); }
.d1{top:10px;left:calc(50% - 48px);animation:pulse 2s ease infinite}
.d2{top:10px;left:calc(50% + 40px);animation:pulse 2s .4s ease infinite}
.d3{bottom:14px;left:calc(50% - 58px);animation:pulse 2s .8s ease infinite}
.d4{bottom:14px;left:calc(50% + 50px);animation:pulse 2s 1.2s ease infinite}

.welcome-heading { font-size:clamp(1.2rem,3vw,1.65rem); font-weight:700; color:#fff; text-align:center; line-height:1.35; margin-bottom:.5rem; }
.powered-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 12px; border-radius:99px; background:rgba(99,102,241,.1); border:1px solid rgba(99,102,241,.2); color:#a5b4fc; font-size:10.5px; font-weight:700; letter-spacing:.06em; margin-bottom:.75rem; }
.welcome-desc { font-size:13.5px; color:var(--text-2); text-align:center; line-height:1.7; margin-bottom:1.5rem; max-width:480px; margin-left:auto; margin-right:auto; }

.pinned-section { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--r-lg); padding:14px; margin-bottom:1.25rem; }
.pinned-header { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:600; color:var(--text-1); margin-bottom:10px; }
.sm-icon-btn { background:none; border:none; color:var(--text-3); font-size:13px; cursor:pointer; padding:3px 5px; border-radius:5px; transition:background .15s; }
.sm-icon-btn:hover { background:var(--bg-hover); }
.pinned-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:10px; }
.pinned-card { background:var(--bg-panel); border:1px solid var(--border); border-radius:var(--r); padding:12px; cursor:pointer; transition:all .2s; }
.pinned-card:hover { background:var(--bg-hover); border-color:var(--border-md); transform:translateY(-1px); }
.pc-icon { width:28px; height:28px; border-radius:8px; background:rgba(109,40,217,.18); border:1px solid rgba(109,40,217,.28); display:flex; align-items:center; justify-content:center; color:#c4b5fd; font-size:12px; margin-bottom:8px; }
.pc-title { font-size:12px; font-weight:600; color:var(--text-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px; }
.pc-sub { font-size:11px; color:var(--text-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:5px; }
.pc-date { font-size:10.5px; color:var(--text-3); }

.quick-chips { display:flex; flex-wrap:wrap; gap:8px; justify-content:center; }
.chip { display:flex; align-items:center; gap:7px; padding:8px 16px; background:var(--bg-card); border:1px solid var(--border-md); border-radius:99px; color:var(--text-2); font-size:13px; cursor:pointer; transition:all .2s; }
.chip:hover { background:var(--bg-hover); color:var(--text-1); border-color:rgba(109,40,217,.4); }
.chip i { font-size:12px; }

.msgs-list { display:flex; flex-direction:column; }

/* Stop generation pill */
.stop-btn {
  display:flex; align-items:center; gap:7px;
  margin:2px auto 8px; padding:6px 16px;
  background:var(--bg-card); border:1px solid var(--border-md);
  border-radius:99px; color:var(--text-2); font-size:12.5px; font-weight:500;
  cursor:pointer; transition:all .2s;
}
.stop-btn:hover { background:var(--bg-hover); color:var(--text-1); border-color:rgba(242,139,130,.4); }
.stop-btn i { font-size:10px; color:#f28b82; }

.scroll-fab { position:absolute; bottom:110px; right:20px; width:36px; height:36px; border-radius:50%; background:var(--bg-card); border:1px solid var(--border-md); color:var(--text-2); font-size:13px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,.3); cursor:pointer; z-index:5; transition:all .2s; }
.scroll-fab:hover { background:var(--bg-hover); color:var(--text-1); }

.copy-toast { position:absolute; bottom:120px; left:50%; transform:translateX(-50%); background:var(--bg-card); border:1px solid var(--border-md); border-radius:99px; padding:7px 16px; font-size:12.5px; color:var(--text-1); display:flex; align-items:center; gap:7px; box-shadow:0 4px 16px rgba(0,0,0,.3); pointer-events:none; z-index:10; }
.copy-toast i { color:#34a853; }

/* ── Restored draft hint ── */
.restored-hint {
  display:flex; align-items:center; gap:8px;
  margin:0 12px 6px; padding:8px 12px;
  background:rgba(99,102,241,.1); border:1px solid rgba(99,102,241,.25);
  border-radius:10px; font-size:12.5px; color:#c4b5fd;
  animation:fadeUp .3s ease;
}
.restored-hint i { font-size:12px; flex-shrink:0; }
.restored-hint span { flex:1; }
.rh-x { background:none; border:none; color:var(--text-3); font-size:13px; cursor:pointer; padding:2px 4px; border-radius:5px; transition:all .15s; flex-shrink:0; }
.rh-x:hover { color:var(--text-1); background:var(--bg-hover); }

/* ── Admin Notification Banner ── */
.notif-banner {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 16px;
  flex-shrink: 0;
  cursor: pointer;
  animation: slideDown .35s cubic-bezier(.34,1.56,.64,1);
  border-bottom: 1px solid transparent;
}
@keyframes slideDown { from { opacity:0; transform:translateY(-100%); } to { opacity:1; transform:none; } }
.notif-banner.info    { background:rgba(6,182,212,.12);  border-bottom-color:rgba(6,182,212,.2);  }
.notif-banner.success { background:rgba(52,168,83,.12);  border-bottom-color:rgba(52,168,83,.2);  }
.notif-banner.warning { background:rgba(245,158,11,.12); border-bottom-color:rgba(245,158,11,.2); }
.notif-banner.error   { background:rgba(239,68,68,.12);  border-bottom-color:rgba(239,68,68,.2);  }
.notif-banner i:first-child { font-size:15px; flex-shrink:0; }
.notif-banner.info    i:first-child { color:#67e8f9; }
.notif-banner.success i:first-child { color:#34d399; }
.notif-banner.warning i:first-child { color:#fcd34d; }
.notif-banner.error   i:first-child { color:#f87171; }
.nb-text { flex:1; min-width:0; display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; }
.nb-text strong { font-size:13px; font-weight:600; color:var(--text-1); }
.nb-text span    { font-size:12.5px; color:var(--text-2); }
.nb-close { background:none; border:none; color:var(--text-3); font-size:14px; cursor:pointer; padding:4px; border-radius:5px; flex-shrink:0; transition:all .15s; }
.nb-close:hover { background:rgba(255,255,255,.08); color:var(--text-1); }
.notif-drop-enter-active, .notif-drop-leave-active { transition:all .3s ease; }
.notif-drop-enter-from, .notif-drop-leave-to { opacity:0; transform:translateY(-100%); max-height:0; }

@media(max-width:600px){.msg-area{padding:8px 8px}.welcome-inner{padding:12px 6px}.nb-text{flex-direction:column;gap:2px}}
</style>