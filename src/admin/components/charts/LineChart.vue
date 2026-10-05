<template>
  <div class="lc">
    <div v-if="!hasData" class="lc-empty">No data for this range yet.</div>
    <div v-else class="lc-plot" :style="{ height: height + 'px' }">
      <div class="lc-yaxis">
        <span v-for="y in yLabels" :key="y.label" :style="{ bottom: y.pct + '%' }">{{ y.label }}</span>
      </div>
      <div class="lc-canvas">
        <div class="lc-grid"><div v-for="i in 4" :key="i" class="lc-gridline" :style="{ top: (i - 1) * 25 + '%' }"></div></div>
        <svg :viewBox="`0 0 ${W} ${H}`" preserveAspectRatio="none">
          <defs>
            <linearGradient v-for="(s, i) in series" :key="i" :id="`lcg-${uid}-${i}`" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" :stop-color="s.color" stop-opacity=".28" />
              <stop offset="100%" :stop-color="s.color" stop-opacity="0" />
            </linearGradient>
          </defs>
          <template v-for="(s, i) in series" :key="i">
            <path v-if="s.area !== false && path(s)" :d="path(s) + ` L ${W} ${H} L 0 ${H} Z`" :fill="`url(#lcg-${uid}-${i})`" />
            <path :d="path(s)" fill="none" :stroke="s.color" :stroke-width="s.width || 2.2"
              stroke-linecap="round" stroke-linejoin="round" :stroke-dasharray="s.dashed ? '6 4' : ''" />
          </template>
        </svg>
      </div>
    </div>
    <div v-if="hasData" class="lc-xlabels">
      <span v-for="(l, i) in visibleXLabels" :key="i">{{ l }}</span>
    </div>
    <div v-if="hasData && series.length > 1" class="lc-legend">
      <span v-for="(s, i) in series" :key="i"><span class="dot" :style="{ background: s.color }"></span>{{ s.name }}</span>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({
  series: { type: Array, default: () => [] }, // [{ name, color, points: [{x label, y value}], dashed, area }]
  labels: { type: Array, default: () => [] }, // x labels
  height: { type: Number, default: 180 },
  yFormat: { type: Function, default: (v) => String(v) },
})
const W = 880, H = 150
const uid = Math.random().toString(36).slice(2, 8)

const maxVal = computed(() => {
  let max = 0
  for (const s of props.series) for (const p of s.points || []) max = Math.max(max, Number(p.y) || 0)
  return max || 1
})
const hasData = computed(() => props.series.some(s => (s.points || []).length > 1))
const count = computed(() => props.series[0]?.points?.length || 0)

function path(s) {
  const pts = (s.points || []).map((p, i) => [
    count.value > 1 ? (i / (count.value - 1)) * W : 0,
    H - ((Number(p.y) || 0) / maxVal.value) * (H - 12),
  ])
  if (!pts.length) return ''
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) {
    const c1x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) / 3
    const c2x = pts[i][0] - (pts[i][0] - pts[i - 1][0]) / 3
    d += ` C ${c1x} ${pts[i - 1][1]}, ${c2x} ${pts[i][1]}, ${pts[i][0]} ${pts[i][1]}`
  }
  return d
}

const yLabels = computed(() => {
  const max = maxVal.value
  return [1, .75, .5, .25].map(f => ({ label: props.yFormat(Math.round(max * f)), pct: (1 - f) * 100 }))
    .concat([{ label: '0', pct: 100 }])
})

const visibleXLabels = computed(() => {
  const labels = props.labels || []
  const maxShow = 8
  if (labels.length <= maxShow) return labels
  const step = Math.ceil(labels.length / maxShow)
  return labels.filter((_, i) => i % step === 0)
})
</script>
<style scoped>
.lc { position:relative; width:100%; }
.lc-plot { position:relative; padding-left:44px; }
.lc-yaxis { position:absolute; left:0; top:0; bottom:0; width:40px; }
.lc-yaxis span { position:absolute; right:8px; transform:translateY(50%); font-size:10px; color:var(--text-3); font-variant-numeric:tabular-nums; }
.lc-canvas { position:relative; height:100%; }
.lc-grid { position:absolute; inset:0; }
.lc-gridline { position:absolute; left:0; right:0; border-top:1px dashed var(--border); }
.lc-canvas svg { width:100%; height:100%; display:block; }
.lc-xlabels { display:flex; justify-content:space-between; padding-left:44px; margin-top:6px; }
.lc-xlabels span { font-size:10px; color:var(--text-3); }
.lc-legend { display:flex; gap:14px; margin-top:10px; flex-wrap:wrap; }
.lc-legend .dot { width:9px; height:9px; border-radius:3px; display:inline-block; margin-right:5px; }
.lc-legend span { font-size:11.5px; color:var(--text-2); display:inline-flex; align-items:center; }
.lc-empty { height:160px; display:flex; align-items:center; justify-content:center; color:var(--text-3); font-size:13px; }
</style>
