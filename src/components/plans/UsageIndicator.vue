<template>
  <div class="usage-ind" :class="[`ui-${state}`, { compact }]">
    <div class="ui-head" v-if="!compact">
      <span class="ui-label">{{ label }}</span>
      <span class="ui-count"><b>{{ used }}</b> / {{ limit }}</span>
    </div>
    <div class="ui-head" v-else>
      <span class="ui-count"><b>{{ used }}</b>/{{ limit }}</span>
      <span class="ui-pct">{{ percent }}%</span>
    </div>
    <div
      class="ui-bar"
      role="progressbar"
      :aria-valuenow="percent"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-label="`${planName} plan: ${used} of ${limit} chats used today`"
    >
      <i :style="{ width: percent + '%' }"></i>
    </div>
    <div class="ui-foot" v-if="showNote">
      <span v-if="state === 'limit'" class="ui-note limit">Daily limit reached — resets tomorrow</span>
      <span v-else-if="state === 'warning'" class="ui-note warn">{{ remaining}} chats left today</span>
      <span v-else class="ui-note">{{ remaining }} chats remaining</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  used: { type: Number, default: 0 },
  limit: { type: Number, default: 50 },
  planName: { type: String, default: 'Free' },
  compact: { type: Boolean, default: false },  // sidebar-style (shows 32/50 + %)
  showNote: { type: Boolean, default: true },
})

const percent = computed(() => (props.limit ? Math.min(100, Math.round((props.used / props.limit) * 100)) : 0))
const remaining = computed(() => Math.max(0, props.limit - props.used))
const state = computed(() => {
  if (props.limit && props.used >= props.limit) return 'limit'
  if (percent.value >= 80) return 'warning'
  return 'normal'
})
const label = computed(() => `${props.planName} plan · chats today`)
</script>

<style scoped>
.usage-ind { width: 100%; }
.ui-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.ui-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .12em; color: var(--text-3); }
.ui-count { font-size: 12.5px; color: var(--text-2); font-variant-numeric: tabular-nums; }
.ui-count b { color: var(--text-1); font-size: 13.5px; font-weight: 700; }
.ui-pct { font-size: 11px; color: var(--text-3); font-variant-numeric: tabular-nums; }

.ui-bar {
  height: 5px; border-radius: 99px; margin-top: 7px;
  background: var(--border); overflow: hidden; position: relative;
}
.ui-bar i {
  display: block; height: 100%; border-radius: inherit;
  background: var(--gradient-brand);
  transition: width var(--t-slow) var(--ease);
}

/* Warning state — running low (§6) */
.ui-warning .ui-bar i { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.ui-warning .ui-count b { color: var(--warning); }

/* Limit state — reached (§6) */
.ui-limit .ui-bar i { background: linear-gradient(90deg, #ef4444, #f87171); }
.ui-limit .ui-count b { color: var(--error); }

.ui-foot { margin-top: 6px; }
.ui-note { font-size: 11px; color: var(--text-3); }
.ui-note.warn { color: var(--warning); }
.ui-note.limit { color: var(--error); font-weight: 600; }
</style>
