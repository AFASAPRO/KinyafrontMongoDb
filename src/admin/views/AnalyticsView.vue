<template>
  <div class="an">
    <div class="range-row">
      <RangeTabs v-model="range" @update:model-value="setRange" />
      <span v-if="lastUpdated" class="ago">Last updated {{ timeAgo(lastUpdated) }}</span>
    </div>

    <ErrorState v-if="error" :message="error.message" :status-code="error.status" @retry="load" />

    <!-- Users -->
    <SectionCard title="Users" subtitle="Everything derived from real accounts and sessions">
      <div class="mini-kpis">
        <div class="mk"><span class="mk-v">{{ fmtNum(d?.users?.total) }}</span><span class="mk-l">Total</span></div>
        <div class="mk"><span class="mk-v">{{ fmtNum(d?.users?.dau) }}</span><span class="mk-l">Daily active</span></div>
        <div class="mk"><span class="mk-v">{{ fmtNum(d?.users?.wau) }}</span><span class="mk-l">Weekly active</span></div>
        <div class="mk"><span class="mk-v">{{ fmtNum(d?.users?.mau) }}</span><span class="mk-l">Monthly active</span></div>
        <div class="mk"><span class="mk-v">{{ fmtNum(d?.users?.new_registrations) }}</span><span class="mk-l">New · {{ rangeLabel }}</span></div>
        <div class="mk"><span class="mk-v">{{ d?.users?.growth_rate ?? '—' }}%</span><span class="mk-l">Growth rate</span></div>
        <div class="mk"><span class="mk-v">{{ fmtNum(d?.users?.returning_users) }}</span><span class="mk-l">Returning users</span></div>
        <div class="mk"><span class="mk-v">{{ fmtNum(d?.users?.onboarded) }}</span><span class="mk-l">Onboarded</span></div>
      </div>
      <LineChart :series="[{ name: 'New users', color: '#8b5cf6', points: userPts }]" :labels="xLabels(d?.users?.series)" :height="160" />
    </SectionCard>

    <!-- Conversations -->
    <SectionCard title="Conversations & messages">
      <div class="mini-kpis">
        <div class="mk"><span class="mk-v">{{ fmtNum(d?.conversations?.total) }}</span><span class="mk-l">Chats total</span></div>
        <div class="mk"><span class="mk-v">{{ fmtNum(d?.conversations?.new_in_range) }}</span><span class="mk-l">New chats</span></div>
        <div class="mk"><span class="mk-v">{{ fmtNum(d?.conversations?.messages_total) }}</span><span class="mk-l">Messages total</span></div>
        <div class="mk"><span class="mk-v">{{ fmtNum(d?.conversations?.messages_in_range) }}</span><span class="mk-l">Messages · {{ rangeLabel }}</span></div>
        <div class="mk"><span class="mk-v">{{ d?.conversations?.avg_messages_per_chat ?? '—' }}</span><span class="mk-l">Avg msgs / chat</span></div>
      </div>
      <LineChart :series="[
        { name: 'Messages', color: '#22d3ee', points: msgPts },
        { name: 'New chats', color: '#8b5cf6', points: chatPts, dashed: true, area: false },
      ]" :labels="xLabels(d?.conversations?.series_msg)" :height="160" />
    </SectionCard>

    <!-- AI -->
    <div class="two-col">
      <SectionCard title="AI performance" :subtitle="rangeLabel">
        <div class="mini-kpis">
          <div class="mk"><span class="mk-v">{{ fmtNum(d?.ai?.requests) }}</span><span class="mk-l">Requests</span></div>
          <div class="mk"><span class="mk-v">{{ d?.ai?.success_rate != null ? d.ai.success_rate + '%' : '—' }}</span><span class="mk-l">Success rate</span></div>
          <div class="mk"><span class="mk-v">{{ fmtNum(d?.ai?.failed) }}</span><span class="mk-l">Failed</span></div>
          <div class="mk"><span class="mk-v">{{ d?.ai?.avg_latency_ms != null ? fmtMs(d.ai.avg_latency_ms) : '—' }}</span><span class="mk-l">Avg latency</span></div>
        </div>
        <LineChart :series="[
          { name: 'Requests', color: '#6366f1', points: aiReqPts },
          { name: 'Errors', color: '#f87171', points: aiErrPts, dashed: true, area: false },
        ]" :labels="xLabels(d?.ai?.series)" :height="150" />
      </SectionCard>
      <SectionCard title="Model usage" :subtitle="rangeLabel">
        <DonutChart :items="modelItems" :center-value="fmtNum(d?.ai?.requests ?? null)" center-label="AI requests" />
      </SectionCard>
    </div>

    <!-- Engagement -->
    <div class="two-col">
      <SectionCard title="Peak hours" subtitle="Messages per hour of day (7 days)">
        <BarChart :points="hourlyPts" color="#6366f1" :height="150" :y-format="fmtNumFn" :max-labels="12" />
      </SectionCard>
      <SectionCard title="Most active users" subtitle="By message count">
        <HBarList ranked :items="(d?.engagement?.top_users || []).map(u => ({ name: u.username, label: u.username, value: u.msg_count }))" />
      </SectionCard>
    </div>

    <div class="two-col">
      <SectionCard title="Top pages" subtitle="Real page-view tracking">
        <HBarList :items="(d?.engagement?.top_pages || []).map(p => ({ label: p.page || '(home)', value: p.views }))" color="#22d3ee" />
      </SectionCard>
      <SectionCard title="Traffic totals">
        <div class="mini-kpis">
          <div class="mk"><span class="mk-v">{{ fmtNum(d?.engagement?.views_total) }}</span><span class="mk-l">Page views all time</span></div>
          <div class="mk"><span class="mk-v">{{ fmtNum(d?.engagement?.views_range) }}</span><span class="mk-l">Page views · {{ rangeLabel }}</span></div>
        </div>
      </SectionCard>
    </div>

    <!-- Plans (§24) — real upgrade funnel + consumption by plan -->
    <SectionCard title="Plans & upgrades" subtitle="Real subscription funnel derived from PlanRequest + UsageDaily records">
      <div class="mini-kpis">
        <div class="mk"><span class="mk-v">{{ fmtNum(d?.plans?.requests?.total) }}</span><span class="mk-l">Requests · {{ rangeLabel }}</span></div>
        <div class="mk"><span class="mk-v">{{ fmtNum(d?.plans?.requests?.approved) }}</span><span class="mk-l">Approved</span></div>
        <div class="mk"><span class="mk-v">{{ fmtNum(d?.plans?.requests?.rejected) }}</span><span class="mk-l">Rejected</span></div>
        <div class="mk"><span class="mk-v">{{ d?.plans?.requests?.approval_rate ?? '0' }}%</span><span class="mk-l">Approval rate</span></div>
        <div class="mk"><span class="mk-v">{{ d?.plans?.requests?.rejection_rate ?? '0' }}%</span><span class="mk-l">Rejection rate</span></div>
      </div>
      <div class="two-col">
        <div>
          <p class="sub-title">Upgrades by conversion</p>
          <HBarList :items="(d?.plans?.conversions || []).map(c => ({ label: c.label, value: c.count }))" color="#8b5cf6" />
        </div>
        <div>
          <p class="sub-title">Daily chat consumption by plan (7 days)</p>
          <HBarList :items="(d?.plans?.consumption_by_plan || []).map(c => ({ label: (c.plan || 'free').toUpperCase(), value: c.chats_used }))" color="#22d3ee" />
        </div>
      </div>
    </SectionCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api, { apiError } from '../api'
import SectionCard from '../components/SectionCard.vue'
import ErrorState from '../components/ErrorState.vue'
import RangeTabs from '../components/RangeTabs.vue'
import LineChart from '../components/charts/LineChart.vue'
import BarChart from '../components/charts/BarChart.vue'
import DonutChart from '../components/charts/DonutChart.vue'
import HBarList from '../components/charts/HBarList.vue'
import { fmtNum, fmtMs, timeAgo } from '../format'
const fmtNumFn = fmtNum

const range = ref('30d')
const rangeLabel = computed(() => ({ '24h': '24 hours', '7d': '7 days', '30d': '30 days', '90d': '90 days' }[range.value]))
const d = ref(null)
const error = ref(null)
const lastUpdated = ref(null)

async function load() {
  error.value = null
  try {
    d.value = (await api.get('/admin/analytics', { params: { range: range.value } })).data
    lastUpdated.value = new Date()
  } catch (e) { error.value = apiError(e) }
}
function setRange(r) { range.value = r; load() }
onMounted(load)

const userPts = computed(() => (d.value?.users?.series || []).map(p => ({ label: p.date, y: p.count })))
const msgPts = computed(() => (d.value?.conversations?.series_msg || []).map(p => ({ label: p.date, y: p.count })))
const chatPts = computed(() => (d.value?.conversations?.series_chat || []).map(p => ({ label: p.date, y: p.count })))
const aiReqPts = computed(() => (d.value?.ai?.series || []).map(p => ({ label: p.date, y: p.requests })))
const aiErrPts = computed(() => (d.value?.ai?.series || []).map(p => ({ label: p.date, y: p.errors })))
const modelItems = computed(() => (d.value?.ai?.by_model || []).map(m => ({ label: m.model, value: m.count })))
const hourlyPts = computed(() => {
  const map = {}
  for (const h of (d.value?.engagement?.hourly_activity || [])) map[h.hour] = h.count
  return Array.from({ length: 24 }, (_, i) => ({ label: `${i}h`, value: map[i] || 0 }))
})

function xLabels(series) {
  const s = series || []
  if (!s.length) return []
  if (s[0].date?.includes('T')) return s.map(p => p.date.slice(11, 13) + ':00')
  return s.map(p => p.date?.slice(5) || '')
}
</script>

<style scoped>
.an { display:flex; flex-direction:column; gap:16px; }
.range-row { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.ago { font-size:11.5px; color:var(--text-3); }
.mini-kpis { display:grid; grid-template-columns:repeat(4, 1fr); gap:10px; margin-bottom:14px; }
@media (max-width:800px) { .mini-kpis { grid-template-columns:repeat(2, 1fr); } }
.mk { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:12px 14px; display:flex; flex-direction:column; gap:2px; min-width:0; }
.mk-v { font-size:19px; font-weight:750; color:var(--text-1); font-variant-numeric:tabular-nums; }
.mk-l { font-size:11px; color:var(--text-3); }
.two-col { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media (max-width:980px) { .two-col { grid-template-columns:1fr; } }
.sub-title { margin:0 0 10px; font-size:12px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:.08em; }
</style>
