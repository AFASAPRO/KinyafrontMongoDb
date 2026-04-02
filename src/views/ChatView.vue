<template>
  <div class="app-shell" :class="{ 'light-mode': isLightMode }">
    <div v-show="mobileSidebarOpen" class="mob-overlay" @click="mobileSidebarOpen=false"></div>

    <Sidebar
      :mobile-open="mobileSidebarOpen"
      @close-mobile="mobileSidebarOpen=false"
      @new-chat="handleNewChat"
      @load-chat="handleLoadChat"
    />

    <div class="main-col">
      <!-- Top bar -->
      <div class="top-bar">
        <div class="topbar-left">
          <button class="mob-menu-btn" @click="mobileSidebarOpen=true" title="Menu">
            <i class="fas fa-bars"></i>
          </button>
          <button class="topbar-pill active" @click="handleNewChat" title="New Chat (Ctrl+K)">
            <i class="far fa-comment"></i>
            <span>New Chat</span>
          </button>
          <button class="topbar-icon-btn" @click="handleNewChat" title="New Chat">
            <i class="fas fa-plus"></i>
          </button>
          <button class="topbar-icon-btn" title="More options">
            <i class="fas fa-ellipsis"></i>
          </button>
        </div>
        <div class="topbar-right">
          <button class="topbar-pill" @click="rightOpen=!rightOpen" title="Toggle panel">
            <i class="fas fa-sliders"></i>
            <span>Configuration</span>
            <i class="fas fa-magnifying-glass" style="font-size:11px;opacity:.7"></i>
          </button>
          <button class="topbar-pill" @click="handleShare" title="Share current chat">
            <i class="fas fa-share-nodes"></i>
            <span>Share</span>
          </button>
          <div class="user-avatar-btn" @click="showProfile=true" title="Profile">
            <img v-if="auth.user?.avatar_url" :src="auth.user.avatar_url" alt="avatar" />
            <span v-else>{{ auth.user?.username?.[0]?.toUpperCase() }}</span>
          </div>
        </div>
      </div>

      <ChatWindow @toggle-sidebar="mobileSidebarOpen=!mobileSidebarOpen" />
    </div>

    <transition name="slide-r">
      <RightPanel v-if="rightOpen" @load-chat="handleLoadChat" @close="rightOpen=false" />
    </transition>

    <ProfileModal v-if="showProfile" @close="showProfile=false" />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'
import { connectSocket } from '../socket'
import Sidebar from '../components/Sidebar.vue'
import ChatWindow from '../components/ChatWindow.vue'
import RightPanel from '../components/RightPanel.vue'
import ProfileModal from '../components/ProfileModal.vue'

const auth = useAuthStore()
const chatStore = useChatStore()
const mobileSidebarOpen = ref(false)
const rightOpen = ref(window.innerWidth > 1200)
const showProfile = ref(false)

const isLightMode = computed(() => document.documentElement.classList.contains('light-mode'))

onMounted(async () => {
  // Connect socket
  if (auth.token) {
    connectSocket(auth.token)
    chatStore.setupSocketListeners()
  }

  await Promise.all([chatStore.fetchChats(), chatStore.fetchStats()])
  if (chatStore.chats.length) await chatStore.loadChat(chatStore.chats[0].id)

  window.addEventListener('keydown', handleGlobalKeys)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeys)
})

function handleGlobalKeys(e) {
  const ctrl = e.ctrlKey || e.metaKey
  if (ctrl && e.key === 'k') { e.preventDefault(); handleNewChat() }
  if (ctrl && e.key === 'b') { e.preventDefault(); mobileSidebarOpen.value = !mobileSidebarOpen.value }
}

async function handleNewChat() {
  await chatStore.createChat()
  mobileSidebarOpen.value = false
}

async function handleLoadChat(id) {
  await chatStore.loadChat(id)
  mobileSidebarOpen.value = false
}

async function handleShare() {
  const chat = chatStore.activeChat
  if (!chat) return
  const text = `Check out this KinyaBot conversation: "${chat.title}"`
  if (navigator.share) {
    await navigator.share({ title: 'KinyaBot AI Chat', text }).catch(() => {})
  } else {
    await navigator.clipboard.writeText(text).catch(() => {})
    alert('Chat title copied to clipboard!')
  }
}
</script>

<style scoped>
.app-shell { display:flex; height:100vh; width:100vw; background:var(--bg-base); overflow:hidden; }
.mob-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); z-index:40; backdrop-filter:blur(3px); }

.main-col { flex:1; min-width:0; display:flex; flex-direction:column; overflow:hidden; background:var(--bg-base); }

.top-bar {
  display:flex; align-items:center; justify-content:space-between;
  padding:0 12px; height:52px; flex-shrink:0;
  background:var(--bg-base); border-bottom:1px solid var(--border);
}
.topbar-left,.topbar-right { display:flex; align-items:center; gap:6px; }

.mob-menu-btn { width:36px; height:36px; background:none; border:none; border-radius:var(--r-sm); color:var(--text-2); font-size:15px; align-items:center; justify-content:center; transition:all .2s; cursor:pointer; display:none; }
.mob-menu-btn:hover { background:var(--bg-hover); color:var(--text-1); }

.topbar-pill { display:flex; align-items:center; gap:6px; padding:7px 14px; background:var(--bg-card); border:1px solid var(--border-md); border-radius:99px; color:var(--text-2); font-size:13px; font-weight:500; cursor:pointer; transition:all .2s; }
.topbar-pill:hover { background:var(--bg-hover); color:var(--text-1); }
.topbar-pill.active { color:var(--text-1); }
.topbar-pill i { font-size:13px; }

.topbar-icon-btn { width:32px; height:32px; background:none; border:none; border-radius:50%; color:var(--text-2); font-size:14px; display:flex; align-items:center; justify-content:center; transition:all .2s; cursor:pointer; }
.topbar-icon-btn:hover { background:var(--bg-hover); color:var(--text-1); }

.user-avatar-btn { width:34px; height:34px; border-radius:50%; background:linear-gradient(135deg,#4f46e5,#a855f7); display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:white; cursor:pointer; overflow:hidden; flex-shrink:0; border:2px solid var(--border-md); transition:opacity .2s; }
.user-avatar-btn:hover { opacity:.85; }
.user-avatar-btn img { width:100%; height:100%; object-fit:cover; }

@media(max-width:860px) {
  .mob-menu-btn { display:flex; }
  .topbar-pill span { display:none; }
  .topbar-pill { padding:7px 10px; }
}
@media(max-width:480px) {
  .top-bar { padding:0 8px; height:48px; }
  .topbar-right { gap:4px; }
}
</style>
