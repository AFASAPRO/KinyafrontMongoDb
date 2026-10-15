<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import HeroChat from './HeroChat.vue'
import HorizonArc from './HorizonArc.vue'
/* Scroll-linked reveal: the chat starts tilted and narrower, then flattens and widens to the full screen as it scrolls into view. */
const root = ref(null), outer = ref(null), st = ref({}), prog = ref(0), phase = ref('idle'), pulseN = ref(0), vis = ref(true)
let ticking = false, io
const lerp = (a, b, t) => a + (b - a) * t, ease = t => 1 - Math.pow(1 - t, 3)
function update() {
  ticking = false
  const el = outer.value; if (!el) return
  const vh = innerHeight, vw = document.documentElement.clientWidth, small = vw < 768
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const t = reduce ? 1 : Math.min(1, Math.max(0, (vh * .95 - el.getBoundingClientRect().top) / (vh * .8))), e = ease(t)
  prog.value = +e.toFixed(3)
  st.value = {
    width: lerp(small ? vw - 32 : Math.min(1000, vw - 48), vw - (small ? 16 : 24), e) + 'px',
    height: `min(${small ? 640 : 720}px, 84vh)`, minHeight: '520px',
    borderRadius: lerp(28, 16, e) + 'px', opacity: lerp(.5, 1, Math.min(1, t * 2)),
    boxShadow: '0 30px 80px -30px rgba(0,0,0,.55)',
    transform: `perspective(1600px) rotateX(${lerp(small ? 7 : 14, 0, e)}deg) translateY(${lerp(36, 0, e)}px) scale(${lerp(.97, 1, e)})`
  }
}
const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update) } }
onMounted(() => {
  update(); addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll)
  io = new IntersectionObserver(([e]) => vis.value = e.isIntersecting); io.observe(root.value)
})
onUnmounted(() => { removeEventListener('scroll', onScroll); removeEventListener('resize', onScroll); io?.disconnect() })
</script>
<template>
  <section id="home" ref="root" class="relative px-4 pb-20 pt-32 sm:px-6 sm:pt-40" :style="{ '--p': prog }" :data-phase="phase" :data-off="!vis">
    <div class="relative z-10 text-center">
      <span class="mb-6 inline-flex items-center gap-2 rounded-full border bg-[var(--panel)] px-4 py-2 text-sm">
        <span class="relative flex h-2 w-2"><span class="absolute inset-0 animate-ping rounded-full bg-[#1d5cff] opacity-60"></span><span class="relative h-2 w-2 rounded-full bg-[#1d5cff]"></span></span>Introducing custom automations</span>
      <h1 v-reveal class="grad-text text-4xl font-medium leading-[1.06] sm:text-5xl md:text-[72px]">Meet your AI Agent<br/>Streamline your workflow</h1>
      <p class="mx-auto mt-6 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-xl">AI assistant designed to streamline your digital workflows and handle mundane tasks, so you can focus on what truly matters</p>
      <div class="mt-8 flex flex-wrap justify-center gap-3"><a href="#pricing" class="pill cta-glow !px-7 !py-3 !text-base">Try for Free</a><a href="#" class="rounded-full border bg-[var(--bg)]/40 px-8 py-3 text-base backdrop-blur transition hover:bg-[var(--panel)]">Log in</a></div></div>
    <div ref="outer" class="relative left-1/2 mt-24 flex w-screen -translate-x-1/2 justify-center sm:mt-32">
      <div class="pointer-events-none absolute inset-x-0 z-0" style="top:-125px" aria-hidden="true"><HorizonArc :pulse="pulseN" /></div>
      <div class="relative z-10 overflow-hidden will-change-transform" :style="st"><HeroChat @state="phase = $event" @pulse="pulseN++" /></div></div>
  </section>
</template>
