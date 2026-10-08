<template>
  <div class="dv">
    <!-- Range selector -->
    <div class="range-row">
      <RangeTabs v-model="range" @update:model-value="setRange" />
      <span v-if="lastUpdated" class="updated-inline">Last updated {{ timeAgo(lastUpdated) }}</span>
    </div>

    <!-- System status strip — real health checks, not assumptions -->
    <div class="status-strip">
      <div class="ss-left">
        <span class="ss-title">System status</span>
        <StatusDot :status="health?.overall || 'unknown'" />
        <span v-if="healthError" class="ss-err"><i class="fas fa-triangle-exclamation"></i> health unavailable</span>
      </div>
      <div class="ss-right" v-if="health">
        <StatusDot v-for="c in stripChecks" :key="c.key" :status="health.checks?.[c.key]?.status || 'unknown'" :text="c.label" />
      </div>
      <div class="ss-right" v-else-if="healthLoading">
        <div class="ss-skel" v-for="i in 4" :key="i"></div>
      </div>
    </div>

    <!-- KPI cards -->
    <ErrorState v-if="ovError" :message="ovError.message" :status-code="ovError.status" @retry="loadOverview" />
    <div class="kpis">
      <StatCard label="Total users" :value="ov?.users?.total" icon="fas fa-users" :loading="loading" />
      <StatCard label="Active users" :value="ov?.users?.active_in_range" :change="ov?.users?.active_change" :icon="'fas fa-user-check'" :loading="loading" :change-note="`last login within ${rangeLabel}`" />
      <StatCard label="New users" :value="ov?.users?.new_in_range" :change="ov?.users?.new_change" :icon="'fas fa-user-plus'" :loading="loading" :change-note="`registered within ${rangeLabel}`" />
      <StatCard label="Online now" :value="ov?.users?.online_now" :icon="'fas fa-circle-nodes'" :loading="loading" sub="live socket connections" />
      <StatCard label="AI requests" :value="ov?.ai?.requests" :change="ov?.ai?.requests_change" :icon="'fas fa-robot'" :loading="loading" :change-note="`within ${rangeLabel}`" />
      <StatCard label="AI success rate" :display="ov?.ai?.success_rate != null ? ov.ai.success_rate + '%' : '—'" :icon="'fas fa-circle-check'" :loading="loading" :sub="ov ? `${fmtNum(ov.ai.failed)} failed` : ''" />
      <StatCard label="Avg AI latency" :display="ov?.ai?.avg_latency_ms != null ? fmtMs(ov.ai.avg_latency_ms) : '—'" :icon="'fas fa-stopwatch'" :loading="loading" />
      <StatCard label="Messages" :value="ov?.messages?.total_in_range" :change="ov?.messages?.change" :icon="'fas fa-comment'" :loading="loading" :change-note="`within ${rangeLabel}`" />
    </div>

    <!-- Charts -->
    <div class="charts">
      <SectionCard title="User growth" :subtitle="`New registrations · ${rangeLabel}`">
        <LineChart :series="userSeries" :labels="ov?.series?.users?.map(p => prettyDate(p.date)) || []" :height="170" :y-format="fmtNumFn" />
      </SectionCard>
      <SectionCard title="Messages" :subtitle="`Volume · ${rangeLabel}`">
        <BarChart :points="msgPoints" :labels="[]" color="#22d3ee" :height="170" :y-format="fmtNumFn" />
      </SectionCard>
    </div>
    <div class="charts">
      <SectionCard title="AI requests & errors" :subtitle="`Real requests tracked by the backend · ${rangeLabel}`">
        <LineChart
          :series="[
            { name: 'Requests', color: '#6366f1', points: aiReqPoints },
            { name: 'Errors', color: '#f87171', points: aiErrPoints, dashed: true, area: false },
          ]"
          :labels="ov?.series?.ai?.map(p => prettyDate(p.date)) || []" :height="170" :y-format="fmtNumFn" />
      </SectionCard>
      <SectionCard title="Model usage" subtitle="Assistant messages by model">
        <DonutChart :items="modelItems" :center-value="fmtNum(ov?.ai?.requests ?? null)" center-label="AI requests" />
      </SectionCard>
    </div>

    <!-- ═══ SUBSCRIPTIONS (§23) — real plan data; 0 when empty ═══ -->
    <div class="sub-strip">
      <StatCard label="Free users" :value="ov?.subscription?.plans?.free" icon="fas fa-feather" :loading="loading" sub="plan distribution" />
      <StatCard label="Plus users" :value="ov?.subscription?.plans?.plus" icon="fas fa-bolt" :loading="loading" />
      <StatCard label="Pro users" :value="ov?.subscription?.plans?.pro" icon="fas fa-gem" :loading="loading" />
      <StatCard label="Pending requests" :value="ov?.subscription?.requests?.pending" icon="fas fa-hourglass-half" :loading="loading" sub="awaiting review" />
      <StatCard label="Chats today" :value="ov?.subscription?.today?.chats_used" icon="fas fa-comments" :loading="loading" sub="all plans" />
      <StatCard label="Near limit today" :value="ov?.subscription?.today?.near_limit" icon="fas fa-gauge-high" :loading="loading" sub="≥80% of daily chats" />
      <StatCard label="Reached limit today" :value="ov?.subscription?.today?.reached_limit" icon="fas fa-triangle-exclamation" :loading="loading" sub="blocked until tomorrow" />
      <StatCard label="Approved requests" :value="ov?.subscription?.requests?.approved" icon="fas fa-circle-check" :loading="loading" sub="all time" />
    </div>

    <!-- ═══ WEB SEARCH HEALTH (§37) — real SearchLog data + provider status ═══ -->
    <div v-if="ov?.websearch" class="sub-strip ws-strip">
      <div class="ws-strip-head">
        <span class="ws-strip-title"><i class="fas fa-globe"></i> WEB SEARCH</span>
        <StatusDot :status="ov.websearch.provider === 'connected' ? 'ok' : 'unknown'" :text="ov.websearch.provider === 'connected' ? 'LangSearch' : 'Not configured'" />
      </div>
      <div class="ws-strip-cards">
        <StatCard label="Searches today" :value="ov.websearch.searches_today" icon="fas fa-magnifying-glass" :loading="loading" />
        <StatCard label="Success rate" :display="ov.websearch.success_rate != null ? ov.websearch.success_rate + '%' : '—'" icon="fas fa-circle-check" :loading="loading" />
        <StatCard label="Avg latency" :display="ov.websearch.avg_latency_ms != null ? fmtMs(ov.websearch.avg_latency_ms) : '—'" icon="fas fa-stopwatch" :loading="loading" />
        <StatCard label="Feature" :display="ov.websearch.enabled ? 'Enabled' : 'Disabled'" icon="fas fa-toggle-on" :loading="loading" sub="AI Control switch" />
      </div>
    </div>

    <div class="charts">
      <SectionCard title="Plan distribution" subtitle="Users per plan · live from UserPlan records">
        <DonutChart
          :items="planItems"
          :center-value="fmtNum(ov?.users?.total ?? null)"
          center-label="users"
          :colors="['#64748b', '#22d3ee', '#8b5cf6']"
        />
      </SectionCard>
      <SectionCard title="Upgrade requests" subtitle="All-time status of every submitted request">
        <DonutChart
          :items="requestItems"
          :center-value="fmtNum(reqTotal ?? null)"
          center-label="requests"
          :colors="['#f59e0b', '#22c55e', '#ef4444']"
        />
      </SectionCard>
    </div>

    <!-- Activity + recent users -->
    <div class="bottom-grid">
      <SectionCard title="Live activity" :padded="false">
        <template #actions>
          <span class="live-pill"><span class="pulse"></span>{{ onlineCount }} online</span>
        </template>
        <div class="feed">
          <transition-group name="feed">
            <div v-for="e in feed" :key="e.id" class="feed-row">
              <div class="feed-av" :style="{ background: avatarColor(e.username || 'system') }">{{ (e.username || 'S').slice(0,1).toUpperCase() }}</div>
              <div class="feed-body">
                <div class="feed-line"><b>{{ e.username || 'System' }}</b> {{ verb(e.action) }}</div>
                <div class="feed-ago">{{ timeAgo(e.created_at) }}</div>
              </div>
              <span class="feed-tag" :class="tagClass(e.action)">{{ e.action.replace(/_/g, ' ') }}</span>
            </div>
          </transition-group>
          <EmptyState v-if="!feed.length && !feedLoading" icon="fas fa-satellite-dish" title="Waiting for activity" hint="Real user and system events will appear here the moment they happen." compact />
          <div v-if="feedLoading" class="feed-skels"><div class="feed-skel" v-for="i in 4" :key="i"></div></div>
        </div>
      </SectionCard>

      <SectionCard title="Recent registrations">
        <template #actions>
          <button class="link" @click="$router.push('/admin/users')">View all</button>
        </template>
        <div class="ru-list">
          <div v-for="u in (ov?.recent_users || [])" :key="u.id" class="ru-row">
            <div class="ru-av" :style="{ background: avatarColor(u.username) }">{{ u.username?.[0]?.toUpperCase() }}</div>
            <div class="ru-info">
              <div class="ru-name">{{ u.username }}</div>
              <div class="ru-mail">{{ u.email }}</div>
            </div>
            <span class="ru-badge" :class="u.is_banned ? 'red' : 'green'">{{ u.is_banned ? 'Banned' : 'Active' }}</span>
            <span class="ru-date">{{ timeAgo(u.created_at) }}</span>
          </div>
          <EmptyState v-if="ov && !ov.recent_users?.length" icon="fas fa-users" title="No users yet" compact />
        </div>
      </SectionCard>
    </div>

    <p class="updated" v-if="lastUpdated">Last updated {{ timeAgo(lastUpdated) }}</p>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import api, { apiError } from '../api'
import { onAdminEvent, conn } from '../socket'
import StatCard from '../components/StatCard.vue'
import StatusDot from '../components/StatusDot.vue'
import SectionCard from '../components/SectionCard.vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import RangeTabs from '../components/RangeTabs.vue'
import LineChart from '../components/charts/LineChart.vue'
import BarChart from '../components/charts/BarChart.vue'
import DonutChart from '../components/charts/DonutChart.vue'
import { fmtNum, fmtMs, timeAgo, avatarColor, bindNowTick } from '../format'
const fmtNumFn = fmtNum

const range = ref('7d')
const rangeLabel = computed(() => ({ '24h': '24 hours', '7d': '7 days', '30d': '30 days', '90d': '90 days' }[range.value]))
const tick = ref(0)
bindNowTick(() => tick.value)

/* Overview data — one honest endpoint */
const ov = ref(null)
const loading = ref(false)
const ovError = ref(null)
const lastUpdated = ref(null)
async function loadOverview() {
  loading.value = true
  ovError.value = null
  try {
    const { data } = await api.get('/admin/overview', { params: { range: range.value } })
    ov.value = data
    lastUpdated.value = new Date()
  } catch (e) { ovError.value = apiError(e) }
  finally { loading.value = false }
}

/* Health (cached server-side, 15s TTL) */
const health = ref(null)
const healthLoading = ref(false)
const healthError = ref(null)
async function loadHealth() {
  healthLoading.value = true
  healthError.value = null
  try { health.value = (await api.get('/admin/health/details')).data }
  catch (e) { healthError.value = apiError(e) }
  finally { healthLoading.value = false }
}
const stripChecks = [
  { key: 'database', label: 'Database' },
  { key: 'aiProvider', label: 'AI provider' },
  { key: 'socket', label: 'Realtime' },
  { key: 'auth', label: 'Auth' },
]

/* Live activity feed — real events, realtime push + REST fallback */
const feed = ref([])
const feedLoading = ref(false)
const onlineCount = ref(0)
const VERBS = {
  register: 'created an account', login: 'signed in', onboarded: 'completed onboarding',
  new_chat: 'started a new chat', message: 'sent a message', online: 'came online',
  offline: 'went offline', banned: 'was banned', unbanned: 'was unbanned',
  broadcast: 'broadcast a notification', admin_login: 'signed into the Superadmin console',
  ai_test: 'ran an AI test', ai_request_failed: 'hit an AI failure',
  content_flagged: 'triggered a moderation flag', user_deleted: 'was deleted by an admin',
  knowledge_added: 'added a knowledge document',
}
function verb(a) { return VERBS[a] || a.replace(/_/g, ' ') }
function tagClass(a) {
  if (['banned', 'ai_request_failed', 'content_flagged'].includes(a)) return 'warn'
  if (['offline'].includes(a)) return 'muted'
  return 'ok'
}
async function loadActivity() {
  feedLoading.value = true
  try {
    const { data } = await api.get('/admin/activity', { params: { limit: 20 } })
    feed.value = data.events || []
    onlineCount.value = data.online_count || 0
  } catch {}
  finally { feedLoading.value = false }
}

/* Chart data mapping */
const userSeries = computed(() => [{ name: 'New users', color: '#8b5cf6', points: (ov.value?.series?.users || []).map(p => ({ label: p.date, y: p.count })) }])
const msgPoints = computed(() => (ov.value?.series?.messages || []).map(p => ({ label: prettyDate(p.date), value: p.count, color: '#22d3ee' })))
const aiReqPoints = computed(() => (ov.value?.series?.ai || []).map(p => ({ label: p.date, y: p.requests })))
const aiErrPoints = computed(() => (ov.value?.series?.ai || []).map(p => ({ label: p.date, y: p.errors })))
const modelItems = computed(() => (ov.value?.ai?.by_model || []).map(m => ({ label: m.model, value: m.count })))

/* Subscription charts (§23) — real values only, zeros when empty */
const planItems = computed(() => [
  { label: 'Free', value: ov.value?.subscription?.plans?.free || 0 },
  { label: 'Plus', value: ov.value?.subscription?.plans?.plus || 0 },
  { label: 'Pro', value: ov.value?.subscription?.plans?.pro || 0 },
])
const requestItems = computed(() => [
  { label: 'Pending', value: ov.value?.subscription?.requests?.pending || 0 },
  { label: 'Approved', value: ov.value?.subscription?.requests?.approved || 0 },
  { label: 'Rejected', value: ov.value?.subscription?.requests?.rejected || 0 },
])
const reqTotal = computed(() => requestItems.value.reduce((s, i) => s + i.value, 0))

function prettyDate(d) {
  if (!d) return ''
  if (d.includes('T')) return d.slice(11, 13) + ':00'
  return d.slice(5)
}

/* Realtime wiring */
let offActivity, offAI, offNotif, tickInt, pollOv, pollHl
onMounted(async () => {
  tickInt = setInterval(() => { tick.value++ }, 30000)
  await Promise.all([loadOverview(), loadActivity(), loadHealth()])
  offActivity = onAdminEvent('admin_activity', (e) => {
    feed.value = [{ id: e.id || `live_${Date.now()}`, action: e.action, username: e.username, meta: e.meta, created_at: e.created_at }, ...feed.value].slice(0, 20)
    if (e.action === 'online') onlineCount.value++
    if (e.action === 'offline') onlineCount.value = Math.max(0, onlineCount.value - 1)
  })
  offAI = onAdminEvent('admin_ai_request', () => {})
  offNotif = onAdminEvent('admin_notification_new', () => {})
  // REST polling fallback — keeps data honest even when realtime drops
  pollOv = setInterval(() => { if (conn.status !== 'live') loadOverview() }, 60000)
  pollHl = setInterval(loadHealth, 60000)
})
onBeforeUnmount(() => { offActivity?.(); offAI?.(); offNotif?.(); clearInterval(tickInt); clearInterval(pollOv); clearInterval(pollHl) })

function setRange(r) { range.value = r; loadOverview() }
</script>

<style scoped>
.dv { display:flex; flex-direction:column; gap:16px; }
.range-row { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.updated-inline { font-size:11.5px; color:var(--text-3); }
.status-strip { display:flex; align-items:center; justify-content:space-between; gap:12px; background:var(--surface-secondary); border:1px solid var(--border); border-radius:14px; padding:12px 16px; flex-wrap:wrap; }
.ss-left { display:flex; align-items:center; gap:10px; }
.ss-title { font-size:13px; font-weight:700; color:var(--text-1); }
.ss-err { font-size:12px; color:#f87171; display:inline-flex; gap:5px; }
.ss-right { display:flex; gap:8px; flex-wrap:wrap; }
.ss-skel { width:88px; height:24px; border-radius:99px; background:linear-gradient(90deg, var(--surface-secondary) 25%, var(--surface-elevated) 50%, var(--surface-secondary) 75%); background-size:200% 100%; animation:sh 1.4s infinite; }
@keyframes sh { 0% { background-position:200% 0 } 100% { background-position:-200% 0 } }
.kpis { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; }
.sub-strip { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; }
@media (max-width:1100px) { .kpis { grid-template-columns:repeat(2, 1fr); } .sub-strip { grid-template-columns:repeat(2, 1fr); } }
@media (max-width:520px) { .kpis { grid-template-columns:1fr 1fr; } .sub-strip { grid-template-columns:1fr 1fr; } }
/* Web Search health strip (§37) */
.ws-strip { display:flex; flex-direction:column; gap:10px; }
.ws-strip-head { display:flex; align-items:center; gap:12px; }
.ws-strip-title { font-size:12px; font-weight:800; letter-spacing:.1em; color:var(--text-2); display:flex; align-items:center; gap:8px; }
.ws-strip-title i { color:var(--brand-text); font-size:12px; }
.ws-strip-cards { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; }
@media (max-width:1100px) { .ws-strip-cards { grid-template-columns:repeat(2, 1fr); } }
@media (max-width:520px) { .ws-strip-cards { grid-template-columns:1fr 1fr; } }
.charts { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media (max-width:980px) { .charts { grid-template-columns:1fr; } }
.bottom-grid { display:grid; grid-template-columns:1.2fr 1fr; gap:16px; }
@media (max-width:980px) { .bottom-grid { grid-template-columns:1fr; } }
.live-pill { display:inline-flex; align-items:center; gap:7px; font-size:12px; font-weight:700; color:#34d399; background:rgba(52,211,153,.1); border:1px solid rgba(52,211,153,.3); border-radius:99px; padding:4px 11px; }
.pulse { width:8px; height:8px; border-radius:50%; background:#34d399; animation:pp 2s infinite; }
@keyframes pp { 0%,100% { opacity:1 } 50% { opacity:.3 } }
.feed { display:flex; flex-direction:column; gap:4px; max-height:390px; overflow-y:auto; }
.feed-row { display:flex; align-items:center; gap:11px; padding:9px 4px; border-bottom:1px dashed var(--border); }
.feed-row:last-child { border-bottom:0; }
.feed-av { width:34px; height:34px; border-radius:10px; color:#fff; font-weight:800; font-size:13px; display:flex; align-items:center; justify-content:center; flex:none; }
.feed-body { flex:1; min-width:0; }
.feed-line { font-size:13px; color:var(--text-2); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.feed-line b { color:var(--text-1); }
.feed-ago { font-size:11px; color:var(--text-3); margin-top:2px; }
.feed-tag { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.05em; border-radius:7px; padding:4px 8px; flex:none; }
.feed-tag.ok { background:rgba(52,211,153,.1); color:#34d399; }
.feed-tag.warn { background:rgba(245,158,11,.12); color:#fbbf24; }
.feed-tag.muted { background:var(--surface-elevated); color:var(--text-3); }
.feed-enter-active { transition:all .3s ease; }
.feed-enter-from { opacity:0; transform:translateY(-6px); }
.feed-skels { display:flex; flex-direction:column; gap:10px; padding:6px 0; }
.feed-skel { height:44px; border-radius:10px; background:linear-gradient(90deg, var(--surface-secondary) 25%, var(--surface-elevated) 50%, var(--surface-secondary) 75%); background-size:200% 100%; animation:sh 1.4s infinite; }
.ru-list { display:flex; flex-direction:column; }
.ru-row { display:flex; align-items:center; gap:11px; padding:9px 0; border-bottom:1px dashed var(--border); }
.ru-row:last-child { border-bottom:0; }
.ru-av { width:34px; height:34px; border-radius:10px; color:#fff; font-weight:800; font-size:13px; display:flex; align-items:center; justify-content:center; flex:none; }
.ru-info { flex:1; min-width:0; }
.ru-name { font-size:13px; font-weight:700; color:var(--text-1); }
.ru-mail { font-size:11.5px; color:var(--text-3); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ru-badge { font-size:10px; font-weight:800; border-radius:7px; padding:3px 8px; }
.ru-badge.green { background:rgba(52,211,153,.12); color:#34d399; }
.ru-badge.red { background:rgba(239,68,68,.12); color:#f87171; }
.ru-date { font-size:11px; color:var(--text-3); flex:none; width:70px; text-align:right; }
.link { background:transparent; border:0; color:var(--brand-text); font-size:12.5px; font-weight:700; cursor:pointer; }
.link:hover { text-decoration:underline; }
.updated { text-align:right; font-size:11px; color:var(--text-3); margin:0; }
.err-banner { margin-bottom:8px; }
</style>
