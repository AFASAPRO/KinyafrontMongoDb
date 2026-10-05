<template>
  <div class="st">
    <div class="groups">
      <!-- GENERAL -->
      <SectionCard title="General" subtitle="Platform identity and availability">
        <div class="kbf"><label>Application name</label><input v-model="form.general.app_name" class="inp" /></div>
        <div class="flag-row">
          <div><div class="flag-l">Maintenance mode</div><div class="flag-d">Blocks regular user access; the AI and Superadmin keep working</div></div>
          <button class="tog" :class="{ on: form.general.maintenance_mode }" @click="form.general.maintenance_mode = !form.general.maintenance_mode"><span class="knob"></span></button>
        </div>
        <button class="btn" :disabled="saving === 'general'" @click="saveGroup('general')"><i :class="saving === 'general' ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i> Save general</button>
      </SectionCard>

      <!-- AI DEFAULTS -->
      <SectionCard title="AI defaults" subtitle="Initial AI behavior for all conversations">
        <div class="kbf"><label>Daily message limit — free users</label><input type="number" min="1" v-model.number="form.ai.free_daily_limit" class="inp" /></div>
        <div class="kbf"><label>Daily message limit — premium users</label><input type="number" min="1" v-model.number="form.ai.premium_daily_limit" class="inp" /></div>
        <div class="kbf"><label>Cost estimate rate ($ per 1K tokens)</label><input type="number" step="0.0001" min="0" v-model.number="form.ai.cost_per_1k_tokens" class="inp" /></div>
        <p class="note">Runtime AI parameters (system prompt, temperature, models) live in <b>AI Control</b> where they belong.</p>
        <button class="btn" :disabled="saving === 'ai'" @click="saveGroup('ai')"><i :class="saving === 'ai' ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i> Save AI defaults</button>
      </SectionCard>

      <!-- FEATURES -->
      <SectionCard title="Features" subtitle="Capability switches with real backend effects">
        <div v-for="f in featureRows" :key="f.key" class="flag-row">
          <div><div class="flag-l">{{ f.label }}</div><div class="flag-d">{{ f.desc }}</div></div>
          <button class="tog" :class="{ on: form.features[f.key] }" @click="form.features[f.key] = !form.features[f.key]"><span class="knob"></span></button>
        </div>
        <button class="btn" :disabled="saving === 'features'" @click="saveGroup('features')"><i :class="saving === 'features' ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i> Save features</button>
      </SectionCard>

      <!-- PUSH NOTIFICATIONS -->
      <SectionCard title="Push notifications" subtitle="Critical and warning alerts reach this device even when the console is closed">
        <div class="push-status">
          <div class="kv"><span>Browser support</span><b>{{ push.status.value.supported ? 'Supported' : 'Not supported' }}</b></div>
          <div class="kv"><span>Server (VAPID)</span><b>{{ push.status.value.pushEnabled ? 'Configured' : 'Not configured' }}</b></div>
          <div class="kv"><span>This device</span><b>{{ push.status.value.subscribed ? 'Subscribed' : 'Not subscribed' }}</b></div>
          <div class="kv"><span>Permission</span><b class="cap">{{ push.status.value.permission }}</b></div>
          <div class="kv"><span>Devices subscribed</span><b>{{ push.status.value.subscriptions }}</b></div>
        </div>
        <p class="note" v-if="!push.status.value.pushEnabled">
          To enable push: run <code>npm run generate-vapid</code> in <code>backend/</code>, add the printed keys to <code>backend/.env</code> and restart the server.
        </p>
        <div class="btn-row">
          <button v-if="!push.status.value.subscribed" class="btn" :disabled="push.loading.value || !push.status.value.pushEnabled" @click="push.subscribe()">
            <i class="fas fa-bell"></i> Enable push on this device
          </button>
          <button v-else class="btn ghost" :disabled="push.loading.value" @click="push.unsubscribe()"><i class="fas fa-bell-slash"></i> Disable on this device</button>
          <button class="btn ghost" :disabled="!push.status.value.pushEnabled" @click="push.sendTest()"><i class="fas fa-vial"></i> Send test push</button>
        </div>
        <p class="note">Test pushes deep-link to System Health. Real alerts deep-link to the page that matters: AI failures → AI Control, security → Security, flags → Moderation.</p>
      </SectionCard>

      <!-- ADMIN ACCOUNTS -->
      <SectionCard title="Superadmin accounts" subtitle="One role exists: superadmin. Invite code required for new accounts.">
        <div class="admins">
          <div v-for="a in admins" :key="a.id" class="arow">
            <div class="uav" :style="{ background: avatarColor(a.username) }">{{ a.username?.[0]?.toUpperCase() }}</div>
            <div class="ainfo"><b>{{ a.username }}</b><span>{{ a.email }}</span></div>
            <span class="muted" v-if="a.last_login">{{ timeAgo(a.last_login) }}</span>
            <button v-if="a.id !== me?.id" class="tb danger" @click="askDeleteAdmin(a)"><i class="fas fa-trash"></i></button>
            <span v-else class="badge blue">you</span>
          </div>
        </div>
        <p class="note">Additional superadmins register at <code>/admin</code> with the invite code (<code>ADMIN_INVITE_CODE</code> in backend/.env).</p>
      </SectionCard>

      <!-- ABOUT (real info only) -->
      <SectionCard title="About" subtitle="Live values from the running system">
        <div class="kv"><span>Backend</span><b>Node.js {{ about?.node_version || '…' }} · Express</b></div>
        <div class="kv"><span>Database</span><b>MongoDB ({{ about?.db_status || '…' }})</b></div>
        <div class="kv"><span>Backend uptime</span><b>{{ about?.uptime ? fmtUptime(about.uptime) : '…' }}</b></div>
        <div class="kv"><span>Health overview</span><b class="cap">{{ about?.overall || '…' }}</b></div>
        <div class="kv"><span>Superadmin console</span><b>v2.0 · routed PWA</b></div>
        <p class="note">Full component checks live in <b>System Health</b>.</p>
      </SectionCard>
    </div>

    <ConfirmModal :open="!!confirm" v-bind="confirmProps" @cancel="confirm = null" @confirm="runConfirm" />
    <ToastHost />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api, { apiError, getAdmin } from '../api'
import SectionCard from '../components/SectionCard.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import ToastHost from '../components/ToastHost.vue'
import { useToast } from '../composables/useToast'
import { usePush } from '../composables/usePush'
import { timeAgo, fmtUptime, avatarColor } from '../format'

const toast = useToast()
const push = usePush()
const me = ref(getAdmin())
const form = reactive({
  general: { app_name: '', maintenance_mode: false },
  ai: { free_daily_limit: 50, premium_daily_limit: 500, cost_per_1k_tokens: 0.002 },
  features: { image_gen_enabled: true, file_uploads_enabled: true, moderation_enabled: true, knowledge_base_enabled: true },
})
const featureRows = [
  { key: 'image_gen_enabled', label: 'Image understanding', desc: 'Users can attach images in chat' },
  { key: 'file_uploads_enabled', label: 'File uploads', desc: 'Users can attach documents and audio' },
  { key: 'moderation_enabled', label: 'Auto moderation', desc: 'Flag harmful content automatically' },
  { key: 'knowledge_base_enabled', label: 'Knowledge Base (RAG)', desc: 'AI grounds answers in knowledge documents' },
]
const saving = ref(null)
const admins = ref([])
const about = ref(null)

async function load() {
  try {
    const { data } = await api.get('/admin/settings')
    Object.assign(form.general, data.general)
    Object.assign(form.ai, { free_daily_limit: data.ai.free_daily_limit, premium_daily_limit: data.ai.premium_daily_limit, cost_per_1k_tokens: data.ai.cost_per_1k_tokens })
    Object.assign(form.features, data.features)
  } catch (e) { toast.error(apiError(e).message) }
  try { admins.value = (await api.get('/admin/admins')).data } catch {}
  try {
    const { data: h } = await api.get('/admin/health/details')
    about.value = { node_version: h.checks?.process?.node_version, db_status: h.checks?.database?.status, uptime: h.checks?.process?.uptime_s, overall: h.overall }
  } catch {}
}

async function saveGroup(group) {
  saving.value = group
  try {
    if (group === 'general') await api.put('/admin/settings', { app_name: form.general.app_name, maintenance_mode: form.general.maintenance_mode })
    if (group === 'ai') await api.put('/admin/settings', { free_daily_limit: form.ai.free_daily_limit, premium_daily_limit: form.ai.premium_daily_limit, cost_per_1k_tokens: form.ai.cost_per_1k_tokens })
    if (group === 'features') await api.put('/admin/settings', { ...form.features })
    toast.success('Saved — changes are live')
  } catch (e) { toast.error(apiError(e).message) }
  finally { saving.value = null }
}

const confirm = ref(null)
const confirmProps = computed(() => confirm.value || {})
function askDeleteAdmin(a) {
  confirm.value = {
    title: 'Delete superadmin?', tone: 'danger', confirmLabel: 'Delete',
    message: `Remove ${a.username} (${a.email})? They will immediately lose console access.`,
    meta: { id: a.id },
  }
}
async function runConfirm() {
  const c = confirm.value
  confirm.value = null
  if (!c) return
  try {
    await api.delete(`/admin/admins/${c.meta.id}`)
    toast.success('Account removed')
    admins.value = admins.value.filter(a => a.id !== c.meta.id)
  } catch (e) { toast.error(apiError(e).message) }
}

onMounted(() => { load(); push.refresh() })
</script>

<style scoped src="./admin-tables.css"></style>
<style scoped>
.st { display:flex; flex-direction:column; gap:16px; }
.groups { display:grid; grid-template-columns:1fr 1fr; gap:16px; align-items:start; }
@media (max-width:1000px) { .groups { grid-template-columns:1fr; } }
.kbf { display:flex; flex-direction:column; gap:6px; margin-bottom:13px; }
.kbf label { font-size:12px; font-weight:700; color:var(--text-2); }
.inp { background:var(--surface); border:1px solid var(--border); color:var(--text-1); border-radius:10px; padding:10px 12px; font-size:13.5px; outline:none; width:100%; }
.inp:focus { border-color:var(--brand); }
.flag-row { display:flex; align-items:center; justify-content:space-between; gap:12px; background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:11px 14px; margin-bottom:10px; }
.flag-l { font-size:13px; font-weight:700; color:var(--text-1); }
.flag-d { font-size:11px; color:var(--text-3); margin-top:2px; }
.tog { width:44px; height:25px; border-radius:99px; background:var(--surface-elevated); border:1px solid var(--border); position:relative; cursor:pointer; transition:background .18s ease; flex:none; }
.tog .knob { position:absolute; top:2px; left:2px; width:19px; height:19px; border-radius:50%; background:var(--text-3); transition:all .18s ease; }
.tog.on { background:var(--brand); border-color:var(--brand); }
.tog.on .knob { left:21px; background:#fff; }
.note { font-size:12px; color:var(--text-3); margin:10px 0 12px; line-height:1.55; }
.note code { background:var(--surface-elevated); border-radius:6px; padding:1px 6px; font-size:11px; color:var(--text-1); }
.btn-row { display:flex; gap:9px; flex-wrap:wrap; }
.push-status .kv { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px dashed var(--border); font-size:13px; }
.push-status .kv:last-child { border-bottom:0; }
.push-status .kv > span:first-child { color:var(--text-3); }
.push-status .kv b { color:var(--text-1); }
.cap { text-transform:capitalize; }
.admins { display:flex; flex-direction:column; margin-bottom:10px; }
.arow { display:flex; align-items:center; gap:11px; padding:10px 2px; border-bottom:1px dashed var(--border); }
.arow:last-child { border-bottom:0; }
.ainfo { flex:1; min-width:0; display:flex; flex-direction:column; }
.ainfo b { font-size:13px; color:var(--text-1); }
.ainfo span { font-size:11.5px; color:var(--text-3); }
</style>
