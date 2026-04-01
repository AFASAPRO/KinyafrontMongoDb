<template>
  <div v-if="variant==='model'" class="model-card" :class="{active}" @click="$emit('click')">
    <div class="model-icon"><i class="fas fa-bolt"></i></div>
    <span class="model-name">{{ chat.title }}</span>
    <button class="more-btn" @click.stop="menuOpen=!menuOpen"><i class="fas fa-ellipsis"></i></button>
    <div v-if="menuOpen" class="ctx-menu" @click.stop>
      <button @click="$emit('rename');menuOpen=false"><i class="fas fa-pen"></i> Rename</button>
      <button @click="$emit('pin');menuOpen=false"><i class="fas fa-thumbtack"></i> Unpin</button>
      <button class="danger" @click="$emit('delete');menuOpen=false"><i class="fas fa-trash"></i> Delete</button>
    </div>
  </div>
  <div v-else class="chat-row" :class="{active}" @click="$emit('click')">
    <div class="chat-row-info">
      <div class="chat-row-title">{{ chat.title }}</div>
      <div class="chat-row-time">{{ relTime }}</div>
    </div>
    <div class="chat-row-right" @click.stop>
      <button class="more-btn" @click="menuOpen=!menuOpen"><i class="fas fa-ellipsis"></i></button>
      <div class="row-radio" :class="{checked:active}"></div>
      <div v-if="menuOpen" class="ctx-menu right">
        <button @click="$emit('pin');menuOpen=false"><i class="fas fa-thumbtack"></i> Pin</button>
        <button @click="$emit('rename');menuOpen=false"><i class="fas fa-pen"></i> Rename</button>
        <button class="danger" @click="$emit('delete');menuOpen=false"><i class="fas fa-trash"></i> Delete</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({ chat: Object, active: Boolean, variant: { type: String, default: 'default' } })
defineEmits(['click','rename','pin','delete'])

const menuOpen = ref(false)

const relTime = computed(() => {
  const d = new Date(props.chat.updated_at || props.chat.created_at)
  const diff = Date.now() - d.getTime()
  const m = Math.floor(diff/60000), h = Math.floor(diff/3600000), day = Math.floor(diff/86400000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (h < 24) return `${h}h ago`
  if (day < 7) return `${day}d ago`
  return d.toLocaleDateString()
})

function close(e) { if (menuOpen.value) menuOpen.value = false }
onMounted(() => document.addEventListener('click', close))
onBeforeUnmount(() => document.removeEventListener('click', close))
</script>

<style scoped>
.model-card { display:flex;align-items:center;gap:9px;margin:2px 0;padding:8px 10px;border-radius:var(--r);background:var(--bg-card);border:1px solid var(--border);cursor:pointer;transition:all .2s;position:relative }
.model-card:hover { background:var(--bg-hover);border-color:var(--border-md) }
.model-card.active { background:linear-gradient(135deg,rgba(79,70,229,.22),rgba(168,85,247,.14));border-color:rgba(109,40,217,.42) }
.model-icon { width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,#4f46e5,#a855f7);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;flex-shrink:0 }
.model-name { font-size:13px;font-weight:600;color:var(--text-1);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis }

.chat-row { display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:var(--r-sm);cursor:pointer;transition:background .15s;position:relative }
.chat-row:hover { background:var(--bg-hover) }
.chat-row.active { background:rgba(79,70,229,.1) }
.chat-row-info { flex:1;min-width:0 }
.chat-row-title { font-size:13px;color:var(--text-1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis }
.chat-row-time { font-size:11px;color:var(--text-3);margin-top:1px }
.chat-row-right { display:flex;align-items:center;gap:4px;flex-shrink:0 }
.row-radio { width:16px;height:16px;border-radius:50%;border:1.5px solid var(--border-md);transition:all .2s }
.row-radio.checked { border-color:#6d28d9;background:#6d28d9 }

.more-btn { background:none;border:none;color:var(--text-3);font-size:13px;padding:3px 5px;border-radius:5px;cursor:pointer;opacity:0;transition:opacity .15s }
.model-card:hover .more-btn,.chat-row:hover .more-btn { opacity:1 }

.ctx-menu { position:absolute;top:100%;left:0;z-index:100;background:var(--bg-card);border:1px solid var(--border-md);border-radius:var(--r-sm);box-shadow:0 8px 24px rgba(0,0,0,.4);min-width:140px;overflow:hidden;animation:fadeUp .15s ease }
.ctx-menu.right { left:auto;right:0 }
.ctx-menu button { display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;background:none;border:none;color:var(--text-1);font-size:12.5px;text-align:left;cursor:pointer;transition:background .15s }
.ctx-menu button:hover { background:var(--bg-hover) }
.ctx-menu button.danger { color:var(--red) }
.ctx-menu button i { font-size:12px;width:14px }
</style>
