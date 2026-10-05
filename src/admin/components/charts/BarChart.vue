<template>
  <div class="bc">
    <div v-if="!points.length" class="bc-empty">No data for this range yet.</div>
    <div v-else class="bc-plot" :style="{ height: height + 'px' }">
      <div class="bc-yaxis">
        <span v-for="y in yLabels" :key="y.label" :style="{ bottom: y.pct + '%' }">{{ y.label }}</span>
      </div>
      <div class="bc-area">
        <div class="bc-grid"><div v-for="i in 4" :key="i" class="bc-gridline" :style="{ top: (i - 1) * 25 + '%' }"></div></div>
        <div class="bc-cols">
          <div v-for="(p, i) in points" :key="i" class="bc-col" :title="`${p.label}: ${p.value}`">
            <div class="bc-bar" :style="{ height: Math.max(barPct(p.value), 2) + '%', background: p.color || color }"></div>
            <span class="bc-lbl" v-if="showLabel(i)">{{ p.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({
  points: { type: Array, default: () => [] }, // [{ label, value, color? }]
  color: { type: String, default: 'var(--brand)' },
  height: { type: Number, default: 180 },
  yFormat: { type: Function, default: (v) => String(v) },
  maxLabels: { type: Number, default: 8 },
})
const maxVal = computed(() => Math.max(...props.points.map(p => Number(p.value) || 0), 1))
function barPct(v) { return ((Number(v) || 0) / maxVal.value) * 92 }
const yLabels = computed(() => {
  const max = maxVal.value
  return [1, .75, .5, .25].map(f => ({ label: props.yFormat(Math.round(max * f)), pct: (1 - f) * 100 }))
    .concat([{ label: '0', pct: 100 }])
})
function showLabel(i) {
  if (props.points.length <= props.maxLabels) return true
  const step = Math.ceil(props.points.length / props.maxLabels)
  return i % step === 0
}
</script>
<style scoped>
.bc-plot { position:relative; padding-left:44px; }
.bc-yaxis { position:absolute; left:0; top:0; bottom:22px; width:40px; }
.bc-yaxis span { position:absolute; right:8px; transform:translateY(50%); font-size:10px; color:var(--text-3); font-variant-numeric:tabular-nums; }
.bc-area { position:relative; height:100%; }
.bc-grid { position:absolute; top:0; left:0; right:0; bottom:22px; }
.bc-gridline { position:absolute; left:0; right:0; border-top:1px dashed var(--border); }
.bc-cols { position:absolute; top:0; left:0; right:0; bottom:22px; display:flex; align-items:flex-end; gap:2px; }
.bc-col { flex:1; height:100%; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; position:relative; min-width:0; }
.bc-bar { width:70%; max-width:26px; border-radius:4px 4px 0 0; transition:height .5s cubic-bezier(.22,1,.36,1); }
.bc-lbl { position:absolute; bottom:-20px; font-size:10px; color:var(--text-3); white-space:nowrap; }
.bc-empty { height:160px; display:flex; align-items:center; justify-content:center; color:var(--text-3); font-size:13px; }
</style>
