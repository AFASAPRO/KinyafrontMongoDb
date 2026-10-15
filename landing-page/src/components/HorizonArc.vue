<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
defineProps({ pulse: { type: Number, default: 0 } })
/* A planet-horizon band: flat dark-blue body between two concentric arcs, a crisp brand-blue rim,
   a blurred blue atmosphere behind it, and a bright highlight that travels along the rim.
   Geometry is generated from the real screen width so the curve stays correct on phones and wide monitors. */
const host = ref(null), w = ref(1200); let ro
const TOP = 70, HALF = 35, PAD = 60
const R = computed(() => Math.max(w.value, 420))
const cy = computed(() => TOP + R.value)
const pt = (r, x) => [x, cy.value - Math.sqrt(Math.max(0, r * r - (x - w.value / 2) ** 2))]
const f = n => n.toFixed(1)
const arcD = r => { const [x1, y1] = pt(r, -PAD), [x2, y2] = pt(r, w.value + PAD); return `M${f(x1)} ${f(y1)}A${r} ${r} 0 0 1 ${f(x2)} ${f(y2)}` }
const dMid = computed(() => arcD(R.value)), dOut = computed(() => arcD(R.value + HALF)), dIn = computed(() => arcD(R.value - HALF))
const bodyD = computed(() => {
  const ro_ = R.value + HALF, ri = R.value - HALF
  const [x1, y1] = pt(ro_, -PAD), [x2, y2] = pt(ro_, w.value + PAD), [x3, y3] = pt(ri, w.value + PAD), [x4, y4] = pt(ri, -PAD)
  return `M${f(x1)} ${f(y1)}A${ro_} ${ro_} 0 0 1 ${f(x2)} ${f(y2)}L${f(x3)} ${f(y3)}A${ri} ${ri} 0 0 0 ${f(x4)} ${f(y4)}Z`
})
const h = computed(() => Math.ceil(pt(R.value - HALF, w.value + PAD)[1]) + 60)
onMounted(() => { ro = new ResizeObserver(() => { w.value = host.value.clientWidth || 1200 }); ro.observe(host.value); w.value = host.value.clientWidth || 1200 })
onUnmounted(() => ro?.disconnect())
</script>
<template>
  <div ref="host" class="w-full">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`" class="block" aria-hidden="true" focusable="false">
      <defs>
        <filter id="hz-wide" filterUnits="userSpaceOnUse" x="-120" y="-120" :width="w + 240" :height="h + 240"><feGaussianBlur stdDeviation="30"/></filter>
        <filter id="hz-tight" filterUnits="userSpaceOnUse" x="-60" y="-60" :width="w + 120" :height="h + 120"><feGaussianBlur stdDeviation="9"/></filter>
      </defs>
      <g class="hz-scroll"><g class="glow-i"><g class="hz-anim hz-breathe">
        <path :d="dMid" class="hz-glow" fill="none" stroke-width="80" opacity=".5" filter="url(#hz-wide)"/>
        <path :d="dOut" class="hz-glow" fill="none" stroke-width="16" opacity=".9" filter="url(#hz-tight)"/>
      </g></g></g>
      <path :d="bodyD" class="hz-band"/>
      <path :d="dIn" class="hz-inner" fill="none" stroke-width="1.5"/>
      <path :d="dOut" class="hz-rim" fill="none" stroke-width="2"/>
      <path :d="dOut" pathLength="1000" class="hz-hi hz-anim hz-sweep" fill="none" stroke-width="5" stroke-linecap="round" filter="url(#hz-tight)"/>
      <path :d="dOut" pathLength="1000" class="hz-hi hz-anim hz-sweep" fill="none" stroke-width="2.5" stroke-linecap="round"/>
      <g v-if="pulse" :key="pulse"><path :d="dOut" pathLength="1000" class="hz-hi hz-pulse" fill="none" stroke-width="7" stroke-linecap="round" filter="url(#hz-tight)"/><path :d="dOut" pathLength="1000" class="hz-hi hz-pulse" fill="none" stroke-width="3" stroke-linecap="round"/></g>
    </svg>
  </div>
</template>
