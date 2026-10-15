<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
const props = defineProps({ text: { type: String, required: true } })
const host = ref(null), cv = ref(null)
const GAP = 5
let dots = [], W = 0, H = 0, dpr = 1, raf, ro, io, mo, visible = true, mx = -999, my = -999
const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t) }
/* Renders the text to an offscreen canvas, then samples it on a grid so every letter is made of dots (halftone / LED-matrix look). */
function build() {
  W = host.value.clientWidth; H = host.value.clientHeight
  if (!W || !H) return
  dpr = Math.min(devicePixelRatio || 1, 2); cv.value.width = W * dpr; cv.value.height = H * dpr
  const off = document.createElement('canvas'); off.width = W; off.height = H
  const o = off.getContext('2d', { willReadFrequently: true })
  const font = s => `700 ${s}px Geist, Inter, system-ui, sans-serif`
  let fs = H * .7; o.font = font(fs)
  const w = o.measureText(props.text).width
  if (w > W * .98) { fs *= W * .98 / w; o.font = font(fs) }
  o.textAlign = 'center'; o.textBaseline = 'middle'; o.fillStyle = '#fff'; o.fillText(props.text, W / 2, H * .46)
  const d = o.getImageData(0, 0, W, H).data; dots = []
  for (let y = GAP / 2; y < H; y += GAP) for (let x = GAP / 2; x < W; x += GAP) {
    dots.push({ x, y, on: d[((y | 0) * W + (x | 0)) * 4 + 3] > 128, bg: .12 * smooth(.15, .75, y / H), ph: Math.random() * 6.28 })
  }
  paint(0)
}
function paint(t) {
  const ctx = cv.value.getContext('2d'), dark = document.documentElement.classList.contains('dark')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = dark ? 'rgb(250,250,250)' : 'rgb(24,24,27)'
  const band = ((t * .00012) % 1.5 - .25) * W, acc = []
  for (const p of dots) {
    let a = p.on ? .85 - .3 * smooth(.55, 1, p.y / H) : p.bg
    if (!reduce) {
      if (p.on) a *= .88 + .12 * Math.sin(p.ph + t * .002)
      const m = Math.max(0, 1 - Math.hypot(p.x - mx, p.y - my) / 110), b = p.on ? Math.exp(-(((p.x - band) / 90) ** 2)) * .8 : 0, boost = Math.max(m, b)
      if (boost > .06) { acc.push(p, boost); continue }
    }
    if (a < .02) continue
    ctx.globalAlpha = a; const s = p.on ? 2.2 : 1.3; ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s)
  }
  ctx.fillStyle = '#6f9bff'
  for (let i = 0; i < acc.length; i += 2) {
    const p = acc[i], b = acc[i + 1], s = (p.on ? 2.2 : 1.3) + b * 1.4
    ctx.globalAlpha = Math.min(1, (p.on ? .95 : .4) * (.4 + b)); ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s)
  }
  ctx.globalAlpha = 1
}
const frame = t => { raf = requestAnimationFrame(frame); if (visible) paint(t) }
const move = e => { const r = host.value.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top }
const leave = () => { mx = my = -999 }
onMounted(() => {
  document.fonts?.ready.then(build)
  ro = new ResizeObserver(() => requestAnimationFrame(build)); ro.observe(host.value)
  io = new IntersectionObserver(([e]) => visible = e.isIntersecting); io.observe(host.value)
  mo = new MutationObserver(() => paint(0)); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  if (!reduce) raf = requestAnimationFrame(frame)
})
onUnmounted(() => { cancelAnimationFrame(raf); ro?.disconnect(); io?.disconnect(); mo?.disconnect() })
</script>
<template>
  <div ref="host" class="relative h-full w-full" style="mask-image:linear-gradient(to bottom,transparent 0,#000 18%,#000 60%,transparent 100%)" @pointermove="move" @pointerleave="leave">
    <canvas ref="cv" class="h-full w-full" role="img" :aria-label="text"></canvas></div>
</template>
