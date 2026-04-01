<template>
  <div class="ob-root" :class="{ light: isLight }">
    <div class="ob-bg">
      <div class="ob-orb ob-orb1"></div>
      <div class="ob-orb ob-orb2"></div>
      <div class="ob-grid"></div>
      <!-- Animated particles -->
      <div v-for="i in 12" :key="i" class="particle" :style="particleStyle(i)"></div>
    </div>

    <!-- Header -->
    <div class="ob-header">
      <div class="ob-brand">
        <img src="/logo.png" alt="KinyaBot" class="ob-brand-logo" />
        <span>KinyaBot</span>
      </div>
      <!-- Progress bar -->
      <div class="ob-progress-bar">
        <div class="ob-progress-fill" :style="{ width: ((step-1)/totalSteps*100) + '%' }"></div>
      </div>
      <div class="ob-step-text">{{ step }} / {{ totalSteps }}</div>
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
            <input v-model="form.name" type="text" class="ob-input" placeholder="Enter your name..." @keyup.enter="form.name && (step=2)" />
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
              <div class="oc-icon" :style="{ background: 'rgba(79,70,229,.12)', borderColor: 'rgba(79,70,229,.25)' }">
                <i :class="p.icon" style="color:#c4b5fd"></i>
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
  const size = 4 + (i % 4) * 3
  return {
    width: size + 'px', height: size + 'px',
    left: (5 + i * 8) + '%', top: (10 + (i * 7) % 80) + '%',
    animationDelay: (i * 0.4) + 's',
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
  { id:'code',      icon:'fas fa-code',        title:'Generate Code',      sub:'Build something with AI', color:'#c4b5fd', bg:'rgba(79,70,229,.12)',   border:'rgba(79,70,229,.25)',  prompt:'Write me a complete, responsive HTML/CSS landing page with a modern dark theme and smooth animations.' },
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
    router.push('/chat')
  } catch {
    router.push('/chat')
  } finally { saving.value = false }
}
</script>

<style scoped>
.ob-root{min-height:100vh;width:100vw;background:#0d0d0f;display:flex;flex-direction:column;align-items:center;padding:0 1rem 2rem;position:relative;overflow:hidden}
.ob-root.light{background:#f0f2f5}

.ob-bg{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.ob-orb{position:absolute;border-radius:50%;filter:blur(100px);opacity:.1}
.ob-orb1{width:600px;height:600px;background:linear-gradient(135deg,#4f46e5,#a855f7);top:-150px;left:-150px}
.ob-orb2{width:500px;height:500px;background:linear-gradient(135deg,#ec4899,#a855f7);bottom:-100px;right:-100px}
.ob-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(109,40,217,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(109,40,217,.025) 1px,transparent 1px);background-size:52px 52px}
.particle{position:absolute;border-radius:50%;background:rgba(109,40,217,.4);animation:float ease-in-out infinite alternate}
@keyframes float{from{transform:translateY(0) scale(1);opacity:.4}to{transform:translateY(-20px) scale(1.3);opacity:.1}}

/* Header */
.ob-header{width:100%;max-width:700px;display:flex;align-items:center;gap:16px;padding:1.25rem 0;z-index:2}
.ob-brand{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:var(--text-1);margin-right:auto}
.ob-brand-logo{width:28px;height:28px;border-radius:7px;object-fit:contain}
.ob-root.light .ob-brand{color:#202124}
.ob-progress-bar{flex:1;height:4px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden}
.ob-progress-fill{height:100%;background:linear-gradient(90deg,#4f46e5,#a855f7);transition:width .4s cubic-bezier(.4,0,.2,1)}
.ob-step-text{font-size:12px;font-weight:600;color:var(--text-3)}

.ob-card{width:100%;max-width:700px;background:#111112;border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:2.5rem;z-index:2;box-shadow:0 20px 50px rgba(0,0,0,.3)}
.ob-root.light .ob-card{background:#fff;border-color:#e0e0e0;box-shadow:0 10px 30px rgba(0,0,0,.05)}

.ob-step-header{display:flex;gap:20px;margin-bottom:2rem}
.ob-step-badge{width:56px;height:56px;border-radius:16px;background:rgba(109,40,217,.15);border:1px solid rgba(109,40,217,.3);display:flex;align-items:center;justify-content:center;font-size:24px;color:#c4b5fd;flex-shrink:0}
.ob-step-badge.star{background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.3);color:#fcd34d}

.ob-title{font-size:24px;font-weight:700;color:#fff;margin-bottom:8px}
.ob-root.light .ob-title{color:#1a1a2e}
.highlight{background:linear-gradient(135deg,#818cf8,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.ob-desc{font-size:15px;color:var(--text-2);line-height:1.5}
.ob-root.light .ob-desc{color:#5f6368}

.input-group{margin-bottom:2rem}
.ob-input{width:100%;padding:16px 20px;background:#1a1a1c;border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;font-size:16px;outline:none;transition:all .2s}
.ob-input:focus{border-color:#6d28d9;box-shadow:0 0 0 4px rgba(109,40,217,.15)}
.ob-root.light .ob-input{background:#f8f9fa;border-color:#dadce0;color:#202124}

.option-grid{display:grid;gap:12px;margin-bottom:2rem}
.cols4{grid-template-columns:repeat(4,1fr)}
.cols3{grid-template-columns:repeat(3,1fr)}
@media(max-width:600px){.cols4,.cols3{grid-template-columns:repeat(2,1fr)}}

.option-card{background:#1a1a1c;border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:16px;display:flex;flex-direction:column;align-items:center;gap:12px;cursor:pointer;transition:all .2s;position:relative}
.ob-root.light .option-card{background:#f8f9fa;border-color:#e0e0e0}
.option-card:hover{background:#222225;transform:translateY(-2px)}
.ob-root.light .option-card:hover{background:#f1f3f4}
.option-card.selected{background:rgba(109,40,217,.1);border-color:#6d28d9;box-shadow:0 0 0 1px #6d28d9}

.oc-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;border:1px solid transparent}
.oc-label{font-size:13px;font-weight:600;color:var(--text-1)}
.ob-root.light .oc-label{color:#202124}
.oc-check{position:absolute;top:8px;right:8px;width:18px;height:18px;background:#6d28d9;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff}

.starter-list{display:flex;flex-direction:column;gap:10px;margin-bottom:1.5rem}
.starter-row{display:flex;align-items:center;gap:16px;padding:12px 16px;background:#1a1a1c;border:1px solid rgba(255,255,255,.06);border-radius:14px;cursor:pointer;transition:all .2s;text-align:left}
.ob-root.light .starter-row{background:#f8f9fa;border-color:#e0e0e0}
.starter-row:hover{background:#222225;border-color:rgba(255,255,255,.15)}
.starter-row.selected{background:rgba(109,40,217,.1);border-color:#6d28d9}
.sr-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;border:1px solid transparent;flex-shrink:0}
.sr-info{flex:1}
.sr-title{font-size:14px;font-weight:700;color:#fff;margin-bottom:2px}
.ob-root.light .sr-title{color:#1a1a2e}
.sr-sub{font-size:12px;color:var(--text-3)}
.sr-check{color:#6d28d9;font-size:14px}

.divider-or{display:flex;align-items:center;gap:12px;margin-bottom:1.5rem;color:var(--text-3);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px}
.divider-or::before,.divider-or::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.08)}

.custom-box{display:flex;align-items:center;gap:12px;padding:12px 16px;background:#1a1a1c;border:1px solid rgba(255,255,255,.1);border-radius:14px;transition:all .2s}
.custom-box i{color:var(--text-3);font-size:16px}
.custom-box input{flex:1;background:none;border:none;color:#fff;font-size:14px;outline:none}
.custom-box.active{border-color:#6d28d9;background:rgba(109,40,217,.05)}

.ob-actions{display:flex;gap:12px;margin-top:1rem}
.ob-next-btn,.ob-finish-btn{flex:1;padding:14px;background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:12px;color:#fff;font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s;box-shadow:0 4px 15px rgba(79,70,229,.3)}
.ob-next-btn:hover:not(:disabled),.ob-finish-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 20px rgba(79,70,229,.4)}
.ob-next-btn:disabled,.ob-finish-btn:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
.ob-back-btn{padding:14px 24px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:var(--text-2);font-weight:600;font-size:15px;transition:all .2s}
.ob-back-btn:hover{background:rgba(255,255,255,.1);color:#fff}

.ob-footer-text{margin-top:2rem;font-size:13px;color:var(--text-3);font-weight:500;z-index:2}

.ob-slide-enter-active,.ob-slide-leave-active{transition:all .4s cubic-bezier(.4,0,.2,1)}
.ob-slide-enter-from{opacity:0;transform:translateX(30px)}
.ob-slide-leave-to{opacity:0;transform:translateX(-30px)}
</style>
