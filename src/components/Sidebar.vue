<template>
  <aside class="sidebar" :class="{ 'mob-open': mobileOpen, collapsed }" role="dialog" aria-modal="true" aria-label="Chats sidebar">
    <!-- ── Header: brand + actions ── -->
    <div class="sb-header">
      <img src="/logo.png" alt="KinyaBot" class="sb-logo" />
      <span class="sb-brand">KinyaBot</span>
      <div class="sb-actions">
        <button class="icon-btn" @click="toggleSearch" title="Search chats (Ctrl+/)" aria-label="Search chats">
          <AnimatedIcon icon="fas fa-magnifying-glass" animation="subtle-hover" />
        </button>
        <button class="icon-btn sidebar-toggle" @click="handleSidebarControl"
          :title="mobileOpen ? 'Close sidebar' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :aria-label="mobileOpen ? 'Close sidebar' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'">
          <AnimatedIcon :icon="mobileOpen ? 'fas fa-xmark' : 'fas fa-angles-left'" class="sidebar-toggle-icon" animation="expand-collapse" :active="collapsed && !mobileOpen" />
        </button>
      </div>
    </div>

    <!-- Search box (Ctrl+/ toggles) -->
    <transition name="fade">
      <div v-if="searchOpen" class="sb-search">
        <div class="search-row">
          <AnimatedIcon icon="fas fa-magnifying-glass" animation="subtle-hover" />
          <input ref="searchRef" v-model="searchQ" type="text" placeholder="Search chats…"
            @input="doSearch" @keydown.esc="closeSearch" />
          <button v-if="searchQ" @click="clearSearch" aria-label="Clear search"><i class="fas fa-xmark"></i></button>
        </div>
      </div>
    </transition>

    <!-- Search results -->
    <div v-if="searchQ && chatStore.searchResults.length" class="sb-scroll">
      <div class="section-title static">Results</div>
      <button v-for="r in chatStore.searchResults" :key="r.id" class="search-result" @click="goToChat(r.chat_id)">
        <i class="fas fa-message"></i>
        <div class="sr-info">
          <div class="sr-chat">{{ r.chat_title }}</div>
          <div class="sr-text">{{ r.content.slice(0,70) }}…</div>
        </div>
      </button>
    </div>

    <div v-else class="sb-scroll">
      <!-- ── Primary navigation ── -->
      <nav class="nav" aria-label="Primary">
        <button class="nav-item" title="New chat" aria-label="New chat" @click="newChat">
          <span class="nav-ico new"><AnimatedIcon icon="fas fa-plus" animation="press" /></span>
          <span class="nav-label">New chat</span>
        </button>
        <button class="nav-item" title="Create Image" aria-label="Create Image" @click="openCanvas">
          <span class="nav-ico"><AnimatedIcon icon="fas fa-image" animation="subtle-hover" /></span>
          <span class="nav-label">Create Image</span>
        </button>
        <button class="nav-item" title="Canvas" aria-label="Canvas" @click="openCanvas">
          <span class="nav-ico"><AnimatedIcon icon="fas fa-pen-to-square" animation="subtle-hover" /></span>
          <span class="nav-label">Canvas</span>
        </button>
        <button class="nav-item" title="Guided Learning" aria-label="Guided Learning" @click="openGuided">
          <span class="nav-ico"><AnimatedIcon icon="fas fa-graduation-cap" animation="subtle-hover" /></span>
          <span class="nav-label">Guided Learning</span>
        </button>
        <button class="nav-item" title="Customize" aria-label="Customize" @click="showSettings=true">
          <span class="nav-ico"><AnimatedIcon icon="fas fa-sliders" animation="subtle-hover" /></span>
          <span class="nav-label">Customize</span>
        </button>
      </nav>

      <!-- ── Pinned ── -->
      <section class="group">
        <button class="section-title" :aria-expanded="pinnedOpen" @click="pinnedOpen=!pinnedOpen">
          <span>Pinned</span>
          <AnimatedIcon icon="fas fa-chevron-down" class="chev" animation="expand-collapse" :active="!pinnedOpen" />
        </button>
        <div v-show="pinnedOpen" class="group-body">
          <template v-if="chatStore.pinnedChats.length">
            <SidebarChatItem
              v-for="chat in chatStore.pinnedChats" :key="chat.id"
              :chat="chat" :active="chatStore.activeChat?.id===chat.id" variant="model" :pin-just-changed="pinAnimatingIds.has(chat.id)"
              @click="$emit('load-chat',chat.id)"
              @rename="startRename(chat)" @pin="togglePin(chat)" @delete="startDelete(chat)"
            />
          </template>
          <p v-else class="empty">No pinned chats</p>
        </div>
      </section>

      <!-- ── Chats ── -->
      <section class="group">
        <button class="section-title" :aria-expanded="chatsOpen" @click="chatsOpen=!chatsOpen">
          <span>Chats</span>
          <AnimatedIcon icon="fas fa-chevron-down" class="chev" animation="expand-collapse" :active="!chatsOpen" />
        </button>
        <div v-show="chatsOpen" class="group-body">
          <template v-if="chatStore.recentChats.length">
            <SidebarChatItem
              v-for="chat in visibleRecent" :key="chat.id"
              :chat="chat" :active="chatStore.activeChat?.id===chat.id" :pin-just-changed="pinAnimatingIds.has(chat.id)"
              @click="$emit('load-chat',chat.id)"
              @rename="startRename(chat)" @pin="togglePin(chat)" @delete="startDelete(chat)"
            />
            <button v-if="chatStore.recentChats.length > RECENT_LIMIT" class="view-all" @click="showAllChats=!showAllChats">
              {{ showAllChats ? 'Show less' : 'View all' }}
            </button>
          </template>
          <p v-else-if="guest" class="empty">Your conversations will appear here — sign in to keep them</p>
          <p v-else class="empty">No conversations yet</p>
        </div>
      </section>
    </div>

    <!-- ── Footer: plan / usage + account ── -->
    <div class="sb-footer">
      <template v-if="!guest">
        <!-- Plan display (§5): plan name + usage progress + upgrade action -->
        <div class="plan-block" role="group" :aria-label="`${sub.planName} plan usage`">
          <div class="plan-block-top">
            <PlanBadge :plan="sub.plan" size="sm" />
            <span class="plan-usage-count" :class="sub.usageState">
              {{ sub.usage.used }} / {{ sub.usage.limit }}
            </span>
          </div>
          <UsageIndicator
            compact
            :used="sub.usage.used"
            :limit="sub.usage.limit"
            :plan-name="sub.planName"
            :show-note="false"
          />
          <button v-if="!sub.isPro" class="upgrade-btn" @click="goUpgrade" title="View plans">
            <i class="fas fa-bolt"></i>
            <span class="nav-label">Upgrade</span>
          </button>
          <button v-else class="upgrade-btn pro" @click="goPlans" title="Pro plan">
            <i class="fas fa-gem"></i>
            <span class="nav-label">Pro</span>
          </button>
        </div>
      </template>
      <div v-else class="upgrade-row">
        <button class="pill-btn" @click="goAuth('register')"><i class="fas fa-circle-arrow-up"></i> Sign up for free credits</button>
      </div>

      <div class="account" ref="accountRef">
        <!-- Account menu (opens upward) -->
        <transition name="pop">
          <div v-if="menuOpen" class="menu" role="menu">
            <div v-if="!guest" class="menu-head">
              <span class="avatar lg">
                <img v-if="avatarUrl" :src="avatarUrl" alt="" />
                <template v-else>{{ userInitial }}</template>
              </span>
              <div class="menu-id">
                <strong>{{ userName }}</strong>
                <span>{{ userEmail }}</span>
              </div>
            </div>
            <div v-else class="menu-head guest">
              <span class="avatar lg"><i class="fas fa-user"></i></span>
              <div class="menu-id"><strong>Guest</strong><span>Sign in to save your chats</span></div>
            </div>

            <template v-if="guest">
              <button class="menu-item" role="menuitem" @click="goAuth('login')"><i class="fas fa-right-to-bracket"></i><span>Sign in</span></button>
              <button class="menu-item accent" role="menuitem" @click="goAuth('register')"><i class="fas fa-user-plus"></i><span>Sign up</span></button>
              <div class="menu-sep"></div>
            </template>

            <button class="menu-item" role="menuitem" @click="openSettings"><i class="fas fa-gear"></i><span>All settings</span></button>
            <button v-if="!guest" class="menu-item" role="menuitem" @click="goPlans"><i class="fas fa-gem"></i><span>Plans &amp; Usage</span></button>
            <div class="menu-sep"></div>

            <button class="menu-item" role="menuitem" :aria-expanded="appearanceOpen" @click="appearanceOpen=!appearanceOpen">
              <i class="fas fa-moon"></i>
              <span class="two-line"><span>Appearance</span><small>{{ themeLabel }}</small></span>
              <i class="fas fa-chevron-right sub-chev" :class="{ open: appearanceOpen }"></i>
            </button>
            <div v-if="appearanceOpen" class="submenu">
              <button v-for="m in themeModes" :key="m.id" class="menu-item sub" role="menuitemradio"
                :aria-checked="themeMode===m.id" @click="setThemeMode(m.id)">
                <i :class="m.icon"></i><span>{{ m.label }}</span>
                <i v-if="themeMode===m.id" class="fas fa-check tick"></i>
              </button>
            </div>

            <InstallHint v-if="showInstall" variant="footer" />
            <button class="menu-item" role="menuitem" @click="openHelp"><i class="fas fa-circle-question"></i><span>Help &amp; support</span></button>

            <template v-if="!guest">
              <div class="menu-sep"></div>
              <button class="menu-item danger" role="menuitem" @click="handleLogout"><i class="fas fa-right-from-bracket"></i><span>Sign out</span></button>
            </template>
          </div>
        </transition>

        <button class="account-btn" :aria-expanded="menuOpen" aria-haspopup="menu" @click.stop="menuOpen=!menuOpen">
          <span class="avatar">
            <img v-if="avatarUrl && !guest" :src="avatarUrl" alt="" />
            <i v-else-if="guest" class="fas fa-user"></i>
            <template v-else>{{ userInitial }}</template>
          </span>
          <span class="account-id">
            <strong>{{ guest ? 'Guest' : userName }}</strong>
            <small>{{ guest ? 'Not signed in' : planLabel }}</small>
          </span>
          <i class="fas fa-up-down account-chev"></i>
        </button>
      </div>
    </div>

    <!-- Modals via teleport -->
    <teleport to="body">
      <div v-if="renamingChat" class="modal-overlay" @click.self="renamingChat=null">
        <div class="mini-modal">
          <h3><i class="fas fa-pen"></i> Rename Chat</h3>
          <input v-model="renameVal" class="mini-input" @keyup.enter="submitRename" autofocus />
          <div class="mini-actions">
            <button class="btn-cancel" @click="renamingChat=null">Cancel</button>
            <button class="btn-ok" @click="submitRename">Rename</button>
          </div>
        </div>
      </div>
      <div v-if="deletingChat" class="modal-overlay" @click.self="deletingChat=null">
        <div class="mini-modal">
          <h3><i class="fas fa-trash"></i> Delete Chat</h3>
          <p>Delete "<strong>{{ deletingChat.title }}</strong>"? This cannot be undone.</p>
          <div class="mini-actions">
            <button class="btn-cancel" @click="deletingChat=null">Cancel</button>
            <button class="btn-danger" @click="submitDelete">Delete</button>
          </div>
        </div>
      </div>
      <!-- Canvas modal -->
      <div v-if="showCanvas" class="modal-overlay" @click.self="showCanvas=false">
        <div class="feature-modal">
          <div class="fm-header">
            <i class="fas fa-pen-to-square"></i>
            <h3>Canvas</h3>
            <button @click="showCanvas=false"><i class="fas fa-xmark"></i></button>
          </div>
          <div class="fm-body">
            <p>Start a new chat and type <strong>/canvas</strong> to enter canvas drawing mode, or use these quick actions:</p>
            <div class="fm-actions">
              <button class="fm-btn" @click="sendCanvasPrompt('Create a detailed diagram of ')">
                <i class="fas fa-diagram-project"></i> Create Diagram
              </button>
              <button class="fm-btn" @click="sendCanvasPrompt('Draw ASCII art of ')">
                <i class="fas fa-shapes"></i> ASCII Art
              </button>
              <button class="fm-btn" @click="sendCanvasPrompt('Generate an SVG illustration of ')">
                <i class="fas fa-vector-square"></i> SVG Illustration
              </button>
            </div>
          </div>
        </div>
      </div>
      <!-- Guided Learning modal -->
      <div v-if="showGuided" class="modal-overlay" @click.self="showGuided=false">
        <div class="feature-modal">
          <div class="fm-header">
            <i class="fas fa-graduation-cap"></i>
            <h3>Guided Learning</h3>
            <button @click="showGuided=false"><i class="fas fa-xmark"></i></button>
          </div>
          <div class="fm-body">
            <p>Choose a learning path and KinyaBot will guide you step by step:</p>
            <div class="fm-actions">
              <button class="fm-btn" @click="sendLearningPrompt('web development')"><i class="fas fa-code"></i> Web Development</button>
              <button class="fm-btn" @click="sendLearningPrompt('machine learning')"><i class="fas fa-brain"></i> Machine Learning</button>
              <button class="fm-btn" @click="sendLearningPrompt('data science')"><i class="fas fa-chart-line"></i> Data Science</button>
              <button class="fm-btn" @click="sendLearningPrompt('Python programming')"><i class="fab fa-python"></i> Python</button>
              <button class="fm-btn" @click="sendLearningPrompt('Kinyarwanda language')"><i class="fas fa-language"></i> Kinyarwanda</button>
              <button class="fm-btn" @click="sendLearningPrompt('entrepreneurship')"><i class="fas fa-lightbulb"></i> Entrepreneurship</button>
            </div>
          </div>
        </div>
      </div>
      <SettingsModal v-if="showSettings" @close="showSettings=false" />
      <HelpModal v-if="showHelp" @close="showHelp=false" />
    </teleport>
  </aside>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { useSubscriptionStore } from '../stores/subscription'
import api from '../api'
import { disconnectSocket } from '../socket'
import { usePwaInstall } from '../composables/usePwaInstall'
import AnimatedIcon from './AnimatedIcon.vue'
import SidebarChatItem from './SidebarChatItem.vue'
import SettingsModal from './SettingsModal.vue'
import HelpModal from './HelpModal.vue'
import InstallHint from './InstallHint.vue'
import PlanBadge from './plans/PlanBadge.vue'
import UsageIndicator from './plans/UsageIndicator.vue'
import { setThemeMode, themeMode } from '../theme'

const props = defineProps({ mobileOpen: Boolean, collapsed: Boolean, guest: Boolean })
const emit = defineEmits(['close-mobile','toggle-collapse','new-chat','load-chat','authrequired'])

const router = useRouter()
const auth = useAuthStore()
const chatStore = useChatStore()
const sub = useSubscriptionStore()

/* Guests get the SAME sidebar — account-gated actions open the auth gate. */
function requireAuth() {
  emit('close-mobile')
  emit('authrequired')
}

/* Plan + daily usage — backend truth via the subscription store (§19).
   Refreshed after each send and live via Socket.IO usage_updated. */
const usageRing = computed(() => sub.usage.percent || 0)
async function fetchUsage() { sub.refreshUsage() }
watch(() => chatStore.sending, (busy, was) => { if (was && !busy) fetchUsage() })
watch(() => auth.isLoggedIn, (loggedIn, was) => {
  if (loggedIn && !was) {
    sub.reset()
    sub.fetch()
    sub.setupSocketListeners()
  }
})

function goAuth(mode) {
  emit('close-mobile')
  router.push(`/${mode}?redirect=/`)
}

function goPlans() {
  menuOpen.value = false
  emit('close-mobile')
  router.push('/plans')
}
function goUpgrade() {
  menuOpen.value = false
  emit('close-mobile')
  router.push('/plans')
}

const searchOpen = ref(false)
const searchRef = ref(null)
const searchQ = ref('')
const renamingChat = ref(null)
const renameVal = ref('')
const deletingChat = ref(null)
const showSettings = ref(false)
const showHelp = ref(false)
const showCanvas = ref(false)
const showGuided = ref(false)

// PWA install entry (hidden when already installed)
const { canInstall, installed, isIOS } = usePwaInstall()
const showInstall = computed(() => (canInstall.value || isIOS) && !installed.value)


/* ── Sidebar sections ── */
const RECENT_LIMIT = 10
const pinnedOpen = ref(true)
const chatsOpen = ref(true)
const showAllChats = ref(false)
const pinAnimatingIds = ref(new Set())
const pinAnimationTimers = new Map()
const visibleRecent = computed(() =>
  showAllChats.value ? chatStore.recentChats : chatStore.recentChats.slice(0, RECENT_LIMIT))

async function togglePin(chat) {
  const nextPinned = chat.is_pinned ? 0 : 1
  try {
    await chatStore.pinChat(chat.id, nextPinned)
    await nextTick()
    pinAnimatingIds.value = new Set(pinAnimatingIds.value).add(chat.id)
    clearTimeout(pinAnimationTimers.get(chat.id))
    pinAnimationTimers.set(chat.id, setTimeout(() => {
      const next = new Set(pinAnimatingIds.value)
      next.delete(chat.id)
      pinAnimatingIds.value = next
      pinAnimationTimers.delete(chat.id)
    }, 520))
  } catch (error) {
    console.error('[Sidebar] Could not update pinned chat:', error)
  }
}

function newChat() { emit('close-mobile'); emit('new-chat') }
function handleSidebarControl() {
  if (props.mobileOpen) emit('close-mobile')
  else emit('toggle-collapse')
}

/* ── Account menu ── */
const menuOpen = ref(false)
const appearanceOpen = ref(false)
const accountRef = ref(null)
const themeModes = [
  { id: 'dark',   icon: 'fas fa-moon',    label: 'Dark' },
  { id: 'light',  icon: 'fas fa-sun',     label: 'Light' },
  { id: 'system', icon: 'fas fa-desktop', label: 'System' },
]
const themeLabel = computed(() => themeModes.find(m => m.id === themeMode.value)?.label || 'System')
const userName = computed(() => auth.user?.username || 'Account')
const userEmail = computed(() => auth.user?.email || '')
const avatarUrl = computed(() => auth.user?.avatar_url || '')
const userInitial = computed(() => (userName.value[0] || 'K').toUpperCase())
const planLabel = computed(() => `${sub.planName} plan`)
function openSettings() { menuOpen.value = false; showSettings.value = true }
function openHelp() { menuOpen.value = false; showHelp.value = true }
function onDocClick(e) {
  if (menuOpen.value && accountRef.value && !accountRef.value.contains(e.target)) menuOpen.value = false
}

// Toggle search (guests are asked to sign in — history is account data)
function toggleSearch() {
  if (props.guest) { requireAuth(); return }
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) nextTick(() => searchRef.value?.focus())
  else clearSearch()
}
function closeSearch() { searchOpen.value = false; clearSearch() }

let searchTimer = null
function doSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => chatStore.searchMessages(searchQ.value), 300)
}
function clearSearch() { searchQ.value = ''; chatStore.clearSearch() }
function goToChat(id) { emit('load-chat', id); closeSearch() }

function startRename(chat) { renamingChat.value = chat; renameVal.value = chat.title }
async function submitRename() {
  if (!renameVal.value.trim()) return
  await chatStore.renameChat(renamingChat.value.id, renameVal.value.trim())
  renamingChat.value = null
}
function startDelete(chat) { deletingChat.value = chat }
async function submitDelete() { await chatStore.deleteChat(deletingChat.value.id); deletingChat.value = null }

function openCanvas() {
  if (props.guest) { requireAuth(); return }
  emit('close-mobile'); showCanvas.value = true
}
function openGuided() {
  if (props.guest) { requireAuth(); return }
  emit('close-mobile'); showGuided.value = true
}

async function sendCanvasPrompt(prompt) {
  showCanvas.value = false
  if (!chatStore.activeChat) await chatStore.createChat()
  await chatStore.sendMessage(prompt)
}
async function sendLearningPrompt(topic) {
  showGuided.value = false
  if (!chatStore.activeChat) await chatStore.createChat()
  await chatStore.sendMessage(`I want to learn ${topic}. Please create a structured beginner learning plan with topics, resources, and exercises. Guide me step by step.`)
}

async function handleLogout() {
  // Discard any pending empty chat
  if (chatStore.pendingChatId) {
    try { await import('../api').then(m => m.default.delete(`/chats/${chatStore.pendingChatId}`)) } catch {}
  }
  disconnectSocket()
  chatStore.resetChatState()
  sub.reset()
  auth.logout()
  // Chat-first: after logout the user lands back on the chat
  // interface in guest mode (Sign In / Sign Up become visible).
  router.push('/')
}

// Global keyboard shortcuts
function handleKeydown(e) {
  const ctrl = e.ctrlKey || e.metaKey
  if (ctrl && e.key === '/') { e.preventDefault(); toggleSearch() }
  if (ctrl && e.key === 'b') { e.preventDefault(); emit('close-mobile') }
  if (e.key === 'Escape') {
    if (menuOpen.value) menuOpen.value = false
    else if (searchOpen.value) closeSearch()
    else emit('close-mobile') // close the mobile drawer
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', onDocClick)
  fetchUsage()
  if (!props.guest) {
    // Load plan state + live usage events (plan updates arrive realtime)
    sub.fetch()
    sub.setupSocketListeners()
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', onDocClick)
  pinAnimationTimers.forEach(clearTimeout)
})
</script>

<style scoped>
/* ═══ Sidebar — structure: header · nav · collapsible lists · account ═══ */
.sidebar {
  width: var(--sidebar-w); min-width: var(--sidebar-w);
  height: 100vh; height: 100dvh;
  background: var(--surface-sidebar);
  border-right: 1px solid var(--border-subtle);
  display: flex; flex-direction: column; overflow: hidden;
  flex-shrink: 0; transition: width var(--t-base) var(--ease), min-width var(--t-base) var(--ease), transform var(--t-base) var(--ease);
  color: var(--text-2);
}
@media (max-width: 900px) {
  .sidebar {
    position: fixed; left: 0; top: 0; bottom: 0;
    width: min(300px, 85vw); min-width: 0; z-index: 100;
    transform: translateX(-105%);
    transition: transform .28s cubic-bezier(.32,.72,.35,1);
    will-change: transform;
    box-shadow: var(--shadow-md);
    padding-bottom: env(safe-area-inset-bottom);
  }
  .sidebar.mob-open { transform: translateX(0); }
}
@media (min-width: 901px) { .mob-only { display: none; } }
@media (prefers-reduced-motion: reduce) { .sidebar { transition: none; } }

/* Header */
.sb-header { display:flex; align-items:center; gap:10px; padding:14px 14px 8px; flex-shrink:0; }
.sb-logo { width:28px; height:28px; border-radius:8px; object-fit:contain; flex-shrink:0; }
.sb-brand { font-size:15px; font-weight:600; color:var(--text-1); letter-spacing:-.01em; flex:1; min-width:0; }
.sb-actions { display:flex; align-items:center; gap:2px; }
.icon-btn { width:32px; height:32px; border-radius:var(--r-sm); background:none; border:none; color:var(--icon); font-size:14px; display:grid; place-items:center; cursor:pointer; transition:background var(--t-fast), color var(--t-fast); }
.icon-btn:hover { background:var(--bg-hover); color:var(--icon-hover); }
.icon-btn:focus-visible { outline:2px solid var(--brand-text); outline-offset:2px; }

@media (min-width: 901px) {
  .sidebar.collapsed { width:68px; min-width:68px; overflow:visible; }
  .sidebar.collapsed .sb-header { flex-direction:column; gap:8px; padding:12px 6px 8px; }
  .sidebar.collapsed .sb-brand { display:none; }
  .sidebar.collapsed .sb-actions { flex-direction:column; gap:4px; }
  .sidebar.collapsed .sb-search,
  .sidebar.collapsed .group,
  .sidebar.collapsed .nav-label,
  .sidebar.collapsed .plan-block,
  .sidebar.collapsed .upgrade-row,
  .sidebar.collapsed .account-id,
  .sidebar.collapsed .account-chev { display:none; }
  .sidebar.collapsed .sb-scroll { overflow:visible; padding:4px 6px 12px; }
  .sidebar.collapsed .nav { align-items:center; }
  .sidebar.collapsed .nav-item { justify-content:center; width:48px; padding:0; }
  .sidebar.collapsed .nav-ico { margin:0; }
  .sidebar.collapsed .nav-ico.new { margin:0; }
  .sidebar.collapsed .sb-footer { padding:8px 6px; }
  .sidebar.collapsed .account-btn { justify-content:center; padding:7px 0; }
  .sidebar.collapsed .menu { left:calc(100% + 8px); right:auto; bottom:0; width:240px; transform-origin:bottom left; }
}

/* Search */
.sb-search { padding:4px 12px 6px; flex-shrink:0; }
.search-row { display:flex; align-items:center; gap:8px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--r); padding:8px 12px; transition:border-color var(--t-fast), box-shadow var(--t-fast); }
.search-row:focus-within { border-color:var(--brand); box-shadow:var(--focus-glow); }
.search-row i { color:var(--text-3); font-size:13px; flex-shrink:0; }
.search-row input { flex:1; min-width:0; background:none; border:none; color:var(--text-1); font-size:13.5px; outline:none; }
.search-row input::placeholder { color:var(--text-3); }
.search-row button { background:none; border:none; color:var(--text-3); cursor:pointer; font-size:13px; padding:2px; }

/* Scroll area */
.sb-scroll { flex:1; overflow-y:auto; padding:4px 10px 12px; display:flex; flex-direction:column; -webkit-overflow-scrolling:touch; }

/* Primary nav */
.nav { display:flex; flex-direction:column; gap:2px; padding-bottom:10px; }
.nav-item { display:flex; align-items:center; gap:12px; width:100%; height:40px; padding:0 8px; border-radius:var(--r); background:none; border:none; color:var(--text-1); font-size:14.5px; font-weight:500; text-align:left; cursor:pointer; transition:background var(--t-fast); }
.nav-item:hover { background:var(--bg-hover); }
.nav-ico { width:24px; height:24px; display:grid; place-items:center; color:var(--icon); font-size:15px; flex-shrink:0; transition:color var(--t-fast); }
.nav-item:hover .nav-ico { color:var(--icon-hover); }
.nav-ico.new { width:28px; height:28px; margin:-2px; border-radius:50%; background:var(--bg-hover); color:var(--text-1); font-size:13px; }
.nav-label { flex:1; min-width:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* Collapsible groups */
.group { margin-top:6px; }
.section-title { display:flex; align-items:center; justify-content:space-between; width:100%; padding:8px 8px 6px; background:none; border:none; color:var(--text-3); font-size:14px; font-weight:500; text-align:left; cursor:pointer; border-radius:var(--r-sm); transition:color var(--t-fast); }
.section-title:hover { color:var(--text-2); }
.section-title.static { cursor:default; }
.chev { font-size:11px; transition:transform var(--t-base) var(--ease); }
.chev.closed { transform:rotate(-90deg); }
.group-body { display:flex; flex-direction:column; gap:2px; }
.empty { padding:4px 8px 8px; color:var(--text-disabled); font-size:13.5px; line-height:1.45; }
.view-all { align-self:flex-start; margin:2px 0 0 8px; padding:6px 0; background:none; border:none; color:var(--text-3); font-size:13.5px; cursor:pointer; }
.view-all:hover { color:var(--text-1); }

/* Search results */
.search-result { display:flex; align-items:flex-start; gap:10px; width:100%; padding:8px 10px; border-radius:var(--r-sm); background:none; border:none; text-align:left; cursor:pointer; transition:background var(--t-fast); }
.search-result:hover { background:var(--bg-hover); }
.search-result i { color:var(--text-3); font-size:12px; margin-top:3px; flex-shrink:0; }
.sr-info { min-width:0; }
.sr-chat { font-size:13px; font-weight:600; color:var(--text-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sr-text { font-size:12px; color:var(--text-3); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* Footer */
.sb-footer { flex-shrink:0; border-top:1px solid var(--border-subtle); padding:10px; display:flex; flex-direction:column; gap:8px; }
/* ── Plan block (§5): badge + usage + upgrade — quiet, not a billing page ── */
.plan-block {
  display:flex; flex-direction:column; gap:8px;
  margin:2px 4px 0; padding:10px 11px;
  background:var(--surface-secondary); border:1px solid var(--border);
  border-radius:14px;
}
.plan-block-top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.plan-usage-count { font-size:11.5px; color:var(--text-2); font-variant-numeric:tabular-nums; font-weight:600; }
.plan-usage-count.warning { color:var(--warning); }
.plan-usage-count.limit { color:var(--error); }
.upgrade-btn {
  display:inline-flex; align-items:center; justify-content:center; gap:7px;
  width:100%; padding:7px 10px; border-radius:10px;
  background:var(--brand-soft); border:1px solid transparent;
  color:var(--brand-text); font-size:12px; font-weight:700;
  cursor:pointer; transition:background var(--t-fast), filter var(--t-fast);
}
.upgrade-btn:hover { background:var(--brand-soft); filter:brightness(1.15); }
.upgrade-btn i { font-size:10px; }
.upgrade-btn.pro { background:rgba(139,92,246,.12); color:#c4b5fd; }
.light-mode .upgrade-btn.pro { color:#6d28d9; }

.usage { padding:2px 4px 0; }
.usage-text { display:flex; justify-content:space-between; gap:8px; font-size:12px; color:var(--text-3); }
.usage-pct { color:var(--text-2); font-variant-numeric:tabular-nums; }
.usage-bar { height:4px; border-radius:99px; background:var(--border); margin-top:6px; overflow:hidden; }
.usage-bar i { display:block; height:100%; border-radius:inherit; background:var(--gradient-brand); transition:width var(--t-slow) var(--ease); }
.upgrade-row { display:flex; justify-content:center; }
.pill-btn { display:inline-flex; align-items:center; gap:8px; padding:7px 14px; border-radius:99px; background:none; border:1px solid var(--border); color:var(--text-1); font-size:13px; font-weight:500; cursor:pointer; transition:background var(--t-fast), border-color var(--t-fast); }
.pill-btn:hover { background:var(--bg-hover); border-color:var(--border-strong); }

/* Account row */
.account { position:relative; }
.account-btn { display:flex; align-items:center; gap:10px; width:100%; padding:8px; border-radius:var(--r); background:none; border:none; text-align:left; cursor:pointer; transition:background var(--t-fast); }
.account-btn:hover, .account-btn[aria-expanded="true"] { background:var(--bg-hover); }
.avatar { width:34px; height:34px; border-radius:50%; background:var(--gradient-brand); color:#fff; display:grid; place-items:center; font-size:14px; font-weight:600; overflow:hidden; flex-shrink:0; }
.avatar img { width:100%; height:100%; object-fit:cover; }
.avatar.lg { width:40px; height:40px; font-size:16px; }
.account-id { display:flex; flex-direction:column; min-width:0; flex:1; line-height:1.25; }
.account-id strong { font-size:14px; font-weight:600; color:var(--text-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.account-id small { font-size:12px; color:var(--text-3); }
.account-chev { color:var(--text-3); font-size:12px; }

/* Account menu */
.menu { position:absolute; left:0; right:0; bottom:calc(100% + 8px); background:var(--surface-elevated); border:1px solid var(--border); border-radius:var(--r-lg); box-shadow:var(--shadow-md); padding:6px; max-height:min(70vh, 560px); overflow-y:auto; z-index:20; transform-origin:bottom center; }
.menu-head { display:flex; align-items:center; gap:12px; padding:10px 10px 12px; }
.menu-id { display:flex; flex-direction:column; min-width:0; line-height:1.3; }
.menu-id strong { font-size:14.5px; font-weight:600; color:var(--text-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.menu-id span { font-size:12.5px; color:var(--text-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.menu-sep { height:1px; background:var(--border-subtle); margin:4px 6px; }
.menu-item, .menu :deep(.footer-item) { display:flex; align-items:center; gap:12px; width:100%; padding:9px 10px; border-radius:var(--r-sm); background:none; border:none; color:var(--text-1); font-size:14px; text-align:left; cursor:pointer; transition:background var(--t-fast); }
.menu-item:hover, .menu :deep(.footer-item:hover) { background:var(--bg-hover); }
.menu-item > i:first-child, .menu :deep(.footer-item i) { width:18px; text-align:center; font-size:14px; color:var(--icon); flex-shrink:0; }
.menu-item.accent { color:var(--brand-text); }
.menu-item.danger { color:var(--text-1); }
.menu-item.danger:hover { color:var(--error); }
.menu-item.danger:hover > i:first-child { color:var(--error); }
.two-line { display:flex; flex-direction:column; flex:1; min-width:0; line-height:1.25; }
.two-line small { font-size:12px; color:var(--text-3); }
.menu-item > span:not(.two-line) { flex:1; min-width:0; }
.sub-chev { font-size:11px; color:var(--text-3); transition:transform var(--t-fast); }
.sub-chev.open { transform:rotate(90deg); }
.submenu { margin:2px 0 4px 18px; padding-left:8px; border-left:1px solid var(--border-subtle); }
.menu-item.sub { padding:7px 10px; font-size:13.5px; }
.tick { color:var(--brand-text); font-size:12px; }

.pop-enter-active, .pop-leave-active { transition:opacity var(--t-fast) var(--ease), transform var(--t-fast) var(--ease); }
.pop-enter-from, .pop-leave-to { opacity:0; transform:translateY(6px) scale(.98); }

/* ── Modals ── */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; z-index:999; backdrop-filter:blur(4px); }
.mini-modal { width:340px; background:var(--bg-card); border:1px solid var(--border-md); border-radius:var(--r-lg); padding:1.5rem; animation:fadeUp .2s ease; }
.mini-modal h3 { font-size:14.5px; font-weight:600; margin-bottom:.9rem; display:flex; align-items:center; gap:8px; }
.mini-modal p { font-size:13px; color:var(--text-2); margin-bottom:1.1rem; }
.mini-input { width:100%; padding:9px 12px; background:var(--bg-input); border:1px solid var(--border-md); border-radius:var(--r-sm); color:var(--text-1); font-size:13.5px; margin-bottom:1.1rem; outline:none; }
.mini-input:focus { border-color:var(--brand-text); box-shadow:0 0 0 3px rgba(99,102,241,.15); }
.mini-actions { display:flex; gap:8px; justify-content:flex-end; }
.btn-cancel,.btn-ok,.btn-danger { padding:7px 16px; border:none; border-radius:var(--r-sm); font-size:13px; font-weight:500; cursor:pointer; transition:all .2s; }
.btn-cancel { background:var(--bg-hover); color:var(--text-2); }
.btn-cancel:hover { color:var(--text-1); }
.btn-ok { background:var(--brand-text); color:#fff; }
.btn-ok:hover { background:var(--brand-hover); }
.btn-danger { background:#991b1b; color:#fff; }
.btn-danger:hover { opacity:.85; }

.feature-modal { width:min(460px,94vw); background:var(--bg-card); border:1px solid var(--border-md); border-radius:var(--r-xl); overflow:hidden; animation:fadeUp .2s ease; }
.fm-header { display:flex; align-items:center; gap:10px; padding:16px 18px; border-bottom:1px solid var(--border); }
.fm-header i { font-size:18px; color:var(--brand-text); }
.fm-header h3 { font-size:15px; font-weight:700; flex:1; }
.fm-header button { background:none; border:none; color:var(--text-2); font-size:15px; cursor:pointer; padding:4px; border-radius:6px; }
.fm-header button:hover { background:var(--bg-hover); }
.fm-body { padding:18px; }
.fm-body p { font-size:13.5px; color:var(--text-2); margin-bottom:16px; line-height:1.6; }
.fm-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.fm-btn { display:flex; align-items:center; gap:8px; padding:10px 14px; background:var(--bg-panel); border:1px solid var(--border-md); border-radius:var(--r-sm); color:var(--text-1); font-size:13px; cursor:pointer; transition:all .2s; }
.fm-btn:hover { background:rgba(99,102,241,.12); border-color:rgba(99,102,241,.35); color:var(--brand-text); }
.fm-btn i { font-size:13px; }
</style>
