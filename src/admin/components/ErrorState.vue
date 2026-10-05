<template>
  <div class="err" role="alert">
    <div class="err-icon"><i class="fas fa-triangle-exclamation"></i></div>
    <div class="err-body">
      <div class="err-title">Couldn't load this data</div>
      <div class="err-msg">{{ message }}</div>
      <div v-if="statusCode" class="err-code">HTTP {{ statusCode }}</div>
    </div>
    <button class="err-retry" @click="$emit('retry')"><i class="fas fa-rotate-right"></i> Retry</button>
  </div>
</template>
<script setup>
defineProps({
  message: { type: String, default: 'Something went wrong.' },
  statusCode: { type: [Number, String], default: null },
})
defineEmits(['retry'])
</script>
<style scoped>
.err { display:flex; align-items:center; gap:14px; background:rgba(239,68,68,.07); border:1px solid rgba(239,68,68,.25); border-radius:14px; padding:16px 18px; flex-wrap:wrap; }
.err-icon { width:40px; height:40px; border-radius:12px; background:rgba(239,68,68,.15); color:#f87171; display:flex; align-items:center; justify-content:center; font-size:16px; flex:none; }
.err-body { flex:1; min-width:180px; }
.err-title { font-weight:700; color:var(--text-1); font-size:14px; }
.err-msg { font-size:12.5px; color:var(--text-2); margin-top:2px; }
.err-code { font-size:11px; color:var(--text-3); margin-top:2px; font-family:ui-monospace,monospace; }
.err-retry { border:1px solid var(--border); background:var(--surface-elevated); color:var(--text-1); border-radius:10px; padding:8px 14px; font-weight:600; font-size:13px; cursor:pointer; display:inline-flex; gap:6px; align-items:center; }
.err-retry:hover { border-color:var(--brand); color:var(--brand-text); }
</style>
