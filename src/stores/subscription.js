import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'
import { getSocket } from '../socket'

/**
 * Subscription store — plan state for the whole user app (§19).
 *
 * The BACKEND is the single source of truth:
 *   • plan + limits + features come from /api/subscription (UserPlan +
 *     PlanConfig collections server-side)
 *   • daily usage comes from /api/subscription/usage (UsageDaily)
 *   • localStorage is never authoritative — we only cache for instant UI
 *
 * Realtime: Socket.IO `plan_updated`, `plan_request_rejected`,
 * `usage_updated` and `user_notification` events keep the UI live
 * without refreshes (§22, §40).
 */
export const useSubscriptionStore = defineStore('subscription', () => {
  const loaded = ref(false)
  const loading = ref(false)
  const plan = ref('free')
  const planName = ref('Free')
  const status = ref('active')
  const features = ref({})
  const usage = ref({ used: 0, limit: 50, remaining: 50, percent: 0, state: 'normal' })
  const pendingRequest = ref(null)
  const latestRequest = ref(null)
  const lastChange = ref(null)      // un-acknowledged plan upgrade (celebration)
  const upgradePaths = ref(['plus', 'pro'])
  const plansCatalog = ref([])      // cached /api/plans for pricing UIs
  const requests = ref([])          // user's own request history
  const toasts = ref([])            // realtime in-app notifications

  const isPro = computed(() => plan.value === 'pro')
  const canUpgrade = computed(() => upgradePaths.value.length > 0)
  const usageState = computed(() => usage.value.state || 'normal')

  /* ── Fetch full subscription state (plan page, app boot) ──────── */
  async function fetch(force = false) {
    if (loading.value) return
    if (loaded.value && !force) return
    loading.value = true
    try {
      const { data } = await api.get('/subscription')
      applySubscription(data)
      loaded.value = true
    } catch { /* offline tolerance — cached values stay visible */ }
    finally { loading.value = false }
  }

  function applySubscription(data) {
    plan.value = data.plan || 'free'
    planName.value = data.planName || 'Free'
    status.value = data.status || 'active'
    features.value = data.features || {}
    usage.value = data.usage || usage.value
    pendingRequest.value = data.pendingRequest || null
    latestRequest.value = data.latestRequest || null
    lastChange.value = data.lastChange || null
    upgradePaths.value = data.upgradePaths || []
    // Keep the cached auth user's plan label in sync (best-effort)
    try {
      const cached = JSON.parse(localStorage.getItem('kb_user') || 'null')
      if (cached && cached.plan !== plan.value) {
        localStorage.setItem('kb_user', JSON.stringify({ ...cached, plan: plan.value }))
      }
    } catch {}
  }

  /* ── Cheap usage refresh (sidebar indicator after each send) ──── */
  let usageTimer = null
  async function refreshUsage() {
    clearTimeout(usageTimer) // debounce bursts of socket events
    usageTimer = setTimeout(async () => {
      try {
        const { data } = await api.get('/subscription/usage')
        usage.value = {
          used: data.used || 0, limit: data.limit || 50,
          remaining: data.remaining ?? Math.max(0, (data.limit || 50) - (data.used || 0)),
          percent: data.percent || 0, state: data.state || 'normal',
        }
      } catch {}
    }, 150)
  }

  /* ── Plan catalog (public, cached in-memory) ──────────────────── */
  async function fetchPlans(force = false) {
    if (plansCatalog.value.length && !force) return plansCatalog.value
    try {
      const { data } = await api.get('/plans')
      plansCatalog.value = data.plans || []
    } catch { plansCatalog.value = [] }
    return plansCatalog.value
  }

  /* ── Upgrade requests ─────────────────────────────────────────── */
  async function submitRequest(payload) {
    const { data } = await api.post('/subscription/requests', payload)
    pendingRequest.value = data.request
    latestRequest.value = data.request
    return data
  }

  async function fetchRequests() {
    try {
      const { data } = await api.get('/subscription/requests', { params: { limit: 10 } })
      requests.value = data.requests || []
    } catch { requests.value = [] }
  }

  async function ackPlanChange() {
    lastChange.value = null
    try { await api.post('/subscription/ack-plan') } catch {}
  }

  /* ── Realtime (Socket.IO) ─────────────────────────────────────── */
  function setupSocketListeners() {
    const socket = getSocket()
    if (!socket) return
    socket.off('plan_updated')
    socket.on('plan_updated', ({ plan: newPlan, dailyLimit }) => {
      plan.value = newPlan
      planName.value = newPlan?.charAt(0).toUpperCase() + newPlan?.slice(1)
      upgradePaths.value = newPlan === 'pro' ? [] : (newPlan === 'plus' ? ['pro'] : ['plus', 'pro'])
      if (dailyLimit) usage.value = { ...usage.value, limit: dailyLimit, remaining: Math.max(0, dailyLimit - (usage.value.used || 0)) }
      pendingRequest.value = null
      refreshUsage()
    })
    socket.off('plan_request_rejected')
    socket.on('plan_request_rejected', () => { refreshUsage(); fetch(true) })
    socket.off('usage_updated')
    socket.on('usage_updated', (u) => {
      if (u && typeof u.used === 'number') {
        usage.value = {
          used: u.used, limit: u.limit ?? usage.value.limit,
          remaining: u.remaining ?? Math.max(0, (u.limit ?? usage.value.limit) - u.used),
          percent: u.limit ? Math.min(100, Math.round((u.used / u.limit) * 100)) : 0,
          state: u.state || (u.limit && u.used >= u.limit ? 'limit' : usage.value.state),
        }
      }
    })
    socket.off('user_notification')
    socket.on('user_notification', (n) => {
      if (!n?.title && !n?.message) return
      pushToast(n)
    })
  }

  /* ── In-app toast notifications (§22) ─────────────────────────── */
  function pushToast(n) {
    const id = n.id || `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    toasts.value = [...toasts.value.slice(-3), { ...n, id }]
    setTimeout(() => dismissToast(id), 6000)
  }
  function dismissToast(id) { toasts.value = toasts.value.filter(t => t.id !== id) }

  /* ── Reset on logout / account switch ─────────────────────────── */
  function reset() {
    loaded.value = false
    plan.value = 'free'; planName.value = 'Free'; status.value = 'active'
    features.value = {}
    usage.value = { used: 0, limit: 50, remaining: 50, percent: 0, state: 'normal' }
    pendingRequest.value = null; latestRequest.value = null; lastChange.value = null
    upgradePaths.value = ['plus', 'pro']; requests.value = []; toasts.value = []
  }

  return {
    loaded, loading, plan, planName, status, features, usage, pendingRequest,
    latestRequest, lastChange, upgradePaths, plansCatalog, requests, toasts,
    isPro, canUpgrade, usageState,
    fetch, refreshUsage, fetchPlans, submitRequest, fetchRequests, ackPlanChange,
    setupSocketListeners, pushToast, dismissToast, reset, applySubscription,
  }
})
