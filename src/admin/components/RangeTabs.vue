<template>
  <div class="rt" role="tablist" aria-label="Time range">
    <button v-for="opt in options" :key="opt.value" role="tab"
      class="rt-btn" :class="{ active: modelValue === opt.value }"
      :aria-selected="modelValue === opt.value"
      @click="$emit('update:modelValue', opt.value)">{{ opt.label }}</button>
  </div>
</template>
<script setup>
defineProps({
  modelValue: { type: String, default: '7d' },
  options: { type: Array, default: () => [
    { value: '24h', label: '24h' }, { value: '7d', label: '7d' },
    { value: '30d', label: '30d' }, { value: '90d', label: '90d' },
  ] },
})
defineEmits(['update:modelValue'])
</script>
<style scoped>
.rt { display:inline-flex; background:var(--surface-secondary); border:1px solid var(--border); border-radius:10px; padding:3px; gap:2px; }
.rt-btn { border:0; background:transparent; color:var(--text-2); font-size:12px; font-weight:600; padding:6px 12px; border-radius:8px; cursor:pointer; }
.rt-btn.active { background:var(--brand); color:#fff; }
.rt-btn:not(.active):hover { color:var(--text-1); }
</style>
