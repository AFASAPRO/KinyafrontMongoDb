<template>
  <div class="wsv">
    <ErrorState v-if="error" :message="error.message" :status-code="error.status" @retry="load" />

    <!-- ═══ WEB SEARCH HEALTH (§37) ═══ -->
    <div v-if="loading && !d" class="grid-cards"><div v-for="i in 4" :key="i" class="skel-card"></div></div>

    <template v-else-if="d">
      <div class="health-row">
        <SectionCard title="Web Search" subtitle="Live connectivity check to the LangSearch Web Search API">
          <div class="prov">
            <div class="prov-main">
              <div class="prov-logo"><i class="fas fa-globe"></i></div>
              <div>
                <div class="prov-name">LangSearch</div>
                <div class="prov-detail">{{ d.health.detail || 'Web Search provider' }}</div>
              </div>
            </div>
            <div class="prov-side">
              <StatusDot :status="d.health.status === 'connected' ? 'ok' : (d.health.status === 'not_configured' ? 'unknown' : 'error')"
                :text="d.health.status === 'connected' ? 'Connected' : (d.health.status === 'not_configured' ? 'Not configured' : 'Problem')" />
            </div>
          </div>
          <p class="privacy"><i class="fas fa-lock"></i> The LangSearch API key lives only in the backend environment — it is never exposed to this console or the browser.</p>
        </SectionCard>

        <SectionCard title="Operational configuration" subtitle="Applies to every search immediately after saving">
          <template #actions>
            <button class="btn sm" :disabled="saving" @click="saveConfig"><i :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i> {{ saving ? 'Saving…' : 'Save changes' }}</button>
          </template>
          <div class="flags">
            <div class="flag-row">
              <div><div class="flag-l">Web Search</div><div class="flag-d">Global feature switch (Pro plan still governs access)</div></div>
              <button class="tog" :class="{ on: form.web_search_enabled }" @click="form.web_search_enabled = !form.web_search_enabled" aria-label="Toggle Web Search"><span class="knob"></span></button>
            </div>
            <div class="flag-row">
              <div><div class="flag-l">Automatic search</div><div class="flag-d">Let KinyaBot decide when a question needs the web (Chat mode)</div></div>
              <button class="tog" :class="{ on: form.web_search_auto_enabled }" @click="form.web_search_auto_enabled = !form.web_search_auto_enabled" aria-label="Toggle automatic search"><span class="knob"></span></button>
            </div>
          </div>
          <div class="num-grid">
            <div class="kbf">
              <label>Max results <b class="rv">{{ form.web_search_max_results }}</b></label>
              <input type="range" min="3" max="20" step="1" v-model.number="form.web_search_max_results" class="range" />
            </div>
            <div class="kbf">
              <label>Max searches per request <b class="rv">{{ form.web_search_max_queries }}</b></label>
              <input type="range" min="1" max="5" step="1" v-model.number="form.web_search_max_queries" class="range" />
            </div>
            <div class="kbf">
              <label>Cache duration (minutes) <b class="rv">{{ form.web_search_cache_minutes }}</b></label>
              <input type="range" min="0" max="240" step="5" v-model.number="form.web_search_cache_minutes" class="range" />
            </div>
            <div class="kbf">
              <label>Search timeout (ms) <b class="rv">{{ form.web_search_timeout_ms }}</b></label>
              <input type="range" min="3000" max="30000" step="1000" v-model.number="form.web_search_timeout_ms" class="range" />
            </div>
          </div>
          <div class="domains-grid">
            <div class="kbf">
              <label>Allowed domains <span class="lbl-hint">empty = whole web</span></label>
              <input v-model="formAllowedDomains" class="inp" placeholder="react.dev, docs.python.org" />
            </div>
            <div class="kbf">
              <label>Blocked domains <span class="lbl-hint">always excluded from results</span></label>
              <input v-model="formBlockedDomains" class="inp" placeholder="example.com, spam-site.net" />
            </div>
          </div>
        </SectionCard>
      </div>

      <!-- ═══ ANALYTICS (§36) ═══ -->
      <div class="kpis">
        <StatCard label="Searches today" :value="d.totals.today" icon="fas fa-magnifying-glass" :loading="loading" />
        <StatCard label="This week" :value="d.totals.week" icon="fas fa-calendar-week" :loading="loading" />
        <StatCard label="This month" :value="d.totals.month" :change="d.totals.change_30d" icon="fas fa-calendar" :loading="loading" />
        <StatCard label="Success rate" :display="d.success_rate != null ? d.success_rate + '%' : '—'" icon="fas fa-circle-check" :loading="loading" :sub="`${fmtNum(d.failed)} failed · ${fmtNum(d.empty)} empty`" />
        <StatCard label="Avg latency" :display="d.avg_latency_ms != null ? fmtMs(d.avg_latency_ms) : '—'" icon="fas fa-stopwatch" :loading="loading" :sub="d.p95_ms != null ? `p95 ${fmtMs(d.p95_ms)}` : ''" />
        <StatCard label="Pro users searching" :value="d.pro_users_searching_today" icon="fas fa-user-check" :loading="loading" sub="today" />
        <StatCard label="Automatic searches" :value="triggerCount('auto')" icon="fas fa-wand-magic-sparkles" :loading="loading" sub="decided by KinyaBot" />
        <StatCard label="Manual + Agent" :value="triggerCount('manual') + triggerCount('agent')" icon="fas fa-hand-pointer" :loading="loading" :sub="`${fmtNum(triggerCount('agent'))} from Agent`" />
      </div>

      <div class="two-col">
        <SectionCard title="Searches by plan" subtitle="All-time distribution (Pro-only feature)">
          <DonutChart
            :items="planItems"
            :center-value="fmtNum(d.totals.all ?? null)"
            center-label="searches"
            :colors="['#64748b', '#22d3ee', '#8b5cf6']"
          />
        </SectionCard>
        <SectionCard title="Search outcomes" subtitle="Every real attempt is logged">
          <DonutChart
            :items="statusItems"
            :center-value="fmtNum(d.totals.all ?? null)"
            center-label="attempts"
            :colors="['#22c55e', '#f59e0b', '#ef4444', '#64748b']"
          />
        </SectionCard>
      </div>

      <div class="two-col">
        <SectionCard title="Most searched queries" subtitle="Aggregated from real search metadata">
          <HBarList :items="(d.top_queries || []).map(q => ({ label: q.query, value: q.count }))" />
          <EmptyState v-if="!d.top_queries?.length" icon="fas fa-magnifying-glass" title="No searches yet" compact />
        </SectionCard>
        <SectionCard title="Most common source domains" subtitle="Domains actually returned by LangSearch">
          <HBarList :items="(d.top_domains || []).map(q => ({ label: q.domain, value: q.count }))" />
          <EmptyState v-if="!d.top_domains?.length" icon="fas fa-globe" title="No sources yet" compact />
        </SectionCard>
      </div>

      <SectionCard title="Recent searches" subtitle="Newest search attempts across all users (metadata only)">
        <div class="recent">
          <div v-for="r in d.recent" :key="r.id" class="recent-row">
            <span class="r-trig" :class="r.trigger"><i :class="r.trigger === 'manual' ? 'fas fa-hand-pointer' : (r.trigger === 'agent' ? 'fas fa-robot' : 'fas fa-wand-magic-sparkles')"></i></span>
            <div class="r-body">
              <div class="r-query">{{ r.query }}</div>
              <div class="r-meta">
                <b>{{ r.username || 'Unknown user' }}</b>
                · {{ r.plan }} plan
                · {{ r.result_count }} sources
                <template v-if="r.duration_ms"> · {{ fmtMs(r.duration_ms) }}</template>
                · {{ timeAgo(r.created_at) }}
              </div>
            </div>
            <span class="r-status" :class="r.status">{{ r.status }}</span>
          </div>
          <EmptyState v-if="!d.recent?.length" icon="fas fa-satellite-dish" title="No search activity yet" hint="Pro searches will appear here the moment they happen." compact />
        </div>
      </SectionCard>
    </template>
  </div>
</template>

<script setup>
/**
 * SuperAdmin → Web Search (§36-§38).
 * Real aggregations over the SearchLog collection + live LangSearch
 * health probe + safe operational configuration. The API key is
 * NEVER displayed anywhere on this page.
 */
import { ref, reactive, computed, onMounted } from 'vue'
import api, { apiError } from '../api'
import SectionCard from '../components/SectionCard.vue'
import StatusDot from '../components/StatusDot.vue'
import StatCard from '../components/StatCard.vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import DonutChart from '../components/charts/DonutChart.vue'
import HBarList from '../components/charts/HBarList.vue'
import { useToast } from '../composables/useToast'
import { fmtMs, fmtNum, timeAgo } from '../format'

const toast = useToast()
const d = ref(null)
const loading = ref(false)
const error = ref(null)
const saving = ref(false)
const form = reactive({})

const formAllowedDomains = computed({
  get: () => (form.web_search_allowed_domains || []).join(', '),
  set: (v) => { form.web_search_allowed_domains = String(v || '').split(',').map(s => s.trim()).filter(Boolean) },
})
const formBlockedDomains = computed({
  get: () => (form.web_search_blocked_domains || []).join(', '),
  set: (v) => { form.web_search_blocked_domains = String(v || '').split(',').map(s => s.trim()).filter(Boolean) },
})

const planItems = computed(() => (d.value?.by_plan || []).map(p => ({ label: p.plan || 'unknown', value: p.count })))
const statusItems = computed(() => (d.value?.statuses ? Object.entries(d.value.statuses).map(([k, v]) => ({ label: k, value: v })) : []))
function triggerCount(t) { return d.value?.by_trigger?.find(x => x.trigger === t)?.count || 0 }

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/admin/websearch/overview')
    d.value = data
    Object.keys(form).forEach(k => delete form[k])
    Object.assign(form, data.config || {
      web_search_enabled: data.health.enabled,
      web_search_auto_enabled: data.health.auto_enabled,
      web_search_max_results: 8,
      web_search_max_queries: 3,
      web_search_cache_minutes: 30,
      web_search_timeout_ms: 12000,
      web_search_allowed_domains: [],
      web_search_blocked_domains: [],
    })
  } catch (e) { error.value = apiError(e) }
  finally { loading.value = false }
}

async function saveConfig() {
  saving.value = true
  try {
    await api.put('/admin/websearch/config', { ...form })
    toast.success('Web Search configuration saved')
    load()
  } catch (e) { toast.error(apiError(e).message) }
  finally { saving.value = false }
}

onMounted(load)
</script>

<style scoped>
.wsv { display:flex; flex-direction:column; gap:16px; }
.health-row { display:grid; grid-template-columns:1fr 1.4fr; gap:16px; }
@media (max-width:1080px) { .health-row { grid-template-columns:1fr; } }
.prov { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.prov-main { display:flex; align-items:center; gap:14px; }
.prov-logo { width:48px; height:48px; border-radius:14px; background:var(--brand-soft); color:var(--brand-text); display:flex; align-items:center; justify-content:center; font-size:19px; }
.prov-name { font-size:16px; font-weight:800; color:var(--text-1); }
.prov-detail { font-size:12px; color:var(--text-3); margin-top:2px; }
.prov-side { display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
.privacy { margin:12px 0 0; font-size:11.5px; color:var(--text-3); display:flex; gap:6px; align-items:center; }
.privacy i { color:#34d399; }
.flags { display:grid; grid-template-columns:1fr 1fr; gap:8px 16px; margin-bottom:12px; }
@media (max-width:800px) { .flags { grid-template-columns:1fr; } }
.flag-row { display:flex; align-items:center; justify-content:space-between; gap:12px; background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:11px 14px; }
.flag-l { font-size:13px; font-weight:700; color:var(--text-1); }
.flag-d { font-size:11px; color:var(--text-3); margin-top:2px; }
.tog { width:44px; height:25px; border-radius:99px; background:var(--surface-elevated); border:1px solid var(--border); position:relative; cursor:pointer; transition:background .18s ease; flex:none; }
.tog .knob { position:absolute; top:2px; left:2px; width:19px; height:19px; border-radius:50%; background:var(--text-3); transition:all .18s ease; }
.tog.on { background:var(--brand); border-color:var(--brand); }
.tog.on .knob { left:21px; background:#fff; }
.num-grid, .domains-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px 20px; }
@media (max-width:800px) { .num-grid, .domains-grid { grid-template-columns:1fr; } }
.kbf { display:flex; flex-direction:column; gap:7px; }
.kbf label { font-size:12px; font-weight:700; color:var(--text-2); display:flex; justify-content:space-between; align-items:center; gap:8px; }
.lbl-hint { font-weight:500; color:var(--text-3); font-size:11px; }
.rv { color:var(--brand-text); font-variant-numeric:tabular-nums; }
.inp { background:var(--surface); border:1px solid var(--border); color:var(--text-1); border-radius:10px; padding:9px 12px; font-size:13px; outline:none; width:100%; }
.inp:focus { border-color:var(--brand); }
.range { width:100%; accent-color:var(--brand); }
.btn.sm { padding:8px 14px; font-size:12.5px; }
.kpis { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; }
@media (max-width:1100px) { .kpis { grid-template-columns:repeat(2, 1fr); } }
@media (max-width:560px) { .kpis { grid-template-columns:1fr; } }
.two-col { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media (max-width:980px) { .two-col { grid-template-columns:1fr; } }
.recent { display:flex; flex-direction:column; }
.recent-row { display:flex; gap:12px; align-items:center; padding:10px 2px; border-bottom:1px dashed var(--border); }
.recent-row:last-child { border-bottom:0; }
.r-trig { width:30px; height:30px; border-radius:9px; flex:none; display:flex; align-items:center; justify-content:center; font-size:11.5px; background:var(--brand-soft); color:var(--brand-text); }
.r-trig.manual { background:rgba(34,211,238,.12); color:#22d3ee; }
.r-trig.agent { background:rgba(139,92,246,.12); color:#8b5cf6; }
.r-body { min-width:0; flex:1; }
.r-query { font-size:13px; font-weight:600; color:var(--text-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.r-meta { font-size:11px; color:var(--text-3); margin-top:2px; }
.r-meta b { color:var(--text-2); font-weight:600; }
.r-status { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; padding:3px 9px; border-radius:99px; flex:none; }
.r-status.success { background:rgba(34,197,94,.12); color:#22c55e; }
.r-status.empty { background:rgba(245,158,11,.12); color:#f59e0b; }
.r-status.error, .r-status.rate_limited { background:rgba(239,68,68,.12); color:#ef4444; }
.grid-cards { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.skel-card { height:220px; border-radius:16px; background:linear-gradient(90deg, var(--surface-secondary) 25%, var(--surface-elevated) 50%, var(--surface-secondary) 75%); background-size:200% 100%; animation:sksh 1.4s infinite; }
@keyframes sksh { 0% { background-position:200% 0 } 100% { background-position:-200% 0 } }
</style>
