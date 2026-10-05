<template>
  <div class="sc" :class="{ loading }">
    <template v-if="loading">
      <div class="sc-skel-label"></div>
      <div class="sc-skel-value"></div>
      <div class="sc-skel-sub"></div>
    </template>
    <template v-else>
      <div class="sc-top">
        <span class="sc-label">{{ label }}</span>
        <span v-if="icon" class="sc-icon"><i :class="icon"></i></span>
      </div>
      <div class="sc-value" :title="String(value ?? '')">{{ displayValue }}</div>
      <div class="sc-sub">
        <template v-if="sub">{{ sub }}</template>
        <template v-else-if="change !== null && change !== undefined">
          <span class="sc-change" :class="change > 0 ? 'up' : change < 0 ? 'down' : 'flat'">
            <i :class="change > 0 ? 'fas fa-arrow-trend-up' : change < 0 ? 'fas fa-arrow-trend-down' : 'fas fa-equals'"></i>
            {{ change > 0 ? '+' : '' }}{{ change }}%
          </span>
          <span class="sc-change-note">{{ changeNote || 'vs previous period' }}</span>
        </template>
      </div>
    </template>
  </div>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({
  label: String,
  value: { type: [Number, String], default: null },
  display: { type: String, default: null }, // pre-formatted value
  icon: String,
  change: { type: Number, default: null },
  changeNote: String,
  sub: String,
  loading: Boolean,
})
const displayValue = computed(() => props.display !== null ? props.display : (props.value ?? '—'))
</script>
<style scoped>
.sc { background:var(--surface-secondary); border:1px solid var(--border); border-radius:14px; padding:16px 18px; display:flex; flex-direction:column; gap:6px; min-width:0; }
.sc-top { display:flex; justify-content:space-between; align-items:center; gap:8px; }
.sc-label { font-size:12.5px; font-weight:600; color:var(--text-2); letter-spacing:.01em; }
.sc-icon { color:var(--brand-text); font-size:13px; opacity:.9; }
.sc-value { font-size:26px; font-weight:750; color:var(--text-1); line-height:1.15; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-variant-numeric:tabular-nums; }
.sc-sub { font-size:12px; color:var(--text-3); display:flex; align-items:center; gap:6px; min-height:16px; }
.sc-change { display:inline-flex; align-items:center; gap:4px; font-weight:700; }
.sc-change.up { color:#34d399; } .sc-change.down { color:#f87171; } .sc-change.flat { color:var(--text-3); }
.sc-change-note { color:var(--text-3); }
.sc-skel-label, .sc-skel-value, .sc-skel-sub { border-radius:6px; background:linear-gradient(90deg, var(--surface-secondary) 25%, var(--surface-elevated) 50%, var(--surface-secondary) 75%); background-size:200% 100%; animation:shimmer 1.4s infinite; }
.sc-skel-label { height:12px; width:40%; } .sc-skel-value { height:26px; width:70%; } .sc-skel-sub { height:12px; width:55%; }
@keyframes shimmer { 0% { background-position:200% 0 } 100% { background-position:-200% 0 } }
</style>
