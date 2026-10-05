/**
 * Toast system — shared across all Superadmin views (Rule 35).
 */
import { reactive } from 'vue'

const state = reactive({ toasts: [] })
let id = 0

function push(kind, message, timeout = 3500) {
  const item = { id: ++id, kind, message }
  state.toasts.push(item)
  setTimeout(() => {
    const i = state.toasts.findIndex(t => t.id === item.id)
    if (i !== -1) state.toasts.splice(i, 1)
  }, timeout)
}

export function useToast() {
  return {
    toasts: state.toasts,
    success: (m) => push('success', m),
    error: (m) => push('error', m, 5000),
    info: (m) => push('info', m),
  }
}
