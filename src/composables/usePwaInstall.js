/**
 * Shared PWA install state for both the user app and the admin app.
 *
 * The `beforeinstallprompt` event must be captured as early as possible and
 * can only be consumed once — so the deferred prompt is stored at module
 * level and shared between every component that uses this composable
 * (Login page, Sidebar, Landing page, Admin login…).
 */
import { ref } from 'vue'
import { isStandalone } from '../utils/viewport'

const deferredPrompt = ref(null)
const installed = ref(
  isStandalone() ||
    // Chrome sets this after a successful install
    (navigator.getInstalledRelatedApps ? undefined : false)
)

// True once the app was installed in this session
const justInstalled = ref(false)

// iOS does not fire beforeinstallprompt — detect it to show manual instructions
const isIOS = /ipad|iphone|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

// Mobile device detection — on phones the "install" action is always useful
// (Chrome Android often fires beforeinstallprompt only after user engagement,
//  so waiting for the event alone would hide the UI for too long)
const isMobileDevice = /android|iphone|ipad|ipod/i.test(navigator.userAgent)

// A browser is "supported" when it fires beforeinstallprompt (Chromium)
const canInstall = ref(false)

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar; keep the prompt for our own UI
    e.preventDefault()
    deferredPrompt.value = e
    canInstall.value = true
  })

  window.addEventListener('appinstalled', () => {
    installed.value = true
    justInstalled.value = true
    deferredPrompt.value = null
    canInstall.value = false
  })

  // Update installed state if the app is launched standalone
  window.matchMedia?.('(display-mode: standalone)')?.addEventListener?.('change', (e) => {
    if (e.matches) installed.value = true
  })
}

/**
 * Trigger the native install prompt.
 * Returns 'accepted' | 'dismissed' | 'unavailable' | 'error'.
 */
async function promptInstall() {
  if (!deferredPrompt.value) return 'unavailable'
  const evt = deferredPrompt.value
  try {
    evt.prompt()
    const { outcome } = await evt.userChoice
    deferredPrompt.value = null
    canInstall.value = false
    return outcome // 'accepted' | 'dismissed'
  } catch (err) {
    // Stale event / gesture requirements / headless environments
    console.warn('[PWA] Install prompt failed:', err?.message || err)
    deferredPrompt.value = null
    return 'error'
  }
}

export function usePwaInstall() {
  return { canInstall, installed, justInstalled, isIOS, isMobileDevice, promptInstall }
}
