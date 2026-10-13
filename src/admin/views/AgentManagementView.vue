<template>
  <div class="agm">
    <!-- ═══ A. OVERVIEW: real metrics from AgentTask documents ═══ -->
    <SectionCard title="Agent Overview" subtitle="Live and recent metrics — computed from real Agent task documents">
      <div class="agm-stats">
        <StatCard label="Total tasks" :value="fmtNum(overview?.totals?.all)" icon="fas fa-list-check" />
        <StatCard label="Running now" :value="fmtNum(overview?.totals?.running + overview?.totals?.planning)" icon="fas fa-play" accent="blue" />
        <StatCard label="Queued" :value="fmtNum(overview?.totals?.queued)" icon="fas fa-hourglass-half" />
        <StatCard label="Completed" :value="fmtNum(overview?.totals?.completed)" icon="fas fa-circle-check" accent="green" />
        <StatCard label="Failed" :value="fmtNum(overview?.totals?.failed)" icon="fas fa-circle-xmark" accent="red" />
        <StatCard label="Cancelled" :value="fmtNum(overview?.totals?.cancelled)" icon="fas fa-ban" />
        <StatCard label="Success rate" :value="overview?.range?.success_rate != null ? overview.range.success_rate + '%' : '—'" :sub="`last ${overview?.range?.label || '7d'}`" icon="fas fa-chart-line" accent="blue" />
        <StatCard label="Avg duration" :value="fmtDuration(overview?.avg_duration_ms)" icon="fas fa-stopwatch" />
        <StatCard label="Workers" :value="`${overview?.workers?.running_now ?? 0}/${overview?.workers?.max_concurrent ?? '—'}`" sub="running / max concurrent" icon="fas fa-microchip" />
        <StatCard label="Blocked cmds" :value="fmtNum(overview?.security?.blocked_commands)" sub="safety policy refusals" icon="fas fa-shield-halved" accent="gold" />
      </div>
      <div v-if="!overview" class="agm-loading"><i class="fas fa-spinner fa-spin"></i> Loading real Agent metrics…</div>
    </SectionCard>

    <div class="agm-grid">
      <!-- ═══ D. Worker + service health (honest) ═══ -->
      <SectionCard title="Service Health" subtitle="Actual configuration + live runtime state — services are never marked healthy just because this page loaded">
        <div v-if="health" class="agm-health">
          <div class="agm-hrow"><span><i class="fas fa-diagram-project"></i> Orchestrator</span>
            <span class="agm-val">{{ health.orchestrator.running_tasks }} running · {{ health.orchestrator.queue_length }} queued</span></div>
          <div class="agm-hrow"><span><i class="fas fa-microchip"></i> Workers ({{ health.workers.execution_mode }})</span>
            <span class="agm-val">{{ health.workers.recent_crashes === 0 ? 'no recent crashes' : `${health.workers.recent_crashes} crash(es) in 24h` }}</span></div>
          <div class="agm-hrow"><span><i class="fas fa-bolt"></i> Provider ({{ health.provider.name }})</span>
            <span class="agm-val">{{ health.provider.model_configured ? 'model configured' : 'model MISSING' }} · connectivity: run <router-link to="/admin/ai-testing">AI Testing</router-link></span></div>
          <div class="agm-hrow"><span><i class="fas fa-eye"></i> Vision</span>
            <span class="agm-val">{{ health.provider.vision_configured ? 'configured' : 'not configured (reference images disabled)' }}</span></div>
          <div class="agm-hrow"><span><i class="fas fa-display"></i> Preview</span>
            <span class="agm-val">{{ health.preview.enabled ? 'enabled' : 'disabled' }} · static: {{ health.preview.static_enabled ? 'on' : 'off' }}</span></div>
          <div class="agm-hrow"><span><i class="fas fa-globe"></i> Web search</span>
            <span class="agm-val">{{ health.web_search.provider_configured ? 'provider configured' : 'provider NOT configured' }} · agent access: {{ health.web_search.enabled_for_agent ? 'allowed' : 'off' }}</span></div>
          <div class="agm-hrow"><span><i class="fas fa-bell"></i> Push delivery</span>
            <span class="agm-val">{{ !health.push.library ? 'web-push library missing' : health.push.configured ? `configured · ${health.push.subscriptions ?? 0} subscription(s)` : 'VAPID keys not set' }}</span></div>
          <div class="agm-hrow"><span><i class="fas fa-file-arrow-up"></i> Uploads</span>
            <span class="agm-val">{{ health.uploads.enabled ? 'enabled' : 'disabled' }}</span></div>
        </div>
        <div v-else class="agm-loading"><i class="fas fa-spinner fa-spin"></i> Probing services…</div>
      </SectionCard>

      <!-- ═══ C. Agent configuration (validated server-side + audited) ═══ -->
      <SectionCard title="Agent Configuration" subtitle="Safe runtime limits — validated on the backend, audit-logged, never bypassable from the browser">
        <div v-if="config" class="agm-config">
          <div class="agm-crow">
            <label><i class="fas fa-power-off"></i> Agent execution</label>
            <div class="agm-ctl">
              <input type="checkbox" id="agm-enabled" v-model="config.runtime.agent_enabled" />
              <label for="agm-enabled">{{ config.runtime.agent_enabled ? 'Enabled' : 'Disabled' }}</label>
            </div>
          </div>
          <div class="agm-crow">
            <label><i class="fas fa-layer-group"></i> Max concurrent tasks</label>
            <input type="number" min="1" max="16" v-model.number="config.runtime.agent_max_concurrent" />
          </div>
          <div class="agm-crow">
            <label><i class="fas fa-stopwatch"></i> Task timeout (minutes)</label>
            <input type="number" min="1" max="60" :value="Math.round(config.runtime.agent_task_timeout_ms / 60000)" @change="config.runtime.agent_task_timeout_ms = $event.target.value * 60000" />
          </div>
          <div class="agm-crow">
            <label><i class="fas fa-terminal"></i> Command timeout (seconds)</label>
            <input type="number" min="10" max="600" :value="Math.round(config.runtime.agent_command_timeout_ms / 1000)" @change="config.runtime.agent_command_timeout_ms = $event.target.value * 1000" />
          </div>
          <div class="agm-crow">
            <label><i class="fas fa-calendar-day"></i> Daily tasks per user</label>
            <input type="number" min="1" max="500" v-model.number="config.runtime.agent_daily_limit" />
          </div>
          <div class="agm-crow">
            <label><i class="fas fa-eye"></i> Preview</label>
            <div class="agm-ctl">
              <input type="checkbox" id="agm-preview" v-model="config.runtime.agent_preview_enabled" />
              <label for="agm-preview">{{ config.runtime.agent_preview_enabled ? 'Enabled' : 'Disabled' }}</label>
            </div>
          </div>
          <div class="agm-crow">
            <label><i class="fas fa-file-arrow-up"></i> Uploads (images + zips)</label>
            <div class="agm-ctl">
              <input type="checkbox" id="agm-uploads" v-model="config.runtime.agent_uploads_enabled" />
              <label for="agm-uploads">{{ config.runtime.agent_uploads_enabled ? 'Enabled' : 'Disabled' }}</label>
            </div>
          </div>
          <div class="agm-crow">
            <label><i class="fas fa-globe"></i> Agent web research</label>
            <select v-model="config.runtime.agent_websearch_policy">
              <option value="plan">Honor plan entitlements</option>
              <option value="disabled">Disabled for everyone</option>
            </select>
          </div>

          <div class="agm-config-foot">
            <div class="agm-env">
              <span>Provider: <b>{{ config.env.provider }}</b></span>
              <span>Model: <b>{{ config.env.model }}</b></span>
              <span>Vision: <b>{{ config.env.vision_capable ? config.env.vision_model : 'not configured' }}</b></span>
              <span>Max steps: <b>{{ config.env.max_steps }}</b></span>
            </div>
            <button class="btn primary" :disabled="savingConfig" @click="saveConfig">
              <i class="fas" :class="savingConfig ? 'fa-spinner fa-spin' : 'fa-floppy-disk'"></i>
              {{ savingConfig ? 'Saving…' : 'Save configuration' }}
            </button>
          </div>
          <p v-if="configMsg" class="agm-cfg-msg" :class="{ ok: configOk }">{{ configMsg }}</p>
        </div>
      </SectionCard>
    </div>

    <!-- ═══ B. Task management: browse / search / inspect / cancel ═══ -->
    <SectionCard title="Agent Tasks" subtitle="Every row is a real task document — search, inspect execution metadata, and cancel running tasks">
      <div class="agm-filters">
        <input v-model="filters.q" type="search" placeholder="Search title, prompt or task ref…" @keyup.enter="loadTasks(1)" />
        <select v-model="filters.status" @change="loadTasks(1)">
          <option value="">All statuses</option>
          <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
        </select>
        <select v-model="filters.range" @change="loadTasks(1)">
          <option value="">All time</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
        </select>
        <button class="btn ghost" @click="loadTasks(1)"><i class="fas fa-magnifying-glass"></i> Search</button>
      </div>

      <div class="agm-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Task</th><th>User</th><th>Status</th><th>Stats</th><th>Preview</th><th>Created</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="!tasks.length && !tasksLoading">
              <td colspan="7"><EmptyState icon="fas fa-robot" title="No agent tasks" message="No tasks match these filters yet." /></td>
            </tr>
            <tr v-for="t in tasks" :key="t.id" class="agm-row" @click="openDetail(t)">
              <td class="agm-title">
                <b>{{ t.title || '(untitled)' }}</b>
                <code>{{ t.task_ref?.slice(0, 8) }}</code>
                <span v-if="t.reference_images" class="agm-mini"><i class="fas fa-image"></i> {{ t.reference_images }}</span>
                <span v-if="t.source_upload" class="agm-mini"><i class="fas fa-file-zipper"></i> uploaded</span>
              </td>
              <td>{{ t.user?.username || '—' }}</td>
              <td><StatusDot :status="statusColor(t.status)" :label="t.status" /></td>
              <td class="agm-stats-cell">
                <span v-if="t.steps != null">{{ t.steps }} steps</span>
                <span v-if="t.commands_run != null">{{ t.commands_run }} cmds</span>
                <span v-if="t.files_changed != null">{{ t.files_changed }} files</span>
                <span v-if="t.duration_ms != null" class="dim">{{ fmtDuration(t.duration_ms) }}</span>
              </td>
              <td>
                <span v-if="t.preview?.mode" class="agm-preview-mode" :class="t.preview.mode">{{ t.preview.mode }}</span>
                <span v-else class="dim">—</span>
              </td>
              <td class="dim">{{ fmtDate(t.created_at) }}</td>
              <td>
                <button v-if="isActive(t.status)" class="btn ghost sm danger" @click.stop="cancelTask(t)">
                  <i class="fas fa-stop"></i> Cancel
                </button>
                <button v-else class="btn ghost sm" @click.stop="openDetail(t)">
                  <i class="fas fa-eye"></i> Inspect
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <Pagination v-if="pages > 1" :page="page" :pages="pages" @go="loadTasks($event)" />
    </SectionCard>

    <!-- Task detail drawer: safe execution metadata + recent events -->
    <div v-if="detail" class="agm-detail-overlay" @click.self="detail = null">
      <div class="agm-detail" role="dialog" aria-label="Agent task detail">
        <header>
          <h3>{{ detail.task.title || 'Agent task' }} <code>{{ detail.task.task_ref }}</code></h3>
          <button class="agm-detail-x" aria-label="Close" @click="detail = null"><i class="fas fa-xmark"></i></button>
        </header>
        <div class="agm-detail-body">
          <div class="agm-detail-grid">
            <div><label>User</label><p>{{ detail.task.user?.username }} ({{ detail.task.user?.email }})</p></div>
            <div><label>Status</label><p><StatusDot :status="statusColor(detail.task.status)" :label="detail.task.status" /></p></div>
            <div><label>Model</label><p>{{ detail.model || '—' }}</p></div>
            <div><label>Duration</label><p>{{ fmtDuration(detail.task.duration_ms) }}</p></div>
            <div><label>Web research</label><p>{{ detail.entitlements?.webSearch ? 'allowed (plan)' : 'not available' }}</p></div>
            <div><label>Preview</label><p>{{ detail.task.preview?.mode ? `${detail.task.preview.mode}${detail.task.preview.root ? ' · root: ' + detail.task.preview.root : ''}` : 'none' }}</p></div>
          </div>
          <div v-if="detail.task.error"><label>Failure reason</label><pre class="agm-pre error">{{ detail.task.error }} ({{ detail.task.error_code }})</pre></div>
          <div v-if="detail.prompt"><label>Prompt</label><pre class="agm-pre">{{ detail.prompt }}</pre></div>
          <div v-if="detail.result"><label>Result</label><pre class="agm-pre">{{ detail.result }}</pre></div>
          <div v-if="detail.plan?.length"><label>Plan</label>
            <ol class="agm-plan"><li v-for="(s, i) in detail.plan" :key="i" :class="s.status">{{ s.title }} <em>{{ s.status }}</em></li></ol>
          </div>
          <div v-if="detail.events?.length"><label>Recent execution events</label>
            <div class="agm-events">
              <div v-for="e in detail.events" :key="e.seq" class="agm-event">
                <code>#{{ e.seq }}</code> <b>{{ e.type }}</b> <span class="dim">{{ fmtDate(e.at) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * KinyaBot Agent V1.2 §14 — Superadmin Agent Management.
 * Real data only: metrics are aggregations of AgentTask documents,
 * task rows are real documents, health reflects actual configuration,
 * config changes are validated + audited server-side. Nothing here
 * invents statistics or claims unverified health.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import api from '../api'
import { useToast } from '../composables/useToast'
import SectionCard from '../components/SectionCard.vue'
import StatCard from '../components/StatCard.vue'
import StatusDot from '../components/StatusDot.vue'
import EmptyState from '../components/EmptyState.vue'
import Pagination from '../components/Pagination.vue'

const toast = useToast()
const overview = ref(null)
const health = ref(null)
const config = ref(null)
const tasks = ref([])
const tasksLoading = ref(false)
const page = ref(1)
const pages = ref(1)
const detail = ref(null)
const savingConfig = ref(false)
const configMsg = ref(null)
const configOk = ref(false)

const STATUSES = ['queued', 'planning', 'running', 'waiting_for_confirmation', 'completed', 'failed', 'cancelled']
const ACTIVE = ['queued', 'planning', 'running', 'waiting_for_confirmation']
const filters = reactive({ q: '', status: '', range: '' })

const isActive = (s) => ACTIVE.includes(s)
function statusColor(s) {
  if (s === 'completed') return 'success'
  if (s === 'failed') return 'error'
  if (s === 'cancelled') return 'muted'
  if (ACTIVE.includes(s)) return 'info'
  return 'muted'
}
function fmtNum(n) { return n == null ? '—' : String(n) }
function fmtDuration(ms) {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}
function fmtDate(d) { return d ? new Date(d).toLocaleString() : '—' }

async function loadOverview() {
  try { overview.value = (await api.get('/agent/overview', { params: { range: '7d' } })).data } catch {}
}
async function loadHealth() {
  try { health.value = (await api.get('/agent/health')).data } catch {}
}
async function loadConfig() {
  try {
    config.value = (await api.get('/agent/config')).data
    configMsg.value = null
  } catch {}
}
async function loadTasks(p = page.value) {
  tasksLoading.value = true
  try {
    const res = await api.get('/agent/tasks', {
      params: { page: p, limit: 25, status: filters.status || undefined, search: filters.q || undefined, range: filters.range || undefined },
    })
    tasks.value = res.data?.tasks || []
    page.value = res.data?.page || 1
    pages.value = res.data?.pages || 1
  } catch {
    toast.error('Agent tasks could not be loaded')
  } finally {
    tasksLoading.value = false
  }
}

async function openDetail(t) {
  try { detail.value = (await api.get(`/agent/tasks/${t.id}`)).data } catch { toast.error('Task detail could not be loaded') }
}

async function cancelTask(t) {
  if (!confirm(`Cancel agent task "${t.title || t.task_ref}"? Partial work remains in its workspace.`)) return
  try {
    await api.post(`/agent/tasks/${t.id}/cancel`)
    toast.success('Task cancelled')
    loadTasks()
    loadOverview()
  } catch (err) {
    toast.error(err?.response?.data?.error || 'The task could not be cancelled')
  }
}

async function saveConfig() {
  savingConfig.value = true
  configMsg.value = null
  try {
    const r = agentRuntimePatch.value
    await api.put('/agent/config', r)
    configOk.value = true
    configMsg.value = 'Configuration saved — validated server-side and recorded in the audit log.'
    toast.success('Agent configuration saved')
    loadOverview(); loadHealth()
  } catch (err) {
    configOk.value = false
    configMsg.value = err?.response?.data?.error || 'The configuration could not be saved'
    toast.error(configMsg.value)
  } finally {
    savingConfig.value = false
  }
}

/* Only the keys the backend allows — numbers are coerced honestly. */
const agentRuntimePatch = computed(() => {
  const r = config.value?.runtime || {}
  return {
    agent_enabled: !!r.agent_enabled,
    agent_max_concurrent: Number(r.agent_max_concurrent) || 2,
    agent_task_timeout_ms: Number(r.agent_task_timeout_ms) || 900000,
    agent_command_timeout_ms: Number(r.agent_command_timeout_ms) || 120000,
    agent_daily_limit: Number(r.agent_daily_limit) || 30,
    agent_preview_enabled: !!r.agent_preview_enabled,
    agent_uploads_enabled: !!r.agent_uploads_enabled,
    agent_websearch_policy: r.agent_websearch_policy === 'disabled' ? 'disabled' : 'plan',
  }
})

onMounted(() => {
  loadOverview()
  loadHealth()
  loadConfig()
  loadTasks(1)
})
</script>

<style scoped src="../views/admin-tables.css"></style>
<style scoped>
.agm { display: flex; flex-direction: column; gap: 18px; }
.agm-stats { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
.agm-loading { padding: 18px; text-align: center; color: var(--text-3); font-size: 13px; }
.agm-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
@media (max-width: 1100px) { .agm-grid { grid-template-columns: 1fr; } }

.agm-health { display: flex; flex-direction: column; gap: 0; }
.agm-hrow { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
.agm-hrow:last-child { border-bottom: none; }
.agm-hrow > span:first-child { color: var(--text-2); display: flex; align-items: center; gap: 8px; }
.agm-hrow > span:first-child i { width: 16px; color: var(--text-3); }
.agm-val { color: var(--text-1); text-align: right; }
.agm-val a { color: var(--accent, #6366f1); }

.agm-config { display: flex; flex-direction: column; }
.agm-crow { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 0; border-bottom: 1px solid var(--border); }
.agm-crow > label { font-size: 13px; color: var(--text-1); display: flex; align-items: center; gap: 8px; }
.agm-crow > label i { width: 16px; color: var(--text-3); }
.agm-crow input[type="number"], .agm-crow select {
  width: 140px; padding: 7px 10px; border-radius: var(--r-sm, 8px);
  border: 1px solid var(--border); background: var(--bg-input, rgba(255,255,255,.04)); color: var(--text-1); font-size: 13px;
}
.agm-ctl { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-2); }
.agm-ctl input { accent-color: var(--accent, #6366f1); }
.agm-config-foot { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding-top: 12px; flex-wrap: wrap; }
.agm-env { display: flex; flex-wrap: wrap; gap: 10px 16px; font-size: 11.5px; color: var(--text-3); }
.agm-env b { color: var(--text-2); font-weight: 600; }
.agm-cfg-msg { font-size: 12.5px; margin: 8px 0 0; color: var(--red, #ef4444); }
.agm-cfg-msg.ok { color: var(--green, #34d399); }

.agm-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
.agm-filters input[type="search"] { flex: 1; min-width: 200px; }
.agm-table-wrap { overflow-x: auto; }
.agm-row { cursor: pointer; }
.agm-row:hover { background: var(--bg-hover, rgba(255,255,255,.03)); }
.agm-title b { display: block; font-size: 13px; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agm-title code { font-size: 10.5px; color: var(--text-3); }
.agm-mini { font-size: 10.5px; color: var(--text-3); margin-right: 6px; }
.agm-stats-cell { font-size: 11.5px; color: var(--text-2); }
.agm-stats-cell span { margin-right: 8px; white-space: nowrap; }
.agm-preview-mode { font-size: 11px; padding: 2px 8px; border-radius: 999px; }
.agm-preview-mode.dev { background: rgba(59,130,246,.15); color: #60a5fa; }
.agm-preview-mode.static { background: rgba(16,185,129,.15); color: #34d399; }
.dim { color: var(--text-3); }
.btn.danger { color: var(--red, #ef4444); }

.agm-detail-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 200; display: grid; place-items: center; padding: 20px; }
.agm-detail { width: min(760px, 100%); max-height: 86vh; overflow-y: auto; background: var(--bg-1, #14161c); border: 1px solid var(--border); border-radius: 16px; }
.agm-detail header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid var(--border); position: sticky; top: 0; background: var(--bg-1, #14161c); z-index: 1; }
.agm-detail header h3 { margin: 0; font-size: 15px; display: flex; align-items: center; gap: 10px; }
.agm-detail header code { font-size: 11px; color: var(--text-3); }
.agm-detail-x { background: none; border: none; color: var(--text-3); font-size: 15px; cursor: pointer; padding: 6px; }
.agm-detail-body { padding: 16px 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.agm-detail-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.agm-detail-grid label, .agm-detail-body > div > label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--text-3); margin-bottom: 4px; }
.agm-detail-grid p { margin: 0; font-size: 13px; color: var(--text-1); }
.agm-pre { margin: 0; padding: 12px; border-radius: 10px; background: rgba(0,0,0,.25); border: 1px solid var(--border); font-size: 12px; white-space: pre-wrap; word-break: break-word; max-height: 220px; overflow-y: auto; }
.agm-pre.error { border-color: rgba(239,68,68,.4); color: #fca5a5; }
.agm-plan { margin: 0; padding-left: 20px; font-size: 12.5px; }
.agm-plan li { margin: 4px 0; }
.agm-plan li em { color: var(--text-3); font-size: 11px; margin-left: 6px; font-style: normal; }
.agm-plan li.done em { color: var(--green, #34d399); }
.agm-plan li.failed em { color: var(--red, #ef4444); }
.agm-events { display: flex; flex-direction: column; gap: 4px; max-height: 260px; overflow-y: auto; padding: 10px; background: rgba(0,0,0,.2); border-radius: 10px; }
.agm-event { font-size: 11.5px; color: var(--text-2); display: flex; gap: 8px; align-items: baseline; }
.agm-event code { color: var(--text-3); font-size: 10.5px; }
.agm-event b { color: var(--text-1); font-weight: 600; }
</style>
