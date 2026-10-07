<template>
  <div class="pr">
    <!-- ── Tabs: Requests | Plan configuration ── -->
    <div class="tabs">
      <button class="tab" :class="{ on: tab === 'requests' }" @click="tab = 'requests'">
        <i class="fas fa-inbox"></i> Plan Requests
        <span v-if="counts.pending" class="tab-badge">{{ counts.pending }}</span>
      </button>
      <button class="tab" :class="{ on: tab === 'plans' }" @click="tab = 'plans'">
        <i class="fas fa-layer-group"></i> Plan Configuration
      </button>
    </div>

    <!-- ═══ REQUESTS ═══ -->
    <template v-if="tab === 'requests'">
      <div class="toolbar">
        <div class="search"><i class="fas fa-search"></i>
          <input v-model="q" placeholder="Search name, email, phone or request ID…" @input="debouncedSearch" />
        </div>
        <div class="seg">
          <button v-for="f in filters" :key="f.key" class="seg-btn" :class="{ on: status === f.key }" @click="setStatus(f.key)">
            {{ f.label }}
            <span v-if="f.key && counts[f.key] !== undefined" class="seg-count">{{ counts[f.key] }}</span>
          </button>
        </div>
        <select v-model="sort" class="sel" @change="load()">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="requested_plan">Requested plan</option>
          <option value="status">Status</option>
        </select>
        <span class="count">{{ fmtNum(total) }} requests</span>
      </div>

      <ErrorState v-if="error" :message="error.message" :status-code="error.status" @retry="load" />

      <div v-if="loading && !data" class="skel-table"><div v-for="i in 6" :key="i" class="skel-row"></div></div>

      <div v-else-if="data" class="table-wrap" :class="{ empty: isEmpty }">
        <div class="scroll-hint" v-if="!isEmpty"><i class="fas fa-arrows-left-right"></i> swipe to see more</div>
        <table>
          <thead>
            <tr>
              <th>Request</th><th>User</th><th>Plan change</th><th>Contact</th><th>Requested</th><th>Status</th><th>Reviewed</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in requests" :key="r.id" class="row" @click="openDetail(r)">
              <td class="mono req-id">{{ r.id.slice(-8) }}</td>
              <td>
                <div class="ucell">
                  <div class="uav" :style="{ background: avatarColor(r.username || r.full_name) }">{{ (r.username || r.full_name)?.[0]?.toUpperCase() }}</div>
                  <div class="uinfo">
                    <b>{{ r.username || r.full_name }}</b>
                    <span v-if="r.username">{{ r.full_name }}</span>
                    <span v-if="r.user_deleted" class="deleted">account deleted</span>
                  </div>
                </div>
              </td>
              <td>
                <div class="plan-change">
                  <span class="mini-plan" :class="`mp-${r.current_plan}`">{{ r.current_plan.toUpperCase() }}</span>
                  <i class="fas fa-arrow-right-long"></i>
                  <span class="mini-plan target" :class="`mp-${r.requested_plan}`">{{ r.requested_plan.toUpperCase() }}</span>
                </div>
              </td>
              <td class="contact">
                <span>{{ r.email }}</span>
                <small>{{ r.country }} · {{ r.phone }}</small>
              </td>
              <td class="muted">{{ shortDate(r.created_at) }}</td>
              <td><span class="badge" :class="statusClass(r.status)">{{ r.status }}</span></td>
              <td class="muted">{{ r.reviewed_at ? `${shortDate(r.reviewed_at)}${r.reviewed_by ? ' · ' + r.reviewed_by : ''}` : '—' }}</td>
              <td>
                <div class="acts" @click.stop>
                  <button v-if="r.status === 'pending'" class="tb ok" title="Quick approve" @click="askApprove(r)"><i class="fas fa-check"></i></button>
                  <button v-if="r.status === 'pending'" class="tb danger" title="Quick reject" @click="askReject(r)"><i class="fas fa-xmark"></i></button>
                  <button class="tb" title="Details" @click="openDetail(r)"><i class="fas fa-eye"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="isEmpty" icon="fas fa-inbox" title="No upgrade requests yet"
          :hint="q ? `Nothing matches “${q}”.` : 'When users request a plan upgrade, it will appear here for review.'" />
      </div>

      <Pagination :page="page" :pages="pages" @change="p => { page = p; load() }" />

      <!-- ═══ REQUEST DETAIL DRAWER (§13) ═══ -->
      <transition name="drawer">
        <div v-if="detail" class="drawer-overlay" @click.self="detail = null">
          <aside class="drawer">
            <div class="drawer-head">
              <div class="uav big" :style="{ background: avatarColor(detail.request.full_name) }">{{ detail.request.full_name?.[0]?.toUpperCase() }}</div>
              <div class="dh-info">
                <h3>{{ detail.request.full_name }}</h3>
                <p>{{ detail.request.email }}</p>
                <span class="badge" :class="statusClass(detail.request.status)">{{ detail.request.status }}</span>
              </div>
              <button class="tb" @click="detail = null"><i class="fas fa-xmark"></i></button>
            </div>
            <div class="drawer-body">
              <div v-if="detailLoading" class="skel-table slim"><div v-for="i in 4" :key="i" class="skel-row"></div></div>
              <template v-else>
                <div class="dsection">
                  <h4>User information</h4>
                  <div class="kv"><span>Name</span><b>{{ detail.request.full_name }}</b></div>
                  <div class="kv"><span>Email</span><b>{{ detail.request.email }}</b></div>
                  <div class="kv"><span>User ID</span><b class="mono">{{ detail.user?.deleted ? '— deleted —' : detail.user?.id }}</b></div>
                  <div class="kv" v-if="detail.user && !detail.user.deleted"><span>Username</span><b>{{ detail.user.username }}</b></div>
                  <div class="kv"><span>Country</span><b>{{ detail.request.country }}<template v-if="detail.request.country_code"> ({{ detail.request.country_code }})</template></b></div>
                  <div class="kv"><span>Phone</span><b class="mono">{{ detail.request.phone }}</b></div>
                  <div class="kv" v-if="detail.user && !detail.user.deleted"><span>Status</span><b :class="{ 'text-danger': detail.user.is_banned }">{{ detail.user.is_banned ? 'Banned' : 'Active' }}</b></div>
                </div>
                <div class="dsection">
                  <h4>Subscription information</h4>
                  <div class="kv"><span>Current plan</span><b>{{ (detail.subscription.currentPlan || 'free').toUpperCase() }}</b></div>
                  <div class="kv"><span>Requested plan</span><b>{{ (detail.subscription.requestedPlan || '').toUpperCase() }}</b></div>
                  <div class="kv"><span>Current daily limit</span><b>{{ detail.subscription.currentDailyLimit }} chats/day</b></div>
                  <div class="kv"><span>New daily limit</span><b>{{ detail.subscription.requestedDailyLimit ?? '—' }} chats/day</b></div>
                  <div class="kv"><span>Subscription status</span><b>{{ detail.subscription.currentPlanStatus }}</b></div>
                </div>
                <div class="dsection">
                  <h4>Request information</h4>
                  <div class="kv"><span>Request ID</span><b class="mono">{{ detail.request.id }}</b></div>
                  <div class="kv"><span>Created</span><b>{{ fullDate(detail.request.created_at) }}</b></div>
                  <div class="kv"><span>Status</span><span class="badge" :class="statusClass(detail.request.status)">{{ detail.request.status }}</span></div>
                  <div class="msg" v-if="detail.request.message">“{{ detail.request.message }}”</div>
                </div>
                <div class="dsection" v-if="detail.request.status !== 'pending'">
                  <h4>Review information</h4>
                  <div class="kv"><span>Reviewed by</span><b>{{ detail.request.reviewed_by || '—' }}</b></div>
                  <div class="kv"><span>Reviewed at</span><b>{{ fullDate(detail.request.reviewed_at) }}</b></div>
                  <div class="kv" v-if="detail.request.approval_notes"><span>Admin notes</span><b>{{ detail.request.approval_notes }}</b></div>
                  <div class="kv" v-if="detail.request.rejection_reason"><span>Rejection reason</span><b>{{ detail.request.rejection_reason }}</b></div>
                </div>
              </template>
            </div>
            <div class="drawer-foot" v-if="detail.request.status === 'pending'">
              <button class="btn ghost" @click="askReject(detail.request)"><i class="fas fa-xmark"></i> Reject</button>
              <button class="btn primary" @click="askApprove(detail.request)"><i class="fas fa-check"></i> Approve Request</button>
            </div>
          </aside>
        </div>
      </transition>
    </template>

    <!-- ═══ PLAN CONFIGURATION (§2) ═══ -->
    <template v-else>
      <ErrorState v-if="plansError" :message="plansError.message" :status-code="plansError.status" @retry="loadPlans" />
      <div v-if="plansLoading && !plansData" class="skel-table"><div v-for="i in 4" :key="i" class="skel-row"></div></div>
      <div v-else-if="plansData" class="plans-grid">
        <div v-for="p in editablePlans" :key="p.plan_id" class="plan-editor">
          <div class="pe-head">
            <span class="mini-plan" :class="`mp-${p.plan_id}`">{{ p.name.toUpperCase() }}</span>
            <span class="pe-id">{{ p.plan_id }}</span>
          </div>
          <div class="pe-grid">
            <label class="pe-field">
              <span>Daily chat limit</span>
              <input type="number" min="1" max="100000" v-model.number="p._edit.dailyChatLimit" />
            </label>
            <label class="pe-field">
              <span>Context messages</span>
              <input type="number" min="1" max="200" v-model.number="p._edit.contextMessages" />
            </label>
            <label class="pe-field">
              <span>Doc size ×</span>
              <input type="number" min="1" max="10" step="0.5" v-model.number="p._edit.docSizeMultiplier" />
            </label>
            <label class="pe-field">
              <span>Burst ×</span>
              <input type="number" min="1" max="10" step="0.5" v-model.number="p._edit.burstMultiplier" />
            </label>
          </div>
          <div class="pe-flags">
            <label v-for="f in featureFlags" :key="f" class="flag">
              <input type="checkbox" v-model="p._edit.features[f]" />
              <span>{{ f }}</span>
            </label>
          </div>
          <button class="btn primary pe-save" :disabled="p._saving" @click="savePlan(p)">
            <i :class="p._saving ? 'fas fa-circle-notch fa-spin' : 'fas fa-floppy-disk'"></i>
            {{ p._saving ? 'Saving…' : 'Save changes' }}
          </button>
        </div>
      </div>
      <p class="plans-note"><i class="fas fa-circle-info"></i> Changes apply to every user on the plan within ~15 seconds (server cache). Every change is written to the audit log.</p>
    </template>

    <!-- Approve / Reject confirmation (§39) -->
    <ConfirmModal
      :open="!!confirm"
      v-bind="confirmProps"
      @cancel="confirm = null"
      @confirm="runConfirm"
    >
      <template v-if="confirm?.action === 'approve'">
        <div class="cf-summary">
          <div class="kv"><span>Current plan</span><b>{{ confirm.request.current_plan.toUpperCase() }}</b></div>
          <div class="kv"><span>New plan</span><b>{{ confirm.request.requested_plan.toUpperCase() }}</b></div>
          <div class="kv"><span>Daily limit</span><b>{{ confirm.detail?.subscription?.currentDailyLimit ?? '—' }} → {{ confirm.detail?.subscription?.requestedDailyLimit ?? '—' }} chats/day</b></div>
        </div>
        <textarea v-model="notes" class="cf-notes" rows="2" placeholder="Approval notes (optional)"></textarea>
      </template>
      <template v-else-if="confirm?.action === 'reject'">
        <textarea v-model="rejectReason" class="cf-notes" rows="2" placeholder="Rejection reason (optional)"></textarea>
      </template>
    </ConfirmModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import api, { apiError } from '../api'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import Pagination from '../components/Pagination.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useToast } from '../composables/useToast'
import { useDebounced } from '../composables/useResource'
import { fmtNum, shortDate, fullDate, avatarColor } from '../format'
import { onAdminEvent } from '../socket'

/**
 * Plan Requests management page (§12-§16, §38, §39).
 * Real PlanRequest records with server-side filtering / search /
 * sorting / pagination, a full detail drawer, quick approve / reject
 * with confirmation, and live plan-configuration editing (§2).
 */
const toast = useToast()

const tab = ref('requests')

/* ── Requests list ─────────────────────────────────────────────── */
const q = ref(''), status = ref(''), sort = ref('newest')
const page = ref(1), pages = ref(1), total = ref(0)
const data = ref(null), loading = ref(false), error = ref(null)
const requests = computed(() => data.value?.requests || [])
const counts = computed(() => data.value?.counts || { pending: 0, approved: 0, rejected: 0 })
const isEmpty = computed(() => data.value && !requests.value.length)
const filters = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
]

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data: d } = await api.get('/admin/plan-requests', {
      params: { page: page.value, search: q.value, status: status.value, sort: sort.value, limit: 20 },
    })
    data.value = d; total.value = d.total; pages.value = d.pages
  } catch (e) { error.value = apiError(e) }
  finally { loading.value = false }
}
const debouncedSearch = useDebounced(() => { page.value = 1; load() }, 300)

function setStatus(k) { status.value = k; page.value = 1; load() }

function statusClass(s) { return s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'amber' }

/* ── Detail drawer (§13) ───────────────────────────────────────── */
const detail = ref(null)
const detailLoading = ref(false)
async function openDetail(r) {
  detail.value = { request: r, user: null, subscription: null }
  detailLoading.value = true
  try {
    const { data: d } = await api.get(`/admin/plan-requests/${r.id}`)
    detail.value = d
  } catch (e) { toast.error(apiError(e).message); detail.value = null }
  finally { detailLoading.value = false }
}

/* ── Approve / Reject (§14, §15, §39) ──────────────────────────── */
const confirm = ref(null)
const notes = ref('')
const rejectReason = ref('')
const confirmProps = computed(() => {
  if (!confirm.value) return {}
  if (confirm.value.action === 'approve') {
    return {
      title: `Approve ${confirm.value.request.requested_plan.toUpperCase()} upgrade?`,
      tone: 'primary', confirmLabel: 'Approve Upgrade', cancelLabel: 'Cancel',
    }
  }
  return {
    title: 'Reject upgrade request?',
    tone: 'danger', confirmLabel: 'Reject Request', cancelLabel: 'Cancel',
    message: 'The user keeps their current plan and daily limit. They will be notified about the rejection.',
  }
})

function askApprove(r) { notes.value = ''; confirm.value = { action: 'approve', request: r } ; void fetchConfirmDetail(r) }
async function fetchConfirmDetail(r) {
  try {
    const { data: d } = await api.get(`/admin/plan-requests/${r.id}`)
    if (confirm.value?.request?.id === r.id) confirm.value.detail = d
  } catch {}
}
function askReject(r) { rejectReason.value = ''; confirm.value = { action: 'reject', request: r } }

async function runConfirm() {
  const c = confirm.value
  if (!c) return
  confirm.value = null
  try {
    if (c.action === 'approve') {
      const { data: d } = await api.post(`/admin/plan-requests/${c.request.id}/approve`, { notes: notes.value })
      toast.success(`Approved — ${d.newPlan.toUpperCase()} is now active for this user (${d.dailyLimit} chats/day).`)
    } else {
      await api.post(`/admin/plan-requests/${c.request.id}/reject`, { reason: rejectReason.value })
      toast.success('Request rejected. The user keeps their current plan.')
    }
    detail.value = null
    load()
  } catch (e) {
    toast.error(apiError(e).message)
    load()
  }
}

/* ── Plan configuration (§2) ───────────────────────────────────── */
const FEATURE_FLAGS = ['chatAccess', 'voiceAccess', 'imageGeneration', 'documentAnalysis', 'advancedContext', 'agentAccess', 'priorityProcessing', 'advancedTools']
const featureFlags = FEATURE_FLAGS
const plansData = ref(null), plansLoading = ref(false), plansError = ref(null)
const editablePlans = ref([])

async function loadPlans() {
  plansLoading.value = true
  plansError.value = null
  try {
    const { data: d } = await api.get('/admin/plans')
    plansData.value = d
    editablePlans.value = (d.plans || []).map(p => ({
      ...p,
      _edit: {
        dailyChatLimit: p.dailyChatLimit,
        contextMessages: p.contextMessages,
        docSizeMultiplier: p.docSizeMultiplier,
        burstMultiplier: p.burstMultiplier,
        features: { ...(p.features || {}) },
      },
      _saving: false,
    }))
  } catch (e) { plansError.value = apiError(e) }
  finally { plansLoading.value = false }
}

async function savePlan(p) {
  p._saving = true
  try {
    const { data: d } = await api.put(`/admin/plans/${p.plan_id}`, {
      dailyChatLimit: p._edit.dailyChatLimit,
      contextMessages: p._edit.contextMessages,
      docSizeMultiplier: p._edit.docSizeMultiplier,
      burstMultiplier: p._edit.burstMultiplier,
      features: p._edit.features,
    })
    Object.assign(p, d.plan)
    toast.success(`${p.name} plan updated — applies to all users within seconds.`)
    loadPlans()
  } catch (e) { toast.error(apiError(e).message) }
  finally { p._saving = false }
}

/* Live refresh when a request arrives while the page is open */
const offReq = onAdminEvent('admin_notification_new', (n) => {
  if (n?.link === '/admin/plan-requests') load()
})

onMounted(() => { load(); loadPlans() })
onBeforeUnmount(() => { offReq?.() })
</script>

<style scoped>
.pr { display: flex; flex-direction: column; gap: 14px; }

.tabs { display: flex; gap: 8px; }
.tab {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 16px; border-radius: 11px; border: 1px solid var(--border);
  background: var(--surface-secondary); color: var(--text-2);
  font-size: 13px; font-weight: 700; cursor: pointer;
}
.tab:hover { color: var(--text-1); }
.tab.on { background: var(--brand-soft); border-color: var(--brand); color: var(--brand-text); }
.tab-badge {
  background: #ef4444; color: #fff; border-radius: 99px;
  font-size: 10px; font-weight: 800; min-width: 18px; height: 18px;
  display: inline-flex; align-items: center; justify-content: center; padding: 0 5px;
}

.toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.search { flex: 1; min-width: 220px; display: flex; align-items: center; gap: 9px; background: var(--surface-secondary); border: 1px solid var(--border); border-radius: 11px; padding: 9px 13px; }
.search i { color: var(--text-3); font-size: 12.5px; }
.search input { flex: 1; background: transparent; border: 0; color: var(--text-1); font-size: 13.5px; outline: none; }
.sel { background: var(--surface-secondary); border: 1px solid var(--border); color: var(--text-1); border-radius: 11px; padding: 9px 12px; font-size: 13px; }
.count { font-size: 12.5px; color: var(--text-3); white-space: nowrap; }

.seg { display: inline-flex; background: var(--surface-secondary); border: 1px solid var(--border); border-radius: 11px; padding: 3px; gap: 2px; }
.seg-btn {
  border: 0; background: transparent; color: var(--text-2);
  font-size: 12.5px; font-weight: 600; padding: 6px 12px; border-radius: 8px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 6px;
}
.seg-btn.on { background: var(--brand); color: #fff; }
.seg-count { font-size: 10.5px; font-weight: 800; background: rgba(255,255,255,.14); border-radius: 99px; padding: 1px 7px; }
.seg-btn:not(.on) .seg-count { background: var(--surface-elevated); color: var(--text-3); }

.table-wrap { background: var(--surface-secondary); border: 1px solid var(--border); border-radius: 16px; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 900px; }
thead th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: var(--text-3); padding: 12px 14px; border-bottom: 1px solid var(--border); }
tbody td { padding: 11px 14px; border-bottom: 1px solid var(--border-subtle); font-size: 13px; color: var(--text-2); vertical-align: middle; }
tbody tr:last-child td { border-bottom: 0; }
tr.row { cursor: pointer; }
tr.row:hover td { background: var(--surface-elevated); }
.mono { font-family: var(--font-mono); font-size: 12px; }
.req-id { color: var(--text-3); }
.muted { color: var(--text-3); font-size: 12px; }

.ucell { display: flex; align-items: center; gap: 10px; min-width: 160px; }
.uav { width: 32px; height: 32px; border-radius: 10px; color: #fff; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; flex: none; }
.uav.big { width: 46px; height: 46px; border-radius: 14px; font-size: 18px; }
.uinfo { display: flex; flex-direction: column; min-width: 0; }
.uinfo b { color: var(--text-1); font-size: 13px; }
.uinfo span { color: var(--text-3); font-size: 11.5px; }
.uinfo .deleted { color: #f87171; font-style: italic; }

.plan-change { display: inline-flex; align-items: center; gap: 8px; }
.plan-change i { color: var(--text-3); font-size: 10px; }
.mini-plan { font-size: 9.5px; font-weight: 800; letter-spacing: .08em; padding: 3px 8px; border-radius: 99px; border: 1px solid var(--border-strong); color: var(--text-2); }
.mini-plan.mp-plus { color: #22d3ee; border-color: rgba(34,211,238,.35); background: rgba(34,211,238,.08); }
.mini-plan.mp-pro { color: #c4b5fd; border-color: rgba(139,92,246,.4); background: rgba(139,92,246,.1); }
.mini-plan.target { border-style: solid; }

.contact { display: flex; flex-direction: column; }
.contact small { color: var(--text-3); font-size: 11px; }

.badge { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; padding: 3px 9px; border-radius: 99px; }
.badge.green { background: rgba(34,197,94,.14); color: #4ade80; }
.badge.red { background: rgba(239,68,68,.14); color: #f87171; }
.badge.amber { background: rgba(245,158,11,.14); color: #fbbf24; }

.acts { display: flex; gap: 4px; justify-content: flex-end; }
.tb { width: 30px; height: 30px; border-radius: 9px; border: 1px solid var(--border); background: var(--surface); color: var(--text-2); font-size: 12px; cursor: pointer; }
.tb:hover { color: var(--text-1); border-color: var(--border-strong); }
.tb.ok:hover { color: #4ade80; border-color: rgba(34,197,94,.4); }
.tb.danger:hover { color: #f87171; border-color: rgba(239,68,68,.4); }

/* Drawer */
.drawer-overlay { position: fixed; inset: 0; background: rgba(2,4,10,.6); z-index: 70; backdrop-filter: blur(3px); }
.drawer { position: fixed; top: 0; right: 0; bottom: 0; width: min(460px, 94vw); background: var(--surface); border-left: 1px solid var(--border); display: flex; flex-direction: column; z-index: 75; box-shadow: 0 0 60px rgba(0,0,0,.5); }
.drawer-head { display: flex; align-items: flex-start; gap: 12px; padding: 18px; border-bottom: 1px solid var(--border); }
.dh-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; align-items: flex-start; }
.dh-info h3 { margin: 0; font-size: 16px; color: var(--text-1); }
.dh-info p { margin: 0; font-size: 12.5px; color: var(--text-3); }
.drawer-head .tb { background: transparent; border: 0; color: var(--text-3); font-size: 16px; cursor: pointer; }
.drawer-body { flex: 1; overflow-y: auto; padding: 16px 18px; }
.dsection { margin-bottom: 20px; }
.dsection h4 { margin: 0 0 8px; font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: var(--brand-text); }
.kv { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; font-size: 12.5px; border-bottom: 1px solid var(--border-subtle); }
.kv span { color: var(--text-3); }
.kv b { color: var(--text-1); font-weight: 600; text-align: right; overflow-wrap: anywhere; }
.kv .text-danger { color: #f87171; }
.msg { margin-top: 10px; background: var(--surface-secondary); border: 1px solid var(--border); border-radius: 11px; padding: 11px 13px; font-size: 12.5px; color: var(--text-2); font-style: italic; }
.drawer-foot { display: flex; gap: 10px; padding: 14px 18px; border-top: 1px solid var(--border); }
.btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: 11px; padding: 11px; font-weight: 700; font-size: 13px; cursor: pointer; }
.btn.ghost { background: transparent; border: 1px solid var(--border-strong); color: var(--text-1); }
.btn.primary { background: var(--brand); color: #fff; }
.drawer-enter-active, .drawer-leave-active { transition: opacity .2s; }
.drawer-enter-active .drawer { animation: drIn .25s ease; }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
@keyframes drIn { from { transform: translateX(40px); opacity: 0; } to { transform: none; opacity: 1; } }

/* Confirm extras */
.cf-summary { margin-top: 10px; background: var(--surface-secondary); border: 1px solid var(--border); border-radius: 12px; padding: 4px 14px; }
.cf-notes { width: 100%; margin-top: 12px; background: var(--surface-secondary); border: 1px solid var(--border); border-radius: 10px; color: var(--text-1); font-size: 13px; padding: 10px 12px; resize: vertical; }

/* Plan configuration */
.plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }
.plan-editor { background: var(--surface-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 14px; }
.pe-head { display: flex; align-items: center; justify-content: space-between; }
.pe-id { font-size: 11px; color: var(--text-3); font-family: var(--font-mono); }
.pe-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pe-field { display: flex; flex-direction: column; gap: 5px; }
.pe-field span { font-size: 11px; font-weight: 700; color: var(--text-3); text-transform: uppercase; letter-spacing: .06em; }
.pe-field input { background: var(--surface); border: 1px solid var(--border); color: var(--text-1); border-radius: 9px; padding: 8px 11px; font-size: 13.5px; }
.pe-flags { display: flex; flex-wrap: wrap; gap: 7px; }
.flag { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-2); background: var(--surface); border: 1px solid var(--border); border-radius: 99px; padding: 5px 10px; cursor: pointer; }
.flag input { accent-color: var(--brand); }
.pe-save { margin-top: auto; }
.plans-note { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 12px; color: var(--text-3); }
.plans-note i { color: var(--brand-text); }

.skel-table { background: var(--surface-secondary); border: 1px solid var(--border); border-radius: 16px; padding: 10px; display: flex; flex-direction: column; gap: 8px; }
.skel-table.slim { border: 0; background: transparent; padding: 0; }
.skel-row { height: 40px; border-radius: 10px; background: linear-gradient(100deg, var(--surface-elevated) 40%, var(--surface-secondary) 50%, var(--surface-elevated) 60%); background-size: 200% 100%; animation: skSh 1.4s infinite; }
@keyframes skSh { to { background-position: -200% 0; } }

@media (max-width: 768px) {
  .toolbar { flex-direction: column; align-items: stretch; }
  .count { display: none; }
}
</style>
<style scoped src="./admin-tables.css"></style>
