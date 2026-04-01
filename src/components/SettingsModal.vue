<template>
  <teleport to="body">
    <div class="modal-bg" @click.self="$emit('close')">
      <div class="settings-modal">
        <div class="sm-nav">
          <div class="sm-nav-logo">
            <img src="/logo.png" alt="KinyaBot" />
            <span>Settings</span>
          </div>
          <button v-for="tab in tabs" :key="tab.id" class="sm-nav-btn" :class="{active:activeTab===tab.id}" @click="activeTab=tab.id">
            <i :class="tab.icon"></i><span>{{ tab.label }}</span>
          </button>
        </div>

        <div class="sm-content">
          <button class="sm-close" @click="$emit('close')"><i class="fas fa-xmark"></i></button>

          <!-- ── General ── -->
          <div v-if="activeTab==='general'" class="sm-section">
            <h2 class="sm-title">General</h2>

            <!-- Display Mode -->
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-name">Display Mode</div>
                <div class="setting-desc">Choose light, dark, or follow system preference</div>
              </div>
              <div class="mode-group">
                <button v-for="m in modes" :key="m.id" class="mode-btn" :class="{active:displayMode===m.id}" @click="setMode(m.id)" :title="m.label">
                  <i :class="m.icon"></i>
                  <span>{{ m.label }}</span>
                </button>
              </div>
            </div>

            <!-- Accent Color -->
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-name">Accent Color</div>
                <div class="setting-desc">Change the app's highlight color</div>
              </div>
              <div class="theme-pills">
                <button v-for="t in themes" :key="t.id" class="theme-pill" :class="{active:accentColor===t.id}" @click="setAccent(t.id)" :title="t.label">
                  <div class="theme-dot" :style="{background:t.color}"></div>
                  {{ t.label }}
                </button>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info"><div class="setting-name">Font Size</div><div class="setting-desc">Adjust text size across the app</div></div>
              <div class="select-wrap">
                <select v-model="fontSize" @change="applyFontSize" class="sm-select">
                  <option value="13px">Small</option>
                  <option value="15px">Medium</option>
                  <option value="17px">Large</option>
                  <option value="19px">Extra Large</option>
                </select>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info"><div class="setting-name">Language</div><div class="setting-desc">App display language</div></div>
              <div class="select-wrap">
                <select v-model="lang" class="sm-select">
                  <option value="en">English</option>
                  <option value="rw">Kinyarwanda</option>
                  <option value="fr">Français</option>
                  <option value="sw">Swahili</option>
                </select>
              </div>
            </div>

            <div class="setting-row">
              <div class="setting-info"><div class="setting-name">Auto-scroll to new messages</div><div class="setting-desc">Automatically scroll to latest message</div></div>
              <button class="toggle" :class="{on:autoScroll}" @click="autoScroll=!autoScroll"><span class="toggle-knob"></span></button>
            </div>
            <div class="setting-row">
              <div class="setting-info"><div class="setting-name">Sound Effects</div><div class="setting-desc">Play sounds on send / receive</div></div>
              <button class="toggle" :class="{on:soundEnabled}" @click="soundEnabled=!soundEnabled"><span class="toggle-knob"></span></button>
            </div>
            <div class="setting-row">
              <div class="setting-info"><div class="setting-name">Show Message Timestamps</div><div class="setting-desc">Display time on each message</div></div>
              <button class="toggle" :class="{on:showTimestamps}" @click="showTimestamps=!showTimestamps"><span class="toggle-knob"></span></button>
            </div>
          </div>

          <!-- ── Account ── -->
          <div v-if="activeTab==='account'" class="sm-section">
            <h2 class="sm-title">Account</h2>
            <div class="profile-header">
              <div class="profile-avatar">
                <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" />
                <span v-else>{{ auth.user?.username?.[0]?.toUpperCase() }}</span>
              </div>
              <div>
                <div class="profile-name">{{ auth.user?.username }}</div>
                <div class="profile-email">{{ auth.user?.email }}</div>
              </div>
            </div>
            <div class="setting-row col">
              <label class="sm-label">Display Name</label>
              <input v-model="profileForm.username" class="sm-input" type="text" />
            </div>
            <div class="setting-row col">
              <label class="sm-label">Avatar URL</label>
              <input v-model="profileForm.avatar_url" class="sm-input" type="url" placeholder="https://..." />
            </div>
            <div v-if="profileMsg" class="sm-notice" :class="profileMsg.type">
              <i :class="profileMsg.type==='ok'?'fas fa-check-circle':'fas fa-circle-exclamation'"></i>
              {{ profileMsg.text }}
            </div>
            <div class="action-row">
              <button class="sm-btn primary" :disabled="savingProfile" @click="saveProfile">
                <i v-if="savingProfile" class="fas fa-spinner fa-spin"></i>
                {{ savingProfile ? 'Saving…' : 'Save Changes' }}
              </button>
            </div>
            <div class="divider-line"></div>
            <div class="setting-row">
              <div class="setting-info"><div class="setting-name" style="color:var(--red)">Delete Account</div><div class="setting-desc">Permanently remove your account and all data</div></div>
              <button class="sm-btn danger" @click="confirmDeleteAccount">Delete Account</button>
            </div>
          </div>

          <!-- ── AI Model ── -->
          <div v-if="activeTab==='model'" class="sm-section">
            <h2 class="sm-title">AI Model</h2>
            <div class="setting-row col">
              <label class="sm-label">Active Model</label>
              <div class="model-cards">
                <div v-for="m in models" :key="m.id" class="model-card" :class="{active:activeModel===m.id}" @click="activeModel=m.id">
                  <i :class="m.icon"></i>
                  <div class="mc-info"><div class="mc-name">{{ m.name }}</div><div class="mc-desc">{{ m.desc }}</div></div>
                  <div v-if="activeModel===m.id" class="mc-check"><i class="fas fa-check"></i></div>
                </div>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info"><div class="setting-name">Context Memory</div><div class="setting-desc">Number of previous messages to use as context</div></div>
              <div class="select-wrap">
                <select v-model="contextSize" class="sm-select">
                  <option value="5">Last 5</option><option value="10">Last 10</option>
                  <option value="20">Last 20</option><option value="50">Last 50</option>
                </select>
              </div>
            </div>
            <div class="setting-row">
              <div class="setting-info"><div class="setting-name">Deep Think Mode</div><div class="setting-desc">Enable extended reasoning for complex questions</div></div>
              <button class="toggle" :class="{on:deepThink}" @click="deepThink=!deepThink"><span class="toggle-knob"></span></button>
            </div>
            <div class="setting-row">
              <div class="setting-info"><div class="setting-name">Markdown Rendering</div><div class="setting-desc">Render markdown formatting in AI responses</div></div>
              <button class="toggle on" disabled><span class="toggle-knob"></span></button>
            </div>
            <div class="setting-row">
              <div class="setting-info"><div class="setting-name">Code Syntax Highlighting</div><div class="setting-desc">Highlight code blocks with syntax colors</div></div>
              <button class="toggle on" disabled><span class="toggle-knob"></span></button>
            </div>
          </div>

          <!-- ── Privacy ── -->
          <div v-if="activeTab==='privacy'" class="sm-section">
            <h2 class="sm-title">Privacy &amp; Data</h2>
            <div class="setting-row">
              <div class="setting-info"><div class="setting-name">Save Chat History</div><div class="setting-desc">Store conversations in the database</div></div>
              <button class="toggle on" disabled><span class="toggle-knob"></span></button>
            </div>
            <div class="setting-row">
              <div class="setting-info"><div class="setting-name">Allow Data for Training</div><div class="setting-desc">Help improve KinyaBot by sharing anonymous conversations</div></div>
              <button class="toggle" :class="{on:dataTraining}" @click="dataTraining=!dataTraining"><span class="toggle-knob"></span></button>
            </div>
            <div class="setting-row">
              <div class="setting-info"><div class="setting-name">Analytics</div><div class="setting-desc">Send anonymous usage statistics</div></div>
              <button class="toggle" :class="{on:analytics}" @click="analytics=!analytics"><span class="toggle-knob"></span></button>
            </div>
            <div class="divider-line"></div>
            <div class="action-row">
              <button class="sm-btn danger" @click="clearAllChats"><i class="fas fa-trash"></i> Delete All Chats</button>
              <button class="sm-btn" @click="exportData"><i class="fas fa-file-export"></i> Export My Data</button>
            </div>
          </div>

          <!-- ── Notifications ── -->
          <div v-if="activeTab==='notifications'" class="sm-section">
            <h2 class="sm-title">Notifications</h2>
            <div class="setting-row">
              <div class="setting-info"><div class="setting-name">Browser Notifications</div><div class="setting-desc">Get notified when AI responds (requires permission)</div></div>
              <button class="toggle" :class="{on:notifBrowser}" @click="toggleBrowserNotif"><span class="toggle-knob"></span></button>
            </div>
            <div class="setting-row">
              <div class="setting-info"><div class="setting-name">Sound Notification</div><div class="setting-desc">Play a sound when a response is ready</div></div>
              <button class="toggle" :class="{on:notifSound}" @click="notifSound=!notifSound"><span class="toggle-knob"></span></button>
            </div>
            <div class="setting-row">
              <div class="setting-info"><div class="setting-name">Email Updates</div><div class="setting-desc">Receive KinyaBot feature announcements via email</div></div>
              <button class="toggle" :class="{on:notifEmail}" @click="notifEmail=!notifEmail"><span class="toggle-knob"></span></button>
            </div>
          </div>

          <!-- ── Shortcuts ── -->
          <div v-if="activeTab==='shortcuts'" class="sm-section">
            <h2 class="sm-title">Keyboard Shortcuts</h2>
            <div class="shortcut-list">
              <div v-for="s in shortcuts" :key="s.action" class="shortcut-row">
                <span class="shortcut-action">{{ s.action }}</span>
                <div class="shortcut-keys"><kbd v-for="k in s.keys" :key="k">{{ k }}</kbd></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'

defineEmits(['close'])
const auth = useAuthStore()
const chatStore = useChatStore()

const tabs = [
  { id:'general',       icon:'fas fa-sliders',         label:'General' },
  { id:'account',       icon:'fas fa-user-circle',      label:'Account' },
  { id:'model',         icon:'fas fa-brain',            label:'AI Model' },
  { id:'privacy',       icon:'fas fa-shield-halved',    label:'Privacy & Data' },
  { id:'notifications', icon:'fas fa-bell',             label:'Notifications' },
  { id:'shortcuts',     icon:'fas fa-keyboard',         label:'Shortcuts' },
]
const activeTab = ref('general')

// ── Display Mode ──
const modes = [
  { id:'dark',   icon:'fas fa-moon',     label:'Dark' },
  { id:'light',  icon:'fas fa-sun',      label:'Light' },
  { id:'system', icon:'fas fa-desktop',  label:'System' },
]
const displayMode = ref(localStorage.getItem('kb_mode') || 'dark')

function setMode(id) {
  displayMode.value = id
  localStorage.setItem('kb_mode', id)
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = id === 'dark' || (id === 'system' && prefersDark)
  document.documentElement.classList.toggle('light-mode', !isDark)
}

// ── Accent color ──
const themes = [
  { id:'indigo', label:'Indigo', color:'#6366f1' },
  { id:'purple', label:'Purple', color:'#a855f7' },
  { id:'blue',   label:'Blue',   color:'#3b82f6' },
  { id:'cyan',   label:'Cyan',   color:'#06b6d4' },
  { id:'green',  label:'Green',  color:'#22c55e' },
]
const accentColor = ref(localStorage.getItem('kb_accent') || 'indigo')

function setAccent(id) {
  accentColor.value = id
  localStorage.setItem('kb_accent', id)
  const map = { indigo:'#6366f1', purple:'#a855f7', blue:'#3b82f6', cyan:'#06b6d4', green:'#22c55e' }
  document.documentElement.style.setProperty('--accent-solid', map[id])
}

// Font / lang
const fontSize = ref(localStorage.getItem('kb_fs') || '15px')
const lang = ref(localStorage.getItem('kb_lang') || 'en')
const autoScroll = ref(true)
const soundEnabled = ref(false)
const showTimestamps = ref(true)

function applyFontSize() {
  localStorage.setItem('kb_fs', fontSize.value)
  document.body.style.fontSize = fontSize.value
}

// Account
const profileForm = reactive({ username: auth.user?.username||'', avatar_url: auth.user?.avatar_url||'' })
const savingProfile = ref(false)
const profileMsg = ref(null)

async function saveProfile() {
  savingProfile.value = true
  try {
    await auth.updateProfile(profileForm)
    profileMsg.value = { type:'ok', text:'Profile updated successfully!' }
    setTimeout(() => profileMsg.value = null, 3000)
  } catch { profileMsg.value = { type:'err', text:'Failed to save profile.' } }
  finally { savingProfile.value = false }
}

function confirmDeleteAccount() {
  if (confirm('Delete your account permanently? This cannot be undone.')) {
    alert('Account deletion is handled by your administrator. Contact support@kinyabot.ai')
  }
}

// AI Model
const models = [
  { id:'llm',   icon:'fas fa-robot',  name:'KinyaBot LLM',        desc:'General purpose AI assistant' },
  { id:'image', icon:'fas fa-image',  name:'Image Generation',     desc:'Use /image prefix to generate images' },
]
const activeModel = ref('llm')
const contextSize = ref('10')
const deepThink = ref(false)

// Privacy
const dataTraining = ref(false)
const analytics = ref(false)

async function clearAllChats() {
  if (!confirm('Delete ALL chats permanently? This cannot be undone.')) return
  await chatStore.deleteAllChats()
}

function exportData() {
  const data = {
    user: { username: auth.user?.username, email: auth.user?.email },
    chats: chatStore.chats.map(c => ({ id: c.id, title: c.title, created: c.created_at })),
    exportedAt: new Date().toISOString()
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `kinyabot-data-${Date.now()}.json`
  a.click()
}

// Notifications
const notifBrowser = ref(false)
const notifSound = ref(false)
const notifEmail = ref(false)

async function toggleBrowserNotif() {
  if (!notifBrowser.value) {
    const perm = await Notification.requestPermission()
    if (perm === 'granted') notifBrowser.value = true
    else alert('Notification permission denied. Please allow notifications in your browser settings.')
  } else {
    notifBrowser.value = false
  }
}

// Shortcuts
const shortcuts = [
  { action:'New chat',        keys:['Ctrl', 'K'] },
  { action:'Search chats',    keys:['Ctrl', '/'] },
  { action:'Send message',    keys:['Enter'] },
  { action:'New line',        keys:['Shift', 'Enter'] },
  { action:'Focus input',     keys:['Ctrl', 'L'] },
  { action:'Toggle sidebar',  keys:['Ctrl', 'B'] },
  { action:'Close modal',     keys:['Esc'] },
]
</script>

<style scoped>
.modal-bg { position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(6px);animation:fadeIn .2s ease }
.settings-modal { display:flex;width:min(820px,96vw);height:min(600px,92vh);background:var(--bg-card);border:1px solid var(--border-md);border-radius:var(--r-xl);overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.5);animation:fadeUp .25s ease }

.sm-nav { width:200px;min-width:200px;background:var(--bg-panel);border-right:1px solid var(--border);display:flex;flex-direction:column;padding:16px 10px;gap:2px }
.sm-nav-logo { display:flex;align-items:center;gap:9px;padding:6px 10px 14px;font-size:14px;font-weight:700;color:var(--text-1);border-bottom:1px solid var(--border);margin-bottom:8px }
.sm-nav-logo img { width:26px;height:26px;border-radius:7px;object-fit:contain }
.sm-nav-btn { display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:var(--r-sm);background:none;border:none;color:var(--text-2);font-size:13px;text-align:left;cursor:pointer;transition:all .2s }
.sm-nav-btn i { width:16px;text-align:center;font-size:13px }
.sm-nav-btn:hover { background:var(--bg-hover);color:var(--text-1) }
.sm-nav-btn.active { background:rgba(109,40,217,.2);color:#c4b5fd;border:1px solid rgba(109,40,217,.3) }

.sm-content { flex:1;overflow-y:auto;padding:24px 28px;position:relative }
.sm-close { position:absolute;top:16px;right:16px;width:30px;height:30px;border-radius:8px;background:none;border:none;color:var(--text-2);font-size:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s }
.sm-close:hover { background:var(--bg-hover);color:var(--text-1) }
.sm-section { display:flex;flex-direction:column;gap:0 }
.sm-title { font-size:16px;font-weight:700;color:var(--text-1);margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid var(--border) }

.setting-row { display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid var(--border);gap:16px }
.setting-row.col { flex-direction:column;align-items:stretch }
.setting-info { flex:1;min-width:0 }
.setting-name { font-size:13.5px;font-weight:500;color:var(--text-1);margin-bottom:2px }
.setting-desc { font-size:12px;color:var(--text-2) }

/* Display Mode */
.mode-group { display:flex;gap:6px }
.mode-btn { display:flex;align-items:center;gap:6px;padding:6px 12px;background:var(--bg-input);border:1px solid var(--border-md);border-radius:var(--r-sm);color:var(--text-2);font-size:12.5px;cursor:pointer;transition:all .2s }
.mode-btn:hover { background:var(--bg-hover);color:var(--text-1) }
.mode-btn.active { background:rgba(109,40,217,.2);border-color:rgba(109,40,217,.45);color:#c4b5fd }
.mode-btn i { font-size:12px }

/* Theme pills */
.theme-pills { display:flex;gap:6px;flex-wrap:wrap }
.theme-pill { display:flex;align-items:center;gap:6px;padding:5px 11px;background:var(--bg-input);border:1px solid var(--border-md);border-radius:99px;color:var(--text-2);font-size:12px;cursor:pointer;transition:all .2s }
.theme-pill.active { border-color:rgba(109,40,217,.5);background:rgba(109,40,217,.15);color:var(--text-1) }
.theme-dot { width:10px;height:10px;border-radius:50%;flex-shrink:0 }

.select-wrap {}
.sm-select { background:var(--bg-input);border:1px solid var(--border-md);border-radius:var(--r-sm);color:var(--text-1);font-size:13px;padding:7px 10px;outline:none }
.sm-select:focus { border-color:#6d28d9 }

/* Toggle */
.toggle { width:40px;height:22px;border-radius:99px;background:var(--bg-hover);border:1px solid var(--border-md);position:relative;cursor:pointer;transition:all .25s;flex-shrink:0 }
.toggle.on { background:linear-gradient(135deg,#4f46e5,#7c3aed);border-color:transparent }
.toggle:disabled { opacity:.45;cursor:not-allowed }
.toggle-knob { position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:transform .25s;box-shadow:0 1px 4px rgba(0,0,0,.3) }
.toggle.on .toggle-knob { transform:translateX(18px) }

/* Profile */
.profile-header { display:flex;align-items:center;gap:14px;margin-bottom:20px }
.profile-avatar { width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#4f46e5,#a855f7);display:flex;align-items:center;justify-content:center;font-size:1.3rem;font-weight:700;color:#fff;overflow:hidden;flex-shrink:0 }
.profile-avatar img { width:100%;height:100%;object-fit:cover }
.profile-name { font-size:15px;font-weight:600 }
.profile-email { font-size:12.5px;color:var(--text-2) }

.sm-label { font-size:12.5px;font-weight:500;color:var(--text-2);margin-bottom:6px }
.sm-input { padding:9px 12px;background:var(--bg-input);border:1px solid var(--border-md);border-radius:var(--r-sm);color:var(--text-1);font-size:13.5px;width:100%;outline:none }
.sm-input:focus { border-color:#6d28d9;box-shadow:0 0 0 3px rgba(109,40,217,.12) }

.sm-notice { padding:9px 12px;border-radius:var(--r-sm);font-size:12.5px;display:flex;align-items:center;gap:7px;margin:8px 0 }
.sm-notice.ok { background:rgba(52,168,83,.12);border:1px solid rgba(52,168,83,.3);color:#34a853 }
.sm-notice.err { background:rgba(242,139,130,.12);border:1px solid rgba(242,139,130,.3);color:var(--red) }

.action-row { display:flex;gap:8px;margin-top:8px;flex-wrap:wrap }
.sm-btn { display:flex;align-items:center;gap:6px;padding:8px 18px;border-radius:var(--r-sm);background:var(--bg-input);border:1px solid var(--border-md);color:var(--text-1);font-size:13px;font-weight:500;cursor:pointer;transition:all .2s }
.sm-btn:hover { background:var(--bg-hover) }
.sm-btn.primary { background:#6d28d9;border-color:#6d28d9;color:#fff }
.sm-btn.primary:hover { background:#7c3aed }
.sm-btn.danger { border-color:rgba(242,139,130,.3);color:var(--red) }
.sm-btn.danger:hover { background:rgba(242,139,130,.1) }
.sm-btn:disabled { opacity:.5;cursor:not-allowed }

.divider-line { height:1px;background:var(--border);margin:16px 0 }

/* Model cards */
.model-cards { display:flex;flex-direction:column;gap:8px;margin-top:6px }
.model-card { display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:var(--r-sm);background:var(--bg-input);border:1px solid var(--border-md);cursor:pointer;transition:all .2s }
.model-card:hover { border-color:rgba(109,40,217,.4);background:rgba(109,40,217,.08) }
.model-card.active { border-color:rgba(109,40,217,.5);background:rgba(109,40,217,.15) }
.model-card i:first-child { font-size:16px;color:#c4b5fd;width:20px;text-align:center }
.mc-info { flex:1 }
.mc-name { font-size:13px;font-weight:600 }
.mc-desc { font-size:12px;color:var(--text-2);margin-top:1px }
.mc-check { width:20px;height:20px;border-radius:50%;background:#6d28d9;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff }

/* Shortcuts */
.shortcut-list { display:flex;flex-direction:column;gap:1px }
.shortcut-row { display:flex;align-items:center;justify-content:space-between;padding:11px 4px;border-bottom:1px solid var(--border) }
.shortcut-action { font-size:13.5px;color:var(--text-1) }
.shortcut-keys { display:flex;gap:5px }
kbd { padding:3px 8px;background:var(--bg-input);border:1px solid var(--border-md);border-radius:5px;font-size:11.5px;color:var(--text-2);font-family:var(--font) }

@media(max-width:600px) {
  .sm-nav { width:48px;min-width:48px }
  .sm-nav-logo span,.sm-nav-btn span { display:none }
  .sm-nav-logo { padding:6px 4px 14px;justify-content:center }
  .sm-nav-btn { justify-content:center;padding:8px }
  .sm-content { padding:16px 14px }
}
</style>
