<template>
  <div class="app-shell" :class="{ 'light-mode': isLightMode }">
    <!-- Backdrop for the mobile sidebar (z 90 < sidebar z 100) -->
    <template v-if="!isGuest">
      <transition name="fade">
        <div v-if="mobileSidebarOpen" class="mob-overlay" @click="mobileSidebarOpen=false" aria-hidden="true"></div>
      </transition>
      <!-- Backdrop for the right panel when it becomes a drawer on mobile -->
      <transition name="fade">
        <div v-if="rightOpen && isMobile" class="mob-overlay rp-overlay" @click="rightOpen=false" aria-hidden="true"></div>
      </transition>
    </template>
    <transition name="fade">
      <div v-if="isGuest && mobileSidebarOpen" class="mob-overlay" @click="mobileSidebarOpen=false" aria-hidden="true"></div>
    </transition>

    <!-- Sidebar: identical structure for members and guests —
         visible on desktop AND as a mobile drawer for both. -->
    <Sidebar
      :mobile-open="mobileSidebarOpen"
      :collapsed="sidebarCollapsed"
      :guest="isGuest"
      @close-mobile="mobileSidebarOpen=false"
      @toggle-collapse="toggleSidebarCollapse"
      @new-chat="handleNewChat"
      @load-chat="handleLoadChat"
      @authrequired="showAuthGate=true"
    />

    <div class="main-col">
      <!-- ═══ MOBILE HEADER (≤768px) ═══ -->
      <header v-if="isPhone" class="m-hd" :class="{ 'in-chat': inChat }">
        <!-- Home: brand pill (opens chat history) + settings -->
        <template v-if="!inChat">
          <button class="m-brand" @click="mobileSidebarOpen=true" aria-label="Open chat history">
            <span class="m-brand-ic"><img src="/logo.png" alt="" /></span>
            <b>Kinya<span>Bot</span></b>
            <i class="fas fa-clock-rotate-left"></i>
          </button>
          <div class="m-hd-right">
            <button v-if="isGuest" class="m-signin" @click="goAuth('login')">Sign in</button>
            <button class="m-circle" @click="showSettings=true" aria-label="Settings"><AnimatedIcon icon="fas fa-gear" animation="subtle-hover" /></button>
          </div>
        </template>
        <!-- Conversation: back · title + status · new chat -->
        <template v-else>
          <button class="m-circle" @click="goHome" aria-label="Back to home"><AnimatedIcon icon="fas fa-arrow-left" animation="subtle-hover" /></button>
          <button class="m-title" @click="mobileSidebarOpen=true" aria-label="Open chat history">
            <b>{{ chatStore.activeChat?.title || 'New Chat' }}</b>
            <span class="m-status" :class="{ busy: chatStore.sending || chatStore.streaming }">
              <AnimatedIcon icon="fas fa-circle" animation="pulse" :active="chatStore.sending || chatStore.streaming" size="5px" />{{ chatStore.sending || chatStore.streaming ? 'Typing…' : 'Online' }}
            </span>
          </button>
          <button class="m-circle" @click="handleNewChat" aria-label="New chat"><AnimatedIcon icon="fas fa-pen-to-square" animation="subtle-hover" /></button>
        </template>
      </header>

      <!-- Top bar -->
      <div v-else class="top-bar" :class="{ scrolled: chatScrolled }">
        <!-- ── Authenticated header ── -->
        <template v-if="!isGuest">
          <div class="topbar-left">
            <button class="mob-menu-btn" type="button" title="Open chat history" aria-label="Open chat history" @click="mobileSidebarOpen=true">
              <AnimatedIcon icon="fas fa-bars" animation="subtle-hover" />
            </button>
            <div class="chat-title-group">
              <input
                v-if="renamingChat"
                ref="chatTitleInput"
                v-model="chatTitleDraft"
                class="chat-title-input"
                maxlength="80"
                aria-label="Chat title"
                @keydown.enter.prevent="commitChatRename"
                @keydown.esc.stop.prevent="cancelChatRename"
                @blur="commitChatRename"
              />
              <button
                v-else
                class="chat-title"
                type="button"
                :disabled="!chatStore.activeChat"
                :title="chatStore.activeChat ? `Rename: ${chatStore.activeChat.title}` : 'No chat open'"
                aria-label="Rename chat"
                @click="startChatRename"
              >
                <span>{{ chatStore.activeChat?.title || 'New Chat' }}</span>
                <AnimatedIcon icon="fas fa-pen" animation="subtle-hover" />
              </button>
              <span class="chat-model-label">KinyaBot AI</span>
            </div>
          </div>
          <div class="topbar-right">
            <button
              class="topbar-action voice-action"
              type="button"
              title="Voice mode"
              aria-label="Open voice mode"
              @mouseenter="preloadVoiceMode"
              @focus="preloadVoiceMode"
              @click="openVoiceMode"
            >
              <AnimatedIcon icon="fas fa-microphone-lines" animation="subtle-hover" />
              <span>Voice</span>
            </button>
            <button
              class="topbar-action"
              type="button"
              title="Share current chat"
              aria-label="Share current chat"
              :disabled="!chatStore.activeChat"
              @click="handleShare"
            >
              <AnimatedIcon icon="fas fa-share-nodes" animation="subtle-hover" />
            </button>
            <button
              class="topbar-action"
              :class="{ active: rightOpen }"
              type="button"
              :title="`Details (${navigatorShortcut}.)`"
              aria-label="Toggle chat details"
              :aria-pressed="rightOpen"
              @click="rightOpen=!rightOpen"
            >
              <AnimatedIcon icon="fas fa-sliders" animation="subtle-hover" />
            </button>
          </div>

        <!-- ── Guest header: chat-first, auth always reachable ── -->
        </template>
        <template v-else>
          <div class="guest-brand">
            <button class="mob-menu-btn" type="button" title="Open chat history" aria-label="Open chat history" @click="mobileSidebarOpen=true">
              <AnimatedIcon icon="fas fa-bars" animation="subtle-hover" />
            </button>
            <img src="/logo.png" alt="KinyaBot" class="guest-logo" />
            <span class="guest-name">KinyaBot</span>
          </div>
          <div class="guest-actions">
            <button class="auth-btn ghost" @click="goAuth('login')">Sign In</button>
            <button class="auth-btn solid" @click="goAuth('register')">Sign Up</button>
          </div>
        </template>
      </div>

      <ChatWindow
        ref="chatWindow"
        :guest="isGuest"
        :restored-draft="restoredDraft"
        :restored-file="restoredFile"
        @scroll-state="chatScrolled=$event"
        @toggle-sidebar="mobileSidebarOpen=!mobileSidebarOpen"
        @auth-required="handleAuthRequired"
        @draft-consumed="onDraftConsumed"
        @artifact-ready="handleArtifactReady"
      />
    </div>

    <template v-if="!isGuest">
      <transition name="slide-r">
        <RightPanel ref="rightPanel" v-if="rightOpen" @load-chat="handleLoadChat" @close="rightOpen=false" />
      </transition>
    </template>
    <SettingsModal v-if="showSettings" @close="showSettings=false" />

    <!-- ── Guest auth gate: shown BEFORE any AI request is sent ── -->
    <AuthGateModal
      v-if="showAuthGate"
      @close="showAuthGate=false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { isLightMode as sharedIsLightMode } from '../theme'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { connectSocket } from '../socket'
import AnimatedIcon from '../components/AnimatedIcon.vue'
import Sidebar from '../components/Sidebar.vue'
import ChatWindow from '../components/ChatWindow.vue'
import RightPanel from '../components/RightPanel.vue'
import AuthGateModal from '../components/AuthGateModal.vue'
import SettingsModal from '../components/SettingsModal.vue'
import { useIsMobile } from '../composables/useIsMobile'

const auth = useAuthStore()
const chatStore = useChatStore()
const route = useRoute()
const router = useRouter()

const mobileSidebarOpen = ref(false)
const sidebarCollapsed = ref(localStorage.getItem('kb_sidebar_collapsed') === '1')
const showSettings = ref(false)
const chatWindow = ref(null)
const rightPanel = ref(null)
const chatScrolled = ref(false)
const renamingChat = ref(false)
const chatTitleDraft = ref('')
const chatTitleInput = ref(null)
const navigatorShortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'
watch(() => chatStore.activeChat?.id, () => {
  chatScrolled.value = false
  renamingChat.value = false
})

// Phone layout (≤768px): redesigned header, home screen and composer
const isPhone = useIsMobile()
const inChat = computed(() => !!chatStore.activeChat && chatStore.messages.length > 0)

/** Back arrow → return to the home (welcome) screen without losing history. */
function goHome() {
  if (chatStore.sending || chatStore.streaming) chatStore.stopGeneration()
  chatStore.activeChat = null
  chatStore.messages = []
}

function startChatRename() {
  if (!chatStore.activeChat) return
  chatTitleDraft.value = chatStore.activeChat.title
  renamingChat.value = true
  nextTick(() => {
    chatTitleInput.value?.focus()
    chatTitleInput.value?.select()
  })
}

async function commitChatRename() {
  if (!renamingChat.value) return
  renamingChat.value = false
  const title = chatTitleDraft.value.trim()
  const chat = chatStore.activeChat
  if (chat && title && title !== chat.title) await chatStore.renameChat(chat.id, title)
}

function cancelChatRename() {
  renamingChat.value = false
}

function toggleSidebarCollapse() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  try {
    localStorage.setItem('kb_sidebar_collapsed', sidebarCollapsed.value ? '1' : '0')
  } catch (err) {
    console.warn('[Sidebar] Could not save collapsed state:', err)
  }
}

function openVoiceMode() {
  chatWindow.value?.openVoiceMode()
}

function preloadVoiceMode() {
  chatWindow.value?.preloadVoiceMode()
}

function handleArtifactReady() {
  rightOpen.value = true
  nextTick(() => rightPanel.value?.revealArtifact())
}

// ── Guest mode ────────────────────────────────────────────────
// Guests see the full chat interface but cannot reach the AI until
// they sign in — enforced here AND by the backend's authGuard.
const isGuest = computed(() => auth.status !== 'authenticated')

const showAuthGate = ref(false)
const gatedDraft = ref('')
const gatedFile = ref(null)   // File object kept in memory across the SPA auth round-trip
const restoredDraft = ref(null)
const restoredFile = ref(null)

// The right panel becomes a slide-over drawer on narrow screens
const mqMobile = window.matchMedia('(max-width: 900px)')
const isMobile = ref(mqMobile.matches)
function onMqChange(e) {
  isMobile.value = e.matches
  if (!e.matches) rightOpen.value = window.innerWidth > 1200
}
const rightOpen = ref(!mqMobile.matches && window.innerWidth > 1200)

// Reactive theme state — shared with the rest of the app (src/theme.js)
const isLightMode = sharedIsLightMode

onMounted(async () => {
  if (!isGuest.value) {
    await initAuthenticatedSession()
  }

  window.addEventListener('keydown', handleGlobalKeys)
  mqMobile.addEventListener('change', onMqChange)
})

/** Load conversations + socket for a signed-in user (chat history restore). */
async function initAuthenticatedSession() {
  if (auth.token) {
    connectSocket(auth.token)
    chatStore.setupSocketListeners()
  }

  await Promise.all([chatStore.fetchChats(), chatStore.fetchStats()])
  if (route.query.new === '1') {
    await chatStore.createChat()
    router.replace({ path: '/', query: {} })
  } else if (chatStore.chats.length) {
    await chatStore.loadChat(chatStore.chats[0].id)
  }
}

// Transition guest → member the moment authentication succeeds
// (after login/registration the user lands back on `/` and their
//  conversations load immediately — no refresh needed).
watch(isGuest, async (guest, wasGuest) => {
  if (!guest && wasGuest) {
    showAuthGate.value = false
    await initAuthenticatedSession()
    restorePendingDraft()
  }
})

/* ── Guest send flow ──────────────────────────────────────────────
   Fired by ChatWindow BEFORE any network request is made: the AI is
   never contacted for unauthenticated users. The typed message is
   preserved in sessionStorage so it survives the round-trip through
   /login or /register and returns to the composer afterwards.      */
function handleAuthRequired({ content, file }) {
  gatedDraft.value = content || ''
  gatedFile.value = file || null
  try {
    if (content) sessionStorage.setItem('kb_pending_message', content)
  } catch {}
  showAuthGate.value = true
}
function goAuth(mode) {
  router.push(`/${mode}?redirect=/`)
}

/** After sign-in: put the preserved message AND attachment back into the composer. */
function restorePendingDraft() {
  let draft = null
  try { draft = sessionStorage.getItem('kb_pending_message') } catch {}
  if (draft) {
    restoredDraft.value = draft
    sessionStorage.removeItem('kb_pending_message')
  }
  if (gatedFile.value) {
    restoredFile.value = gatedFile.value
    gatedFile.value = null
  }
}

/** Composer consumed the restored draft/attachment (sent or dismissed). */
function onDraftConsumed() {
  restoredDraft.value = null
  restoredFile.value = null
}

function handleGlobalKeys(e) {
  if (isGuest.value) return
  const ctrl = e.ctrlKey || e.metaKey
  if (ctrl && e.key === 'k') { e.preventDefault(); handleNewChat() }
  if (ctrl && e.key === 'b') { e.preventDefault(); mobileSidebarOpen.value = !mobileSidebarOpen.value }
  if (!isPhone.value && ctrl && e.key === '.') { e.preventDefault(); rightOpen.value = !rightOpen.value }
}

async function handleNewChat() {
  // Guests have no server chats — reset the local view only.
  if (isGuest.value) {
    mobileSidebarOpen.value = false
    return
  }
  await chatStore.createChat()
  mobileSidebarOpen.value = false
}

async function handleLoadChat(id) {
  await chatStore.loadChat(id)
  mobileSidebarOpen.value = false
}

async function handleShare() {
  const chat = chatStore.activeChat
  if (!chat) return
  const text = `Check out this KinyaBot conversation: "${chat.title}"`
  if (navigator.share) {
    await navigator.share({ title: 'KinyaBot AI Chat', text }).catch(() => {})
  } else {
    await navigator.clipboard.writeText(text).catch(() => {})
    alert('Chat title copied to clipboard!')
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeys)
  mqMobile.removeEventListener('change', onMqChange)
})
</script>

<style scoped>
.app-shell { display:flex; height:100vh; height:100dvh; width:100%; background:var(--bg-base); overflow:hidden; }

/* Backdrop under the sidebar drawer (sidebar z-index: 100) */
.mob-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:90; backdrop-filter:blur(3px); }
/* Backdrop under the right-panel drawer (panel z-index: 80) */
.rp-overlay { z-index:70; }

.main-col { flex:1; min-width:0; display:flex; flex-direction:column; overflow:hidden; background:var(--bg-base); height:100vh; height:100dvh; }

.top-bar {
  display:flex; align-items:center; justify-content:space-between;
  padding:0 12px; height:52px; flex-shrink:0;
  background:transparent;
}
.top-bar.scrolled { border-bottom:1px solid var(--border); }
.topbar-left,.topbar-right { display:flex; align-items:center; min-width:0; }
.topbar-left { flex:1; }
.topbar-right { gap:4px; }
.mob-menu-btn {
  display:none; width:36px; height:36px; flex-shrink:0; margin-right:8px;
  align-items:center; justify-content:center; border:0; border-radius:8px;
  background:transparent; color:var(--text-2); font-size:15px; cursor:pointer;
}
.mob-menu-btn:hover { background:var(--bg-hover); color:var(--text-1); }

.chat-title-group { display:flex; align-items:center; gap:10px; min-width:0; }
.chat-title {
  display:flex; align-items:center; gap:8px; min-width:0; max-width:min(42vw, 480px);
  padding:0; background:transparent; color:var(--text-1); font-size:15px; font-weight:600;
  text-align:left; white-space:nowrap;
}
.chat-title span { overflow:hidden; text-overflow:ellipsis; }
.chat-title i { flex-shrink:0; color:var(--text-3); font-size:11px; opacity:0; transition:opacity .15s; }
.chat-title:hover i,.chat-title:focus-visible i { opacity:1; }
.chat-title:disabled { cursor:default; }
.chat-title:disabled i { display:none; }
.chat-title-input {
  width:min(42vw, 480px); min-width:120px; height:34px; padding:0 8px;
  background:var(--bg-input); border:1px solid var(--brand); border-radius:var(--r-sm);
  color:var(--text-1); font-size:15px; font-weight:600; box-shadow:var(--focus-glow);
}
.chat-model-label { flex-shrink:0; color:var(--text-3); font-size:12px; font-weight:500; }
.topbar-action {
  width:36px; height:36px; flex-shrink:0; display:flex; align-items:center; justify-content:center;
  gap:7px; padding:0; border:0; border-radius:8px; background:transparent;
  color:var(--text-2); font-size:14px; transition:background .15s, color .15s; cursor:pointer;
}
.topbar-action:hover:not(:disabled) { background:var(--bg-hover); color:var(--text-1); }
.topbar-action:focus-visible,.chat-title:focus-visible,.chat-title-input:focus-visible {
  outline:2px solid var(--brand-text); outline-offset:2px;
}
.mob-menu-btn:focus-visible { outline:2px solid var(--brand-text); outline-offset:2px; }
.topbar-action:disabled { opacity:.45; cursor:default; }
.topbar-action.active { background:var(--brand-soft); color:var(--brand-text); }
.topbar-action.voice-action {
  width:auto; padding:0 12px; background:var(--brand-soft); color:var(--brand-text);
  font-size:13px; font-weight:600;
}
.topbar-action.voice-action:hover { background:var(--brand-soft); filter:brightness(1.12); color:var(--brand-text); }
.topbar-action.voice-action i { font-size:13px; }

/* ── Guest header ── */
.guest-brand { display:flex; align-items:center; gap:9px; min-width:0; }
.guest-logo { width:30px; height:30px; border-radius:8px; object-fit:contain; flex-shrink:0; }
.guest-name { font-size:15px; font-weight:700; color:var(--text-1); white-space:nowrap; }

.guest-actions { display:flex; align-items:center; gap:8px; }
.auth-btn { padding:7px 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; white-space:nowrap; }
.auth-btn.ghost { background:transparent; border:0; color:var(--text-2); }
.auth-btn.ghost:hover { background:var(--bg-hover); color:var(--text-1); }
.auth-btn.solid { background:var(--accent); border:1px solid transparent; color:#fff; box-shadow:0 2px 10px rgba(99,102,241,.3); }
.auth-btn.solid:hover { filter:brightness(1.12); transform:translateY(-1px); }

/* ── MOBILE ── */
@media(max-width:900px) {
  .mob-menu-btn { display:flex; }
  .chat-title { max-width:34vw; }
  .chat-title-input { width:34vw; }
}
@media(max-width:480px) {
  .top-bar { padding:0 6px; height:48px; }
  .topbar-right { gap:2px; }
  .guest-actions { gap:6px; }
  .auth-btn { padding:6px 12px; font-size:12.5px; }
}
@media(max-width:340px) {
  .auth-btn { padding:6px 10px; font-size:12px; }
}

@media(max-width:768px){
  .main-col { background:var(--bg-base); }
  .top-bar { border:0; }
}

/* ═══ MOBILE HEADER ═══ */
.m-hd {
  display:flex; align-items:center; justify-content:space-between; gap:8px; flex-shrink:0;
  padding:max(8px, env(safe-area-inset-top)) 14px 6px;
  background:var(--bg-base); position:relative; z-index:5;
  animation:fadeUp .4s ease both;
}
.m-brand {
  display:flex; align-items:center; gap:8px; height:40px; padding:0 12px 0 5px;
  background:var(--bg-card); border:1px solid var(--border-md); border-radius:99px;
  color:var(--text-1); transition:transform .15s, background .15s;
}
.m-brand:active { transform:scale(.96); background:var(--bg-hover); }
.m-brand-ic { width:28px; height:28px; border-radius:50%; background:var(--accent-solid); display:flex; align-items:center; justify-content:center; }
.m-brand-ic img { width:16px; height:16px; object-fit:contain; border-radius:4px; }
.m-brand b { font-size:13.5px; font-weight:700; letter-spacing:.01em; }
.m-brand b span { color:var(--purple); }
.m-brand > i { font-size:11px; color:var(--text-3); margin-left:1px; }
.m-hd-right { display:flex; align-items:center; gap:7px; }
.m-signin { height:36px; padding:0 14px; border-radius:99px; background:var(--accent-solid); color:#fff; font-size:12.5px; font-weight:600; }
.m-circle {
  width:40px; height:40px; border-radius:50%; flex-shrink:0;
  background:var(--bg-card); border:1px solid var(--border-md);
  color:var(--purple); font-size:14px;
  display:flex; align-items:center; justify-content:center; transition:transform .15s, background .2s;
}
.m-circle:active { transform:scale(.9); background:var(--bg-hover); }
.m-title { flex:1; min-width:0; background:none; display:flex; flex-direction:column; align-items:center; gap:1px; color:var(--text-1); }
.m-title b { max-width:100%; font-size:14.5px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.m-status { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--text-2); }
.m-status i { width:6px; height:6px; border-radius:50%; color:var(--green); }
.m-status.busy i { color:var(--purple); }
</style>
