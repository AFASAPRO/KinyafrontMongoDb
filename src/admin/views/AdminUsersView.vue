<template>
  <div class="auv">
    <SectionCard title="Administrative users" subtitle="Everyone who can sign in to this Superadmin console — all accounts hold the single super_admin role">
      <template #actions>
        <button class="btn" @click="openCreate"><i class="fas fa-user-plus"></i> New administrative user</button>
      </template>

      <ErrorState v-if="error" :message="error.message" :status-code="error.status" @retry="load" />
      <div v-else-if="loading && !admins.length" class="skel-table slim"><div v-for="i in 3" :key="i" class="skel-row"></div></div>

      <div v-else class="table-wrap" :class="{ empty: !admins.length }">
        <table>
          <thead>
            <tr><th>Administrative user</th><th>Role</th><th>Created</th><th>Last sign-in</th><th></th></tr>
          </thead>
          <tbody>
            <tr v-for="a in admins" :key="a.id">
              <td>
                <div class="ucell">
                  <span class="uav" :style="{ background: avatarColor(a.username) }">{{ a.username?.[0]?.toUpperCase() }}</span>
                  <div class="uinfo">
                    <b>{{ a.username }} <span v-if="a.id === me?.id" class="you">you</span></b>
                    <span>{{ a.email }}</span>
                  </div>
                </div>
              </td>
              <td><span class="badge blue"><i class="fas fa-shield-halved"></i> super_admin</span></td>
              <td class="muted nowrap">{{ shortDate(a.created_at) }}</td>
              <td class="muted nowrap">{{ a.last_login ? timeAgo(a.last_login) : 'Never' }}</td>
              <td>
                <div class="acts">
                  <button class="tb" :title="a.id === me?.id ? 'Update your own credentials' : 'Update credentials'" @click="openEdit(a)"><i class="fas fa-key"></i></button>
                  <button class="tb danger" :disabled="a.id === me?.id" :title="a.id === me?.id ? 'You cannot delete yourself' : 'Delete this account'" @click="askDelete(a)"><i class="fas fa-trash"></i></button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <EmptyState v-if="!admins.length" icon="fas fa-user-shield" title="No administrative users found"
          hint="Create the first administrative user so your team can help operate KinyaBot." />
      </div>
      <p class="auv-note"><i class="fas fa-circle-info"></i> New administrative users sign in at <b>/admin</b> with the email and password you set here. Every change is recorded in the audit log.</p>
    </SectionCard>

    <!-- ── Create / edit modal ─────────────────────────────── -->
    <transition name="mdl">
      <div v-if="modal.open" class="m-overlay" @click.self="closeModal">
        <div class="m-box" role="dialog" aria-modal="true" :aria-label="modal.mode === 'create' ? 'New administrative user' : 'Update credentials'">
          <header class="m-head">
            <div>
              <h3>{{ modal.mode === 'create' ? 'New administrative user' : `Update ${modal.target?.username}` }}</h3>
              <p>{{ modal.mode === 'create' ? 'They will hold full superadmin access to this console.' : 'Change the username, email or password — leave a field as-is to keep it.' }}</p>
            </div>
            <button class="tb" aria-label="Close" @click="closeModal"><i class="fas fa-xmark"></i></button>
          </header>

          <form class="m-body" @submit.prevent="save" novalidate>
            <label class="f" :class="{ invalid: !!fields.username }">
              <span>Username</span>
              <input v-model.trim="form.username" type="text" autocomplete="username" :disabled="saving" />
              <small v-if="fields.username">{{ fields.username }}</small>
            </label>
            <label class="f" :class="{ invalid: !!fields.email }">
              <span>Email</span>
              <input v-model.trim="form.email" type="email" autocomplete="email" :disabled="saving" />
              <small v-if="fields.email">{{ fields.email }}</small>
            </label>
            <label class="f" :class="{ invalid: !!fields.password }">
              <span>Password <small v-if="modal.mode === 'edit'">(leave empty to keep the current password)</small></span>
              <div class="pw">
                <input v-model="form.password" :type="showPw ? 'text' : 'password'" autocomplete="new-password" placeholder="Min. 8 characters" :disabled="saving" />
                <button type="button" class="pw-toggle" :aria-label="showPw ? 'Hide password' : 'Show password'" @click="showPw = !showPw">
                  <i class="fas" :class="showPw ? 'fa-eye-slash' : 'fa-eye'"></i>
                </button>
              </div>
              <small v-if="fields.password">{{ fields.password }}</small>
            </label>

            <p v-if="formError" class="m-error" role="alert"><i class="fas fa-circle-exclamation"></i> {{ formError }}</p>

            <footer class="m-foot">
              <button type="button" class="btn ghost" @click="closeModal" :disabled="saving">Cancel</button>
              <button type="submit" class="btn" :disabled="saving">
                <i v-if="saving" class="fas fa-spinner fa-spin"></i>
                <i v-else class="fas" :class="modal.mode === 'create' ? 'fa-user-plus' : 'fa-floppy-disk'"></i>
                {{ saving ? 'Saving…' : (modal.mode === 'create' ? 'Create user' : 'Save changes') }}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </transition>

    <!-- ── Delete confirmation ─────────────────────────────── -->
    <ConfirmModal
      :open="!!deleting" tone="danger" confirm-label="Delete account"
      title="Delete administrative user?"
      :message="deleting ? `${deleting.username} will permanently lose access to the Superadmin console. This action is recorded in the audit log.` : ''"
      @confirm="doDelete" @cancel="deleting = null" />

    <ToastHost />
  </div>
</template>

<script setup>
/**
 * Administrative Users — the superadmin can:
 *   • create new administrative users (username / email / password)
 *   • update their credentials (including password resets)
 *   • delete accounts (never their own, never the last one — enforced server-side)
 * Every mutation is validated + audit-logged by the backend.
 */
import { ref, reactive, onMounted } from 'vue'
import api, { apiError, getAdmin } from '../api'
import { useToast } from '../composables/useToast'
import SectionCard from '../components/SectionCard.vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import ToastHost from '../components/ToastHost.vue'
import { shortDate, timeAgo, avatarColor } from '../format'

const toast = useToast()
const me = getAdmin()

const admins = ref([])
const loading = ref(false)
const error = ref(null)

const modal = reactive({ open: false, mode: 'create', target: null })
const form = reactive({ username: '', email: '', password: '' })
const fields = ref({})
const formError = ref('')
const saving = ref(false)
const showPw = ref(false)
const deleting = ref(null)

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/admin/admins')
    admins.value = Array.isArray(data) ? data : []
  } catch (e) { error.value = apiError(e) }
  finally { loading.value = false }
}
onMounted(load)

function openCreate() {
  modal.mode = 'create'; modal.target = null
  form.username = ''; form.email = ''; form.password = ''
  fields.value = {}; formError.value = ''; showPw.value = false
  modal.open = true
}
function openEdit(a) {
  modal.mode = 'edit'; modal.target = a
  form.username = a.username; form.email = a.email; form.password = ''
  fields.value = {}; formError.value = ''; showPw.value = false
  modal.open = true
}
function closeModal() {
  if (saving.value) return
  modal.open = false
}

function validate() {
  const e = {}
  if (form.username.length < 3 || form.username.length > 40) e.username = 'Username must be 3–40 characters.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Please enter a valid email address.'
  if (modal.mode === 'create' || form.password) {
    if (form.password.length < 8 || form.password.length > 128) e.password = 'Password must be at least 8 characters.'
  }
  fields.value = e
  return !Object.keys(e).length
}

async function save() {
  formError.value = ''
  if (!validate()) return
  saving.value = true
  try {
    if (modal.mode === 'create') {
      const { data } = await api.post('/admin/admins', { username: form.username, email: form.email, password: form.password })
      toast.success(`Administrative user ${data.admin?.username || form.username} created`)
    } else {
      const payload = { username: form.username, email: form.email }
      if (form.password) payload.password = form.password
      await api.put(`/admin/admins/${modal.target.id}`, payload)
      toast.success('Credentials updated')
    }
    modal.open = false
    await load()
  } catch (err) {
    const d = err?.response?.data
    if (d?.fields) fields.value = d.fields
    formError.value = d?.error || 'Could not save. Please try again.'
  } finally { saving.value = false }
}

function askDelete(a) { deleting.value = a }

async function doDelete() {
  const a = deleting.value
  deleting.value = null
  if (!a) return
  try {
    await api.delete(`/admin/admins/${a.id}`)
    toast.success(`${a.username} deleted`)
    await load()
  } catch (err) {
    toast.error(err?.response?.data?.error || 'Could not delete the account')
  }
}
</script>

<style scoped src="./admin-tables.css"></style>
<style scoped>
.auv { display:flex; flex-direction:column; gap:14px; }
.auv-note { display:flex; align-items:center; gap:8px; margin:12px 2px 0; font-size:12px; color:var(--text-3); }
.auv-note i { color:var(--brand-text); }
.auv-note b { color:var(--text-2); font-weight:700; }
.you { font-size:9.5px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--brand-text); background:var(--brand-soft); border-radius:6px; padding:2px 6px; margin-left:6px; vertical-align:1px; }
.nowrap { white-space:nowrap; }
.badge i { margin-right:4px; }

/* Modal */
.m-overlay { position:fixed; inset:0; z-index:120; background:rgba(2,4,10,.62); backdrop-filter:blur(4px); display:grid; place-items:center; padding:18px; }
.m-box { width:min(470px,100%); background:var(--surface); border:1px solid var(--border); border-radius:18px; box-shadow:var(--shadow-md); max-height:calc(100dvh - 36px); overflow-y:auto; }
.m-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:18px 18px 0; }
.m-head h3 { margin:0; font-size:16.5px; font-weight:800; color:var(--text-1); }
.m-head p { margin:4px 0 0; font-size:12.5px; color:var(--text-3); line-height:1.55; }
.m-body { display:flex; flex-direction:column; gap:13px; padding:16px 18px 18px; }
.f { display:flex; flex-direction:column; gap:6px; }
.f > span { font-size:12px; font-weight:700; color:var(--text-2); }
.f > span small { color:var(--text-3); font-weight:500; }
.f input { width:100%; background:var(--surface-secondary); border:1px solid var(--border); border-radius:11px; color:var(--text-1); font-size:13.5px; padding:10px 12px; outline:none; transition:border-color .15s, box-shadow .15s; }
.f input:focus { border-color:var(--brand); box-shadow:var(--focus-glow); }
.f.invalid input { border-color:var(--error); }
.f small { font-size:11.5px; color:var(--error); }
.pw { position:relative; }
.pw input { padding-right:40px; }
.pw-toggle { position:absolute; right:6px; top:50%; transform:translateY(-50%); width:30px; height:30px; border:0; background:transparent; color:var(--text-3); cursor:pointer; border-radius:8px; }
.pw-toggle:hover { color:var(--text-1); }
.m-error { display:flex; align-items:center; gap:8px; margin:0; font-size:12.5px; font-weight:600; color:var(--error); }
.m-foot { display:flex; justify-content:flex-end; gap:9px; padding-top:2px; }
.btn.danger { background:#ef4444; }

.mdl-enter-active, .mdl-leave-active { transition:opacity .18s ease; }
.mdl-enter-active .m-box, .mdl-leave-active .m-box { transition:transform .2s ease, opacity .18s; }
.mdl-enter-from, .mdl-leave-to { opacity:0; }
.mdl-enter-from .m-box, .mdl-leave-to .m-box { transform:translateY(10px) scale(.98); opacity:0; }
</style>
