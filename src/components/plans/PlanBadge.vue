<template>
  <span class="plan-badge" :class="[`pb-${plan}`, { sm, lg }]">
    <i v-if="!sm" class="fas" :class="icon"></i>
    <span class="pb-label">{{ label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  plan: { type: String, default: 'free' },   // free | plus | pro
  size: { type: String, default: 'md' },     // sm | md | lg
})

const label = computed(() => (props.plan || 'free').toUpperCase())
const icon = computed(() => ({ free: 'fas fa-feather', plus: 'fas fa-bolt', pro: 'fas fa-gem' }[props.plan] || 'fas fa-feather'))
const sm = computed(() => props.size === 'sm')
const lg = computed(() => props.size === 'lg')
</script>

<style scoped>
.plan-badge {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 3px 10px; border-radius: 99px;
  font-size: 10.5px; font-weight: 800; letter-spacing: .1em;
  border: 1px solid transparent; white-space: nowrap; line-height: 1.5;
}
.plan-badge.sm { padding: 2px 8px; font-size: 9px; gap: 4px; }
.plan-badge.lg { padding: 5px 14px; font-size: 12px; }

.pb-free {
  color: var(--text-2);
  background: var(--surface-secondary);
  border-color: var(--border-strong);
}
.pb-plus {
  color: #22d3ee;
  background: rgba(34, 211, 238, .1);
  border-color: rgba(34, 211, 238, .3);
}
.pb-pro {
  color: #c4b5fd;
  background: linear-gradient(135deg, rgba(99,102,241,.18), rgba(139,92,246,.14));
  border-color: rgba(139, 92, 246, .38);
}
.pb-pro i { background: var(--gradient-brand); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.light-mode .pb-pro { color: #6d28d9; }
</style>
