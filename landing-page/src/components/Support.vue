<script setup>
import { support } from '../config'
import { supportOpen } from '../support/state'
const wa = `https://wa.me/${support.whatsapp}?text=${encodeURIComponent(support.whatsappText)}`
const icon = { mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>', wa: '<path d="M21 12a8 8 0 0 1-12 7l-5 1 1.500-4.500A8 8 0 1 1 21 12z"/><path d="M9 9c0 3 3 6 6 6l1-2-2-1-1 .8c-.8-.4-1.600-1.200-2-2l.8-1-1-2z"/>', chat: '<path d="M4 5h16v11H9l-5 4z"/>' }
</script>
<template>
  <section id="support" class="rail px-4 py-16 text-center sm:px-6 md:py-20" aria-labelledby="support-h">
    <h2 id="support-h" v-reveal class="text-3xl font-medium sm:text-4xl">Still have questions? We’re here to help</h2>
    <p class="mx-auto mt-3 max-w-md text-[var(--muted)]">Pick the channel that suits you and a real person will get back to you.</p>
    <div class="mx-auto mt-10 grid max-w-[900px] gap-3 text-left sm:grid-cols-3">
      <a :href="`mailto:${support.email}`" class="group rounded-2xl border p-5 transition hover:border-[#1d5cff]"><svg class="h-6 w-6 text-[#1d5cff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round" v-html="icon.mail"/><b class="mt-4 block font-medium">Email support</b><span class="break-all text-sm text-[var(--muted)]">{{ support.email }}</span></a>
      <a :href="wa" target="_blank" rel="noopener" class="group rounded-2xl border p-5 transition hover:border-[#1d5cff]"><svg class="h-6 w-6 text-[#1d5cff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round" v-html="icon.wa"/><b class="mt-4 block font-medium">WhatsApp</b><span class="text-sm text-[var(--muted)]">Chat with us directly</span></a>
      <button type="button" @click="supportOpen = true" class="group rounded-2xl border p-5 text-left transition hover:border-[#1d5cff]"><svg class="h-6 w-6 text-[#1d5cff]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round" v-html="icon.chat"/><b class="mt-4 block font-medium">Send a message</b><span class="text-sm text-[var(--muted)]">Opens the support chat</span></button>
    </div>
  </section>
</template>
