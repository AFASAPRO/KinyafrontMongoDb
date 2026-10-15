<script setup>
import { founder, support } from '../config'
const wa = `https://wa.me/${support.whatsapp}?text=${encodeURIComponent(support.whatsappText)}`
</script>
<template>
  <section id="founder" class="rail px-4 py-16 sm:px-6 md:py-24" aria-labelledby="founder-h">
    <p class="text-center text-sm font-medium text-[#1d5cff]">A note from the founder</p>
    <h2 id="founder-h" v-reveal class="mx-auto mt-3 max-w-2xl text-center text-3xl font-medium sm:text-4xl md:text-5xl">Why we’re building SkyAgent</h2>
    <figure class="mx-auto mt-12 grid max-w-[980px] gap-8 rounded-3xl bg-[var(--panel)] p-6 sm:p-10 md:grid-cols-[auto_1fr] md:gap-12">
      <div class="flex items-center gap-4 md:flex-col md:items-start">
        <img v-if="founder.photo" :src="founder.photo" :alt="founder.name" class="h-20 w-20 rounded-full object-cover md:h-28 md:w-28"/>
        <span v-else class="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-700 to-stone-900 text-2xl font-medium text-white md:h-28 md:w-28 md:text-3xl" aria-hidden="true">{{ founder.initials }}</span>
        <figcaption><b class="block text-lg font-medium">{{ founder.name }}</b><span class="text-sm text-[var(--muted)]">{{ founder.role }}</span></figcaption></div>
      <blockquote class="space-y-4 text-lg leading-relaxed sm:text-xl">
        <p v-for="(p,i) in founder.note" :key="i" :class="i>0 && 'text-[var(--muted)]'">{{ p }}</p>
        <p class="pt-2 text-2xl italic tracking-tight" aria-hidden="true">— {{ founder.name }}</p>
        <div class="flex flex-wrap gap-3 pt-2 text-sm not-italic">
          <a :href="`mailto:${support.email}`" class="rounded-full border px-5 py-2.5 transition hover:bg-[var(--bg2)]">Email me</a>
          <a :href="wa" target="_blank" rel="noopener" class="rounded-full border px-5 py-2.5 transition hover:bg-[var(--bg2)]">Message on WhatsApp</a></div>
      </blockquote>
    </figure>
  </section>
</template>
