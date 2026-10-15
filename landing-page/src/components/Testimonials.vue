<script setup>
import { reviews } from '../data'
const cols = [0,1,2].map(c => reviews.filter((_, i) => i % 3 === c))
const render = t => t.replace(/(#\w+|[A-Z][^.]*\.$)/g, '<span class="text-brand">$1</span>')
</script>
<template>
  <section class="rail px-6 py-16 text-center">
    <h2 v-reveal class="text-4xl font-medium md:text-5xl">Empower Your Workflow with AI</h2>
    <p class="mx-auto mt-3 max-w-md text-sm text-slate-500">Hear how people use Kinyabot AI to learn, create, code and get more done every day.</p>
    <div class="relative mx-auto mt-10 grid h-[460px] max-w-[900px] gap-3 overflow-hidden text-left md:grid-cols-3" style="mask-image:linear-gradient(transparent,#000 15%,#000 85%,transparent)">
      <div v-for="(c,ci) in cols" :key="ci" class="overflow-hidden"><div class="animate-scrollY space-y-3" :style="{animationDuration:(34+ci*8)+'s',animationDirection:ci===1?'reverse':'normal'}">
        <figure v-for="(r,i) in [...c,...c]" :key="i" class="rounded-xl border bg-white p-4 text-xs dark:bg-neutral-900 dark:border-neutral-800">
          <blockquote v-html="render(r[2])"></blockquote>
          <figcaption class="mt-3 flex items-center gap-2"><span class="grid h-6 w-6 place-items-center rounded-full bg-slate-200 text-[10px] dark:bg-neutral-700">{{ r[0][0] }}</span><span><b class="block">{{ r[0] }}</b><span class="text-[10px] text-slate-500">{{ r[1] }}</span></span></figcaption></figure></div></div>
    </div>
  </section>
</template>
