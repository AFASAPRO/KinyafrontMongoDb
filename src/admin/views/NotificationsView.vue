<template>
  <div class="nv">
    <!-- ═══ CONTROL-CENTER ALERTS (real system events) ═══ -->
    <SectionCard title="Alerts" subtitle="Generated from real system events — never synthetic">
      <template #actions>
        <button class="btn ghost sm" :disabled="!unread || busyAll" @click="markAllRead"><i class="fas fa-check-double"></i> Mark all read</button>
      </template>
      <div class="filters">
        <button class="chip" :class="{ active: filter === 'unread' }" @click="setFilter('unread')">Unread <b v-if="unread">{{ unread }}</b></button>
        <button class="chip" :class="{ active: filter === 'all' }" @click="setFilter('all')">All</button>
        <span class="sep"></span>
        <button v-for="c in categories" :key="c.value" class="chip" :class="{ active: category === c.value }" @click="setCategory(c.value)">
          {{ c.label }}
        </button>
      </div>

      <ErrorState v-if="error" :message="error.message" :status-code="error.status" @retry="load" />
      <div v-if="loading && !data" class="skel-table slim"><div v-for="i in 4" :key="i" class="skel-row"></div></div>

      <div v-else class="nlist" :class="{ empty: isEmpty }">
        <div v-for="n in items" :key="n.id" class="nrow" :class="{ unread: !n.read, [n.type]: true }" @click="open(n)">
          <div class="nicon"><i :class="iconFor(n)"></i></div>
          <div class="nbody">
            <div class="ntitle">{{ n.title }}</div>
            <div class="nmsg">{{ n.message }}</div>
            <div class="nmeta">{{ timeAgo(n.created_at) }} · {{ n.category }}</div>
          </div>
          <div class="nacts" @click.stop>
            <button class="tb" :title="n.read ? 'Mark unread' : 'Mark read'" @click="toggleRead(n)">
              <i :class="n.read ? 'fas fa-envelope' : 'fas fa-envelope-open'"></i>
            </button>
            <button class="tb danger" title="Delete" @click="remove(n)"><i class="fas fa-trash"></i></button>
          </div>
        </div>
        <EmptyState v-if="isEmpty" icon="fas fa-bell-slash" title="No alerts"
          :hint="filter === 'unread' ? 'You are all caught up.' : 'Real system events will appear here as they happen.'" />
      </div>
      <Pagination :page="page" :pages="pages" @change="p => { page = p; load() }" />
    </SectionCard>

    <!-- ═══ USER BROADCASTS (existing real notification system) ═══ -->
    <div class="two-col">
      <SectionCard title="Broadcast to users" subtitle="Sends a notification to everyone using KinyaBot">
        <div class="kbf"><label>Title</label><input v-model="bc.title" class="inp" placeholder="e.g. Scheduled maintenance" /></div>
        <div class="kbf"><label>Message</label><textarea v-model="bc.message" class="inp" rows="3" placeholder="Message to all users…"></textarea></div>
        <div class="kbf">
          <label>Type</label>
          <div class="type-row">
            <button v-for="t in bcTypes" :key="t.id" class="chip" :class="{ active: bc.type === t.id }" @click="bc.type = t.id">
              <i :class="t.icon"></i> {{ t.label }}
            </button>
          </div>
        </div>
        <button class="btn full" :disabled="sending || !bc.title || !bc.message" @click="broadcast">
          <i v-if="sending" class="fas fa-spinner fa-spin"></i><i v-else class="fas fa-paper-plane"></i>
          {{ sending ? 'Broadcasting…' : 'Broadcast now' }}
        </button>
      </SectionCard>

      <SectionCard title="Active broadcasts" :subtitle="`${broadcasts.filter(b => b.is_active).length} live`">
        <div class="blist">
          <div v-for="b in broadcasts" :key="b.id" class="brow">
            <div class="nicon small" :class="b.type"><i :class="bcIcon(b.type)"></i></div>
            <div class="nbody">
              <div class="ntitle">{{ b.title }}</div>
              <div class="nmsg">{{ b.message }}</div>
              <div class="nmeta">{{ timeAgo(b.created_at) }}</div>
            </div>
            <div class="nacts">
              <button class="tb" :title="b.is_active ? 'Deactivate' : 'Activate'" @click="toggleB(b)">
                <i :class="b.is_active ? 'fas fa-toggle-on' : 'fas fa-toggle-off'"></i>
              </button>
              <button class="tb danger" @click="removeB(b)"><i class="fas fa-trash"></i></button>
            </div>
          </div>
          <EmptyState v-if="!broadcasts.length" icon="fas fa-bullhorn" title="No broadcasts yet" compact />
        </div>
      </SectionCard>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api, { apiError } from '../api'
import SectionCard from '../components/SectionCard.vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import Pagination from '../components/Pagination.vue'
import { useToast } from '../composables/useToast'
import { timeAgo } from '../format'

const router = useRouter()
const toast = useToast()
const filter = ref('unread')
const category = ref('')
const page = ref(1), pages = ref(1), unread = ref(0)
const data = ref(null), loading = ref(false), error = ref(null)
const items = computed(() => data.value?.items || [])
const isEmpty = computed(() => data.value && !items.value.length)

const categories = [
  { value: 'security', label: 'Security' }, { value: 'ai', label: 'AI' },
  { value: 'moderation', label: 'Moderation' }, { value: 'system', label: 'System' },
  { value: 'config', label: 'Config' }, { value: 'usage', label: 'Usage' },
]

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data: d } = await api.get('/admin/notifications', { params: { filter: filter.value, category: category.value, page: page.value } })
    data.value = d; pages.value = d.pages; unread.value = d.unread
  } catch (e) { error.value = apiError(e) }
  finally { loading.value = false }
}
function setFilter(f) { filter.value = f; page.value = 1; load() }
function setCategory(c) { category.value = category.value === c ? '' : c; page.value = 1; load() }

function iconFor(n) {
  const map = {
    critical: 'fas fa-radiation', error: 'fas fa-circle-exclamation', warning: 'fas fa-triangle-exclamation',
    success: 'fas fa-circle-check', info: 'fas fa-circle-info',
  }
  if (n.category === 'security') return 'fas fa-shield-halved'
  if (n.category === 'ai') return 'fas fa-robot'
  if (n.category === 'moderation') return 'fas fa-flag'
  if (n.category === 'config') return 'fas fa-sliders'
  return map[n.type] || 'fas fa-bell'
}
async function open(n) {
  if (!n.read) { try { await api.put(`/admin/notifications/${n.id}/read`, { read: true }); n.read = true; unread.value = Math.max(0, unread.value - 1) } catch {} }
  if (n.link) router.push(n.link)
}
async function toggleRead(n) {
  try {
    await api.put(`/admin/notifications/${n.id}/read`, { read: !n.read })
    n.read = !n.read
    unread.value = Math.max(0, unread.value + (n.read ? -1 : 1))
  } catch (e) { toast.error(apiError(e).message) }
}
const busyAll = ref(false)
async function markAllRead() {
  busyAll.value = true
  try { await api.put('/admin/notifications/read-all'); toast.success('All marked read'); load() }
  catch (e) { toast.error(apiError(e).message) }
  finally { busyAll.value = false }
}
async function remove(n) {
  try { await api.delete(`/admin/notifications/${n.id}`); load() }
  catch (e) { toast.error(apiError(e).message) }
}

/* Broadcasts */
const broadcasts = ref([])
const bc = ref({ title: '', message: '', type: 'info' })
const bcTypes = [
  { id: 'info', label: 'Info', icon: 'fas fa-circle-info' },
  { id: 'success', label: 'Success', icon: 'fas fa-circle-check' },
  { id: 'warning', label: 'Warning', icon: 'fas fa-triangle-exclamation' },
  { id: 'error', label: 'Alert', icon: 'fas fa-circle-exclamation' },
]
const sending = ref(false)
async function loadBroadcasts() {
  try { broadcasts.value = (await api.get('/admin/broadcasts')).data } catch {}
}
async function broadcast() {
  sending.value = true
  try {
    await api.post('/admin/broadcasts', bc.value)
    bc.value = { title: '', message: '', type: 'info' }
    toast.success('Broadcast sent to all users')
    loadBroadcasts()
  } catch (e) { toast.error(apiError(e).message) }
  finally { sending.value = false }
}
function bcIcon(t) {
  return { info: 'fas fa-circle-info', success: 'fas fa-circle-check', warning: 'fas fa-triangle-exclamation', error: 'fas fa-circle-exclamation' }[t] || 'fas fa-bell'
}
async function toggleB(b) {
  try { await api.put(`/admin/broadcasts/${b.id}`, { is_active: !b.is_active }); b.is_active = !b.is_active } catch (e) { toast.error(apiError(e).message) }
}
async function removeB(b) {
  try { await api.delete(`/admin/broadcasts/${b.id}`); broadcasts.value = broadcasts.value.filter(x => x.id !== b.id) } catch (e) { toast.error(apiError(e).message) }
}

onMounted(() => { load(); loadBroadcasts() })
</script>

<style scoped src="./admin-tables.css"></style>
<style scoped>
.nv { display:flex; flex-direction:column; gap:16px; }
.filters { display:flex; gap:7px; flex-wrap:wrap; margin-bottom:14px; align-items:center; }
.chip { background:var(--surface); border:1px solid var(--border); color:var(--text-2); border-radius:99px; padding:6px 13px; font-size:12px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:6px; }
.chip.active { background:var(--brand); border-color:var(--brand); color:#fff; }
.chip b { color:#f87171; }
.chip.active b { color:#fff; }
.sep { width:1px; height:20px; background:var(--border); margin:0 4px; }
.nlist { display:flex; flex-direction:column; }
.nrow { display:flex; align-items:flex-start; gap:12px; padding:12px 6px; border-bottom:1px dashed var(--border); cursor:pointer; border-radius:10px; }
.nrow:hover { background:var(--surface-elevated); }
.nrow.unread { background:rgba(99,102,241,.05); }
.nrow.critical .ntitle, .nrow.error .ntitle { color:#f87171; }
.nrow.warning .ntitle { color:#fbbf24; }
.nicon { width:38px; height:38px; border-radius:11px; background:var(--surface-elevated); color:var(--brand-text); display:flex; align-items:center; justify-content:center; font-size:14.5px; flex:none; }
.nicon.critical { background:rgba(239,68,68,.14); color:#f87171; }
.nicon.error { background:rgba(239,68,68,.12); color:#f87171; }
.nicon.warning { background:rgba(245,158,11,.13); color:#fbbf24; }
.nicon.success { background:rgba(52,211,153,.12); color:#34d399; }
.nicon.small { width:32px; height:32px; font-size:12.5px; }
.nbody { flex:1; min-width:0; }
.ntitle { font-weight:750; font-size:13.5px; color:var(--text-1); }
.nmsg { font-size:12.5px; color:var(--text-2); margin-top:2px; }
.nmeta { font-size:11px; color:var(--text-3); margin-top:4px; text-transform:capitalize; }
.nacts { display:flex; gap:6px; flex:none; }
.nlist .tb { background:transparent; border-color:transparent; }
.nlist .tb:hover { border-color:var(--border); }
.two-col { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media (max-width:980px) { .two-col { grid-template-columns:1fr; } }
.kbf { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
.kbf label { font-size:12px; font-weight:700; color:var(--text-2); }
.inp { background:var(--surface); border:1px solid var(--border); color:var(--text-1); border-radius:10px; padding:10px 12px; font-size:13.5px; outline:none; width:100%; }
.inp:focus { border-color:var(--brand); }
textarea.inp { resize:vertical; }
.type-row { display:flex; gap:7px; flex-wrap:wrap; }
.btn.full { width:100%; justify-content:center; }
.blist { display:flex; flex-direction:column; max-height:380px; overflow-y:auto; }
.brow { display:flex; align-items:flex-start; gap:11px; padding:10px 4px; border-bottom:1px dashed var(--border); }
.brow:last-child { border-bottom:0; }
.btn.sm { padding:7px 12px; font-size:12px; }
</style>
