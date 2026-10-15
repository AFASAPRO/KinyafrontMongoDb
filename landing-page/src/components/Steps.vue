<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { steps } from '../data'
const cur = ref(0), p = ref(0); let t
onMounted(() => t = setInterval(() => { p.value += 2; if (p.value >= 100) { p.value = 0; cur.value = (cur.value + 1) % steps.length } }, 100)); onUnmounted(() => clearInterval(t))
const pick = i => { cur.value = i; p.value = 0 }
/* One generated illustration per step — preloaded so the switch is instant */
const imgs = steps.map((_, i) => `${import.meta.env.BASE_URL || '/'}steps/step-${i + 1}.png`)
onMounted(() => imgs.forEach(src => { const im = new Image(); im.src = src }))
const imgError = ref([false, false, false, false])
watch(cur, () => { imgError.value[cur] = false })
</script>
<template>
  <section id="how" class="rail px-6 py-24">
    <div class="text-center"><h2 v-reveal class="text-4xl font-medium md:text-5xl">Simple. Seamless. Smart.</h2>
      <p class="mx-auto mt-4 max-w-sm text-[var(--muted)]">Discover how Kinyabot AI transforms your requests into results in four easy steps</p></div>
    <div class="mx-auto mt-14 grid max-w-[1100px] gap-8 md:grid-cols-[1fr_1.7fr]">
      <ul class="space-y-1">
        <li v-for="(s,i) in steps" :key="s.t"><button @click="pick(i)" class="w-full rounded-xl p-5 text-left transition" :class="cur===i ? 'bg-[var(--panel)]' : 'text-[var(--muted)]'">
          <p class="font-medium"><span class="mr-2 text-sm text-[#1d5cff]" :class="cur===i ? '' : 'opacity-60'">0{{ i + 1 }}</span>{{ s.t }}</p>
          <div v-if="cur===i"><p class="mt-2 text-sm text-[var(--muted)]">{{ s.d }}</p><div class="mt-4 h-0.5 bg-[var(--line)]"><div class="h-full bg-[#1d5cff]" :style="{width:p+'%'}"></div></div></div></button></li></ul>
      <div class="relative aspect-[16/10] overflow-hidden rounded-xl border bg-gradient-to-b from-slate-900 to-indigo-950">
        <transition v-for="(s,i) in steps" :key="s.t" name="stepfade">
          <img v-if="cur===i && !imgError[i]" :src="imgs[i]" :alt="s.t" class="absolute inset-0 h-full w-full object-cover" @error="imgError[i] = true"/></transition>
        <transition name="stepfade" v-if="imgError[cur]">
          <div class="absolute inset-0 grid place-items-center p-8 text-center">
            <p class="text-lg font-medium text-white/90">{{ steps[cur].t }}</p></div></transition>
        <div class="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          <button v-for="(s,i) in steps" :key="'d'+i" @click="pick(i)" :aria-label="s.t"
            class="h-1.5 rounded-full transition-all duration-300" :class="cur===i ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'"></button></div>
      </div>
    </div>
  </section>
</template>
<style scoped>
.stepfade-enter-active { transition: opacity .7s ease, transform .7s ease; }
.stepfade-leave-active { transition: opacity .5s ease; }
.stepfade-enter-from { opacity: 0; transform: scale(1.04); }
.stepfade-leave-to { opacity: 0; }
</style>
