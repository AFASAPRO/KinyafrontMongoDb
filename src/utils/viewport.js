/**
 * Viewport & keyboard utilities for reliable mobile behavior.
 *
 * Mobile browsers (especially iOS Safari) keep the layout viewport at
 * window.innerHeight even when the on-screen keyboard opens, which pushes
 * the chat composer behind the keyboard. We listen to the visual viewport
 * and expose the keyboard overlap as a CSS custom property (--kb) so the
 * composer can lift itself above the keyboard.
 */
import { ref } from 'vue'

let installed = false

export function initViewportShim() {
  if (installed) return
  installed = true

  const vv = window.visualViewport
  if (!vv) return

  const update = () => {
    // Height of the screen area hidden behind the keyboard / bottom bars
    const overlap = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop))
    const root = document.documentElement
    root.style.setProperty('--kb', overlap > 2 ? `${overlap}px` : '0px')
    root.classList.toggle('kb-open', overlap > 120)
  }

  vv.addEventListener('resize', update)
  vv.addEventListener('scroll', update)
  window.addEventListener('orientationchange', update)
  update()
}

/** True when the app runs as an installed PWA (standalone window). */
export function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true
  )
}

/** Reactive standalone flag (updates when display-mode changes). */
const standaloneRef = ref(isStandalone())
let listenerBound = false

export function useStandalone() {
  if (!listenerBound) {
    listenerBound = true
    // Listen to every display-mode variant we treat as standalone
    ;['standalone', 'minimal-ui'].forEach((mode) => {
      const mq = window.matchMedia?.(`(display-mode: ${mode})`)
      mq?.addEventListener?.('change', () => { standaloneRef.value = isStandalone() })
    })
  }
  return standaloneRef
}
