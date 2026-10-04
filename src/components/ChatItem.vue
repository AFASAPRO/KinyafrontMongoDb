<template>
  <div class="chat-item" :class="{ active }" @click="$emit('click')">
    <div class="chat-icon">
      <i class="fas fa-comment"></i>
    </div>
    <div class="chat-info">
      <div class="chat-title">{{ chat.title }}</div>
      <div class="chat-meta">
        <span>{{ relativeTime }}</span>
        <span v-if="chat.message_count" class="msg-count">{{ chat.message_count }} msgs</span>
      </div>
    </div>
    <div class="chat-actions" @click.stop>
      <button class="action-btn" @click="$emit('pin')" :title="chat.is_pinned ? 'Unpin' : 'Pin'">
        <i class="fas fa-thumbtack" :class="{ 'pinned': chat.is_pinned }"></i>
      </button>
      <button class="action-btn" @click="$emit('rename')" title="Rename"><i class="fas fa-pen"></i></button>
      <button class="action-btn danger" @click="$emit('delete')" title="Delete"><i class="fas fa-trash"></i></button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ chat: Object, active: Boolean })
defineEmits(['click', 'rename', 'pin', 'delete'])

const relativeTime = computed(() => {
  const d = new Date(props.chat.updated_at || props.chat.created_at)
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60000)
  const hrs = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hrs < 24) return `${hrs}h ago`
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString()
})
</script>

<style scoped>
.chat-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  position: relative;
  animation: slideInLeft 0.3s ease-out both;
}
.chat-item:hover {
  background: var(--surface2);
  border-color: var(--border);
}
.chat-item.active {
  background: rgba(99,102,241,0.12);
  border-color: rgba(99,102,241,0.25);
}

.chat-icon {
  width: 30px; height: 30px; border-radius: 8px;
  background: var(--surface2);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; color: var(--primary); flex-shrink: 0;
}
.chat-item.active .chat-icon { background: rgba(99,102,241,0.2); }

.chat-info { flex: 1; min-width: 0; }
.chat-title { font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text); }
.chat-meta { display: flex; align-items: center; gap: 6px; margin-top: 2px; }
.chat-meta span { font-size: 0.72rem; color: var(--text3); }
.msg-count { background: rgba(99,102,241,0.15); color: var(--primary); padding: 1px 5px; border-radius: 99px; font-size: 0.68rem !important; }

.chat-actions {
  display: flex;
  gap: 3px;
  opacity: 0;
  transition: opacity 0.2s;
  flex-shrink: 0;
}
.chat-item:hover .chat-actions { opacity: 1; }

.action-btn {
  width: 24px; height: 24px;
  background: none; border: none;
  border-radius: 5px; color: var(--text3);
  font-size: 0.72rem; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; cursor: pointer;
}
.action-btn:hover { background: var(--surface3); color: var(--text); }
.action-btn.danger:hover { background: rgba(239,68,68,0.15); color: var(--danger); }
.action-btn .pinned { color: var(--warning); }
</style>

