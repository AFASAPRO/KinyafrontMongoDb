<template>
  <div class="ag-card" :class="{ live: agent.isActive, done: task.status === 'completed' }">
    <!-- ═══ CARD HEAD ═════════════════════════════════════════ -->
    <div class="ac-top">
      <span class="ac-ic" :class="{ live: agent.isActive }">
        <i class="fas fa-robot" aria-hidden="true"></i>
      </span>
      <div class="ac-meta">
        <span class="ac-label">Agent task</span>
        <span class="ac-status" :class="statusClass">
          <i v-if="agent.isActive" class="fas fa-circle-play" aria-hidden="true"></i>
          <i v-else-if="task.status === 'completed'" class="fas fa-circle-check" aria-hidden="true"></i>
          <i v-else class="fas fa-circle-xmark" aria-hidden="true"></i>
          {{ agent.statusLabel }}
        </span>
      </div>
      <button class="ac-open" @click="agent.openPanel()">
        <i class="fas fa-table-columns" aria-hidden="true"></i>
        <span>Workspace</span>
      </button>
    </div>

    <!-- ═══ PROGRESS BAR (honest: steps executed / plan length) ═ -->
    <div v-if="agent.isActive || task.status === 'completed'" class="ac-progress">
      <div class="ac-bar"><div class="ac-fill" :style="{ width: progressPct + '%' }"></div></div>
      <span class="ac-pct dim">{{ progressPct }}%</span>
    </div>

    <!-- ═══ CURRENT ACTIVITY (§16, last meaningful event) ══════ -->
    <div v-if="currentActivity" class="ac-activity">
      <i class="fas fa-bolt" aria-hidden="true"></i>
      <span class="ac-act-text">{{ currentActivity }}</span>
    </div>

    <!-- ═══ MINI STATS ════════════════════════════════════════ -->
    <div v-if="task.stats && anyStats" class="ac-stats">
      <span v-if="task.stats.tool_calls"><i class="fas fa-screwdriver-wrench" aria-hidden="true"></i>{{ task.stats.tool_calls }} tool calls</span>
      <span v-if="task.stats.commands_run"><i class="fas fa-terminal" aria-hidden="true"></i>{{ task.stats.commands_run }} commands</span>
      <span v-if="task.stats.files_changed"><i class="fas fa-file-pen" aria-hidden="true"></i>{{ task.stats.files_changed }} files changed</span>
      <span v-if="task.preview?.port" class="pv"><i class="fas fa-eye" aria-hidden="true"></i>preview live</span>
    </div>

    <!-- ═══ RESULT (§26: mirrored message follows separately) ═ -->
    <div v-if="task.status === 'completed' && task.verified !== false" class="ac-verified">
      <i class="fas fa-clipboard-check" aria-hidden="true"></i> Verified by re-running real checks
    </div>
  </div>
</template>

<script setup>
/**
 * KinyaBot Agent V1 — Live Task Card (§16, §26)
 * Renders INSIDE the conversation while an Agent task is bound to
 * it: honest status, plan progress, the current high-level activity
 * (never chain-of-thought) and the door to the full workspace.
 * The final result arrives as a normal assistant message (§26).
 */
import { computed } from 'vue'
import { useAgentStore } from '../../stores/agent'

const agent = useAgentStore()
const task = computed(() => agent.activeTask || {})

const statusClass = computed(() => ({
  queued: 'st-muted', planning: 'st-cyan', running: 'st-cyan',
  waiting_for_confirmation: 'st-warn', paused: 'st-muted',
  completed: 'st-ok', failed: 'st-err', cancelled: 'st-err',
}[task.value.status] || 'st-muted'))

const progressPct = computed(() => {
  const plan = task.value.plan || []
  if (!plan.length) return agent.isActive ? 8 : 100
  const done = plan.filter(s => s.status === 'done').length
  return Math.round((done / plan.length) * 100)
})

const anyStats = computed(() => {
  const s = task.value.stats || {}
  return s.tool_calls || s.commands_run || s.files_changed
})

/* The last MEANINGFUL event → one line of "what is it doing now". */
const currentActivity = computed(() => {
  if (!agent.isActive) {
    if (task.value.status === 'failed') return task.value.error
    return null
  }
  const recent = [...agent.events].reverse()
  const e = recent.find(ev => ACTIVITY_TYPES.has(ev.type))
  if (!e) return 'Starting up…'
  const d = e.data || {}
  switch (e.type) {
    case 'task.planning': return 'Planning the approach…'
    case 'task.plan_updated': return `${(d.steps || []).length}-step plan ready`
    case 'task.tool.started': return `Running ${d.name}`
    case 'task.terminal.started': return `$ ${String(d.command || '').slice(0, 60)}`
    case 'task.terminal.completed': return `Command finished (exit ${d.exitCode})`
    case 'task.file.changed': return `${d.action} ${d.path}`
    case 'task.verification.started': return 'Verifying its own work…'
    case 'task.verification.completed': return d.verified ? 'Verification passed' : 'Fixing issues found in verification'
    case 'task.preview.ready': return `Preview live on port ${d.port}`
    case 'task.tool.completed': return null // too generic — skip to older
    default: return null
  }
})
const ACTIVITY_TYPES = new Set([
  'task.planning', 'task.plan_updated', 'task.tool.started', 'task.terminal.started',
  'task.terminal.completed', 'task.file.changed', 'task.verification.started',
  'task.verification.completed', 'task.preview.ready',
])
</script>

<style scoped>
.ag-card {
  max-width: 560px;
  margin: 2px 0 10px;
  border: 1px solid var(--border);
  border-radius: var(--r, 12px);
  background: var(--surface-secondary, #111827);
  padding: 12px 14px;
  display: flex; flex-direction: column; gap: 10px;
}
:global(.light-mode) .ag-card { background: #F5F6FA; }
.ag-card.live { border-color: rgba(99,102,241,.45); box-shadow: 0 0 0 1px rgba(99,102,241,.12); }
.ag-card.done { border-color: rgba(34,197,94,.35); }

.ac-top { display: flex; align-items: center; gap: 10px; }
.ac-ic {
  width: 32px; height: 32px; flex-shrink: 0;
  display: grid; place-items: center; border-radius: var(--r-sm, 8px);
  background: var(--brand-soft, rgba(99,102,241,.12));
  color: var(--brand-text, #818CF8); font-size: 14px;
}
.ac-ic.live { animation: ac-pulse 2s ease infinite; }
@keyframes ac-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,.35); }
  50% { box-shadow: 0 0 0 6px rgba(99,102,241,0); }
}
.ac-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ac-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted); font-weight: 600; }
.ac-status { display: flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 600; margin-top: 1px; }
.ac-status i { font-size: 10px; }
.st-cyan { color: var(--accent-cyan, #22D3EE); }
.st-warn { color: var(--warning, #F59E0B); }
.st-ok { color: var(--success, #22C55E); }
.st-err { color: var(--error, #EF4444); }
.st-muted { color: var(--text-secondary); }

.ac-open {
  display: flex; align-items: center; gap: 7px; flex-shrink: 0;
  padding: 7px 13px;
  border-radius: var(--r-sm, 8px);
  background: var(--brand); color: #FFF;
  font-size: 12px; font-weight: 600; cursor: pointer;
  transition: background .12s, transform .1s;
}
.ac-open:hover { background: var(--brand-strong, #4F46E5); }
.ac-open:active { transform: scale(.97); }

.ac-progress { display: flex; align-items: center; gap: 9px; }
.ac-bar { flex: 1; height: 4px; border-radius: 999px; background: var(--border); overflow: hidden; }
.ac-fill { height: 100%; border-radius: 999px; background: var(--gradient-brand, linear-gradient(90deg,#4F46E5,#8B5CF6)); transition: width .4s ease; }
.ag-card.done .ac-fill { background: var(--success, #22C55E); }
.ac-pct { font-size: 10.5px; font-family: var(--font-mono, monospace); flex-shrink: 0; }

.ac-activity {
  display: flex; gap: 7px; align-items: center;
  font-size: 12px; color: var(--text-secondary);
  background: rgba(255,255,255,.025); border-radius: var(--r-xs, 6px);
  padding: 7px 9px;
}
:global(.light-mode) .ac-activity { background: rgba(15,23,42,.04); }
.ac-activity i { color: var(--accent-cyan, #22D3EE); font-size: 10px; flex-shrink: 0; }
.ac-act-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono, monospace); font-size: 11.5px; }

.ac-stats { display: flex; flex-wrap: wrap; gap: 5px; }
.ac-stats span {
  display: flex; align-items: center; gap: 5px;
  font-size: 10.5px; color: var(--text-muted);
  padding: 2.5px 8px; border-radius: 999px;
  border: 1px solid var(--border-subtle, #172033);
}
.ac-stats i { font-size: 9px; }
.ac-stats .pv { color: var(--accent-cyan, #22D3EE); border-color: rgba(34,211,238,.35); }

.ac-verified {
  display: flex; gap: 7px; align-items: center;
  font-size: 11.5px; color: var(--success, #22C55E);
}
.ac-verified i { font-size: 11px; }
.dim { color: var(--text-muted); }
</style>
