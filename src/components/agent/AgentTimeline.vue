<template>
  <div class="ag-timeline ag-ui">
    <!-- ═══ THINKING STATE (reference ss1): globe + live subline ══ -->
    <div v-if="thinkingNow" class="ag-think" role="status" aria-live="polite">
      <AgentGlobe :size="52" live />
      <div class="ag-think-text">
        <span class="ag-think-title">Agent thinking<span class="dots" aria-hidden="true">..</span></span>
        <span class="ag-think-sub">{{ thinkingSubline }}</span>
      </div>
    </div>

    <!-- ═══ PLAN OVERVIEW CARD (reference ss2) ══════════════════ -->
    <AgentPlanCard v-if="task.plan?.length || task.status" />

    <!-- ═══ ACTIVITY ENTRIES (reference ss3) ════════════════════ -->
    <div v-for="(e, i) in entries" :key="e.key || i" class="ag-entry" :class="e.kind">
      <!-- FILE CHANGE CARD: breadcrumb + line-numbered code + gold
           "N lines changed" annotation (reference ss3 file card) -->
      <div v-if="e.kind === 'file'" class="ag-file">
        <div class="ag-file-head">
          <span class="ag-dot ok" aria-hidden="true"></span>
          <code class="ag-file-path">{{ e.path }}</code>
          <span class="ag-lang">{{ extOf(e.path) }}</span>
          <button class="ag-icon-btn ag-file-caret" :aria-expanded="e.open ? 'true' : 'false'" aria-label="Toggle file preview" @click="toggle(e)">
            <i class="fas" :class="e.open ? 'fa-chevron-up' : 'fa-chevron-down'" aria-hidden="true"></i>
          </button>
        </div>
        <div v-if="e.open" class="ag-code">
          <div class="ag-code-body">
            <div
              v-for="(ln, li) in e.codeLines.slice(0, 80)"
              :key="li"
              class="ag-code-line"
              :class="ln.t"
            >
              <span class="ag-code-ln">{{ ln.no }}</span>
              <span class="ag-code-tx" v-html="hl(ln.line, extOf(e.path))"></span>
            </div>
            <div v-if="e.codeLines.length > 80" class="ag-code-more">… {{ e.codeLines.length - 80 }} more lines</div>
          </div>
        </div>
        <div class="ag-file-meta">
          <span class="ag-flag" v-if="e.added || e.removed">
            <i class="fas fa-flag" aria-hidden="true"></i>
            {{ e.added ? `+${e.added}` : '' }}{{ e.removed ? ` −${e.removed}` : '' }} lines changed
          </span>
          <span class="ag-file-action">{{ e.action }}</span>
          <span class="ag-entry-time">{{ fmtTime(e.at) }}</span>
        </div>
      </div>

      <!-- COMMAND CARD: $ command + live status circle + output -->
      <div v-else-if="e.kind === 'cmd'" class="ag-cmd" :class="{ fail: termLine(e.id)?.exitCode != null && termLine(e.id).exitCode !== 0 }">
        <div class="ag-cmd-head">
          <span v-if="termLine(e.id)?.exitCode == null" class="ag-ring" aria-hidden="true"></span>
          <span v-else-if="termLine(e.id).exitCode === 0" class="ag-dot ok" aria-hidden="true"></span>
          <span v-else class="ag-dot err" aria-hidden="true"></span>
          <code class="ag-cmd-text">$ {{ e.command }}</code>
          <button
            v-if="termLine(e.id)?.output"
            class="ag-icon-btn ag-file-caret"
            :aria-expanded="e.open ? 'true' : 'false'"
            aria-label="Toggle command output"
            @click="toggle(e)"
          >
            <i class="fas" :class="e.open ? 'fa-chevron-up' : 'fa-chevron-down'" aria-hidden="true"></i>
          </button>
        </div>
        <pre v-if="e.open && termLine(e.id)?.output" class="ag-cmd-out">{{ termLine(e.id).output }}</pre>
        <div v-if="termLine(e.id)?.exitCode != null" class="ag-cmd-meta">
          <span :class="termLine(e.id).exitCode === 0 ? 'ok' : 'err'">exit {{ termLine(e.id).exitCode }}{{ termLine(e.id).timedOut ? ' (timed out)' : '' }}</span>
          <span v-if="termLine(e.id)?.durationMs != null">{{ fmtDur(termLine(e.id).durationMs) }}</span>
          <span class="ag-entry-time">{{ fmtTime(termLine(e.id).completedAt) }}</span>
        </div>
        <div v-else-if="termLine(e.id)" class="ag-cmd-meta"><span class="run">running…</span></div>
      </div>

      <!-- BACKGROUND SERVER (dev servers) -->
      <div v-else-if="e.kind === 'bg'" class="ag-cmd bg">
        <div class="ag-cmd-head">
          <span class="ag-dot warn" aria-hidden="true"></span>
          <code class="ag-cmd-text">$ {{ e.command }}</code>
          <span class="ag-lang">background</span>
        </div>
        <div class="ag-cmd-meta"><span>keeps running — output streams to the Terminal tab</span></div>
      </div>

      <!-- BLOCKED COMMAND (refused — never executed, §13) -->
      <div v-else-if="e.kind === 'blocked'" class="ag-cmd blocked">
        <div class="ag-cmd-head">
          <i class="fas fa-shield-halved ag-flag" aria-hidden="true"></i>
          <code class="ag-cmd-text">{{ e.command }}</code>
          <span class="ag-lang">refused</span>
        </div>
        <div class="ag-cmd-meta"><span>{{ e.reason }}</span></div>
      </div>

      <!-- VERIFICATION ROWS -->
      <div v-else-if="e.kind === 'verify_start'" class="ag-row">
        <span class="ag-ring" aria-hidden="true"></span>
        <i class="fas fa-gear fa-spin-slow" aria-hidden="true"></i>
        <span>Verifying its own work with real checks…</span>
      </div>
      <div v-else-if="e.kind === 'verify_done'" class="ag-row" :class="{ ok: e.verified, err: !e.verified }">
        <span class="ag-dot" :class="e.verified ? 'ok' : 'err'" aria-hidden="true"></span>
        <i class="fas" :class="e.verified ? 'fa-clipboard-check' : 'fa-triangle-exclamation'" aria-hidden="true"></i>
        <span>{{ e.verified ? 'Verified — ' : 'Issues found — ' }}{{ e.summary }}</span>
      </div>
      <div v-else-if="e.kind === 'repair'" class="ag-row warn">
        <span class="ag-dot warn" aria-hidden="true"></span>
        <i class="fas fa-wrench" aria-hidden="true"></i>
        <span>Fixing issues found in verification (round {{ e.cycle }})…</span>
      </div>

      <!-- PREVIEW READY ROW -->
      <div v-else-if="e.kind === 'preview'" class="ag-row preview">
        <span class="ag-dot ok" aria-hidden="true"></span>
        <i class="fas fa-eye" aria-hidden="true"></i>
        <span>Preview live on port {{ e.port }}</span>
        <button class="ag-chip-btn" @click="openPreview">Open preview</button>
      </div>

      <!-- COMPLETION ROW -->
      <div v-else-if="e.kind === 'done'" class="ag-row done">
        <span class="ag-dot ok" aria-hidden="true"></span>
        <i class="fas fa-circle-check" aria-hidden="true"></i>
        <span>Task completed{{ e.verified === false ? ' (unverified)' : '' }} — the full report follows as a message.</span>
        <button class="ag-chip-btn" @click="agent.downloadTask()" :disabled="agent.downloadState === 'downloading'">
          <i class="fas fa-file-zipper" aria-hidden="true"></i> Download .zip
        </button>
      </div>
      <div v-else-if="e.kind === 'failed'" class="ag-row" :class="e.code === 'AI_RATE_LIMIT' ? 'warn' : 'err'" role="alert">
        <span class="ag-dot" :class="e.code === 'AI_RATE_LIMIT' ? 'warn' : 'err'" aria-hidden="true"></span>
        <i class="fas" :class="e.code === 'AI_RATE_LIMIT' ? 'fa-clock' : 'fa-circle-xmark'" aria-hidden="true"></i>
        <span>{{ e.error }}</span>
      </div>
      <div v-else-if="e.kind === 'cancelled'" class="ag-row err">
        <span class="ag-dot err" aria-hidden="true"></span>
        <i class="fas fa-ban" aria-hidden="true"></i>
        <span>{{ e.reason || 'Task cancelled' }}</span>
      </div>
    </div>

    <!-- current activity line while running -->
    <div v-if="runningActivity" class="ag-row live" role="status">
      <span class="ag-ring" aria-hidden="true"></span>
      <span class="ag-row-text">{{ runningActivity }}</span>
    </div>
  </div>
</template>

<script setup>
/**
 * KinyaBot Agent V1.1 — Conversation Activity Timeline (reference ss3)
 * ─────────────────────────────────────────────────────────────────
 * Renders the agent's REAL work inside the conversation: file cards
 * with line-numbered code (from the real diff hunks), live command
 * cards (streamed stdout, true exit codes/durations), verification
 * rows, preview availability and honest completion/failure rows.
 * Every entry is derived from the persisted event stream — nothing
 * is simulated, and the whole timeline rebuilds after a refresh.
 */
import { computed, reactive } from 'vue'
import { useAgentStore } from '../../stores/agent'
import AgentGlobe from './AgentGlobe.vue'
import AgentPlanCard from './AgentPlanCard.vue'
import '../../assets/agent.css'

const agent = useAgentStore()
const task = computed(() => agent.activeTask || {})

/* ── thinking state (real: queued/planning phases from the engine) */
const thinkingNow = computed(() => ['queued', 'planning'].includes(task.value.status))
const thinkingSubline = computed(() => {
  switch (task.value.status) {
    case 'queued': return 'Waiting for a worker slot…'
    case 'planning': return 'Breaking the task into steps…'
    default: return 'Working'
  }
})

/* File entries render their CHANGED lines with real line numbers
   (hunks: {aStart,bStart,lines:[{t,line}]}, reference ss3). */
function codeLinesOf(hunks, cap = 400) {
  const lines = []
  for (const h of hunks || []) {
    let no = h.bStart || h.aStart || 1
    for (const l of h.lines || []) {
      if (l.t === '+') lines.push({ t: 'add', no: no++, line: l.line })
      else if (l.t === '-') lines.push({ t: 'del', no: no, line: l.line })
      else lines.push({ t: 'ctx', no: no++, line: l.line })
    }
  }
  return lines.slice(0, cap)
}

/* ── activity entries, folded from the REAL event stream ───────── */
const openState = reactive({})
const entries = computed(() => {
  const out = []
  const seen = new Set()
  for (const evt of agent.events || []) {
    const d = evt.data || {}
    switch (evt.type) {
      case 'task.file.changed': {
        const key = `f${evt.seq}`
        out.push({
          kind: 'file', key, at: evt.at,
          path: d.path || '(file)', action: d.action || 'changed',
          added: d.change?.added ?? 0, removed: d.change?.removed ?? 0,
          codeLines: codeLinesOf(d.change?.hunks),
          open: !!openState[key],
        })
        break
      }
      case 'task.terminal.started': {
        const key = `c${d.id}`
        out.push({ kind: 'cmd', key, id: d.id, command: d.command || '(command)', open: openState[key] !== false })
        break
      }
      case 'task.terminal.background_started':
        out.push({ kind: 'bg', key: `g${evt.seq}`, command: d.command, pid: d.pid })
        break
      case 'task.terminal.blocked':
        out.push({ kind: 'blocked', key: `k${evt.seq}`, command: d.command, reason: d.reason })
        break
      case 'task.verification.started':
        out.push({ kind: 'verify_start', key: `vs${evt.seq}` })
        break
      case 'task.verification.completed':
        out.push({ kind: 'verify_done', key: `vd${evt.seq}`, verified: !!d.verified, summary: d.summary || '' })
        break
      case 'task.repair.started':
        out.push({ kind: 'repair', key: `r${evt.seq}`, cycle: d.cycle })
        break
      case 'task.preview.ready':
        if (!seen.has('preview')) { seen.add('preview'); out.push({ kind: 'preview', key: 'preview', port: d.port }) }
        break
      case 'task.completed':
        out.push({ kind: 'done', key: 'done', verified: d.verified })
        break
      case 'task.failed':
        out.push({ kind: 'failed', key: 'failed', error: d.error || 'The task failed.', code: d.code })
        break
      case 'task.cancelled':
        out.push({ kind: 'cancelled', key: 'cancelled', reason: d.reason })
        break
    }
  }
  return out
})

/* Toggle open state without rebuilding the whole list. */
function toggle(e) { openState[e.key] = !e.open }

/* ── live lookups (methods re-evaluate with the store) ─────────── */
function termLine(id) { return (agent.terminal || []).find(l => l.id === id) }

/* ── current activity line (last meaningful event, real) ───────── */
const ACTIVITY_TYPES = new Set([
  'task.planning', 'task.plan_updated', 'task.tool.started', 'task.terminal.started',
  'task.terminal.completed', 'task.file.changed', 'task.verification.started',
  'task.verification.completed', 'task.preview.ready',
])
const runningActivity = computed(() => {
  if (!agent.isActive || agent.pendingConfirmation || thinkingNow.value) return null
  const recent = [...(agent.events || [])].reverse()
  const e = recent.find(ev => ACTIVITY_TYPES.has(ev.type))
  if (!e) return 'Starting up…'
  const d = e.data || {}
  switch (e.type) {
    case 'task.planning': return 'Planning the approach…'
    case 'task.plan_updated': return `${(d.steps || []).length}-step plan ready`
    case 'task.tool.started': return `Running ${d.name}`
    case 'task.terminal.started': return `$ ${String(d.command || '').slice(0, 72)}`
    case 'task.terminal.completed': return `Command finished (exit ${d.exitCode})`
    case 'task.file.changed': return `${d.action} ${d.path}`
    case 'task.verification.started': return 'Verifying its own work…'
    case 'task.verification.completed': return d.verified ? 'Verification passed' : 'Fixing issues found in verification'
    case 'task.preview.ready': return `Preview live on port ${d.port}`
    default: return null
  }
})

/* ── helpers ─────────────────────────────────────────────────── */
function extOf(p) {
  const ext = String(p || '').split('.').pop() || ''
  return ext.toLowerCase().slice(0, 5)
}

const KEYWORDS = /\b(const|let|var|function|return|if|else|for|while|import|from|export|async|await|class|new|try|catch|throw|typeof|def|print|public|private|static|void|int|string|bool|true|false|null|undefined)\b/g

/** Tiny, safe syntax tinting: escape first, then mark strings /
    comments / keywords. Never invents content — pure presentation. */
function hl(line, ext) {
  let s = String(line ?? '')
  s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  if (/^(#|\/\/|--)/.test(s)) return `<span class="tk-cm">${s}</span>`
  s = s.replace(/(&quot;|"|')(?:[^&"']|&(?!quot;))*?\1/g, m => `<span class="tk-st">${m}</span>`)
  s = s.replace(KEYWORDS, m => `<span class="tk-kw">${m}</span>`)
  return s
}

function fmtTime(at) {
  try { return new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
function fmtDur(ms) {
  if (ms == null) return ''
  if (ms < 1000) return ms + 'ms'
  if (ms < 60_000) return (ms / 1000).toFixed(1) + 's'
  return Math.floor(ms / 60000) + 'm ' + Math.round((ms % 60000) / 1000) + 's'
}

function openPreview() { agent.openPanel('preview') }

defineExpose({ toggle })
</script>

<style scoped>
.ag-timeline {
  max-width: 680px;
  display: flex; flex-direction: column; gap: 14px;
  margin: 6px 0 18px;
}

/* ── thinking (reference ss1) ─────────────────────────────────── */
.ag-think {
  display: flex; align-items: center; gap: 18px;
  padding: 8px 4px;
}
.ag-think-text { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.ag-think-title { font-size: 19px; font-weight: 600; color: #e8e8ea; }
.ag-think-title .dots::after { content: ''; animation: ag-dots 1.6s steps(4) infinite; }
@keyframes ag-dots { 0% { content: '' } 25% { content: '.' } 50% { content: '..' } 75% { content: '...' } }
.ag-think-sub { font-size: 13px; color: var(--ag-text-3); }

/* ── generic entry ───────────────────────────────────────────── */
.ag-entry { animation: ag-in .22s ease; }
@keyframes ag-in { from { opacity: 0; transform: translateY(5px) } to { opacity: 1; transform: none } }

/* ── file card (reference ss3 code block) ────────────────────── */
.ag-file {
  background: var(--ag-card);
  border: 1px solid var(--ag-border);
  border-radius: var(--ag-r-sm);
  overflow: hidden;
}
.ag-file-head {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 8px 8px 12px;
  background: var(--ag-code-head);
  border-bottom: 1px solid var(--ag-border);
}
.ag-file-path {
  font-family: var(--ag-mono); font-size: 12px; color: #d4d4d4;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;
}
.ag-file-caret { width: 26px; height: 26px; margin-left: auto; }
.ag-file-meta {
  display: flex; align-items: center; gap: 12px;
  padding: 6px 12px;
  font-size: 11.5px; color: var(--ag-text-3);
  border-top: 1px solid var(--ag-border);
}
.ag-file-meta .ag-flag { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; }
.ag-file-meta .ag-flag i { font-size: 9px; }
.ag-file-action { text-transform: capitalize; }
.ag-entry-time { margin-left: auto; }
.ag-code-more { padding: 4px 12px 8px; color: var(--ag-text-3); font-size: 11.5px; font-family: var(--ag-mono); }

/* ── command card ────────────────────────────────────────────── */
.ag-cmd {
  background: var(--ag-card);
  border: 1px solid var(--ag-border);
  border-left: 2px solid var(--ag-border-2);
  border-radius: var(--ag-r-sm);
  overflow: hidden;
}
.ag-cmd.fail { border-left-color: var(--ag-danger); }
.ag-cmd.bg { border-left-color: var(--ag-warn); }
.ag-cmd.blocked { border-left-color: var(--ag-gold); }
.ag-cmd-head {
  display: flex; align-items: center; gap: 9px;
  padding: 9px 8px 9px 12px;
}
.ag-cmd-text {
  font-family: var(--ag-mono); font-size: 12.5px; color: #e4e4e7;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1;
}
.ag-cmd-out {
  margin: 0; padding: 10px 12px; max-height: 260px; overflow: auto;
  background: var(--ag-code-bg);
  border-top: 1px solid var(--ag-border);
  font-family: var(--ag-mono); font-size: 12px; line-height: 1.55;
  color: #c8c8ca; white-space: pre-wrap; word-break: break-word;
}
.ag-cmd-meta {
  display: flex; align-items: center; gap: 12px;
  padding: 5px 12px;
  font-family: var(--ag-mono); font-size: 11px; color: var(--ag-text-3);
  border-top: 1px solid var(--ag-border);
}
.ag-cmd-meta .ok { color: var(--ag-accent-2); }
.ag-cmd-meta .err { color: #f87171; }
.ag-cmd-meta .run { color: var(--ag-accent-2); }

/* ── status rows (verification / preview / completion) ────────── */
.ag-row {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 12px;
  background: var(--ag-card);
  border: 1px solid var(--ag-border);
  border-radius: var(--ag-r-sm);
  font-size: 13px; color: var(--ag-text-2);
  flex-wrap: wrap;
}
.ag-row i { font-size: 12px; color: var(--ag-text-3); }
.ag-row.ok { border-color: rgba(16,185,129,.3); }
.ag-row.ok i { color: var(--ag-accent-2); }
.ag-row.err { border-color: rgba(239,68,68,.3); }
.ag-row.err i { color: #f87171; }
.ag-row.warn i { color: var(--ag-warn); }
.ag-row.preview i { color: var(--ag-accent-2); }
.ag-row.done i { color: var(--ag-accent-2); }
.ag-row.live { border-style: dashed; color: var(--ag-text-2); }
.ag-row-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; }

.ag-chip-btn {
  margin-left: auto;
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,.06); color: var(--ag-text);
  border: 1px solid var(--ag-border-2);
  border-radius: 999px; padding: 5px 12px;
  font-size: 12px; font-weight: 600; cursor: pointer;
  transition: background .12s;
}
.ag-chip-btn:hover { background: rgba(255,255,255,.1); }
.ag-chip-btn:disabled { opacity: .5; cursor: default; }

.fa-spin-slow { animation: ag-spin 2.4s linear infinite; }

/* syntax tinting tokens (reference ss3: blue keywords, orange strings) */
.ag-timeline :deep(.tk-kw) { color: #569cd6; }
.ag-timeline :deep(.tk-st) { color: #ce9178; }
.ag-timeline :deep(.tk-cm) { color: #6a9955; }

@media (max-width: 560px) {
  .ag-timeline { gap: 10px; }
  .ag-think { gap: 13px; }
  .ag-think-title { font-size: 16.5px; }
  .ag-chip-btn { margin-left: 0; }
}
</style>
