<template>
  <div class="ag-logs" ref="scrollEl">
    <div v-if="!filtered.length" class="lg-empty">
      <i class="fas fa-list-check" aria-hidden="true"></i>
      <p>Execution events appear here as they happen.</p>
    </div>

    <!-- ── Filter chips (§15 event families) ─────────────────── -->
    <div class="lg-filters">
      <button
        v-for="f in FILTERS"
        :key="f.id"
        class="lg-chip"
        :class="{ on: filter === f.id }"
        @click="filter = f.id"
      >{{ f.label }}</button>
    </div>

    <div class="lg-list" role="log" aria-label="Agent execution events">
      <div v-for="(e, i) in filtered" :key="`${e.seq}-${i}`" class="lg-row">
        <span class="lg-ic" :class="iconClass(e.type)"><i :class="iconFor(e.type)" aria-hidden="true"></i></span>
        <div class="lg-body">
          <span class="lg-type">{{ e.type }}</span>
          <span class="lg-data dim">{{ dataPreview(e) }}</span>
        </div>
        <span class="lg-time dim">{{ fmtTime(e.at) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * KinyaBot Agent V1 — Logs Tab (§5, §6, §31)
 * The structured execution event stream (§15): lifecycle, tools,
 * files, terminal, preview, verification — everything EXCEPT the
 * model's internal reasoning (§16: no chain-of-thought, ever).
 */
import { ref, computed, watch, nextTick } from 'vue'
import { useAgentStore } from '../../stores/agent'

const agent = useAgentStore()
const scrollEl = ref(null)
let pinned = true

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'tools', label: 'Tools' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'files', label: 'Files' },
  { id: 'lifecycle', label: 'Lifecycle' },
]
const filter = ref('all')

const FILTER_SETS = {
  all: null,
  tools: ['task.tool.started', 'task.tool.completed', 'task.tool.failed', 'task.tool.retried'],
  terminal: ['task.terminal.started', 'task.terminal.output', 'task.terminal.completed', 'task.terminal.blocked', 'task.terminal.background_started'],
  files: ['task.file.changed', 'task.ports.detected'],
  lifecycle: ['task.created', 'task.started', 'task.planning', 'task.plan_updated', 'task.preview.started', 'task.preview.ready', 'task.preview.stopped', 'task.verification.started', 'task.verification.completed', 'task.confirmation.requested', 'task.confirmation.resolved', 'task.completed', 'task.failed', 'task.cancelled', 'task.step', 'task.repair.started'],
}

const filtered = computed(() => {
  const set = FILTER_SETS[filter.value]
  return set ? agent.events.filter(e => set.includes(e.type)) : agent.events
})

/* terminal.output is very high-frequency — collapse consecutive chunks */
const COLLAPSE = new Set(['task.terminal.output', 'task.step'])

function iconFor(type) {
  if (type.startsWith('task.tool.')) return type.endsWith('failed') ? 'fas fa-screwdriver-wrench' : 'fas fa-screwdriver-wrench'
  if (type.startsWith('task.terminal.')) return 'fas fa-terminal'
  if (type === 'task.file.changed') return 'fas fa-file-pen'
  if (type.startsWith('task.preview.')) return 'fas fa-eye'
  if (type.startsWith('task.confirmation.')) return 'fas fa-shield-halved'
  if (type.startsWith('task.verification.')) return 'fas fa-clipboard-check'
  if (type === 'task.plan_updated' || type === 'task.planning') return 'fas fa-map'
  if (type === 'task.completed') return 'fas fa-flag-checkered'
  if (type === 'task.failed' || type === 'task.cancelled') return 'fas fa-circle-exclamation'
  if (type === 'task.ports.detected') return 'fas fa-plug'
  if (type === 'task.step') return 'fas fa-shoe-prints'
  return 'fas fa-circle-dot'
}
function iconClass(type) {
  if (type === 'task.completed') return 'ok'
  if (type === 'task.failed' || type === 'task.cancelled' || type === 'task.tool.failed' || type === 'task.terminal.blocked') return 'err'
  if (type.startsWith('task.tool.')) return 'brand'
  if (type.startsWith('task.terminal.')) return 'cyan'
  if (type.startsWith('task.confirmation.')) return 'warn'
  return ''
}

function dataPreview(e) {
  const d = e.data || {}
  if (e.type === 'task.tool.started') return `${d.name}(${shortArgs(d.args)})`
  if (e.type === 'task.plan_updated') return `${(d.steps || []).length} steps`
  if (e.type === 'task.file.changed') return `${d.action} ${d.path}`
  if (e.type === 'task.terminal.started') return d.command
  if (e.type === 'task.terminal.output') return `${(d.stream === 'stderr' ? 'stderr ' : '')}${String(d.chunk || '').replace(/\n/g, '⏎').slice(0, 90)}`
  if (e.type === 'task.terminal.completed') return `exit ${d.exitCode}`
  if (e.type === 'task.terminal.blocked') return `${d.command} — ${d.reason}`
  if (e.type === 'task.confirmation.requested') return d.command
  if (e.type === 'task.completed') return truncate(d.result)
  if (e.type === 'task.failed') return truncate(d.error)
  if (e.type === 'task.step') return `step ${d.step}/${d.max}`
  const s = JSON.stringify(d)
  return s && s !== '{}' ? truncate(s) : ''
}

function shortArgs(args) {
  if (!args) return ''
  const keys = Object.keys(args)
  if (!keys.length) return ''
  return keys.slice(0, 3).map(k => `${k}: ${truncate(String(args[k]), 18)}`).join(', ') + (keys.length > 3 ? '…' : '')
}
function truncate(s, n = 110) { s = String(s || ''); return s.length > n ? s.slice(0, n) + '…' : s }

function fmtTime(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString([], { hour12: false }) } catch { return '' }
}

function onScroll() {
  const el = scrollEl.value
  if (!el) return
  pinned = el.scrollHeight - el.scrollTop - el.clientHeight < 60
}
watch(() => agent.events.length, async () => {
  await nextTick()
  const el = scrollEl.value
  if (el && pinned) el.scrollTop = el.scrollHeight
})
</script>

<style scoped>
.ag-logs { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.lg-filters {
  display: flex; gap: 4px; padding: 8px 10px; flex-wrap: wrap;
  border-bottom: 1px solid var(--border-subtle, #172033);
  background: var(--surface-secondary, #111827);
}
:global(.light-mode) .lg-filters { background: #F3F5F9; border-bottom-color: #E3E7EF; }
.lg-chip {
  border: none; border-radius: 999px; padding: 3px 10px;
  font-size: 11px; cursor: pointer;
  background: transparent; color: var(--text-muted);
  transition: background .12s, color .12s;
}
.lg-chip:hover { background: var(--surface-elevated, #151B2B); color: var(--text-primary); }
.lg-chip.on { background: var(--brand-soft, rgba(99,102,241,.12)); color: var(--brand-text, #818CF8); font-weight: 600; }

.lg-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: var(--text-muted); font-size: 13px; }
.lg-empty i { font-size: 26px; opacity: .5; }

.lg-list { flex: 1; overflow-y: auto; padding: 6px 8px 16px; }

.lg-row {
  display: flex; gap: 8px; align-items: flex-start;
  padding: 4px 6px; border-radius: var(--r-xs, 6px);
  font-size: 11.5px; line-height: 1.45;
}
.lg-row:hover { background: rgba(255,255,255,.025); }
:global(.light-mode) .lg-row:hover { background: rgba(15,23,42,.04); }

.lg-ic {
  width: 22px; height: 22px; flex-shrink: 0;
  display: grid; place-items: center;
  border-radius: 6px; font-size: 10px;
  color: var(--text-muted); background: var(--surface-elevated, #151B2B);
  margin-top: 1px;
}
.lg-ic.brand { color: var(--brand-text, #818CF8); }
.lg-ic.cyan { color: var(--accent-cyan, #22D3EE); }
.lg-ic.ok { color: var(--success, #22C55E); }
.lg-ic.err { color: var(--error, #EF4444); }
.lg-ic.warn { color: var(--warning, #F59E0B); }

.lg-body { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.lg-type { color: var(--text-secondary); font-family: var(--font-mono, monospace); font-size: 11px; }
.lg-data { font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.lg-time { flex-shrink: 0; font-size: 10px; font-family: var(--font-mono, monospace); margin-top: 2px; }
.dim { color: var(--text-muted); }
</style>
