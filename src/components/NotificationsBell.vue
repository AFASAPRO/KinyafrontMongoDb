<template>
  <div class="nbell" :class="{ open: store.panelOpen }">
    <button
      class="nbell-btn"
      type="button"
      title="Notifications"
      aria-label="Notifications"
      :aria-expanded="store.panelOpen ? 'true' : 'false'"
      @click="toggle"
    >
      <i class="fas fa-bell" aria-hidden="true"></i>
      <span v-if="store.unread > 0" class="nbell-badge" aria-label="unread notifications">{{ store.unread > 99 ? '99+' : store.unread }}</span>
    </button>

    <transition name="nbell-pop">
      <div v-if="store.panelOpen" class="nbell-panel" role="dialog" aria-label="Notification center">
        <header class="nbell-head">
          <h2>Notifications</h2>
          <div class="nbell-head-actions">
            <button v-if="store.unread > 0" class="nbell-link" type="button" @click="store.markRead(null)">Mark all read</button>
            <button class="nbell-close" type="button" aria-label="Close notifications" @click="store.closePanel()">
              <i class="fas fa-xmark" aria-hidden="true"></i>
            </button>
          </div>
        </header>

        <!-- Push/permission nudge (§12.A): explained, user-initiated only -->
        <div v-if="permissionNudge" class="nbell-perm" role="status">
          <i class="fas fa-bell" aria-hidden="true"></i>
          <div class="nbell-perm-body">
            <b>Stay notified</b>
            <span>Get a real notification when an Agent task completes, fails or needs your approval — even when you're elsewhere.</span>
            <div class="nbell-perm-actions">
              <button class="nbell-perm-btn" type="button" :disabled="enabling" @click="enableNotifications">
                <i class="fas" :class="enabling ? 'fa-spinner fa-spin' : 'fa-bell'" aria-hidden="true"></i>
                {{ enabling ? 'Enabling…' : 'Enable notifications' }}
              </button>
            </div>
          </div>
        </div>
        <div v-else-if="store.permission === 'denied'" class="nbell-perm denied" role="status">
          <i class="fas fa-bell-slash" aria-hidden="true"></i>
          <div class="nbell-perm-body">
            <b>Notifications are blocked</b>
            <span>Your browser blocked notifications for this site. To enable them, open the site permissions from the address bar and allow Notifications, then reload.</span>
          </div>
        </div>
        <div v-else-if="store.permission === 'granted' && !store.push.configured" class="nbell-perm" role="status">
          <i class="fas fa-mobile-screen" aria-hidden="true"></i>
          <div class="nbell-perm-body">
            <b>Desktop notifications on</b>
            <span>Push delivery to this device needs server VAPID keys (run <code>npm run generate-vapid</code> on the backend and set the env vars). In-app notifications work everywhere.</span>
          </div>
        </div>

        <div class="nbell-list" role="feed">
          <div v-if="store.loading && !store.notifications.length" class="nbell-empty">
            <i class="fas fa-spinner fa-spin" aria-hidden="true"></i> Loading…
          </div>
          <div v-else-if="!store.notifications.length" class="nbell-empty">
            <i class="fas fa-bell-slash" aria-hidden="true"></i>
            <p>No notifications yet.</p>
            <p class="sub">Agent task completions, failures and approval requests will appear here — with real desktop or push delivery when enabled.</p>
          </div>
          <button
            v-for="n in store.notifications" :key="n.id"
            class="nbell-item" :class="{ unread: !n.read }"
            type="button"
            :title="n.link ? 'Open' : undefined"
            @click="openItem(n)"
          >
            <span class="nbell-ico" :class="n.type"><i class="fas" :class="iconFor(n)" aria-hidden="true"></i></span>
            <span class="nbell-body">
              <span class="nbell-title">{{ n.title }}</span>
              <span class="nbell-msg">{{ n.message }}</span>
              <span class="nbell-time">{{ relTime(n.created_at) }}</span>
            </span>
            <span v-if="!n.read" class="nbell-dot" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
/**
 * KinyaBot V1.2 §12 — Notification bell + in-app center.
 * Real everything: persistent history (GET /api/notifications),
 * mark-read, deep links into agent tasks, permission flow that only
 * fires from an explicit click with a clear explanation.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationsStore } from '../stores/notifications'

const store = useNotificationsStore()
const router = useRouter()
const enabling = ref(false)

const permissionNudge = computed(() => store.permission === 'default')

function toggle() {
  if (store.panelOpen) store.closePanel()
  else store.openPanel()
}

async function enableNotifications() {
  enabling.value = true
  try { await store.enable({ wantPush: true }) } finally { enabling.value = false }
}

function iconFor(n) {
  if (n?.kind === 'agent_task_completed') return 'fa-circle-check'
  if (n?.kind === 'agent_task_failed') return 'fa-circle-exclamation'
  if (n?.kind === 'agent_confirmation_required') return 'fa-shield-halved'
  if (n?.type === 'error') return 'fa-circle-exclamation'
  if (n?.type === 'warning') return 'fa-triangle-exclamation'
  if (n?.type === 'success') return 'fa-circle-check'
  return 'fa-circle-info'
}

function openItem(n) {
  if (!n.read) store.markRead([n.id])
  if (n.link) {
    store.closePanel()
    // Links are app-internal (/chat/agent/<ref> …) — SPA-navigate.
    const path = String(n.link).replace(/^\/chat/, '') || '/'
    router.push(path.startsWith('/') ? path : `/${path}`)
  }
}

function relTime(ts) {
  if (!ts) return ''
  const s = Math.max(0, (Date.now() - new Date(ts).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(ts).toLocaleDateString()
}

function onDocClick(e) {
  if (store.panelOpen && !e.target.closest?.('.nbell')) store.closePanel()
}
function onKey(e) { if (e.key === 'Escape' && store.panelOpen) store.closePanel() }

onMounted(async () => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKey)
  await store.refreshPermission()
  store.refreshPushState()
  store.bindSocket()
  store.fetch().catch(() => {})
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.nbell { position: relative; }
.nbell-btn {
  position: relative;
  width: 36px; height: 36px;
  border-radius: 10px;
  background: none; border: none; color: var(--text-2);
  display: grid; place-items: center; font-size: 15px; cursor: pointer;
  transition: background .15s, color .15s;
}
.nbell-btn:hover { background: var(--bg-hover); color: var(--text-1); }
.nbell-btn:focus-visible { outline: 2px solid var(--accent, #6366f1); outline-offset: 2px; }
.nbell-badge {
  position: absolute; top: 2px; right: 2px;
  min-width: 16px; height: 16px; padding: 0 4px;
  border-radius: 999px;
  background: #ef4444; color: #fff;
  font-size: 10px; font-weight: 700; line-height: 16px; text-align: center;
}

.nbell-panel {
  position: absolute; top: calc(100% + 8px); right: 0;
  width: 372px; max-width: calc(100vw - 24px);
  max-height: 70vh;
  background: var(--bg-1, #14161c);
  border: 1px solid var(--border, rgba(255,255,255,.09));
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0,0,0,.5);
  display: flex; flex-direction: column;
  overflow: hidden;
  z-index: 90;
}
.nbell-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 16px 10px;
  border-bottom: 1px solid var(--border, rgba(255,255,255,.07));
}
.nbell-head h2 { margin: 0; font-size: 15px; font-weight: 600; color: var(--text-1); }
.nbell-head-actions { display: flex; align-items: center; gap: 8px; }
.nbell-link { background: none; border: none; color: var(--accent, #6366f1); font-size: 12px; cursor: pointer; }
.nbell-link:hover { text-decoration: underline; }
.nbell-close {
  width: 26px; height: 26px; border-radius: 8px; border: none;
  background: none; color: var(--text-3); display: grid; place-items: center;
  font-size: 12px; cursor: pointer;
}
.nbell-close:hover { background: var(--bg-hover); color: var(--text-1); }

.nbell-perm {
  display: flex; gap: 10px;
  margin: 10px 12px 4px; padding: 12px;
  background: color-mix(in srgb, var(--accent, #6366f1) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent, #6366f1) 25%, transparent);
  border-radius: 12px;
  font-size: 12.5px; line-height: 1.45;
}
.nbell-perm i { margin-top: 2px; color: var(--accent, #6366f1); }
.nbell-perm.denied { background: rgba(239,68,68,.08); border-color: rgba(239,68,68,.25); }
.nbell-perm.denied i { color: #ef4444; }
.nbell-perm-body b { display: block; color: var(--text-1); margin-bottom: 2px; font-size: 12.5px; }
.nbell-perm-body span { color: var(--text-2); }
.nbell-perm-body code { font-size: 11px; }
.nbell-perm-actions { margin-top: 8px; }
.nbell-perm-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 12px; border-radius: 999px; border: none;
  background: var(--accent, #6366f1); color: #fff;
  font-size: 12.5px; font-weight: 600; cursor: pointer;
}
.nbell-perm-btn:hover { filter: brightness(1.08); }
.nbell-perm-btn:disabled { opacity: .6; cursor: default; }

.nbell-list { overflow-y: auto; padding: 8px 8px 10px; }
.nbell-empty {
  padding: 26px 16px; text-align: center; color: var(--text-3); font-size: 13px;
}
.nbell-empty i { font-size: 20px; display: block; margin-bottom: 8px; opacity: .7; }
.nbell-empty .sub { font-size: 12px; margin: 6px 0 0; line-height: 1.5; }
.nbell-item {
  display: flex; gap: 10px; align-items: flex-start;
  width: 100%; text-align: left;
  background: none; border: none; border-radius: 12px;
  padding: 10px 10px;
  cursor: pointer;
  transition: background .12s;
}
.nbell-item:hover { background: var(--bg-hover); }
.nbell-item.unread { background: color-mix(in srgb, var(--accent, #6366f1) 7%, transparent); }
.nbell-item.unread:hover { background: color-mix(in srgb, var(--accent, #6366f1) 12%, transparent); }
.nbell-ico {
  width: 30px; height: 30px; border-radius: 10px; flex-shrink: 0;
  display: grid; place-items: center; font-size: 12.5px;
  background: rgba(255,255,255,.06); color: var(--text-2);
}
.nbell-ico.success { background: rgba(16,185,129,.15); color: #10b981; }
.nbell-ico.error { background: rgba(239,68,68,.15); color: #ef4444; }
.nbell-ico.warning { background: rgba(245,158,11,.15); color: #f59e0b; }
.nbell-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.nbell-title { font-size: 13px; font-weight: 600; color: var(--text-1); }
.nbell-msg {
  font-size: 12.5px; color: var(--text-2); line-height: 1.4;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.nbell-time { font-size: 11px; color: var(--text-3); margin-top: 2px; }
.nbell-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--accent, #6366f1); flex-shrink: 0; margin-top: 6px; }

.nbell-pop-enter-active, .nbell-pop-leave-active { transition: opacity .14s ease, transform .14s ease; }
.nbell-pop-enter-from, .nbell-pop-leave-to { opacity: 0; transform: translateY(-6px) scale(.98); }

@media (max-width: 560px) {
  .nbell-panel { position: fixed; top: 58px; right: 10px; left: 10px; width: auto; }
}
</style>
