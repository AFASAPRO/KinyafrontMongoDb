/**
 * useResource — data fetching composable for every Superadmin view.
 * Enforces the loading / error / empty contract (Rules 27-29):
 *   • loading → skeletons, never fake values
 *   • error   → understandable message + Retry, never silent
 *   • data    → real data; empty arrays surface isEmpty
 */
import { ref, computed, onBeforeUnmount } from 'vue'
import { apiError } from '../api'

export function useResource(fetcher, { immediate = true, initial = null } = {}) {
  const data = ref(initial)
  const loading = ref(false)
  const error = ref(null)
  const loadedAt = ref(null)
  let seq = 0

  async function load(...args) {
    const id = ++seq
    loading.value = true
    error.value = null
    try {
      const result = await fetcher(...args)
      if (id !== seq) return data.value // stale response — ignore
      data.value = result
      loadedAt.value = new Date()
      return result
    } catch (err) {
      if (id !== seq) return
      error.value = apiError(err)
    } finally {
      if (id === seq) loading.value = false
    }
  }

  const isEmpty = computed(() => {
    const d = data.value
    if (d === null || d === undefined) return false
    if (Array.isArray(d)) return d.length === 0
    if (typeof d === 'object') {
      if (Array.isArray(d.items)) return d.items.length === 0
      if (Array.isArray(d.users)) return d.users.length === 0
      if (Array.isArray(d.chats)) return d.chats.length === 0
      if (Array.isArray(d.files)) return d.files.length === 0
      if (Array.isArray(d.logs)) return d.logs.length === 0
      if (Array.isArray(d.events)) return d.events.length === 0
      if (Object.keys(d).length === 0) return true
    }
    return false
  })

  if (immediate) load()
  return { data, loading, error, isEmpty, loadedAt, load, reload: load }
}

/** Debounce helper for search inputs. */
export function useDebounced(fn, ms = 300) {
  let t = null
  const debounced = (...args) => {
    clearTimeout(t)
    t = setTimeout(() => fn(...args), ms)
  }
  onBeforeUnmount(() => clearTimeout(t))
  return debounced
}
