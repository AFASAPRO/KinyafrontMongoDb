<template>
  <div class="ag-term" ref="scrollEl">
    <div v-if="!agent.terminal.length" class="term-empty">
      <i class="fas fa-terminal" aria-hidden="true"></i>
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
        <span class="running"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i> running…</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * KinyaBot Agent V1 — Terminal Tab (§6, §10)
 * Every line comes from a REAL task.terminal.* event: the command the
 * agent ran, its streamed stdout/stderr, the true exit code and wall
 * duration. Blocked commands are shown as refused, never faked as run.
 */
import { ref, watch, nextTick, onMounted } from 'vue'
import { useAgentStore } from '../../stores/agent'

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
.ag-term {
  flex: 1; overflow-y: auto; overflow-x: hidden;
  padding: 10px 12px 18px;
  font-family: var(--font-mono, ui-monospace, 'SF Mono', Menlo, Consolas, monospace);
  font-size: 12px; line-height: 1.55;
  background: var(--code-bg, #0A0F1A);
}
:global(.light-mode) .ag-term { background: #F7F8FB; }

.term-empty {
  height: 100%; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 8px;
  color: var(--text-muted); text-align: center; padding: 30px;
  font-family: var(--font); font-size: 13px;
}
.term-empty i { font-size: 26px; opacity: .5; }
.term-empty .dim { font-size: 12px; opacity: .7; }

.term-block { margin-bottom: 10px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-subtle, #172033); }
:global(.light-mode) .term-block { border-color: #E3E7EF; }

.term-cmd {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 10px;
  background: var(--code-header, #0D1422);
  color: var(--code-text, #E2E8F0);
}
:global(.light-mode) .term-cmd { background: #EBEDF3; color: #243044; }
.term-prompt { color: var(--brand); flex-shrink: 0; font-size: 10px; }
.term-prompt.bg { color: var(--accent-cyan, #22D3EE); }
.term-cmd code { white-space: pre-wrap; word-break: break-all; flex: 1; }

.term-badge {
  flex-shrink: 0; font-size: 10px; padding: 2px 7px;
  border-radius: 999px; background: rgba(34,211,238,.14); color: var(--accent-cyan, #22D3EE);
  font-family: var(--font);
}
.term-badge.risk { background: rgba(245,158,11,.14); color: var(--warning, #F59E0B); }

.term-out {
  margin: 0; padding: 8px 10px;
  white-space: pre-wrap; word-break: break-word;
  color: var(--code-text, #E2E8F0);
  max-height: 320px; overflow-y: auto;
  border-top: 1px solid var(--border-subtle, #172033);
}
:global(.light-mode) .term-out { color: #2A3446; border-top-color: #E3E7EF; background: #FFFFFF; }

.term-meta {
  display: flex; gap: 10px; align-items: center;
  padding: 5px 10px;
  background: rgba(255,255,255,.02);
  border-top: 1px solid var(--border-subtle, #172033);
  font-size: 11px; color: var(--text-muted);
}
:global(.light-mode) .term-meta { background: #F3F5F9; border-top-color: #E3E7EF; }
.term-meta .exit.ok { color: var(--success, #22C55E); }
.term-meta .exit:not(.ok) { color: var(--error, #EF4444); }
.term-meta .running { color: var(--accent-cyan, #22D3EE); }
.dim { color: var(--text-muted); }

.term-blocked {
  display: flex; gap: 9px; padding: 9px 10px;
  background: rgba(245,158,11,.07);
  border: 1px solid rgba(245,158,11,.25);
  color: var(--text-secondary);
}
.term-blocked > i { color: var(--warning, #F59E0B); margin-top: 2px; }
.term-blocked code { color: var(--text-primary); word-break: break-all; }
.term-blocked .dim { font-size: 11px; margin: 3px 0 0; font-family: var(--font); }

.term-fail .term-cmd { border-left: 2px solid var(--error, #EF4444); }
.term-bg .term-cmd { border-left: 2px solid var(--accent-cyan, #22D3EE); }
</style>
