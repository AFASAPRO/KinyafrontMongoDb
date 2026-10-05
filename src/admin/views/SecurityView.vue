<template>
  <div class="sv">
    <!-- Stats -->
    <div class="stats-row">
      <StatCard label="Failed logins (24h)" :value="d?.stats?.failed_logins_24h" icon="fas fa-user-lock" :loading="loading"
        :sub="`${fmtNum(d?.stats?.failed_logins_7d)} in 7 days`" />
      <StatCard label="Critical events (24h)" :value="d?.stats?.critical_24h" icon="fas fa-radiation" :loading="loading" />
      <StatCard label="Rate limited (24h)" :value="d?.stats?.rate_limited_24h" icon="fas fa-gauge-simple-high" :loading="loading" />
      <StatCard label="Blocked IPs" :value="d?.stats?.blocked_count" icon="fas fa-ban" :loading="loading" />
    </div>

    <ErrorState v-if="error" :message="error.message" :status-code="error.status" @retry="load" />

    <div class="two-col">
      <!-- Security events -->
      <SectionCard title="Security events" subtitle="Recorded the moment the real event happened">
        <template #actions>
          <select v-model="severity" class="sel" @change="page = 1; load()">
            <option value="">All severities</option><option value="critical">Critical</option>
            <option value="warning">Warning</option><option value="info">Info</option>
          </select>
        </template>
        <div v-if="loading && !data" class="skel-table slim"><div v-for="i in 5" :key="i" class="skel-row"></div></div>
        <div class="evlist" v-else>
          <div v-for="e in events" :key="e.id" class="ev">
            <span class="ev-dot" :class="e.severity"></span>
            <div class="ev-body">
              <div class="ev-type">{{ typeLabel(e.type) }}</div>
              <div class="ev-msg">{{ e.message }}</div>
              <div class="ev-meta">
                <template v-if="e.username">{{ e.username }} · </template>
                <template v-if="e.ip"><span class="mono">{{ e.ip }}</span> · </template>
                {{ timeAgo(e.created_at) }}
              </div>
            </div>
          </div>
          <EmptyState v-if="!events.length && !loading" icon="fas fa-shield-heart" title="No security events"
            hint="Failed sign-ins, bans, blocks and unauthorized access will be recorded here." />
        </div>
        <Pagination :page="page" :pages="pages" @change="p => { page = p; load() }" />
      </SectionCard>

      <!-- IP management -->
      <div class="col">
        <SectionCard title="Blocked IPs" subtitle="Requests from these addresses are rejected at the edge">
          <div class="ip-row">
            <input v-model="newIp" class="inp" placeholder="e.g. 203.0.113.7" @keyup.enter="block" />
            <button class="btn danger sm" @click="block"><i class="fas fa-ban"></i> Block</button>
          </div>
          <div class="ips">
            <div v-for="ip in blocked" :key="ip" class="ip">
              <i class="fas fa-shield-halved"></i><span class="mono">{{ ip }}</span>
              <button class="tb" @click="unblock(ip)" title="Unblock"><i class="fas fa-xmark"></i></button>
            </div>
            <EmptyState v-if="!blocked.length" icon="fas fa-circle-check" title="No blocked IPs" compact />
          </div>
        </SectionCard>

        <SectionCard title="Most active IPs" subtitle="From real page-view telemetry — block with one click">
          <div class="ips">
            <div v-for="s in suspicious" :key="s.ip_address" class="ip">
              <i class="fas fa-network-wired"></i>
              <span class="mono">{{ s.ip_address }}</span>
              <span class="hits">{{ s.hits }} hits · {{ timeAgo(s.last_seen) }}</span>
              <button class="tb danger" @click="block(s.ip_address)" title="Block"><i class="fas fa-ban"></i></button>
            </div>
            <EmptyState v-if="!suspicious.length" icon="fas fa-eye" title="No visitor IPs recorded yet" compact />
          </div>
        </SectionCard>
      </div>
    </div>

    <ConfirmModal :open="!!confirm" v-bind="confirmProps" @cancel="confirm = null" @confirm="runConfirm" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api, { apiError } from '../api'
import StatCard from '../components/StatCard.vue'
import SectionCard from '../components/SectionCard.vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import Pagination from '../components/Pagination.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useToast } from '../composables/useToast'
import { fmtNum, timeAgo } from '../format'

const toast = useToast()
const severity = ref('')
const page = ref(1), pages = ref(1)
const data = ref(null), loading = ref(false), error = ref(null)
const events = computed(() => data.value?.events || [])
const blocked = computed(() => data.value?.blocked_ips || [])
const suspicious = computed(() => data.value?.suspicious || [])

const TYPE_LABELS = {
  login_failed: 'Failed user login', admin_login_failed: 'Failed superadmin login',
  admin_login: 'Superadmin sign-in', password_reset: 'Password reset', banned: 'Account disabled',
  unbanned: 'Account re-enabled', ip_blocked: 'IP blocked', ip_unblocked: 'IP unblocked',
  unauthorized_access: 'Unauthorized API access', rate_limited: 'Rate limit trip', moderation_flag: 'Content flagged',
}
function typeLabel(t) { return TYPE_LABELS[t] || t.replace(/_/g, ' ') }

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data: d } = await api.get('/admin/security', { params: { severity: severity.value, page: page.value } })
    data.value = d; pages.value = d.pages
  } catch (e) { error.value = apiError(e) }
  finally { loading.value = false }
}

const newIp = ref('')
const IP_RE = /^(\d{1,3}\.){3}\d{1,3}$|^[0-9a-fA-F:]+$/
const confirm = ref(null)
const confirmProps = computed(() => confirm.value || {})
function block(ip) {
  const target = (ip || newIp.value).trim()
  if (!target) return
  if (!IP_RE.test(target)) { toast.error('That does not look like a valid IP address.'); return }
  confirm.value = {
    title: 'Block IP address?', tone: 'danger', confirmLabel: 'Block',
    message: `All requests from ${target} will be rejected, including the API.`,
    meta: { action: 'block', ip: target },
  }
}
function unblock(ip) {
  confirm.value = {
    title: 'Unblock IP address?', tone: 'primary', confirmLabel: 'Unblock',
    message: `Requests from ${ip} will be accepted again.`,
    meta: { action: 'unblock', ip },
  }
}
async function runConfirm() {
  const c = confirm.value
  confirm.value = null
  if (!c) return
  try {
    if (c.meta.action === 'block') {
      await api.post('/admin/security/block-ip', { ip: c.meta.ip })
      toast.success(`${c.meta.ip} blocked`)
      if (c.meta.ip === newIp.value) newIp.value = ''
    } else {
      await api.delete(`/admin/security/block-ip/${encodeURIComponent(c.meta.ip)}`)
      toast.success(`${c.meta.ip} unblocked`)
    }
    load()
  } catch (e) { toast.error(apiError(e).message) }
}
onMounted(load)
</script>

<style scoped src="./admin-tables.css"></style>
<style scoped>
.sv { display:flex; flex-direction:column; gap:16px; }
.stats-row { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; }
@media (max-width:1000px) { .stats-row { grid-template-columns:repeat(2, 1fr); } }
.two-col { display:grid; grid-template-columns:1.2fr 1fr; gap:16px; align-items:start; }
@media (max-width:1000px) { .two-col { grid-template-columns:1fr; } }
.col { display:flex; flex-direction:column; gap:16px; }
.sel { background:var(--surface); border:1px solid var(--border); color:var(--text-1); border-radius:10px; padding:8px 11px; font-size:12.5px; outline:none; }
.evlist { display:flex; flex-direction:column; }
.ev { display:flex; gap:12px; padding:11px 4px; border-bottom:1px dashed var(--border); }
.ev:last-child { border-bottom:0; }
.ev-dot { width:9px; height:9px; border-radius:50%; margin-top:6px; flex:none; background:var(--text-3); }
.ev-dot.critical { background:#ef4444; box-shadow:0 0 8px rgba(239,68,68,.7); }
.ev-dot.warning { background:#f59e0b; }
.ev-dot.info { background:#22d3ee; }
.ev-body { flex:1; min-width:0; }
.ev-type { font-size:13px; font-weight:750; color:var(--text-1); }
.ev-msg { font-size:12px; color:var(--text-2); margin-top:1px; word-break:break-word; }
.ev-meta { font-size:11px; color:var(--text-3); margin-top:3px; }
.ip-row { display:flex; gap:9px; margin-bottom:12px; }
.inp { flex:1; background:var(--surface); border:1px solid var(--border); color:var(--text-1); border-radius:10px; padding:10px 12px; font-size:13.5px; outline:none; }
.inp:focus { border-color:var(--brand); }
.ips { display:flex; flex-direction:column; }
.ip { display:flex; align-items:center; gap:10px; padding:9px 2px; border-bottom:1px dashed var(--border); font-size:12.5px; color:var(--text-2); }
.ip:last-child { border-bottom:0; }
.ip i { color:var(--text-3); font-size:12px; }
.ip .mono { flex:1; }
.hits { font-size:11px; color:var(--text-3); }
.btn.sm { padding:9px 14px; font-size:12.5px; }
</style>
