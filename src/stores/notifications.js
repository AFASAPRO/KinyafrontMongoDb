import { ref, computed, reactive } from 'vue'
import { defineStore } from 'pinia'
import api from '../api'
import { getSocket } from '../socket'

/**
 * KinyaBot V1.2 §12 — User Notifications store
 * ─────────────────────────────────────────────
 * REAL notifications end-to-end:
 *   • history + unread count from GET /api/notifications (persistent)
 *   • live updates through the EXISTING user socket room
 *   • browser Notification permission state + Web Push subscription
 *     (VAPID public key from the backend; the private key never
 *     leaves the server)
 *   • desktop notifications fire for relevant events while the tab is
 *     backgrounded; push covers closed-app delivery where the
 *     platform supports it
 *
 * HONESTY RULES: the store never fabricates a permission state or a
 * subscription — everything reflects what the browser/backend
 * actually reported.
 */

export const useNotificationsStore = defineStore('notifications', () => {
  /* ── State ─────────────────────────────────────────────────── */
  const notifications = ref([])
  const unread = ref(0)
  const loaded = ref(false)
  const loading = ref(false)

  /* Browser Notification permission + push subscription state */
  const permission = ref(typeof Notification !== 'undefined' ? Notification.permission : 'denied')
  const push = reactive({ configured: false, subscribed: false, publicKey: null })
  const panelOpen = ref(false)

  /* ── Computed ──────────────────────────────────────────────── */
  const desktopSupported = computed(() => typeof Notification !== 'undefined')
  const pushSupported = computed(() => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window)
  const canEnable = computed(() => desktopSupported.value && permission.value !== 'denied')

  /* ── Socket wiring (same user room as everything else) ─────── */
  let socketBound = false
  function bindSocket() {
    if (socketBound) return
    const socket = getSocket()
    if (!socket) return
    socketBound = true
    socket.on('user_notification', onLiveNotification)
  }
  function unbindSocket() {
    const socket = getSocket()
    if (!socket) return
    socket.off('user_notification', onLiveNotification)
    socketBound = false
  }

  function onLiveNotification(n) {
    if (!n?.id) return
    // Dedupe by id (socket redelivery after reconnect)
    if (notifications.value.some(x => x.id === n.id)) return
    notifications.value = [n, ...notifications.value].slice(0, 60)
    if (!n.read) unread.value += 1
    // Real desktop notification when the page is backgrounded and
    // permission was granted (§12.B).
    if (document.visibilityState === 'hidden' && permission.value === 'granted' && n.title) {
      try {
        const note = new Notification(n.title, {
          body: n.message || '',
          tag: n.kind || 'kinyabot',
          icon: '/chat/icon-192.png',
        })
        note.onclick = () => {
          window.focus()
          if (n.link) window.location.assign(n.link)
          note.close()
        }
      } catch {}
    }
  }

  /* ── REST ──────────────────────────────────────────────────── */
  async function fetch({ limit = 30 } = {}) {
    loading.value = true
    try {
      const res = await api.get('/me/notifications', { params: { limit } })
      notifications.value = res.data?.notifications || []
      unread.value = res.data?.unread || 0
      if (res.data?.push) {
        push.configured = !!res.data.push.configured
        push.publicKey = res.data.push.public_key || null
      }
      loaded.value = true
    } catch {
      /* offline / auth-expired: keep whatever we had */
    } finally {
      loading.value = false
    }
    return notifications.value
  }

  async function markRead(ids = null) {
    try {
      const body = ids ? { ids } : { all: true }
      const res = await api.post('/me/notifications/read', body)
      if (body.all) unread.value = 0
      else unread.value = Math.max(0, unread.value - (res.data?.updated || 0))
      notifications.value = notifications.value.map(n => (!ids || ids.includes(n.id)) ? { ...n, read: true } : n)
    } catch {}
  }

  async function dismiss(id) {
    try {
      await api.post('/me/notifications/dismiss', { id })
      notifications.value = notifications.value.filter(n => n.id !== id)
    } catch {}
  }

  async function refreshPermission() {
    if (typeof Notification !== 'undefined') permission.value = Notification.permission
  }

  async function refreshPushState() {
    if (!pushSupported.value) return
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg) {
        const sub = await reg.pushManager.getSubscription()
        push.subscribed = !!sub
      }
      if (!push.configured) {
        const res = await api.get('/me/notifications/push/status').catch(() => null)
        if (res?.data) {
          push.configured = !!res.data.configured
          push.publicKey = res.data.public_key || null
        }
      }
    } catch {}
  }

  /**
   * §12.A: request permission ONLY after an explicit user action and
   * explanation (the UI enforces that; this is the real browser call).
   * On success, subscribe to Web Push with the server's VAPID key.
   */
  async function enable({ wantPush = true } = {}) {
    await refreshPermission()
    if (permission.value !== 'granted') return { ok: false, reason: 'permission', permission: permission.value }
    if (wantPush && pushSupported.value && push.configured && push.publicKey) {
      try {
        const reg = await navigator.serviceWorker.getRegistration()
          || await navigator.serviceWorker.register('/chat/sw.js')
        const existing = await reg.pushManager.getSubscription()
        const sub = existing || await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(push.publicKey),
        })
        await api.post('/me/notifications/push/subscribe', { subscription: sub.toJSON() })
        push.subscribed = true
      } catch (err) {
        return { ok: true, push: false, reason: 'subscribe_failed', error: String(err?.message || err) }
      }
    }
    return { ok: true, push: push.subscribed }
  }

  /** §12.C: unsubscribe → the backend removes the endpoint; no push after. */
  async function disablePush() {
    try {
      const reg = await navigator.serviceWorker.getRegistration()
      const sub = reg ? await reg.pushManager.getSubscription() : null
      if (sub) {
        await api.post('/me/notifications/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {})
        await sub.unsubscribe().catch(() => {})
      }
      push.subscribed = false
    } catch {}
  }

  function openPanel() { panelOpen.value = true; fetch().catch(() => {}) }
  function closePanel() { panelOpen.value = false }

  /* VAPID helper (RFC base64url → Uint8Array for subscribe()). */
  function urlB64ToUint8Array(b64) {
    const padding = '='.repeat((4 - (b64.length % 4)) % 4)
    const base64 = (b64 + padding).replace(/-/g, '+').replace(/_/g, '/')
    const raw = atob(base64)
    const out = new Uint8Array(raw.length)
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
    return out
  }

  return {
    notifications, unread, loaded, loading, permission, push, panelOpen,
    desktopSupported, pushSupported, canEnable,
    fetch, markRead, dismiss, enable, disablePush,
    refreshPermission, refreshPushState, openPanel, closePanel,
    bindSocket, unbindSocket,
  }
})
