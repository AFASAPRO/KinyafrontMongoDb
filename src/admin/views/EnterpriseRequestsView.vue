<template>
  <div class="erv">
    <div class="tabs-row">
      <div class="tabs">
        <button v-for="t in TABS" :key="t.id" class="tab" :class="{ on: status === t.id }" @click="setStatus(t.id)">
          {{ t.label }} <span v-if="counts[t.id] != null" class="tab-n">{{ counts[t.id] }}</span>
        </button>
      </div>
      <button class="btn ghost" @click="load"><i class="fas fa-rotate"></i> Refresh</button>
    </div>

    <ErrorState v-if="error" :message="error.message" :status-code="error.status" @retry="load" />
    <div v-else-if="loading && !data" class="skel-table"><div v-for="i in 4" :key="i" class="skel-row"></div></div>

    <div v-else-if="data" class="list" :class="{ empty: isEmpty }">
      <div v-for="r in items" :key="r.id" class="req">
        <div class="req-main">
          <span class="req-av" :style="{ background: avatarColor(r.full_name || r.email) }">{{ (r.full_name || r.email)[0]?.toUpperCase() }}</span>
          <div class="req-info">
            <b>{{ r.full_name }}</b>
            <span class="req-company"><i class="fas fa-building"></i> {{ r.company }} · <span class="muted">{{ r.team_size }}</span></span>
            <div class="req-contact">
              <a :href="`mailto:${r.email}`"><i class="fas fa-envelope"></i> {{ r.email }}</a>
              <a v-if="r.phone" :href="telHref(r.phone)"><i class="fas fa-phone"></i> {{ r.phone }}</a>
            </div>
            <p v-if="r.message" class="req-msg">“{{ r.message }}”</p>
            <div class="req-meta muted">
              <span><i class="fas fa-clock"></i> {{ timeAgo(r.created_at) }}</span>
              <span v-if="r.handled_by && r.status !== 'pending'"><i class="fas fa-user-check"></i> handled by {{ r.handled_by }} · {{ timeAgo(r.handled_at) }}</span>
              <span class="src"><i class="fas fa-globe"></i> {{ r.source }}</span>
            </div>
          </div>
        </div>
        <div class="req-side">
          <span class="badge" :class="r.status === 'pending' ? 'amber' : (r.status === 'contacted' ? 'blue' : 'gray')">{{ r.status }}</span>
          <div class="acts">
            <button v-if="r.status === 'pending'" class="btn ghost sm" @click="setStatusOn(r, 'contacted')"><i class="fas fa-paper-plane"></i> Mark contacted</button>
            <button v-if="r.status !== 'closed'" class="tb danger" title="Close request" @click="setStatusOn(r, 'closed')"><i class="fas fa-check"></i></button>
            <button v-else class="btn ghost sm" @click="setStatusOn(r, 'pending')"><i class="fas fa-rotate-left"></i> Reopen</button>
          </div>
        </div>
      </div>
      <EmptyState v-if="isEmpty" icon="fas fa-handshake" title="No enterprise requests"
        :hint="status === 'pending' ? 'New requests from the landing-page Enterprise popup appear here instantly.' : 'Nothing matches this filter yet.'" />
    </div>

    <Pagination :page="page" :pages="pages" @change="p => { page = p; load() }" />
  </div>
</template>

<script setup>
/**
 * Enterprise Requests — every submission from the landing-page pricing
 * popup (visitors without a KinyaBot account). The superadmin reviews
 * contact details and moves each request pending → contacted → closed.
 */
import { ref, computed, onMounted } from 'vue'
import api, { apiError } from '../api'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import Pagination from '../components/Pagination.vue'
import { useToast } from '../composables/useToast'
import { timeAgo, avatarColor } from '../format'

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'closed', label: 'Closed' },
]

const toast = useToast()
const status = ref('pending')
const page = ref(1), pages = ref(1)
const data = ref(null), loading = ref(false), error = ref(null)
const counts = ref({ pending: 0, contacted: 0, closed: 0, all: 0 })
const items = computed(() => data.value?.items || [])
const isEmpty = computed(() => data.value && !items.value.length)

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data: d } = await api.get('/admin/enterprise-requests', { params: { page: page.value, status: status.value } })
    data.value = d
    pages.value = d.pages || 1
    if (d.counts) counts.value = d.counts
  } catch (e) { error.value = apiError(e) }
  finally { loading.value = false }
}
function setStatus(s) { status.value = s; page.value = 1; load() }

async function setStatusOn(r, s) {
  try {
    const { data: d } = await api.put(`/admin/enterprise-requests/${r.id}/status`, { status: s })
    Object.assign(r, d.request)
    counts.value = counts.value // refresh counts lazily
    load()
    toast.success(s === 'contacted' ? 'Marked as contacted' : s === 'closed' ? 'Request closed' : 'Reopened')
  } catch (err) {
    toast.error(err?.response?.data?.error || 'Could not update the request')
  }
}

function telHref(p) { return `tel:${String(p).replace(/[^\d+]/g, '')}` }
onMounted(load)
</script>

<style scoped src="./admin-tables.css"></style>
<style scoped>
.erv { display:flex; flex-direction:column; gap:14px; }
.tabs-row { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
.tabs { display:inline-flex; gap:4px; background:var(--surface-secondary); border:1px solid var(--border); border-radius:12px; padding:4px; }
.tab { display:inline-flex; align-items:center; gap:7px; border:0; background:transparent; color:var(--text-2); font-size:12.5px; font-weight:700; padding:8px 14px; border-radius:9px; cursor:pointer; }
.tab:hover { color:var(--text-1); }
.tab.on { background:var(--brand-soft); color:var(--brand-text); }
.tab-n { font-size:10.5px; font-weight:800; background:var(--surface-elevated); border-radius:99px; padding:1px 7px; color:var(--text-3); }
.tab.on .tab-n { background:rgba(99,102,241,.25); color:var(--brand-text); }

.list { display:flex; flex-direction:column; gap:10px; }
.list.empty { border-style:dashed; }
.req { display:flex; justify-content:space-between; gap:14px; background:var(--surface-secondary); border:1px solid var(--border); border-radius:14px; padding:16px 18px; flex-wrap:wrap; }
.req-main { display:flex; gap:13px; min-width:0; flex:1; }
.req-av { width:40px; height:40px; border-radius:12px; color:#fff; font-weight:800; font-size:15px; display:flex; align-items:center; justify-content:center; flex:none; }
.req-info { display:flex; flex-direction:column; gap:5px; min-width:0; }
.req-info > b { font-size:14.5px; color:var(--text-1); }
.req-company { font-size:12.5px; color:var(--text-2); display:flex; align-items:center; gap:6px; }
.req-company i { font-size:10.5px; color:var(--text-3); }
.req-contact { display:flex; gap:14px; flex-wrap:wrap; }
.req-contact a { font-size:12.5px; color:var(--brand-text); text-decoration:none; display:inline-flex; align-items:center; gap:6px; }
.req-contact a:hover { text-decoration:underline; }
.req-contact i { font-size:10.5px; opacity:.8; }
.req-msg { margin:0; font-size:12.5px; color:var(--text-2); font-style:italic; line-height:1.55; border-left:2px solid var(--border-strong); padding-left:10px; }
.req-meta { display:flex; gap:14px; flex-wrap:wrap; font-size:11px; }
.req-meta i { margin-right:4px; }
.req-meta .src { text-transform:capitalize; }
.req-side { display:flex; flex-direction:column; align-items:flex-end; gap:10px; justify-content:space-between; }
.acts { display:flex; gap:6px; align-items:center; }
.btn.ghost.sm { padding:7px 12px; font-size:12px; border-radius:9px; }
@media (max-width:640px) { .req { flex-direction:column; } .req-side { flex-direction:row; align-items:center; width:100%; justify-content:space-between; } }
</style>
