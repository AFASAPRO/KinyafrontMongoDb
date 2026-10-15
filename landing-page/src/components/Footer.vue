<script setup>
import { ref } from 'vue'
import DotText from './DotText.vue'
import { support } from '../config'
import { subscribe } from '../chat/subscribe'
const cols = { Company:['About','Contact','Blog','Story'], Products:['Company','Product','Press','More'], Resources:['Press','Careers','Newsletters','More'] }
const email = ref(''), state = ref('idle'), msg = ref('')
async function submit() {
  const v = email.value.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { state.value = 'err'; msg.value = 'Please enter a valid email address.'; return }
  state.value = 'loading'; msg.value = ''
  try { await subscribe(v); state.value = 'ok'; msg.value = 'Thanks for subscribing! You’ll hear from us soon.'; email.value = '' }
  catch { state.value = 'err'; msg.value = 'Something went wrong. Please try again.' }
}
</script>
<template>
  <footer class="rail relative overflow-hidden px-4 pb-6 pt-16 sm:px-6">
    <div class="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
      <div class="max-w-sm"><p class="text-lg font-semibold text-[#1d5cff]">Kinyabot AI</p><p class="mt-2 text-sm text-[var(--muted)]">Kinyabot AI is your friendly companion — chat and ask anything, generate images, write and debug code, and talk with voice &amp; translation in Kinyarwanda, English, French and more</p>
        <form class="mt-6" novalidate @submit.prevent="submit">
          <label for="sub-email" class="mb-2 block text-sm font-medium">Subscribe to our newsletter</label>
          <div class="flex gap-2 rounded-full border p-1 transition focus-within:border-[#1d5cff]">
            <input id="sub-email" v-model="email" type="email" autocomplete="email" placeholder="you@company.com" class="min-w-0 flex-1 bg-transparent px-4 text-sm outline-none placeholder:text-[var(--muted)]" :aria-invalid="state==='err'" aria-describedby="sub-msg"/>
            <button type="submit" :disabled="state==='loading'" class="pill !py-2 disabled:opacity-60">{{ state==='loading' ? 'Subscribing…' : 'Subscribe' }}</button></div>
          <p id="sub-msg" aria-live="polite" class="mt-2 min-h-5 text-xs" :class="state==='ok' ? 'text-emerald-500' : 'text-red-400'">{{ msg }}</p></form></div>
      <div v-for="(l,h) in cols" :key="h" class="text-sm"><p class="mb-2 font-semibold">{{ h }}</p><a v-for="i in l" :key="i" :href="i === 'Contact' ? `mailto:${support.email}` : '#'" class="block py-1 text-[var(--muted)] transition hover:text-[var(--fg)]">{{ i }}</a></div></div>
    <div class="mt-10 h-[130px] sm:h-[210px] md:h-[290px]"><DotText text="Your AI companion, always ready" /></div>
  </footer>
</template>
