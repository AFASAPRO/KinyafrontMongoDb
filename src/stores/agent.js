import { ref, computed, reactive } from 'vue'
import { defineStore } from 'pinia'
import api from '../api'
import { getSocket } from '../socket'

/**
 * KinyaBot Agent V1 — Agent Store (§5, §6, §15, §17, §24, §25, §30)
 * ─────────────────────────────────────────────────────────────────
 * Single source of truth for the Agent workspace UI:
 *
 *   • activeTask    — the task bound to the workspace panel
 *   • events        — the realtime event stream (socket + catch-up)
 *   • terminal      — real command/output/exit-code lines (§10)
 *   • files/changes — workspace state (§5 tabs)
 *   • preview       — live dev-server state + signed token URL (§24)
 *   • pendingConfirmation — high-risk command approval (§13)
 *
 * NO FAKE DATA (§32): every field is set from a server response or a
 * realtime event. The panel never renders a simulated state.
 *
 * FAULT TOLERANCE (§30): the socket listener is idempotent and the
 * event stream is re-synced with `?after=<seq>` on reconnect, so a
 * dropped connection never loses terminal output or plan updates.
 */

const ACTIVE_STATES = ['queued', 'planning', 'running', 'waiting_for_confirmation', 'paused']

/* Which wire events update which tab (§15). */
const TERMINAL_EVENTS = [
  'task.terminal.started', 'task.terminal.output', 'task.terminal.completed',
  'task.terminal.blocked', 'task.terminal.background_started',
]
const LOG_EVENTS = [
  'task.created', 'task.started', 'task.planning', 'task.plan_updated', 'task.step',
  'task.tool.started', 'task.tool.completed', 'task.tool.failed', 'task.tool.retried',
  'task.file.changed', 'task.terminal.blocked', 'task.ports.detected',
  'task.preview.started', 'task.preview.ready', 'task.preview.stopped',
  'task.verification.started', 'task.verification.completed', 'task.repair.started',
  'task.confirmation.requested', 'task.confirmation.resolved',
  'task.completed', 'task.failed', 'task.cancelled',
]

export const useAgentStore = defineStore('agent', () => {
  /* ── Workspace panel state ─────────────────────────────────── */
  const panelOpen = ref(false)        // workspace panel visibility
  const panelWidth = ref(460)         // user-resizable (px, clamped)
  const activeTab = ref('terminal')   // terminal | files | changes | preview | logs

  /* ── Active task ────────────────────────────────────────────── */
  const activeTask = ref(null)        // full task document (fmtTask shape)
  const events = ref([])              // ordered event timeline (§15)
  const lastSeq = ref(0)              // gap-free catch-up cursor (§30)
  const tasks = ref([])               // the user's task list (sidebar/restore)

  /* ── Derived workspace state ───────────────────────────────── */
  const terminal = ref([])            // rendered terminal lines (§10)
  const files = ref({ entries: [], count: 0 })
  const changes = ref([])
  const preview = reactive({ token: null, url: null, port: null, status: 'offline' })
  const pendingConfirmation = ref(null)

  /* ── V1.1 additions ──────────────────────────────────────────── */
  const agentConfig = ref(null)       // real provider/model info (GET /agent/config)
  const autoApprove = ref(false)      // user pre-approves §13 confirmations for THIS task
  const downloadState = ref('idle')   // idle | downloading | error | done
  const downloadError = ref(null)

  /* ── Live status helpers ───────────────────────────────────── */
  const isActive = computed(() => ACTIVE_STATES.includes(activeTask.value?.status))
  const statusLabel = computed(() => {
    const s = activeTask.value?.status
    const map = {
      queued: 'Queued', planning: 'Planning', running: 'Working',
      waiting_for_confirmation: 'Needs approval', paused: 'Paused',
      completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled',
    }
    return map[s] || '—'
  })
  const previewLive = computed(() => !!(activeTask.value?.preview?.port))

  /* ════════════════════════════════════════════════════════════
     REALTIME EVENT INGESTION (§15, §30)
     ════════════════════════════════════════════════════════════ */
  let socketBound = false

  function bindSocket() {
    if (socketBound) return
    const socket = getSocket()
    if (!socket) return
    socketBound = true
    socket.on('agent_event', handleAgentEvent)
    // §30: after any reconnect, re-sync the gap between what we saw
    // and what the server persisted (events are gap-free by seq).
    socket.io?.on?.('reconnect', () => {
      if (activeTask.value) syncEvents(activeTask.value.task_ref).catch(() => {})
    })
    socket.on('connect', () => {
      if (activeTask.value) syncEvents(activeTask.value.task_ref).catch(() => {})
    })
  }

  function unbindSocket() {
    const socket = getSocket()
    if (!socket) return
    socket.off('agent_event', handleAgentEvent)
    socketBound = false
  }

  /** One realtime event → every reactive surface it touches. */
  function handleAgentEvent(evt) {
    if (!evt || !activeTask.value) return
    if (String(evt.taskId) !== String(activeTask.value.id)) return
    if (evt.seq != null && evt.seq <= lastSeq.value) return // duplicate/gapfill

    events.value.push(evt)
    if (evt.seq != null) lastSeq.value = Math.max(lastSeq.value, evt.seq)
    applyEvent(evt)
  }

  /** Pure state application — also used by catch-up (same order). */
  function applyEvent(evt) {
    const t = activeTask.value
    if (!t) return
    const d = evt.data || {}

    switch (evt.type) {
      case 'task.started':
        t.status = 'running'
        t.started_at = t.started_at || evt.at
        break
      case 'task.planning':
        t.status = 'planning'
        break
      case 'task.plan_updated':
        t.plan = (d.steps || []).map(title => ({ title, status: 'pending' }))
        t.current_step = 0
        break
      case 'task.tool.started': {
        t.status = t.status === 'waiting_for_confirmation' ? t.status : (ACTIVE_STATES.includes(t.status) ? 'running' : t.status)
        const idx = (t.plan || []).findIndex(s => s.status === 'pending')
        if (idx !== -1) { t.plan[idx].status = 'in_progress'; t.current_step = idx }
        break
      }
      case 'task.tool.completed': {
        const idx = (t.plan || []).findIndex(s => s.status === 'in_progress')
        if (idx !== -1) { t.plan[idx].status = 'done'; t.current_step = Math.min(idx + 1, (t.plan || []).length - 1) }
        break
      }
      case 'task.file.changed':
        if (t.stats) t.stats.files_changed = (t.stats.files_changed || 0) + 1
        refreshFilesSoon()
        refreshChangesSoon()
        break
      case 'task.terminal.started':
        terminal.value.push({
          kind: 'command', id: d.id, command: d.command, cwd: d.cwd || '.',
          risk: d.risk || 'low', startedAt: d.startedAt || evt.at,
        })
        break
      case 'task.terminal.background_started':
        terminal.value.push({
          kind: 'background', id: d.id, command: d.command, pid: d.pid,
          at: evt.at, note: 'running in background',
        })
        break
      case 'task.terminal.output': {
        const line = terminal.value.find(l => l.id === d.id && (l.kind === 'command' || l.kind === 'background'))
        const chunk = String(d.chunk || '')
        if (line) {
          line.output = (line.output || '') + chunk
        } else {
          // Output for a command we never saw started (catch-up) — synthesize honestly.
          terminal.value.push({ kind: 'command', id: d.id, command: d.command || '(command)', output: chunk })
        }
        break
      }
      case 'task.terminal.completed': {
        const line = terminal.value.find(l => l.id === d.id && l.kind === 'command')
        if (line) {
          line.exitCode = d.exitCode
          line.durationMs = d.durationMs
          line.completedAt = d.completedAt || evt.at
          line.timedOut = !!d.timedOut
        } else {
          terminal.value.push({ kind: 'command', id: d.id, command: d.command || '(command)', exitCode: d.exitCode, durationMs: d.durationMs })
        }
        break
      }
      case 'task.terminal.blocked':
        terminal.value.push({
          kind: 'blocked', command: d.command, reason: d.reason, at: evt.at,
        })
        break
      case 'task.preview.started':
        preview.status = 'starting'
        break
      case 'task.preview.ready':
        if (t.preview) { t.preview.port = d.port; t.preview.kept_alive = true }
        else t.preview = { port: d.port, kept_alive: true }
        preview.status = 'ready'
        refreshPreviewTokenSoon()
        break
      case 'task.preview.stopped':
        if (t.preview) t.preview.port = null
        preview.status = 'offline'
        preview.token = null
        preview.url = null
        break
      case 'task.confirmation.requested': {
        pendingConfirmation.value = { id: d.id, command: d.command, reason: d.reason, at: evt.at }
        t.status = 'waiting_for_confirmation'
        /* V1.1 “Auto-approve”: the user pre-authorized THIS task's §13
           prompts. We still call the REAL confirm endpoint — the backend
           stays the authority; nothing is bypassed client-side.        */
        if (autoApprove.value) {
          const pc = pendingConfirmation.value
          pendingConfirmation.value = null
          api.post(`/agent/tasks/${t.task_ref}/confirm`, { confirmationId: pc.id, approved: true })
            .then(() => { if (ACTIVE_STATES.includes(t.status)) t.status = 'running' })
            .catch(() => { pendingConfirmation.value = pc })
        }
        break
      }
      case 'task.confirmation.resolved':
        pendingConfirmation.value = null
        if (ACTIVE_STATES.includes(t.status)) t.status = 'running'
        break
      case 'task.completed':
        t.status = 'completed'
        t.result = d.result || t.result
        t.completed_at = evt.at
        pendingConfirmation.value = null
        break
      case 'task.failed':
        t.status = 'failed'
        t.error = d.error || 'The task failed.'
        t.completed_at = evt.at
        pendingConfirmation.value = null
        preview.status = 'offline'
        break
      case 'task.cancelled':
        t.status = 'cancelled'
        t.error = d.reason || 'Task cancelled.'
        t.completed_at = evt.at
        pendingConfirmation.value = null
        preview.status = 'offline'
        break
    }
  }

  /* Debounced refreshers — bursts of file events collapse. */
  let filesTimer = null
  function refreshFilesSoon() {
    clearTimeout(filesTimer)
    filesTimer = setTimeout(() => { fetchFiles().catch(() => {}) }, 400)
  }
  let changesTimer = null
  function refreshChangesSoon() {
    clearTimeout(changesTimer)
    changesTimer = setTimeout(() => { fetchChanges().catch(() => {}) }, 400)
  }
  let previewTimer = null
  function refreshPreviewTokenSoon() {
    clearTimeout(previewTimer)
    previewTimer = setTimeout(() => { fetchPreviewToken().catch(() => {}) }, 300)
  }

  /* ════════════════════════════════════════════════════════════
     EVENT CATCH-UP (§25 restore, §30 reconnect)
     ════════════════════════════════════════════════════════════ */
  async function syncEvents(taskRef) {
    if (!taskRef) return
    const res = await api.get(`/agent/tasks/${taskRef}/events`, { params: { after: lastSeq.value, limit: 500 } })
    const incoming = res.data?.events || []
    for (const evt of incoming) {
      events.value.push(evt)
      if (evt.seq != null) lastSeq.value = Math.max(lastSeq.value, evt.seq)
      applyEvent(evt)
    }
  }

  /* ════════════════════════════════════════════════════════════
     TASK LIFECYCLE (§7, §17)
     ════════════════════════════════════════════════════════════ */

  /** Create + start an Agent task (§5). Returns the task document. */
  async function createTask(prompt, conversationId = null) {
    const body = { prompt }
    if (conversationId) body.conversationId = conversationId
    const res = await api.post('/agent/tasks', body)
    const task = res.data?.task
    if (task) {
      tasks.value = [task, ...tasks.value.filter(t => t.id !== task.id)]
      await openTask(task, { resetTerminal: true })
    }
    return { task, conversationId: res.data?.conversationId, queued: res.data?.queued }
  }

  /**
   * Bind a task to the workspace panel. Used for live tasks AND for
   * restoring a finished task after refresh (§25) — events are
   * replayed from the server, so the terminal/logs tabs rebuild the
   * REAL history.
   */
  async function openTask(task, { resetTerminal = false } = {}) {
    activeTask.value = task
    if (resetTerminal) { terminal.value = []; events.value = []; lastSeq.value = 0 }
    else { terminal.value = []; events.value = []; lastSeq.value = 0 } // always rebuild from events — honest
    pendingConfirmation.value = null
    preview.status = task.preview?.port ? 'ready' : 'offline'
    bindSocket()
    panelOpen.value = true
    await Promise.allSettled([
      syncEvents(task.task_ref),
      fetchFiles(),
      fetchChanges(),
      task.preview?.port ? fetchPreviewToken() : Promise.resolve(),
    ])
    // A restored task waiting for approval re-surfaces the request (§13).
    if (task.status === 'waiting_for_confirmation' && !pendingConfirmation.value) {
      const req = [...events.value].reverse().find(e => e.type === 'task.confirmation.requested')
      const res = [...events.value].reverse().find(e => e.type === 'task.confirmation.resolved')
      if (req && !res) pendingConfirmation.value = { id: req.data?.id, command: req.data?.command, reason: req.data?.reason, at: req.at }
    }
  }

  /** Load a task by ref and bind it (deep link / restore). */
  async function loadTask(taskRef) {
    const res = await api.get(`/agent/tasks/${taskRef}`)
    const task = res.data?.task
    if (task) await openTask(task)
    return { task, conversationId: res.data?.conversationId, events: res.data?.events || [] }
  }

  /** §17 — stop the running task (or reap a kept-alive preview). */
  async function stopTask(reason = 'Task stopped by the user') {
    if (!activeTask.value) return
    const res = await api.post(`/agent/tasks/${activeTask.value.task_ref}/stop`, { reason })
    // State settles via the task_cancelled event; optimistically mark it.
    if (activeTask.value && !ACTIVE_STATES.includes(activeTask.value.status)) {
      /* already terminal — the stop may have reaped the preview */
    }
    return res.data
  }

  /** §13 — approve or deny a high-risk command. */
  async function resolveConfirmation(approved) {
    const pc = pendingConfirmation.value
    if (!pc) return
    pendingConfirmation.value = null
    try {
      await api.post(`/agent/tasks/${activeTask.value.task_ref}/confirm`, { confirmationId: pc.id, approved })
    } catch (err) {
      // The confirmation may have expired — the task continues either way.
      console.warn('[Agent] confirmation failed:', err?.response?.data?.error)
    }
  }

  /** The user's recent tasks (workspace switcher / sidebar). */
  async function fetchTasks(limit = 20) {
    const res = await api.get('/agent/tasks', { params: { limit } })
    tasks.value = res.data?.tasks || []
    return tasks.value
  }

  /* ═══ V1.1: PROJECT ZIP DOWNLOAD (§8) ══════════════════════════
     Streams the REAL workspace archive from the backend. Loading,
     success and error states are surfaced honestly; a failure never
     fakes a download. */
  async function downloadTask() {
    const t = activeTask.value
    if (!t?.task_ref) throw new Error('No active task')
    downloadState.value = 'downloading'
    downloadError.value = null
    try {
      const res = await api.get(`/agent/tasks/${t.task_ref}/download`, { responseType: 'blob', timeout: 300000 })
      const blob = res.data
      if (!blob || blob.size === 0) throw new Error('The archive was empty.')
      // Filename from the real Content-Disposition header.
      const cd = String(res.headers?.['content-disposition'] || '')
      const m = cd.match(/filename="([^"]+)"/)
      const name = m?.[1] || 'agent-project.zip'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
      downloadState.value = 'done'
      setTimeout(() => { if (downloadState.value === 'done') downloadState.value = 'idle' }, 2500)
      return { name, size: blob.size }
    } catch (err) {
      downloadState.value = 'error'
      // Blob error bodies carry the honest backend message.
      let msg = err?.response?.data?.error || err?.message || 'The project archive could not be created.'
      if (err?.response?.data instanceof Blob) {
        try { msg = JSON.parse(await err.response.data.text())?.error || msg } catch {}
      }
      downloadError.value = msg
      throw new Error(msg)
    }
  }

  /* ═══ V1.1: capability discovery (the model chip is REAL) ═════ */
  async function fetchConfig() {
    try {
      const res = await api.get('/agent/config')
      agentConfig.value = res.data || null
    } catch { agentConfig.value = null }
    return agentConfig.value
  }

  /* ════════════════════════════════════════════════════════════
     WORKSPACE TAB DATA (§5, §6)
     ════════════════════════════════════════════════════════════ */

  async function fetchFiles() {
    if (!activeTask.value) return
    const res = await api.get(`/agent/tasks/${activeTask.value.task_ref}/files`)
    files.value = res.data || { entries: [], count: 0 }
  }

  async function readFile(path) {
    if (!activeTask.value) throw new Error('No active task')
    const res = await api.get(`/agent/tasks/${activeTask.value.task_ref}/file`, { params: { path } })
    return res.data // { path, content, size, modified }
  }

  async function writeFile(path, content, { create = false } = {}) {
    if (!activeTask.value) throw new Error('No active task')
    const res = await api.post(`/agent/tasks/${activeTask.value.task_ref}/file`, { path, content })
    await fetchFiles().catch(() => {})
    return res.data
  }

  async function editFile(path, content) {
    if (!activeTask.value) throw new Error('No active task')
    const res = await api.put(`/agent/tasks/${activeTask.value.task_ref}/file`, { path, content })
    await fetchFiles().catch(() => {})
    return res.data
  }

  async function deleteFile(path) {
    if (!activeTask.value) throw new Error('No active task')
    const res = await api.delete(`/agent/tasks/${activeTask.value.task_ref}/file`, { params: { path } })
    await fetchFiles().catch(() => {})
    return res.data
  }

  async function fetchChanges() {
    if (!activeTask.value) return
    const res = await api.get(`/agent/tasks/${activeTask.value.task_ref}/changes`)
    changes.value = res.data?.changes || []
  }

  async function fetchPreviewToken() {
    if (!activeTask.value?.preview?.port) { preview.status = 'offline'; return }
    try {
      const res = await api.get(`/agent/tasks/${activeTask.value.task_ref}/preview-token`)
      preview.token = res.data?.token || null
      preview.url = res.data?.url || null
      preview.port = res.data?.port || activeTask.value.preview.port
      preview.status = 'ready'
    } catch (err) {
      // Honest offline state (§24/§32) — never a fake iframe.
      preview.status = 'offline'
      preview.token = null
      preview.url = null
    }
  }

  /* ── Panel controls ───────────────────────────────────────── */
  function openPanel(tab = null) { if (tab) activeTab.value = tab; panelOpen.value = true }
  function closePanel() { panelOpen.value = false }
  function setTab(tab) { activeTab.value = tab }
  function setWidth(px) { panelWidth.value = Math.min(760, Math.max(360, px)) }

  /** New task ⇒ auto-approve does not carry over (per-task decision). */
  function resetAutoApprove() { autoApprove.value = false }

  /** Detach the workspace (keep socket wiring — cheap and harmless). */
  function clearTask() {
    activeTask.value = null
    events.value = []
    terminal.value = []
    files.value = { entries: [], count: 0 }
    changes.value = []
    pendingConfirmation.value = null
    preview.token = null; preview.url = null; preview.port = null; preview.status = 'offline'
    panelOpen.value = false
    lastSeq.value = 0
  }

  return {
    // state
    panelOpen, panelWidth, activeTab, activeTask, tasks, events, lastSeq,
    terminal, files, changes, preview, pendingConfirmation,
    agentConfig, autoApprove, downloadState, downloadError,
    // computed
    isActive, statusLabel, previewLive,
    // actions
    createTask, loadTask, openTask, stopTask, resolveConfirmation, fetchTasks,
    syncEvents, fetchFiles, readFile, writeFile, editFile, deleteFile,
    fetchChanges, fetchPreviewToken, downloadTask, fetchConfig, resetAutoApprove,
    openPanel, closePanel, setTab, setWidth, clearTask, bindSocket, unbindSocket,
  }
})
