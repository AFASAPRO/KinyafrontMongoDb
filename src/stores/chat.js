import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'
import { getSocket, joinChat, leaveChat } from '../socket'

/**
 * Chat store — SSE streaming with explicit message states.
 *
 * Every message carries a UI status:
 *   sending    → request in flight (user bubble shows pending state)
 *   streaming  → assistant tokens arriving
 *   completed  → final saved message
 *   failed     → generation failed (message kept, retry available)
 *   cancelled  → user stopped generation (partial answer kept)
 */
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

  // AbortController for the in-flight generation (Stop button)
  let activeAbort = null
  // Last payload per failed/temp message (for Retry)
  const retryPayloads = ref(new Map())

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
          messages.value.push({ ...aiMessage, content: stripMeta(aiMessage.content), _status: 'completed' })
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
      messages.value = (data.messages || []).map(m => ({ ...m, content: stripMeta(m.content), _status: 'completed' }))
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

  // ─── SSE STREAMING ─────────────────────────────────────────────
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  function authHeader() {
    const token = localStorage.getItem('kb_token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  /* Parse the SSE byte stream and dispatch typed events. */
  async function consumeSSE(response, { onChunk, onDone, onError, onUserMessage }) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const blocks = buffer.split('\n\n')
      buffer = blocks.pop() || ''

      for (const block of blocks) {
        const lines = block.split('\n')
        let eventType = ''
        let dataStr = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) eventType = line.slice(7).trim()
          else if (line.startsWith('data: ')) dataStr = line.slice(6).trim()
        }
        if (!dataStr) continue
        let data
        try { data = JSON.parse(dataStr) } catch { continue }

        if (eventType === 'user_message') onUserMessage?.(data)
        else if (eventType === 'chunk') onChunk?.(data.text || '')
        else if (eventType === 'done') onDone?.(data)
        else if (eventType === 'error') onError?.(data.message || 'AI error')
      }
    }
  }

  /* Core send/regenerate flow. */
  async function runGeneration({ url, content, file, historySince = null }) {
    if (!activeChat.value) return
    sending.value = true
    streaming.value = false

    const tempId   = `temp_${Date.now()}`
    const streamId = `stream_${Date.now()}`

    const tempAttachments = file ? [{
      kind: (file.type || '').startsWith('image/') ? 'image' : 'document',
      url: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      _local: true
    }] : []

    // 1. Show user message immediately (above AI response)
    const userBubble = {
      id: tempId,
      chat_id: activeChat.value.id,
      role: 'user',
      content: content || '',
      created_at: new Date().toISOString(),
      file_url: file ? URL.createObjectURL(file) : null,
      attachments: tempAttachments,
      message_type: tempAttachments[0]?.kind || 'text',
      _pending: true,
      _status: 'sending'
    }
    messages.value.push(userBubble)
    // 2. Typing indicator AFTER user message
    messages.value.push({ id: 'typing', role: 'assistant', _typing: true, content: '' })

    // Keep the payload so a failed send can be retried without retyping
    retryPayloads.value.set(tempId, { content, file })

    const abort = new AbortController()
    activeAbort = abort
    let hadError = null

    try {
      const fd = new FormData()
      if (content) fd.append('content', content)
      if (file) fd.append('file', file)

      const response = await fetch(`${API_BASE}${url}`, {
        method: 'POST',
        headers: authHeader(),
        body: fd,
        signal: abort.signal
      })

      if (!response.ok) {
        let msg = 'Request failed'
        try { msg = (await response.json()).error || msg } catch {}
        throw new Error(msg)
      }

      // Replace typing with streaming bubble (keep user message above)
      messages.value = messages.value.filter(m => m.id !== 'typing')
      messages.value.push({
        id: streamId, role: 'assistant', content: '',
        created_at: new Date().toISOString(), _streaming: true, _status: 'streaming'
      })
      streaming.value = true

      let finalAiMsg = null
      let realUserMsg = null
      let streamError = null

      await consumeSSE(response, {
        onUserMessage: (data) => { realUserMsg = data },
        onChunk: (text) => {
          const idx = messages.value.findIndex(m => m.id === streamId)
          if (idx !== -1) {
            const updated = { ...messages.value[idx], content: messages.value[idx].content + text }
            messages.value.splice(idx, 1, updated)
          }
        },
        onDone: (data) => {
          finalAiMsg = data.aiMessage
          if (data.userMessage) realUserMsg = data.userMessage
        },
        onError: (message) => { streamError = new Error(message) }
      })

      if (streamError) throw streamError

      // ── Finalize messages (no duplicates) ──────────────────────
      streaming.value = false

      const aiIdx = messages.value.findIndex(m => m.id === streamId)
      if (finalAiMsg) {
        seenMessageIds.value.add(finalAiMsg.id)
        if (aiIdx !== -1) {
          messages.value.splice(aiIdx, 1, { ...finalAiMsg, content: stripMeta(finalAiMsg.content), _status: 'completed' })
        }
      } else if (aiIdx !== -1) {
        messages.value.splice(aiIdx, 1, { ...messages.value[aiIdx], _streaming: false, _status: 'completed' })
      }

      // Replace temp user message with the real saved one
      const userIdx = messages.value.findIndex(m => m.id === tempId)
      if (realUserMsg) {
        seenMessageIds.value.add(realUserMsg.id)
        if (userIdx !== -1) messages.value.splice(userIdx, 1, { ...realUserMsg, _status: 'completed' })
      } else if (userIdx !== -1) {
        messages.value.splice(userIdx, 1, { ...messages.value[userIdx], _pending: false, _status: 'completed' })
      }
      retryPayloads.value.delete(tempId)

      updateSidebarAfterSend(content)
    } catch (err) {
      streaming.value = false
      const aborted = err?.name === 'AbortError'

      // Clean typing indicator; keep streaming bubble as partial if any content
      messages.value = messages.value.filter(m => m.id !== 'typing')
      const streamIdx = messages.value.findIndex(m => m.id === streamId)
      const partialContent = streamIdx !== -1 ? messages.value[streamIdx].content : ''

      if (aborted) {
        // Cancelled: keep whatever streamed as a cancelled message
        if (streamIdx !== -1) {
          if (partialContent.trim()) {
            messages.value.splice(streamIdx, 1, { ...messages.value[streamIdx], _streaming: false, _status: 'cancelled' })
          } else {
            messages.value.splice(streamIdx, 1)
          }
        }
        const userIdx = messages.value.findIndex(m => m.id === tempId)
        if (userIdx !== -1) messages.value.splice(userIdx, 1, { ...messages.value[userIdx], _pending: false, _status: 'completed' })
        retryPayloads.value.delete(tempId)
      } else {
        // Failed: user message stays visible with a retryable error bubble
        if (streamIdx !== -1) {
          if (partialContent.trim()) {
            messages.value.splice(streamIdx, 1, {
              ...messages.value[streamIdx], _streaming: false, _error: true,
              content: messages.value[streamIdx].content, _status: 'failed'
            })
          } else {
            messages.value.splice(streamIdx, 1)
          }
        }
        const userIdx = messages.value.findIndex(m => m.id === tempId)
        if (userIdx !== -1) messages.value.splice(userIdx, 1, { ...messages.value[userIdx], _pending: false, _status: 'failed' })

        const errText = err.message || 'Something went wrong. Please try again.'
        messages.value.push({
          id: `err_${Date.now()}`, role: 'assistant', _error: true,
          content: errText, created_at: new Date().toISOString(), _status: 'failed'
        })
      }
      throw err
    } finally {
      sending.value = false
      streaming.value = false
      activeAbort = null
    }
  }

  function updateSidebarAfterSend(content) {
    const chatId = activeChat.value.id
    if (pendingChatId.value === chatId) {
      pendingChatId.value = null
      api.get(`/chats/${chatId}`).then(({ data: fresh }) => {
        const chatData = { ...fresh, message_count: 1, last_message: content }
        chats.value = [chatData, ...chats.value.filter(c => c.id !== chatId)]
        if (activeChat.value?.id === chatId) activeChat.value.title = fresh.title
      }).catch(() => {})
    } else {
      const chat = chats.value.find(c => c.id === chatId)
      if (chat) {
        chat.last_message = content
        chat.updated_at    = new Date().toISOString()
        if (chat.title === 'New Chat' && content) chat.title = content.slice(0, 55)
        if (activeChat.value?.title === 'New Chat' && content) activeChat.value.title = chat.title
        chats.value = [chat, ...chats.value.filter(c => c.id !== chat.id)]
      }
    }
  }

  async function sendMessage(content, file = null) {
    await runGeneration({ url: `/chats/${activeChat.value.id}/messages/stream`, content, file })
  }

  /* Regenerate the last assistant response (§16). */
  async function regenerate() {
    if (!activeChat.value || sending.value || streaming.value) return
    // Remove trailing assistant messages (incl. error bubbles) locally;
    // the backend does the same against the DB.
    for (let i = messages.value.length - 1; i >= 0; i--) {
      const m = messages.value[i]
      if (m.role === 'user') break
      messages.value.splice(i, 1)
    }
    await runGeneration({ url: `/chats/${activeChat.value.id}/regenerate/stream`, content: '' })
  }

  /* Retry a failed send (keeps the user's original message, §17). */
  async function retry(failedMsgId) {
    if (sending.value || streaming.value) return
    const payload = retryPayloads.value.get(failedMsgId)
    // Drop the failed user bubble + its error bubble, then resend
    const idx = messages.value.findIndex(m => m.id === failedMsgId)
    if (idx === -1) return
    const { content, file } = payload || { content: messages.value[idx].content, file: null }
    messages.value.splice(idx, 1)
    // remove error bubble right after (if present)
    const next = messages.value[idx]
    if (next && next._error) messages.value.splice(idx, 1)
    await runGeneration({ url: `/chats/${activeChat.value.id}/messages/stream`, content, file })
  }

  /* Stop the in-flight generation (§16). Partial answer is kept. */
  function stopGeneration() {
    try { activeAbort?.abort() } catch {}
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

  /* Wipe all in-memory chat state (used on logout so no stale
     conversations from a previous account leak into the next one). */
  function resetChatState() {
    try { activeAbort?.abort() } catch {}
    activeAbort = null
    retryPayloads.value = new Map()
    chats.value = []
    activeChat.value = null
    messages.value = []
    searchResults.value = []
    stats.value = { total_chats: 0, total_messages: 0, total_tokens: 0 }
    pendingChatId.value = null
    seenMessageIds.value = new Set()
    loading.value = false
    sending.value = false
    streaming.value = false
  }

  return {
    chats, activeChat, messages, loading, sending, streaming, searchResults, stats, pendingChatId,
    pinnedChats, recentChats,
    fetchChats, fetchStats, createChat, loadChat, renameChat, pinChat,
    deleteChat, deleteAllChats, sendMessage, regenerate, retry, stopGeneration,
    deleteMessage, searchMessages, clearSearch,
    setupSocketListeners, resetChatState
  }
})
