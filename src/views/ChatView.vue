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
      :guest="isGuest"
      @close-mobile="mobileSidebarOpen=false"
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
            <button class="m-circle" @click="showSettings=true" aria-label="Settings"><i class="fas fa-gear"></i></button>
          </div>
        </template>
        <!-- Conversation: back · title + status · new chat -->
        <template v-else>
          <button class="m-circle" @click="goHome" aria-label="Back to home"><i class="fas fa-arrow-left"></i></button>
          <button class="m-title" @click="mobileSidebarOpen=true" aria-label="Open chat history">
            <b>{{ chatStore.activeChat?.title || 'New Chat' }}</b>
            <span class="m-status" :class="{ busy: chatStore.sending || chatStore.streaming }">
              <i></i>{{ chatStore.sending || chatStore.streaming ? 'Typing…' : 'Online' }}
            </span>
          </button>
          <button class="m-circle" @click="handleNewChat" aria-label="New chat"><i class="fas fa-pen-to-square"></i></button>
        </template>
      </header>

      <!-- Top bar -->
      <div v-else class="top-bar">
        <!-- ── Authenticated header ── -->
        <template v-if="!isGuest">
          <div class="topbar-left">
            <button class="mob-menu-btn" @click="mobileSidebarOpen=true" title="Menu">
              <i class="fas fa-bars"></i>
            </button>
            <button class="topbar-pill active" @click="handleNewChat" title="New Chat (Ctrl+K)">
              <i class="far fa-comment"></i>
              <span>New Chat</span>
            </button>
            <button class="topbar-icon-btn" @click="handleNewChat" title="New Chat">
              <i class="fas fa-plus"></i>
            </button>
            <button class="topbar-icon-btn" title="More options">
              <i class="fas fa-ellipsis"></i>
            </button>
          </div>
          <div class="topbar-right">
            <button class="topbar-pill" @click="rightOpen=!rightOpen" title="Toggle panel">
              <i class="fas fa-sliders"></i>
              <span>Configuration</span>
              <i class="fas fa-magnifying-glass" style="font-size:11px;opacity:.7"></i>
            </button>
            <button class="topbar-pill" @click="handleShare" title="Share current chat">
              <i class="fas fa-share-nodes"></i>
              <span>Share</span>
            </button>
            <div class="user-avatar-btn" @click="showProfile=true" title="Profile">
              <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" alt="avatar" />
              <span v-else>{{ auth.user?.username?.[0]?.toUpperCase() }}</span>
            </div>
          </div>

        <!-- ── Guest header: chat-first, auth always reachable ── -->
        </template>
        <template v-else>
          <div class="guest-brand">
            <button class="mob-menu-btn" @click="mobileSidebarOpen=true" title="Menu" aria-label="Open menu">
              <i class="fas fa-bars"></i>
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
        :guest="isGuest"
        :restored-draft="restoredDraft"
        :restored-file="restoredFile"
        @toggle-sidebar="mobileSidebarOpen=!mobileSidebarOpen"
        @auth-required="handleAuthRequired"
        @draft-consumed="onDraftConsumed"
      />
    </div>

    <template v-if="!isGuest">
      <transition name="slide-r">
        <RightPanel v-if="rightOpen" @load-chat="handleLoadChat" @close="rightOpen=false" />
      </transition>
      <ProfileModal v-if="showProfile" @close="showProfile=false" />
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
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { isLightMode as sharedIsLightMode } from '../theme'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { connectSocket } from '../socket'
import Sidebar from '../components/Sidebar.vue'
import ChatWindow from '../components/ChatWindow.vue'
import RightPanel from '../components/RightPanel.vue'
import ProfileModal from '../components/ProfileModal.vue'
import AuthGateModal from '../components/AuthGateModal.vue'
import SettingsModal from '../components/SettingsModal.vue'
import { useIsMobile } from '../composables/useIsMobile'

const auth = useAuthStore()
const chatStore = useChatStore()
const route = useRoute()
const router = useRouter()

const mobileSidebarOpen = ref(false)
const showProfile = ref(false)
const showSettings = ref(false)

// Phone layout (≤768px): redesigned header, home screen and composer
const isPhone = useIsMobile()
const inChat = computed(() => !!chatStore.activeChat && chatStore.messages.length > 0)

/** Back arrow → return to the home (welcome) screen without losing history. */
function goHome() {
  if (chatStore.sending || chatStore.streaming) chatStore.stopGeneration()
  chatStore.activeChat = null
  chatStore.messages = []
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
  background:var(--bg-base); border-bottom:1px solid var(--border);
}
.topbar-left,.topbar-right { display:flex; align-items:center; gap:6px; }

.mob-menu-btn { width:36px; height:36px; background:none; border:none; border-radius:var(--r-sm); color:var(--text-2); font-size:15px; align-items:center; justify-content:center; transition:all .2s; cursor:pointer; display:none; }
.mob-menu-btn:hover { background:var(--bg-hover); color:var(--text-1); }

.topbar-pill { display:flex; align-items:center; gap:6px; padding:7px 14px; background:var(--bg-card); border:1px solid var(--border-md); border-radius:99px; color:var(--text-2); font-size:13px; font-weight:500; cursor:pointer; transition:all .2s; }
.topbar-pill:hover { background:var(--bg-hover); color:var(--text-1); }
.topbar-pill.active { color:var(--text-1); }
.topbar-pill i { font-size:13px; }

.topbar-icon-btn { width:32px; height:32px; background:none; border:none; border-radius:50%; color:var(--text-2); font-size:14px; display:flex; align-items:center; justify-content:center; transition:all .2s; cursor:pointer; }
.topbar-icon-btn:hover { background:var(--bg-hover); color:var(--text-1); }

.user-avatar-btn { width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,#4f46e5,#a855f7); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:white; cursor:pointer; overflow:hidden; flex-shrink:0; border:2px solid var(--border-md); transition:opacity .2s; }
.user-avatar-btn:hover { opacity:.85; }
.user-avatar-btn img { width:100%; height:100%; object-fit:cover; }

/* ── Guest header ── */
.guest-brand { display:flex; align-items:center; gap:9px; min-width:0; }
.guest-brand .mob-menu-btn { display:none; }
.guest-logo { width:30px; height:30px; border-radius:8px; object-fit:contain; flex-shrink:0; }
.guest-name { font-size:15px; font-weight:700; color:var(--text-1); white-space:nowrap; }

.guest-actions { display:flex; align-items:center; gap:8px; }
.auth-btn { padding:7px 16px; border-radius:99px; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; white-space:nowrap; }
.auth-btn.ghost { background:transparent; border:1px solid var(--border-md); color:var(--text-2); }
.auth-btn.ghost:hover { background:var(--bg-hover); color:var(--text-1); }
.auth-btn.solid { background:var(--accent); border:1px solid transparent; color:#fff; box-shadow:0 2px 10px rgba(109,40,217,.3); }
.auth-btn.solid:hover { filter:brightness(1.12); transform:translateY(-1px); }

/* ── MOBILE ── */
@media(max-width:860px) {
  .mob-menu-btn { display:flex; }
  .guest-brand .mob-menu-btn { display:flex; }
  .topbar-pill span { display:none; }
  .topbar-pill { padding:7px 10px; }
}
@media(max-width:480px) {
  .top-bar { padding:0 6px; height:48px; }
  .topbar-right { gap:2px; }
  .topbar-pill { padding:7px 8px; }
  .guest-actions { gap:6px; }
  .auth-btn { padding:6px 12px; font-size:12.5px; }
}
@media(max-width:340px) {
  .auth-btn { padding:6px 10px; font-size:12px; }
}

@media(max-width:768px){ .main-col { background:var(--bg-base); } }

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
.m-status i { width:6px; height:6px; border-radius:50%; background:var(--green); }
.m-status.busy i { background:var(--purple); animation:pulse 1s infinite; }
</style>
