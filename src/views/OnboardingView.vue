<template>
  <div class="ob-root" :class="{ light: isLight }">
    <div class="ob-bg">
      <div class="ob-orb ob-orb1"></div>
      <div class="ob-orb ob-orb2"></div>
      <div class="ob-grid"></div>
      <div v-for="i in 12" :key="i" class="particle" :style="particleStyle(i)"></div>
    </div>

    <!-- Header -->
    <div class="ob-header" v-if="step !== 6">
      <div class="ob-brand">
        <img src="/logo.png" alt="" class="ob-brand-logo" />
        <span>KinyaBot</span>
      </div>
      <div class="ob-header-progress">
        <span class="ob-step-text">Step {{ stepPos }} of {{ totalSteps }}</span>
        <div class="ob-progress-bar" role="progressbar" :aria-valuenow="stepPos" :aria-valuemax="totalSteps" aria-label="Onboarding progress">
          <div class="ob-progress-fill" :style="{ width: (stepPos/totalSteps*100) + '%' }"></div>
        </div>
      </div>
      <button class="ob-exit" type="button" @click="exitOnboarding">Sign out</button>
    </div>

    <div class="ob-card" :class="{ wide: step === 1 }">
      <!-- Step 1: Personal details + usage type + workspace + use-cases -->
      <transition name="ob-slide" mode="out-in">
        <div v-if="step===1" key="s1" class="ob-step">
          <div class="ob-step-header">
            <div class="ob-step-badge"><i class="fas fa-user"></i></div>
            <div>
              <h1 class="ob-title">Tell us about yourself</h1>
              <p class="ob-desc">KinyaBot adapts to how you work — solo, with a team, or across an organization.</p>
            </div>
          </div>

          <div class="ob-section-label">Personal details</div>
          <div class="name-row">
            <label class="ob-field">
              <span class="ob-field-label">First name</span>
              <input v-model="form.firstName" type="text" class="ob-input" placeholder="First name" autocomplete="given-name" />
            </label>
            <label class="ob-field">
              <span class="ob-field-label">Last name <small>Optional</small></span>
              <input v-model="form.lastName" type="text" class="ob-input" placeholder="Last name" autocomplete="family-name" />
            </label>
          </div>

          <div class="ob-section-label">How do you plan to use KinyaBot?</div>
          <div class="usage-grid">
            <button v-for="u in usageTypes" :key="u.id" class="usage-card" type="button"
              :class="{ selected: form.usageType === u.id }" :aria-pressed="form.usageType === u.id" @click="form.usageType = u.id">
              <span class="usage-check"><i v-if="form.usageType===u.id" class="fas fa-check"></i></span>
              <i :class="u.icon"></i><span>{{ u.label }}</span>
            </button>
          </div>

          <transition name="ob-fade">
            <div v-if="form.usageType === 'team' || form.usageType === 'organization'">
              <div class="ob-section-label">Choose your workspace name</div>
              <label class="ob-field">
                <span class="ob-field-label">Workspace name</span>
                <input v-model="form.workspaceName" type="text" class="ob-input" placeholder="For example, Acme Studio" autocomplete="organization" />
              </label>
            </div>
          </transition>

          <div class="ob-section-label">What do you want to use KinyaBot for</div>
          <div class="ms" :class="{ open: msOpen }" v-click-away="() => msOpen=false">
            <button type="button" class="ms-trigger" :aria-expanded="msOpen" aria-haspopup="listbox" @click="msOpen = !msOpen">
              <span v-if="!form.useCases.length" class="ms-placeholder">Select any use case(s)</span>
              <span v-else class="ms-tags">
                <span v-for="uc in form.useCases" :key="uc" class="ms-tag" :style="tagStyle(uc)">
                  {{ uc }}
                  <i class="fas fa-xmark" @click.stop="toggleUseCase(uc)"></i>
                </span>
              </span>
              <span v-if="form.useCases.length" class="ms-selected-count">{{ form.useCases.length }} selected</span>
              <i class="fas fa-chevron-down ms-chev"></i>
            </button>
            <div v-if="msOpen" class="ms-panel" role="listbox" aria-label="Use cases" aria-multiselectable="true">
              <div class="ms-hint">select any use cases you want</div>
              <button v-for="uc in useCaseOptions" :key="uc" type="button" class="ms-option"
                :class="{ picked: form.useCases.includes(uc) }" role="option" :aria-selected="form.useCases.includes(uc)" @click="toggleUseCase(uc)">
                <span class="ms-dot" :style="tagStyle(uc)"></span>{{ uc }}
                <i v-if="form.useCases.includes(uc)" class="fas fa-check ms-opt-check"></i>
              </button>
            </div>
          </div>

          <div class="ob-actions">
            <button class="ob-next-btn" :disabled="!canContinueStep1" @click="goNext">
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
              <h1 class="ob-title">Welcome, <span class="highlight">{{ form.firstName || 'friend' }}</span>!</h1>
              <p class="ob-desc">How did you discover KinyaBot? This helps us reach more people like you.</p>
            </div>
          </div>
          <div class="option-grid cols4">
            <button v-for="s in referralSources" :key="s.id" class="option-card"
              :class="{ selected: form.referral === s.id }" :aria-pressed="form.referral === s.id" @click="form.referral = s.id">
              <div class="oc-icon" :style="{ background: s.bg, borderColor: s.border }">
                <i :class="s.icon" :style="{ color: s.color }"></i>
              </div>
              <span class="oc-label">{{ s.label }}</span>
              <div class="oc-check" v-if="form.referral === s.id"><i class="fas fa-check"></i></div>
            </button>
          </div>
          <div class="ob-actions">
            <button class="ob-back-btn" @click="goBack"><i class="fas fa-arrow-left"></i> Back</button>
            <button class="ob-next-btn" :disabled="!form.referral" @click="goNext">
              Next <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </transition>

      <!-- Step 3: Role -->
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
              :class="{ selected: form.profession === p.id }" :aria-pressed="form.profession === p.id" @click="form.profession = p.id">
              <div class="oc-icon" :style="{ background: 'rgba(99,102,241,.12)', borderColor: 'rgba(99,102,241,.25)' }">
                <i :class="p.icon" style="color:var(--brand-text)"></i>
              </div>
              <span class="oc-label">{{ p.label }}</span>
              <div class="oc-check" v-if="form.profession === p.id"><i class="fas fa-check"></i></div>
            </button>
          </div>
          <div class="ob-actions">
            <button class="ob-back-btn" @click="goBack"><i class="fas fa-arrow-left"></i> Back</button>
            <button class="ob-next-btn" :disabled="!form.profession" @click="goNext">
              Next <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </transition>

      <!-- Step 4: Invite teammates (team / organization only) -->
      <transition name="ob-slide" mode="out-in">
        <div v-if="step===4" key="s4" class="ob-step invite-step">
          <div class="ob-step-header center">
            <div>
              <h1 class="ob-title">Time to invite your teammates</h1>
              <p class="ob-desc">Invite your teammates to KinyaBot and start collaborating<template v-if="form.workspaceName"> on your workspace <strong>{{ form.workspaceName }}</strong></template>.</p>
            </div>
          </div>

          <div class="invite-row">
            <input v-model="inviteEmail" type="email" class="ob-input" placeholder="Teammate email address" @keyup.enter="sendInvite" />
            <button class="invite-btn" :disabled="!inviteEmail || inviting" @click="sendInvite">
              <i v-if="inviting" class="fas fa-spinner fa-spin"></i>
              {{ inviting ? 'Sending…' : 'Send invitation' }}
            </button>
          </div>
          <transition name="ob-fade"><div v-if="inviteError" class="invite-notice err">{{ inviteError }}</div></transition>

          <div class="invite-list">
            <div class="invite-member">
              <span class="invite-avatar owner">{{ initials(fullName) }}</span>
              <span class="invite-name">{{ fullName || 'You' }} <b>Owner</b></span>
              <span class="invite-email">{{ auth.user?.email }}</span>
            </div>
            <div v-for="(m, i) in invited" :key="i" class="invite-member">
              <span class="invite-avatar" :style="{ background: avatarColor(i) }">{{ initials(m) }}</span>
              <span class="invite-email">{{ m }}</span>
              <i class="fas fa-check-circle invite-sent-ic"></i>
            </div>
          </div>

          <div class="ob-actions">
            <button class="ob-back-btn" @click="goBack"><i class="fas fa-arrow-left"></i> Back</button>
            <button class="ob-next-btn" @click="goNext">
              Next <i class="fas fa-arrow-right"></i>
            </button>
          </div>
        </div>
      </transition>

      <!-- Step 5: First topic -->
      <transition name="ob-slide" mode="out-in">
        <div v-if="step===5" key="s5" class="ob-step">
          <div class="ob-step-header">
            <div class="ob-step-badge star"><i class="fas fa-rocket"></i></div>
            <div>
              <h1 class="ob-title">Ready to launch!</h1>
              <p class="ob-desc">Pick your first topic or type a custom question to get started instantly.</p>
            </div>
          </div>

          <div class="starter-list">
            <button v-for="s in starters" :key="s.id" class="starter-row"
              :class="{ selected: form.firstPrompt === s.prompt }" :aria-pressed="form.firstPrompt === s.prompt"
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
            <button class="ob-back-btn" @click="goBack"><i class="fas fa-arrow-left"></i> Back</button>
            <button class="ob-finish-btn" :disabled="!form.firstPrompt" @click="goNext">
              <i class="fas fa-rocket"></i> Start Chatting
            </button>
          </div>
        </div>
      </transition>

      <!-- Step 6: Personalizing your AI… -->
      <transition name="ob-slide" mode="out-in">
        <div v-if="step===6" key="s6" class="ob-step loading-step">
          <h1 class="ob-title">Personalizing your AI…</h1>
          <p class="ob-desc">This only takes a moment.</p>
          <div class="load-card">
            <div v-for="(l, i) in loadLines" :key="l.key" class="load-row" :class="{ done: loadStage > i, active: loadStage === i }">
              <span class="load-ic">
                <i v-if="loadStage > i" class="fas fa-check"></i>
                <i v-else-if="loadStage === i" class="fas fa-circle-notch fa-spin"></i>
              </span>
              <div>
                <div class="load-title">{{ l.title }}</div>
                <div class="load-sub">{{ l.sub }}</div>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <div class="ob-footer-text" v-if="step !== 6" aria-live="polite">
      <div class="ob-step-dots" role="progressbar" :aria-valuenow="stepPos" :aria-valuemax="totalSteps" aria-label="Onboarding steps">
        <span v-for="n in totalSteps" :key="n" class="ob-step-dot" :class="{ complete: n < stepPos, current: n === stepPos }"></span>
      </div>
      <span>{{ stepPos === totalSteps - 1 ? 'One last step' : 'Your preferences help personalize KinyaBot' }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { isLightMode } from '../theme'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'

const router = useRouter()
const auth = useAuthStore()
const chatStore = useChatStore()

const step = ref(1)
const customPrompt = ref('')
const isLight = isLightMode

const existingName = (auth.user?.username || '').trim().split(/\s+/)
const form = reactive({
  firstName: existingName[0] || '',
  lastName: existingName.slice(1).join(' ') || '',
  usageType: '',
  workspaceName: '',
  useCases: [],
  referral: '',
  profession: '',
  firstPrompt: '',
})
const fullName = computed(() => [form.firstName, form.lastName].filter(Boolean).join(' '))
const canContinueStep1 = computed(() =>
  form.firstName.trim() &&
  form.usageType &&
  (!['team', 'organization'].includes(form.usageType) || form.workspaceName.trim())
)

/* Step flow — the "invite teammates" step only makes sense for team /
   organization workspaces, so solo users skip straight past it.        */
const steps = computed(() => {
  const s = [1, 2, 3]
  if (form.usageType === 'team' || form.usageType === 'organization') s.push(4)
  s.push(5, 6)
  return s
})
const stepPos = computed(() => steps.value.indexOf(step.value) + 1)
const totalSteps = computed(() => steps.value.length)
function goNext() { const i = steps.value.indexOf(step.value); if (i < steps.value.length - 1) step.value = steps.value[i + 1] }
function goBack() { const i = steps.value.indexOf(step.value); if (i > 0) step.value = steps.value[i - 1] }
function exitOnboarding() {
  auth.logout()
  router.replace('/login')
}

function particleStyle(i) {
  const size = 4 + (i % 4) * 3
  return {
    width: size + 'px', height: size + 'px',
    left: (5 + i * 8) + '%', top: (10 + (i * 7) % 80) + '%',
    animationDelay: (i * 0.4) + 's',
    animationDuration: (4 + i % 3) + 's'
  }
}

/* Usage type */
const usageTypes = [
  { id: 'personal',     icon: 'fas fa-user',          label: 'Personal use' },
  { id: 'team',         icon: 'fas fa-people-group',  label: 'Team' },
  { id: 'organization', icon: 'fas fa-building',      label: 'Organization' },
  { id: 'other',        icon: 'fas fa-ellipsis',      label: 'Other' },
]

/* Use cases — custom multi-select with coloured tags */
const useCaseOptions = ['Coding & debugging', 'Writing & editing', 'Research', 'Learning a topic', 'Customer support', 'Content creation', 'Data analysis', 'Personal productivity', 'Just exploring']
const tagPalette = ['#a7f3d0', '#fde68a', 'var(--brand-text)', '#99f6e4', '#fbcfe8', '#bfdbfe', '#fecaca', '#fed7aa', '#d9f99d']
function tagStyle(uc) {
  const idx = useCaseOptions.indexOf(uc)
  const bg = tagPalette[idx % tagPalette.length]
  return { background: bg + '26', color: bg, borderColor: bg + '55' }
}
const msOpen = ref(false)
function toggleUseCase(uc) {
  const i = form.useCases.indexOf(uc)
  if (i === -1) form.useCases.push(uc); else form.useCases.splice(i, 1)
}
// minimal click-away directive (no external library)
const vClickAway = {
  mounted(el, binding) {
    el._caHandler = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('mousedown', el._caHandler)
  },
  unmounted(el) { document.removeEventListener('mousedown', el._caHandler) }
}

/* Invite teammates */
const inviteEmail = ref('')
const inviting = ref(false)
const inviteError = ref('')
const invited = ref([])
function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
}
const avatarPalette = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', 'var(--brand-text)']
function avatarColor(i) { return avatarPalette[i % avatarPalette.length] }
async function sendInvite() {
  if (!inviteEmail.value || inviting.value) return
  inviting.value = true
  inviteError.value = ''
  try {
    const data = await auth.inviteTeammate(inviteEmail.value.trim())
    if (data?.success === false) {
      inviteError.value = data.message || 'Could not send the invitation.'
    } else {
      invited.value.push(inviteEmail.value.trim())
      inviteEmail.value = ''
    }
  } catch (err) {
    inviteError.value = err.response?.data?.error || 'Could not send the invitation.'
  } finally {
    inviting.value = false
  }
}

const referralSources = [
  { id:'google',    icon:'fab fa-google',     label:'Google',      color:'#ea4335', bg:'rgba(234,67,53,.1)',   border:'rgba(234,67,53,.25)' },
  { id:'instagram', icon:'fab fa-instagram',  label:'Instagram',   color:'#e1306c', bg:'rgba(225,48,108,.1)',  border:'rgba(225,48,108,.25)' },
  { id:'twitter',   icon:'fab fa-x-twitter',  label:'Twitter / X', color:'#e3e3e3', bg:'rgba(255,255,255,.06)', border:'rgba(255,255,255,.12)' },
  { id:'tiktok',    icon:'fab fa-tiktok',      label:'TikTok',      color:'#69c9d0', bg:'rgba(105,201,208,.1)', border:'rgba(105,201,208,.25)' },
  { id:'youtube',   icon:'fab fa-youtube',    label:'YouTube',     color:'#ff0000', bg:'rgba(255,0,0,.1)',     border:'rgba(255,0,0,.25)' },
  { id:'linkedin',  icon:'fab fa-linkedin',   label:'LinkedIn',    color:'#0a66c2', bg:'rgba(10,102,194,.1)',  border:'rgba(10,102,194,.25)' },
  { id:'friend',    icon:'fas fa-user-group', label:'Friend',      color:'var(--success)', bg:'rgba(52,168,83,.1)',   border:'rgba(52,168,83,.25)' },
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
  { id:'code',      icon:'fas fa-code',        title:'Generate Code',      sub:'Build something with AI', color:'var(--brand-text)', bg:'rgba(99,102,241,.12)',   border:'rgba(99,102,241,.25)',  prompt:'Write me a complete, responsive HTML/CSS landing page with a modern dark theme and smooth animations.' },
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

/* Step 6: run the real save while the checklist animates */
const loadLines = [
  { key: 'pref',  title: 'Understanding preferences', sub: computed(() => `${fullName.value || 'You'} · ${professions.find(p=>p.id===form.profession)?.label || ''}`) },
  { key: 'int',   title: 'Analyzing interests',        sub: computed(() => form.useCases.slice(0,3).join(', ') || 'General use') },
  { key: 'pers',  title: 'Personalizing experience',   sub: 'Tuning tone, depth, and topics' },
  { key: 'ready', title: 'Ready',                      sub: 'Your AI is tuned to you' },
]
const loadStage = ref(0)
let finished = false
async function runFinish() {
  if (finished) return
  finished = true
  const tick = () => new Promise(r => setTimeout(r, 600))
  try {
    await auth.completeOnboarding({
      username: fullName.value || form.firstName,
      referral_source: form.referral,
      profession: form.profession,
      usage_type: form.usageType,
      workspace_name: form.workspaceName,
      use_cases: form.useCases,
    })
    loadStage.value = 1; await tick()
    await chatStore.fetchChats()
    loadStage.value = 2; await tick()
    await chatStore.createChat()
    loadStage.value = 3; await tick()
    if (form.firstPrompt) chatStore.sendMessage(form.firstPrompt)
    loadStage.value = 4; await tick()
  } catch {
    loadStage.value = 4
  } finally {
    router.push('/')
  }
}
onMounted(() => { if (step.value === 6) runFinish() })
watch(step, (v) => { if (v === 6) runFinish() })
</script>

<style scoped>
.ob-root{min-height:100vh;min-height:100dvh;width:100%;background:var(--background);display:flex;flex-direction:column;align-items:center;padding:0 1rem 1rem;position:relative;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
.ob-root.light{background:var(--background)}

.ob-bg{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.ob-orb{position:absolute;border-radius:50%;filter:blur(100px);opacity:.1}
.ob-orb1{width:600px;height:600px;background:linear-gradient(135deg,var(--brand-strong),var(--accent-violet));top:-150px;left:-150px}
.ob-orb2{width:500px;height:500px;background:linear-gradient(135deg,#ec4899,var(--accent-violet));bottom:-100px;right:-100px}
.ob-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(99,102,241,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.025) 1px,transparent 1px);background-size:52px 52px}
.particle{position:absolute;border-radius:50%;background:rgba(99,102,241,.4);animation:float ease-in-out infinite alternate}
@keyframes float{from{transform:translateY(0) scale(1);opacity:.4}to{transform:translateY(-20px) scale(1.3);opacity:.1}}

.ob-header{width:100%;max-width:700px;display:flex;align-items:center;gap:16px;padding:1.25rem 0;z-index:2}
.ob-brand{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:var(--text-1);margin-right:auto}
.ob-brand-logo{width:28px;height:28px;border-radius:7px;object-fit:contain}
.ob-root.light .ob-brand{color:var(--text-1)}
.ob-progress-bar{flex:1;height:4px;background:rgba(255,255,255,.08);border-radius:99px;overflow:hidden}
.ob-progress-fill{height:100%;background:linear-gradient(90deg,var(--brand-strong),var(--accent-violet));transition:width .4s cubic-bezier(.4,0,.2,1)}
.ob-step-text{font-size:12px;font-weight:600;color:var(--text-3)}
.ob-back-arrow{display:none}
.ob-dashes{display:none}

.ob-card{width:100%;max-width:700px;background:#111112;border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:2.5rem;z-index:2;box-shadow:0 20px 50px rgba(0,0,0,.3);position:relative;transition:max-width .3s}
.ob-card.wide{max-width:620px}
.ob-root.light .ob-card{background:#fff;border-color:var(--border);box-shadow:0 10px 30px rgba(0,0,0,.05)}

.ob-step-header{display:flex;gap:20px;margin-bottom:1.75rem}
.ob-step-header.center{justify-content:center;text-align:center;margin-bottom:1.5rem}
.ob-step-badge{width:56px;height:56px;border-radius:16px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);display:flex;align-items:center;justify-content:center;font-size:24px;color:var(--brand-text);flex-shrink:0}
.ob-step-badge.star{background:rgba(245,158,11,.15);border-color:rgba(245,158,11,.3);color:var(--warning)}

.ob-title{font-size:24px;font-weight:700;color:#fff;margin-bottom:8px}
.ob-root.light .ob-title{color:var(--text-1)}
.highlight{background:linear-gradient(135deg,var(--brand-text),var(--accent-violet));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.ob-desc{font-size:15px;color:var(--text-2);line-height:1.5}
.ob-root.light .ob-desc{color:var(--text-2)}

.ob-section-label{font-size:13px;font-weight:700;color:var(--text-1);margin:1.3rem 0 .6rem}
.ob-section-label:first-of-type{margin-top:0}

.name-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.ob-input{width:100%;padding:14px 16px;background:var(--surface-secondary);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;font-size:14.5px;outline:none;transition:all .2s}
.ob-input:focus{border-color:var(--brand-text);box-shadow:0 0 0 4px rgba(99,102,241,.15)}
.ob-root.light .ob-input{background:var(--background);border-color:var(--border);color:var(--text-1)}

.usage-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
@media(max-width:600px){.usage-grid{grid-template-columns:repeat(2,1fr)}}
.usage-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;padding:16px 10px;background:var(--surface-secondary);border:1.5px solid rgba(255,255,255,.08);border-radius:14px;color:var(--text-2);font-size:12.5px;font-weight:600;transition:all .2s}
.ob-root.light .usage-card{background:var(--background);border-color:var(--border)}
.usage-card i{font-size:17px;color:var(--brand-text)}
.usage-card:hover{border-color:rgba(99,102,241,.4)}
.usage-card.selected{border-color:var(--brand-text);background:rgba(99,102,241,.12);color:#fff}
.ob-root.light .usage-card.selected{color:var(--text-1)}
.usage-check{position:absolute;top:8px;right:8px;width:16px;height:16px;border-radius:50%;border:1.5px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff}
.usage-card.selected .usage-check{background:var(--brand-text);border-color:var(--brand-text)}

.ms{position:relative}
.ms-trigger{width:100%;min-height:50px;padding:10px 40px 10px 14px;background:var(--surface-secondary);border:1px solid rgba(255,255,255,.1);border-radius:12px;display:flex;align-items:center;flex-wrap:wrap;gap:6px;text-align:left;position:relative;transition:border-color .2s}
.ob-root.light .ms-trigger{background:var(--background);border-color:var(--border)}
.ms.open .ms-trigger{border-color:var(--brand-text)}
.ms-placeholder{color:var(--text-3);font-size:14px}
.ms-tags{display:flex;flex-wrap:wrap;gap:6px}
.ms-tag{display:inline-flex;align-items:center;gap:6px;padding:4px 8px;border-radius:7px;font-size:12px;font-weight:600;border:1px solid}
.ms-tag i{font-size:9px;cursor:pointer;opacity:.7}
.ms-tag i:hover{opacity:1}
.ms-chev{position:absolute;right:14px;top:50%;transform:translateY(-50%);color:var(--text-3);font-size:12px;pointer-events:none}
.ms-panel{position:absolute;top:calc(100% + 6px);left:0;right:0;background:var(--surface-secondary);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:6px;z-index:10;box-shadow:0 12px 30px rgba(0,0,0,.4);max-height:260px;overflow-y:auto}
.ob-root.light .ms-panel{background:#fff;border-color:var(--border)}
.ms-hint{font-size:11px;color:var(--text-3);padding:8px 10px 4px}
.ms-option{width:100%;display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;font-size:13.5px;color:var(--text-1);text-align:left;transition:background .15s;background:none;border:none}
.ms-option:hover{background:rgba(255,255,255,.06)}
.ob-root.light .ms-option:hover{background:var(--surface-secondary)}
.ms-option.picked{font-weight:600}
.ms-dot{width:9px;height:9px;border-radius:50%;flex-shrink:0;border:1px solid}
.ms-opt-check{margin-left:auto;color:var(--brand-text);font-size:11px}

.ob-fade-enter-active,.ob-fade-leave-active{transition:opacity .2s,max-height .25s}
.ob-fade-enter-from,.ob-fade-leave-to{opacity:0}

.option-grid{display:grid;gap:12px;margin-bottom:2rem}
.cols4{grid-template-columns:repeat(4,1fr)}
.cols3{grid-template-columns:repeat(3,1fr)}
@media(max-width:600px){.cols4,.cols3{grid-template-columns:repeat(2,1fr)}}
@media(max-width:340px){.cols4,.cols3{grid-template-columns:1fr 1fr}.ob-card{padding:1rem .85rem}}

.option-card{background:var(--surface-secondary);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:16px;display:flex;flex-direction:column;align-items:center;gap:12px;cursor:pointer;transition:all .2s;position:relative}
.ob-root.light .option-card{background:var(--background);border-color:var(--border)}
.option-card:hover{background:#222225;transform:translateY(-2px)}
.ob-root.light .option-card:hover{background:var(--surface-secondary)}
.option-card.selected{background:rgba(99,102,241,.1);border-color:var(--brand-text);box-shadow:0 0 0 1px var(--brand-text)}

.oc-icon{width:44px;height:44px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:18px;border:1px solid transparent}
.oc-label{font-size:13px;font-weight:600;color:var(--text-1)}
.ob-root.light .oc-label{color:var(--text-1)}
.oc-check{position:absolute;top:8px;right:8px;width:18px;height:18px;background:var(--brand-text);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff}

.invite-step{text-align:center}
.invite-row{display:flex;gap:10px;margin-bottom:.9rem}
.invite-row .ob-input{flex:1}
.invite-btn{flex-shrink:0;padding:0 20px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:12px;color:var(--text-1);font-weight:700;font-size:13.5px;transition:background .2s}
.invite-btn:hover:not(:disabled){background:rgba(255,255,255,.14)}
.invite-btn:disabled{opacity:.5}
.invite-notice{font-size:12.5px;color:var(--red);margin-bottom:.9rem;text-align:left}
.invite-list{display:flex;flex-direction:column;gap:8px;text-align:left;margin-bottom:1rem}
.invite-member{display:flex;align-items:center;gap:12px;padding:12px 14px;background:var(--surface-secondary);border:1px solid rgba(255,255,255,.06);border-radius:12px}
.ob-root.light .invite-member{background:var(--background);border-color:var(--border)}
.invite-avatar{width:32px;height:32px;border-radius:50%;background:var(--brand-text);color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0}
.invite-avatar.owner{background:var(--brand-strong)}
.invite-name{font-size:13.5px;font-weight:600;color:var(--text-1)}
.invite-name b{font-weight:700;color:var(--purple);margin-left:6px;font-size:11px}
.invite-email{font-size:12.5px;color:var(--text-3);margin-left:auto}
.invite-sent-ic{color:var(--success);font-size:14px}

.starter-list{display:flex;flex-direction:column;gap:10px;margin-bottom:1.5rem}
.starter-row{display:flex;align-items:center;gap:16px;padding:12px 16px;background:var(--surface-secondary);border:1px solid rgba(255,255,255,.06);border-radius:14px;cursor:pointer;transition:all .2s;text-align:left}
.ob-root.light .starter-row{background:var(--background);border-color:var(--border)}
.starter-row:hover{background:#222225;border-color:rgba(255,255,255,.15)}
.starter-row.selected{background:rgba(99,102,241,.1);border-color:var(--brand-text)}
.sr-icon{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;border:1px solid transparent;flex-shrink:0}
.sr-info{flex:1}
.sr-title{font-size:14px;font-weight:700;color:#fff;margin-bottom:2px}
.ob-root.light .sr-title{color:var(--text-1)}
.sr-sub{font-size:12px;color:var(--text-3)}
.sr-check{color:var(--brand-text);font-size:14px}

.divider-or{display:flex;align-items:center;gap:12px;margin-bottom:1.5rem;color:var(--text-3);font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px}
.divider-or::before,.divider-or::after{content:'';flex:1;height:1px;background:rgba(255,255,255,.08)}

.custom-box{display:flex;align-items:center;gap:12px;padding:12px 16px;background:var(--surface-secondary);border:1px solid rgba(255,255,255,.1);border-radius:14px;transition:all .2s}
.custom-box i{color:var(--text-3);font-size:16px}
.custom-box input{flex:1;background:none;border:none;color:#fff;font-size:14px;outline:none}
.custom-box.active{border-color:var(--brand-text);background:rgba(99,102,241,.05)}

.ob-actions{display:flex;gap:12px;margin-top:1.5rem}
.ob-next-btn,.ob-finish-btn{flex:1;padding:14px;background:linear-gradient(135deg,var(--brand-strong),var(--accent-violet));border-radius:12px;color:#fff;font-weight:700;font-size:15px;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .2s;box-shadow:0 4px 15px rgba(99,102,241,.3)}
.ob-next-btn:hover:not(:disabled),.ob-finish-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 6px 20px rgba(99,102,241,.4)}
.ob-next-btn:disabled,.ob-finish-btn:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
.ob-back-btn{padding:14px 24px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:var(--text-2);font-weight:600;font-size:15px;transition:all .2s}
.ob-back-btn:hover{background:rgba(255,255,255,.1);color:#fff}

.loading-step{text-align:center}
.loading-step .ob-title{margin-bottom:4px}
.load-card{margin-top:1.75rem;display:flex;flex-direction:column;gap:4px;text-align:left}
.load-row{display:flex;align-items:center;gap:14px;padding:13px 6px;opacity:.4;transition:opacity .3s}
.load-row.done,.load-row.active{opacity:1}
.load-ic{width:26px;height:26px;border-radius:50%;border:2px solid rgba(99,102,241,.35);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--brand-text);flex-shrink:0}
.load-row.done .load-ic{background:var(--brand-text);border-color:var(--brand-text);color:#fff}
.load-title{font-size:14px;font-weight:700;color:var(--text-1)}
.load-sub{font-size:12px;color:var(--text-3)}

.ob-footer-text{margin-top:2rem;font-size:13px;color:var(--text-3);font-weight:500;z-index:2}

.ob-slide-enter-active,.ob-slide-leave-active{transition:all .4s cubic-bezier(.4,0,.2,1)}
.ob-slide-enter-from{opacity:0;transform:translateX(30px)}
.ob-slide-leave-to{opacity:0;transform:translateX(-30px)}

.ob-root { padding:0 clamp(16px,4vw,56px) 20px; background:var(--bg-base); }
.ob-bg { position:fixed; }
.ob-orb { opacity:.14; filter:blur(120px); }
.ob-orb1 { width:680px; height:680px; top:-310px; left:calc(50% - 340px); background:var(--brand-strong); }
.ob-orb2 { width:480px; height:480px; bottom:-250px; right:-100px; background:var(--accent-violet); opacity:.07; }
.ob-grid { opacity:.55; background-image:linear-gradient(rgba(99,102,241,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(99,102,241,.035) 1px,transparent 1px); }
.particle { background:var(--brand-text); opacity:.18; }

.ob-header { width:100%; max-width:1180px; min-height:76px; padding:14px 0; gap:24px; border-bottom:1px solid var(--border-subtle); }
.ob-brand { gap:10px; font-size:15px; letter-spacing:-.01em; }
.ob-brand-logo { width:32px; height:32px; border-radius:9px; }
.ob-header-progress { width:min(280px,34vw); display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
.ob-progress-bar { flex:none; width:100%; height:5px; background:var(--surface-elevated); }
.ob-progress-fill { background:var(--gradient-brand); }
.ob-step-text { color:var(--text-2); font-size:11px; font-weight:600; }
.ob-exit { padding:8px 12px; border:1px solid var(--border); border-radius:var(--r-sm); background:transparent; color:var(--text-2); font-size:12px; font-weight:600; transition:background .16s,color .16s,border-color .16s; }
.ob-exit:hover { background:var(--bg-hover); color:var(--text-1); border-color:var(--border-strong); }
.ob-exit:focus-visible,.ob-back-btn:focus-visible,.ob-next-btn:focus-visible,.ob-finish-btn:focus-visible,.usage-card:focus-visible,.option-card:focus-visible,.starter-row:focus-visible,.ms-trigger:focus-visible,.ms-option:focus-visible,.invite-btn:focus-visible { outline:2px solid var(--brand-text); outline-offset:3px; }

.ob-card { width:min(100%,760px); max-width:760px; margin:auto; padding:clamp(24px,4vw,42px); background:color-mix(in srgb,var(--surface) 94%,transparent); border:1px solid var(--border); border-radius:var(--r-xl); box-shadow:0 24px 70px rgba(0,0,0,.24); backdrop-filter:blur(16px); }
.ob-card.wide { max-width:760px; }
.ob-step-header { align-items:center; gap:16px; max-width:580px; margin:0 auto 28px; text-align:left; }
.ob-step-header.center { text-align:center; }
.ob-step-badge { width:46px; height:46px; border-radius:14px; flex-shrink:0; background:var(--brand-soft); border:1px solid var(--brand-ring); color:var(--brand-text); font-size:18px; }
.ob-step-badge.star { background:var(--brand-soft); border-color:var(--brand-ring); color:var(--brand-text); }
.ob-title { color:var(--text-1); font-size:clamp(22px,3vw,28px); line-height:1.2; letter-spacing:-.025em; }
.highlight { background:none; color:var(--brand-text); -webkit-text-fill-color:currentColor; }
.ob-desc { color:var(--text-2); font-size:14px; line-height:1.55; }
.ob-section-label { color:var(--text-1); font-size:12.5px; font-weight:600; margin:20px 0 8px; }
.ob-section-label:first-of-type { margin-top:0; }
.name-row { gap:12px; }
.ob-field { display:flex; flex:1; flex-direction:column; gap:6px; min-width:0; }
.ob-field-label { color:var(--text-2); font-size:11px; font-weight:600; }
.ob-field-label small { margin-left:4px; color:var(--text-3); font-weight:400; }
.ob-input { min-height:44px; padding:10px 12px; background:var(--bg-input); border:1px solid var(--border-md); border-radius:var(--r-sm); color:var(--text-1); font-size:13.5px; }
.ob-input::placeholder { color:var(--text-3); }
.ob-input:focus,.custom-box:focus-within { border-color:var(--brand); box-shadow:var(--focus-glow); }
.usage-grid { gap:10px; }
.usage-card { min-height:94px; padding:16px 10px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--r); color:var(--text-2); }
.usage-card i { color:var(--brand-text); }
.usage-card:hover,.option-card:hover,.starter-row:hover { transform:translateY(-2px); background:var(--bg-hover); border-color:var(--border-strong); }
.usage-card.selected,.option-card.selected,.starter-row.selected { background:var(--brand-soft); border-color:var(--brand); color:var(--text-1); box-shadow:0 0 0 1px var(--brand); }
.usage-check { border-color:var(--border-strong); color:var(--on-brand); }
.usage-card.selected .usage-check,.oc-check { background:var(--brand); border-color:var(--brand); }
.ms-trigger { background:var(--bg-input); border-color:var(--border-md); border-radius:var(--r-sm); color:var(--text-1); }
.ms-selected-count { margin-left:auto; color:var(--text-3); font-size:11px; white-space:nowrap; }
.ms-panel { background:var(--surface-elevated); border-color:var(--border); }
.ms-option:hover { background:var(--bg-hover); }
.ms-tag { background:var(--brand-soft)!important; color:var(--brand-text)!important; border-color:var(--brand-ring)!important; }
.ms-dot { background:var(--brand)!important; border-color:var(--brand)!important; }
.option-grid { gap:10px; margin-bottom:0; }
.option-card { min-height:122px; background:var(--bg-card); border-color:var(--border); border-radius:var(--r); }
.option-card.selected { border-color:var(--brand); }
.oc-label { color:var(--text-1); }
.invite-row { gap:8px; }
.invite-row .ob-input { flex:1; }
.invite-btn { min-height:44px; padding:0 16px; background:var(--brand-soft); border:1px solid var(--brand-ring); border-radius:var(--r-sm); color:var(--brand-text); font-weight:600; }
.invite-btn:hover:not(:disabled) { background:var(--brand); color:var(--on-brand); }
.invite-member { background:var(--bg-card); border-color:var(--border); }
.starter-list { gap:8px; margin-bottom:18px; }
.starter-row { min-height:68px; padding:10px 14px; gap:12px; background:var(--bg-card); border-color:var(--border); border-radius:var(--r); }
.sr-title { color:var(--text-1); }
.divider-or { margin:18px 0 12px; }
.divider-or::before,.divider-or::after { background:var(--border); }
.custom-box { min-height:48px; padding:10px 12px; background:var(--bg-input); border-color:var(--border-md); border-radius:var(--r-sm); }
.custom-box input { color:var(--text-1); }
.custom-box input::placeholder { color:var(--text-3); }
.ob-actions { margin-top:28px; }
.ob-next-btn,.ob-finish-btn { min-height:46px; padding:12px 20px; background:var(--brand); border-radius:var(--r-sm); box-shadow:0 8px 22px rgba(99,102,241,.2); }
.ob-next-btn:hover:not(:disabled),.ob-finish-btn:hover:not(:disabled) { background:var(--brand-strong); box-shadow:0 10px 24px rgba(99,102,241,.28); }
.ob-back-btn { min-height:46px; padding:12px 18px; background:transparent; border:1px solid var(--border); border-radius:var(--r-sm); color:var(--text-2); }
.ob-back-btn:hover { background:var(--bg-hover); color:var(--text-1); }
.ob-footer-text { display:flex; flex-direction:column; align-items:center; gap:8px; margin:18px 0 0; text-align:center; color:var(--text-3); font-size:11.5px; }
.ob-step-dots { display:flex; align-items:center; gap:6px; }
.ob-step-dot { width:6px; height:6px; border-radius:50%; background:var(--border-strong); transition:width .2s,background .2s; }
.ob-step-dot.complete { background:var(--brand-text); }
.ob-step-dot.current { width:18px; border-radius:99px; background:var(--brand); }
.load-card { max-width:430px; margin:28px auto 0; padding:14px 18px; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--r); }
.load-row { border-bottom:1px solid var(--border-subtle); }
.load-row:last-child { border-bottom:0; }

@media(max-width:640px){
  .ob-root { padding:0 14px 16px; }
  .ob-header { min-height:64px; padding:10px 0; gap:12px; }
  .ob-header-progress { width:min(180px,42vw); }
  .ob-brand { font-size:13px; gap:7px; }
  .ob-brand-logo { width:28px; height:28px; }
  .ob-exit { padding:7px 9px; font-size:11px; }
  .ob-card,.ob-card.wide { padding:22px 16px; border-radius:var(--r); }
  .ob-step-header,.ob-step-header.center { gap:12px; margin-bottom:22px; text-align:left; }
  .ob-step-badge { width:40px; height:40px; font-size:16px; }
  .ob-title { font-size:20px; }
  .ob-desc { font-size:12.5px; }
  .ob-section-label { margin-top:17px; }
  .name-row { grid-template-columns:1fr 1fr; gap:8px; }
  .ob-field-label { font-size:10px; }
  .ob-input { min-height:42px; padding:9px 10px; font-size:13px; }
  .ms-selected-count { display:none; }
  .usage-grid { grid-template-columns:repeat(2,1fr); }
  .usage-card { min-height:82px; }
  .ob-actions { flex-direction:row; gap:8px; margin-top:22px; }
  .ob-back-btn { width:auto; text-align:center; padding-inline:14px; }
  .ob-next-btn,.ob-finish-btn { width:auto; }
  .option-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
  .option-card { min-height:100px; padding:12px 8px; gap:8px; }
  .oc-icon { width:36px; height:36px; font-size:15px; }
  .oc-label { font-size:11.5px; }
  .invite-row { flex-direction:column; }
  .starter-row { padding:9px 10px; gap:9px; }
  .sr-icon { width:34px; height:34px; }
  .sr-title { font-size:12.5px; }
  .sr-sub { font-size:10.5px; }
}
@media(max-width:360px){
  .ob-root { padding-inline:10px; }
  .ob-card,.ob-card.wide { padding:18px 12px; }
  .name-row { grid-template-columns:1fr; }
  .ob-title { font-size:18px; }
  .ob-step-header { align-items:flex-start; }
  .ob-back-btn,.ob-next-btn,.ob-finish-btn { min-height:42px; font-size:13px; }
}
@media(prefers-reduced-motion:reduce){
  .ob-bg .particle { display:none; }
}
</style>
