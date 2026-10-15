<script setup>import { ref } from 'vue'; import { plans } from '../data'; const yearly = ref(false)</script>
<template>
  <section id="pricing" class="rail px-6 py-16 text-center">
    <h2 v-reveal class="text-4xl font-medium md:text-5xl">Pricing that scale with you</h2>
    <p class="mt-3 text-sm text-slate-500">Whichever plan you pick, it's free until you love your docs. That's our promise.</p>
    <div class="mx-auto mt-6 inline-flex rounded-full border bg-white p-0.5 text-xs dark:bg-neutral-900 dark:border-neutral-800">
      <button @click="yearly=false" class="rounded-full px-3 py-1" :class="!yearly && 'bg-slate-100 dark:bg-neutral-700'">Monthly</button>
      <button @click="yearly=true" class="rounded-full px-3 py-1" :class="yearly && 'bg-slate-100 dark:bg-neutral-700'">Yearly <span class="rounded bg-blue-100 px-1 text-brand">-20%</span></button></div>
    <div class="mx-auto mt-8 grid max-w-[960px] items-start gap-3 text-left md:grid-cols-3">
      <article v-for="p in plans" :key="p.n" class="rounded-xl border p-5 transition" :class="p.pop ? 'bg-white shadow-xl dark:bg-neutral-900 md:-mt-2' : 'cell'">
        <p class="text-xs">{{ p.n }} <span v-if="p.pop" class="ml-1 rounded-full bg-brand px-2 py-0.5 text-[10px] text-white">Popular</span></p>
        <p class="mt-3 text-4xl font-medium md:text-5xl">${{ yearly ? p.y : p.m }}<span class="ml-1 text-xs text-slate-500">/month</span></p>
        <p class="mt-1 text-xs text-slate-500">{{ p.d }}</p>
        <button class="mt-4 w-full rounded-full py-2 text-xs font-medium" :class="p.style">{{ p.cta }}</button>
        <p class="mt-4 text-xs font-medium">Everything in Pro +</p>
        <ul class="mt-2 space-y-1.5 text-xs"><li v-for="f in p.f" :key="f" class="flex gap-2"><span class="text-brand">✓</span>{{ f }}</li></ul></article>
    </div>
  </section>
</template>
