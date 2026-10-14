<template>
  <div class="agp ag-ui">
    <!-- ═══ HEADER: title · live status · actions ═══════════════ -->
    <header class="agp-head">
      <div class="agp-title-wrap">
        <AgentGlobe :size="26" :live="agent.isActive" />
        <div class="agp-title-text">
          <h2 class="agp-title">Workspace</h2>
          <span class="agp-sub" :class="statusClass">
            <span class="ag-dot" :class="dotClass" aria-hidden="true"></span>
            {{ agent.statusLabel }}<span v-if="taskTitle" class="agp-sub-task"> · {{ taskTitle }}</span>
          </span>
        </div>
      </div>
      <div class="agp-head-actions">
        <button
          v-if="agent.activeTask"
          class="ag-btn primary agp-dl"
          :disabled="agent.downloadState === 'downloading'"
          title="Download this task's workspace as a .zip archive"
          @click="agent.downloadTask()"
        >
          <i class="fas" :class="agent.downloadState === 'downloading' ? 'fa-spinner fa-spin' : 'fa-file-zipper'" aria-hidden="true"></i>
          <span class="agp-dl-label">{{ agent.downloadState === 'downloading' ? 'Packaging…' : 'Download .zip' }}</span>
        </button>
        <button v-if="agent.isActive" class="ag-btn stop" @click="confirmStop" title="Stop the task">
          <i class="fas fa-stop" aria-hidden="true"></i><span class="agp-dl-label">Stop</span>
        </button>
        <button class="ag-icon-btn" title="Refresh workspace data" aria-label="Refresh workspace" @click="refreshAll">
          <i class="fas fa-rotate" aria-hidden="true"></i>
        </button>
        <button class="ag-icon-btn" @click="agent.closePanel()" title="Close workspace" aria-label="Close workspace">
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
    </header>

    <div
      v-if="task.status === 'failed'"
      class="agp-failure"
      :class="task.error_code === 'AI_RATE_LIMIT' ? 'rate-limit' : 'failure'"
      role="alert"
    >
      <i
        class="fas"
        :class="task.error_code === 'AI_RATE_LIMIT' ? 'fa-clock' : 'fa-circle-exclamation'"
        aria-hidden="true"
      ></i>
      <div>
        <strong>{{ task.error_code === 'AI_RATE_LIMIT' ? 'AI usage limit reached' : 'Task failed' }}</strong>
        <p>{{ task.error || 'The task failed.' }}</p>
      </div>
    </div>

    <!-- download error (honest failures only, §32) -->
    <div v-if="agent.downloadState === 'error'" class="agp-dl-err" role="alert">
      <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
      <span>{{ agent.downloadError || 'The archive could not be created.' }}</span>
      <button class="ag-icon-btn" aria-label="Dismiss" @click="agent.downloadState = 'idle'"><i class="fas fa-xmark" aria-hidden="true"></i></button>
    </div>

    <!-- ═══ TAB BAR: pill tabs (§5 five V1 tabs) ═══════════════ -->
    <nav class="agp-tabs" role="tablist" aria-label="Workspace views">
      <button
        v-for="t in TABS"
        :key="t.id"
        class="agp-tab"
        role="tab"
        :aria-selected="agent.activeTab === t.id"
        :class="{ on: agent.activeTab === t.id }"
        @click="agent.setTab(t.id)"
      >
        <i :class="t.icon" aria-hidden="true"></i>
        <span>{{ t.label }}</span>
        <span v-if="t.badge" class="agp-badge">{{ t.badge }}</span>
      </button>
    </nav>

    <!-- ═══ TAB CONTENT ═══════════════════════════════════════ -->
    <div class="agp-body" role="tabpanel">
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
 * KinyaBot Agent V1.1 — Workspace Panel
 * ─────────────────────────────────────────────────────────────────
 * The reference-styled workspace: globe-mark header with the live
 * task status, a PROMINENT Download .zip action (V1.1 §8), the Stop
 * control (§17) and pill-style tabs for the five V1 views. The plan,
 * confirmation card and activity feed now live in the conversation
 * timeline (AgentTimeline) — this panel is purely the "computer".
 */
import { computed } from 'vue'
import { useAgentStore } from '../../stores/agent'
import AgentGlobe from './AgentGlobe.vue'
import AgentTerminal from './AgentTerminal.vue'
import AgentFiles from './AgentFiles.vue'
import AgentChanges from './AgentChanges.vue'
import AgentPreview from './AgentPreview.vue'
import AgentLogs from './AgentLogs.vue'
import '../../assets/agent.css'

const agent = useAgentStore()
const task = computed(() => agent.activeTask || {})

const taskTitle = computed(() => {
  const t = String(task.value.title || '').trim()
  if (!t) return ''
  return t.length > 34 ? t.slice(0, 33) + '…' : t
})

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
const dotClass = computed(() => ({
  queued: 'idle', planning: 'warn', running: 'ok',
  waiting_for_confirmation: 'warn', paused: 'idle',
  completed: 'ok', failed: 'err', cancelled: 'err',
}[task.value.status] || 'idle'))

async function confirmStop() {
  if (!window.confirm('Stop this task? The agent will finish the current step and stop.')) return
  try { await agent.stopTask() } catch { /* state settles via events */ }
}

async function refreshAll() {
  await Promise.allSettled([
    agent.syncEvents(agent.activeTask?.task_ref),
    agent.fetchFiles(),
    agent.fetchChanges(),
    agent.activeTask?.preview?.port ? agent.fetchPreviewToken() : Promise.resolve(),
  ])
}
</script>

<style scoped>
.agp { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-height: 0; }
.agp-failure {
  display: flex; align-items: flex-start; gap: 10px;
  margin: 12px 14px 0; padding: 11px 13px; border-radius: var(--ag-r);
  font-size: 12.5px;
}
.agp-failure.failure {
  background: rgba(239,68,68,.07); border: 1px solid rgba(239,68,68,.25);
  color: #f87171;
}
.agp-failure.rate-limit {
  background: rgba(245,158,11,.06); border: 1px solid rgba(245,158,11,.25);
  color: var(--ag-warn);
}
.agp-failure > i { margin-top: 2px; }
.agp-failure strong { display: block; margin-bottom: 3px; font-size: 13px; }
.agp-failure p { margin: 0; color: var(--ag-text-2); line-height: 1.5; }

/* ── header ─────────────────────────────────────────────────── */
.agp-head {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 12px 14px 11px;
  border-bottom: 1px solid var(--ag-border);
}
.agp-title-wrap { display: flex; gap: 10px; align-items: center; min-width: 0; }
.agp-title-text { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.agp-title { margin: 0; font-size: 14px; font-weight: 700; letter-spacing: .01em; }
.agp-sub {
  display: flex; align-items: center; gap: 6px;
  font-size: 11.5px; color: var(--ag-text-3);
  overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
}
.agp-sub-task { overflow: hidden; text-overflow: ellipsis; }
.st-running, .st-planning { color: var(--ag-accent-2); }
.st-waiting { color: var(--ag-warn); }
.st-done { color: var(--ag-accent-2); }
.st-err { color: #f87171; }

.agp-head-actions { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
.agp-dl { padding: 8px 14px; font-size: 12.5px; }
.agp-dl-label { white-space: nowrap; }

.agp-dl-err {
  display: flex; align-items: center; gap: 8px;
  margin: 8px 12px 0; padding: 8px 11px;
  font-size: 12px; color: #f87171;
  background: rgba(239,68,68,.08);
  border: 1px solid rgba(239,68,68,.3);
  border-radius: var(--ag-r-sm);
}
.agp-dl-err span { flex: 1; min-width: 0; }

/* ── pill tabs (reference tab style) ────────────────────────── */
.agp-tabs {
  display: flex; gap: 4px;
  padding: 9px 12px 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.agp-tabs::-webkit-scrollbar { display: none; }
.agp-tab {
  display: flex; align-items: center; gap: 7px;
  padding: 7px 13px;
  border: 1px solid transparent; border-radius: 999px;
  background: transparent; color: var(--ag-text-3);
  font-size: 12px; font-weight: 600;
  cursor: pointer; white-space: nowrap;
  transition: background .13s, color .13s, border-color .13s;
}
.agp-tab:hover { color: var(--ag-text-2); background: rgba(255,255,255,.05); }
.agp-tab.on {
  color: var(--ag-text);
  background: var(--ag-card);
  border-color: var(--ag-border-2);
}
.agp-tab i { font-size: 11px; }
.agp-badge {
  font-size: 9.5px; padding: 1px 7px; border-radius: 999px;
  background: rgba(255,255,255,.07); color: var(--ag-text-2);
  font-family: var(--ag-mono);
}
.agp-tab.on .agp-badge { background: rgba(16,185,129,.15); color: var(--ag-accent-2); }
.agp-badge:empty { display: none; }

/* ── body ───────────────────────────────────────────────────── */
.agp-body { flex: 1; display: flex; min-height: 0; overflow: hidden; margin-top: 9px; }
.agp-body > * { flex: 1; min-width: 0; }

@media (max-width: 560px) {
  .agp-head { padding: 10px 10px 9px; flex-wrap: wrap; }
  .agp-dl-label { display: none; }
  .agp-dl { padding: 9px 11px; }
  .agp-tab span:not(.agp-badge) { display: none; }
  .agp-tab { padding: 8px 11px; }
}
</style>
