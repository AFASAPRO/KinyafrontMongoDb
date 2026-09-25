<template>
  <div class="ob-root" :class="{ light: isLight }">
    <div class="ob-bg">
      <div class="ob-blob ob-blob1"></div>
      <div class="ob-blob ob-blob2"></div>
      <div v-for="i in 10" :key="i" class="particle" :style="particleStyle(i)"></div>
    </div>

    <!-- Header -->
    <div class="ob-header">
      <div class="ob-brand">
        <img src="/logo.png" alt="KinyaBot" class="ob-brand-logo" />
        <span>KinyaBot</span>
      </div>

      <!-- Step indicator -->
      <div class="ob-steps" role="list" aria-label="Onboarding progress">
        <div v-for="n in totalSteps" :key="n" class="ob-step-dot-wrap" role="listitem">
          <div class="ob-step-dot" :class="{ done: n < step, current: n === step }">
            <i v-if="n < step" class="fas fa-check"></i>
            <span v-else>{{ n }}</span>
          </div>
          <div v-if="n < totalSteps" class="ob-step-line" :class="{ done: n < step }"></div>
        </div>
      </div>
    </div>

    <div class="ob-card">
      <!-- Step 1: Name Collection -->
      <transition name="ob-slide" mode="out-in">
        <div v-if="step===1" key="s1" class="ob-step">
          <div class="ob-step-header">
            <div class="ob-step-badge"><i class="fas fa-user"></i></div>
            <div>
              <h1 class="ob-title">What should we call you?</h1>
              <p class="ob-desc">AI will use this name to recognize and address you personally.</p>
            </div>
          </div>
          <div class="input-group">
            <input v-model="form.name" type="text" class="ob-input" placeholder="Enter your name…" @keyup.enter="form.name && (step=2)" />
          </div>
          <div class="ob-actions">
            <button class="ob-next-btn" :disabled="!form.name" @click="step=2">
              Next <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </transition>

      <!-- Step 2: Referral source -->
      <transition name="ob-slide" mode="out-in">
        <div v-if="step===2" key="s2" class="ob-step">
          <div class="ob-step-header">
            <div class="ob-step-badge"><i class="fas fa-search"></i></div>
            <div>
              <h1 class="ob-title">Welcome, <span class="highlight">{{ form.name }}</span>!</h1>
              <p class="ob-desc">How did you discover KinyaBot? This helps us reach more people like you.</p>
            </div>
          </div>
          <div class="option-grid cols4">
            <button v-for="s in referralSources" :key="s.id" class="option-card"
              :class="{ selected: form.referral === s.id }" @click="form.referral = s.id">
              <div class="oc-icon" :style="{ background: s.bg, borderColor: s.border }">
                <i :class="s.icon" :style="{ color: s.color }"></i>
              </div>
              <span class="oc-label">{{ s.label }}</span>
              <div class="oc-check" v-if="form.referral === s.id"><i class="fas fa-check"></i></div>
            </button>
          </div>
          <div class="ob-actions">
            <button class="ob-back-btn" @click="step=1"><i class="fas fa-arrow-left"></i> Back</button>
            <button class="ob-next-btn" :disabled="!form.referral" @click="step=3">
              Next <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </transition>

      <!-- Step 3: Profession -->
      <transition name="ob-slide" mode="out-in">
        <div v-if="step===3" key="s3" class="ob-step">
          <div class="ob-step-header">
            <div class="ob-step-badge"><i class="fas fa-briefcase"></i></div>
            <div>
              <h1 class="ob-title">What's your role?</h1>
              <p class="ob-desc">Help us personalize your KinyaBot experience for your specific needs.</p>
            </div>
          </div>
          <div class="option-grid cols3">
            <button v-for="p in professions" :key="p.id" class="option-card"
              :class="{ selected: form.profession === p.id }" @click="form.profession = p.id">
              <div class="oc-icon" style="background:rgba(124,58,237,.12);border-color:rgba(124,58,237,.28)">
                <i :class="p.icon" style="color:#a78bfa"></i>
              </div>
              <span class="oc-label">{{ p.label }}</span>
              <div class="oc-check" v-if="form.profession === p.id"><i class="fas fa-check"></i></div>
            </button>
          </div>
          <div class="ob-actions">
            <button class="ob-back-btn" @click="step=2"><i class="fas fa-arrow-left"></i> Back</button>
            <button class="ob-next-btn" :disabled="!form.profession" @click="step=4">
              Next <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </transition>

      <!-- Step 4: First topic -->
      <transition name="ob-slide" mode="out-in">
        <div v-if="step===4" key="s4" class="ob-step">
          <div class="ob-step-header">
            <div class="ob-step-badge star"><i class="fas fa-rocket"></i></div>
            <div>
              <h1 class="ob-title">Ready to launch!</h1>
              <p class="ob-desc">Pick your first topic or type a custom question to get started instantly.</p>
            </div>
          </div>

          <div class="starter-list">
            <button v-for="s in starters" :key="s.id" class="starter-row"
              :class="{ selected: form.firstPrompt === s.prompt }"
              @click="form.firstPrompt = s.prompt; customPrompt = ''">
              <div class="sr-icon" :style="{ background: s.bg, borderColor: s.border }">
                <i :class="s.icon" :style="{ color: s.color }"></i>
              </div>
              <div class="sr-info">
                <div class="sr-title">{{ s.title }}</div>
                <div class="sr-sub">{{ s.sub }}</div>
              </div>
              <div class="sr-check" v-if="form.firstPrompt === s.prompt"><i class="fas fa-check"></i></div>
            </button>
          </div>

          <div class="divider-or"><span>or type your own question</span></div>

          <div class="custom-box" :class="{ active: customPrompt.length > 0 }">
            <i class="fas fa-keyboard"></i>
            <input v-model="customPrompt" type="text"
              placeholder="Ask anything you'd like…"
              @input="customPrompt && (form.firstPrompt = customPrompt)" />
          </div>

          <div class="ob-actions">
            <button class="ob-back-btn" @click="step=3"><i class="fas fa-arrow-left"></i> Back</button>
            <button class="ob-finish-btn" :disabled="!form.firstPrompt || saving" @click="finish">
              <span v-if="saving"><i class="fas fa-spinner fa-spin"></i> Starting…</span>
              <span v-else><i class="fas fa-rocket"></i> Start Chatting</span>
            </button>
          </div>
        </div>
      </transition>
    </div>

    <p class="ob-footer-text">Step {{ step }} of {{ totalSteps }} — Almost there!</p>
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

function particleStyle(i) {
  const size = 3 + (i % 4) * 2
  return {
    width: size + 'px', height: size + 'px',
    left: (6 + i * 9.5) + '%', top: (10 + (i * 9) % 78) + '%',
    animationDelay: (i * 0.45) + 's',
    animationDuration: (4 + i % 3) + 's'
  }
}

const referralSources = [
  { id:'google',    icon:'fab fa-google',     label:'Google',      color:'#ea4335', bg:'rgba(234,67,53,.1)',   border:'rgba(234,67,53,.25)' },
  { id:'instagram', icon:'fab fa-instagram',  label:'Instagram',   color:'#e1306c', bg:'rgba(225,48,108,.1)',  border:'rgba(225,48,108,.25)' },
  { id:'twitter',   icon:'fab fa-x-twitter',  label:'Twitter / X', color:'#e3e3e3', bg:'rgba(255,255,255,.06)', border:'rgba(255,255,255,.12)' },
  { id:'tiktok',    icon:'fab fa-tiktok',      label:'TikTok',      color:'#69c9d0', bg:'rgba(105,201,208,.1)', border:'rgba(105,201,208,.25)' },
  { id:'youtube',   icon:'fab fa-youtube',    label:'YouTube',     color:'#ff0000', bg:'rgba(255,0,0,.1)',     border:'rgba(255,0,0,.25)' },
  { id:'linkedin',  icon:'fab fa-linkedin',   label:'LinkedIn',    color:'#0a66c2', bg:'rgba(10,102,194,.1)',  border:'rgba(10,102,194,.25)' },
  { id:'friend',    icon:'fas fa-user-group', label:'Friend',      color:'#34a853', bg:'rgba(52,168,83,.1)',   border:'rgba(52,168,83,.25)' },
  { id:'other',     icon:'fas fa-star',       label:'Other',       color:'#fbbc04', bg:'rgba(251,188,4,.1)',   border:'rgba(251,188,4,.25)' },
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
  { id:'code',      icon:'fas fa-code',        title:'Generate Code',      sub:'Build something with AI', color:'#a78bfa', bg:'rgba(124,58,237,.12)',  border:'rgba(124,58,237,.25)', prompt:'Write me a complete, responsive HTML/CSS landing page with a modern dark theme and smooth animations.' },
  { id:'learn',     icon:'fas fa-book-open',   title:'Learn a Topic',      sub:'Get structured lessons',  color:'#67e8f9', bg:'rgba(6,182,212,.12)',   border:'rgba(6,182,212,.25)',  prompt:'Create a beginner-friendly learning plan for machine learning with topics, resources, and weekly goals.' },
  { id:'write',     icon:'fas fa-pen-nib',      title:'Write Content',      sub:'Draft any document',      color:'#86efac', bg:'rgba(34,197,94,.12)',   border:'rgba(34,197,94,.25)',  prompt:'Help me write a compelling cover letter for a software engineering position at a tech startup.' },
  { id:'analyze',   icon:'fas fa-chart-bar',   title:'Analyze Data',       sub:'Make sense of numbers',   color:'#fcd34d', bg:'rgba(245,158,11,.12)',  border:'rgba(245,158,11,.25)', prompt:'Explain the key metrics I should track to measure the success of a SaaS product launch.' },
  { id:'image',     icon:'fas fa-image',       title:'Generate Image',     sub:'Create visuals with AI',  color:'#f9a8d4', bg:'rgba(236,72,153,.12)',  border:'rgba(236,72,153,.25)', prompt:'/image a futuristic African city at night with neon lights and flying cars, cinematic style, 4K' },
  {
    id: 'kinyarwanda',
    icon: 'fas fa-globe-africa',
    title: 'Discussion en Français',
    sub: 'Parlez votre langue',
    color: '#6ee7b7',
    bg: 'rgba(16,185,129,.12)',
    border: 'rgba(16,185,129,.25)',
    prompt: 'Bonjour ! Je veux savoir comment KinyaBot peut aider dans les tâches quotidiennes, y compris la création de code et la rédaction de documents.'
  },
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
/* ═══════════ Root & background (flat, no gradients) ═══════════ */
.ob-root{min-height:100vh;min-height:100dvh;width:100%;background:#0d0d0f;display:flex;flex-direction:column;align-items:center;padding:0 1rem 2rem;position:relative;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
.ob-root.light{background:#f0f2f5}

.ob-bg{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.ob-blob{position:absolute;border-radius:50%;filter:blur(90px);opacity:.16}
.ob-blob1{width:560px;height:560px;background:#6d28d9;top:-160px;left:-160px}
.ob-blob2{width:460px;height:460px;background:#0891b2;bottom:-120px;right:-120px}
.ob-root.light .ob-blob{opacity:.09}
.particle{position:absolute;border-radius:50%;background:rgba(139,92,246,.4);animation:float ease-in-out infinite alternate}
@keyframes float{from{transform:translateY(0) scale(1);opacity:.4}to{transform:translateY(-18px) scale(1.25);opacity:.1}}

/* ═══════════ Header ═══════════ */
.ob-header{width:100%;max-width:700px;display:flex;flex-direction:column;gap:14px;padding:1.5rem 0 1.1rem;z-index:2}
.ob-brand{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:var(--text-1)}
.ob-brand-logo{width:28px;height:28px;border-radius:7px;object-fit:contain}
.ob-root.light .ob-brand{color:#202124}

/* Step dots + connecting lines (flat colors) */
.ob-steps{display:flex;align-items:center}
.ob-step-dot-wrap{display:flex;align-items:center;flex:1}
.ob-step-dot-wrap:last-child{flex:0}
.ob-step-dot{
  width:28px;height:28px;border-radius:50%;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:700;color:var(--text-3);
  background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.12);
  transition:all .25s;
}
.ob-root.light .ob-step-dot{background:#fff;border-color:#dadce0;color:#5f6368}
.ob-step-dot.current{border-color:#7c3aed;color:#c4b5fd;background:rgba(124,58,237,.14)}
.ob-root.light .ob-step-dot.current{border-color:#7c3aed;color:#7c3aed;background:rgba(124,58,237,.08)}
.ob-step-dot.done{background:#7c3aed;border-color:#7c3aed;color:#fff}
.ob-step-line{flex:1;height:2px;background:rgba(255,255,255,.1);margin:0 6px;transition:background .3s}
.ob-root.light .ob-step-line{background:#dadce0}
.ob-step-line.done{background:#7c3aed}

/* ═══════════ Card ═══════════ */
.ob-card{width:100%;max-width:700px;background:#111112;border:1px solid rgba(255,255,255,.08);border-radius:22px;padding:clamp(1.25rem,4vw,2.5rem);z-index:2;box-shadow:0 20px 50px rgba(0,0,0,.3);position:relative}
.ob-root.light .ob-card{background:#fff;border-color:#e0e0e0;box-shadow:0 10px 30px rgba(0,0,0,.05)}

.ob-step-header{display:flex;gap:18px;margin-bottom:1.85rem}
.ob-step-badge{width:52px;height:52px;border-radius:15px;background:rgba(109,40,217,.15);border:1px solid rgba(109,40,217,.3);display:flex;align-items:center;justify-content:center;font-size:22px;color:#c4b5fd;flex-shrink:0}
.ob-step-badge.star{background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.3);color:#fcd34d}

.ob-title{font-size:clamp(18px,4.4vw,23px);font-weight:700;color:#fff;margin-bottom:6px;line-height:1.25}
.ob-root.light .ob-title{color:#1a1a2e}
.highlight{color:#a78bfa}
.ob-root.light .highlight{color:#7c3aed}
.ob-desc{font-size:14px;color:var(--text-2);line-height:1.55}
.ob-root.light .ob-desc{color:#5f6368}

.input-group{margin-bottom:1.85rem}
.ob-input{width:100%;padding:15px 18px;background:#1a1a1c;border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;font-size:16px;outline:none;transition:border-color .2s,box-shadow .2s}
.ob-input:focus{border-color:#7c3aed;box-shadow:0 0 0 4px rgba(124,58,237,.15)}
.ob-root.light .ob-input{background:#f8f9fa;border-color:#dadce0;color:#202124}

/* Option grids: flat, responsive down to phones */
.option-grid{display:grid;gap:10px;margin-bottom:1.85rem}
.cols4{grid-template-columns:repeat(4,1fr)}
.cols3{grid-template-columns:repeat(3,1fr)}
@media(max-width:600px){ .cols4,.cols3{grid-template-columns:repeat(2,1fr)} }
@media(max-width:360px){ .ob-card{padding:1rem .8rem} }

.option-card{background:#1a1a1c;border:1px solid rgba(255,255,255,.06);border-radius:15px;padding:14px 10px;display:flex;flex-direction:column;align-items:center;gap:10px;cursor:pointer;transition:background .2s,transform .2s,border-color .2s;position:relative}
.ob-root.light .option-card{background:#f8f9fa;border-color:#e0e0e0}
.option-card:hover{background:#222225;transform:translateY(-2px)}
.ob-root.light .option-card:hover{background:#f1f3f4}
.option-card.selected{background:rgba(124,58,237,.1);border-color:#7c3aed;box-shadow:0 0 0 1px #7c3aed}
.option-card:focus-visible{outline:2px solid #7c3aed;outline-offset:2px}

.oc-icon{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:17px;border:1px solid transparent;flex-shrink:0}
.oc-label{font-size:12.5px;font-weight:600;color:var(--text-1);text-align:center;line-height:1.3}
.ob-root.light .oc-label{color:#202124}
.oc-check{position:absolute;top:7px;right:7px;width:17px;height:17px;background:#7c3aed;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff}

.starter-list{display:flex;flex-direction:column;gap:9px;margin-bottom:1.4rem}
.starter-row{display:flex;align-items:center;gap:14px;padding:12px 15px;background:#1a1a1c;border:1px solid rgba(255,255,255,.06);border-radius:14px;cursor:pointer;transition:background .2s,border-color .2s;text-align:left}
.ob-root.light .starter-row{background:#f8f9fa;border-color:#e0e0e0}
.starter-row:hover{background:#222225;border-color:rgba(255,255,255,.15)}
.starter-row.selected{background:rgba(124,58,237,.1);border-color:#7c3aed}
.starter-row:focus-visible{outline:2px solid #7c3aed;outline-offset:2px}
.sr-icon{width:38px;height:38px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:15px;border:1px solid transparent;flex-shrink:0}
.sr-info{flex:1;min-width:0}
.sr-title{font-size:13.5px;font-weight:700;color:#fff;margin-bottom:2px}
.ob-root.light .sr-title{color:#1a1a2e}
.sr-sub{font-size:11.5px;color:var(--text-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sr-check{color:#a78bfa;font-size:14px;flex-shrink:0}

.divider-or{display:flex;align-items:center;gap:12px;margin-bottom:1.4rem;color:var(--text-3);font-size:11.5px;font-weight:600;text-transform:uppercase;letter-spacing:1px}
.divider-or::before,.divider-or::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.08)}

.custom-box{display:flex;align-items:center;gap:12px;padding:13px 16px;background:#1a1a1c;border:1px solid rgba(255,255,255,.1);border-radius:14px;transition:border-color .2s,background .2s}
.custom-box i{color:var(--text-3);font-size:15px}
.custom-box input{flex:1;min-width:0;background:none;border:none;color:#fff;font-size:14px;outline:none}
.custom-box.active{border-color:#7c3aed;background:rgba(124,58,237,.05)}

/* Buttons: flat solid colors, no gradients */
.ob-actions{display:flex;gap:12px;margin-top:.5rem}
.ob-next-btn,.ob-finish-btn{flex:1;padding:14px;background:#6d28d9;border-radius:12px;color:#fff;font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .2s,transform .2s}
.ob-next-btn:hover:not(:disabled),.ob-finish-btn:hover:not(:disabled){background:#7c3aed;transform:translateY(-2px)}
.ob-next-btn:disabled,.ob-finish-btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.ob-back-btn{padding:14px 22px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:var(--text-2);font-weight:600;font-size:15px;transition:background .2s,color .2s;white-space:nowrap}
.ob-back-btn:hover{background:rgba(255,255,255,.1);color:#fff}

.ob-footer-text{margin-top:1.75rem;font-size:12.5px;color:var(--text-3);font-weight:500;z-index:2;text-align:center}

.ob-slide-enter-active,.ob-slide-leave-active{transition:opacity .35s ease,transform .35s cubic-bezier(.4,0,.2,1)}
.ob-slide-enter-from{opacity:0;transform:translateX(24px)}
.ob-slide-leave-to{opacity:0;transform:translateX(-24px)}

/* ═══════════ Responsive breakpoints ═══════════ */
@media(max-width:640px){
  .ob-card{border-radius:16px}
  .ob-step-header{gap:12px;margin-bottom:1.25rem}
  .ob-step-badge{width:44px;height:44px;font-size:18px}
  .ob-actions{flex-direction:column-reverse;gap:8px}
  .ob-back-btn{width:100%;text-align:center}
  .ob-header{padding:1.1rem 0 .9rem;gap:12px}
  .ob-step-dot{width:24px;height:24px;font-size:11px}
  .starter-list{gap:7px}
  .starter-row{padding:10px 12px;gap:10px}
  .custom-box{padding:11px 13px}
  .divider-or{margin-bottom:1.1rem}
  .option-card{padding:11px 6px;gap:7px}
  .oc-icon{width:36px;height:36px;font-size:14px}
  .oc-label{font-size:11px}
}

@media(max-width:380px){
  .ob-brand span{font-size:13px}
  .ob-step-dot{width:21px;height:21px;font-size:10px}
  .ob-step-line{margin:0 4px}
  .cols4,.cols3{grid-template-columns:repeat(2,1fr)}
}

/* Landscape / short-height phones: keep everything reachable without clipping */
@media(max-height:560px) and (orientation:landscape){
  .ob-header{padding:.6rem 0}
  .ob-step-header{margin-bottom:1rem}
  .option-grid,.starter-list{margin-bottom:1rem}
}
</style>
