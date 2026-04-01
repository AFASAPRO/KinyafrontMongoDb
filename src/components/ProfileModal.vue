<template>
  <teleport to="body">
    <div class="modal-bg" @click.self="$emit('close')">
      <div class="profile-modal">
        <div class="pm-header">
          <h2>Profile</h2>
          <button class="pm-close" @click="$emit('close')"><i class="fas fa-xmark"></i></button>
        </div>
        <div class="pm-body">
          <div class="pm-avatar">
            <div class="avatar-circle">
              <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" />
              <span v-else>{{ auth.user?.username?.[0]?.toUpperCase() }}</span>
            </div>
            <div>
              <div class="pm-name">{{ auth.user?.username }}</div>
              <div class="pm-email">{{ auth.user?.email }}</div>
            </div>
          </div>
          <div class="pm-field">
            <label>Display Name</label>
            <input v-model="form.username" type="text" class="pm-input" />
          </div>
          <div class="pm-field">
            <label>Avatar URL</label>
            <input v-model="form.avatar_url" type="url" class="pm-input" placeholder="https://…" />
          </div>
          <div v-if="msg" class="pm-notice" :class="msg.type">
            <i :class="msg.type==='ok'?'fas fa-check-circle':'fas fa-circle-exclamation'"></i>
            {{ msg.text }}
          </div>
          <button class="pm-save" :disabled="saving" @click="save">
            <i v-if="saving" class="fas fa-spinner fa-spin"></i>
            {{ saving ? 'Saving…' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAuthStore } from '../stores/auth'

defineEmits(['close'])
const auth = useAuthStore()

const form = reactive({ username: auth.user?.username||'', avatar_url: auth.user?.avatar_url||'' })
const saving = ref(false)
const msg = ref(null)

async function save() {
  saving.value = true
  try {
    await auth.updateProfile(form)
    msg.value = { type:'ok', text:'Profile updated!' }
    setTimeout(() => msg.value = null, 3000)
  } catch { msg.value = { type:'err', text:'Failed to update.' } }
  finally { saving.value = false }
}
</script>

<style scoped>
.modal-bg { position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(6px) }
.profile-modal { width:360px;max-width:94vw;background:var(--bg-card);border:1px solid var(--border-md);border-radius:var(--r-xl);overflow:hidden;animation:fadeUp .2s ease }
.pm-header { display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--border) }
.pm-header h2 { font-size:14.5px;font-weight:700 }
.pm-close { width:28px;height:28px;border-radius:7px;background:none;border:none;color:var(--text-2);font-size:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s }
.pm-close:hover { background:var(--bg-hover);color:var(--text-1) }
.pm-body { padding:18px;display:flex;flex-direction:column;gap:14px }
.pm-avatar { display:flex;align-items:center;gap:14px }
.avatar-circle { width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#a855f7);display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:700;color:#fff;overflow:hidden;flex-shrink:0 }
.avatar-circle img { width:100%;height:100%;object-fit:cover }
.pm-name { font-size:14.5px;font-weight:600 }
.pm-email { font-size:12px;color:var(--text-2) }
.pm-field { display:flex;flex-direction:column;gap:5px }
.pm-field label { font-size:12.5px;font-weight:500;color:var(--text-2) }
.pm-input { padding:9px 12px;background:var(--bg-input);border:1px solid var(--border-md);border-radius:var(--r-sm);color:var(--text-1);font-size:13.5px }
.pm-input:focus { border-color:#6d28d9;outline:none }
.pm-input::placeholder { color:var(--text-3) }
.pm-notice { padding:8px 12px;border-radius:var(--r-sm);font-size:12.5px;display:flex;align-items:center;gap:7px }
.pm-notice.ok { background:rgba(52,168,83,.12);border:1px solid rgba(52,168,83,.3);color:#34a853 }
.pm-notice.err { background:rgba(242,139,130,.12);border:1px solid rgba(242,139,130,.3);color:var(--red) }
.pm-save { padding:10px;background:#6d28d9;border:none;border-radius:var(--r-sm);color:#fff;font-size:13.5px;font-weight:500;cursor:pointer;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:7px }
.pm-save:hover:not(:disabled) { background:#7c3aed }
.pm-save:disabled { opacity:.5;cursor:not-allowed }
</style>
