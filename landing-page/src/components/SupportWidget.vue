<script setup>
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { support, founder } from '../config'
import { supportOpen as open } from '../support/state'
import { sendSupport } from '../support/send'
const email = ref(''), message = ref(''), state = ref('idle'), msg = ref(''), launcher = ref(null), first = ref(null)
const wa = `https://wa.me/${support.whatsapp}?text=${encodeURIComponent(support.whatsappText)}`
watch(open, async v => { await nextTick(); v ? first.value?.focus() : launcher.value?.focus() })
const onKey = e => { if (e.key === 'Escape' && open.value) open.value = false }
onMounted(() => addEventListener('keydown', onKey)); onUnmounted(() => removeEventListener('keydown', onKey))
async function submit() {
  const e = email.value.trim(), m = message.value.trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { state.value = 'err'; msg.value = 'Please enter a valid email so we can reply.'; return }
  if (!m) { state.value = 'err'; msg.value = 'Please write a short message.'; return }
  state.value = 'loading'; msg.value = ''
  try { await sendSupport({ email: e, message: m }); state.value = 'ok'; msg.value = 'Message sent. We’ll reply by email.'; message.value = '' }
  catch { state.value = 'err'; msg.value = 'Couldn’t send. Please email us directly.' }
}
</script>
<template>
  <div class="fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-3 print:hidden sm:bottom-6 sm:right-6">
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="translate-y-3 opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="translate-y-3 opacity-0">
      <div v-if="open" id="support-panel" role="dialog" aria-label="Contact support" class="max-h-[78vh] w-[min(360px,calc(100vw-2rem))] overflow-y-auto rounded-2xl border bg-[var(--c-bg)] text-sm shadow-2xl shadow-black/40">
        <div class="flex items-center gap-3 border-b bg-[#1d5cff] p-4 text-white"><span class="grid h-10 w-10 place-items-center rounded-full bg-white/20 text-sm font-semibold">{{ founder.initials }}</span><div class="leading-tight"><b class="block">SkyAgent Support</b><span class="text-xs text-white/80">How can we help?</span></div></div>
        <div class="space-y-2 p-4">
          <a ref="first" :href="wa" target="_blank" rel="noopener" class="flex items-center justify-between rounded-xl border px-4 py-3 transition hover:border-[#1d5cff]">Chat on WhatsApp <span aria-hidden="true">→</span></a>
          <a :href="`mailto:${support.email}`" class="flex items-center justify-between rounded-xl border px-4 py-3 transition hover:border-[#1d5cff]">Email {{ support.email }} <span aria-hidden="true">→</span></a>
          <a href="#faq" @click="open = false" class="flex items-center justify-between rounded-xl border px-4 py-3 transition hover:border-[#1d5cff]">Read the FAQ <span aria-hidden="true">→</span></a>
        </div>
        <form class="space-y-2 border-t p-4" novalidate @submit.prevent="submit">
          <p class="font-medium">Or send us a message</p>
          <label class="sr-only" for="sw-email">Your email</label><input id="sw-email" v-model="email" type="email" autocomplete="email" placeholder="you@company.com" class="w-full rounded-lg border bg-transparent px-3 py-2 outline-none focus:border-[#1d5cff]"/>
          <label class="sr-only" for="sw-msg">Message</label><textarea id="sw-msg" v-model="message" rows="3" maxlength="2000" placeholder="How can we help?" class="w-full resize-none rounded-lg border bg-transparent px-3 py-2 outline-none focus:border-[#1d5cff]"></textarea>
          <button type="submit" :disabled="state==='loading'" class="pill w-full !py-2.5 disabled:opacity-60">{{ state==='loading' ? 'Sending…' : 'Send message' }}</button>
          <p aria-live="polite" class="min-h-4 text-xs" :class="state==='ok' ? 'text-emerald-500' : 'text-red-400'">{{ msg }}</p></form>
      </div>
    </Transition>
    <button ref="launcher" type="button" @click="open = !open" :aria-expanded="open" aria-controls="support-panel" :aria-label="open ? 'Close support' : 'Open support'" class="grid h-14 w-14 place-items-center rounded-full bg-[#1d5cff] text-white shadow-lg shadow-blue-900/40 transition hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d5cff]">
      <svg v-if="!open" class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>
      <svg v-else class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.200" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>
  </div>
</template>
