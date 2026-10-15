<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { askAI, isDemo } from '../chat/api'
const I = {
  plus:'<path d="M12 5v14M5 12h14"/>', term:'<path d="m4 17 6-6-6-6M12 19h8"/>', edit:'<path d="M12 20h9M16.500 3.500a2.100 2.100 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  cap:'<path d="m2 9 10-5 10 5-10 5zM6 11v5c3 2.500 9 2.500 12 0v-5"/>', sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m21 21-4.300-4.300"/>', left:'<path d="m11 17-5-5 5-5M18 17l-5-5 5-5"/>', down:'<path d="m6 9 6 6 6-6"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.700 21a2 2 0 0 1-3.400 0"/>', mic:'<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>',
  share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.600 13.500 6.800 4M15.400 6.500l-6.800 4"/>', x:'<path d="M18 6 6 18M6 6l12 12"/>',
  ok:'<circle cx="12" cy="12" r="10" fill="#22c55e" stroke="none"/><path d="m8 12 3 3 5-6" stroke="#fff"/>', clip:'<path d="m21 12-9 9a6 6 0 0 1-8.500-8.500l9-9a4 4 0 0 1 5.700 5.700l-9 9a2 2 0 0 1-2.800-2.800l8.500-8.500"/>',
  brain:'<path d="M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 1V4a3 3 0 0 0-3 0zM15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 1"/>',
  msg:'<path d="M21 12a8 8 0 0 1-12 7l-5 1 1.500-4.500A8 8 0 1 1 21 12z"/>', send:'<path d="m22 2-7 20-4-9-9-4zM22 2 11 13"/>', bolt:'<path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor"/>',
  dots:'<circle cx="5" cy="12" r="1.500" fill="currentColor"/><circle cx="12" cy="12" r="1.500" fill="currentColor"/><circle cx="19" cy="12" r="1.500" fill="currentColor"/>', menu:'<path d="M4 6h16M4 12h16M4 18h16"/>', ud:'<path d="m8 9 4-4 4 4M16 15l-4 4-4-4"/>'
}
let uid = 1
const mk = (t, g, m = []) => ({ id: uid++, t, g, m })
const chats = ref([
  mk('Build SkyAgent Workspa…','Today'), mk('Build SkyAgent for Creat…','Today'), mk('Build SkyAgent Workspa…','Today'),
  mk('create for me a modern …','Yesterday'), mk('Create a modern single-…','Yesterday'), mk('What about this image','Yesterday'), mk('Tell me a fun fact I prob…','Yesterday'),
  mk('Build an online store. Pr…','Previous 7 days'),
  mk('hello step by step','Previous 7 days',[{ r:'user', c:'hello step by step' },{ r:'ai', c:'Hello 👋!\nCould you let me know what you’d like a step-by-step guide for? That way I can help you best.' }])
])
chats.value.unshift(mk('New chat','Today'))
const demoChat = chats.value[0]
const activeId = ref(demoChat.id)
const active = computed(() => chats.value.find(c => c.id === activeId.value))
const groups = computed(() => ['Today','Yesterday','Previous 7 days'].map(g => ({ g, items: chats.value.filter(c => c.g === g) })).filter(x => x.items.length))
const draft = ref(''), busy = ref(false), used = ref(1), box = ref(null), fileIn = ref(null), scroller = ref(null)
const files = ref([]), deep = ref(false), mode = ref('Chat'), modeMenu = ref(false), banner = ref(true), listening = ref(false)
const side = ref(typeof innerWidth === 'undefined' || innerWidth >= 768)
const hints = ['Schedule a team meeting','Summarize my week','Draft a status update']
/* auto-playing demo: a user types + sends, the AI replies; loops until the visitor takes over */
const emit = defineEmits(['state', 'pulse'])
const root = ref(null), pressed = ref(false), demoOn = ref(false), demoStream = ref(false)
const phase = computed(() => (busy.value || demoStream.value) ? 'streaming' : draft.value.trim() ? 'typing' : 'idle')
watch(phase, v => emit('state', v), { immediate: true })
let demoRun = 0, typing = false, started = false, io
const sleep = ms => new Promise(r => setTimeout(r, ms))
const script = [
  ['Hey, I need help scheduling a team meeting that works well for everyone. Any suggestions?', 'Based on your calendar patterns and preferences, I recommend Tuesday at 2pm. That slot has historically had the highest attendance and avoids conflicts with recurring meetings. Want me to send the invite?'],
  ['Yes, send it and attach last week’s agenda.', 'Done ✅ I’ve sent the invite to all 8 attendees for Tuesday at 2pm with last week’s agenda attached. I’ll remind everyone an hour before and post the notes to your workspace afterwards.'],
  ['Perfect. Can you also summarize last week’s action items?', 'Sure. 3 items are complete, 2 are in progress (landing page and onboarding emails), and 1 is blocked waiting on design review. Want me to nudge the owner of the blocked task?']]
async function playDemo() {
  const run = ++demoRun, alive = () => run === demoRun
  demoOn.value = true
  while (alive()) {
    demoChat.m.length = 0; demoChat.t = 'New chat'; activeId.value = demoChat.id; draft.value = ''; used.value = 1
    await sleep(1200)
    for (const [q, a] of script) {
      typing = true
      for (const ch of q) { if (!alive()) return; draft.value += ch; resize(); await sleep(26 + Math.random() * 34) }
      typing = false
      await sleep(450); if (!alive()) return
      pressed.value = true; await sleep(220); pressed.value = false
      if (!demoChat.m.length) demoChat.t = q.slice(0, 24) + '…'
      demoChat.m.push({ r: 'user', c: q }); demoStream.value = true; draft.value = ''; used.value = Math.min(50, used.value + 1); resize(); toBottom()
      const reply = demoChat.m[demoChat.m.push({ r: 'ai', c: '' }) - 1]
      await sleep(1100); toBottom()
      for (const tok of a.split(/(\s+)/)) { if (!alive()) { reply.c = a; return } reply.c += tok; toBottom(); await sleep(32) }
      demoStream.value = false; emit('pulse')
      await sleep(1800)
    }
    await sleep(5000)
  }
}
function stopDemo() { if (!demoOn.value) return; demoRun++; demoOn.value = false; demoStream.value = false; pressed.value = false; if (typing) { draft.value = ''; typing = false; resize() } }
onMounted(() => { io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !started) { started = true; playDemo() } }, { threshold: .35 }); io.observe(root.value) })
onUnmounted(() => { demoRun++; io?.disconnect() })
const toBottom = () => nextTick(() => { const s = scroller.value; if (s) s.scrollTop = s.scrollHeight })
const resize = () => nextTick(() => { const b = box.value; if (b) { b.style.height = 'auto'; b.style.height = Math.min(b.scrollHeight, 140) + 'px' } })
function newChat() { const c = mk('New chat','Today'); chats.value.unshift(c); activeId.value = c.id; if (innerWidth < 768) side.value = false }
function pick(id) { activeId.value = id; if (innerWidth < 768) side.value = false; toBottom() }
async function send(text = draft.value) {
  text = text.trim()
  if ((!text && !files.value.length) || busy.value) return
  const chat = active.value
  const content = [text, ...files.value.map(f => `[Attached: ${f.name}]`)].filter(Boolean).join('\n')
  if (!chat.m.length) { chat.t = content.slice(0, 24) + (content.length > 24 ? '…' : ''); chat.g = 'Today' }
  chat.m.push({ r:'user', c:content }); draft.value = ''; files.value = []; used.value = Math.min(50, used.value + 1); resize()
  const reply = chat.m[chat.m.push({ r:'ai', c:'' }) - 1]
  busy.value = true; toBottom()
  const hist = chat.m.slice(0, -1).filter(m => m.c).map(m => ({ role: m.r === 'ai' ? 'assistant' : 'user', content: m.c }))
  while (hist.length && hist[0].role === 'assistant') hist.shift()
  try { for await (const tok of askAI(hist)) { reply.c += tok; toBottom() } emit('pulse') }
  catch (e) { reply.c = reply.c || 'Sorry, I couldn’t reach the AI service. Check VITE_CHAT_ENDPOINT and that the proxy is running.' }
  busy.value = false; toBottom()
}
const onKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }
let rec
function mic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) return
  if (listening.value) { rec.stop(); return }
  rec = new SR(); rec.interimResults = true
  rec.onresult = e => { draft.value = [...e.results].map(r => r[0].transcript).join(''); resize() }
  rec.onend = () => listening.value = false
  rec.start(); listening.value = true
}
</script>
<template>
  <div ref="root" @pointerdown.capture="stopDemo" @focusin="stopDemo" class="relative flex h-full w-full overflow-hidden rounded-[inherit] border bg-[var(--c-bg)] text-left text-[13px] shadow-2xl shadow-black/30 2xl:text-sm">
    <aside v-show="side" class="z-20 flex w-[250px] shrink-0 flex-col border-r bg-[var(--c-side)] max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:shadow-2xl">
      <div class="flex items-center justify-between px-4 py-4"><span class="flex items-center gap-2 text-sm font-semibold"><svg width="22" height="14" viewBox="0 0 40 26" fill="#1d5cff"><path d="M2 14c0-5 4-9 10-9h22l-6 7H14c-3 0-4 1-4 2zM38 12c0 5-4 9-10 9H6l6-7h14c3 0 4-1 4-2z"/></svg>SkyAgent</span>
        <span class="flex gap-3 text-[var(--muted)]"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" v-html="I.search"/><button @click="side=false" aria-label="Collapse sidebar"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="I.left"/></button></span></div>
      <nav class="space-y-0.5 px-2 text-sm font-medium">
        <button @click="newChat" class="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--panel)]"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" v-html="I.plus"/>New chat</button>
        <button v-for="[l,k] in [['Agent Mode','term'],['Canvas','edit'],['Guided Learning','cap'],['Customize','sliders']]" :key="l" class="flex w-full items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--panel)]"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="I[k]"/>{{ l }}</button></nav>
      <div class="thin mt-3 min-h-0 flex-1 overflow-y-auto px-2">
        <p class="flex items-center justify-between px-3 py-2 text-[var(--muted)]">Pinned <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="I.down"/></p><p class="px-3 pb-3 text-xs text-[var(--muted)]">No pinned chats</p>
        <p class="flex items-center justify-between px-3 py-2 text-[var(--muted)]">Chats <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="I.down"/></p>
        <div v-for="g in groups" :key="g.g"><p class="px-2 pb-1 pt-2 text-[var(--muted)]">{{ g.g }}</p>
          <button v-for="c in g.items" :key="c.id" @click="pick(c.id)" class="group flex w-full items-center justify-between truncate rounded-lg px-3 py-2.5 text-left" :class="c.id===activeId ? 'border border-indigo-400/60 bg-[var(--panel)]' : 'hover:bg-[var(--panel)]'"><span class="truncate">{{ c.t }}</span><svg v-if="c.id===activeId" class="h-4 w-4 shrink-0" viewBox="0 0 24 24" v-html="I.dots"/></button></div></div>
      <div class="m-3 rounded-xl border bg-[var(--c-bubble)] p-3"><div class="flex items-center justify-between text-[11px]"><span class="rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide">FREE</span><b>{{ used }} / 50</b></div>
        <div class="mt-3 flex justify-between text-xs"><b>{{ used }}/50</b><span class="text-[var(--muted)]">{{ Math.round(used/50*100) }}%</span></div><div class="mt-1 h-1 rounded-full bg-[var(--line)]"><div class="h-full rounded-full bg-indigo-500 transition-all" :style="{width:used/50*100+'%'}"></div></div>
        <a href="#pricing" class="mt-3 flex items-center justify-center gap-2 rounded-lg bg-indigo-500/15 py-2 text-xs font-semibold text-indigo-400"><svg class="h-3 w-3" viewBox="0 0 24 24" v-html="I.bolt"/>Upgrade</a></div>
      <div class="flex items-center gap-3 border-t px-4 py-3"><span class="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-amber-700 to-stone-900 text-xs font-semibold text-white">MA</span><span class="flex-1 leading-tight"><b class="block text-sm">Mugisha Afani</b><span class="text-xs text-[var(--muted)]">Free plan</span></span><svg class="h-4 w-4 text-[var(--muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="I.ud"/></div>
    </aside>
    <div v-if="side" class="absolute inset-0 z-10 bg-black/40 md:hidden" @click="side=false"></div>
    <section class="flex min-w-0 flex-1 flex-col">
      <header class="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div class="flex min-w-0 items-center gap-3"><button v-if="!side" @click="side=true" aria-label="Open sidebar" class="text-[var(--muted)]"><svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" v-html="I.menu"/></button>
          <b class="truncate text-sm">{{ active.t }}</b><span class="hidden text-[11px] text-[var(--muted)] sm:inline">SkyAgent AI{{ isDemo ? ' · demo replies' : '' }}</span></div>
        <div class="flex items-center gap-3 text-[var(--muted)]"><svg class="hidden h-4 w-4 sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" v-html="I.bell"/>
          <button @click="mic" class="flex items-center gap-1.5 rounded-lg bg-indigo-500/15 px-3 py-1.5 text-xs font-medium text-indigo-400"><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" v-html="I.mic"/>{{ listening ? 'Listening…' : 'Voice' }}</button>
          <svg class="hidden h-4 w-4 sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" v-html="I.share"/><svg class="hidden h-4 w-4 sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" v-html="I.sliders"/></div></header>
      <div v-if="banner" class="flex items-center gap-3 border-b bg-emerald-500/10 px-4 py-2.5 text-xs"><svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke-width="2.500" stroke-linecap="round" v-html="I.ok"/><span class="min-w-0 flex-1 truncate"><b>Welcome to SkyAgent</b> <span class="ml-1 text-[var(--muted)]">Thank you for choosing your daily companion</span></span><button @click="banner=false" aria-label="Dismiss" class="text-emerald-500"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.500" stroke-linecap="round" v-html="I.x"/></button></div>
      <div ref="scroller" class="thin min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-5 sm:px-5 lg:px-[max(1.25rem,calc((100%_-_880px)_/_2))]">
        <div v-if="!active.m.length" class="grid h-full place-items-center text-center"><div><p class="text-lg font-medium">How can I help you today?</p>
          <div class="mt-4 flex flex-wrap justify-center gap-2"><button v-for="h in hints" :key="h" @click="send(h)" class="rounded-full border px-3 py-1.5 text-xs hover:bg-[var(--panel)]">{{ h }}</button></div></div></div>
        <template v-for="(m,i) in active.m" :key="i">
          <div v-if="m.r==='user'" class="flex items-start justify-end gap-3"><span class="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-amber-700 to-stone-900 text-[10px] font-semibold text-white">MA</span><p class="max-w-[80%] whitespace-pre-wrap rounded-xl border bg-[var(--c-bubble)] px-4 py-3 text-sm">{{ m.c }}</p></div>
          <div v-else class="flex items-start gap-3"><span class="grid h-8 w-8 shrink-0 place-items-center rounded-full border bg-[var(--c-bubble)]"><svg width="16" height="10" viewBox="0 0 40 26" fill="#1d5cff"><path d="M2 14c0-5 4-9 10-9h22l-6 7H14c-3 0-4 1-4 2zM38 12c0 5-4 9-10 9H6l6-7h14c3 0 4-1 4-2z"/></svg></span>
            <p class="max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed"><span v-if="!m.c" class="inline-flex gap-1 py-2"><i v-for="d in 3" :key="d" class="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--muted)]" :style="{animationDelay:d*.15+'s'}"></i></span>{{ m.c }}</p></div>
        </template>
      </div>
      <div class="px-3 pb-2 sm:px-4 lg:px-[max(1rem,calc((100%_-_880px)_/_2))]">
        <div class="rounded-2xl border bg-[var(--c-input)] px-3 pb-2.5 pt-3 focus-within:border-indigo-400/60">
          <div v-if="files.length" class="mb-2 flex flex-wrap gap-1.5"><span v-for="(f,i) in files" :key="i" class="flex items-center gap-1.5 rounded-full bg-[var(--panel)] px-2.5 py-1 text-xs">{{ f.name }}<button @click="files.splice(i,1)" aria-label="Remove file"><svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.500" v-html="I.x"/></button></span></div>
          <textarea ref="box" v-model="draft" rows="1" :readonly="demoOn" placeholder="Ask me anything…" class="block max-h-36 w-full resize-none bg-transparent px-1 text-sm outline-none placeholder:text-[var(--muted)]" @keydown="onKey" @input="resize"></textarea>
          <div class="mt-2.5 flex items-center justify-between"><div class="relative flex items-center gap-1.5">
            <button @click="modeMenu=!modeMenu" class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" v-html="I.msg"/>{{ mode }}<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" v-html="I.down"/></button>
            <div v-if="modeMenu" class="absolute bottom-9 left-0 z-10 w-28 rounded-xl border bg-[var(--c-side)] p-1 text-xs shadow-xl"><button v-for="o in ['Chat','Agent']" :key="o" @click="mode=o;modeMenu=false" class="block w-full rounded-lg px-3 py-1.5 text-left hover:bg-[var(--panel)]">{{ o }}</button></div>
            <button @click="fileIn.click()" class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" v-html="I.clip"/>Attach</button>
            <input ref="fileIn" type="file" multiple class="hidden" @change="files.push(...$event.target.files);$event.target.value=''"/>
            <button @click="deep=!deep" class="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs" :class="deep && 'border-indigo-400/60 bg-indigo-500/15 text-indigo-300'"><svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="I.brain"/>Deep Think</button></div>
            <div class="flex items-center gap-3 text-[var(--muted)]"><button @click="mic" aria-label="Dictate" :class="listening && 'text-indigo-400'"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" v-html="I.mic"/></button>
              <button @click="send()" :disabled="busy||(!draft.trim()&&!files.length)" aria-label="Send" class="grid h-9 w-9 place-items-center rounded-full bg-indigo-500 text-white transition disabled:bg-indigo-500/30" :class="pressed && 'scale-90 ring-4 ring-indigo-400/40'"><svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="I.send"/></button></div></div></div>
        <p class="pt-2 text-center text-[10px] text-[var(--muted)]">{{ demoOn ? 'Live demo playing · click anywhere to chat yourself' : 'SkyAgent may make mistakes. Verify important info. · POWERED BY SKYAGENT' }}</p></div>
    </section>
  </div>
</template>
