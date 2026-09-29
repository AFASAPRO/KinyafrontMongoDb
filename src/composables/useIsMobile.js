import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * Reactive "phone layout" flag. The redesigned mobile UI (home, chat, login,
 * register, onboarding, get-started, …) is rendered at <= 768px; the
 * desktop UI is left untouched.
 */
export const MOBILE_QUERY = '(max-width: 768px)'

export function useIsMobile() {
  const mq = window.matchMedia(MOBILE_QUERY)
  const isMobile = ref(mq.matches)
  const onChange = (e) => { isMobile.value = e.matches }
  onMounted(() => {
    isMobile.value = mq.matches
    mq.addEventListener('change', onChange)
  })
  onBeforeUnmount(() => mq.removeEventListener('change', onChange))
  return isMobile
}

/** True once at the very top of the module load — used by the router guard,
 *  which runs before any component (and its reactive matchMedia listener)
 *  has mounted. */
export function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
}

const INTRO_KEY = 'kb_intro_seen'
export function hasSeenIntro() {
  return typeof localStorage !== 'undefined' && localStorage.getItem(INTRO_KEY) === '1'
}
export function markIntroSeen() {
  try { localStorage.setItem(INTRO_KEY, '1') } catch {}
}
