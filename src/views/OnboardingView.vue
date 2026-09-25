<template>
  <div class="ob2" :class="{ light: isLight }">

    <!-- ═══ Brand rail (desktop: full left panel · mobile: slim top bar) ═══ -->
    <aside class="ob2-rail">
      <div class="ob2-rail-top">
        <img src="/logo.png" alt="KinyaBot" class="ob2-logo" />
        <span class="ob2-brand">KinyaBot</span>
      </div>

      <div class="ob2-rail-hero">
        <span class="ob2-rail-index">0{{ step }}<em>/0{{ totalSteps }}</em></span>
        <transition name="ob2-fade" mode="out-in">
          <h2 class="ob2-rail-headline" :key="step">{{ railCopy.headline }}</h2>
        </transition>
        <transition name="ob2-fade" mode="out-in">
          <p class="ob2-rail-sub" :key="'s'+step">{{ railCopy.sub }}</p>
        </transition>
      </div>

      <ol class="ob2-rail-list">
        <li v-for="(label, i) in stepLabels" :key="label"
            :class="{ done: i+1 < step, active: i+1 === step }">
          <span class="ob2-rail-dot"><i v-if="i+1 < step" class="fas fa-check"></i></span>
          {{ label }}
        </li>
      </ol>
    </aside>

    <!-- ═══ Content panel ═══ -->
    <main class="ob2-main">

      <!-- mobile-only compact progress -->
      <div class="ob2-mobile-progress">
        <div v-for="n in totalSteps" :key="n" class="ob2-mp-seg" :class="{ done: n <= step }"></div>
      </div>

      <div class="ob2-scroll">
        <transition name="ob2-step" mode="out-in">

          <!-- Step 1 — name -->
          <section v-if="step===1" key="s1" class="ob2-panel">
            <h1 class="ob2-q">What should we call you?</h1>
            <p class="ob2-hint">Your AI will use this to recognize and address you personally.</p>
            <input v-model="form.name" type="text" class="ob2-bigfield" placeholder="Type your name…"
                   autofocus @keyup.enter="canNext && handleNext()" />
          </section>

          <!-- Step 2 — referral, chip picker -->
          <section v-else-if="step===2" key="s2" class="ob2-panel">
            <h1 class="ob2-q">Where did you find us, <span class="accent">{{ form.name || 'friend' }}</span>?</h1>
            <p class="ob2-hint">Helps us reach more people like you.</p>
            <div class="ob2-chips">
              <button v-for="s in referralSources" :key="s.id" class="ob2-chip"
                :class="{ on: form.referral === s.id }" @click="form.referral = s.id">
                <i :class="s.icon" :style="form.referral===s.id ? {} : { color: s.color }"></i>
                {{ s.label }}
              </button>
            </div>
          </section>

          <!-- Step 3 — profession, chip picker -->
          <section v-else-if="step===3" key="s3" class="ob2-panel">
            <h1 class="ob2-q">What's your role?</h1>
            <p class="ob2-hint">We'll tailor examples and tone to fit what you do.</p>
            <div class="ob2-chips">
              <button v-for="p in professions" :key="p.id" class="ob2-chip"
                :class="{ on: form.profession === p.id }" @click="form.profession = p.id">
                <i :class="p.icon"></i>{{ p.label }}
              </button>
            </div>
          </section>

          <!-- Step 4 — first topic -->
          <section v-else key="s4" class="ob2-panel">
            <h1 class="ob2-q">Pick a place to start</h1>
            <p class="ob2-hint">Choose a topic tile, or write your own question below.</p>

            <div class="ob2-tiles">
              <button v-for="s in starters" :key="s.id" class="ob2-tile"
                :class="{ on: form.firstPrompt === s.prompt }"
                @click="form.firstPrompt = s.prompt; customPrompt = ''">
                <i :class="s.icon" :style="{ color: s.color }"></i>
                <div class="ob2-tile-title">{{ s.title }}</div>
                <div class="ob2-tile-sub">{{ s.sub }}</div>
                <div class="ob2-tile-radio" :class="{ on: form.firstPrompt === s.prompt }"></div>
              </button>
            </div>

            <div class="ob2-or"><span>or ask anything</span></div>

            <div class="ob2-custom" :class="{ on: customPrompt.length > 0 }">
              <i class="fas fa-keyboard"></i>
              <input v-model="customPrompt" type="text" placeholder="Type your own question…"
                     @input="customPrompt && (form.firstPrompt = customPrompt)" />
            </div>
          </section>

        </transition>
      </div>

      <!-- Persistent bottom action bar -->
      <div class="ob2-nav">
        <button v-if="step > 1" class="ob2-btn ghost" @click="handleBack">
          <i class="fas fa-arrow-left"></i> Back
        </button>
        <span v-else class="ob2-nav-spacer"></span>
        <button class="ob2-btn solid" :disabled="!canNext || saving" @click="handleNext">
          <span v-if="saving"><i class="fas fa-spinner fa-spin"></i> Starting…</span>
          <span v-else-if="step < totalSteps">Continue <i class="fas fa-arrow-right"></i></span>
          <span v-else><i class="fas fa-rocket"></i> Start Chatting</span>
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'

const router = useRouter()
const auth = useAuthStore()
const chatStore = useChatStore()

const step = ref(1)
const totalSteps = 4
const saving = ref(false)
const customPrompt = ref('')
const isLight = computed(() => document.documentElement.classList.contains('light-mode'))
const form = reactive({ name: auth.user?.username || '', referral: '', profession: '', firstPrompt: '' })

const stepLabels = ['Your name', 'Discovery', 'Your role', 'Get started']

const railCopy = computed(() => ({
  1: { headline: "Let's set things up", sub: 'A couple of quick questions and you\'re in.' },
  2: { headline: form.name ? `Good to meet you, ${form.name}` : 'Good to meet you', sub: 'Tell us how you found KinyaBot.' },
  3: { headline: 'Make it feel like yours', sub: "We'll shape answers around what you do." },
  4: { headline: "You're all set", sub: 'Pick a starting point and jump right in.' },
}[step.value]))

const canNext = computed(() => {
  if (step.value === 1) return !!form.name.trim()
  if (step.value === 2) return !!form.referral
  if (step.value === 3) return !!form.profession
  return !!form.firstPrompt
})

function handleBack() { if (step.value > 1) step.value-- }
function handleNext() {
  if (!canNext.value) return
  if (step.value < totalSteps) step.value++
  else finish()
}

const referralSources = [
  { id:'google',    icon:'fab fa-google',     label:'Google',      color:'#ea4335' },
  { id:'instagram', icon:'fab fa-instagram',  label:'Instagram',   color:'#e1306c' },
  { id:'twitter',   icon:'fab fa-x-twitter',  label:'Twitter / X', color:'#e3e3e3' },
  { id:'tiktok',    icon:'fab fa-tiktok',      label:'TikTok',      color:'#69c9d0' },
  { id:'youtube',   icon:'fab fa-youtube',    label:'YouTube',     color:'#ff5c5c' },
  { id:'linkedin',  icon:'fab fa-linkedin',   label:'LinkedIn',    color:'#4d9fec' },
  { id:'friend',    icon:'fas fa-user-group', label:'A friend',    color:'#4ade80' },
  { id:'other',     icon:'fas fa-star',       label:'Other',       color:'#fbbf24' },
]

const professions = [
  { id:'student',     icon:'fas fa-graduation-cap', label:'Student' },
  { id:'developer',   icon:'fas fa-code',            label:'Developer' },
  { id:'designer',    icon:'fas fa-pen-ruler',        label:'Designer' },
  { id:'marketer',    icon:'fas fa-bullhorn',         label:'Marketer' },
  { id:'researcher',  icon:'fas fa-flask',            label:'Researcher' },
  { id:'entrepreneur',icon:'fas fa-lightbulb',        label:'Entrepreneur' },
  { id:'teacher',     icon:'fas fa-chalkboard-user',  label:'Teacher' },
  { id:'manager',     icon:'fas fa-chart-line',       label:'Manager' },
  { id:'writer',      icon:'fas fa-pen-nib',           label:'Writer' },
  { id:'other',       icon:'fas fa-user-astronaut',   label:'Other' },
]

const starters = [
  { id:'code',      icon:'fas fa-code',        title:'Generate Code',      sub:'Build something with AI', color:'#a78bfa', prompt:'Write me a complete, responsive HTML/CSS landing page with a modern dark theme and smooth animations.' },
  { id:'learn',     icon:'fas fa-book-open',   title:'Learn a Topic',      sub:'Get structured lessons',  color:'#67e8f9', prompt:'Create a beginner-friendly learning plan for machine learning with topics, resources, and weekly goals.' },
  { id:'write',     icon:'fas fa-pen-nib',      title:'Write Content',      sub:'Draft any document',      color:'#86efac', prompt:'Help me write a compelling cover letter for a software engineering position at a tech startup.' },
  { id:'analyze',   icon:'fas fa-chart-bar',   title:'Analyze Data',       sub:'Make sense of numbers',   color:'#fcd34d', prompt:'Explain the key metrics I should track to measure the success of a SaaS product launch.' },
  { id:'image',     icon:'fas fa-image',       title:'Generate Image',     sub:'Create visuals with AI',  color:'#f9a8d4', prompt:'/image a futuristic African city at night with neon lights and flying cars, cinematic style, 4K' },
  { id:'kinyarwanda', icon:'fas fa-globe-africa', title:'Discussion en Français', sub:'Parlez votre langue', color:'#6ee7b7', prompt:'Bonjour ! Je veux savoir comment KinyaBot peut aider dans les tâches quotidiennes, y compris la création de code et la rédaction de documents.' },
]

async function finish() {
  saving.value = true
  try {
    await auth.completeOnboarding({
      username: form.name,
      referral_source: form.referral,
      profession: form.profession
    })
    await chatStore.fetchChats()
    await chatStore.createChat()
    if (form.firstPrompt) await chatStore.sendMessage(form.firstPrompt)
    router.push('/')
  } catch {
    router.push('/')
  } finally { saving.value = false }
}
</script>

<style scoped>
/* ═══════════════════════ Shell: split-screen layout ═══════════════════════ */
.ob2{
  min-height:100vh; min-height:100dvh; width:100%;
  display:grid; grid-template-columns:38% 62%;
  background:#0a0a0e; color:#f1f1f4;
}
.ob2.light{ background:#f5f6f8; color:#1a1a2e; }

/* ── Left rail ── */
.ob2-rail{
  background:#141019; border-right:1px solid rgba(255,255,255,.06);
  display:flex; flex-direction:column; justify-content:space-between;
  padding:2.5rem 2.25rem; position:relative; overflow:hidden;
}
.ob2.light .ob2-rail{ background:#efeafc; border-color:#e2d9f7; }
.ob2-rail::before{
  content:''; position:absolute; width:340px; height:340px; border-radius:50%;
  background:#7c3aed; opacity:.14; filter:blur(70px); top:-100px; right:-120px;
}
.ob2-rail::after{
  content:''; position:absolute; width:260px; height:260px; border-radius:50%;
  background:#0891b2; opacity:.12; filter:blur(70px); bottom:-90px; left:-90px;
}

.ob2-rail-top{ display:flex; align-items:center; gap:10px; z-index:1; }
.ob2-logo{ width:32px; height:32px; border-radius:8px; object-fit:contain; }
.ob2-brand{ font-size:15px; font-weight:800; letter-spacing:-.2px; }

.ob2-rail-hero{ z-index:1; }
.ob2-rail-index{ display:block; font-size:13px; font-weight:700; color:#a78bfa; letter-spacing:.08em; margin-bottom:1rem; }
.ob2-rail-index em{ font-style:normal; color:#57536b; }
.ob2.light .ob2-rail-index em{ color:#9a8fc4; }
.ob2-rail-headline{ font-size:clamp(24px,2.6vw,34px); font-weight:800; line-height:1.2; margin-bottom:.75rem; min-height:2.4em; }
.ob2-rail-sub{ font-size:14.5px; color:#9691ab; line-height:1.6; max-width:32ch; }
.ob2.light .ob2-rail-sub{ color:#6b6485; }

.ob2-rail-list{ list-style:none; display:flex; flex-direction:column; gap:14px; z-index:1; }
.ob2-rail-list li{ display:flex; align-items:center; gap:12px; font-size:13.5px; font-weight:600; color:#57536b; transition:color .25s; }
.ob2.light .ob2-rail-list li{ color:#a89fc9; }
.ob2-rail-list li.active{ color:#f1f1f4; }
.ob2.light .ob2-rail-list li.active{ color:#1a1a2e; }
.ob2-rail-list li.done{ color:#c4b5fd; }
.ob2-rail-dot{
  width:20px; height:20px; border-radius:50%; flex-shrink:0; font-size:9px;
  display:flex; align-items:center; justify-content:center;
  border:1.5px solid #3a3550; background:transparent; transition:all .25s;
}
.ob2.light .ob2-rail-dot{ border-color:#cbb9f2; }
.ob2-rail-list li.active .ob2-rail-dot{ border-color:#a78bfa; box-shadow:0 0 0 3px rgba(167,139,250,.15); }
.ob2-rail-list li.done .ob2-rail-dot{ background:#7c3aed; border-color:#7c3aed; color:#fff; }

/* ── Right content panel ── */
.ob2-main{ display:flex; flex-direction:column; min-height:100vh; min-height:100dvh; }
.ob2-mobile-progress{ display:none; }
.ob2-scroll{ flex:1; overflow-y:auto; display:flex; align-items:center; padding:2.5rem 4rem; }

.ob2-panel{ width:100%; max-width:640px; margin:0 auto; }
.ob2-q{ font-size:clamp(22px,3vw,32px); font-weight:800; line-height:1.25; margin-bottom:.6rem; }
.accent{ color:#a78bfa; }
.ob2.light .accent{ color:#7c3aed; }
.ob2-hint{ font-size:14.5px; color:#9691ab; margin-bottom:2rem; line-height:1.55; }
.ob2.light .ob2-hint{ color:#666080; }

.ob2-bigfield{
  width:100%; padding:18px 4px; background:none; border:none; border-bottom:2px solid #2a2638;
  color:inherit; font-size:clamp(20px,3vw,28px); font-weight:600; outline:none; transition:border-color .2s;
}
.ob2.light .ob2-bigfield{ border-color:#d9d0f0; }
.ob2-bigfield::placeholder{ color:#4a4560; }
.ob2.light .ob2-bigfield::placeholder{ color:#c1b6e2; }
.ob2-bigfield:focus{ border-color:#7c3aed; }

/* Chip picker */
.ob2-chips{ display:flex; flex-wrap:wrap; gap:10px; }
.ob2-chip{
  display:flex; align-items:center; gap:9px; padding:12px 20px; border-radius:999px;
  background:#171420; border:1.5px solid #2a2638; color:#d6d3e0;
  font-size:14px; font-weight:600; cursor:pointer; transition:all .2s;
}
.ob2.light .ob2-chip{ background:#fff; border-color:#e2d9f7; color:#3c3752; }
.ob2-chip:hover{ border-color:#4a4468; transform:translateY(-1px); }
.ob2-chip.on{ background:#7c3aed; border-color:#7c3aed; color:#fff; }
.ob2-chip:focus-visible{ outline:2px solid #a78bfa; outline-offset:2px; }

/* Topic tiles (step 4) */
.ob2-tiles{ display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-bottom:1.75rem; }
.ob2-tile{
  position:relative; text-align:left; padding:18px; border-radius:16px;
  background:#171420; border:1.5px solid #2a2638; cursor:pointer; transition:all .2s;
  display:flex; flex-direction:column; gap:8px;
}
.ob2.light .ob2-tile{ background:#fff; border-color:#e2d9f7; }
.ob2-tile:hover{ border-color:#4a4468; transform:translateY(-2px); }
.ob2-tile.on{ border-color:#7c3aed; background:#1d1730; }
.ob2.light .ob2-tile.on{ background:#f4eeff; }
.ob2-tile i{ font-size:20px; }
.ob2-tile-title{ font-size:14.5px; font-weight:700; color:#f1f1f4; }
.ob2.light .ob2-tile-title{ color:#1a1a2e; }
.ob2-tile-sub{ font-size:12px; color:#8d8aa0; }
.ob2.light .ob2-tile-sub{ color:#726c8f; }
.ob2-tile-radio{ position:absolute; top:14px; right:14px; width:16px; height:16px; border-radius:50%; border:2px solid #3a3550; }
.ob2.light .ob2-tile-radio{ border-color:#d9cff2; }
.ob2-tile-radio.on{ background:#7c3aed; border-color:#7c3aed; box-shadow:inset 0 0 0 3px #171420; }
.ob2.light .ob2-tile-radio.on{ box-shadow:inset 0 0 0 3px #fff; }

.ob2-or{ display:flex; align-items:center; gap:12px; margin-bottom:1.1rem; color:#6b6684; font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.1em; }
.ob2-or::before,.ob2-or::after{ content:''; flex:1; height:1px; background:#242032; }
.ob2.light .ob2-or::before,.ob2.light .ob2-or::after{ background:#e2d9f7; }

.ob2-custom{ display:flex; align-items:center; gap:12px; padding:14px 18px; border-radius:14px; background:#171420; border:1.5px solid #2a2638; transition:border-color .2s; }
.ob2.light .ob2-custom{ background:#fff; border-color:#e2d9f7; }
.ob2-custom i{ color:#6b6684; font-size:15px; }
.ob2-custom input{ flex:1; min-width:0; background:none; border:none; color:inherit; font-size:14px; outline:none; }
.ob2-custom.on{ border-color:#7c3aed; }

/* Bottom nav bar */
.ob2-nav{
  display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:1.25rem 4rem; border-top:1px solid #201c2c;
  padding-bottom:max(1.25rem, env(safe-area-inset-bottom));
}
.ob2.light .ob2-nav{ border-color:#e2d9f7; }
.ob2-nav-spacer{ flex:0 0 1px; }
.ob2-btn{ display:inline-flex; align-items:center; justify-content:center; gap:9px; padding:14px 26px; border-radius:12px; font-size:14.5px; font-weight:700; cursor:pointer; transition:all .2s; border:none; }
.ob2-btn.solid{ background:#7c3aed; color:#fff; }
.ob2-btn.solid:hover:not(:disabled){ background:#8b5cf6; }
.ob2-btn.solid:disabled{ opacity:.4; cursor:not-allowed; }
.ob2-btn.ghost{ background:transparent; border:1.5px solid #2a2638; color:#c9c6d6; }
.ob2.light .ob2-btn.ghost{ border-color:#d9cff2; color:#4a4468; }
.ob2-btn.ghost:hover{ border-color:#4a4468; color:#fff; }
.ob2.light .ob2-btn.ghost:hover{ color:#1a1a2e; }

/* Transitions */
.ob2-step-enter-active,.ob2-step-leave-active{ transition:opacity .3s ease, transform .3s cubic-bezier(.4,0,.2,1); }
.ob2-step-enter-from{ opacity:0; transform:translateY(14px); }
.ob2-step-leave-to{ opacity:0; transform:translateY(-14px); }
.ob2-fade-enter-active,.ob2-fade-leave-active{ transition:opacity .3s ease; }
.ob2-fade-enter-from,.ob2-fade-leave-to{ opacity:0; }

/* ═══════════════════════ Responsive ═══════════════════════ */
@media (max-width:980px){
  .ob2{ grid-template-columns:1fr; }
  .ob2-rail{ display:none; }
  .ob2-mobile-progress{ display:flex; gap:6px; padding:1.1rem 1.25rem 0; }
  .ob2-mp-seg{ flex:1; height:4px; border-radius:99px; background:#201c2c; transition:background .3s; }
  .ob2.light .ob2-mp-seg{ background:#e2d9f7; }
  .ob2-mp-seg.done{ background:#7c3aed; }
  .ob2-scroll{ padding:1.75rem 1.25rem; align-items:flex-start; }
  .ob2-nav{ padding:1rem 1.25rem; }
}

@media (max-width:520px){
  .ob2-tiles{ grid-template-columns:1fr; }
  .ob2-chip{ padding:10px 16px; font-size:13px; }
  .ob2-bigfield{ font-size:20px; }
  .ob2-btn{ padding:13px 20px; font-size:14px; }
  .ob2-nav{ padding:.9rem 1rem; }
  .ob2-scroll{ padding:1.4rem 1rem; }
}
</style>
