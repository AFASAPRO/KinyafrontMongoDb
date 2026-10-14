<template>
  <div class="ag-plan ag-ui" :class="statusClass" role="section" aria-label="Plan overview">
    <!-- ═══ HEADER: icon · title · download/expand (reference ss2) ═ -->
    <div class="ap-head">
      <div class="ap-head-left">
        <span class="ap-ic"><i class="fas fa-list-check" aria-hidden="true"></i></span>
        <h3 class="ap-head-title">Plan Overview</h3>
      </div>
      <div class="ap-head-actions">
        <button class="ag-icon-btn" title="Download the plan as Markdown" aria-label="Download plan" @click="downloadPlan">
          <i class="fas fa-arrow-down-to-line" aria-hidden="true"></i>
        </button>
        <button class="ag-icon-btn" :title="expanded ? 'Collapse card' : 'Expand card'" aria-label="Toggle card size" @click="expanded = !expanded">
          <i class="fas" :class="expanded ? 'fa-arrows-minimize' : 'fa-arrow-up-right-from-square'" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <!-- ═══ BODY: session title + description ═══════════════════ -->
    <div class="ap-body">
      <h4 class="ap-title">{{ task.title || task.prompt || 'Agent task' }}</h4>
      <p class="ap-desc">{{ description }}</p>
    </div>

    <!-- ═══ TO-DOS: nested container with count + radio bullets ═ -->
    <div v-if="todos.length" class="ap-todos">
      <div class="ap-todos-head">
        <i class="fas fa-list-ul" aria-hidden="true"></i>
        <span class="ap-todos-label">To-dos</span>
        <span class="ap-todos-count">{{ todos.length }}</span>
      </div>
      <ul class="ap-todo-list">
        <li
          v-for="(t, i) in visibleTodos"
          :key="i"
          class="ap-todo"
          :class="t.status"
        >
          <span class="ap-todo-bullet" aria-hidden="true">
            <i v-if="t.status === 'done'" class="fas fa-check"></i>
            <span v-else-if="t.status === 'in_progress'" class="ag-ring" style="--ring-size:11px"></span>
          </span>
          <span class="ap-todo-text">{{ t.title }}</span>
        </li>
        <li v-if="hiddenCount > 0" class="ap-todo-more">
          <button type="button" @click="showAll = true">… {{ hiddenCount }} more</button>
        </li>
        <li v-else-if="showAll && hiddenCount === 0 && todos.length > 3" class="ap-todo-more">
          <button type="button" @click="showAll = false">Show less</button>
        </li>
      </ul>
    </div>

    <!-- ═══ LIVE STATS (real counters from the worker) ══════════ -->
    <div v-if="hasStats" class="ap-stats">
      <span v-if="task.stats?.tool_calls != null"><i class="fas fa-screwdriver-wrench" aria-hidden="true"></i>{{ task.stats.tool_calls }} tools</span>
      <span v-if="task.stats?.commands_run != null"><i class="fas fa-terminal" aria-hidden="true"></i>{{ task.stats.commands_run }} commands</span>
      <span v-if="task.stats?.files_changed != null"><i class="fas fa-file-pen" aria-hidden="true"></i>{{ task.stats.files_changed }} files</span>
      <span v-if="durationLabel"><i class="fas fa-clock" aria-hidden="true"></i>{{ durationLabel }}</span>
    </div>

    <!-- ═══ CONFIRMATION (§13): the command waiting for approval ═ -->
    <div v-if="agent.pendingConfirmation" class="ap-confirm" role="alertdialog" aria-live="assertive">
      <div class="apc-head">
        <i class="fas fa-shield-halved" aria-hidden="true"></i>
        <strong>Approval needed</strong>
      </div>
      <p class="apc-reason">{{ agent.pendingConfirmation.reason }}</p>
      <code class="apc-cmd">{{ agent.pendingConfirmation.command }}</code>
      <div class="apc-actions">
        <button class="ag-btn danger-ghost" @click="agent.resolveConfirmation(false)">Deny</button>
        <button class="ag-btn primary" @click="agent.resolveConfirmation(true)">
          Approve <i class="fas fa-corner-down-left" aria-hidden="true"></i>
        </button>
      </div>
      <p class="apc-note">The Agent is paused until you decide. Denying is safe — it will try another approach.</p>
    </div>

    <!-- ═══ FAILURE / CANCEL banners (honest, §32) ══════════════ -->
    <div
      v-if="task.status === 'failed'"
      class="ap-banner"
      :class="task.error_code === 'AI_RATE_LIMIT' ? 'rate-limit' : 'err'"
      role="alert"
    >
      <i class="fas" :class="task.error_code === 'AI_RATE_LIMIT' ? 'fa-clock' : 'fa-circle-exclamation'" aria-hidden="true"></i>
      <div>
        <strong>{{ task.error_code === 'AI_RATE_LIMIT' ? 'AI usage limit reached' : 'Task failed' }}</strong>
        <p>{{ task.error || 'The task failed.' }}</p>
      </div>
    </div>
    <div v-else-if="task.status === 'cancelled'" class="ap-banner warn">
      <i class="fas fa-ban" aria-hidden="true"></i>
      <div><strong>Task cancelled</strong><p>{{ task.error || 'Stopped by the user. Partial work remains in the workspace.' }}</p></div>
    </div>

    <!-- ═══ FOOTER: status · actions (reference layout) ═════════ -->
    <div class="ap-foot">
      <div class="ap-foot-status" :class="statusClass">
        <span v-if="isActive" class="ag-ring" aria-hidden="true"></span>
        <span v-else-if="task.status === 'completed'" class="ap-foot-check" aria-hidden="true"><i class="fas fa-check"></i></span>
        <span v-else class="ag-dot" :class="task.status === 'failed' || task.status === 'cancelled' ? 'err' : 'idle'" aria-hidden="true"></span>
        <span>{{ statusText }}</span>
      </div>
      <div class="ap-foot-actions">
        <button class="ag-btn secondary" @click="expanded = !expanded">
          {{ expanded ? 'Hide plan' : 'View Plan' }}
        </button>
        <button v-if="isActive" class="ag-btn stop" @click="confirmStop">
          <i class="fas fa-stop" aria-hidden="true"></i> Stop
        </button>
        <button
          v-if="['completed', 'failed', 'cancelled'].includes(task.status)"
          class="ag-btn primary"
          :disabled="agent.downloadState === 'downloading'"
          @click="agent.downloadTask()"
        >
          <i class="fas" :class="agent.downloadState === 'downloading' ? 'fa-spinner fa-spin' : 'fa-file-zipper'" aria-hidden="true"></i>
          {{ agent.downloadState === 'downloading' ? 'Packaging…' : 'Download .zip' }}
        </button>
      </div>
    </div>

    <!-- download error toast (honest failures only) -->
    <div v-if="agent.downloadState === 'error'" class="ap-dl-err" role="alert">
      <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
      {{ agent.downloadError || 'The archive could not be created.' }}
    </div>
  </div>
</template>

<script setup>
/**
 * KinyaBot Agent V1.1 — Plan Overview Card (reference screenshot 2)
 * ─────────────────────────────────────────────────────────────────
 * Reproduces the reference's plan card: icon header with download +
 * expand actions, session title + description, nested "To-dos"
 * container with radio bullets and a "... N more" expander, and a
 * footer with a live status indicator and contextual action buttons.
 *
 * Everything rendered is REAL: to-dos come from the persisted task
 * plan (§16 — milestones only), stats from the worker's counters,
 * the confirmation card from the live §13 confirmation request, and
 * the buttons call the real stop / confirm / download APIs.
 */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAgentStore } from '../../stores/agent'
import '../../assets/agent.css'

const agent = useAgentStore()
const task = computed(() => agent.activeTask || {})
const expanded = ref(false)
const showAll = ref(false)

const isActive = computed(() => ['queued', 'planning', 'running', 'waiting_for_confirmation', 'paused'].includes(task.value.status))
const statusClass = computed(() => `st-${task.value.status || 'idle'}`)

const todos = computed(() => task.value.plan || [])
const visibleTodos = computed(() => (expanded.value || showAll.value ? todos.value : todos.value.slice(0, 3)))
const hiddenCount = computed(() => Math.max(0, todos.value.length - 3))

const description = computed(() => {
  const p = String(task.value.prompt || '')
  const first = p.split(/(?<=[.!?])\s/)[0] || p
  return first.length > 160 ? first.slice(0, 157) + '…' : first
})

const hasStats = computed(() => {
  const s = task.value.stats || {}
  return s.tool_calls != null || s.commands_run != null || s.files_changed != null
})

/* Elapsed from the server's own timestamps (honest timer). */
const now = ref(Date.now())
let timer = null
onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => clearInterval(timer))
const durationLabel = computed(() => {
  const t = task.value
  if (!t?.started_at) return ''
  const end = t.completed_at ? new Date(t.completed_at).getTime() : now.value
  const ms = end - new Date(t.started_at).getTime()
  if (!Number.isFinite(ms) || ms < 0) return ''
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
})

const statusText = computed(() => {
  const t = task.value
  if (agent.pendingConfirmation) return 'Waiting for your approval'
  switch (t.status) {
    case 'queued': return 'Queued…'
    case 'planning': return 'Planning the approach'
    case 'running': {
      const done = todos.value.filter(s => s.status === 'done').length
      return todos.value.length ? `Executing · ${Math.min(done + 1, todos.value.length)} of ${todos.value.length}` : 'Executing'
    }
    case 'paused': return 'Paused'
    case 'completed': return t.verified !== false ? `Completed${durationLabel.value ? ' · ' + durationLabel.value : ''}` : 'Completed (unverified)'
    case 'failed': return 'Failed'
    case 'cancelled': return 'Cancelled'
    default: return ''
  }
})

async function confirmStop() {
  if (!window.confirm('Stop this task? The agent will finish the current step and stop.')) return
  try { await agent.stopTask() } catch { /* state settles via events */ }
}

/* Download the plan itself as a small Markdown file (real export). */
function downloadPlan() {
  const t = task.value
  const lines = [
    `# ${t.title || 'Agent task'}`,
    '',
    `Task: ${t.prompt || ''}`,
    `Status: ${t.status || ''}`,
    '',
    '## Plan',
    ...(todos.value.map((s, i) => `- [${s.status === 'done' ? 'x' : ' '}] ${i + 1}. ${s.title}`)),
  ]
  if (t.result) lines.push('', '## Result', '', String(t.result))
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'agent-plan.md'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.ag-plan {
  max-width: 620px;
  background: var(--ag-card);
  border: 1px solid var(--ag-border);
  border-radius: var(--ag-r-lg);
  box-shadow: 0 12px 40px rgba(0,0,0,.35);
  padding: 18px 18px 16px;
  display: flex; flex-direction: column; gap: 14px;
}
.st-running, .st-planning, .st-queued { border-color: rgba(16,185,129,.28); }
.st-completed { border-color: rgba(16,185,129,.35); }
.st-failed, .st-cancelled { border-color: rgba(239,68,68,.3); }
.st-waiting_for_confirmation { border-color: rgba(245,158,11,.35); }

/* ── header ─────────────────────────────────────────────────── */
.ap-head { display: flex; align-items: center; justify-content: space-between; }
.ap-head-left { display: flex; align-items: center; gap: 10px; }
.ap-ic {
  width: 32px; height: 32px; border-radius: 9px;
  display: grid; place-items: center;
  background: #062f22; color: var(--ag-accent-2);
  font-size: 13px;
}
.ap-head-title { margin: 0; font-size: 15px; font-weight: 600; letter-spacing: .01em; }
.ap-head-actions { display: flex; gap: 2px; }

/* ── body ───────────────────────────────────────────────────── */
.ap-title { margin: 0; font-size: 19px; font-weight: 700; line-height: 1.3; color: var(--ag-text); }
.ap-desc { margin: 6px 0 0; font-size: 13.5px; line-height: 1.55; color: var(--ag-text-2); }

/* ── to-dos (nested darker container, reference ss2) ─────────── */
.ap-todos {
  background: var(--ag-nested);
  border: 1px solid var(--ag-border);
  border-radius: var(--ag-r);
  padding: 12px 14px;
}
.ap-todos-head { display: flex; align-items: center; gap: 8px; margin-bottom: 9px; }
.ap-todos-head i { color: var(--ag-text-2); font-size: 12px; }
.ap-todos-label { font-size: 13px; font-weight: 700; }
.ap-todos-count { margin-left: auto; font-size: 12.5px; color: var(--ag-text-3); font-family: var(--ag-mono); }
.ap-todo-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.ap-todo { display: flex; align-items: center; gap: 10px; }
.ap-todo-bullet {
  width: 15px; height: 15px; flex-shrink: 0;
  border-radius: 50%;
  border: 1.5px solid var(--ag-border-2);
  display: grid; place-items: center;
  color: #062f22; font-size: 8px;
}
.ap-todo.done .ap-todo-bullet { background: var(--ag-accent); border-color: var(--ag-accent); color: #04150e; }
.ap-todo-text { font-size: 13.5px; color: var(--ag-text-2); }
.ap-todo.done .ap-todo-text { color: var(--ag-text-3); text-decoration: line-through; text-decoration-color: rgba(161,161,170,.35); }
.ap-todo.in_progress .ap-todo-text { color: var(--ag-text); font-weight: 500; }
.ap-todo-more button {
  background: none; border: none; padding: 0;
  color: var(--ag-text-2); font-size: 13px; font-weight: 600; cursor: pointer;
}
.ap-todo-more button:hover { color: var(--ag-text); }

/* ── stats strip ────────────────────────────────────────────── */
.ap-stats {
  display: flex; flex-wrap: wrap; gap: 14px;
  font-family: var(--ag-mono); font-size: 11.5px; color: var(--ag-text-3);
}
.ap-stats span { display: inline-flex; align-items: center; gap: 6px; }
.ap-stats i { font-size: 10px; }

/* ── confirmation (§13) ─────────────────────────────────────── */
.ap-confirm {
  border: 1px solid rgba(245,158,11,.4);
  background: rgba(245,158,11,.06);
  border-radius: var(--ag-r);
  padding: 12px 14px;
}
.apc-head { display: flex; align-items: center; gap: 8px; color: var(--ag-warn); font-size: 13px; margin-bottom: 7px; }
.apc-reason { margin: 0 0 8px; font-size: 12.5px; color: var(--ag-text-2); }
.apc-cmd {
  display: block; padding: 8px 11px; margin-bottom: 11px;
  background: var(--ag-code-bg); border: 1px solid var(--ag-border);
  border-radius: var(--ag-r-sm);
  color: #e4e4e7; font-family: var(--ag-mono); font-size: 12px;
  word-break: break-all; white-space: pre-wrap;
}
.apc-actions { display: flex; gap: 9px; justify-content: flex-end; }
.apc-note { margin: 10px 0 0; font-size: 11.5px; color: var(--ag-text-3); }

/* ── banners ────────────────────────────────────────────────── */
.ap-banner { display: flex; gap: 10px; padding: 11px 13px; border-radius: var(--ag-r); font-size: 13px; }
.ap-banner i { margin-top: 2px; }
.ap-banner strong { display: block; font-size: 13px; margin-bottom: 2px; }
.ap-banner p { margin: 0; font-size: 12.5px; color: var(--ag-text-2); line-height: 1.5; }
.ap-banner.err  { background: rgba(239,68,68,.07);  color: #f87171; border: 1px solid rgba(239,68,68,.25); }
.ap-banner.rate-limit { background: rgba(245,158,11,.06); color: var(--ag-warn); border: 1px solid rgba(245,158,11,.25); }
.ap-banner.warn { background: rgba(245,158,11,.06); color: var(--ag-warn); border: 1px solid rgba(245,158,11,.25); }

/* ── footer (reference ss2 layout) ──────────────────────────── */
.ap-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  flex-wrap: wrap;
  padding-top: 13px;
  border-top: 1px solid var(--ag-border);
}
.ap-foot-status {
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px; color: var(--ag-text-2);
  min-width: 0;
}
.ap-foot-status.st-running, .ap-foot-status.st-planning, .ap-foot-status.st-queued { color: var(--ag-accent-2); }
.ap-foot-status.st-completed { color: var(--ag-accent-2); }
.ap-foot-status.st-waiting_for_confirmation { color: var(--ag-warn); }
.ap-foot-status.st-failed, .ap-foot-status.st-cancelled { color: #f87171; }
.ap-foot-check {
  width: 15px; height: 15px; border-radius: 50%;
  background: var(--ag-accent); color: #04150e;
  display: grid; place-items: center; font-size: 8px;
}
.ap-foot-actions { display: flex; gap: 9px; flex-wrap: wrap; }

.ap-dl-err {
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px; color: #f87171;
  background: rgba(239,68,68,.08);
  border: 1px solid rgba(239,68,68,.3);
  border-radius: var(--ag-r-sm);
  padding: 8px 11px;
}

@media (max-width: 560px) {
  .ag-plan { padding: 14px 14px 12px; border-radius: 16px; }
  .ap-title { font-size: 16.5px; }
  .ap-foot { flex-direction: column; align-items: stretch; }
  .ap-foot-actions { justify-content: stretch; }
  .ap-foot-actions .ag-btn { flex: 1; }
}
</style>
