<template>
  <div class="dc" :class="{ empty: !total }">
    <div class="dc-chart">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="46" fill="none" stroke="var(--surface-elevated)" stroke-width="14" />
        <circle v-for="(seg, i) in segs" :key="i" cx="60" cy="60" r="46" fill="none"
          :stroke="seg.color" stroke-width="14" stroke-linecap="round"
          :stroke-dasharray="`${seg.dash} ${289 - seg.dash}`" :stroke-dashoffset="seg.off" />
      </svg>
      <div class="dc-mid">
        <div class="dc-v">{{ centerValue }}</div>
        <div class="dc-l">{{ centerLabel }}</div>
      </div>
    </div>
    <div class="dc-legend">
      <div v-for="(seg, i) in segs" :key="i" class="dc-row">
        <span class="dc-color" :style="{ background: seg.color }"></span>
        <span class="dc-name" :title="seg.label">{{ seg.label }}</span>
        <span class="dc-val">{{ seg.value }}</span>
      </div>
      <div v-if="!total" class="dc-none">No data yet</div>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({
  items: { type: Array, default: () => [] }, // [{ label, value }]
  centerValue: { type: [String, Number], default: '—' },
  centerLabel: { type: String, default: '' },
  colors: { type: Array, default: () => ['#6366f1', '#22d3ee', '#8b5cf6', '#22c55e', '#f59e0b', '#38bdf8', '#a78bfa', '#34d399'] },
})
const total = computed(() => props.items.reduce((s, i) => s + (Number(i.value) || 0), 0))
const segs = computed(() => {
  let off = 0
  return props.items.slice(0, 8).map((it, i) => {
    const v = Number(it.value) || 0
    const dash = total.value ? (v / total.value) * 289 : 0
    const seg = { label: it.label, value: it.value, color: props.colors[i % props.colors.length], dash, off: 289 - off + 72 }
    off += dash
    return seg
  })
})
</script>
<style scoped>
.dc { display:flex; gap:20px; align-items:center; flex-wrap:wrap; }
.dc-chart { position:relative; width:150px; height:150px; flex:none; }
.dc-chart svg { width:100%; height:100%; }
.dc-mid { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.dc-v { font-size:20px; font-weight:750; color:var(--text-1); font-variant-numeric:tabular-nums; }
.dc-l { font-size:10.5px; color:var(--text-3); text-transform:uppercase; letter-spacing:.06em; }
.dc-legend { flex:1; min-width:160px; display:flex; flex-direction:column; gap:8px; }
.dc-row { display:flex; align-items:center; gap:8px; font-size:12.5px; }
.dc-color { width:10px; height:10px; border-radius:3px; flex:none; }
.dc-name { color:var(--text-2); flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.dc-val { color:var(--text-1); font-weight:700; font-variant-numeric:tabular-nums; }
.dc-none { color:var(--text-3); font-size:12.5px; }
</style>
