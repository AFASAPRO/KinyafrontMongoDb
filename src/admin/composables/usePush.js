/**
 * Superadmin PWA — Web Push composable
 * Handles permission, subscription and honest status reporting.
 * Deep links arrive via the service worker `notificationclick`
 * handler (see public/sw.js), which opens notification.data.url.
 */
import { ref } from 'vue'
import api, { apiError } from '../api'
import { useToast } from './useToast'

const supported = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

const status = ref({
  supported,
  permission: supported ? Notification.permission : 'unsupported',
  pushEnabled: false,   // backend VAPID configured
  subscribed: false,    // this browser has an active subscription
  subscriptions: 0,
})
const loading = ref(false)

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; ++i) output[i] = raw.charCodeAt(i)
  return output
}

async function refresh() {
  if (!supported) return
  try {
    const { data } = await api.get('/admin/push/status')
    status.value.pushEnabled = !!data.enabled
    status.value.subscriptions = data.subscriptions || 0
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = reg ? await reg.pushManager.getSubscription() : null
    status.value.subscribed = !!sub
  } catch { /* status stays honest about being unknown */ }
}

async function subscribe() {
  const toast = useToast()
  if (!supported) { toast.error('This browser does not support web push.'); return }
  loading.value = true
  try {
    const { data: st } = await api.get('/admin/push/status')
    if (!st.enabled) { toast.error('Push is not configured on the server (VAPID keys missing). Run `npm run generate-vapid` in backend/.'); return }
    let perm = Notification.permission
    if (perm === 'denied') { toast.error('Notifications are blocked for this site. Enable them in browser settings.'); return }
    if (perm !== 'granted') perm = await Notification.requestPermission()
    if (perm !== 'granted') { toast.error('Permission was not granted.'); return }
    const reg = await navigator.serviceWorker.getRegistration()
    if (!reg) { toast.error('Service worker not ready — reload the app and try again.'); return }
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(st.public_key),
      })
    }
    await api.post('/admin/push/subscribe', { endpoint: sub.endpoint, keys: sub.toJSON().keys })
    toast.success('This device will now receive push alerts.')
    await refresh()
  } catch (e) { toast.error(apiError(e).message || 'Subscription failed.') }
  finally { loading.value = false }
}

async function unsubscribe() {
  const toast = useToast()
  loading.value = true
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    const sub = reg ? await reg.pushManager.getSubscription() : null
    if (sub) {
      await api.post('/admin/push/unsubscribe', { endpoint: sub.endpoint })
      await sub.unsubscribe()
    }
    toast.success('Push disabled for this device.')
    await refresh()
  } catch (e) { toast.error(apiError(e).message) }
  finally { loading.value = false }
}

async function sendTest() {
  const toast = useToast()
  try {
    const { data } = await api.post('/admin/push/test')
    if (data.skipped === 'push_not_configured') toast.error('Push is not configured on the server (VAPID keys missing).')
    else if (data.skipped === 'no_subscriptions') toast.error('No device is subscribed yet.')
    else toast.success(`Test sent to ${data.sent} device(s).`)
  } catch (e) { toast.error(apiError(e).message) }
}

export function usePush() {
  return { status, loading, supported, refresh, subscribe, unsubscribe, sendTest }
}
