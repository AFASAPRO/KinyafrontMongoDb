import { reactive, computed } from 'vue'

/**
 * Shared, reactive theme state for the whole user-facing app.
 *
 * This wraps the SAME mechanism already used app-wide (localStorage key
 * 'kb_mode', and the 'light-mode' class on <html> that global.css and every
 * view's scoped styles key off of — see index.html's pre-paint script and
 * App.vue's applyThemeMode()). Previously each view re-derived its own
 * `isLight` with `computed(() => document.documentElement.classList.contains(...))`,
 * which has no reactive dependency and only ever evaluates once — so toggling
 * mid-page never re-skinned the *current* screen (it only "took" after a full
 * navigation, since the next view freshly re-read the class on mount).
 *
 * This module fixes that: one reactive source, so switching modes updates the
 * screen the user is actually looking at immediately, and every other screen
 * (chat, onboarding, register, etc.) still picks up the same persisted choice.
 *
 * Default is 'dark' — matches the app's existing default everywhere else.
 */
const state = reactive({
  mode: localStorage.getItem('kb_mode') || 'dark', // 'dark' | 'light' | 'system'
})

function prefersDark() {
  return typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : true
}

function resolveIsLight(mode) {
  return mode === 'light' || (mode === 'system' && !prefersDark())
}

function apply() {
  document.documentElement.classList.toggle('light-mode', resolveIsLight(state.mode))
}
apply()

if (typeof window !== 'undefined' && window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (state.mode === 'system') apply()
  })
}

export function setThemeMode(mode) {
  state.mode = mode
  localStorage.setItem('kb_mode', mode)
  apply()
}

/** Quick binary toggle — used by the sun/moon icon on the login form etc. */
export function toggleThemeMode() {
  setThemeMode(isLightMode.value ? 'dark' : 'light')
}

export const themeMode = computed(() => state.mode)
export const isLightMode = computed(() => resolveIsLight(state.mode))

export function useTheme() {
  return { mode: themeMode, isLightMode, setThemeMode, toggleThemeMode }
}
