<template>
  <div class="chat-row" :class="{ active, pinned: variant==='model' }" role="button" tabindex="0"
       :title="chat.title" @click="$emit('click')" @keydown.enter.self="$emit('click')">
    <AnimatedIcon v-if="variant==='model'" icon="fas fa-thumbtack" class="pin-ico" animation="bounce" :active="pinJustChanged" />
    <span class="chat-row-title">{{ chat.title }}</span>
    <button class="more-btn" :class="{ open: menuOpen }" aria-label="Chat options" aria-haspopup="menu"
            :aria-expanded="menuOpen" @click.stop="menuOpen=!menuOpen">
      <AnimatedIcon icon="fas fa-ellipsis" animation="subtle-hover" />
    </button>
    <div v-if="menuOpen" class="ctx-menu" role="menu" @click.stop>
      <button role="menuitem" @click="$emit('pin');menuOpen=false">
        <AnimatedIcon icon="fas fa-thumbtack" animation="subtle-hover" /> {{ variant==='model' ? 'Unpin' : 'Pin' }}
      </button>
      <button role="menuitem" @click="$emit('rename');menuOpen=false"><AnimatedIcon icon="fas fa-pen" animation="subtle-hover" /> Rename</button>
      <button role="menuitem" class="danger" @click="$emit('delete');menuOpen=false"><AnimatedIcon icon="fas fa-trash" animation="subtle-hover" /> Delete</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import AnimatedIcon from './AnimatedIcon.vue'

defineProps({
  chat: Object,
  active: Boolean,
  pinJustChanged: { type: Boolean, default: false },
  variant: { type: String, default: 'default' }
})
defineEmits(['click','rename','pin','delete'])

const menuOpen = ref(false)
function close() { if (menuOpen.value) menuOpen.value = false }
onMounted(() => document.addEventListener('click', close))
onBeforeUnmount(() => document.removeEventListener('click', close))
</script>

<style scoped>
.chat-row { position:relative; display:flex; align-items:center; gap:8px; min-height:38px; padding:0 4px 0 12px; border-radius:var(--r); cursor:pointer; color:var(--text-2); transition:background var(--t-fast), color var(--t-fast); }
.chat-row:hover { background:var(--bg-hover); color:var(--text-1); }
.chat-row.active { background:var(--bg-hover); color:var(--text-1); box-shadow:inset 2px 0 0 var(--brand); }
.chat-row:focus-visible { outline:2px solid var(--brand-hover); outline-offset:-2px; }
.pin-ico { font-size:10.5px; color:var(--text-3); flex-shrink:0; transform:rotate(35deg); }
.chat-row-title { flex:1; min-width:0; font-size:14.5px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.more-btn { width:30px; height:30px; display:grid; place-items:center; flex-shrink:0; background:none; border:none; border-radius:var(--r-sm); color:var(--text-3); font-size:13px; cursor:pointer; opacity:0; transition:opacity var(--t-fast), background var(--t-fast), color var(--t-fast); }
.chat-row:hover .more-btn, .chat-row:focus-within .more-btn, .chat-row.active .more-btn, .more-btn.open, .more-btn:focus-visible { opacity:1; }
.more-btn:hover, .more-btn.open { background:var(--bg-active); color:var(--text-1); }
@media (hover: none) { .more-btn { opacity:1; } }

.ctx-menu { position:absolute; top:calc(100% - 2px); right:4px; z-index:30; min-width:160px; padding:4px; background:var(--surface-elevated); border:1px solid var(--border); border-radius:var(--r); box-shadow:var(--shadow-md); animation:fadeIn var(--t-fast) ease; }
.ctx-menu button { display:flex; align-items:center; gap:10px; width:100%; padding:8px 10px; background:none; border:none; border-radius:var(--r-sm); color:var(--text-1); font-size:13.5px; text-align:left; cursor:pointer; transition:background var(--t-fast); }
.ctx-menu button:hover { background:var(--bg-hover); }
.ctx-menu button.danger:hover { color:var(--error); }
.ctx-menu button i { font-size:12px; width:14px; text-align:center; color:var(--icon); }
.ctx-menu button.danger:hover i { color:var(--error); }
</style>
