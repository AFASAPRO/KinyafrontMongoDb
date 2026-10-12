<template>
  <div class="aw-panel">
    <!-- ═══ HEADER (§5): title · status · controls (§17) ═══════ -->
    <header class="aw-head">
      <div class="aw-title-wrap">
        <span class="aw-icon" :class="{ live: agent.isActive }"><i class="fas fa-robot" aria-hidden="true"></i></span>
        <div class="aw-title-text">
          <h2 class="aw-title">{{ task.title || task.prompt || 'Agent task' }}</h2>
          <span class="aw-status" :class="statusClass">
            <i v-if="agent.isActive" class="fas fa-circle-play" aria-hidden="true"></i>
            <i v-else-if="task.status === 'completed'" class="fas fa-circle-check" aria-hidden="true"></i>
            <i v-else class="fas fa-circle-xmark" aria-hidden="true"></i>
            {{ agent.statusLabel }}
            <span v-if="elapsedLabel" class="aw-elapsed">· {{ elapsedLabel }}</span>
          </span>
        </div>
      </div>
      <div class="aw-head-actions">
        <button
          v-if="agent.isActive"
          class="aw-stop"
          @click="confirmStop"
          title="Stop the task"
        ><i class="fas fa-stop" aria-hidden="true"></i><span>Stop</span></button>
        <button class="aw-close" @click="agent.closePanel()" title="Close workspace" aria-label="Close workspace">
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
    </header>

    <!-- ═══ HIGH-RISK CONFIRMATION (§13) ═══════════════════════ -->
    <transition name="aw-slide">
      <div v-if="agent.pendingConfirmation" class="aw-confirm" role="alertdialog" aria-live="assertive">
        <div class="ac-head">
          <i class="fas fa-shield-halved" aria-hidden="true"></i>
          <strong>Approval needed</strong>
        </div>
        <p class="ac-reason">{{ agent.pendingConfirmation.reason }}</p>
        <code class="ac-cmd">{{ agent.pendingConfirmation.command }}</code>
        <div class="ac-actions">
          <button class="ac-deny" @click="agent.resolveConfirmation(false)"><i class="fas fa-ban" aria-hidden="true"></i> Deny</button>
          <button class="ac-approve" @click="agent.resolveConfirmation(true)"><i class="fas fa-check" aria-hidden="true"></i> Approve once</button>
        </div>
        <p class="ac-note dim">The Agent is paused until you decide. Denying is safe — it will continue with another approach.</p>
      </div>
    </transition>

    <!-- ═══ PLAN (§16): high-level milestones, no chain-of-thought ═ -->
    <section v-if="task.plan?.length" class="aw-plan" aria-label="Task plan">
      <div
        v-for="(step, i) in task.plan"
        :key="i"
        class="plan-step"
        :class="step.status"
      >
        <span class="ps-dot">
          <i v-if="step.status === 'done'" class="fas fa-check" aria-hidden="true"></i>
          <i v-else-if="step.status === 'in_progress'" class="fas fa-spinner fa-spin" aria-hidden="true"></i>
          <span v-else class="ps-num">{{ i + 1 }}</span>
        </span>
        <span class="ps-title">{{ step.title }}</span>
      </div>
    </section>

    <!-- ═══ LIVE STATS (§31 observability, user-facing) ════════ -->
    <section v-if="task.stats" class="aw-stats">
      <span class="st"><i class="fas fa-shoe-prints" aria-hidden="true"></i>{{ task.stats.steps || 0 }} steps</span>
      <span class="st"><i class="fas fa-screwdriver-wrench" aria-hidden="true"></i>{{ task.stats.tool_calls || 0 }} tools</span>
      <span class="st"><i class="fas fa-terminal" aria-hidden="true"></i>{{ task.stats.commands_run || 0 }} commands</span>
      <span class="st"><i class="fas fa-file-pen" aria-hidden="true"></i>{{ task.stats.files_changed || 0 }} files</span>
    </section>

    <!-- ═══ ERROR / RESULT banners ═════════════════════════════ -->
    <section v-if="task.status === 'failed'" class="aw-banner err">
      <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
      <div><strong>Task failed</strong><p>{{ task.error }}</p></div>
    </section>
    <section v-else-if="task.status === 'cancelled'" class="aw-banner warn">
      <i class="fas fa-ban" aria-hidden="true"></i>
      <div><strong>Task cancelled</strong><p>{{ task.error || 'Stopped by the user. Partial work remains in the workspace.' }}</p></div>
    </section>

    <!-- ═══ TAB BAR (§5: the five V1 tabs) ════════════════════ -->
    <nav class="aw-tabs" role="tablist" aria-label="Workspace views">
      <button
        v-for="t in TABS"
        :key="t.id"
        class="aw-tab"
        role="tab"
        :aria-selected="agent.activeTab === t.id"
        :class="{ on: agent.activeTab === t.id }"
        @click="agent.setTab(t.id)"
      >
        <i :class="t.icon" aria-hidden="true"></i>
        <span>{{ t.label }}</span>
        <span v-if="t.badge" class="tab-badge">{{ t.badge }}</span>
      </button>
    </nav>

    <!-- ═══ TAB CONTENT ═══════════════════════════════════════ -->
    <div class="aw-body" role="tabpanel">
      <AgentTerminal v-show="agent.activeTab === 'terminal'" />
      <AgentFiles v-show="agent.activeTab === 'files'" />
      <AgentChanges v-show="agent.activeTab === 'changes'" />
      <AgentPreview v-show="agent.activeTab === 'preview'" />
      <AgentLogs v-show="agent.activeTab === 'logs'" />
    </div>
  </div>
</template>

<script setup>
/**
 * KinyaBot Agent V1 — Workspace Panel (§5, §6, §13, §16, §17)
 * The workspace content: task header + status + Stop control, the
 * high-level PLAN (§16 — milestones only, never chain-of-thought),
 * the §13 approval banner, live stats, and the five V1 tabs.
 */
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useAgentStore } from '../../stores/agent'
import AgentTerminal from './AgentTerminal.vue'
import AgentFiles from './AgentFiles.vue'
import AgentChanges from './AgentChanges.vue'
import AgentPreview from './AgentPreview.vue'
import AgentLogs from './AgentLogs.vue'

const agent = useAgentStore()
const task = computed(() => agent.activeTask || {})

const TABS = computed(() => ([
  { id: 'terminal', label: 'Terminal', icon: 'fas fa-terminal', badge: null },
  { id: 'files', label: 'Files', icon: 'fas fa-folder-tree', badge: agent.files.count || null },
  { id: 'changes', label: 'Changes', icon: 'fas fa-code-compare', badge: agent.changes.length || null },
  { id: 'preview', label: 'Preview', icon: 'fas fa-eye', badge: agent.previewLive ? 'live' : null },
  { id: 'logs', label: 'Logs', icon: 'fas fa-list-check', badge: null },
]))

const statusClass = computed(() => ({
  queued: 'st-queued', planning: 'st-planning', running: 'st-running',
  waiting_for_confirmation: 'st-waiting', paused: 'st-paused',
  completed: 'st-done', failed: 'st-err', cancelled: 'st-err',
}[task.value.status] || ''))

/* Elapsed timer — honest, from the server's timestamps. */
const now = ref(Date.now())
let timer = null
onMounted(() => { timer = setInterval(() => { now.value = Date.now() }, 1000) })
onBeforeUnmount(() => clearInterval(timer))
const elapsedLabel = computed(() => {
  const t = task.value
  if (!t?.started_at) return ''
  const end = t.completed_at ? new Date(t.completed_at).getTime() : now.value
  const ms = end - new Date(t.started_at).getTime()
  if (!Number.isFinite(ms) || ms < 0) return ''
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  return `${m}m ${s % 60}s`
})

async function confirmStop() {
  if (!window.confirm('Stop this task? The agent will finish the current step and stop.')) return
  try { await agent.stopTask() } catch { /* state settles via events */ }
}
</script>

<style scoped>
.aw-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }

/* ── Header ────────────────────────────────────────────────── */
.aw-head {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--surface, #0B1020);
}
.aw-title-wrap { display: flex; gap: 10px; align-items: center; min-width: 0; }
.aw-icon {
  width: 34px; height: 34px; flex-shrink: 0;
  display: grid; place-items: center;
  border-radius: var(--r-sm, 8px);
  background: var(--brand-soft, rgba(99,102,241,.12));
  color: var(--brand-text, #818CF8); font-size: 15px;
}
.aw-icon.live { animation: aw-pulse 2s ease infinite; }
@keyframes aw-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,.35); }
  50% { box-shadow: 0 0 0 6px rgba(99,102,241,0); }
}
.aw-title-text { min-width: 0; }
.aw-title {
  margin: 0; font-size: 13px; font-weight: 600; color: var(--text-primary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px;
}
.aw-status { display: flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-muted); margin-top: 1px; }
.aw-status i { font-size: 10px; }
.aw-elapsed { opacity: .75; }
.st-running, .st-planning { color: var(--accent-cyan, #22D3EE); }
.st-waiting { color: var(--warning, #F59E0B); }
.st-done { color: var(--success, #22C55E); }
.st-err { color: var(--error, #EF4444); }
.st-queued, .st-paused { color: var(--text-muted); }

.aw-head-actions { display: flex; gap: 6px; flex-shrink: 0; }
.aw-stop {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 12px; border-radius: var(--r-sm, 8px);
  border: 1px solid rgba(239,68,68,.4);
  background: rgba(239,68,68,.10); color: #F87171;
  font-size: 12px; font-weight: 600; cursor: pointer;
  transition: background .12s;
}
.aw-stop:hover { background: rgba(239,68,68,.2); }
.aw-close {
  width: 30px; height: 30px; display: grid; place-items: center;
  border: none; border-radius: var(--r-xs, 6px);
  background: transparent; color: var(--text-muted); cursor: pointer; font-size: 13px;
}
.aw-close:hover { background: var(--surface-elevated, #151B2B); color: var(--text-primary); }

/* ── Confirmation banner (§13) ─────────────────────────────── */
.aw-confirm {
  margin: 10px 12px 0; padding: 12px;
  border: 1px solid rgba(245,158,11,.45);
  background: rgba(245,158,11,.08);
  border-radius: var(--r, 12px);
}
.ac-head { display: flex; gap: 8px; align-items: center; color: var(--warning, #F59E0B); font-size: 13px; margin-bottom: 6px; }
.ac-reason { margin: 0 0 7px; font-size: 12px; color: var(--text-secondary); }
.ac-cmd {
  display: block; padding: 7px 10px; margin-bottom: 10px;
  background: var(--code-bg, #0A0F1A);
  border: 1px solid var(--border);
  border-radius: var(--r-xs, 6px);
  color: var(--code-text, #E2E8F0);
  font-family: var(--font-mono, monospace); font-size: 12px;
  word-break: break-all; white-space: pre-wrap;
}
.ac-actions { display: flex; gap: 8px; }
.ac-deny, .ac-approve {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
  padding: 8px 10px; border-radius: var(--r-sm, 8px);
  font-size: 12.5px; font-weight: 600; cursor: pointer;
  border: 1px solid var(--border);
}
.ac-deny { background: transparent; color: var(--text-secondary); }
.ac-deny:hover { background: rgba(239,68,68,.12); color: #F87171; border-color: rgba(239,68,68,.4); }
.ac-approve { background: var(--warning, #F59E0B); color: #1A1200; border-color: transparent; }
.ac-approve:hover { filter: brightness(1.1); }
.ac-note { margin: 9px 0 0; font-size: 11px; }

/* ── Plan (§16) ────────────────────────────────────────────── */
.aw-plan {
  display: flex; flex-direction: column; gap: 2px;
  padding: 10px 14px 8px;
  border-bottom: 1px solid var(--border-subtle, #172033);
  max-height: 150px; overflow-y: auto;
}
.plan-step { display: flex; align-items: center; gap: 8px; padding: 3px 0; }
.ps-dot {
  width: 17px; height: 17px; flex-shrink: 0;
  display: grid; place-items: center;
  border-radius: 50%; font-size: 9px;
  border: 1.5px solid var(--border-strong, #2B3647);
  color: var(--text-muted);
}
.ps-num { font-size: 9px; font-weight: 700; }
.plan-step.done .ps-dot { border-color: var(--success, #22C55E); background: var(--success, #22C55E); color: #052012; }
.plan-step.in_progress .ps-dot { border-color: var(--accent-cyan, #22D3EE); color: var(--accent-cyan, #22D3EE); }
.ps-title { font-size: 12px; color: var(--text-muted); }
.plan-step.done .ps-title { color: var(--text-secondary); text-decoration: line-through; text-decoration-color: rgba(148,163,184,.4); }
.plan-step.in_progress .ps-title { color: var(--text-primary); font-weight: 500; }

/* ── Stats ─────────────────────────────────────────────────── */
.aw-stats {
  display: flex; gap: 6px; flex-wrap: wrap;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-subtle, #172033);
}
.st {
  display: flex; align-items: center; gap: 5px;
  font-size: 10.5px; color: var(--text-muted);
  padding: 3px 8px; border-radius: 999px;
  background: var(--surface-secondary, #111827);
}
.st i { font-size: 9px; }

/* ── Banners ───────────────────────────────────────────────── */
.aw-banner {
  display: flex; gap: 9px; padding: 10px 14px;
  font-size: 12.5px;
}
.aw-banner i { margin-top: 2px; }
.aw-banner strong { display: block; font-size: 12.5px; }
.aw-banner p { margin: 2px 0 0; font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
.aw-banner.err { background: rgba(239,68,68,.08); color: var(--error, #EF4444); border-bottom: 1px solid rgba(239,68,68,.25); }
.aw-banner.warn { background: rgba(245,158,11,.07); color: var(--warning, #F59E0B); border-bottom: 1px solid rgba(245,158,11,.25); }

/* ── Tabs ──────────────────────────────────────────────────── */
.aw-tabs {
  display: flex; gap: 2px; padding: 6px 8px 0;
  border-bottom: 1px solid var(--border);
  background: var(--surface, #0B1020);
  overflow-x: auto;
}
.aw-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 7px 11px; border: none; border-radius: var(--r-sm, 8px) var(--r-sm, 8px) 0 0;
  background: transparent; color: var(--text-muted);
  font-size: 11.5px; font-weight: 500; cursor: pointer;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: color .12s, background .12s;
}
.aw-tab:hover { color: var(--text-secondary); background: rgba(255,255,255,.03); }
.aw-tab.on { color: var(--brand-text, #818CF8); border-bottom-color: var(--brand); background: var(--brand-soft, rgba(99,102,241,.10)); }
.tab-badge {
  font-size: 9.5px; padding: 1px 6px; border-radius: 999px;
  background: var(--surface-elevated, #151B2B); color: var(--text-secondary);
  font-family: var(--font-mono, monospace);
}
.aw-tab.on .tab-badge { background: rgba(99,102,241,.25); color: #C7D2FE; }
.tab-badge:empty { display: none; }

/* ── Body ──────────────────────────────────────────────────── */
.aw-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }
.aw-body > * { flex: 1; min-width: 0; }

/* transitions */
.aw-slide-enter-active, .aw-slide-leave-active { transition: all .18s ease; }
.aw-slide-enter-from, .aw-slide-leave-to { opacity: 0; transform: translateY(-6px); }

.dim { color: var(--text-muted); }
</style>
