<template>
  <div class="agt ag-ui" ref="scrollEl">
    <div v-if="!agent.terminal.length" class="term-empty">
      <AgentGlobe :size="44" />
      <p>Real commands the Agent runs appear here — with live stdout, stderr, exit codes and durations.</p>
      <p class="dim">Nothing has been executed yet.</p>
    </div>

    <div
      v-for="(line, i) in agent.terminal"
      :key="i"
      class="term-block"
      :class="{ 'term-fail': line.exitCode != null && line.exitCode !== 0, 'term-bg': line.kind === 'background' }"
    >
      <!-- Command echo -->
      <div v-if="line.kind === 'command' || line.kind === 'background'" class="term-cmd">
        <span class="term-prompt" :class="{ bg: line.kind === 'background' }">
          <i :class="line.kind === 'background' ? 'fas fa-rotate' : 'fas fa-chevron-right'" aria-hidden="true"></i>
        </span>
        <code>{{ line.command }}</code>
        <span v-if="line.kind === 'background'" class="term-badge">background</span>
        <span v-if="line.risk === 'high'" class="term-badge risk">high-risk</span>
      </div>

      <!-- Blocked command (§13) — never executed -->
      <div v-else-if="line.kind === 'blocked'" class="term-blocked">
        <i class="fas fa-shield-halved" aria-hidden="true"></i>
        <div>
          <code>{{ line.command }}</code>
          <p class="dim">{{ line.reason }}</p>
        </div>
      </div>

      <!-- Output -->
      <pre v-if="line.output" class="term-out">{{ line.output }}</pre>

      <!-- Exit footer (§10: real exit code + duration) -->
      <div v-if="line.kind === 'command' && line.exitCode != null" class="term-meta">
        <span class="exit" :class="{ ok: line.exitCode === 0 }">
          <i class="fas fa-circle-check" v-if="line.exitCode === 0" aria-hidden="true"></i>
          <i class="fas fa-circle-xmark" v-else aria-hidden="true"></i>
          exit {{ line.exitCode }}{{ line.timedOut ? ' (timed out)' : '' }}
        </span>
        <span v-if="line.durationMs != null" class="dim">{{ fmtDuration(line.durationMs) }}</span>
        <span v-if="line.completedAt" class="dim">{{ fmtTime(line.completedAt) }}</span>
      </div>
      <div v-else-if="line.kind === 'command'" class="term-meta">
        <span class="running"><span class="ag-ring" aria-hidden="true"></span> running…</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * KinyaBot Agent V1.1 — Terminal Tab (§6, §10)
 * Same REAL data as V1 (every line comes from a task.terminal.* event:
 * command, streamed stdout/stderr, true exit code and duration) in the
 * reference-styled skin. Blocked commands show as refused, never faked.
 */
import { ref, watch, nextTick, onMounted } from 'vue'
import { useAgentStore } from '../../stores/agent'
import AgentGlobe from './AgentGlobe.vue'
import '../../assets/agent.css'

const agent = useAgentStore()
const scrollEl = ref(null)
let pinned = true

function onScroll() {
  const el = scrollEl.value
  if (!el) return
  pinned = el.scrollHeight - el.scrollTop - el.clientHeight < 60
}

watch(() => agent.terminal.length, async () => {
  await nextTick()
  const el = scrollEl.value
  if (el && pinned) el.scrollTop = el.scrollHeight
})
// Long outputs append in place — keep following when pinned.
watch(() => agent.terminal.map(l => (l.output || '').length).join(','), async () => {
  await nextTick()
  const el = scrollEl.value
  if (el && pinned) el.scrollTop = el.scrollHeight
})

onMounted(() => { scrollEl.value?.addEventListener('scroll', onScroll, { passive: true }) })

function fmtDuration(ms) {
  if (ms == null) return ''
  if (ms < 1000) return ms + 'ms'
  if (ms < 60_000) return (ms / 1000).toFixed(1) + 's'
  return Math.floor(ms / 60000) + 'm ' + Math.round((ms % 60000) / 1000) + 's'
}
function fmtTime(iso) {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) } catch { return '' }
}
</script>

<style scoped>
.agt {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  padding: 4px 12px 18px;
  font-family: var(--ag-mono);
  font-size: 12px; line-height: 1.55;
  background: var(--ag-panel);
}

.term-empty {
  height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px;
  color: var(--ag-text-3); text-align: center; padding: 30px;
  font-family: var(--ag-font); font-size: 13px;
}
.term-empty .dim { font-size: 12px; opacity: .7; }

.term-block {
  margin-bottom: 12px; border-radius: var(--ag-r-sm);
  overflow: hidden;
  border: 1px solid var(--ag-border);
  background: var(--ag-card);
}

.term-cmd {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 11px;
  background: var(--ag-code-head);
  color: #d4d4d4;
}
.term-prompt { color: var(--ag-accent); flex-shrink: 0; font-size: 10px; }
.term-prompt.bg { color: var(--ag-warn); }
.term-cmd code { white-space: pre-wrap; word-break: break-all; flex: 1; }

.term-badge {
  flex-shrink: 0; font-size: 10px; padding: 2px 8px;
  border-radius: 999px; background: rgba(245,158,11,.12); color: var(--ag-warn);
  font-family: var(--ag-font);
}
.term-badge:not(.risk) { background: rgba(255,255,255,.06); color: var(--ag-text-2); }

.term-out {
  margin: 0; padding: 9px 11px;
  white-space: pre-wrap; word-break: break-word;
  color: #c8c8ca;
  max-height: 320px; overflow-y: auto;
  border-top: 1px solid var(--ag-border);
  background: var(--ag-code-bg);
}

.term-meta {
  display: flex; gap: 10px; align-items: center;
  padding: 6px 11px;
  background: rgba(255,255,255,.02);
  border-top: 1px solid var(--ag-border);
  font-size: 11px; color: var(--ag-text-3);
}
.term-meta .exit.ok { color: var(--ag-accent-2); display: inline-flex; align-items: center; gap: 5px; }
.term-meta .exit:not(.ok) { color: #f87171; display: inline-flex; align-items: center; gap: 5px; }
.term-meta .running { color: var(--ag-accent-2); display: inline-flex; align-items: center; gap: 7px; }
.dim { color: var(--ag-text-3); }

.term-blocked {
  display: flex; gap: 9px; padding: 10px 11px;
  background: rgba(197,160,89,.06);
  border: 1px solid rgba(197,160,89,.3);
  border-radius: var(--ag-r-sm);
  color: var(--ag-text-2);
}
.term-blocked > i { color: var(--ag-gold); margin-top: 2px; }
.term-blocked code { color: var(--ag-text); word-break: break-all; }
.term-blocked .dim { font-size: 11px; margin: 3px 0 0; font-family: var(--ag-font); }

.term-fail { border-color: rgba(239,68,68,.35); }
.term-fail .term-cmd { border-left: 2px solid var(--ag-danger); }
.term-bg .term-cmd { border-left: 2px solid var(--ag-warn); }
</style>
