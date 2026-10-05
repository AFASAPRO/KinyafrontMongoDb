/**
 * KinyaBot Superadmin — shared formatting helpers
 * Real timestamps only; no hardcoded dates anywhere.
 */

export function fmtNum(n) {
  if (n === null || n === undefined || n === '' || isNaN(n)) return '—'
  n = Number(n)
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

export function fmtSize(bytes) {
  if (bytes === null || bytes === undefined || isNaN(bytes)) return '—'
  bytes = Number(bytes)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`
  return `${(bytes / 1073741824).toFixed(2)} GB`
}

export function fmtMs(ms) {
  if (ms === null || ms === undefined || isNaN(ms)) return '—'
  return `${Math.round(Number(ms))}ms`
}

export function fmtUptime(seconds) {
  const s = Math.floor(Number(seconds) || 0)
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60)
  if (d) return `${d}d ${h}h ${m}m`
  if (h) return `${h}h ${m}m`
  return `${m}m`
}

export function shortDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function fullDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

/* Relative time — re-renders via the injected nowTick dependency. */
let nowTickFn = () => 0
export function bindNowTick(fn) { nowTickFn = fn }

export function timeAgo(ts) {
  nowTickFn()
  if (!ts) return '—'
  const diff = Date.now() - new Date(ts).getTime()
  const s = Math.floor(diff / 1000)
  if (s < -5) return shortDate(ts) // future timestamps (clock skew) → exact
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return shortDate(ts)
}

export function pct(n) {
  if (n === null || n === undefined || isNaN(n)) return '—'
  return `${n}%`
}

export function changeLabel(v) {
  if (v === null || v === undefined) return null
  const sign = v > 0 ? '+' : ''
  return `${sign}${v}%`
}

const AVATAR_COLORS = ['#6366f1', '#22d3ee', '#8b5cf6', '#22c55e', '#f59e0b', '#38bdf8', '#a78bfa', '#34d399']
export function avatarColor(s) { return AVATAR_COLORS[(s?.charCodeAt(0) || 0) % AVATAR_COLORS.length] }
