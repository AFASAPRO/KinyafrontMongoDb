import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'
import { getSocket, joinChat, leaveChat } from '../socket'

/**
 * Chat store — conversation infrastructure (§1-§36).
 *
 * Conversations have public UUID ids (`conversation_id`) addressed as
 * /chat/c/{conversationId}. The URL is the source of truth for WHICH
 * conversation is open (ChatView syncs route ↔ store); the store owns
 * WHAT is in it.
 *
 * Creation is LAZY (§3): no empty conversations. The first message
 * creates the conversation server-side; the SSE `conversation` event
 * hands back its id and the URL updates without a reload.
 *
 * Every message carries a UI status:
 *   sending    → request in flight (user bubble shows pending state)
 *   streaming  → assistant tokens arriving
 *   completed  → final saved message
 *   failed     → generation failed (message kept, retry available)
 *   cancelled  → user stopped generation (partial answer kept)
 *
 * Assistant messages may carry response versions (§20): versions[]
 * with active_version — regenerate appends a version instead of
 * destroying the previous answer.
 */
export const useChatStore = defineStore('chat', () => {
  const chats         = ref([])
  const activeChat    = ref(null)
  const messages      = ref([])
  const loading       = ref(false)
  const loadError     = ref(null)   // friendly conversation-load failure (§24)
  const sending       = ref(false)
  const streaming     = ref(false)
  const searchResults = ref([])
  const stats         = ref({ total_chats: 0, total_messages: 0, total_tokens: 0 })
  // Track IDs already added via streaming to prevent socket duplicates
  const seenMessageIds = ref(new Set())

  /* ── Web Search (Web Search §13/§14/§41) ─────────────────────
     composerMode  — the mode selected in the composer (chat default,
                     'web_search' = explicit research, 'agent').
                     Restored from the conversation on load (§27).
     webSearchActivity — live search progress for the CURRENT stream:
                     { active, done, stage, query, queries, sources,
                       sourcesFound, domains, status, notice, elapsedMs }
                     Rendered by the streaming bubble; the finished
                     message carries the same data as `web_search`. */
  const composerMode = ref('chat')
  const webSearchActivity = ref(null)
  let searchStartedAt = 0
  function resetSearchActivity() {
    webSearchActivity.value = null
    searchStartedAt = 0
  }
  function patchSearchActivity(patch) {
    if (!webSearchActivity.value) webSearchActivity.value = { active: true, done: false, stage: 'understanding' }
    if (searchStartedAt && !webSearchActivity.value.elapsedMs) {
      webSearchActivity.value.elapsedMs = Date.now() - searchStartedAt
    }
    webSearchActivity.value = { ...webSearchActivity.value, ...patch }
  }

  // Per-chat reply preferences (language / style) — stored locally, sent as
  // whitelisted headers with each generation request.
  const chatPrefs = ref((() => { try { return JSON.parse(localStorage.getItem('kb_chat_prefs') || '{}') } catch { return {} } })())
  function getPrefs(chatId) { return chatPrefs.value[chatId] || { lang: '', style: '' } }
  function setPrefs(chatId, patch) {
    chatPrefs.value = { ...chatPrefs.value, [chatId]: { ...getPrefs(chatId), ...patch } }
    try { localStorage.setItem('kb_chat_prefs', JSON.stringify(chatPrefs.value)) } catch {}
  }
  function prefHeaders(chatId) {
    const p = getPrefs(chatId), h = {}
    if (p.lang) h['X-Reply-Language'] = p.lang
    if (p.style) h['X-Reply-Style'] = p.style
    return h
  }

  // AbortController for the in-flight generation (Stop button)
  let activeAbort = null
  // Last payload per failed/temp message (for Retry)
  const retryPayloads = ref(new Map())
  // Structured daily-limit payload from the backend (§7) — the chat
  // UI turns this into the upgrade modal, not a generic error.
  const limitReachedInfo = ref(null)

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

    // Cross-tab sync for edits / version switches (§17/§20)
    socket.off('message_updated')
    socket.on('message_updated', ({ chatId, userMessage, aiMessage }) => {
      if (activeChat.value?.id !== chatId) return
      const incoming = userMessage || aiMessage
      if (!incoming?.id) return
      const idx = messages.value.findIndex(m => m.id === incoming.id)
      if (idx !== -1) messages.value.splice(idx, 1, { ...incoming, content: stripMeta(incoming.content), _status: 'completed' })
    })

    socket.off('message_deleted')
    socket.on('message_deleted', ({ chatId, messageId }) => {
      if (activeChat.value?.id !== chatId) return
      messages.value = messages.value.filter(m => m.id !== messageId)
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

  /* ── Load a conversation (§4/§30) ──────────────────────────────
     Accepts a public conversation_id (UUID) or a Mongo id — the
     backend resolves both, always ownership-checked. Failures set a
     friendly loadError instead of silently showing nothing (§24). */
  async function loadChat(id) {
    if (!id) return
    if (activeChat.value && activeChat.value.id === id) return
    loading.value = true
    loadError.value = null
    try {
      if (activeChat.value) leaveChat(activeChat.value.id)
      const { data } = await api.get(`/chats/${encodeURIComponent(id)}`)
      activeChat.value = data
      messages.value = (data.messages || []).map(m => ({ ...m, content: stripMeta(m.content), _status: 'completed' }))
      // Seed seen IDs so socket won't duplicate
      seenMessageIds.value = new Set(data.messages?.map(m => m.id) || [])
      joinChat(data.id)
      // Mode persistence (§27): the composer reopens in the mode the
      // conversation was used with.
      composerMode.value = ['web_search', 'agent'].includes(data.mode) ? data.mode : 'chat'
      resetSearchActivity()
    } catch (err) {
      activeChat.value = null
      messages.value = []
      loadError.value = friendlyLoadError(err)
    } finally { loading.value = false }
  }

  function friendlyLoadError(err) {
    const status = err?.response?.status
    if (status === 401) return 'Your session has expired. Please sign in again to view this conversation.'
    if (status === 403 || status === 404)
      return 'This conversation could not be loaded. It may have been deleted or you may not have permission to access it.'
    if (status === 0 || err?.code === 'ERR_NETWORK')
      return "Couldn't connect to KinyaBot. Please check your internet connection and try again."
    return 'This conversation could not be loaded. Please try again in a moment.'
  }

  function clearLoadError() { loadError.value = null }

  /** Start a fresh conversation context (New Chat, §28): the URL goes
      back to /chat and the NEXT message creates a new conversation id. */
  function startNewChat() {
    if (sending.value || streaming.value) stopGeneration()
    if (activeChat.value) leaveChat(activeChat.value.id)
    activeChat.value = null
    messages.value = []
    seenMessageIds.value.clear()
    loadError.value = null
    composerMode.value = 'chat'
    resetSearchActivity()
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
    chats.value = chats.value.filter(c => c.id !== id)
    if (activeChat.value?.id === id) {
      activeChat.value = null
      messages.value = []
      seenMessageIds.value.clear()
    }
  }

  async function deleteAllChats() {
    await api.delete('/chats')
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
  async function consumeSSE(response, { onChunk, onDone, onError, onUserMessage, onConversation, onSearchStatus, onSearchResults, onSearchNotice }) {
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

        if (eventType === 'conversation') onConversation?.(data)
        else if (eventType === 'user_message') onUserMessage?.(data)
        else if (eventType === 'chunk') onChunk?.(data.text || '')
        else if (eventType === 'done') onDone?.(data)
        else if (eventType === 'error') onError?.(data.message || 'AI error', data)
        // Web Search activity events (§13/§14) — the elegant progress UI
        else if (eventType === 'search_status') onSearchStatus?.(data)
        else if (eventType === 'search_results') onSearchResults?.(data)
        else if (eventType === 'search_notice') onSearchNotice?.(data)
      }
    }
  }

  /* Core send/regenerate flow.
     url            — SSE endpoint
     content, files — user turn payload
     mode           — composer mode for this turn ('chat' | 'web_search' | 'agent');
                      omitted → the conversation's persisted mode
     isNew          — lazy conversation create (backend emits `conversation`)
     replaceIdx     — index of an existing assistant bubble the stream
                      replaces (regeneration keeps its position)        */
  async function runGeneration({ url, content, files = [], mode = null, isNew = false, replaceIdx = -1 }) {
    if (!isNew && !activeChat.value) return
    sending.value = true
    streaming.value = false
    resetSearchActivity()

    const tempId   = `temp_${Date.now()}`
    const streamId = `stream_${Date.now()}`

    const tempAttachments = (files || []).map(f => ({
      kind: (f.type || '').startsWith('image/') ? 'image' : 'document',
      url: URL.createObjectURL(f),
      name: f.name,
      size: f.size,
      _local: true
    }))
    const chatCtx = isNew ? null : activeChat.value

    // 1. Show user message immediately (above AI response)
    const userBubble = {
      id: tempId,
      chat_id: chatCtx?.id,
      role: 'user',
      content: content || '',
      created_at: new Date().toISOString(),
      file_url: tempAttachments[0]?.url || null,
      attachments: tempAttachments,
      message_type: tempAttachments[0]?.kind || 'text',
      _pending: true,
      _status: 'sending'
    }
    messages.value.push(userBubble)
    // 2. Assistant placeholder AFTER the user message — either a new
    //    streaming bubble or the existing answer being regenerated
    let streamIdxLocal = -1
    if (replaceIdx >= 0 && messages.value[replaceIdx]?.role === 'assistant') {
      messages.value.splice(replaceIdx, 1, { ...messages.value[replaceIdx], content: '', _streaming: true, _status: 'streaming' })
      streamIdxLocal = replaceIdx
    } else {
      messages.value.push({ id: streamId, role: 'assistant', content: '', created_at: new Date().toISOString(), _streaming: true, _status: 'streaming' })
      streamIdxLocal = messages.value.length - 1
    }
    const streamTargetId = messages.value[streamIdxLocal]?.id || streamId

    // Keep the payload so a failed send can be retried without retyping
    retryPayloads.value.set(tempId, { content, files })

    const abort = new AbortController()
    activeAbort = abort
    let hadError = null

    try {
      const fd = new FormData()
      if (content) fd.append('content', content)
      fd.append('mode', mode || composerMode.value || chatCtx?.mode || 'chat')
      for (const f of (files || [])) fd.append('files', f, f.name)

      const response = await fetch(`${API_BASE}${url}`, {
        method: 'POST',
        headers: { ...authHeader(), ...(chatCtx ? prefHeaders(chatCtx.id) : {}) },
        body: fd,
        signal: abort.signal
      })

      if (!response.ok) {
        let msg = 'Request failed'
        let payload = null
        try {
          payload = await response.json()
          msg = payload?.error || msg
        } catch {}
        // Structured daily-limit response → upgrade experience (§7)
        if (payload?.code === 'DAILY_LIMIT_REACHED') {
          limitReachedInfo.value = payload
          const e = new Error(msg)
          e.code = 'DAILY_LIMIT_REACHED'
          e.usage = payload.usage
          throw e
        }
        // Web Search is Pro-only (§2): surface the upgrade modal instead
        // of a generic error — the backend already refused to search.
        if (payload?.code === 'FEATURE_LOCKED' && payload?.feature === 'webSearch') {
          const e = new Error(msg)
          e.code = 'FEATURE_LOCKED'
          e.feature = 'webSearch'
          e.upgradeHint = payload.upgradeHint !== false
          throw e
        }
        throw new Error(msg)
      }

      streaming.value = true
      let finalAiMsg = null
      let realUserMsg = null
      let streamError = null
      let conversationHandled = false

      await consumeSSE(response, {
        onConversation: (data) => {
          // Lazy create (§3): the conversation now exists — sync state.
          // ChatView reacts and rewrites the URL without a reload.
          if (conversationHandled) return
          conversationHandled = true
          if (data?.conversationId) {
            activeChat.value = {
              id: data.chatId,
              conversation_id: data.conversationId,
              title: data.title || 'New Chat',
              mode: data.mode || 'chat',
              message_count: 0,
            }
            seenMessageIds.value.clear()
            joinChat(data.chatId)
          }
        },
        onUserMessage: (data) => { realUserMsg = data },
        onSearchStatus: (data) => {
          if (!searchStartedAt) searchStartedAt = Date.now()
          patchSearchActivity({
            active: true, done: false,
            stage: data.stage || 'searching',
            query: data.query || webSearchActivity.value?.query || null,
            sourcesFound: data.sourcesFound ?? webSearchActivity.value?.sourcesFound ?? null,
            domains: data.domains || webSearchActivity.value?.domains || [],
          })
        },
        onSearchResults: (data) => {
          patchSearchActivity({
            active: true, done: true,
            stage: data.performed ? 'preparing' : 'unavailable',
            status: data.status || null,
            queries: data.queries || [],
            query: data.queries?.[0] || webSearchActivity.value?.query || null,
            sources: data.sources || [],
            sourcesFound: data.resultCount ?? 0,
            domains: data.domains || [],
            durationMs: data.durationMs || null,
            cached: !!data.cached,
            trigger: data.trigger || null,
            notice: data.status === 'unavailable'
              ? 'Web Search is temporarily unavailable. I can still answer using my existing knowledge.'
              : (data.status === 'rate_limited'
                ? 'Web Search is cooling down for a moment — answering from existing knowledge.'
                : null),
          })
        },
        onSearchNotice: (data) => {
          if (data?.message) patchSearchActivity({ notice: data.message })
        },
        onChunk: (text) => {
          const idx = messages.value.findIndex(m => m.id === streamTargetId)
          if (idx !== -1) {
            const updated = { ...messages.value[idx], content: messages.value[idx].content + text }
            messages.value.splice(idx, 1, updated)
          }
        },
        onDone: (data) => {
          finalAiMsg = data.aiMessage
          if (data.userMessage) realUserMsg = data.userMessage
        },
        onError: (message, data) => {
          streamError = new Error(message)
          if (data?.code === 'DAILY_LIMIT_REACHED') {
            limitReachedInfo.value = data
            streamError.code = 'DAILY_LIMIT_REACHED'
            streamError.usage = data.usage
          }
        }
      })

      if (streamError) throw streamError

      // ── Finalize messages (no duplicates) ──────────────────────
      streaming.value = false

      const aiIdx = messages.value.findIndex(m => m.id === streamTargetId)
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

      updateSidebarAfterSend(content, { isNew })
    } catch (err) {
      streaming.value = false
      const aborted = err?.name === 'AbortError'

      // Clean typing indicator; keep streaming bubble as partial if any content
      const streamIdx = messages.value.findIndex(m => m.id === streamTargetId)
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
              ...messages.value[streamIdx], _streaming: false, _error: false,
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

  function updateSidebarAfterSend(content, { isNew = false } = {}) {
    const chatId = activeChat.value?.id
    if (!chatId) return
    if (isNew) {
      const chat = {
        ...(chats.value.find(c => c.id === chatId) || {}),
        ...activeChat.value,
        last_message: content || activeChat.value.title,
        message_count: 2,
        updated_at: new Date().toISOString(),
      }
      chats.value = [chat, ...chats.value.filter(c => c.id !== chatId)]
      return
    }
    const chat = chats.value.find(c => c.id === chatId)
    if (chat) {
      chat.last_message = content || chat.last_message
      chat.updated_at    = new Date().toISOString()
      chats.value = [chat, ...chats.value.filter(c => c.id !== chat.id)]
    }
  }

  /* Send a user turn. With no open conversation the request itself
     creates one (lazy, §3) and the URL updates to /c/{id}.
     opts.mode — composer mode ('chat' | 'web_search' | 'agent');
                 omitted → the current composer mode is used.       */
  async function sendMessage(content, files = [], opts = {}) {
    const isNew = !activeChat.value
    const url = isNew
      ? '/chats/messages/stream'
      : `/chats/${activeChat.value.id}/messages/stream`
    await runGeneration({ url, content, files, mode: opts.mode ?? null, isNew })
  }

  /* Regenerate the response for a specific user turn (§19).
     messageId omitted → regenerate the LAST user turn's answer.
     The previous answer survives as a response version (§20).     */
  async function regenerate(messageId = null) {
    if (sending.value || streaming.value) return
    if (!activeChat.value) return

    let userMsg = null
    let userIdx = -1
    if (messageId) {
      userIdx = messages.value.findIndex(m => m.id === messageId)
      userMsg = userIdx !== -1 ? messages.value[userIdx] : null
    } else {
      for (let i = messages.value.length - 1; i >= 0; i--) {
        if (messages.value[i].role === 'user' && !messages.value[i]._error) {
          userMsg = messages.value[i]; userIdx = i; break
        }
      }
    }
    if (!userMsg) return

    // Everything after a MID-conversation turn belongs to the old branch —
    // the backend supersedes it; drop it locally so the view stays clean.
    const laterUserTurn = messages.value.slice(userIdx + 1).some(m => m.role === 'user' && !m._error)
    let replaceIdx = -1
    if (laterUserTurn) {
      messages.value = messages.value.slice(0, userIdx + 1)
    } else {
      // Latest answer → stream replaces it in place (version carrier)
      for (let i = userIdx + 1; i < messages.value.length; i++) {
        const m = messages.value[i]
        if (m.role === 'user') break
        if (m.role === 'assistant' && !m._error) { replaceIdx = i; break }
      }
    }

    await runGeneration({
      url: `/chats/${activeChat.value.id}/messages/${encodeURIComponent(userMsg.id)}/regenerate`,
      content: '', files: [], replaceIdx,
    })
  }

  /* Retry a failed send (keeps the user's original message, §17). */
  async function retry(failedMsgId) {
    if (sending.value || streaming.value) return
    const payload = retryPayloads.value.get(failedMsgId)
    // Drop the failed user bubble + its error bubble, then resend
    const idx = messages.value.findIndex(m => m.id === failedMsgId)
    if (idx === -1) return
    const { content, files } = payload || { content: messages.value[idx].content, files: [] }
    messages.value.splice(idx, 1)
    // remove error bubble right after (if present)
    const next = messages.value[idx]
    if (next && next._error) messages.value.splice(idx, 1)
    await sendMessage(content, files || [])
  }

  /* Edit a previously sent user message (§17/§18/§22).
     content          — new text
     keepAttachments  — urls of existing attachments to keep
     newFiles         — File objects to add
     After the PATCH the later branch is superseded server-side AND
     locally, then a new response is generated.                       */
  async function editMessage(messageId, { content, keepAttachments = null, newFiles = [] }) {
    if (!activeChat.value || sending.value || streaming.value) return
    const idx = messages.value.findIndex(m => m.id === messageId)
    if (idx === -1) return
    const original = messages.value[idx]

    let saved = null
    try {
      const hasFiles = (newFiles || []).length > 0
      let data
      if (hasFiles) {
        const fd = new FormData()
        if (content !== null && content !== undefined) fd.append('content', content)
        if (keepAttachments) fd.append('keep_attachments', JSON.stringify(keepAttachments))
        for (const f of newFiles) fd.append('files', f, f.name)
        const res = await api.patch(`/chats/${activeChat.value.id}/messages/${encodeURIComponent(messageId)}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        data = res.data
      } else {
        const body = { content: content ?? '' }
        if (keepAttachments) body.keep_attachments = JSON.stringify(keepAttachments)
        const res = await api.patch(`/chats/${activeChat.value.id}/messages/${encodeURIComponent(messageId)}`, body)
        data = res.data
      }
      saved = data?.userMessage
    } catch (err) {
      const msg = err?.response?.data?.error || 'The message could not be edited. Please try again.'
      throw new Error(msg)
    }

    // Replace the message locally, drop the superseded branch
    if (saved) {
      messages.value.splice(idx, 1, { ...saved, content: stripMeta(saved.content), _status: 'completed' })
    }
    messages.value = messages.value.slice(0, idx + 1)

    // Generate the new response for the edited turn
    await regenerate(messageId)
  }

  /* Navigate response versions (§20): delta −1 (older) / +1 (newer).
     Optimistic local swap; the active choice persists via PATCH.  */
  function switchVersion(messageId, delta) {
    const msg = messages.value.find(m => m.id === messageId)
    if (!msg || !Array.isArray(msg.versions) || msg.versions.length < 2) return
    const current = Number.isInteger(msg.active_version) ? msg.active_version : msg.versions.length - 1
    const next = current + delta
    if (next < 0 || next >= msg.versions.length) return
    const v = msg.versions[next]
    msg.active_version = next
    msg.content = v.content
    if (v.model) msg.model = v.model
    const idx = messages.value.findIndex(m => m.id === messageId)
    if (idx !== -1) messages.value.splice(idx, 1, { ...messages.value[idx] })
    api.patch(`/messages/${encodeURIComponent(messageId)}`, { version: next }).catch(() => {})
  }

  /* Stop the in-flight generation (§16). Partial answer is kept. */
  function stopGeneration() {
    try { activeAbort?.abort() } catch {}
  }

  async function deleteMessage(id) {
    const idx = messages.value.findIndex(m => m.id === id)
    const msg = idx !== -1 ? messages.value[idx] : null
    await api.delete(`/messages/${id}`)
    messages.value = messages.value.filter(m => m.id !== id)
    // Deleting a user message also removes its answer from the visible
    // thread (the backend supersedes it server-side, §21).
    if (msg?.role === 'user') {
      while (idx < messages.value.length && messages.value[idx].role === 'assistant') {
        messages.value.splice(idx, 1)
      }
    }
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
    seenMessageIds.value = new Set()
    limitReachedInfo.value = null
    loadError.value = null
    loading.value = false
    sending.value = false
    streaming.value = false
    composerMode.value = 'chat'
    resetSearchActivity()
  }

  return {
    chats, activeChat, messages, loading, loadError, sending, streaming, searchResults, stats,
    pinnedChats, recentChats, chatPrefs, limitReachedInfo, composerMode, webSearchActivity,
    fetchChats, fetchStats, loadChat, startNewChat, clearLoadError, renameChat, pinChat,
    deleteChat, deleteAllChats, getPrefs, setPrefs, sendMessage, editMessage, regenerate, switchVersion,
    retry, stopGeneration, deleteMessage, searchMessages, clearSearch,
    setupSocketListeners, resetChatState
  }
})
