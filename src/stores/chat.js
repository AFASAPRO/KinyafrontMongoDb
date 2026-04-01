import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'
import { getSocket, joinChat, leaveChat } from '../socket'

export const useChatStore = defineStore('chat', () => {
  const chats         = ref([])
  const activeChat    = ref(null)
  const messages      = ref([])
  const loading       = ref(false)
  const sending       = ref(false)
  const streaming     = ref(false)
  const searchResults = ref([])
  const stats         = ref({ total_chats: 0, total_messages: 0, total_tokens: 0 })
  const pendingChatId = ref(null)
  // Track IDs already added via streaming to prevent socket duplicates
  const seenMessageIds = ref(new Set())

  const pinnedChats = computed(() => chats.value.filter(c => c.is_pinned))
  const recentChats = computed(() => chats.value.filter(c => !c.is_pinned))

  function stripMeta(text) {
    return (text || '').replace(/\n?\n?\*?⚡\s*Response time:[^\n*]*/gi, '').trim()
  }

  function setupSocketListeners() {
    const socket = getSocket()
    if (!socket) return

    socket.off('new_message') // prevent duplicate listeners
    socket.on('new_message', ({ userMessage, aiMessage, chatId }) => {
      // Only add if not already shown via streaming
      if (activeChat.value?.id === chatId) {
        if (aiMessage && !seenMessageIds.value.has(aiMessage.id)) {
          seenMessageIds.value.add(aiMessage.id)
          messages.value = messages.value.filter(m => !m._typing && !m._streaming)
          messages.value.push({ ...aiMessage, content: stripMeta(aiMessage.content) })
        }
      }
      const chat = chats.value.find(c => c.id === chatId)
      if (chat) {
        chat.updated_at = new Date().toISOString()
        chats.value = [chat, ...chats.value.filter(c => c.id !== chatId)]
      }
    })

    socket.off('maintenance_mode')
    socket.on('maintenance_mode', ({ active }) => {
      if (active) {
        messages.value.push({
          id: `maintenance_${Date.now()}`, role: 'assistant', _system: true,
          content: 'KinyaBot is entering maintenance mode. The service will be temporarily unavailable.',
          created_at: new Date().toISOString()
        })
      }
    })
  }

  async function fetchChats() {
    try {
      const { data } = await api.get('/chats')
      chats.value = data
    } catch {}
  }

  async function fetchStats() {
    try {
      const { data } = await api.get('/stats')
      stats.value = data
    } catch {}
  }

  async function createChat(title = 'New Chat') {
    if (pendingChatId.value) {
      try { await api.delete(`/chats/${pendingChatId.value}`) } catch {}
      chats.value = chats.value.filter(c => c.id !== pendingChatId.value)
    }
    const { data } = await api.post('/chats', { title })
    pendingChatId.value = data.id
    activeChat.value = { ...data, message_count: 0 }
    messages.value = []
    seenMessageIds.value.clear()
    joinChat(data.id)
    return data
  }

  async function loadChat(id) {
    if (pendingChatId.value && pendingChatId.value !== id) {
      try { await api.delete(`/chats/${pendingChatId.value}`) } catch {}
      chats.value = chats.value.filter(c => c.id !== pendingChatId.value)
      pendingChatId.value = null
    }
    loading.value = true
    try {
      if (activeChat.value) leaveChat(activeChat.value.id)
      const { data } = await api.get(`/chats/${id}`)
      activeChat.value = data
      messages.value = (data.messages || []).map(m => ({ ...m, content: stripMeta(m.content) }))
      // Seed seen IDs so socket won't duplicate
      seenMessageIds.value = new Set(data.messages?.map(m => m.id) || [])
      joinChat(id)
    } catch {} finally { loading.value = false }
  }

  async function renameChat(id, title) {
    await api.put(`/chats/${id}`, { title })
    const chat = chats.value.find(c => c.id === id)
    if (chat) chat.title = title
    if (activeChat.value?.id === id) activeChat.value.title = title
  }

  async function pinChat(id, is_pinned) {
    await api.put(`/chats/${id}`, { is_pinned: is_pinned ? 1 : 0 })
    const chat = chats.value.find(c => c.id === id)
    if (chat) chat.is_pinned = is_pinned ? 1 : 0
    chats.value = [...chats.value]
  }

  async function deleteChat(id) {
    await api.delete(`/chats/${id}`)
    if (pendingChatId.value === id) pendingChatId.value = null
    chats.value = chats.value.filter(c => c.id !== id)
    if (activeChat.value?.id === id) {
      activeChat.value = null
      messages.value = []
      seenMessageIds.value.clear()
      if (chats.value.length) await loadChat(chats.value[0].id)
    }
  }

  async function deleteAllChats() {
    await api.delete('/chats')
    pendingChatId.value = null
    chats.value = []
    activeChat.value = null
    messages.value = []
    seenMessageIds.value.clear()
  }

  // ─── FIXED SSE STREAMING ─────────────────────────────────────
  async function sendMessage(content, file = null) {
    if (!activeChat.value) return
    sending.value = true
    streaming.value = false

    const tempId  = `temp_${Date.now()}`
    const streamId = `stream_${Date.now()}`

    // 1. Show user message immediately (above AI response)
    messages.value.push({
      id: tempId,
      chat_id: activeChat.value.id,
      role: 'user',
      content: content || '',
      created_at: new Date().toISOString(),
      file_url: file ? URL.createObjectURL(file) : null,
      _pending: true
    })
    // 2. Typing indicator AFTER user message
    messages.value.push({ id: 'typing', role: 'assistant', _typing: true })

    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    const token = localStorage.getItem('kb_token')

    try {
      const fd = new FormData()
      if (content) fd.append('content', content)
      if (file) fd.append('file', file)

      const response = await fetch(`${API_BASE}/chats/${activeChat.value.id}/messages/stream`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Request failed')
      }

      // Replace typing with streaming bubble (keep user message above)
      messages.value = messages.value.filter(m => m.id !== 'typing')
      messages.value.push({
        id: streamId, role: 'assistant', content: '',
        created_at: new Date().toISOString(), _streaming: true
      })
      streaming.value = true

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalAiMsg = null
      let realUserMsg = null
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // Parse SSE properly: each event block is separated by \n\n
        const blocks = buffer.split('\n\n')
        // Keep last incomplete block in buffer
        buffer = blocks.pop() || ''

        for (const block of blocks) {
          const lines = block.split('\n')
          let eventType = ''
          let dataStr = ''

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim()
            } else if (line.startsWith('data: ')) {
              dataStr = line.slice(6).trim()
            }
          }

          if (!dataStr) continue

          try {
            const data = JSON.parse(dataStr)

            if (eventType === 'user_message') {
              realUserMsg = data

            } else if (eventType === 'chunk') {
              const idx = messages.value.findIndex(m => m.id === streamId)
              if (idx !== -1) {
                // Mutate immutably to trigger Vue reactivity
                const updated = { ...messages.value[idx], content: messages.value[idx].content + data.text }
                messages.value.splice(idx, 1, updated)
              }

            } else if (eventType === 'done') {
              finalAiMsg = data.aiMessage
              if (data.userMessage) realUserMsg = data.userMessage

            } else if (eventType === 'error') {
              throw new Error(data.message || 'AI error')
            }
          } catch (parseErr) {
            // Only rethrow real errors, ignore JSON parse issues
            if (parseErr.message && !parseErr.message.includes('JSON') && !parseErr.message.startsWith('Unexpected')) {
              throw parseErr
            }
          }
        }
      }

      // ── Finalize messages (no duplicates) ──────────────────────
      streaming.value = false

      // Replace streaming bubble with final AI message
      const aiIdx = messages.value.findIndex(m => m.id === streamId)
      if (finalAiMsg) {
        // Mark as seen so socket won't add it again
        seenMessageIds.value.add(finalAiMsg.id)
        if (aiIdx !== -1) {
          messages.value.splice(aiIdx, 1, { ...finalAiMsg, content: stripMeta(finalAiMsg.content) })
        }
      } else if (aiIdx !== -1) {
        // No finalAiMsg from done event — keep streamed content but remove _streaming flag
        messages.value.splice(aiIdx, 1, { ...messages.value[aiIdx], _streaming: false })
      }

      // Replace temp user message with real saved one (or just clean the _pending flag)
      const userIdx = messages.value.findIndex(m => m.id === tempId)
      if (realUserMsg) {
        seenMessageIds.value.add(realUserMsg.id)
        if (userIdx !== -1) {
          messages.value.splice(userIdx, 1, realUserMsg)
        }
      } else if (userIdx !== -1) {
        messages.value.splice(userIdx, 1, { ...messages.value[userIdx], _pending: false })
      }

      // Update sidebar chat list
      const chatId = activeChat.value.id
      if (pendingChatId.value === chatId) {
        pendingChatId.value = null
        try {
          const fresh = await api.get(`/chats/${chatId}`)
          const chatData = { ...fresh.data, message_count: 1, last_message: content }
          chats.value = [chatData, ...chats.value.filter(c => c.id !== chatId)]
          activeChat.value.title = fresh.data.title
        } catch {}
      } else {
        const chat = chats.value.find(c => c.id === chatId)
        if (chat) {
          chat.last_message  = content
          chat.updated_at    = new Date().toISOString()
          if (chat.title === 'New Chat' && content) chat.title = content.slice(0, 55)
          if (activeChat.value?.title === 'New Chat' && content) activeChat.value.title = chat.title
          chats.value = [chat, ...chats.value.filter(c => c.id !== chat.id)]
        }
      }

    } catch (err) {
      streaming.value = false
      // Clean temp/typing/streaming indicators
      messages.value = messages.value.filter(m => m.id !== 'typing' && m.id !== streamId)
      // Clean the pending marker from user message (keep it visible)
      const userIdx = messages.value.findIndex(m => m.id === tempId)
      if (userIdx !== -1) messages.value.splice(userIdx, 1, { ...messages.value[userIdx], _pending: false })

      const errText = err.message || 'Something went wrong. Please try again.'
      messages.value.push({
        id: `err_${Date.now()}`, role: 'assistant', _error: true,
        content: errText, created_at: new Date().toISOString()
      })
    } finally {
      sending.value = false
    }
  }

  async function deleteMessage(id) {
    await api.delete(`/messages/${id}`)
    messages.value = messages.value.filter(m => m.id !== id)
  }

  async function searchMessages(q) {
    if (!q.trim()) { searchResults.value = []; return }
    try {
      const { data } = await api.get(`/search?q=${encodeURIComponent(q)}`)
      searchResults.value = data
    } catch { searchResults.value = [] }
  }

  function clearSearch() { searchResults.value = [] }

  return {
    chats, activeChat, messages, loading, sending, streaming, searchResults, stats, pendingChatId,
    pinnedChats, recentChats,
    fetchChats, fetchStats, createChat, loadChat, renameChat, pinChat,
    deleteChat, deleteAllChats, sendMessage, deleteMessage, searchMessages, clearSearch,
    setupSocketListeners
  }
})
