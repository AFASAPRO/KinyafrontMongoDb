<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
/* 1. chat: user bubble -> typing dots -> streamed reply, loops */
const q = 'Hey, I need help scheduling a team meeting that works well for everyone. Any suggestions for finding an optimal time slot?'
const a = 'Based on your calendar patterns and preferences, I recommend scheduling the team meeting for Tuesday at 2pm. This time slot has historically had the highest attendance rate, and it avoids conflicts with other recurring meetings.'
const stage = ref(0), typed = ref(''); let alive = true, timers = []
const wait = ms => new Promise(r => timers.push(setTimeout(r, ms)))
async function loop() {
  while (alive) {
    stage.value = 0; typed.value = ''; await wait(700); stage.value = 1; await wait(1000); stage.value = 2; await wait(1000); stage.value = 3
    for (let i = 1; i <= a.length && alive; i++) { typed.value = a.slice(0, i); await wait(22) }
    await wait(5000)
  }
}
/* 2. orbiting integrations */
const ic = {
  sb: ['#1c1c1c','<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="#3ecf8e"/>'],
  os: ['#2081e2','<path d="M12 5 7 14h5zM13 8v6h5zM5 16c2 3 12 3 14 0z" fill="#fff"/>'],
  rs: ['#0a0a0a','<path d="M7 5h6a4 4 0 0 1 0 8H7zM12 13l5 6" fill="none" stroke="#fff" stroke-width="2.200"/>'],
  fr: ['#6d5dfc','<path d="M12 4 6 12l6 8 6-8z" fill="none" stroke="#fff" stroke-width="2.400"/>'],
  vc: ['#000','<path d="M12 4 21 19H3z" fill="#fff"/>'],
  ch: ['#f4f4f5','<rect x="5" y="6" width="3" height="12" fill="#f97316"/><rect x="10" y="9" width="3" height="9" fill="#2563eb"/><rect x="15" y="12" width="3" height="6" fill="#111"/>'],
  ps: ['#a1a1aa','<rect x="5" y="5" width="7" height="7" fill="#ea580c"/><rect x="12" y="12" width="7" height="7" fill="#c2410c"/>'],
  st: ['#d4d4d8','<path d="M12 3c1 5 4 8 9 9-5 1-8 4-9 9-1-5-4-8-9-9 5-1 8-4 9-9z" fill="#4f6df5"/>']
}
const rings = [
  { r: 120, d: 50, list: [[10,'sb'],[200,'os']] },
  { r: 197, d: 70, list: [[40,'rs'],[230,'fr']] },
  { r: 282, d: 95, list: [[20,'vc'],[130,'ch'],[250,'ps'],[320,'st']] }]
/* 3. area chart with tooltip (follows pointer, else sweeps on its own) */
const W = 700, H = 440, data = [.25,.3,.34,.3,.28,.34,.46,.52,.5,.47,.46,.5,.55,.6,.66,.72,.8,.85]
const dense = Array.from({ length: 181 }, (_, i) => { const f = i / 180 * (data.length - 1), k = Math.min(Math.floor(f), data.length - 2), u = (1 - Math.cos((f - k) * Math.PI)) / 2; return data[k] * (1 - u) + data[k + 1] * u })
const px = i => i / 180 * W, py = v => 340 - v * 200
const line = 'M' + dense.map((v, i) => `${px(i).toFixed(1)} ${py(v).toFixed(1)}`).join('L')
const hov = ref(null), auto = ref(90)
const idx = computed(() => Math.round(hov.value ?? auto.value))
const cx = computed(() => px(idx.value)), cy = computed(() => py(dense[idx.value]))
const val = computed(() => Math.round(600 + dense[idx.value] * 8200).toLocaleString('en-US'))
const tipX = computed(() => Math.min(Math.max(cx.value - 70, 4), W - 100))
function move(e) { const b = e.currentTarget.getBoundingClientRect(); hov.value = Math.max(0, Math.min(180, (e.clientX - b.left) / b.width * 180)) }
/* 4. task board: sweeping time marker + draggable bars */
const days = [['Tue',18],['Wed',34.5],['Thu',51],['Fri',67],['Sat',82]]
const gx = ref(51), gHover = ref(false), board = ref(null)
const bars = ref([{ n:'Bento grid', l:14, w:44, c:'bg-[#1d5cff] text-white' }, { n:'Landing Page', l:30, w:44, c:'bg-[#1e3a8a] text-white' }, { n:'Add Task', l:46, w:40, c:'border border-dashed border-[#1d5cff] text-[#1d5cff]' }])
const clock = computed(() => { const h = (gx.value / 100 * 5 * 24) % 24, h12 = Math.floor(h % 12) || 12, m = Math.floor((h % 1) * 60); return `${h12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` })
function gmove(e) { const b = board.value.getBoundingClientRect(); gx.value = Math.max(2, Math.min(98, (e.clientX - b.left) / b.width * 100)) }
let drag = null
const down = (e, i) => { e.target.setPointerCapture(e.pointerId); drag = { i, x: e.clientX, l: bars.value[i].l } }
const dmove = e => { if (!drag) return; const b = board.value.getBoundingClientRect(), bar = bars.value[drag.i]; bar.l = Math.max(0, Math.min(100 - bar.w, drag.l + (e.clientX - drag.x) / b.width * 100)) }
let raf, t0 = performance.now()
const tick = now => { const t = (now - t0) / 1000; if (hov.value === null) auto.value = 90 + 75 * Math.sin(t * .5); if (!gHover.value) gx.value = 51 + 36 * Math.sin(t * .35); raf = requestAnimationFrame(tick) }
onMounted(() => { loop(); raf = requestAnimationFrame(tick) })
onUnmounted(() => { alive = false; timers.forEach(clearTimeout); cancelAnimationFrame(raf) })
</script>
<template>
  <section id="features" class="rail px-4 sm:px-6">
    <div class="min-w-0">
      <div class="min-w-0">
        <div class="py-14 text-center md:py-24"><h2 v-reveal class="text-4xl font-medium md:text-5xl">Empower Your Workflow with AI</h2>
          <p class="mx-auto mt-5 max-w-lg text-lg text-[var(--muted)]">Ask your AI Agent for real-time collaboration, seamless integrations, and actionable insights to streamline your operations.</p></div>
        <div class="grid overflow-hidden rounded-2xl border md:grid-cols-2 [&>article:last-child]:border-b-0 md:[&>article:nth-last-child(-n+2)]:border-b-0">
          <article class="border-b md:border-r"><div class="relative h-[490px] overflow-hidden p-5 sm:p-10">
            <div v-if="stage>=1" class="ml-auto flex w-[350px] max-w-[92%] items-end gap-3 transition"><p class="rounded-3xl rounded-br-lg bg-[#1d5cff] px-5 py-4 text-[17px] leading-snug text-white">{{ q }}</p><span class="mb-0 grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-200 to-stone-700 text-xs text-white">SK</span></div>
            <div v-if="stage>=2" class="mt-3 flex items-start gap-3"><span class="mt-8 grid h-12 w-12 shrink-0 place-items-center rounded-full border bg-[var(--bg2)]"><svg width="22" height="14" viewBox="0 0 40 26" fill="#1d5cff"><path d="M2 14c0-5 4-9 10-9h22l-6 7H14c-3 0-4 1-4 2zM38 12c0 5-4 9-10 9H6l6-7h14c3 0 4-1 4-2z"/></svg></span>
              <p class="min-w-0 max-w-full rounded-3xl sm:w-[375px] rounded-3xl rounded-bl-lg bg-[var(--panel)] px-5 py-4 text-[17px] leading-snug text-[var(--muted)]"><span v-if="stage===2" class="inline-flex gap-1.5 py-1.5"><i v-for="d in 3" :key="d" class="h-2 w-2 animate-pulse rounded-full bg-[var(--muted)]" :style="{animationDelay:d*.15+'s'}"></i></span><template v-else>{{ typed }}</template></p></div></div>
            <div class="px-5 pb-6 sm:px-8 sm:pb-8"><h3 class="text-xl font-semibold">Real-time AI Collaboration</h3><p class="mt-1 text-[17px] text-[var(--muted)]">Experience real-time assistance. Ask your AI Agent to coordinate tasks, answer questions, and maintain team alignment.</p></div></article>
          <article class="border-b"><div class="relative h-[490px] overflow-hidden max-sm:[&>div]:scale-[.6]" style="mask-image:linear-gradient(#000 82%,transparent)">
            <div v-for="(g,i) in rings" :key="g.r" class="absolute left-1/2 rounded-full border" :style="{width:g.r*2+'px',height:g.r*2+'px',top:'388px',transformOrigin:`50% ${g.r}px`,margin:`-${g.r}px 0 0 -${g.r}px`,background:i===0?'radial-gradient(circle,transparent 55%,color-mix(in srgb,var(--panel) 60%,transparent))':''}">
              <div class="spin absolute inset-0" :style="{'--d':g.d+'s',animationDirection:i%2?'reverse':'normal'}">
                <div v-for="[ang,k] in g.list" :key="k" class="absolute left-1/2 top-1/2" :style="{transform:`rotate(${ang}deg) translateY(-${g.r}px)`}"><div :style="{transform:`rotate(-${ang}deg)`}"><div class="spin -ml-[27px] -mt-[27px] grid h-[54px] w-[54px] place-items-center rounded-full shadow-lg" :style="{'--d':g.d+'s',animationDirection:i%2?'normal':'reverse',background:ic[k][0]}"><svg viewBox="0 0 24 24" class="h-6 w-6" v-html="ic[k][1]"></svg></div></div></div></div></div>
            <span class="absolute left-1/2 top-[388px] grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#1d5cff] shadow-[0_0_60px_rgba(29,92,255,.45)]"><svg width="44" height="28" viewBox="0 0 40 26" fill="#fff"><path d="M2 14c0-5 4-9 10-9h22l-6 7H14c-3 0-4 1-4 2zM38 12c0 5-4 9-10 9H6l6-7h14c3 0 4-1 4-2z"/></svg></span></div>
            <div class="px-5 pb-6 sm:px-8 sm:pb-8"><h3 class="text-xl font-semibold">Seamless Integrations</h3><p class="mt-1 text-[17px] text-[var(--muted)]">Unite your favorite tools for effortless connectivity. Boost productivity through interconnected workflows.</p></div></article>
          <article class="border-b md:border-r"><div class="flex h-[490px] items-end overflow-hidden" @pointermove="move" @pointerleave="hov=null">
            <svg :viewBox="`0 0 ${W} ${H}`" class="w-full" style="touch-action:pan-y"><defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d5cff" stop-opacity=".38"/><stop offset="1" stop-color="#1d5cff" stop-opacity="0"/></linearGradient><linearGradient id="vl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d5cff"/><stop offset="1" stop-color="#1d5cff" stop-opacity="0"/></linearGradient></defs>
              <path :d="line+`L${W} ${H}L0 ${H}Z`" fill="url(#ar)"/><path :d="line" fill="none" stroke="#1d5cff" stroke-width="2.500"/>
              <line :x1="cx" :y1="cy" :x2="cx" :y2="H" stroke="url(#vl)" stroke-width="1.500"/>
              <circle :cx="cx" :cy="cy" r="9" fill="none" stroke="#1d5cff" stroke-width="2"><animate attributeName="r" values="7;15;7" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;.1;.9" dur="2s" repeatCount="indefinite"/></circle><circle :cx="cx" :cy="cy" r="5" fill="#1d5cff"/>
              <g :transform="`translate(${tipX} ${cy-78})`"><rect width="96" height="40" rx="20" fill="var(--bg2)" stroke="var(--line)"/><text x="48" y="26" text-anchor="middle" font-size="18" font-family="ui-monospace,monospace" font-weight="600" fill="currentColor">{{ val }}</text></g></svg></div>
            <div class="px-5 pb-6 sm:px-8 sm:pb-8"><h3 class="text-xl font-semibold">Instant Insight Reporting</h3><p class="mt-1 text-[17px] text-[var(--muted)]">Transform raw data into clear insights in seconds. Empower smarter decisions with real-time, always-learning intelligence.</p></div></article>
          <article class="border-b"><div ref="board" class="relative h-[490px] select-none overflow-hidden" @pointerenter="gHover=true" @pointerleave="gHover=false" @pointermove="gmove($event); dmove($event)" @pointerup="drag=null">
            <div class="h-8 opacity-70" style="background:repeating-linear-gradient(90deg,var(--muted) 0 1px,transparent 1px 16px);mask-image:linear-gradient(#000 0,#000 40%,transparent)"></div>
            <span v-for="[d,l] in days" :key="d" class="absolute top-6 -translate-x-1/2 text-[17px] text-[var(--muted)]" :style="{left:l+'%'}">{{ d }}</span>
            <div class="absolute top-[52px] h-[380px] w-px bg-[var(--fg)]/60" :style="{left:gx+'%'}"><span class="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border bg-[var(--bg2)] px-3 py-1.5 text-sm">{{ clock }}</span></div>
            <div v-for="(b,i) in bars" :key="b.n" class="absolute grid h-10 cursor-grab touch-none place-items-center rounded-xl text-[17px] font-medium active:cursor-grabbing" :class="b.c" :style="{left:b.l+'%',width:b.w+'%',top:[130,220,310][i]+'px'}" @pointerdown="down($event,i)">{{ b.n }}</div></div>
            <div class="px-5 pb-6 sm:px-8 sm:pb-8"><h3 class="text-xl font-semibold">Smart Automation</h3><p class="mt-1 text-[17px] text-[var(--muted)]">Set it, forget it. Your AI Agent tackles repetitive tasks so you can focus on strategy, innovation, and growth.</p></div></article>
        </div>
      </div>
    </div>
  </section>
</template>
