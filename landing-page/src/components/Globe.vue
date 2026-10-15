<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { geoOrthographic, geoPath, geoGraticule10, geoDistance } from 'd3-geo'
import { feature } from 'topojson-client'
import topo from 'world-atlas/countries-110m.json'
import { hubs, operating } from '../data'
const host = ref(null), cv = ref(null)
const feats = feature(topo, topo.objects.countries).features
const grid = geoGraticule10(), sphere = { type: 'Sphere' }, opSet = new Set(operating)
const continents = computed(() => new Set(hubs.map(h => h.continent)).size)
const proj = geoOrthographic().clipAngle(90).precision(.6)
let rot = [-25, -12, 0], target = null, focused = null, drag = null, raf, visible = true, size = 0, dpr = 1, ro, io
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const palette = () => document.documentElement.classList.contains('dark')
  ? { ocean: ['#20202a', '#111116'], land: '#383844', line: '#15151b', grid: 'rgba(255,255,255,.05)', rim: 'rgba(120,150,255,.4)' }
  : { ocean: ['#f3f6ff', '#d9e4ff'], land: '#c3cfe8', line: '#ffffff', grid: 'rgba(30,60,140,.09)', rim: 'rgba(29,92,255,.4)' }
function draw(t) {
  const ctx = cv.value.getContext('2d'), c = palette(), s = size
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, s, s)
  proj.translate([s / 2, s / 2]).scale(s / 2 - 8).rotate(rot)
  const path = geoPath(proj, ctx)
  const glow = ctx.createRadialGradient(s / 2, s / 2, s / 2 - 40, s / 2, s / 2, s / 2)
  glow.addColorStop(0, 'rgba(29,92,255,.25)'); glow.addColorStop(1, 'rgba(29,92,255,0)'); ctx.fillStyle = glow; ctx.fillRect(0, 0, s, s)
  const og = ctx.createRadialGradient(s * .4, s * .35, s * .05, s / 2, s / 2, s / 2); og.addColorStop(0, c.ocean[0]); og.addColorStop(1, c.ocean[1])
  ctx.beginPath(); path(sphere); ctx.fillStyle = og; ctx.fill()
  ctx.beginPath(); path(grid); ctx.strokeStyle = c.grid; ctx.lineWidth = .6; ctx.stroke()
  ctx.lineWidth = .5; ctx.strokeStyle = c.line
  for (const f of feats) { ctx.beginPath(); path(f); ctx.fillStyle = opSet.has(f.properties.name) ? '#1d5cff' : c.land; ctx.fill(); ctx.stroke() }
  ctx.beginPath(); path(sphere); ctx.strokeStyle = c.rim; ctx.lineWidth = 1; ctx.stroke()
  const center = [-rot[0], -rot[1]]
  for (const h of hubs) {
    if (geoDistance(center, [h.lon, h.lat]) > Math.PI / 2 - .04) continue
    const [x, y] = proj([h.lon, h.lat]), k = ((t / 1600) + h.lon / 360) % 1
    ctx.beginPath(); ctx.arc(x, y, 3 + k * 11, 0, 7); ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * .85})`; ctx.lineWidth = 1.2; ctx.stroke()
    ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#1d5cff'; ctx.lineWidth = 1.5; ctx.stroke()
    if (focused === h) {
      ctx.font = '600 11px Geist, Inter, sans-serif'; const w = ctx.measureText(h.city).width + 16
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.roundRect(x - w / 2, y - 30, w, 20, 10); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText(h.city, x, y - 16)
    }
  }
}
function frame(t) {
  raf = requestAnimationFrame(frame)
  if (!visible || !size) return
  if (!drag) {
    if (target) { const d = (((target[0] - rot[0]) % 360) + 540) % 360 - 180; rot[0] += d * .08; rot[1] += (target[1] - rot[1]) * .08 }
    else if (!reduce) rot[0] += .18
  }
  draw(t)
}
const focus = h => { focused = h; target = [-h.lon, clamp(-h.lat, -50, 50)] }
const release = () => { focused = null; target = null }
const down = e => { drag = { x: e.clientX, y: e.clientY, r: [...rot] }; target = null; e.currentTarget.setPointerCapture(e.pointerId) }
const move = e => { if (drag) { rot[0] = drag.r[0] + (e.clientX - drag.x) * .4; rot[1] = clamp(drag.r[1] - (e.clientY - drag.y) * .4, -60, 60) } }
const up = () => { drag = null }
onMounted(() => {
  ro = new ResizeObserver(() => { size = host.value.clientWidth; dpr = Math.min(devicePixelRatio || 1, 2); cv.value.width = cv.value.height = size * dpr }); ro.observe(host.value)
  io = new IntersectionObserver(([e]) => visible = e.isIntersecting); io.observe(host.value)
  raf = requestAnimationFrame(frame)
})
onUnmounted(() => { cancelAnimationFrame(raf); ro?.disconnect(); io?.disconnect() })
</script>
<template>
  <div class="w-full">
    <div ref="host" class="relative mx-auto aspect-square w-full max-w-[380px] cursor-grab touch-none select-none active:cursor-grabbing" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up">
      <canvas ref="cv" class="h-full w-full" role="img" aria-label="Interactive globe showing the countries we operate in"></canvas></div>
    <p class="mt-4 text-center text-xs text-[var(--muted)]">Operating across {{ continents }} continents · {{ hubs.length }} countries · drag to spin</p>
    <div class="mt-3 flex flex-wrap justify-center gap-1.5">
      <button v-for="h in hubs" :key="h.city" type="button" @mouseenter="focus(h)" @focus="focus(h)" @click="focus(h)" @mouseleave="release" @blur="release" class="rounded-full border px-2.5 py-1 text-[11px] transition hover:border-[#1d5cff] hover:text-[#1d5cff] focus-visible:border-[#1d5cff] focus-visible:outline-none">{{ h.label }}</button></div>
  </div>
</template>
