<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { steps } from '../data'
const cur = ref(0), p = ref(0); let t
onMounted(() => t = setInterval(() => { p.value += 2; if (p.value >= 100) { p.value = 0; cur.value = (cur.value + 1) % steps.length } }, 100)); onUnmounted(() => clearInterval(t))
const pick = i => { cur.value = i; p.value = 0 }
const pos = ['30% 40%','70% 50%','50% 70%','20% 60%']
</script>
<template>
  <section id="how" class="rail px-6 py-24">
    <div class="text-center"><h2 v-reveal class="text-4xl font-medium md:text-5xl">Simple. Seamless. Smart.</h2>
      <p class="mx-auto mt-4 max-w-sm text-[var(--muted)]">Discover how Kinyabot AI transforms your requests into results in four easy steps</p></div>
    <div class="mx-auto mt-14 grid max-w-[1100px] gap-8 md:grid-cols-[1fr_1.7fr]">
      <ul class="space-y-1">
        <li v-for="(s,i) in steps" :key="s.t"><button @click="pick(i)" class="w-full rounded-xl p-5 text-left transition" :class="cur===i ? 'bg-[var(--panel)]' : 'text-[var(--muted)]'">
          <p class="font-medium">{{ s.t }}</p>
          <div v-if="cur===i"><p class="mt-2 text-sm text-[var(--muted)]">{{ s.d }}</p><div class="mt-4 h-0.5 bg-[var(--line)]"><div class="h-full bg-[#1d5cff]" :style="{width:p+'%'}"></div></div></div></button></li></ul>
      <div class="aspect-[16/10] overflow-hidden rounded-xl border bg-gradient-to-b from-slate-900 to-indigo-950">
        <img src="https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1400&q=70" alt="Night sky over a desert" class="h-full w-full object-cover transition-all duration-1000" :style="{objectPosition:pos[cur],transform:`scale(${1+cur*.06})`}" @error="$event.target.style.display='none'"/></div>
    </div>
  </section>
</template>
