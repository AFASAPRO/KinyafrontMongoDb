<template>
  <div class="es" :style="{ padding: compact ? '28px 16px' : '56px 20px' }">
    <div class="es-icon"><i :class="icon"></i></div>
    <div class="es-title">{{ title }}</div>
    <p v-if="hint" class="es-hint">{{ hint }}</p>
    <slot />
  </div>
</template>
<script setup>
defineProps({
  title: { type: String, required: true },
  hint: String,
  icon: { type: String, default: 'fas fa-inbox' },
  compact: Boolean,
})
</script>
<style scoped>
.es { text-align:center; display:flex; flex-direction:column; align-items:center; gap:8px; color:var(--text-2); }
.es-icon { width:52px; height:52px; border-radius:14px; background:var(--surface-secondary); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-size:20px; color:var(--text-3); }
.es-title { font-weight:600; font-size:14.5px; color:var(--text-1); }
.es-hint { margin:0; font-size:12.5px; color:var(--text-3); max-width:380px; }
</style>
