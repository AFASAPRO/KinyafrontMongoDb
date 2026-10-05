<template>
  <div class="hv">
    <!-- Overall banner -->
    <div class="overall" :class="d?.overall || 'unknown'">
      <div class="ov-left">
        <span class="ov-icon"><i :class="overallIcon"></i></span>
        <div>
          <div class="ov-title">{{ overallText }}</div>
          <div class="ov-sub" v-if="d">Checked {{ timeAgo(d.checked_at) }}<template v-if="d.cached"> (cached, {{ checkWindow }}s window)</template></div>
        </div>
      </div>
      <button class="btn ghost" :disabled="checking" @click="recheck">
        <i :class="checking ? 'fas fa-spinner fa-spin' : 'fas fa-rotate-right'"></i> Recheck now
      </button>
    </div>
    <ErrorState v-if="error" :message="error.message" :status-code="error.status" @retry="load" />

    <!-- Component grid -->
    <div class="comp-grid" v-if="d">
      <div v-for="c in components" :key="c.key" class="comp">
        <div class="comp-top">
          <span class="comp-icon"><i :class="c.icon"></i></span>
          <span class="comp-name">{{ c.label }}</span>
          <StatusDot :status="d.checks?.[c.key]?.status || 'unknown'" />
        </div>
        <div class="comp-detail">{{ d.checks?.[c.key]?.detail || '—' }}</div>
        <div class="comp-lat" v-if="d.checks?.[c.key]?.latency_ms != null">response {{ fmtMs(d.checks[c.key].latency_ms) }}</div>
      </div>
    </div>
    <div class="comp-grid" v-else-if="!error">
      <div v-for="i in 8" :key="i" class="comp skel"></div>
    </div>

    <!-- Process info -->
    <div class="proc-row" v-if="d?.checks?.process">
      <div class="pk"><span>Uptime</span><b>{{ fmtUptime(d.checks.process.uptime_s) }}</b></div>
      <div class="pk"><span>Node</span><b>{{ d.checks.process.node_version }}</b></div>
      <div class="pk"><span>Memory (RSS)</span><b>{{ fmtSize(d.checks.process.rss_bytes) }}</b></div>
      <div class="pk"><span>Heap used</span><b>{{ fmtSize(d.checks.process.heap_used_bytes) }}</b></div>
    </div>

    <!-- Performance -->
    <div class="perf" v-if="d?.performance">
      <SectionCard title="API performance" subtitle="Measured from real AI request telemetry (24h)">
        <div class="mini-kpis">
          <div class="mk"><span class="mk-v">{{ d.performance.p50 != null ? fmtMs(d.performance.p50) : '—' }}</span><span class="mk-l">P50</span></div>
          <div class="mk"><span class="mk-v">{{ d.performance.p95 != null ? fmtMs(d.performance.p95) : '—' }}</span><span class="mk-l">P95</span></div>
          <div class="mk"><span class="mk-v">{{ d.performance.p99 != null ? fmtMs(d.performance.p99) : '—' }}</span><span class="mk-l">P99</span></div>
          <div class="mk"><span class="mk-v">{{ d.performance.error_rate != null ? d.performance.error_rate + '%' : '—' }}</span><span class="mk-l">Error rate</span></div>
          <div class="mk"><span class="mk-v">{{ fmtNum(d.performance.requests_24h) }}</span><span class="mk-l">Requests 24h</span></div>
          <div class="mk"><span class="mk-v">{{ fmtNum(d.performance.sample_size) }}</span><span class="mk-l">Latency samples</span></div>
        </div>
        <BarChart :points="hourlyReq" color="#22d3ee" :height="150" :y-format="fmtNumFn" :max-labels="12" />
      </SectionCard>
    </div>

    <!-- System logs (technical) -->
    <SectionCard title="System logs" subtitle="Technical backend log — distinct from the administrative audit trail">
      <template #actions>
        <div class="lvl-row">
          <button v-for="l in ['all', 'info', 'warn', 'error', 'debug']" :key="l" class="chip" :class="{ active: level === l }" @click="level = l; logPage = 1; loadLogs()">{{ l }}</button>
        </div>
      </template>
      <div class="logs" v-if="logs.length">
        <div v-for="l in logs" :key="l.id" class="log-line" :class="l.level">
          <span class="ll-ts">{{ shortDate(l.created_at) }}</span>
          <span class="ll-lv">{{ l.level }}</span>
          <span class="ll-src">{{ l.source || '—' }}</span>
          <span class="ll-msg">{{ l.message }}</span>
        </div>
      </div>
      <EmptyState v-else-if="!logsLoading" icon="fas fa-scroll" title="No logs" hint="Backend events will appear here." />
      <div v-if="logsLoading" class="skel-table slim"><div v-for="i in 4" :key="i" class="skel-row"></div></div>
      <Pagination :page="logPage" :pages="logPages" @change="p => { logPage = p; loadLogs() }" />
    </SectionCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import api, { apiError } from '../api'
import StatusDot from '../components/StatusDot.vue'
import SectionCard from '../components/SectionCard.vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import Pagination from '../components/Pagination.vue'
import BarChart from '../components/charts/BarChart.vue'
import { fmtMs, fmtNum, fmtSize, fmtUptime, timeAgo, shortDate } from '../format'
const fmtNumFn = fmtNum

const d = ref(null), loading = ref(false), checking = ref(false), error = ref(null)
const checkWindow = 15
const components = [
  { key: 'database', label: 'Database', icon: 'fas fa-database' },
  { key: 'aiProvider', label: 'AI provider', icon: 'fas fa-microchip' },
  { key: 'socket', label: 'Realtime (Socket.IO)', icon: 'fas fa-tower-broadcast' },
  { key: 'auth', label: 'Authentication', icon: 'fas fa-key' },
  { key: 'email', label: 'Email (SMTP)', icon: 'fas fa-envelope' },
  { key: 'storage', label: 'File storage', icon: 'fas fa-hard-drive' },
  { key: 'push', label: 'Push notifications', icon: 'fas fa-bell' },
]

async function load({ force = false } = {}) {
  if (force) checking.value = true
  else loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/admin/health/details', { params: force ? { force: 1 } : {} })
    d.value = data
  } catch (e) { error.value = apiError(e) }
  finally { loading.value = false; checking.value = false }
}
function recheck() { load({ force: true }) }

const hourlyReq = computed(() => (d.value?.performance?.by_hour || []).map(h => ({ label: `${h.hour}h`, value: h.requests })))
const overallIcon = computed(() => ({ operational: 'fas fa-circle-check', degraded: 'fas fa-triangle-exclamation', down: 'fas fa-circle-xmark', unknown: 'fas fa-circle-question' }[d.value?.overall] || 'fas fa-circle-question'))
const overallText = computed(() => ({
  operational: 'All systems operational',
  degraded: 'Degraded — attention needed',
  down: 'Outage detected',
  unknown: 'Status unknown',
}[d.value?.overall] || 'Status unknown'))

/* System logs */
const logs = ref([]), level = ref('all'), logPage = ref(1), logPages = ref(1), logsLoading = ref(false)
async function loadLogs() {
  logsLoading.value = true
  try {
    const { data } = await api.get('/admin/logs', { params: { level: level.value === 'all' ? '' : level.value, page: logPage.value } })
    logs.value = data.logs; logPages.value = data.pages
  } catch {}
  finally { logsLoading.value = false }
}

let poll
onMounted(() => { load(); loadLogs(); poll = setInterval(() => load(), 30000) })
onBeforeUnmount(() => clearInterval(poll))
</script>

<style scoped>
.hv { display:flex; flex-direction:column; gap:16px; }
.overall { display:flex; align-items:center; justify-content:space-between; gap:14px; border-radius:16px; padding:18px 20px; border:1px solid var(--border); background:var(--surface-secondary); flex-wrap:wrap; }
.overall.operational { border-color:rgba(34,197,94,.35); background:rgba(34,197,94,.06); }
.overall.degraded { border-color:rgba(245,158,11,.4); background:rgba(245,158,11,.06); }
.overall.down { border-color:rgba(239,68,68,.4); background:rgba(239,68,68,.06); }
.ov-left { display:flex; align-items:center; gap:14px; }
.ov-icon { width:46px; height:46px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:20px; background:var(--surface-elevated); }
.overall.operational .ov-icon { color:#34d399; }
.overall.degraded .ov-icon { color:#fbbf24; }
.overall.down .ov-icon { color:#f87171; }
.overall.unknown .ov-icon { color:var(--text-3); }
.ov-title { font-size:16.5px; font-weight:800; color:var(--text-1); }
.ov-sub { font-size:12px; color:var(--text-3); margin-top:2px; }
.comp-grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; }
@media (max-width:1100px) { .comp-grid { grid-template-columns:repeat(2, 1fr); } }
@media (max-width:560px) { .comp-grid { grid-template-columns:1fr; } }
.comp { background:var(--surface-secondary); border:1px solid var(--border); border-radius:14px; padding:14px 16px; display:flex; flex-direction:column; gap:8px; min-width:0; }
.comp.skel { height:110px; background:linear-gradient(90deg, var(--surface-secondary) 25%, var(--surface-elevated) 50%, var(--surface-secondary) 75%); background-size:200% 100%; animation:sksh 1.4s infinite; }
@keyframes sksh { 0% { background-position:200% 0 } 100% { background-position:-200% 0 } }
.comp-top { display:flex; align-items:center; gap:10px; }
.comp-icon { color:var(--brand-text); font-size:13px; width:18px; }
.comp-name { font-weight:750; font-size:13px; color:var(--text-1); flex:1; }
.comp-detail { font-size:11.5px; color:var(--text-3); word-break:break-word; }
.comp-lat { font-size:11px; color:var(--text-2); font-weight:700; font-variant-numeric:tabular-nums; }
.proc-row { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; }
@media (max-width:800px) { .proc-row { grid-template-columns:repeat(2, 1fr); } }
.pk { background:var(--surface-secondary); border:1px solid var(--border); border-radius:12px; padding:11px 14px; display:flex; justify-content:space-between; align-items:center; gap:8px; }
.pk span { font-size:11.5px; color:var(--text-3); }
.pk b { font-size:13px; color:var(--text-1); font-variant-numeric:tabular-nums; }
.mini-kpis { display:grid; grid-template-columns:repeat(6, 1fr); gap:10px; margin-bottom:14px; }
@media (max-width:900px) { .mini-kpis { grid-template-columns:repeat(3, 1fr); } }
.mk { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:11px 13px; display:flex; flex-direction:column; gap:2px; }
.mk-v { font-size:17px; font-weight:750; color:var(--text-1); font-variant-numeric:tabular-nums; }
.mk-l { font-size:10.5px; color:var(--text-3); }
.lvl-row { display:flex; gap:5px; flex-wrap:wrap; }
.chip { background:var(--surface); border:1px solid var(--border); color:var(--text-2); border-radius:99px; padding:5px 12px; font-size:11.5px; font-weight:700; cursor:pointer; text-transform:capitalize; }
.chip.active { background:var(--brand); border-color:var(--brand); color:#fff; }
.logs { display:flex; flex-direction:column; font-family:ui-monospace, monospace; font-size:12px; max-height:380px; overflow-y:auto; }
.log-line { display:flex; gap:12px; padding:7px 4px; border-bottom:1px dashed var(--border); align-items:baseline; }
.ll-ts { color:var(--text-3); flex:none; width:120px; }
.ll-lv { flex:none; width:46px; font-weight:800; text-transform:uppercase; font-size:10px; }
.log-line.info .ll-lv { color:#67e8f9; } .log-line.warn .ll-lv { color:#fbbf24; }
.log-line.error .ll-lv { color:#f87171; } .log-line.debug .ll-lv { color:var(--text-3); }
.ll-src { color:var(--brand-text); flex:none; width:70px; overflow:hidden; text-overflow:ellipsis; }
.ll-msg { color:var(--text-2); word-break:break-word; }
.btn { border:0; border-radius:11px; padding:10px 16px; font-weight:700; font-size:13px; cursor:pointer; background:var(--brand); color:#fff; display:inline-flex; align-items:center; gap:8px; }
.btn.ghost { background:transparent; border:1px solid var(--border); color:var(--text-1); }
.btn:disabled { opacity:.5; cursor:default; }
</style>
