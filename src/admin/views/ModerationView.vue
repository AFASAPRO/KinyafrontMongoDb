<template>
  <div class="mv">
    <div class="tabs">
      <button v-for="t in tabs" :key="t.value" class="tab" :class="{ active: status === t.value }" @click="setStatus(t.value)">
        {{ t.label }}
        <span class="tab-count" :class="{ hot: t.value === 'pending' && counts.pending }">{{ counts[t.value] ?? '…' }}</span>
      </button>
    </div>

    <ErrorState v-if="error" :message="error.message" :status-code="error.status" @retry="load" />
    <div v-if="loading && !data" class="skel-table"><div v-for="i in 4" :key="i" class="skel-row"></div></div>

    <div v-else-if="data" class="list" :class="{ empty: isEmpty }">
      <div v-for="f in items" :key="f.id" class="flag">
        <div class="flag-head">
          <div class="flag-user">
            <div class="uav" :style="{ background: avatarColor(f.username || '?') }">{{ (f.username || '?')[0]?.toUpperCase() }}</div>
            <div>
              <b>{{ f.username || 'Unknown user' }}</b>
              <span class="flag-when">{{ timeAgo(f.created_at) }}</span>
            </div>
          </div>
          <div class="flag-tags">
            <span class="badge red">{{ f.reason || 'Flagged' }}</span>
            <span v-if="f.auto_flagged" class="badge amber">auto</span>
            <span class="badge" :class="statusBadge(f.status)">{{ f.status }}</span>
          </div>
        </div>
        <p class="flag-content" v-if="f.content">{{ f.content.length > 300 ? f.content.slice(0, 300) + '…' : f.content }}</p>
        <div class="flag-actions" v-if="f.status === 'pending'">
          <button class="btn ghost sm" @click="setStatus(f, 'reviewed')"><i class="fas fa-check"></i> Mark reviewed</button>
          <button class="btn ghost sm" @click="setStatus(f, 'dismissed')"><i class="fas fa-xmark"></i> Dismiss</button>
          <button class="btn danger sm" @click="resolveDelete(f)"><i class="fas fa-trash"></i> Resolve & delete chat</button>
        </div>
        <div class="flag-resolved" v-else>
          <span>Handled by <b>{{ f.resolved_by || '—' }}</b> · {{ timeAgo(f.resolved_at || f.created_at) }}</span>
          <button v-if="f.status !== 'pending'" class="btn ghost sm" @click="setStatus(f, 'pending')"><i class="fas fa-rotate-left"></i> Reopen</button>
        </div>
      </div>
      <EmptyState v-if="isEmpty" icon="fas fa-shield-heart" title="Nothing here"
        :hint="status === 'pending' ? 'All clear — no content is waiting for review.' : 'No items with this status.'" />
    </div>

    <Pagination :page="page" :pages="pages" @change="p => { page = p; load() }" />
    <ConfirmModal :open="!!confirm" v-bind="confirmProps" @cancel="confirm = null" @confirm="runConfirm" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api, { apiError } from '../api'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import Pagination from '../components/Pagination.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useToast } from '../composables/useToast'
import { timeAgo, avatarColor } from '../format'

const toast = useToast()
const status = ref('pending')
const tabs = [
  { value: 'pending', label: 'Pending' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'dismissed', label: 'Dismissed' },
]
const counts = ref({})
const page = ref(1), pages = ref(1)
const data = ref(null), loading = ref(false), error = ref(null)
const items = computed(() => data.value?.items || [])
const isEmpty = computed(() => data.value && !items.value.length)

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data: d } = await api.get('/admin/moderation', { params: { status: status.value, page: page.value } })
    data.value = d; pages.value = d.pages; counts.value = d.counts || {}
  } catch (e) { error.value = apiError(e) }
  finally { loading.value = false }
}
function setStatus(t) {
  if (typeof t === 'string') { status.value = t; page.value = 1; load() }
}
function statusBadge(s) {
  return { pending: 'amber', reviewed: 'blue', resolved: 'green', dismissed: 'gray' }[s] || 'gray'
}

const confirm = ref(null)
const confirmProps = computed(() => confirm.value || {})
function resolveDelete(f) {
  confirm.value = {
    title: 'Resolve & delete chat?', tone: 'danger', confirmLabel: 'Resolve & delete',
    message: 'This deletes the whole conversation containing the flagged content and marks the report resolved.',
    meta: { action: 'resolveDelete', flag: f },
  }
}
async function changeStatus(f, s) {
  try {
    await api.put(`/admin/moderation/${f.id}/status`, { status: s })
    toast.success(`Marked ${s}`)
    load()
  } catch (e) { toast.error(apiError(e).message) }
}
async function runConfirm() {
  const c = confirm.value
  confirm.value = null
  if (!c) return
  const f = c.meta.flag
  try {
    if (c.meta.action === 'resolveDelete') {
      if (f.chat_id) await api.delete(`/admin/chats/${f.chat_id}`)
      await api.put(`/admin/moderation/${f.id}/status`, { status: 'resolved' })
      toast.success('Resolved — conversation deleted')
      load()
    }
  } catch (e) { toast.error(apiError(e).message) }
}
onMounted(load)
</script>

<style scoped src="./admin-tables.css"></style>
<style scoped>
.mv { display:flex; flex-direction:column; gap:14px; }
.tabs { display:flex; gap:8px; flex-wrap:wrap; }
.tab { display:flex; align-items:center; gap:8px; background:var(--surface-secondary); border:1px solid var(--border); color:var(--text-2); border-radius:11px; padding:9px 14px; font-size:13px; font-weight:700; cursor:pointer; }
.tab.active { background:var(--brand); border-color:var(--brand); color:#fff; }
.tab-count { background:var(--surface-elevated); border-radius:99px; font-size:11px; padding:2px 8px; color:var(--text-1); }
.tab.active .tab-count { background:rgba(255,255,255,.18); color:#fff; }
.tab-count.hot { background:rgba(239,68,68,.16); color:#f87171; }
.list { display:flex; flex-direction:column; gap:12px; }
.flag { background:var(--surface-secondary); border:1px solid var(--border); border-radius:14px; padding:15px 16px; }
.flag-head { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.flag-user { display:flex; align-items:center; gap:11px; }
.flag-user b { font-size:13.5px; color:var(--text-1); display:block; }
.flag-when { font-size:11px; color:var(--text-3); }
.flag-tags { display:flex; gap:6px; flex-wrap:wrap; }
.flag-content { margin:11px 0 0; font-size:13px; color:var(--text-2); background:var(--surface); border:1px solid var(--border); border-radius:10px; padding:11px 13px; line-height:1.55; word-break:break-word; }
.flag-actions { display:flex; gap:9px; margin-top:12px; flex-wrap:wrap; }
.flag-resolved { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-top:12px; font-size:12px; color:var(--text-3); flex-wrap:wrap; }
.btn.sm { padding:7px 12px; font-size:12px; }
</style>
