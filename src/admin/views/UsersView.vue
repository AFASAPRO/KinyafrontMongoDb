<template>
  <div class="uv">
    <div class="toolbar">
      <div class="search"><i class="fas fa-search"></i>
        <input v-model="q" placeholder="Search username or email…" @input="debouncedSearch" />
      </div>
      <select v-model="status" class="sel" @change="page = 1; load()">
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="banned">Banned</option>
      </select>
      <select v-model="sort" class="sel" @change="load()">
        <option value="created_at">Newest first</option>
        <option value="last_login">Last active</option>
        <option value="username">Username</option>
      </select>
      <button class="btn ghost" @click="exportCsv"><i class="fas fa-download"></i> Export CSV</button>
      <span class="count">{{ fmtNum(total) }} users</span>
    </div>

    <ErrorState v-if="error" :message="error.message" :status-code="error.status" @retry="load" />

    <div v-if="loading && !data" class="skel-table"><div v-for="i in 6" :key="i" class="skel-row"></div></div>

    <div v-else-if="data" class="table-wrap" :class="{ empty: isEmpty }">
      <div class="scroll-hint" v-if="!isEmpty"><i class="fas fa-arrows-left-right"></i> swipe to see more</div>
      <table>
        <thead>
          <tr><th>User</th><th>Status</th><th>Chats</th><th>Messages</th><th>Registered</th><th>Last login</th><th></th></tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id" :class="{ banned: u.is_banned }" @click="openDetail(u)" class="row">
            <td>
              <div class="ucell">
                <div class="uav" :style="{ background: avatarColor(u.username) }">{{ u.username?.[0]?.toUpperCase() }}</div>
                <div class="uinfo">
                  <b>{{ u.username }}</b>
                  <span>{{ u.email }}</span>
                </div>
              </div>
            </td>
            <td><span class="badge" :class="u.is_banned ? 'red' : 'green'">{{ u.is_banned ? 'Banned' : 'Active' }}</span></td>
            <td class="mono">{{ u.chat_count }}</td>
            <td class="mono">{{ fmtNum(u.message_count) }}</td>
            <td class="muted">{{ shortDate(u.created_at) }}</td>
            <td class="muted">{{ u.last_login ? timeAgo(u.last_login) : 'never' }}</td>
            <td>
              <div class="acts" @click.stop>
                <button class="tb" :title="u.is_banned ? 'Enable account' : 'Disable account'" @click="toggleBan(u)">
                  <i :class="u.is_banned ? 'fas fa-unlock' : 'fas fa-ban'"></i>
                </button>
                <button class="tb" title="Details" @click="openDetail(u)"><i class="fas fa-eye"></i></button>
                <button class="tb danger" title="Delete" @click="askDelete(u)"><i class="fas fa-trash"></i></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      <EmptyState v-if="isEmpty" icon="fas fa-users" title="No users found"
        :hint="q ? `Nothing matches “${q}”. Try a different search.` : 'No users have registered yet.'" />
    </div>

    <Pagination :page="page" :pages="pages" @change="p => { page = p; load() }" />

    <!-- ═══ USER DETAIL DRAWER ═══ -->
    <transition name="drawer">
      <div v-if="detail" class="drawer-overlay" @click.self="detail = null">
        <aside class="drawer">
          <div class="drawer-head">
            <div class="uav big" :style="{ background: avatarColor(detail.user.username) }">{{ detail.user.username?.[0]?.toUpperCase() }}</div>
            <div class="dh-info">
              <h3>{{ detail.user.username }}</h3>
              <p>{{ detail.user.email }}</p>
            </div>
            <button class="tb" @click="detail = null"><i class="fas fa-xmark"></i></button>
          </div>
          <div class="drawer-body">
            <div v-if="detailLoading" class="skel-table slim"><div v-for="i in 4" :key="i" class="skel-row"></div></div>
            <template v-else>
              <div class="dsection">
                <h4>Account</h4>
                <div class="kv"><span>Registered</span><b>{{ fullDate(detail.user.created_at) }}</b></div>
                <div class="kv"><span>Last login</span><b>{{ detail.user.last_login ? timeAgo(detail.user.last_login) : 'never' }}</b></div>
                <div class="kv"><span>Status</span><span class="badge" :class="detail.user.is_banned ? 'red' : 'green'">{{ detail.user.is_banned ? 'Banned' : 'Active' }}</span></div>
                <div class="kv"><span>Email verified</span><b>{{ detail.user.email_verified ? 'Yes' : 'No' }}</b></div>
                <div class="kv"><span>Onboarded</span><b>{{ detail.user.onboarded ? 'Yes' : 'No' }}</b></div>
                <div class="kv" v-if="detail.user.profession"><span>Profession</span><b>{{ detail.user.profession }}</b></div>
                <div class="kv" v-if="detail.user.referral_source"><span>Referral source</span><b>{{ detail.user.referral_source }}</b></div>
              </div>
              <div class="dsection">
                <h4>Usage</h4>
                <div class="kv"><span>Conversations</span><b>{{ detail.stats.chats }}</b></div>
                <div class="kv"><span>Messages</span><b>{{ fmtNum(detail.stats.messages) }}</b></div>
                <div class="kv"><span>AI requests</span><b>{{ fmtNum(detail.stats.ai_requests) }}</b></div>
                <div class="kv"><span>Failed AI requests</span><b>{{ fmtNum(detail.stats.failed_requests) }}</b></div>
                <div class="kv"><span>Tokens used</span><b>{{ fmtNum(detail.stats.tokens) }}</b></div>
                <div class="kv" v-if="detail.stats.avg_latency_ms != null"><span>Avg AI latency</span><b>{{ fmtMs(detail.stats.avg_latency_ms) }}</b></div>
                <div class="kv" v-if="detail.plan"><span>Plan</span><b>{{ detail.plan.plan }} · {{ detail.plan.daily_limit }}/day</b></div>
              </div>
              <div class="dsection">
                <h4>Security</h4>
                <div class="kv"><span>Last IP</span><b class="mono">{{ detail.stats.last_ip || '—' }}</b></div>
                <div class="kv" v-if="detail.stats.last_user_agent"><span>Last device</span><b class="ua">{{ detail.stats.last_user_agent }}</b></div>
                <div class="kv"><span>Last seen</span><b>{{ detail.stats.last_seen_at ? timeAgo(detail.stats.last_seen_at) : '—' }}</b></div>
              </div>
              <div class="dsection" v-if="detail.recent_chats?.length">
                <h4>Recent conversations</h4>
                <div v-for="c in detail.recent_chats" :key="c.id" class="mini-chat" @click="goChat(c)">
                  <i class="fas fa-comment"></i><span>{{ c.title }}</span><em>{{ timeAgo(c.updated_at) }}</em>
                </div>
              </div>
              <div class="dsection" v-if="detail.recent_activity?.length">
                <h4>Recent activity</h4>
                <div v-for="e in detail.recent_activity" :key="e.id" class="act-row">
                  <span>{{ e.action.replace(/_/g, ' ') }}</span><em>{{ timeAgo(e.created_at) }}</em>
                </div>
              </div>
            </template>
          </div>
          <div class="drawer-foot">
            <button class="btn ghost" @click="askResetPw(detail.user)"><i class="fas fa-key"></i> Reset password</button>
            <button class="btn ghost" @click="askClearMemory(detail.user)"><i class="fas fa-brain"></i> Clear memory</button>
            <button class="btn" :class="detail.user.is_banned ? 'primary' : 'danger'" @click="toggleBan(detail.user)">
              <i :class="detail.user.is_banned ? 'fas fa-unlock' : 'fas fa-ban'"></i>
              {{ detail.user.is_banned ? 'Enable account' : 'Disable account' }}
            </button>
          </div>
        </aside>
      </div>
    </transition>

    <ConfirmModal :open="!!confirm" v-bind="confirmProps" @cancel="confirm = null" @confirm="runConfirm" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api, { apiError, downloadFile } from '../api'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import Pagination from '../components/Pagination.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useToast } from '../composables/useToast'
import { useDebounced } from '../composables/useResource'
import { fmtNum, fmtMs, shortDate, fullDate, timeAgo, avatarColor } from '../format'

const router = useRouter()
const toast = useToast()

const q = ref(''), status = ref(''), sort = ref('created_at')
const page = ref(1), pages = ref(1), total = ref(0)
const data = ref(null), loading = ref(false), error = ref(null)
const users = computed(() => data.value?.users || [])
const isEmpty = computed(() => data.value && !users.value.length)

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data: d } = await api.get('/admin/users', {
      params: { page: page.value, search: q.value, status: status.value, sort: sort.value, limit: 20 },
    })
    data.value = d; total.value = d.total; pages.value = d.pages
  } catch (e) { error.value = apiError(e) }
  finally { loading.value = false }
}
const debouncedSearch = useDebounced(() => { page.value = 1; load() }, 300)

/* Detail drawer */
const detail = ref(null)
const detailLoading = ref(false)
async function openDetail(u) {
  detail.value = { user: u, stats: null }
  detailLoading.value = true
  try {
    const { data: d } = await api.get(`/admin/users/${u.id}`)
    detail.value = d
  } catch (e) { toast.error(apiError(e).message); detail.value = null }
  finally { detailLoading.value = false }
}
function goChat(c) {
  const uname = detail.value?.user?.username
  detail.value = null
  router.push({ path: '/admin/chats', query: { search: uname || c.title } })
}

/* Actions (every one audited server-side; every destructive one confirmed here) */
const confirm = ref(null)
const confirmProps = computed(() => confirm.value || {})
function ask(action, props) { confirm.value = { action, ...props } }
function askDelete(u) {
  ask('delete', {
    title: 'Delete user?', tone: 'danger', confirmLabel: 'Delete permanently', requireText: u.username,
    message: `This permanently deletes ${u.username}, their conversations, messages, memory and usage history. This cannot be undone.`,
    meta: { id: u.id },
  })
}
function askResetPw(u) {
  const pw = 'KinyaBot-' + Math.random().toString(36).slice(2, 10) + '!7'
  ask('resetPw', {
    title: 'Reset password?', tone: 'primary', confirmLabel: 'Reset password',
    message: `Set a new password for ${u.username}. Share it through a secure channel. New password: ${pw}`, meta: { pw },
  })
}
function askClearMemory(u) {
  ask('clearMemory', {
    title: 'Clear AI memory?', tone: 'danger', confirmLabel: 'Clear memory',
    message: `Delete everything KinyaBot remembers about ${u.username}? The AI will no longer recall their preferences.`,
  })
}
async function toggleBan(u) {
  const banning = !u.is_banned
  if (banning) {
    ask('ban', {
      title: 'Disable account?', tone: 'danger', confirmLabel: 'Disable',
      message: `${u.username} will be signed out and blocked from KinyaBot until re-enabled.`,
      meta: { u },
    })
  } else {
    await doBan(u, false)
  }
}
async function doBan(u, banned) {
  try {
    await api.put(`/admin/users/${u.id}/ban`, { banned })
    u.is_banned = banned
    if (detail.value?.user?.id === u.id) detail.value.user.is_banned = banned
    toast.success(banned ? 'Account disabled' : 'Account enabled')
  } catch (e) { toast.error(apiError(e).message) }
}
async function runConfirm() {
  const c = confirm.value
  if (!c) return
  confirm.value = null
  try {
    if (c.action === 'delete') {
      await api.delete(`/admin/users/${c.meta.id}`)
      toast.success('User deleted')
      detail.value = null; load()
    } else if (c.action === 'resetPw') {
      const uid = detail.value?.user?.id; if (!uid) return
      await api.put(`/admin/users/${uid}/reset-password`, { password: c.meta.pw })
      toast.success('Password reset')
    } else if (c.action === 'clearMemory') {
      const uid = detail.value?.user?.id; if (!uid) return
      await api.delete(`/admin/users/${uid}/memory`)
      toast.success('Memory cleared')
    } else if (c.action === 'ban') {
      await doBan(c.meta.u, true)
    }
  } catch (e) { toast.error(apiError(e).message) }
}

async function exportCsv() {
  const ok = await downloadFile('/admin/export/users', 'kinyabot-users.csv')
  ok ? toast.success('Export downloaded') : toast.error('Export failed')
}

onMounted(load)
</script>

<style scoped src="./admin-tables.css"></style>
<style scoped>
.uv { display:flex; flex-direction:column; gap:14px; }
.toolbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.search { flex:1; min-width:200px; display:flex; align-items:center; gap:9px; background:var(--surface-secondary); border:1px solid var(--border); border-radius:11px; padding:9px 13px; color:var(--text-3); }
.search input { flex:1; background:transparent; border:0; outline:0; color:var(--text-1); font-size:13.5px; }
.sel { background:var(--surface-secondary); border:1px solid var(--border); color:var(--text-1); border-radius:11px; padding:9px 12px; font-size:13px; outline:none; }
.count { font-size:12.5px; color:var(--text-3); margin-left:auto; white-space:nowrap; }
.banned { opacity:.55; }
</style>
