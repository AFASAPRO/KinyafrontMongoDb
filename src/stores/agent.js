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

/* Which wire events update which tab (§15). V1.2 adds upload +
   web-research lifecycle events (§8–§10). */
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
  'task.upload.extracted', 'task.search.started', 'task.search.completed', 'task.search.failed',
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
  /* V1.2 §3: mode 'dev' (live dev server + port) | 'static' (workspace
     files served by the platform — available while the workspace
     exists) | null. */
  const preview = reactive({ token: null, url: null, port: null, mode: null, root: null, status: 'offline' })
  const pendingConfirmation = ref(null)

  /* ── V1.2 §8/§9: composer attachments (reference images + zip) ── */
  const referenceImages = ref([])      // [{id,name,size,mime,thumb}]
  const projectZip = ref(null)        // {id,name,size} | null
  const uploadState = ref('idle')      // idle | uploading | error | done
  const uploadError = ref(null)

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
  const previewLive = computed(() => !!(activeTask.value?.preview?.port || activeTask.value?.preview?.mode === 'static' || preview.mode === 'static'))

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
        /* V1.2 §3: dev-server previews carry a port; static previews
           carry mode/root and get a token immediately. */
        if (d.mode === 'static') {
          preview.mode = 'static'
          preview.root = d.root || null
          preview.status = 'ready'
          if (t.preview) { t.preview.mode = 'static'; t.preview.root = d.root || null; t.preview.kept_alive = true }
          else t.preview = { mode: 'static', root: d.root || null, kept_alive: true }
          refreshPreviewTokenSoon()
        } else {
          if (t.preview) { t.preview.port = d.port; t.preview.mode = 'dev'; t.preview.kept_alive = true }
          else t.preview = { port: d.port, mode: 'dev', kept_alive: true }
          preview.mode = 'dev'
          preview.port = d.port
          preview.status = 'ready'
          refreshPreviewTokenSoon()
        }
        break
      case 'task.preview.stopped':
        if (t.preview) { t.preview.port = null; t.preview.mode = null }
        preview.status = 'offline'
        preview.mode = null
        preview.token = null
        preview.url = null
        preview.port = null
        break
      /* V1.2 §9: uploaded project extracted — surfaced honestly. */
      case 'task.upload.extracted':
        terminal.value.push({
          kind: 'upload', at: evt.at,
          name: d.name, files: d.files, bytes: d.bytes,
          note: `existing project imported (${d.files} files)`,
          skippedSecrets: d.skippedSecrets || 0,
        })
        refreshFilesSoon()
        break
      /* V1.2 §10: web research is DISTINCT from code execution — the
         terminal labels research lines so researched facts can never
         be confused with real command output (§10 requirement). */
      case 'task.search.started':
        terminal.value.push({ kind: 'search', at: evt.at, query: d.query, note: 'researching the web' })
        break
      case 'task.search.completed':
        terminal.value.push({ kind: 'search', at: evt.at, query: d.query, results: d.results, note: `${d.results} result(s) — untrusted reference data` })
        break
      case 'task.search.failed':
        terminal.value.push({ kind: 'search', at: evt.at, query: d.query, note: 'web research unavailable — no results fetched' })
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
        /* V1.2 §3/§11: after completion the orchestrator may register a
           STATIC preview (its preview_ready event follows this one).
           Also probe once in case that event predates our binding. */
        refreshPreviewTokenSoon()
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

  /** Create + start an Agent task (§5). V1.2: attaches reference
   *  images and/or an uploaded project ZIP (§8/§9) when present. */
  async function createTask(prompt, conversationId = null, { referenceImageIds = [], projectZipId = null } = {}) {
    const body = { prompt }
    if (conversationId) body.conversationId = conversationId
    if (referenceImageIds?.length) body.referenceImageIds = referenceImageIds
    if (projectZipId) body.projectZipId = projectZipId
    const res = await api.post('/agent/tasks', body)
    const task = res.data?.task
    if (task) {
      tasks.value = [task, ...tasks.value.filter(t => t.id !== task.id)]
      // attachments were consumed by this task — clear the trays
      referenceImages.value = []
      projectZip.value = null
      uploadError.value = null
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
    /* V1.2 §3: preview mode survives refresh — a static preview is as
       live as a dev-server one (it is served from workspace files). */
    preview.mode = task.preview?.mode || null
    preview.root = task.preview?.root || null
    preview.port = task.preview?.port || null
    preview.status = (task.preview?.port || task.preview?.mode === 'static') ? 'ready' : 'offline'
    bindSocket()
    panelOpen.value = true
    await Promise.allSettled([
      syncEvents(task.task_ref),
      fetchFiles(),
      fetchChanges(),
      (task.preview?.port || task.preview?.mode === 'static') ? fetchPreviewToken() : Promise.resolve(),
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

  /* ═══ V1.1/V1.2: PROJECT ZIP DOWNLOAD (§8) ═══════════════════
     Streams the REAL workspace archive from the backend. Loading,
     success and error states are surfaced honestly; a failure never
     fakes a download.
     V1.2 hardening (§2/§32):
       • guards a missing task_ref/id BEFORE any request
       • verifies Content-Type AND the ZIP magic bytes before saving
         (an HTML error page can never be saved as a fake .zip)
       • parses JSON error blobs; an HTML body produces an explicit
         deployment diagnosis instead of the raw axios message. */
  async function downloadTask() {
    const t = activeTask.value
    const ref = t?.task_ref || t?.id
    if (!ref) throw new Error('No task is selected — nothing to download.')
    downloadState.value = 'downloading'
    downloadError.value = null
    try {
      const res = await api.get(`/agent/tasks/${ref}/download`, { responseType: 'blob', timeout: 300000 })
      const blob = res.data
      if (!blob || blob.size === 0) throw new Error('The archive was empty.')
      // §32: only a REAL zip is ever saved.
      const ctype = String(res.headers?.['content-type'] || '')
      const head = blob.slice(0, 4)
      const magic = new Uint8Array(await head.arrayBuffer())
      const isZip = magic[0] === 0x50 && magic[1] === 0x4b
      if (!isZip || (!ctype.includes('zip') && !ctype.includes('octet-stream'))) {
        throw new Error('The server did not return a valid ZIP archive — the download was refused instead of saving a broken file.')
      }
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
      let msg = err?.response?.data?.error || err?.message || 'The project archive could not be created.'
      if (err?.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text()
          try {
            msg = JSON.parse(text)?.error || msg
          } catch {
            // HTML body → the request never reached the Agent API:
            // give the user a REAL diagnosis, not the raw axios text.
            if (/^\s*</.test(text)) {
              msg = `The server answered with an HTML page (status ${err?.response?.status}) instead of the archive. ` +
                'The download request did not reach the Agent API — check that the deployed backend includes Agent V1.2 and that the API base URL is correct.'
            }
          }
        } catch {}
      } else if (err?.response?.status === 404 && !err?.response?.data?.error) {
        msg = 'The backend reported 404 for the download endpoint — the deployed backend may predate Agent V1.1. Deploy the updated backend and retry.'
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
    /* V1.2 §3: static previews (workspace files served by the platform)
       are as valid as dev-server ones — both produce a signed URL. */
    const t = activeTask.value
    if (!t?.task_ref) { preview.status = 'offline'; return }
    if (!t.preview?.port && t.preview?.mode !== 'static' && preview.mode !== 'static') {
      // No registered preview yet — the backend will engage a static
      // preview automatically if the workspace holds an index.html.
      // Probe it honestly: a 409 simply means "no preview yet".
    }
    try {
      const res = await api.get(`/agent/tasks/${t.task_ref}/preview-token`)
      preview.token = res.data?.token || null
      preview.url = res.data?.url || null
      preview.port = res.data?.port || null
      preview.mode = res.data?.mode || preview.mode
      preview.root = res.data?.root || preview.root
      if (t.preview) {
        if (res.data?.mode) t.preview.mode = res.data.mode
        if (res.data?.root) t.preview.root = res.data.root
        if (res.data?.port) t.preview.port = res.data.port
      }
      preview.status = 'ready'
    } catch (err) {
      // Honest offline state (§24/§32) — never a fake iframe.
      preview.status = 'offline'
      preview.token = null
      preview.url = null
    }
  }

  /* ═══ V1.2 §8/§9: ATTACHMENT UPLOADS ════════════════════════
     Reference images and existing-project ZIPs travel through the
     REAL backend endpoints (validated + ownership-checked there);
     the store only tracks what has been accepted by the server. */
  function _thumb(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => { resolve(url) }
      img.onerror = () => resolve(null)
      img.src = url
    })
  }

  async function uploadReferenceImage(file) {
    if (!agentConfig.value?.uploads?.enabled) {
      throw new Error('Reference-image uploads are disabled on this deployment.')
    }
    const max = agentConfig.value?.uploads?.imageMaxBytes || 6 * 1024 * 1024
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file?.type || '')) {
      throw new Error('Reference images must be PNG, JPEG, WebP or GIF files.')
    }
    if (file.size > max) {
      throw new Error(`That image is larger than the ${Math.round(max / 1048576)} MB limit.`)
    }
    const cap = agentConfig.value?.uploads?.maxReferenceImages || 4
    if (referenceImages.value.length >= cap) {
      throw new Error(`At most ${cap} reference images can be attached per task.`)
    }
    uploadState.value = 'uploading'; uploadError.value = null
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/agent/uploads/reference-image', form, {
        headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000,
      })
      const up = res.data?.upload
      if (!up) throw new Error('The upload was not accepted.')
      referenceImages.value.push({ ...up, thumb: await _thumb(file) })
      uploadState.value = 'done'
      setTimeout(() => { if (uploadState.value === 'done') uploadState.value = 'idle' }, 1500)
      return up
    } catch (err) {
      uploadState.value = 'error'
      uploadError.value = err?.response?.data?.error || err?.message || 'The image could not be uploaded.'
      throw new Error(uploadError.value)
    }
  }

  async function uploadProjectZip(file) {
    if (!agentConfig.value?.uploads?.enabled) {
      throw new Error('Project uploads are disabled on this deployment.')
    }
    const max = agentConfig.value?.uploads?.zipMaxBytes || 60 * 1024 * 1024
    if (!/\.zip$/i.test(file?.name || '') || file?.type && !/(zip|octet-stream)/.test(file.type)) {
      throw new Error('Project uploads must be .zip archives.')
    }
    if (file.size > max) {
      throw new Error(`That archive is larger than the ${Math.round(max / 1048576)} MB limit.`)
    }
    uploadState.value = 'uploading'; uploadError.value = null
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await api.post('/agent/uploads/project-zip', form, {
        headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000,
      })
      const up = res.data?.upload
      if (!up) throw new Error('The upload was not accepted.')
      projectZip.value = up   // one archive per task (replaces)
      uploadState.value = 'done'
      setTimeout(() => { if (uploadState.value === 'done') uploadState.value = 'idle' }, 1500)
      return up
    } catch (err) {
      uploadState.value = 'error'
      uploadError.value = err?.response?.data?.error || err?.message || 'The archive could not be uploaded.'
      throw new Error(uploadError.value)
    }
  }

  function removeReferenceImage(id) {
    const item = referenceImages.value.find(r => r.id === id)
    if (item?.thumb) URL.revokeObjectURL(item.thumb)
    referenceImages.value = referenceImages.value.filter(r => r.id !== id)
  }
  function removeProjectZip() { projectZip.value = null }

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
    preview.token = null; preview.url = null; preview.port = null; preview.mode = null; preview.root = null; preview.status = 'offline'
    panelOpen.value = false
    lastSeq.value = 0
  }

  return {
    // state
    panelOpen, panelWidth, activeTab, activeTask, tasks, events, lastSeq,
    terminal, files, changes, preview, pendingConfirmation,
    agentConfig, autoApprove, downloadState, downloadError,
    referenceImages, projectZip, uploadState, uploadError,
    // computed
    isActive, statusLabel, previewLive,
    // actions
    createTask, loadTask, openTask, stopTask, resolveConfirmation, fetchTasks,
    syncEvents, fetchFiles, readFile, writeFile, editFile, deleteFile,
    fetchChanges, fetchPreviewToken, downloadTask, fetchConfig, resetAutoApprove,
    uploadReferenceImage, uploadProjectZip, removeReferenceImage, removeProjectZip,
    openPanel, closePanel, setTab, setWidth, clearTask, bindSocket, unbindSocket,
  }
})
