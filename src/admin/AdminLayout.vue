<template>
  <div class="sa" :class="{ 'light-theme': theme === 'light' }">
    <!-- ═══ MOBILE TOP BAR ═══ -->
    <header class="sa-mbar">
      <div class="sa-mbrand">
        <img :src="logo" alt="" class="sa-mlogo" />
        <span>KinyaBot <em>Superadmin</em></span>
      </div>
      <div class="sa-mright">
        <button class="sa-micon" @click="toggleTheme" :aria-label="theme === 'light' ? 'Dark mode' : 'Light mode'">
          <i :class="theme === 'light' ? 'fas fa-moon' : 'fas fa-sun'"></i>
        </button>
        <button class="sa-micon" @click="go('/admin/notifications')" aria-label="Alerts">
          <i class="fas fa-bell"></i>
          <span v-if="unread" class="sa-badge">{{ unread > 99 ? '99+' : unread }}</span>
        </button>
        <button class="sa-mavatar" @click="go('/admin/settings')" aria-label="Account">{{ me?.username?.[0]?.toUpperCase() }}</button>
      </div>
    </header>

    <transition name="sa-fade">
      <div v-if="drawerOpen" class="sa-backdrop" @click="drawerOpen = false"></div>
    </transition>

    <!-- ═══ MOBILE BOTTOM NAV (Home · Users · Activity · Alerts · More) ═══ -->
    <nav class="sa-bottom">
      <button v-for="item in mobileNav" :key="item.path" class="sa-bitem" :class="{ active: isActive(item.path) }" @click="go(item.path)">
        <span class="sa-bcircle"><i :class="item.icon"></i></span>
        <span class="sa-blabel">{{ item.label }}</span>
        <span v-if="item.badge" class="sa-bbadge">{{ item.badge }}</span>
      </button>
      <button class="sa-bitem" :class="{ active: isMoreActive }" @click="drawerOpen = true">
        <span class="sa-bcircle"><i class="fas fa-ellipsis"></i></span>
        <span class="sa-blabel">More</span>
      </button>
    </nav>

    <!-- ═══ SIDEBAR ═══ -->
    <aside class="sa-side" :class="{ collapsed: collapsed, open: drawerOpen }">
      <div class="sa-brand">
        <div class="sa-logo"><img :src="logo" alt="" /></div>
        <div class="sa-brand-txt" v-if="!collapsed">
          <span class="sa-name">KinyaBot</span>
          <span class="sa-role">Superadmin</span>
        </div>
        <button class="sa-collapse" @click="collapsed = !collapsed" :aria-label="collapsed ? 'Expand' : 'Collapse'">
          <i :class="drawerOpen ? 'fas fa-xmark' : (collapsed ? 'fas fa-bars' : 'fas fa-bars-staggered')"></i>
        </button>
      </div>

      <nav class="sa-nav">
        <template v-for="group in nav" :key="group.label">
          <div class="sa-grouplabel" v-if="!collapsed">{{ group.label }}</div>
          <div class="sa-groupline" v-else></div>
          <button v-for="item in group.items" :key="item.path" class="sa-item"
            :class="{ active: isActive(item.path) }" @click="go(item.path)" :title="collapsed ? item.label : ''">
            <span class="sa-item-icon"><i :class="item.icon"></i></span>
            <span class="sa-item-label" v-if="!collapsed">{{ item.label }}</span>
            <span v-if="item.badge && !collapsed" class="sa-item-badge">{{ item.badge }}</span>
          </button>
        </template>
      </nav>

      <div class="sa-foot" v-if="!collapsed">
        <div class="sa-conn" v-if="conn.status !== 'live'">
          <i class="fas fa-plug-circle-exclamation"></i> {{ connLabel }}
        </div>
        <div class="sa-conn live" v-else><i class="fas fa-plug-circle-check"></i> Live · realtime connected</div>
        <button class="sa-logout" @click="confirmLogout = true">
          <i class="fas fa-right-from-bracket"></i> Sign out
        </button>
      </div>
      <div class="sa-foot-mini" v-else>
        <button class="sa-logout mini" @click="confirmLogout = true" title="Sign out"><i class="fas fa-right-from-bracket"></i></button>
      </div>
    </aside>

    <!-- ═══ MAIN ═══ -->
    <div class="sa-main">
      <header class="sa-topbar">
        <div class="sa-tb-left">
          <h1>{{ pageTitle }}</h1>
          <p v-if="pageSubtitle" class="sa-tb-sub">{{ pageSubtitle }}</p>
        </div>
        <div class="sa-tb-right">
          <StatusDot :status="connDotStatus" :text="connLabel" />
          <button class="sa-iconbtn" @click="toggleTheme" :title="theme === 'light' ? 'Dark mode' : 'Light mode'">
            <i :class="theme === 'light' ? 'fas fa-moon' : 'fas fa-sun'"></i>
          </button>
          <button class="sa-iconbtn bell" @click="go('/admin/notifications')" title="Alerts">
            <i class="fas fa-bell"></i>
            <span v-if="unread" class="sa-badge">{{ unread > 99 ? '99+' : unread }}</span>
          </button>
          <div class="sa-profile" @click="go('/admin/settings')">
            <div class="sa-pavatar">{{ me?.username?.[0]?.toUpperCase() }}</div>
            <div class="sa-pinfo" v-if="!isMobile">
              <span>{{ me?.username }}</span>
              <small>Superadmin</small>
            </div>
          </div>
        </div>
      </header>

      <main class="sa-body">
        <router-view :key="$route.fullPath" />
      </main>
    </div>

    <ConfirmModal
      :open="confirmLogout" title="Sign out?" tone="primary"
      message="You will need to sign in again to access the Superadmin console."
      confirm-label="Sign out" @confirm="doLogout" @cancel="confirmLogout = false" />
    <ToastHost />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import StatusDot from './components/StatusDot.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import ToastHost from './components/ToastHost.vue'
import { getAdmin, clearSession } from './api'
import { conn, onAdminEvent, connectAdminSocket } from './socket'
import api from './api'
import { useToast } from './composables/useToast'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const me = ref(getAdmin())
const collapsed = ref(localStorage.getItem('kb_admin_sidebar') === '1')
const drawerOpen = ref(false)
const confirmLogout = ref(false)
const isMobile = ref(window.innerWidth <= 768)
const theme = ref(localStorage.getItem('kb_admin_theme') || 'dark')
const logo = '/logo.png'

const nav = computed(() => [
  { label: 'OVERVIEW', items: [
    { path: '/admin/dashboard', icon: 'fas fa-chart-pie', label: 'Dashboard' },
    { path: '/admin/analytics', icon: 'fas fa-chart-line', label: 'Analytics' },
  ]},
  { label: 'PLATFORM', items: [
    { path: '/admin/users', icon: 'fas fa-users', label: 'Users' },
    { path: '/admin/plan-requests', icon: 'fas fa-layer-group', label: 'Plan Requests', badge: pendingPlanRequests.value || null },
    { path: '/admin/chats', icon: 'fas fa-comments', label: 'Chats' },
    { path: '/admin/knowledge', icon: 'fas fa-book', label: 'Knowledge Base' },
    { path: '/admin/files', icon: 'fas fa-folder-open', label: 'Files' },
    { path: '/admin/moderation', icon: 'fas fa-flag', label: 'Moderation', badge: pendingFlags.value || null },
    { path: '/admin/notifications', icon: 'fas fa-bell', label: 'Alerts', badge: unread.value || null },
  ]},
  { label: 'AI & SYSTEM', items: [
    { path: '/admin/ai', icon: 'fas fa-robot', label: 'AI Control' },
    { path: '/admin/ai-testing', icon: 'fas fa-flask', label: 'AI Testing' },
    { path: '/admin/health', icon: 'fas fa-heart-pulse', label: 'System Health' },
    { path: '/admin/usage', icon: 'fas fa-gauge-high', label: 'Usage' },
  ]},
  { label: 'SECURITY', items: [
    { path: '/admin/security', icon: 'fas fa-shield-halved', label: 'Security' },
    { path: '/admin/audit', icon: 'fas fa-clipboard-list', label: 'Audit Activity' },
  ]},
  { label: 'ADMIN', items: [
    { path: '/admin/settings', icon: 'fas fa-gear', label: 'Settings' },
  ]},
])

const mobileNav = computed(() => [
  { path: '/admin/dashboard', icon: 'fas fa-house', label: 'Home' },
  { path: '/admin/users', icon: 'fas fa-users', label: 'Users' },
  { path: '/admin/health', icon: 'fas fa-heart-pulse', label: 'Health' },
  { path: '/admin/notifications', icon: 'fas fa-bell', label: 'Alerts', badge: unread.value || null },
])

const PAGE_META = {
  '/admin/dashboard': ['Dashboard', 'What is happening in KinyaBot right now?'],
  '/admin/analytics': ['Analytics', 'How is KinyaBot performing over time?'],
  '/admin/users': ['Users', 'Manage the people using KinyaBot'],
  '/admin/plan-requests': ['Plan Requests', 'Review Free / Plus / Pro upgrade requests'],
  '/admin/chats': ['Chats', 'Conversations across the platform'],
  '/admin/knowledge': ['Knowledge Base', 'Sources the AI can draw from (RAG)'],
  '/admin/files': ['Files', 'Uploads stored on the platform'],
  '/admin/moderation': ['Moderation', 'Flagged content and reports'],
  '/admin/notifications': ['Alerts', 'Real system events that need attention'],
  '/admin/ai': ['AI Control', 'Provider, models and runtime configuration'],
  '/admin/ai-testing': ['AI Testing', 'Diagnose the configured AI system'],
  '/admin/health': ['System Health', 'Is KinyaBot operational?'],
  '/admin/usage': ['Usage', 'Real consumption across the platform'],
  '/admin/security': ['Security', 'Authentication and threat telemetry'],
  '/admin/audit': ['Audit Activity', 'Every administrative action, immutable'],
  '/admin/settings': ['Settings', 'Global KinyaBot configuration'],
}

const pageTitle = computed(() => PAGE_META[route.path]?.[0] || 'KinyaBot Superadmin')
const pageSubtitle = computed(() => PAGE_META[route.path]?.[1] || '')

/* Unread alerts + pending flags + pending plan requests — kept fresh via realtime + poll. */
const unread = ref(0)
const pendingFlags = ref(0)
const pendingPlanRequests = ref(0)

async function loadBadges() {
  try {
    const { data } = await api.get('/admin/notifications', { params: { filter: 'unread', limit: 5 } })
    unread.value = data.unread || 0
  } catch {}
  try {
    const { data } = await api.get('/admin/moderation', { params: { status: 'pending', limit: 5 } })
    pendingFlags.value = data.counts?.pending || 0
  } catch {}
  try {
    const { data } = await api.get('/admin/plan-requests', { params: { status: 'pending', limit: 5 } })
    pendingPlanRequests.value = data.counts?.pending || 0
  } catch {}
}

const connLabel = computed(() => ({
  live: 'Live', connecting: 'Connecting…', reconnecting: 'Reconnecting…', offline: 'Offline',
}[conn.status] || conn.status))
const connDotStatus = computed(() => conn.status === 'live' ? 'live' : (conn.status === 'offline' ? 'down' : 'degraded'))

function isActive(path) { return route.path === path }
function isMoreActive() {
  return !mobileNav.value.some(i => route.path === i.path)
}
function go(path) {
  drawerOpen.value = false
  if (route.path !== path) router.push(path)
}

function toggleTheme() {
  theme.value = theme.value === 'light' ? 'dark' : 'light'
  localStorage.setItem('kb_admin_theme', theme.value)
  applyTheme()
}
function applyTheme() {
  document.documentElement.classList.toggle('light-mode', theme.value === 'light')
}
function doLogout() {
  clearSession()
  router.push('/admin')
}

let badgeTimer, resizeHandler, offNotif, offActivity, swMsgHandler
onMounted(() => {
  applyTheme()
  if (collapsed.value) collapsed.value = window.innerWidth <= 768
  loadBadges()
  badgeTimer = setInterval(loadBadges, 30000)
  resizeHandler = () => {
    isMobile.value = window.innerWidth <= 768
    if (window.innerWidth > 768) drawerOpen.value = false
  }
  window.addEventListener('resize', resizeHandler)
  connectAdminSocket()
  offNotif = onAdminEvent('admin_notification_new', () => { unread.value++; loadBadges() })
  offActivity = onAdminEvent('admin_activity', (e) => {
    if (e?.action === 'content_flagged' || e?.action === 'PLAN_UPGRADE_REQUESTED' || e?.action === 'plan_changed') loadBadges()
  })
  // Deep links from push notifications (service worker → focused console)
  if ('serviceWorker' in navigator) {
    swMsgHandler = (event) => {
      if (event.data?.type === 'kb_deep_link' && event.data.url) {
        router.push(event.data.url)
      }
    }
    navigator.serviceWorker.addEventListener('message', swMsgHandler)
  }
})
onBeforeUnmount(() => {
  clearInterval(badgeTimer)
  window.removeEventListener('resize', resizeHandler)
  if ('serviceWorker' in navigator && swMsgHandler) navigator.serviceWorker.removeEventListener('message', swMsgHandler)
  offNotif?.(); offActivity?.()
})
</script>

<style>
/* Layout-level tokens: reuse the KinyaBot app design system (global.css). */
.sa { --sa-bg: var(--background); }
</style>

<style scoped>
.sa { min-height:100vh; height:100vh; background:var(--background); color:var(--text-1); display:flex; overflow:hidden; }

/* ── Sidebar ─────────────────────────────── */
.sa-side { width:236px; flex:none; background:var(--surface-sidebar); border-right:1px solid var(--border); display:flex; flex-direction:column; position:sticky; top:0; height:100vh; overflow-y:auto; transition:width .2s ease; z-index:60; }
@media (max-width:768px) { .sa-side { position:fixed; height:100vh; } }
.sa-side.collapsed { width:72px; }
.sa-brand { display:flex; align-items:center; gap:10px; padding:16px 14px; border-bottom:1px solid var(--border); position:relative; }
.sa-logo { width:36px; height:36px; border-radius:11px; background:var(--surface-secondary); display:flex; align-items:center; justify-content:center; overflow:hidden; flex:none; }
.sa-logo img { width:26px; height:26px; object-fit:contain; }
.sa-brand-txt { display:flex; flex-direction:column; min-width:0; }
.sa-name { font-weight:800; font-size:15px; color:var(--text-1); letter-spacing:-.01em; }
.sa-role { font-size:10px; font-weight:700; color:var(--brand-text); text-transform:uppercase; letter-spacing:.14em; }
.sa-collapse { position:absolute; right:10px; top:50%; transform:translateY(-50%); background:transparent; border:0; color:var(--text-3); cursor:pointer; font-size:14px; padding:6px; }
.sa-collapse:hover { color:var(--text-1); }

.sa-nav { flex:1; overflow-y:auto; padding:12px 10px; display:flex; flex-direction:column; gap:2px; }
.sa-grouplabel { font-size:9.5px; font-weight:800; color:var(--text-3); text-transform:uppercase; letter-spacing:.16em; padding:14px 10px 5px; }
.sa-groupline { border-top:1px solid var(--border); margin:10px 8px; }
.sa-item { display:flex; align-items:center; gap:11px; width:100%; padding:9px 10px; border-radius:11px; border:0; background:transparent; color:var(--text-2); font-size:13.5px; font-weight:600; cursor:pointer; position:relative; text-align:left; }
.sa-item:hover { background:var(--surface-secondary); color:var(--text-1); }
.sa-item.active { background:var(--brand-soft); color:var(--brand-text); }
.sa-item.active::before { content:''; position:absolute; left:-10px; top:20%; bottom:20%; width:3px; border-radius:0 3px 3px 0; background:var(--brand); }
.sa-item-icon { width:20px; text-align:center; font-size:14px; flex:none; }
.sa-item-label { flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sa-item-badge { background:#ef4444; color:#fff; border-radius:99px; font-size:10px; font-weight:800; min-width:18px; height:18px; display:flex; align-items:center; justify-content:center; padding:0 5px; }

.sa-foot { padding:12px; border-top:1px solid var(--border); }
.sa-conn { font-size:11.5px; color:var(--text-3); display:flex; align-items:center; gap:7px; padding:8px 10px; border-radius:10px; background:var(--surface-secondary); border:1px solid var(--border); }
.sa-conn.live { color:#34d399; }
.sa-logout { margin-top:8px; width:100%; display:flex; align-items:center; gap:9px; background:transparent; border:1px solid var(--border); color:var(--text-2); padding:9px 12px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; }
.sa-logout:hover { color:#f87171; border-color:rgba(239,68,68,.4); }
.sa-logout.mini { justify-content:center; margin-top:0; }

/* ── Main ───────────────────────────────── */
.sa-main { flex:1; min-width:0; display:flex; flex-direction:column; height:100vh; overflow-y:auto; overflow-x:hidden; }
.sa-topbar { display:flex; align-items:center; justify-content:space-between; gap:14px; padding:18px 26px; border-bottom:1px solid var(--border); position:sticky; top:0; background:color-mix(in srgb, var(--background) 86%, transparent); backdrop-filter:blur(10px); z-index:40; }
.sa-tb-left h1 { margin:0; font-size:19px; font-weight:800; letter-spacing:-.02em; }
.sa-tb-sub { margin:2px 0 0; font-size:12.5px; color:var(--text-3); }
.sa-tb-right { display:flex; align-items:center; gap:10px; }
.sa-iconbtn { width:36px; height:36px; border-radius:11px; border:1px solid var(--border); background:var(--surface-secondary); color:var(--text-1); cursor:pointer; font-size:13.5px; position:relative; }
.sa-iconbtn:hover { border-color:var(--brand); color:var(--brand-text); }
.sa-profile { display:flex; align-items:center; gap:9px; cursor:pointer; padding:4px 6px; border-radius:11px; }
.sa-profile:hover { background:var(--surface-secondary); }
.sa-pavatar { width:34px; height:34px; border-radius:50%; background:var(--brand); color:#fff; font-weight:800; display:flex; align-items:center; justify-content:center; font-size:14px; }
.sa-pinfo { display:flex; flex-direction:column; line-height:1.2; }
.sa-pinfo span { font-size:13px; font-weight:700; }
.sa-pinfo small { font-size:10.5px; color:var(--brand-text); text-transform:uppercase; letter-spacing:.1em; font-weight:700; }

.sa-body { padding:22px 26px 90px; max-width:1460px; width:100%; margin:0 auto; }

.sa-badge { position:absolute; top:-5px; right:-5px; background:#ef4444; color:#fff; border-radius:99px; font-size:9.5px; font-weight:800; min-width:17px; height:17px; display:flex; align-items:center; justify-content:center; padding:0 4px; }

/* ── Mobile bar + bottom nav ────────────── */
.sa-mbar { display:none; }
.sa-bottom { display:none; }

@media (max-width: 768px) {
  .sa { flex-direction:column; }
  .sa-side { position:fixed; left:0; top:0; bottom:0; transform:translateX(-105%); transition:transform .25s ease; width:264px; box-shadow:0 0 60px rgba(0,0,0,.5); }
  .sa-side.open { transform:translateX(0); }
  .sa-main { width:100%; height:100dvh; }
  .sa-topbar { display:none; }
  .sa-body { padding:14px 14px 120px; }
  .sa-mbar { display:flex; align-items:center; justify-content:space-between; padding:12px 14px; border-bottom:1px solid var(--border); position:sticky; top:0; background:var(--background); z-index:50; }
  .sa-mbrand { display:flex; align-items:center; gap:9px; font-weight:800; font-size:15px; }
  .sa-mbrand em { font-style:normal; color:var(--brand-text); font-size:10px; text-transform:uppercase; letter-spacing:.12em; display:block; }
  .sa-mlogo { width:32px; height:32px; object-fit:contain; }
  .sa-mright { display:flex; gap:8px; align-items:center; }
  .sa-micon { width:36px; height:36px; border-radius:11px; border:1px solid var(--border); background:var(--surface-secondary); color:var(--text-1); font-size:13.5px; position:relative; }
  .sa-mavatar { width:36px; height:36px; border-radius:50%; background:var(--brand); color:#fff; font-weight:800; border:0; }
  .sa-bottom { display:flex; position:fixed; bottom:12px; left:50%; transform:translateX(-50%); z-index:70; background:color-mix(in srgb, var(--surface) 92%, transparent); backdrop-filter:blur(14px); border:1px solid var(--border); border-radius:22px; padding:8px 10px; gap:4px; box-shadow:0 14px 40px rgba(0,0,0,.45); width:min(430px, calc(100vw - 20px)); justify-content:space-between; }
  .sa-bitem { position:relative; display:flex; flex-direction:column; align-items:center; gap:3px; background:transparent; border:0; color:var(--text-3); cursor:pointer; flex:1; padding:0; }
  .sa-bcircle { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14.5px; transition:all .2s ease; }
  .sa-blabel { font-size:9.5px; font-weight:700; }
  .sa-bitem.active .sa-bcircle { background:var(--brand); color:#fff; transform:translateY(-4px); box-shadow:0 8px 18px rgba(99,102,241,.4); }
  .sa-bitem.active { color:var(--brand-text); }
  .sa-bbadge { position:absolute; top:-2px; right:calc(50% - 20px); background:#ef4444; color:#fff; border-radius:99px; font-size:9px; font-weight:800; min-width:15px; height:15px; display:flex; align-items:center; justify-content:center; padding:0 4px; }
  .sa-backdrop { position:fixed; inset:0; background:rgba(2,4,10,.6); z-index:55; backdrop-filter:blur(3px); }
  .sa-fade-enter-active, .sa-fade-leave-active { transition:opacity .2s ease; }
  .sa-fade-enter-from, .sa-fade-leave-to { opacity:0; }
}
</style>
