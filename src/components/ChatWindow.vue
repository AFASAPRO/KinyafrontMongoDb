<template>
  <div class="chat-window"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div v-if="isPhone && hasMessages" class="chat-topbar">
      <button class="model-pill">
        <i class="fas fa-star" style="color:var(--accent-violet);font-size:11px"></i>
        <span>KinyaBot AI</span>
        <i class="fas fa-chevron-down" style="font-size:10px;opacity:.6"></i>
      </button>
      <div v-if="chatStore.activeChat" class="chat-title-pill">
        {{ chatStore.activeChat.title }}
      </div>
      <!-- Voice Mode (optional, authed users) -->
      <button
        v-if="!guest"
        class="voice-pill"
        @click="showVoiceMode=true"
        @mouseenter="preloadVoiceMode"
        @focus="preloadVoiceMode"
        @touchstart="preloadVoiceMode"
        title="Voice mode"
        aria-label="Enable voice mode"
      >
        <AnimatedIcon icon="fas fa-microphone-lines" animation="subtle-hover" />
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

    <!-- Drag & drop overlay (§10) — appears only while dragging files -->
    <transition name="fade">
      <div v-if="draggingFiles" class="dropzone" aria-hidden="true">
        <div class="dz-inner">
          <i class="fas fa-cloud-arrow-up"></i>
          <strong>Drop files to attach</strong>
          <span>Images and documents</span>
        </div>
      </div>
    </transition>

    <!-- Messages area -->
    <div v-if="hasMessages || isPhone" class="msg-area" ref="msgArea" @scroll="handleScroll">
      <!-- Welcome screen -->
      <!-- ═══ MOBILE HOME ═══ -->
      <div v-if="isPhone && !hasMessages" class="m-home">
        <h1 class="m-greet">
          <template v-for="(part, pi) in greeting.parts" :key="pi">
            <em v-if="part.hl">{{ part.t }}</em><template v-else>{{ part.t }}</template>
          </template>
        </h1>
        <div class="m-chips">
          <div v-for="(row, ri) in marqueeRows" :key="ri" class="m-chip-row" :class="`r${ri}`">
            <div class="m-chip-track" :class="`dir${ri}`">
              <button v-for="(c,ci) in row" :key="ri+'-'+ci" class="m-chip" type="button" @click="useChip(c.prompt)">
                <span class="ic"><AnimatedIcon :icon="c.icon" animation="subtle-hover" /></span>
                <span>{{ c.lead }} <b>{{ c.accent }}</b></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Message list -->
      <div v-if="hasMessages && isPhone" class="m-day"><span>Today</span></div>
      <transition-group v-if="hasMessages" name="msg" tag="div" class="msgs-list">
        <MessageBubble
          v-for="(msg, i) in chatStore.messages"
          :key="msg.id"
          :message="msg"
          :artifact-name="chatStore.activeChat?.title || 'kinyabot-project'"
          :is-coding-task="isCodingTask(msg, i)"
          :is-last="isLastAssistant(msg, i)"
          :regen-busy="chatStore.sending || chatStore.streaming"
          :search-activity="msg._streaming ? chatStore.webSearchActivity : null"
          @delete="chatStore.deleteMessage(msg.id)"
          @copy="handleCopy(msg.content)"
          @retry="handleRetry"
          @regenerate="handleRegenerate(msg)"
          @edit-save="handleEditSave(msg, $event)"
          @version="chatStore.switchVersion(msg.id, $event)"
          @open-artifact="emit('artifact-ready')"
        />
      </transition-group>

      <!-- Suggested follow-ups (phones) -->
      <transition name="fade">
        <div v-if="isPhone && showFollowups" class="m-follow">
          <button v-for="f in followups" :key="f" @click="handleSend({ content: f, file: null })">
            <AnimatedIcon icon="fas fa-wand-magic-sparkles" animation="subtle-hover" />{{ f }}
          </button>
        </div>
      </transition>

      <!-- Stop generation -->
      <transition name="fade">
        <button v-if="chatStore.streaming" class="stop-btn" @click="chatStore.stopGeneration()" aria-label="Stop generating" title="Stop generating">
          <AnimatedIcon icon="fas fa-stop" animation="press" /> Stop generating
        </button>
      </transition>
    </div>

    <!-- ═══ DESKTOP CENTERED HOME (empty state) — greeting + centered
         composer + suggestion cards, styled after the marketing site ═══ -->
    <div v-if="!isPhone && !hasMessages" class="welcome-hero">
      <div class="wh-inner">
        <div class="wh-brand">
          <img src="/logo.png" alt="" />
          <span>KinyaBot AI</span>
        </div>
        <h1 class="wh-greet serif-display">
          <template v-for="(part, pi) in greeting.parts" :key="pi">
            <em v-if="part.hl">{{ part.t }}</em><template v-else>{{ part.t }}</template>
          </template>
        </h1>
        <p v-if="guest" class="wh-sub">
          Ask anything, attach documents or images, or talk with your voice —
          <strong>sign in to start chatting.</strong>
        </p>

        <InputBox
          centered
          class="wh-input"
          @send="handleSend"
          :disabled="chatStore.sending"
          :preserve-on-send="guest"
          :suggestions-enabled="!hasMessages"
          :injected-text="composerInject"
          :injected-file="restoredFile"
          :injected-files="droppedFiles"
          :mode="chatStore.composerMode"
          :can-web-search="canWebSearch"
          :can-agent="canAgent"
          @update:mode="chatStore.composerMode = $event"
          @upgrade="showSearchUpgrade = true"
          @files-consumed="droppedFiles=null"
          @focus="scrollBottom"
        />

        <div class="wh-cards">
          <button type="button" class="wh-card" @click="useChip('Tell me a fun fact I probably do not know and explain it simply')">
            <span class="whc-ic"><AnimatedIcon icon="fas fa-magnifying-glass" animation="subtle-hover" /></span>
            <span class="whc-body">
              <b>Ask anything</b>
              <small>Get fast, accurate answers — in English, Kinyarwanda, French and more.</small>
            </span>
          </button>
          <button type="button" class="wh-card alt" @click="useChip('Help me plan and write a project brief — ask me for the details step by step')">
            <span class="whc-ic"><AnimatedIcon icon="fas fa-robot" animation="subtle-hover" /></span>
            <span class="whc-body">
              <b>Get work done with KinyaBot</b>
              <em>NEW</em>
              <small>Hand off writing, code and research — polished results around the clock.</small>
            </span>
          </button>
        </div>

        <!-- Pinned cards (authenticated users) -->
        <div v-if="!guest && chatStore.pinnedChats.length" class="pinned-section">
          <div class="pinned-header">
            <AnimatedIcon icon="fas fa-thumbtack" animation="subtle-hover" style="color:var(--text-2)" />
            <span>Pinned Chats</span>
            <i class="fas fa-chevron-down" style="font-size:11px;color:var(--text-3);margin-left:4px"></i>
            <button class="sm-icon-btn" style="margin-left:auto" aria-label="Pinned chat options"><AnimatedIcon icon="fas fa-ellipsis" animation="subtle-hover" /></button>
          </div>
          <div class="pinned-cards">
            <div v-for="chat in chatStore.pinnedChats.slice(0,3)" :key="chat.id"
              class="pinned-card" @click="chatStore.loadChat(chat.id)">
              <div class="pc-icon"><AnimatedIcon icon="fas fa-file-lines" animation="subtle-hover" /></div>
              <div class="pc-info">
                <div class="pc-title">{{ chat.title }}</div>
                <div class="pc-sub">{{ (chat.last_message || 'No messages yet').slice(0,50) }}</div>
                <div class="pc-date">{{ relTime(chat.updated_at) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Voice mode overlay -->
    <VoiceMode v-if="showVoiceMode" @close="showVoiceMode=false" />

    <!-- Scroll FAB -->
    <transition name="fade">
      <button v-if="showScrollBtn" class="scroll-fab" @click="scrollBottom">
        <AnimatedIcon icon="fas fa-arrow-down" animation="subtle-hover" />
      </button>
    </transition>

    <!-- Copy toast -->
    <transition name="fade">
      <div v-if="copyToast" class="copy-toast">
        <AnimatedIcon icon="fas fa-check" animation="success" :active="copyToast" /> Copied to clipboard
      </div>
    </transition>

    <!-- Edit error toast (§25) -->
    <transition name="fade">
      <div v-if="editError" class="edit-error-toast" role="alert">
        <i class="fas fa-triangle-exclamation"></i>
        <span>{{ editError }}</span>
      </div>
    </transition>

    <!-- Restored-draft hint (message preserved across sign-in) -->
    <transition name="fade">
      <div v-if="restoredDraft" class="restored-hint">
        <AnimatedIcon icon="fas fa-circle-info" animation="slide-in" />
        <span>Your message is ready below — press Send to chat with KinyaBot.</span>
        <button class="rh-x" @click="$emit('draft-consumed')"><i class="fas fa-xmark"></i></button>
      </div>
    </transition>

    <InputBox
      v-if="hasMessages || isPhone"
      @send="handleSend"
      :disabled="chatStore.sending"
      :preserve-on-send="guest"
      :suggestions-enabled="!hasMessages"
      :injected-text="composerInject"
      :injected-file="restoredFile"
      :injected-files="droppedFiles"
      :mode="chatStore.composerMode"
      :can-web-search="canWebSearch"
      :can-agent="canAgent"
      @update:mode="chatStore.composerMode = $event"
      @upgrade="showSearchUpgrade = true"
      @files-consumed="droppedFiles=null"
      @focus="scrollBottom"
    />

    <!-- Web Search upgrade modal (Web Search §28) — free users get the
         premium upsell INSTEAD of a doomed request. -->
    <WebSearchUpgradeModal :open="showSearchUpgrade" @close="showSearchUpgrade = false" />
  </div>
</template>

<script setup>
import { ref, nextTick, watch, computed, onMounted, onBeforeUnmount, defineAsyncComponent } from 'vue'
import { useChatStore } from '../stores/chat'
import { useAuthStore } from '../stores/auth'
import { useSubscriptionStore } from '../stores/subscription'
import { useIsMobile } from '../composables/useIsMobile'
import { getSocket } from '../socket'
import api from '../api'
import MessageBubble from './MessageBubble.vue'
import InputBox from './InputBox.vue'
import WebSearchUpgradeModal from './WebSearchUpgradeModal.vue'
import AnimatedIcon from './AnimatedIcon.vue'
import { extractCodeFiles } from '../utils/codeArtifacts'
// Lazy-loaded: Voice Mode pulls in three.js + the 3D character, so it
// should only be downloaded when the person actually opens it.
const VoiceMode = defineAsyncComponent(() => import('./VoiceMode.vue'))

// Warm the voice mode chunk + Kinya's .riv character file as soon as the
// person shows intent to open it (hover/focus/touch), so by the time they
// actually tap the button both the component and the character asset are
// already in cache and there's no loading spinner on open.
let voiceModePreloaded = false
function preloadVoiceMode() {
  if (voiceModePreloaded) return
  voiceModePreloaded = true
  import('./VoiceMode.vue').catch(() => { voiceModePreloaded = false })
  try {
    fetch(`${import.meta.env.BASE_URL}rive/kinya-character.riv`, { cache: 'force-cache' }).catch(() => {})
  } catch {}
}

const props = defineProps({
  guest: { type: Boolean, default: false },
  restoredDraft: { type: String, default: null },
  restoredFile: { type: [Object, File], default: null }
})
const emit = defineEmits(['toggle-sidebar', 'auth-required', 'draft-consumed', 'scroll-state', 'artifact-ready'])

const chatStore = useChatStore()
const auth = useAuthStore()
const subscriptionStore = useSubscriptionStore()
const isPhone = useIsMobile()
const hasMessages = computed(() => !!chatStore.activeChat && chatStore.messages.length > 0)
const showSearchUpgrade = ref(false)
/* Plan entitlements for the composer mode menu (§28/§29). The backend
   remains the single authority — this only drives the lock icon and
   which menu entry opens the upgrade modal. */
const canWebSearch = computed(() => !props.guest && subscriptionStore.features?.webSearch === true)
const canAgent = computed(() => !props.guest && subscriptionStore.features?.agentAccess === true)
const firstName = computed(() => {
  const n = (auth.user?.username || '').trim().split(/\s+/)[0]
  return !props.guest && n ? n : ''
})

/**
 * Time-of-day greeting, refreshed every time the home screen is shown.
 * Mirrors how modern AI apps (ChatGPT, Gemini…) vary the welcome line by
 * the hour — late-night gets a different tone than a weekday morning.
 * `parts` drives the template so specific words stay highlighted in --purple.
 */
function buildGreeting(hour, name) {
  const who = name ? name : 'friend'
  if (hour >= 5 && hour < 12)  return [{ t: `Morning, ${who}! ` }, { t: 'Have an idea?', hl: true }]
  if (hour >= 12 && hour < 17) return [{ t: `Good afternoon, ${who}. ` }, { t: "What's on your mind?", hl: true }]
  if (hour >= 17 && hour < 21) return [{ t: `Good evening, ${who}. ` }, { t: 'How can I help?', hl: true }]
  if (hour >= 21 || hour < 1)  return [{ t: `Still up, ${who}? ` }, { t: "I'm here.", hl: true }]
  return [{ t: `${who}, back again? ` }, { t: "Let's make it count.", hl: true }]
}
const greeting = computed(() => ({ parts: buildGreeting(new Date().getHours(), firstName.value) }))

// Mobile home: two auto-scrolling suggestion rows
const mobileChipRows = [
  [
    { icon:'fas fa-lightbulb', lead:'Tell me', accent:'a fun fact', prompt:'Tell me a fun fact I probably do not know' },
    { icon:'fas fa-language', lead:'Translate', accent:'a text', prompt:'Help me translate a text. Ask me for the text and the target language.' },
    { icon:'fas fa-pen-nib', lead:'Help me', accent:'write', prompt:'Help me write a professional cover letter' },
    { icon:'fas fa-code', lead:'Generate', accent:'code', prompt:'Write a responsive HTML/CSS landing page with a modern dark theme' },
  ],
  [
    { icon:'fas fa-book-open', lead:'Start', accent:'learning', prompt:'Create a beginner-friendly learning plan for a topic I choose. Ask me which topic.' },
    { icon:'fas fa-wand-magic-sparkles', lead:'Give me', accent:'ideas', prompt:'Give me 10 creative project ideas I can start this weekend' },
    { icon:'fas fa-earth-africa', lead:'Quiz me', accent:'on world capitals', prompt:'Quiz me on world capitals, one question at a time' },
    { icon:'fas fa-film', lead:'Recommend', accent:'a movie', prompt:'Recommend a good movie and tell me why I would like it' },
  ]
]
// Each row's items are duplicated so the CSS marquee loop is seamless;
// row 0 drifts right-to-left, row 1 drifts left-to-right (dir0 / dir1).
const marqueeRows = mobileChipRows.map(row => [...row, ...row])
const followups = ['Tell me more', 'Give an example', 'Make it shorter']
const showFollowups = computed(() => {
  if (props.guest || chatStore.sending || chatStore.streaming) return false
  const last = chatStore.messages[chatStore.messages.length - 1]
  return !!last && last.role === 'assistant' && !last._error && !last._system && !last._typing && !!(last.content || '').trim()
})
watch(showFollowups, (v) => { if (v) scrollBottom() })
const msgArea = ref(null)
const showScrollBtn = ref(false)
// ── Drag & drop (§10) ──
const dragDepth = ref(0)
const droppedFiles = ref(null)   // File[] handed to the composer once
const editError = ref(null)
const draggingFiles = computed(() => dragDepth.value > 0)
function dragHasFiles(e) { return Array.from(e.dataTransfer?.types || []).includes('Files') }
function onDragEnter(e) { if (dragHasFiles(e)) { e.preventDefault(); dragDepth.value++ } }
function onDragOver(e)  { if (dragHasFiles(e)) e.preventDefault() }
function onDragLeave()  { if (dragDepth.value > 0) dragDepth.value-- }
function onDrop(e) {
  if (!dragHasFiles(e)) return
  e.preventDefault()
  dragDepth.value = 0
  const files = Array.from(e.dataTransfer?.files || [])
  if (files.length) droppedFiles.value = files
}
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
  emit('scroll-state', el.scrollTop > 0)
  showScrollBtn.value = el.scrollHeight - el.scrollTop - el.clientHeight > 180
}

function openVoiceMode() {
  showVoiceMode.value = true
}

defineExpose({ openVoiceMode, preloadVoiceMode })

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

async function handleSend({ content, files, mode }) {
  // GUESTS: the AI is never contacted before authentication.
  // The typed message AND the attached file are handed to the auth
  // gate — the file is kept in memory (SPA navigation keeps it alive)
  // so the exact message the guest wrote can be sent after sign-in.
  if (props.guest) {
    emit('auth-required', { content, file: files?.[0] || null })
    return
  }
  if (props.restoredDraft || props.restoredFile) emit('draft-consumed')
  try {
    await chatStore.sendMessage(content, files || [], { mode })
    notifyGeneratedFiles()
  } catch (err) {
    // Web Search lock (§2): the backend refused a non-Pro manual search —
    // open the polished upgrade modal instead of an error bubble.
    if (err?.code === 'FEATURE_LOCKED' && err?.feature === 'webSearch') showSearchUpgrade.value = true
  }
  scrollBottom()
}

/* Message edit save (§17) — the store patches, supersedes the old
   branch and regenerates the response. */
async function handleEditSave(msg, payload) {
  try {
    await chatStore.editMessage(msg.id, payload || {})
  } catch (err) {
    editError.value = err?.message || 'The message could not be edited.'
    setTimeout(() => { editError.value = null }, 5000)
  }
  scrollBottom()
}

function notifyGeneratedFiles() {
  const latest = [...chatStore.messages].reverse().find(message =>
    message.role === 'assistant' && !message._streaming && !message._error
  )
  if (latest && extractCodeFiles(latest.content, latest.id).length) emit('artifact-ready')
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

function isCodingTask(message, index) {
  if (message.role !== 'assistant') return false
  for (let i = index - 1; i >= 0; i--) {
    const previous = chatStore.messages[i]
    if (previous.role !== 'user') continue
    return /\b(code|coding|program|programming|html|css|javascript|typescript|react|vue|website|web app|frontend|front-end|backend|component|script|software|build an app|create an app)\b/i.test(previous.content || '')
  }
  return false
}

async function handleRetry(failedId) {
  try {
    await chatStore.retry(failedId)
    notifyGeneratedFiles()
  } catch {}
  scrollBottom()
}

async function handleRegenerate(msg) {
  try {
    // Target the user turn this answer belongs to (mid-thread
    // regeneration resets the branch, §18/§19).
    let targetId = null
    if (msg) {
      const idx = chatStore.messages.findIndex(m => m.id === msg.id)
      for (let i = (idx === -1 ? chatStore.messages.length : idx) - 1; i >= 0; i--) {
        if (chatStore.messages[i].role === 'user' && !chatStore.messages[i]._error) {
          targetId = chatStore.messages[i].id; break
        }
      }
    }
    await chatStore.regenerate(targetId)
    notifyGeneratedFiles()
  } catch {}
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

/* ── Drag & drop overlay (§10) ── */
.dropzone {
  position:absolute; inset:10px; z-index:60;
  display:flex; align-items:center; justify-content:center;
  background:color-mix(in srgb, var(--bg-base) 78%, transparent);
  backdrop-filter:blur(3px);
  border:2px dashed var(--brand);
  border-radius:18px; pointer-events:none;
  animation:fadeIn .18s ease both;
}
.dz-inner { display:flex; flex-direction:column; align-items:center; gap:8px; color:var(--text-1); text-align:center; padding:28px 40px; border-radius:16px; background:var(--brand-soft, rgba(99,102,241,.12)); }
.dz-inner i { font-size:34px; color:var(--brand-text); }
.dz-inner strong { font-size:17px; font-weight:700; }
.dz-inner span { font-size:12.5px; color:var(--text-2); }

/* Edit error toast */
.edit-error-toast {
  position:absolute; left:50%; transform:translateX(-50%); bottom:110px; z-index:70;
  display:flex; align-items:center; gap:9px; padding:10px 16px;
  background:var(--bg-card); border:1px solid var(--red, #ef4444); border-radius:12px;
  color:var(--text-1); font-size:13px; box-shadow:var(--shadow-md);
  animation:fadeIn .2s ease both;
}

.chat-topbar { display:flex; align-items:center; gap:10px; padding:8px 16px; flex-shrink:0; }
.voice-pill {
  display:flex; align-items:center; gap:6px; margin-left:auto;
  padding:6px 12px; background:var(--bg-card); border:1px solid var(--border);
  border-radius:99px; color:var(--text-2); font-size:12.5px; font-weight:500;
  cursor:pointer; transition:all .2s;
}
.voice-pill:hover { background:rgba(99,102,241,.14); color:var(--brand-text); border-color:rgba(99,102,241,.4); }
.voice-pill i { font-size:12px; }
@media(max-width:600px){ .voice-pill .vp-label { display:none; } .voice-pill { padding:6px 10px; } }
.model-pill { display:flex; align-items:center; gap:6px; padding:6px 12px; background:var(--bg-card); border:1px solid var(--border); border-radius:99px; color:var(--text-1); font-size:13px; font-weight:500; cursor:pointer; transition:all .2s; }
.model-pill:hover { background:var(--bg-hover); }
.chat-title-pill { font-size:12.5px; color:var(--text-2); background:var(--bg-card); border:1px solid var(--border); border-radius:99px; padding:4px 12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:300px; }

.msg-area { flex:1; overflow-y:auto; padding:12px 16px; display:flex; flex-direction:column; scroll-behavior:smooth; -webkit-overflow-scrolling: touch;  }

/* ── Desktop centered home (empty state) ── */
.welcome-hero { flex:1; display:flex; align-items:center; justify-content:center; overflow-y:auto; padding:28px 18px 20px; }
.wh-inner { width:100%; max-width:690px; animation:fadeUp .5s ease; }

.wh-brand { display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:16px; }
.wh-brand img { width:26px; height:26px; border-radius:7px; object-fit:cover; }
.wh-brand span { font-size:13px; font-weight:600; color:var(--text-2); letter-spacing:.05em; }

.wh-greet { text-align:center; font-size:clamp(2rem,4vw,2.9rem); line-height:1.14; color:var(--text-1); margin:0 0 8px; }
.wh-greet em { font-style:normal; color:var(--purple); }
.wh-sub { text-align:center; font-size:13.5px; color:var(--text-2); line-height:1.65; margin:0 auto 22px; max-width:460px; }
.wh-sub strong { color:var(--text-1); }

.wh-input { margin-bottom:18px; }

/* Suggestion cards — cyan/teal family like the landing accents */
.wh-cards { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:1.25rem; }
.wh-card {
  display:flex; align-items:flex-start; gap:11px; padding:16px;
  border-radius:16px; text-align:left; cursor:pointer;
  border:1px solid rgba(69,196,212,.30);
  background:linear-gradient(135deg, rgba(69,196,212,.17), rgba(69,196,212,.05));
  color:var(--text-1);
  transition:transform .18s ease, border-color .2s, background .2s;
}
.wh-card:hover { transform:translateY(-2px); border-color:rgba(69,196,212,.6); background:linear-gradient(135deg, rgba(69,196,212,.26), rgba(69,196,212,.09)); }
.wh-card.alt { border-color:var(--border-md); background:var(--bg-card); }
.wh-card.alt:hover { border-color:rgba(69,196,212,.45); background:var(--bg-hover); }
.whc-ic { width:36px; height:36px; border-radius:11px; background:rgba(69,196,212,.18); display:grid; place-items:center; color:var(--cyan); font-size:14px; flex-shrink:0; }
.wh-card.alt .whc-ic { background:var(--bg-hover); }
.whc-body { display:block; position:relative; min-width:0; }
.whc-body b { display:block; font-size:14.5px; font-weight:600; margin-bottom:3px; padding-right:34px; }
.whc-body small { display:block; font-size:12.5px; line-height:1.5; color:var(--text-2); }
.whc-body em { position:absolute; top:1px; right:0; font-style:normal; font-size:9.5px; font-weight:700; letter-spacing:.07em; color:var(--cyan); border:1px solid rgba(69,196,212,.45); border-radius:99px; padding:1px 7px; }
@media(max-width:900px){ .wh-cards { grid-template-columns:1fr; } }

.pinned-section { background:var(--bg-card); border:1px solid var(--border); border-radius:var(--r-lg); padding:14px; margin-bottom:1.25rem; }
.pinned-header { display:flex; align-items:center; gap:7px; font-size:13px; font-weight:600; color:var(--text-1); margin-bottom:10px; }
.sm-icon-btn { background:none; border:none; color:var(--text-3); font-size:13px; cursor:pointer; padding:3px 5px; border-radius:5px; transition:background .15s; }
.sm-icon-btn:hover { background:var(--bg-hover); }
.pinned-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:10px; }
.pinned-card { background:var(--bg-panel); border:1px solid var(--border); border-radius:var(--r); padding:12px; cursor:pointer; transition:all .2s; }
.pinned-card:hover { background:var(--bg-hover); border-color:var(--border-md); transform:translateY(-1px); }
.pc-icon { width:28px; height:28px; border-radius:8px; background:rgba(99,102,241,.18); border:1px solid rgba(99,102,241,.28); display:flex; align-items:center; justify-content:center; color:var(--brand-text); font-size:12px; margin-bottom:8px; }
.pc-title { font-size:12px; font-weight:600; color:var(--text-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:3px; }
.pc-sub { font-size:11px; color:var(--text-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:5px; }
.pc-date { font-size:10.5px; color:var(--text-3); }

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
.stop-btn i { font-size:10px; color:var(--error); }

.scroll-fab { position:absolute; bottom:110px; right:20px; width:36px; height:36px; border-radius:50%; background:var(--bg-card); border:1px solid var(--border-md); color:var(--text-2); font-size:13px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(0,0,0,.3); cursor:pointer; z-index:5; transition:all .2s; }
.scroll-fab:hover { background:var(--bg-hover); color:var(--text-1); }

.copy-toast { position:absolute; bottom:120px; left:50%; transform:translateX(-50%); background:var(--bg-card); border:1px solid var(--border-md); border-radius:99px; padding:7px 16px; font-size:12.5px; color:var(--text-1); display:flex; align-items:center; gap:7px; box-shadow:0 4px 16px rgba(0,0,0,.3); pointer-events:none; z-index:10; }
.copy-toast i { color:var(--success); }

/* ── Restored draft hint ── */
.restored-hint {
  display:flex; align-items:center; gap:8px;
  margin:0 12px 6px; padding:8px 12px;
  background:rgba(99,102,241,.1); border:1px solid rgba(99,102,241,.25);
  border-radius:10px; font-size:12.5px; color:var(--brand-text);
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
.notif-banner.info    i:first-child { color:var(--accent-cyan); }
.notif-banner.success i:first-child { color:var(--success); }
.notif-banner.warning i:first-child { color:var(--warning); }
.notif-banner.error   i:first-child { color:var(--error); }
.nb-text { flex:1; min-width:0; display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; }
.nb-text strong { font-size:13px; font-weight:600; color:var(--text-1); }
.nb-text span    { font-size:12.5px; color:var(--text-2); }
.nb-close { background:none; border:none; color:var(--text-3); font-size:14px; cursor:pointer; padding:4px; border-radius:5px; flex-shrink:0; transition:all .15s; }
.nb-close:hover { background:rgba(255,255,255,.08); color:var(--text-1); }
.notif-drop-enter-active, .notif-drop-leave-active { transition:all .3s ease; }
.notif-drop-enter-from, .notif-drop-leave-to { opacity:0; transform:translateY(-100%); max-height:0; }

@media(max-width:600px){.msg-area{padding:8px 8px}.wh-inner{padding:12px 6px}.nb-text{flex-direction:column;gap:2px}}

/* ═══════════ MOBILE (≤768px): home + conversation ═══════════ */
@media(max-width:768px){
  .chat-window { background:var(--bg-base); }
  .chat-topbar { padding:0 14px 2px; justify-content:flex-end; }
  .chat-topbar .model-pill, .chat-topbar .chat-title-pill { display:none; }
  .voice-pill { margin-left:0; height:32px; padding:0 12px; background:var(--bg-card); color:var(--purple); border-color:var(--border-md); }
  .voice-pill .vp-label { display:inline; font-size:12px; }
  .msg-area { padding:4px 14px 8px !important; }

  .m-day { align-self:center; margin:4px 0 8px; padding:3px 14px; border-radius:99px; background:var(--bg-card); border:1px solid var(--border); color:var(--text-3); font-size:11px; }

  /* Home — the greeting is the hero: flat, no orb, no stray labels */
  .m-home { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-start; text-align:center; min-height:100%; padding:12vh 0 6px; animation:fadeUp .45s ease both; }

  .m-greet { margin:0 0 26px; font-size:clamp(1.7rem,8.2vw,2.3rem); line-height:1.22; font-weight:800; letter-spacing:-.015em; color:var(--text-1); max-width:15ch; }
  .m-greet em { font-style:normal; color:var(--purple); }

  .m-chips { width:100%; display:flex; flex-direction:column; gap:8px; }
  .m-chip-row { width:100%; overflow:hidden; -webkit-mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent); mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent); }
  .m-chip-track { display:flex; gap:8px; width:max-content; padding:2px 2px 4px; animation:marqueeL 26s linear infinite; }
  .m-chip-track.dir1 { animation-name:marqueeR; animation-duration:30s; }
  .m-chip-row:active .m-chip-track { animation-play-state:paused; }
  .m-chip { flex:0 0 auto; display:flex; align-items:center; gap:8px; height:40px; padding:0 14px 0 8px; border-radius:99px; background:var(--bg-card); border:1px solid var(--border-md); color:var(--text-1); font-size:12.5px; white-space:nowrap; transition:transform .15s, border-color .2s; }
  .m-chip:active { transform:scale(.95); border-color:var(--accent-solid); }
  .m-chip b { color:var(--purple); font-weight:600; }
  .m-chip .ic { width:24px; height:24px; border-radius:50%; background:rgba(99,102,241,.14); color:var(--purple); font-size:11px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }

  /* Suggested follow-ups */
  .m-follow { display:flex; flex-wrap:wrap; gap:7px; margin:2px 0 8px 40px; }
  .m-follow button { display:inline-flex; align-items:center; gap:6px; height:34px; padding:0 13px; border-radius:99px; background:var(--bg-card); border:1px solid var(--border-md); color:var(--purple); font-size:12.5px; font-weight:600; transition:transform .15s, background .2s; }
  .m-follow button:active { transform:scale(.94); background:rgba(99,102,241,.14); }
  .m-follow i { font-size:10px; }

  .stop-btn { border-radius:99px; height:36px; }
  .scroll-fab { bottom:92px; right:14px; width:38px; height:38px; }
  .copy-toast { bottom:96px; }
}
@keyframes marqueeL { from { transform:translateX(0); } to { transform:translateX(-50%); } }
@keyframes marqueeR { from { transform:translateX(-50%); } to { transform:translateX(0); } }
@media (prefers-reduced-motion: reduce) { .m-chip-track { animation:none !important; } }
</style>