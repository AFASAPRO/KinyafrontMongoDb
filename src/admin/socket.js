/**
 * KinyaBot Superadmin — Realtime layer (Socket.IO)
 * ─────────────────────────────────────────────────────────────────
 * Singleton connection to the backend with HONEST connection state:
 *   'live' | 'connecting' | 'reconnecting' | 'offline'
 *
 * • Automatic reconnection with exponential backoff (never gives up
 *   silently — the UI always shows the current status).
 * • Views subscribe with on(event, handler) and get clean teardown.
 * • REST polling remains the fallback (data refresh strategy per
 *   resource type — see useResource), so a socket outage degrades
 *   the dashboard to periodic refresh instead of stale data.
 */
import { io } from 'socket.io-client'
import { reactive } from 'vue'
import { getToken } from './api'

const SOCKET_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '') || undefined

export const conn = reactive({
  status: 'connecting',   // live | connecting | reconnecting | offline
  since: null,            // Date of last successful connect
  attempts: 0,
})

let socket = null
const listeners = new Map() // event -> Set<handler>

export function connectAdminSocket() {
  if (socket) return socket
  const token = getToken()
  if (!token) return null

  socket = io(SOCKET_URL, {
    auth: { adminToken: token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,       // never stop trying (Rule 22)
    reconnectionDelay: 1000,
    reconnectionDelayMax: 15000,
    timeout: 10000,
  })

  socket.on('connect', () => {
    conn.status = 'live'
    conn.since = new Date()
    conn.attempts = 0
  })
  socket.on('disconnect', (reason) => {
    conn.status = reason === 'io client disconnect' ? 'offline' : 'reconnecting'
  })
  socket.on('reconnect_attempt', () => { conn.status = 'reconnecting'; conn.attempts++ })
  socket.on('reconnect_failed', () => { conn.status = 'reconnecting' })
  socket.io.on('reconnect_error', () => { conn.status = 'reconnecting' })
  socket.on('connect_error', () => { if (conn.status !== 'reconnecting') conn.status = 'connecting' })

  // Fan out to subscribed handlers
  const forward = (event) => (...args) => {
    const set = listeners.get(event)
    if (set) set.forEach(h => { try { h(...args) } catch (e) { console.error('[AdminSocket]', e) } })
  }
  for (const ev of ['admin_activity', 'admin_notification_new', 'admin_ai_request', 'maintenance_mode']) {
    socket.on(ev, forward(ev))
  }
  return socket
}

export function disconnectAdminSocket() {
  if (socket) { socket.disconnect(); socket = null }
  conn.status = 'offline'
}

/** Subscribe to a realtime event. Returns an unsubscribe function. */
export function onAdminEvent(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set())
  listeners.get(event).add(handler)
  return () => listeners.get(event)?.delete(handler)
}
