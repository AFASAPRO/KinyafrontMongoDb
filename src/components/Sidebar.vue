<template>
  <aside class="sidebar" :class="{ 'mob-open': mobileOpen }">
    <!-- ── Header: Logo + "Chats" + search icon ── -->
    <div class="sb-header">
      <img src="/logo.png" alt="KinyaBot" class="sb-logo" />
      <span class="sb-title">Chats</span>
      <button class="icon-btn" @click="searchOpen=!searchOpen" title="Search chats (Ctrl+/)">
        <i class="fas fa-magnifying-glass"></i>
      </button>
    </div>

    <!-- Search box (Ctrl+/ toggles) -->
    <transition name="fade">
      <div v-if="searchOpen" class="sb-search">
        <div class="search-row">
          <i class="fas fa-magnifying-glass"></i>
          <input ref="searchRef" v-model="searchQ" type="text" placeholder="Search chats…"
            @input="doSearch" @keydown.esc="closeSearch" />
          <button v-if="searchQ" @click="clearSearch"><i class="fas fa-xmark"></i></button>
        </div>
      </div>
    </transition>

    <!-- Search results -->
    <div v-if="searchQ && chatStore.searchResults.length" class="sb-scroll">
      <div class="section-label-row">Results</div>
      <div v-for="r in chatStore.searchResults" :key="r.id" class="search-result" @click="goToChat(r.chat_id)">
        <i class="fas fa-message"></i>
        <div class="sr-info">
          <div class="sr-chat">{{ r.chat_title }}</div>
          <div class="sr-text">{{ r.content.slice(0,70) }}…</div>
        </div>
      </div>
    </div>

    <!-- Chat list -->
    <div v-else class="sb-scroll">
      <!-- Pinned Models -->
      <div class="section-group">
        <div class="section-header">
          <span class="section-label">Pinned Models</span>
          <button class="icon-btn-sm has-dot" title="Add"><i class="fas fa-plus"></i></button>
        </div>
        <template v-if="chatStore.pinnedChats.length">
          <SidebarChatItem
            v-for="chat in chatStore.pinnedChats" :key="chat.id"
            :chat="chat" :active="chatStore.activeChat?.id===chat.id" variant="model"
            @click="$emit('load-chat',chat.id)"
            @rename="startRename(chat)" @pin="chatStore.pinChat(chat.id,0)" @delete="startDelete(chat)"
          />
        </template>
        <div v-else class="empty-hint"><i class="fas fa-thumbtack"></i><span>No pinned chats</span></div>
      </div>

      <!-- Tool shortcuts -->
      <div class="section-group">
        <div class="tool-item" @click="openCanvas">
          <div class="tool-icon"><i class="fas fa-image"></i></div>
          <span>Create Image</span>
          <i class="fas fa-ellipsis tool-more"></i>
        </div>
        <div class="tool-item" @click="openCanvas">
          <div class="tool-icon"><i class="fas fa-pen-to-square"></i></div>
          <span>Canvas</span>
          <i class="fas fa-ellipsis tool-more"></i>
        </div>
        <div class="tool-item" @click="openGuided">
          <div class="tool-icon"><i class="fas fa-graduation-cap"></i></div>
          <span>Guided Learning</span>
          <i class="fas fa-ellipsis tool-more"></i>
        </div>
      </div>

      <!-- Integrations -->
      <div class="section-group">
        <div class="section-header">
          <span class="section-label">Integrations</span>
          <button class="icon-btn-sm has-dot"><i class="fas fa-plus"></i></button>
        </div>
        <div class="integration-item">
          <div class="integ-icon" style="background:#f24e1e12;border-color:#f24e1e25"><i class="fab fa-figma" style="color:#f24e1e"></i></div>
          <span>Figma</span><div class="integ-dot"></div>
        </div>
        <div class="integration-item">
          <div class="integ-icon" style="background:#00c4cc12;border-color:#00c4cc25"><i class="fas fa-pen-nib" style="color:#00c4cc"></i></div>
          <span>Canva</span><div class="integ-dot"></div>
        </div>
        <div class="integration-item">
          <div class="integ-icon" style="background:#3ecf8e12;border-color:#3ecf8e25"><i class="fas fa-database" style="color:#3ecf8e"></i></div>
          <span>Superbase</span>
        </div>
      </div>

      <!-- Recent chats -->
      <div class="section-group" v-if="chatStore.recentChats.length">
        <div class="section-label-row">Recent Chats</div>
        <SidebarChatItem
          v-for="chat in chatStore.recentChats" :key="chat.id"
          :chat="chat" :active="chatStore.activeChat?.id===chat.id"
          @click="$emit('load-chat',chat.id)"
          @rename="startRename(chat)" @pin="chatStore.pinChat(chat.id,1)" @delete="startDelete(chat)"
        />
      </div>
    </div>

    <!-- Footer -->
    <div class="sb-footer">
      <div class="footer-nav">
        <button class="footer-item" @click="showSettings=true">
          <i class="fas fa-gear"></i><span>Settings</span>
        </button>
        <button class="footer-item" @click="showHelp=true">
          <i class="fas fa-circle-question"></i><span>Help &amp; Support</span>
        </button>
        <button class="footer-item logout-item" @click="handleLogout">
          <i class="fas fa-right-from-bracket"></i><span>Log Out</span>
        </button>
      </div>
      <div class="credits-bar">
        <div class="credits-info">
          <span class="credits-num">80 credits left today</span>
          <div class="credits-sub">
            <a href="#" class="upgrade-link">Upgrade</a>
            <i class="fas fa-circle-info credits-icon"></i>
          </div>
        </div>
        <div class="credits-ring">
          <svg viewBox="0 0 36 36" class="credits-svg">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(128,128,128,.2)" stroke-width="3"/>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="url(#cg)" stroke-width="3"
              stroke-dasharray="8 92" stroke-dashoffset="25" stroke-linecap="round"/>
            <defs>
              <linearGradient id="cg" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#4f46e5"/>
                <stop offset="100%" stop-color="#a855f7"/>
              </linearGradient>
            </defs>
          </svg>
          <span class="credits-pct">8%</span>
        </div>
      </div>
    </div>

    <!-- Modals via teleport -->
    <teleport to="body">
      <div v-if="renamingChat" class="modal-overlay" @click.self="renamingChat=null">
        <div class="mini-modal">
          <h3><i class="fas fa-pen"></i> Rename Chat</h3>
          <input v-model="renameVal" class="mini-input" @keyup.enter="submitRename" autofocus />
          <div class="mini-actions">
            <button class="btn-cancel" @click="renamingChat=null">Cancel</button>
            <button class="btn-ok" @click="submitRename">Rename</button>
          </div>
        </div>
      </div>
      <div v-if="deletingChat" class="modal-overlay" @click.self="deletingChat=null">
        <div class="mini-modal">
          <h3><i class="fas fa-trash"></i> Delete Chat</h3>
          <p>Delete "<strong>{{ deletingChat.title }}</strong>"? This cannot be undone.</p>
          <div class="mini-actions">
            <button class="btn-cancel" @click="deletingChat=null">Cancel</button>
            <button class="btn-danger" @click="submitDelete">Delete</button>
          </div>
        </div>
      </div>
      <!-- Canvas modal -->
      <div v-if="showCanvas" class="modal-overlay" @click.self="showCanvas=false">
        <div class="feature-modal">
          <div class="fm-header">
            <i class="fas fa-pen-to-square"></i>
            <h3>Canvas</h3>
            <button @click="showCanvas=false"><i class="fas fa-xmark"></i></button>
          </div>
          <div class="fm-body">
            <p>Start a new chat and type <strong>/canvas</strong> to enter canvas drawing mode, or use these quick actions:</p>
            <div class="fm-actions">
              <button class="fm-btn" @click="sendCanvasPrompt('Create a detailed diagram of ')">
                <i class="fas fa-diagram-project"></i> Create Diagram
              </button>
              <button class="fm-btn" @click="sendCanvasPrompt('Draw ASCII art of ')">
                <i class="fas fa-shapes"></i> ASCII Art
              </button>
              <button class="fm-btn" @click="sendCanvasPrompt('Generate an SVG illustration of ')">
                <i class="fas fa-vector-square"></i> SVG Illustration
              </button>
            </div>
          </div>
        </div>
      </div>
      <!-- Guided Learning modal -->
      <div v-if="showGuided" class="modal-overlay" @click.self="showGuided=false">
        <div class="feature-modal">
          <div class="fm-header">
            <i class="fas fa-graduation-cap"></i>
            <h3>Guided Learning</h3>
            <button @click="showGuided=false"><i class="fas fa-xmark"></i></button>
          </div>
          <div class="fm-body">
            <p>Choose a learning path and KinyaBot will guide you step by step:</p>
            <div class="fm-actions">
              <button class="fm-btn" @click="sendLearningPrompt('web development')"><i class="fas fa-code"></i> Web Development</button>
              <button class="fm-btn" @click="sendLearningPrompt('machine learning')"><i class="fas fa-brain"></i> Machine Learning</button>
              <button class="fm-btn" @click="sendLearningPrompt('data science')"><i class="fas fa-chart-line"></i> Data Science</button>
              <button class="fm-btn" @click="sendLearningPrompt('Python programming')"><i class="fab fa-python"></i> Python</button>
              <button class="fm-btn" @click="sendLearningPrompt('Kinyarwanda language')"><i class="fas fa-language"></i> Kinyarwanda</button>
              <button class="fm-btn" @click="sendLearningPrompt('entrepreneurship')"><i class="fas fa-lightbulb"></i> Entrepreneurship</button>
            </div>
          </div>
        </div>
      </div>
      <SettingsModal v-if="showSettings" @close="showSettings=false" />
      <HelpModal v-if="showHelp" @close="showHelp=false" />
    </teleport>
  </aside>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { disconnectSocket } from '../socket'
import SidebarChatItem from './SidebarChatItem.vue'
import SettingsModal from './SettingsModal.vue'
import HelpModal from './HelpModal.vue'

defineProps({ mobileOpen: Boolean })
const emit = defineEmits(['close-mobile','new-chat','load-chat'])

const router = useRouter()
const auth = useAuthStore()
const chatStore = useChatStore()

const searchOpen = ref(false)
const searchRef = ref(null)
const searchQ = ref('')
const renamingChat = ref(null)
const renameVal = ref('')
const deletingChat = ref(null)
const showSettings = ref(false)
const showHelp = ref(false)
const showCanvas = ref(false)
const showGuided = ref(false)

// Toggle search
function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (searchOpen.value) nextTick(() => searchRef.value?.focus())
  else clearSearch()
}
function closeSearch() { searchOpen.value = false; clearSearch() }

let searchTimer = null
function doSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => chatStore.searchMessages(searchQ.value), 300)
}
function clearSearch() { searchQ.value = ''; chatStore.clearSearch() }
function goToChat(id) { emit('load-chat', id); closeSearch() }

function startRename(chat) { renamingChat.value = chat; renameVal.value = chat.title }
async function submitRename() {
  if (!renameVal.value.trim()) return
  await chatStore.renameChat(renamingChat.value.id, renameVal.value.trim())
  renamingChat.value = null
}
function startDelete(chat) { deletingChat.value = chat }
async function submitDelete() { await chatStore.deleteChat(deletingChat.value.id); deletingChat.value = null }

function openCanvas() { showCanvas.value = true }
function openGuided() { showGuided.value = true }

async function sendCanvasPrompt(prompt) {
  showCanvas.value = false
  if (!chatStore.activeChat) await chatStore.createChat()
  await chatStore.sendMessage(prompt)
}
async function sendLearningPrompt(topic) {
  showGuided.value = false
  if (!chatStore.activeChat) await chatStore.createChat()
  await chatStore.sendMessage(`I want to learn ${topic}. Please create a structured beginner learning plan with topics, resources, and exercises. Guide me step by step.`)
}

async function handleLogout() {
  // Discard any pending empty chat
  if (chatStore.pendingChatId) {
    try { await import('../api').then(m => m.default.delete(`/chats/${chatStore.pendingChatId}`)) } catch {}
  }
  disconnectSocket()
  auth.logout()
  router.push('/login')
}

// Global keyboard shortcuts
function handleKeydown(e) {
  const ctrl = e.ctrlKey || e.metaKey
  if (ctrl && e.key === '/') { e.preventDefault(); toggleSearch() }
  if (ctrl && e.key === 'b') { e.preventDefault(); emit('close-mobile') }
  if (e.key === 'Escape' && searchOpen.value) closeSearch()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown))
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-w); min-width: var(--sidebar-w);
  height: 100vh; background: var(--bg-panel);
  border-right: 1px solid var(--border);
  display: flex; flex-direction: column; overflow: hidden;
  flex-shrink: 0; z-index: 50; transition: transform .3s ease;
}
@media (max-width: 900px) {
  .sidebar { position:fixed; left:0; top:0; transform:translateX(-100%); box-shadow:4px 0 24px rgba(0,0,0,.5); }
  .sidebar.mob-open { transform:translateX(0); }
}

.sb-header { display:flex; align-items:center; gap:8px; padding:10px 12px; border-bottom:1px solid var(--border); flex-shrink:0; }
.sb-logo { width:28px; height:28px; border-radius:7px; object-fit:contain; flex-shrink:0; }
.sb-title { font-size:15px; font-weight:700; color:var(--text-1); flex:1; }

.icon-btn { width:32px; height:32px; border-radius:8px; background:none; border:none; color:var(--text-2); font-size:14px; display:flex; align-items:center; justify-content:center; transition:all .2s; cursor:pointer; }
.icon-btn:hover { background:var(--bg-hover); color:var(--text-1); }

.sb-search { padding:6px 10px 4px; flex-shrink:0; }
.search-row { display:flex; align-items:center; gap:8px; background:var(--bg-card); border:1px solid var(--border-md); border-radius:99px; padding:7px 12px; }
.search-row i { color:var(--text-3); font-size:13px; flex-shrink:0; }
.search-row input { flex:1; background:none; border:none; color:var(--text-1); font-size:13px; outline:none; }
.search-row input::placeholder { color:var(--text-3); }
.search-row button { background:none; border:none; color:var(--text-3); cursor:pointer; font-size:13px; padding:2px; }

.sb-scroll { flex:1; overflow-y:auto; padding:4px 6px; display:flex; flex-direction:column; gap:0; }
.section-group { margin-bottom:6px; }
.section-header { display:flex; align-items:center; justify-content:space-between; padding:8px 8px 4px; }
.section-label { font-size:11.5px; font-weight:600; color:var(--text-2); }
.section-label-row { font-size:11.5px; font-weight:600; color:var(--text-2); padding:8px 8px 4px; }
.icon-btn-sm { width:22px; height:22px; border-radius:6px; background:none; border:none; color:var(--text-3); font-size:11px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; position:relative; }
.icon-btn-sm:hover { background:var(--bg-hover); color:var(--text-1); }
.icon-btn-sm.has-dot::after { content:''; position:absolute; top:2px; right:2px; width:6px; height:6px; border-radius:50%; background:linear-gradient(135deg,#4f46e5,#a855f7); }
.empty-hint { display:flex; align-items:center; gap:8px; padding:10px 12px; color:var(--text-3); font-size:12.5px; }

.tool-item { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:var(--r-sm); cursor:pointer; transition:background .15s; color:var(--text-1); }
.tool-item:hover { background:var(--bg-hover); }
.tool-item span { font-size:13px; flex:1; }
.tool-icon { width:26px; height:26px; border-radius:8px; background:var(--bg-card); border:1px solid var(--border-md); display:flex; align-items:center; justify-content:center; font-size:12px; color:var(--text-2); }
.tool-more { color:var(--text-3); font-size:12px; opacity:0; transition:opacity .2s; }
.tool-item:hover .tool-more { opacity:1; }

.integration-item { display:flex; align-items:center; gap:10px; padding:7px 10px; border-radius:var(--r-sm); cursor:pointer; transition:background .15s; color:var(--text-1); font-size:13px; }
.integration-item:hover { background:var(--bg-hover); }
.integ-icon { width:26px; height:26px; border-radius:7px; border:1px solid transparent; display:flex; align-items:center; justify-content:center; font-size:12px; }
.integ-dot { width:7px; height:7px; border-radius:50%; background:linear-gradient(135deg,#4f46e5,#a855f7); margin-left:auto; }

.search-result { display:flex; align-items:flex-start; gap:9px; padding:8px 10px; border-radius:var(--r-sm); cursor:pointer; transition:background .15s; }
.search-result:hover { background:var(--bg-hover); }
.search-result i { color:var(--text-3); font-size:12px; margin-top:2px; flex-shrink:0; }
.sr-info { min-width:0; }
.sr-chat { font-size:12px; font-weight:600; color:var(--text-1); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.sr-text { font-size:11.5px; color:var(--text-2); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

.sb-footer { flex-shrink:0; border-top:1px solid var(--border); padding:6px 8px; display:flex; flex-direction:column; gap:2px; }
.footer-nav { display:flex; flex-direction:column; gap:1px; }
.footer-item { display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:var(--r-sm); background:none; border:none; color:var(--text-2); font-size:13px; cursor:pointer; transition:all .2s; text-align:left; width:100%; }
.footer-item:hover { background:var(--bg-hover); color:var(--text-1); }
.footer-item i { font-size:14px; width:18px; text-align:center; }
.logout-item:hover { color:#f28b82 !important; background:rgba(242,139,130,.08) !important; }

.credits-bar { display:flex; align-items:center; justify-content:space-between; padding:6px 4px 2px; }
.credits-info { display:flex; flex-direction:column; gap:2px; }
.credits-num { font-size:12px; font-weight:500; color:var(--text-1); }
.credits-sub { display:flex; align-items:center; gap:6px; }
.upgrade-link { font-size:11.5px; color:var(--blue); }
.upgrade-link:hover { text-decoration:underline; }
.credits-icon { font-size:11px; color:var(--text-3); }
.credits-ring { position:relative; width:36px; height:36px; flex-shrink:0; }
.credits-svg { width:100%; height:100%; transform:rotate(-90deg); }
.credits-pct { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:9.5px; font-weight:600; color:var(--text-2); }

/* Modals */
.modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.6); display:flex; align-items:center; justify-content:center; z-index:999; backdrop-filter:blur(4px); }
.mini-modal { width:340px; background:var(--bg-card); border:1px solid var(--border-md); border-radius:var(--r-lg); padding:1.5rem; animation:fadeUp .2s ease; }
.mini-modal h3 { font-size:14.5px; font-weight:600; margin-bottom:.9rem; display:flex; align-items:center; gap:8px; }
.mini-modal p { font-size:13px; color:var(--text-2); margin-bottom:1.1rem; }
.mini-input { width:100%; padding:9px 12px; background:var(--bg-input); border:1px solid var(--border-md); border-radius:var(--r-sm); color:var(--text-1); font-size:13.5px; margin-bottom:1.1rem; outline:none; }
.mini-input:focus { border-color:#6d28d9; box-shadow:0 0 0 3px rgba(109,40,217,.15); }
.mini-actions { display:flex; gap:8px; justify-content:flex-end; }
.btn-cancel,.btn-ok,.btn-danger { padding:7px 16px; border:none; border-radius:var(--r-sm); font-size:13px; font-weight:500; cursor:pointer; transition:all .2s; }
.btn-cancel { background:var(--bg-hover); color:var(--text-2); }
.btn-cancel:hover { color:var(--text-1); }
.btn-ok { background:#6d28d9; color:#fff; }
.btn-ok:hover { background:#7c3aed; }
.btn-danger { background:#991b1b; color:#fff; }
.btn-danger:hover { opacity:.85; }

.feature-modal { width:min(460px,94vw); background:var(--bg-card); border:1px solid var(--border-md); border-radius:var(--r-xl); overflow:hidden; animation:fadeUp .2s ease; }
.fm-header { display:flex; align-items:center; gap:10px; padding:16px 18px; border-bottom:1px solid var(--border); }
.fm-header i { font-size:18px; color:#c4b5fd; }
.fm-header h3 { font-size:15px; font-weight:700; flex:1; }
.fm-header button { background:none; border:none; color:var(--text-2); font-size:15px; cursor:pointer; padding:4px; border-radius:6px; }
.fm-header button:hover { background:var(--bg-hover); }
.fm-body { padding:18px; }
.fm-body p { font-size:13.5px; color:var(--text-2); margin-bottom:16px; line-height:1.6; }
.fm-actions { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.fm-btn { display:flex; align-items:center; gap:8px; padding:10px 14px; background:var(--bg-panel); border:1px solid var(--border-md); border-radius:var(--r-sm); color:var(--text-1); font-size:13px; cursor:pointer; transition:all .2s; }
.fm-btn:hover { background:rgba(109,40,217,.12); border-color:rgba(109,40,217,.35); color:#c4b5fd; }
.fm-btn i { font-size:13px; }
</style>
