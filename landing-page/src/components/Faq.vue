<script setup>import { ref } from 'vue'; import { faqs } from '../data'; const open = ref(null)</script>
<template>
  <section id="faq" class="rail px-6 py-16 text-center">
    <h2 v-reveal class="text-4xl font-medium md:text-5xl">Frequently Asked Questions</h2>
    <p class="mx-auto mt-3 max-w-md text-sm text-slate-500">Answers to common questions about Kinyabot AI and its features. If you have any other questions, please don't hesitate to contact us.</p>
    <div class="mx-auto mt-8 max-w-xl divide-y text-left dark:divide-neutral-800">
      <div v-for="(f,i) in faqs" :key="f[0]"><button @click="open = open===i ? null : i" class="flex w-full items-center justify-between py-3 text-xs font-medium" :aria-expanded="open===i">{{ f[0] }}<span class="transition" :class="open===i && 'rotate-180'">⌄</span></button>
        <div class="grid transition-all duration-300" :style="{gridTemplateRows: open===i ? '1fr':'0fr'}"><p class="overflow-hidden text-xs text-slate-500"><span class="block pb-3">{{ f[1] }}</span></p></div></div>
    </div>
  </section>
</template>
