<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
const menu = ref(false), scrolled = ref(false), dark = ref(true), active = ref('Home')
const links = [['Home','#home'],['How it Works','#how'],['Features','#features'],['Pricing','#pricing']]
const onScroll = () => {
  scrolled.value = scrollY > 24
  for (const [n,h] of [...links].reverse()) { const el = document.querySelector(h); if (el && el.getBoundingClientRect().top < 200) { active.value = n; break } }
}
const toggle = () => { dark.value = !dark.value; document.documentElement.classList.toggle('dark', dark.value) }
onMounted(() => { onScroll(); addEventListener('scroll', onScroll, { passive: true }) }); onUnmounted(() => removeEventListener('scroll', onScroll))
</script>
<template>
  <header class="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3">
    <nav class="pointer-events-auto flex max-w-full items-center justify-between rounded-2xl border px-3 py-3 transition-all sm:px-5 duration-500 ease-out"
      :class="scrolled ? 'w-[1000px] backdrop-blur-xl' : 'w-[1360px] border-transparent'"
      :style="scrolled ? { background: 'color-mix(in srgb, var(--bg) 72%, transparent)' } : {}">
      <a href="#home" class="flex items-center gap-2 text-xl font-semibold tracking-tight">
        <svg width="34" height="22" viewBox="0 0 40 26" fill="#1d5cff"><path d="M2 14c0-5 4-9 10-9h22l-6 7H14c-3 0-4 1-4 2zM38 12c0 5-4 9-10 9H6l6-7h14c3 0 4-1 4-2z"/></svg>SkyAgent</a>
      <ul class="hidden items-center gap-1 text-[15px] md:flex">
        <li v-for="[n,h] in links" :key="n"><a :href="h" class="block rounded-full px-4 py-2 transition" :class="active===n ? 'bg-[var(--panel)] text-[var(--fg)]' : 'text-[var(--muted)] hover:text-[var(--fg)]'">{{ n }}</a></li></ul>
      <div class="flex items-center gap-2"><a href="#pricing" class="pill max-sm:!px-3 max-sm:!text-xs">Try for free</a><button class="grid h-10 w-10 place-items-center rounded-full border md:hidden" @click="menu=!menu" aria-label="Menu"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
        <button @click="toggle" class="grid h-10 w-10 place-items-center rounded-full border transition hover:bg-[var(--panel)]" aria-label="Toggle theme">
          <svg v-if="dark" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.800z"/></svg>
          <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.900 4.900l1.400 1.400M17.700 17.700l1.400 1.400M2 12h2M20 12h2M4.900 19.100l1.400-1.400M17.700 6.300l1.400-1.400"/></svg></button></div>
    </nav>
    <ul v-if="menu" class="pointer-events-auto absolute inset-x-3 top-[84px] rounded-2xl border p-2 text-base backdrop-blur-xl md:hidden" style="background:color-mix(in srgb, var(--bg) 92%, transparent)"><li v-for="[n,h] in links" :key="n"><a :href="h" @click="menu=false" class="block rounded-xl px-4 py-3 hover:bg-[var(--panel)]">{{ n }}</a></li></ul>
  </header>
</template>
