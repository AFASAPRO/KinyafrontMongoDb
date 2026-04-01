<template>
  <aside class="right-panel">
    <!-- Top action row -->
    <div class="rp-header">
      <button class="rp-icon-btn" @click="$emit('close')" title="Close panel">
        <i class="fas fa-xmark"></i>
      </button>
      <button class="rp-icon-btn" @click="handleExport" title="Export chat">
        <i class="fas fa-file-export"></i>
      </button>
      <button class="rp-icon-btn" @click="handleShare" title="Share">
        <i class="fas fa-share-nodes"></i>
      </button>
      <button class="new-chat-pill" @click="handleNewChat">
        <i class="fas fa-plus"></i>
        <span>New Chat</span>
        <i class="fas fa-wand-magic-sparkles" style="font-size:11px;opacity:.7"></i>
      </button>
    </div>

    <!-- Search chats -->
    <div class="rp-search">
      <div class="search-box">
        <i class="fas fa-magnifying-glass"></i>
        <input v-model="searchQ" type="text" placeholder="Search chats…" @input="doSearch" />
        <button class="filter-btn" title="Filter"><i class="fas fa-sliders"></i> IF</button>
      </div>
    </div>

    <!-- Saved topic section -->
    <div class="rp-section">
      <div class="rp-section-header">
        <i class="fas fa-bookmark" style="color:var(--text-2)"></i>
        <span>Saved topic</span>
        <button class="rp-icon-btn-sm" style="margin-left:auto"><i class="fas fa-ellipsis"></i></button>
      </div>

      <!-- Starred chats as saved topics -->
      <div v-for="chat in chatStore.pinnedChats.slice(0,2)" :key="'saved-'+chat.id"
        class="rp-chat-row" @click="$emit('load-chat', chat.id)">
        <div class="rp-row-info">
          <div class="rp-row-title">{{ chat.title }}</div>
          <div class="rp-row-time">{{ relTime(chat.updated_at) }}</div>
        </div>
        <i class="fas fa-star" style="color:#fbbc04;font-size:13px;flex-shrink:0"></i>
      </div>

      <div v-if="!chatStore.pinnedChats.length" class="rp-empty">
        <i class="fas fa-star"></i>
        <span>No saved chats</span>
      </div>
    </div>

    <!-- Recent chats section -->
    <div class="rp-section rp-scroll">
      <div class="rp-section-header">
        <i class="fas fa-clock-rotate-left" style="color:var(--text-2)"></i>
        <span>Recent Chats</span>
        <button class="rp-icon-btn-sm" style="margin-left:auto"><i class="fas fa-ellipsis"></i></button>
      </div>

      <div
        v-for="chat in displayChats"
        :key="chat.id"
        class="rp-chat-row"
        :class="{active: chatStore.activeChat?.id === chat.id}"
        @click="$emit('load-chat', chat.id)"
      >
        <div class="rp-row-info">
          <div class="rp-row-title">{{ chat.title }}</div>
          <div class="rp-row-time">{{ relTime(chat.updated_at) }}</div>
        </div>
        <div class="rp-radio" :class="{checked: chatStore.activeChat?.id === chat.id}"></div>
      </div>

      <div v-if="!chatStore.recentChats.length" class="rp-empty">
        <i class="fas fa-comments"></i>
        <span>No conversations yet</span>
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useChatStore } from '../stores/chat'

const emit = defineEmits(['load-chat', 'close'])
const chatStore = useChatStore()

const searchQ = ref('')

let searchTimer = null
function doSearch() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => chatStore.searchMessages(searchQ.value), 300)
}

async function handleNewChat() {
  await chatStore.createChat()
  emit('close')
}

async function handleExport() {
  const chat = chatStore.activeChat
  if (!chat) { alert('No active chat to export.'); return }
  const msgs = chatStore.messages.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join('\n\n')
  const text = `# ${chat.title}\nExported: ${new Date().toLocaleString()}\n\n${msgs}`
  const blob = new Blob([text], { type: 'text/plain' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${chat.title.replace(/[^a-z0-9]/gi, '-')}.txt`
  a.click()
}

async function handleShare() {
  const chat = chatStore.activeChat
  const text = chat ? `Check out my KinyaBot conversation: "${chat.title}"` : 'Check out KinyaBot AI!'
  if (navigator.share) {
    await navigator.share({ title: 'KinyaBot AI', text }).catch(() => {})
  } else {
    await navigator.clipboard.writeText(text).catch(() => {})
  }
}

const displayChats = computed(() => {
  if (searchQ.value && chatStore.searchResults.length) {
    return chatStore.searchResults.map(r => ({ id: r.chat_id, title: r.chat_title, updated_at: r.created_at }))
  }
  return chatStore.recentChats.slice(0, 20)
})

function relTime(date) {
  if (!date) return ''
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), d = Math.floor(diff/86400000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `Edited ${h}h ago`
  return `Edited ${d}d ago`
}
</script>

<style scoped>
.right-panel {
  width: var(--right-w);
  min-width: var(--right-w);
  height: 100vh;
  background: var(--bg-panel);
  border-left: 1px solid var(--border);
  display: flex; flex-direction: column;
  overflow: hidden; flex-shrink: 0;
  animation: fadeInRight .25s ease;
}

@media (max-width: 1100px) {
  .right-panel {
    position: fixed; right: 0; top: 0; z-index: 50;
    box-shadow: -4px 0 20px rgba(0,0,0,.4);
  }
}

/* Header */
.rp-header {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 10px;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.rp-icon-btn {
  width: 30px; height: 30px; border-radius: 7px;
  background: none; border: none;
  color: var(--text-2); font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all .2s;
}
.rp-icon-btn:hover { background: var(--bg-hover); color: var(--text-1); }
.new-chat-pill {
  margin-left: auto; display: flex; align-items: center; gap: 6px;
  padding: 6px 13px;
  background: var(--bg-card); border: 1px solid var(--border-md);
  border-radius: 99px; color: var(--text-1); font-size: 12.5px; font-weight: 500;
  cursor: pointer; transition: all .2s; white-space: nowrap;
}
.new-chat-pill:hover { background: var(--bg-hover); }

/* Search */
.rp-search { padding: 8px 10px; flex-shrink: 0; }
.search-box {
  display: flex; align-items: center; gap: 7px;
  background: var(--bg-card); border: 1px solid var(--border-md);
  border-radius: 99px; padding: 7px 10px;
}
.search-box i:first-child { color: var(--text-3); font-size: 12px; }
.search-box input { flex:1; background:none; border:none; color:var(--text-1); font-size:12.5px; }
.search-box input::placeholder { color:var(--text-3); }
.filter-btn { background: none; border: none; color: var(--text-3); font-size: 11px; cursor: pointer; white-space: nowrap; padding: 2px 4px; }
.filter-btn:hover { color: var(--text-1); }

/* Section */
.rp-section { padding: 4px 6px; flex-shrink: 0; }
.rp-scroll { flex: 1; overflow-y: auto; }
.rp-section-header {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 6px 5px; font-size: 13px; font-weight: 600; color: var(--text-1);
}
.rp-icon-btn-sm { background:none; border:none; color:var(--text-3); font-size:12px; cursor:pointer; padding:3px 5px; border-radius:5px; transition:background .15s; }
.rp-icon-btn-sm:hover { background:var(--bg-hover); }

.rp-chat-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 8px; border-radius: var(--r-sm);
  cursor: pointer; transition: background .15s;
  gap: 8px;
}
.rp-chat-row:hover { background: var(--bg-hover); }
.rp-chat-row.active { background: rgba(79,70,229,.1); }
.rp-row-info { flex: 1; min-width: 0; }
.rp-row-title { font-size: 12.5px; color: var(--text-1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rp-row-time { font-size: 11px; color: var(--text-3); margin-top: 1px; }
.rp-radio { width: 16px; height: 16px; border-radius: 50%; border: 1.5px solid var(--border-md); flex-shrink: 0; transition: all .2s; }
.rp-radio.checked { border-color: #6d28d9; background: #6d28d9; }

.rp-empty {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 8px; color: var(--text-3); font-size: 12px;
}
</style>
