<template>
  <div class="toast-host" aria-live="polite">
    <transition-group name="tt">
      <div v-for="t in toasts" :key="t.id" class="tt" :class="t.kind">
        <i :class="t.kind === 'success' ? 'fas fa-circle-check' : t.kind === 'info' ? 'fas fa-circle-info' : 'fas fa-circle-exclamation'"></i>
        <span>{{ t.message }}</span>
      </div>
    </transition-group>
  </div>
</template>
<script setup>
import { useToast } from '../composables/useToast'
const { toasts } = useToast()
</script>
<style scoped>
.toast-host { position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:120; display:flex; flex-direction:column; gap:8px; align-items:center; pointer-events:none; }
.tt { display:flex; gap:9px; align-items:center; background:var(--surface-elevated); border:1px solid var(--border); color:var(--text-1); border-radius:12px; padding:11px 16px; font-size:13.5px; font-weight:600; box-shadow:0 10px 30px rgba(0,0,0,.4); }
.tt i { font-size:15px; }
.tt.success i { color:#34d399; } .tt.error i { color:#f87171; } .tt.info i { color:#67e8f9; }
.tt-enter-active, .tt-leave-active { transition:all .25s ease; }
.tt-enter-from, .tt-leave-to { opacity:0; transform:translateY(8px); }
</style>
