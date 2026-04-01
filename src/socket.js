import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'
let socket = null

export function getSocket() { return socket }

export function connectSocket(token) {
  if (socket?.connected) return socket
  if (socket) { socket.disconnect(); socket = null }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
    timeout: 10000
  })

  socket.on('connect', () => console.log('[Socket] Connected'))
  socket.on('disconnect', reason => console.log('[Socket] Disconnected:', reason))
  socket.on('connect_error', err => console.warn('[Socket] Error:', err.message))

  return socket
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null }
}

export function joinChat(chatId)  { socket?.emit('join_chat',  chatId) }
export function leaveChat(chatId) { socket?.emit('leave_chat', chatId) }
export function emitTyping(chatId, isTyping) { socket?.emit('typing', { chatId, isTyping }) }
