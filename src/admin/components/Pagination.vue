<template>
  <div class="pg" v-if="pages > 1">
    <button :disabled="page <= 1" @click="$emit('change', page - 1)" aria-label="Previous page"><i class="fas fa-chevron-left"></i></button>
    <span class="pg-info">Page {{ page }} / {{ pages }}</span>
    <button :disabled="page >= pages" @click="$emit('change', page + 1)" aria-label="Next page"><i class="fas fa-chevron-right"></i></button>
  </div>
</template>
<script setup>
defineProps({ page: Number, pages: { type: Number, default: 1 } })
defineEmits(['change'])
</script>
<style scoped>
.pg { display:flex; align-items:center; justify-content:center; gap:12px; padding:14px 0 4px; }
.pg button { width:34px; height:34px; border-radius:10px; border:1px solid var(--border); background:var(--surface-secondary); color:var(--text-1); cursor:pointer; font-size:12px; }
.pg button:disabled { opacity:.35; cursor:default; }
.pg button:not(:disabled):hover { border-color:var(--brand); color:var(--brand-text); }
.pg-info { font-size:12.5px; color:var(--text-3); font-variant-numeric:tabular-nums; }
</style>
