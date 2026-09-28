import { ref, onMounted, onBeforeUnmount } from 'vue'

/**
 * Reactive "phone layout" flag. The redesigned mobile UI (home, chat, login,
 * register, …) is rendered at <= 768px; the desktop UI is left untouched.
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
