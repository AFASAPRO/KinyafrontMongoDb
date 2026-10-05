<template>
  <div class="cv">
    <div class="toolbar">
      <div class="search"><i class="fas fa-search"></i>
        <input v-model="q" placeholder="Search by title or user…" @input="debouncedSearch" />
      </div>
      <button class="btn ghost" @click="exportCsv"><i class="fas fa-download"></i> Export CSV</button>
      <span class="count">{{ fmtNum(total) }} conversations</span>
    </div>

    <ErrorState v-if="error" :message="error.message" :status-code="error.status" @retry="load" />
    <div v-if="loading && !data" class="skel-table"><div v-for="i in 6" :key="i" class="skel-row"></div></div>

    <div v-else-if="data" class="table-wrap" :class="{ empty: isEmpty }">
      <table>
        <thead><tr><th>Conversation</th><th>User</th><th>Messages</th><th>Model</th><th>Errors</th><th>Last activity</th><th></th></tr></thead>
        <tbody>
          <tr v-for="c in chats" :key="c.id" class="row" @click="openChat(c)">
            <td class="title-cell">{{ c.title || 'Untitled' }}</td>
            <td>
              <div class="ucell"><div class="uav" :style="{ background: avatarColor(c.username) }">{{ c.username?.[0]?.toUpperCase() }}</div>
                <div class="uinfo"><b>{{ c.username || '(deleted)' }}</b><span>{{ c.email }}</span></div></div>
            </td>
            <td class="mono">{{ c.msg_count }}</td>
            <td class="muted model">{{ c.last_model || '—' }}</td>
            <td><span v-if="c.failed_count" class="badge red">{{ c.failed_count }} failed</span><span v-else class="badge green">OK</span></td>
            <td class="muted">{{ timeAgo(c.updated_at) }}</td>
            <td>
              <div class="acts" @click.stop>
                <button class="tb" title="View transcript" @click="openChat(c)"><i class="fas fa-eye"></i></button>
                <button class="tb danger" title="Delete" @click="askDelete(c)"><i class="fas fa-trash"></i></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <EmptyState v-if="isEmpty" icon="fas fa-comments" title="No conversations found"
        :hint="q ? `Nothing matches “${q}”.` : 'Once users start chatting, conversations appear here.'" />
    </div>

    <Pagination :page="page" :pages="pages" @change="p => { page = p; load() }" />

    <!-- Transcript modal -->
    <transition name="modal">
      <div v-if="modal" class="ovl" @click.self="modal = null">
        <div class="modal">
          <div class="modal-head">
            <div>
              <h3>{{ modal.chat.title || 'Untitled conversation' }}</h3>
              <p>{{ modal.user?.username }} · {{ modal.user?.email }} · {{ modal.messages.length }} messages</p>
            </div>
            <button class="tb" @click="modal = null"><i class="fas fa-xmark"></i></button>
          </div>
          <div class="transcript">
            <div v-for="m in modal.messages" :key="m.id" class="msg" :class="m.role">
              <div class="msg-role">{{ m.role === 'user' ? 'User' : 'KinyaBot' }}</div>
              <div class="msg-text">{{ m.content || (m.attachments?.length ? `[${m.attachments[0].kind} attachment]` : '(empty)') }}</div>
              <div class="msg-meta">
                {{ shortDate(m.created_at) }}
                <template v-if="m.model"> · {{ m.model }}</template>
                <template v-if="m.processing_ms != null"> · {{ fmtMs(m.processing_ms) }}</template>
                <span v-if="m.status === 'failed'" class="badge red">failed</span>
                <span v-else-if="m.status === 'cancelled'" class="badge amber">cancelled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <ConfirmModal :open="!!confirm" v-bind="confirmProps" @cancel="confirm = null" @confirm="runDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import api, { apiError, downloadFile } from '../api'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import Pagination from '../components/Pagination.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useToast } from '../composables/useToast'
import { useDebounced } from '../composables/useResource'
import { fmtNum, fmtMs, shortDate, timeAgo, avatarColor } from '../format'

const route = useRoute()
const toast = useToast()
const q = ref(String(route.query.search || ''))
const page = ref(1), pages = ref(1), total = ref(0)
const data = ref(null), loading = ref(false), error = ref(null)
const chats = computed(() => data.value?.chats || [])
const isEmpty = computed(() => data.value && !chats.value.length)

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data: d } = await api.get('/admin/chats', { params: { page: page.value, search: q.value, limit: 20 } })
    data.value = d; total.value = d.total; pages.value = d.pages
  } catch (e) { error.value = apiError(e) }
  finally { loading.value = false }
}
const debouncedSearch = useDebounced(() => { page.value = 1; load() }, 300)

const modal = ref(null)
async function openChat(c) {
  try {
    const { data: d } = await api.get(`/admin/chats/${c.id}/messages`)
    modal.value = d
  } catch (e) { toast.error(apiError(e).message) }
}

const confirm = ref(null)
const confirmProps = computed(() => confirm.value || {})
function askDelete(c) {
  confirm.value = {
    title: 'Delete conversation?', tone: 'danger', confirmLabel: 'Delete',
    message: `Delete “${c.title || 'Untitled'}” and all its messages for ${c.username || 'this user'}? This cannot be undone.`,
    meta: { id: c.id },
  }
}
async function runDelete() {
  const c = confirm.value
  confirm.value = null
  if (!c) return
  try {
    await api.delete(`/admin/chats/${c.meta.id}`)
    toast.success('Conversation deleted')
    load()
  } catch (e) { toast.error(apiError(e).message) }
}
async function exportCsv() {
  const ok = await downloadFile('/admin/export/chats', 'kinyabot-chats.csv')
  ok ? toast.success('Export downloaded') : toast.error('Export failed')
}
onMounted(load)
</script>

<style scoped src="./admin-tables.css"></style>
<style scoped>
.cv { display:flex; flex-direction:column; gap:14px; }
.toolbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.search { flex:1; min-width:200px; display:flex; align-items:center; gap:9px; background:var(--surface-secondary); border:1px solid var(--border); border-radius:11px; padding:9px 13px; color:var(--text-3); }
.search input { flex:1; background:transparent; border:0; outline:0; color:var(--text-1); font-size:13.5px; }
.count { font-size:12.5px; color:var(--text-3); margin-left:auto; white-space:nowrap; }
.title-cell { max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-1); font-weight:600; }
.model { max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ovl { position:fixed; inset:0; z-index:85; background:rgba(2,4,10,.62); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:18px; }
.modal { width:100%; max-width:720px; max-height:84vh; background:var(--surface); border:1px solid var(--border); border-radius:18px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,.45); }
.modal-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:18px; border-bottom:1px solid var(--border); }
.modal-head h3 { margin:0; font-size:16px; }
.modal-head p { margin:3px 0 0; font-size:12.5px; color:var(--text-3); }
.transcript { overflow-y:auto; padding:16px 18px; display:flex; flex-direction:column; gap:12px; }
.msg { max-width:85%; }
.msg.user { align-self:flex-end; }
.msg-role { font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.1em; color:var(--text-3); margin-bottom:4px; }
.msg.user .msg-role { text-align:right; }
.msg-text { background:var(--surface-secondary); border:1px solid var(--border); border-radius:12px; padding:10px 13px; font-size:13px; color:var(--text-1); white-space:pre-wrap; word-break:break-word; }
.msg.user .msg-text { background:var(--brand-soft); border-color:var(--brand-ring, rgba(99,102,241,.3)); }
.msg-meta { font-size:10.5px; color:var(--text-3); margin-top:4px; display:flex; gap:6px; align-items:center; }
.modal-enter-active, .modal-leave-active { transition:opacity .18s ease; }
.modal-enter-from, .modal-leave-to { opacity:0; }
</style>
