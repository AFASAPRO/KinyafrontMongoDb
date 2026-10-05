<template>
  <div class="usv">
    <div class="range-row">
      <RangeTabs v-model="range" @update:model-value="setRange" />
      <button class="btn ghost sm" @click="exportUsers"><i class="fas fa-download"></i> Users CSV</button>
      <button class="btn ghost sm" @click="exportChats"><i class="fas fa-download"></i> Chats CSV</button>
    </div>

    <ErrorState v-if="error" :message="error.message" :status-code="error.status" @retry="load" />
    <div v-if="loading && !data" class="top-stats"><div v-for="i in 4" :key="i" class="skel"></div></div>

    <template v-else-if="d">
      <div class="top-stats">
        <StatCard label="AI requests" :value="d.totals.requests_in_range" :loading="loading" :icon="'fas fa-robot'" :sub="`${fmtNum(d.totals.requests_total)} all time`" />
        <StatCard label="Tokens" :value="d.totals.tokens_in_range" :loading="loading" :icon="'fas fa-coins'" :sub="`${fmtNum(d.totals.tokens_total)} all time`" />
        <StatCard label="Errors" :value="d.totals.errors_in_range" :loading="loading" :icon="'fas fa-circle-exclamation'" :sub="`${d.totals.success_rate_total ?? '—'}% success all time`" />
        <StatCard label="Est. cost" :display="'$' + (d.totals.est_cost_in_range ?? 0)" :loading="loading" :icon="'fas fa-dollar-sign'"
          :sub="`estimate at $${d.totals.cost_rate_per_1k}/1K tokens — not billing`" />
      </div>

      <div class="two-col">
        <SectionCard title="Token usage over time" :subtitle="rangeLabel">
          <BarChart :points="dayTokens" color="#f59e0b" :height="180" :y-format="fmtNumFn" />
        </SectionCard>
        <SectionCard title="Requests by type" :subtitle="rangeLabel">
          <DonutChart :items="typeItems" :center-value="fmtNum(d.totals.requests_in_range)" center-label="requests" />
        </SectionCard>
      </div>

      <div class="two-col">
        <SectionCard title="Model consumption" :subtitle="`Messages per model · ${rangeLabel}`">
          <HBarList :items="(d.by_model || []).map(m => ({ label: m.model, value: m.count }))" color="#8b5cf6" />
          <EmptyState v-if="!d.by_model?.length" icon="fas fa-microchip" title="No model usage in range" compact />
        </SectionCard>
        <SectionCard title="Top consumers" :subtitle="`Users by tokens · ${rangeLabel}`">
          <HBarList ranked :items="(d.by_user || []).map(u => ({ name: u.username, label: u.username, value: u.tokens }))" color="#22d3ee" />
          <EmptyState v-if="!d.by_user?.length" icon="fas fa-users" title="No usage in range" compact />
        </SectionCard>
      </div>

      <div class="two-col">
        <SectionCard title="Request types detail" subtitle="Errors tracked per type">
          <table class="mini-table">
            <thead><tr><th>Type</th><th>Requests</th><th>Tokens</th><th>Errors</th></tr></thead>
            <tbody>
              <tr v-for="t in d.by_type" :key="t.type"><td class="cap">{{ t.type }}</td><td class="mono">{{ fmtNum(t.requests) }}</td><td class="mono">{{ fmtNum(t.tokens) }}</td><td><span :class="t.errors ? 'bad' : 'good'">{{ t.errors }}</span></td></tr>
              <tr v-if="!d.by_type?.length"><td colspan="4" class="none">No data in range</td></tr>
            </tbody>
          </table>
        </SectionCard>
        <SectionCard title="Plan limits" subtitle="Distribution of configured user plans (limits, not billing)">
          <div class="plans">
            <div v-for="p in (d.plan_limits || [])" :key="p.plan" class="plan" :class="p.plan">
              <i class="fas" :class="p.plan === 'premium' ? 'fa-crown' : p.plan === 'enterprise' ? 'fa-gem' : 'fa-star'"></i>
              <b class="cap">{{ p.plan }}</b><span>{{ p.count }} users</span>
            </div>
            <EmptyState v-if="!d.plan_limits?.length" icon="fas fa-star" title="Everyone is on the default free limits" compact />
          </div>
        </SectionCard>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api, { apiError, downloadFile } from '../api'
import StatCard from '../components/StatCard.vue'
import SectionCard from '../components/SectionCard.vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import RangeTabs from '../components/RangeTabs.vue'
import BarChart from '../components/charts/BarChart.vue'
import DonutChart from '../components/charts/DonutChart.vue'
import HBarList from '../components/charts/HBarList.vue'
import { useToast } from '../composables/useToast'
import { fmtNum } from '../format'
const fmtNumFn = fmtNum

const toast = useToast()
const range = ref('30d')
const rangeLabel = computed(() => ({ '24h': '24 hours', '7d': '7 days', '30d': '30 days', '90d': '90 days' }[range.value]))
const d = ref(null), loading = ref(false), error = ref(null)

async function load() {
  loading.value = true
  error.value = null
  try { d.value = (await api.get('/admin/usage', { params: { range: range.value } })).data }
  catch (e) { error.value = apiError(e) }
  finally { loading.value = false }
}
function setRange(r) { range.value = r; load() }

const dayTokens = computed(() => (d.value?.by_day || []).map(p => ({ label: p.date?.slice(5), value: p.tokens, color: '#f59e0b' })))
const typeItems = computed(() => (d.value?.by_type || []).map(t => ({ label: t.type, value: t.requests })))
async function exportUsers() {
  const ok = await downloadFile('/admin/export/users', 'kinyabot-users.csv')
  ok ? toast.success('Export downloaded') : toast.error('Export failed')
}
async function exportChats() {
  const ok = await downloadFile('/admin/export/chats', 'kinyabot-chats.csv')
  ok ? toast.success('Export downloaded') : toast.error('Export failed')
}
onMounted(load)
</script>

<style scoped>
.usv { display:flex; flex-direction:column; gap:16px; }
.range-row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
.top-stats { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; }
@media (max-width:1000px) { .top-stats { grid-template-columns:repeat(2, 1fr); } }
.top-stats .skel { height:96px; border-radius:14px; background:linear-gradient(90deg, var(--surface-secondary) 25%, var(--surface-elevated) 50%, var(--surface-secondary) 75%); background-size:200% 100%; animation:sksh 1.4s infinite; }
@keyframes sksh { 0% { background-position:200% 0 } 100% { background-position:-200% 0 } }
.two-col { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media (max-width:980px) { .two-col { grid-template-columns:1fr; } }
.mini-table { width:100%; border-collapse:collapse; font-size:13px; }
.mini-table th { text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:.09em; color:var(--text-3); padding:8px 6px; border-bottom:1px solid var(--border); }
.mini-table td { padding:9px 6px; border-bottom:1px dashed var(--border); color:var(--text-2); }
.cap { text-transform:capitalize; }
.mono { font-family:ui-monospace, monospace; font-size:12px; }
.good { color:#34d399; font-weight:700; } .bad { color:#f87171; font-weight:700; }
.none { text-align:center; color:var(--text-3); }
.plans { display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; }
@media (max-width:700px) { .plans { grid-template-columns:1fr; } }
.plan { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:14px; display:flex; flex-direction:column; gap:4px; align-items:center; text-align:center; }
.plan i { font-size:16px; color:var(--brand-text); }
.plan b { color:var(--text-1); font-size:14px; }
.plan span { font-size:11.5px; color:var(--text-3); }
.btn.sm { padding:8px 13px; font-size:12.5px; }
</style>
