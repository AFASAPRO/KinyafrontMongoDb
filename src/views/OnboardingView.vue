<template>
  <div class="onb">
    <!-- Ambient background (CSS-only, reduced-motion aware) -->
    <div class="onb-bg" aria-hidden="true">
      <span class="orb orb-a"></span>
      <span class="orb orb-b"></span>
      <span class="orb orb-c"></span>
    </div>

    <!-- ── Header: brand · segmented progress · sign out ── -->
    <header class="onb-top">
      <div class="brand">
        <img src="/logo.png" alt="" class="brand-logo" />
        <span class="brand-name">KinyaBot</span>
      </div>
      <div v-if="showChrome" class="progress" role="progressbar" :aria-valuenow="stepPos" :aria-valuemin="1" :aria-valuemax="totalSteps" aria-label="Onboarding progress">
        <span class="progress-count">Step {{ stepPos }}/{{ totalSteps }}</span>
        <span class="progress-track">
          <span class="progress-fill" :style="{ width: (stepPos / totalSteps) * 100 + '%' }"></span>
        </span>
      </div>
      <button v-if="showChrome" class="exit" type="button" @click="exitOnboarding">
        <i class="fas fa-right-from-bracket"></i><span class="exit-txt">Sign out</span>
      </button>
      <span v-else class="exit-ghost" aria-hidden="true"></span>
    </header>

    <!-- ── Main column ── -->
    <main class="onb-main">
      <transition name="step" mode="out-in">

        <!-- ═══ STEP 1 · About you ═══ -->
        <section v-if="step === 1" key="s1" class="card">
          <header class="card-head">
            <span class="head-icon"><i class="fas fa-user"></i></span>
            <div>
              <h1 class="title">Welcome to KinyaBot <span class="wave">👋</span></h1>
              <p class="sub">Tell us a little about yourself — we'll shape every conversation around you.</p>
            </div>
          </header>

          <div class="grid-2">
            <label class="field">
              <span>First name</span>
              <input v-model.trim="form.firstName" type="text" placeholder="e.g. Amina" autocomplete="given-name" maxlength="40" />
            </label>
            <label class="field">
              <span>Last name <em>optional</em></span>
              <input v-model.trim="form.lastName" type="text" placeholder="e.g. Uwase" autocomplete="family-name" maxlength="40" />
            </label>
          </div>

          <h2 class="group-label">How will you use KinyaBot?</h2>
          <div class="tile-grid usage" role="radiogroup" aria-label="Usage type">
            <button v-for="u in usageTypes" :key="u.id" type="button" role="radio" :aria-checked="form.usageType === u.id"
              class="tile" :class="{ on: form.usageType === u.id }" @click="form.usageType = u.id">
              <span class="tile-ic" :style="{ color: u.tint }"><i :class="u.icon"></i></span>
              <span class="tile-body">
                <b>{{ u.label }}</b>
                <small>{{ u.hint }}</small>
              </span>
              <span class="tick"><i class="fas fa-check"></i></span>
            </button>
          </div>

          <transition name="reveal">
            <div v-if="needsWorkspace" class="workspace">
              <label class="field">
                <span>Workspace name</span>
                <input ref="wsInput" v-model.trim="form.workspaceName" type="text" placeholder="For example, Acme Studio" autocomplete="organization" maxlength="60" />
              </label>
            </div>
          </transition>

          <h2 class="group-label">What do you want to use it for? <em class="opt">pick any</em></h2>
          <div class="chips" role="group" aria-label="Use cases">
            <button v-for="uc in useCaseOptions" :key="uc" type="button"
              class="chip" :class="{ on: form.useCases.includes(uc) }" :aria-pressed="form.useCases.includes(uc)" @click="toggleUseCase(uc)">
              <i class="fas" :class="useCaseIcons[uc] || 'fa-circle-check'"></i>{{ uc }}
            </button>
          </div>

          <footer class="nav">
            <span class="nav-hint"><i class="fas fa-lock"></i> Private — change anytime later</span>
            <button class="cta" :disabled="!canContinueStep1" @click="goNext">
              Continue <i class="fas fa-arrow-right"></i>
            </button>
          </footer>
        </section>

        <!-- ═══ STEP 2 · Referral ═══ -->
        <section v-else-if="step === 2" key="s2" class="card">
          <header class="card-head">
            <span class="head-icon"><i class="fas fa-compass"></i></span>
            <div>
              <h1 class="title">Hi <span class="grad">{{ form.firstName || 'there' }}</span> — how did you find us?</h1>
              <p class="sub">It helps us reach more people like you.</p>
            </div>
          </header>
          <div class="tile-grid sources" role="radiogroup" aria-label="Referral source">
            <button v-for="s in referralSources" :key="s.id" type="button" role="radio" :aria-checked="form.referral === s.id"
              class="tile compact" :class="{ on: form.referral === s.id }" @click="form.referral = s.id">
              <span class="tile-ic" :style="{ color: s.color }"><i :class="s.icon"></i></span>
              <span class="tile-body"><b>{{ s.label }}</b></span>
              <span class="tick"><i class="fas fa-check"></i></span>
            </button>
          </div>
          <footer class="nav split">
            <button class="ghost-btn" @click="goBack"><i class="fas fa-arrow-left"></i> Back</button>
            <button class="cta" :disabled="!form.referral" @click="goNext">Continue <i class="fas fa-arrow-right"></i></button>
          </footer>
        </section>

        <!-- ═══ STEP 3 · Role ═══ -->
        <section v-else-if="step === 3" key="s3" class="card">
          <header class="card-head">
            <span class="head-icon"><i class="fas fa-briefcase"></i></span>
            <div>
              <h1 class="title">What do you do?</h1>
              <p class="sub">We'll personalize examples, tone and templates for your role.</p>
            </div>
          </header>
          <div class="tile-grid roles" role="radiogroup" aria-label="Role">
            <button v-for="p in professions" :key="p.id" type="button" role="radio" :aria-checked="form.profession === p.id"
              class="tile compact" :class="{ on: form.profession === p.id }" @click="form.profession = p.id">
              <span class="tile-ic" :style="{ color: p.tint }"><i :class="p.icon"></i></span>
              <span class="tile-body"><b>{{ p.label }}</b></span>
              <span class="tick"><i class="fas fa-check"></i></span>
            </button>
          </div>
          <footer class="nav split">
            <button class="ghost-btn" @click="goBack"><i class="fas fa-arrow-left"></i> Back</button>
            <button class="cta" :disabled="!form.profession" @click="goNext">Continue <i class="fas fa-arrow-right"></i></button>
          </footer>
        </section>

        <!-- ═══ STEP 4 · Invite teammates (team / organization) ═══ -->
        <section v-else-if="step === 4" key="s4" class="card">
          <header class="card-head">
            <span class="head-icon warm"><i class="fas fa-user-plus"></i></span>
            <div>
              <h1 class="title">Invite your teammates</h1>
              <p class="sub">Collaborate with your team<template v-if="form.workspaceName"> on <b class="grad">{{ form.workspaceName }}</b></template> — or skip for now.</p>
            </div>
          </header>

          <div class="invite-row">
            <input v-model.trim="inviteEmail" type="email" inputmode="email" class="invite-input"
              placeholder="teammate@company.com" autocomplete="email" @keyup.enter="sendInvite" />
            <button class="add-btn" :disabled="!inviteEmail || inviting" @click="sendInvite">
              <i v-if="inviting" class="fas fa-circle-notch fa-spin"></i>
              <i v-else class="fas fa-paper-plane"></i>
              <span>Invite</span>
            </button>
          </div>
          <transition name="reveal">
            <p v-if="inviteError" class="invite-err"><i class="fas fa-circle-exclamation"></i> {{ inviteError }}</p>
          </transition>

          <ul class="members">
            <li class="member owner">
              <span class="m-av">{{ initials(fullName) }}</span>
              <span class="m-name">{{ fullName || 'You' }} <em>Owner</em></span>
              <span class="m-mail">{{ auth.user?.email }}</span>
            </li>
            <transition-group name="poplist">
              <li v-for="m in invited" :key="m" class="member">
                <span class="m-av alt" :style="{ background: avatarColor(m) }">{{ initials(m) }}</span>
                <span class="m-name">{{ m }}</span>
                <i class="fas fa-circle-check sent"></i>
              </li>
            </transition-group>
          </ul>

          <footer class="nav split">
            <button class="ghost-btn" @click="goBack"><i class="fas fa-arrow-left"></i> Back</button>
            <button class="cta" @click="goNext">{{ invited.length ? 'Continue' : 'Skip for now' }} <i class="fas fa-arrow-right"></i></button>
          </footer>
        </section>

        <!-- ═══ STEP 5 · First topic ═══ -->
        <section v-else-if="step === 5" key="s5" class="card">
          <header class="card-head">
            <span class="head-icon warm"><i class="fas fa-rocket"></i></span>
            <div>
              <h1 class="title">Ready for lift-off!</h1>
              <p class="sub">Pick a starter or type your own question — your first answer is seconds away.</p>
            </div>
          </header>

          <div class="starters" role="radiogroup" aria-label="First topic">
            <button v-for="s in starters" :key="s.id" type="button" role="radio" :aria-checked="form.firstPrompt === s.prompt"
              class="starter" :class="{ on: form.firstPrompt === s.prompt && !customPrompt }" @click="pickStarter(s)">
              <span class="s-ic" :style="{ color: s.color, background: s.color + '1c' }"><i :class="s.icon"></i></span>
              <span class="s-body"><b>{{ s.title }}</b><small>{{ s.sub }}</small></span>
              <span class="tick"><i class="fas fa-check"></i></span>
            </button>
          </div>

          <div class="or-divider"><span>or ask your own</span></div>

          <label class="custom-ask" :class="{ on: !!customPrompt }">
            <i class="fas fa-keyboard"></i>
            <input v-model="customPrompt" type="text" placeholder="Ask Kinyabot anything…" maxlength="500" @input="form.firstPrompt = customPrompt" />
          </label>

          <footer class="nav split">
            <button class="ghost-btn" @click="goBack"><i class="fas fa-arrow-left"></i> Back</button>
            <button class="cta" :disabled="!form.firstPrompt" @click="goNext">
              <i class="fas fa-rocket"></i> Start chatting
            </button>
          </footer>
        </section>

        <!-- ═══ STEP 6 · Personalizing (auto-finish) ═══ -->
        <section v-else key="s6" class="card done-card">
          <span class="done-ring" aria-hidden="true"><img src="/logo.png" alt="" /></span>
          <h1 class="title center">Personalizing your AI…</h1>
          <p class="sub center">This only takes a moment.</p>
          <ul class="load-list">
            <li v-for="(l, i) in loadLines" :key="l.key" :class="{ done: loadStage > i, active: loadStage === i }">
              <span class="l-ic">
                <i v-if="loadStage > i" class="fas fa-check"></i>
                <i v-else-if="loadStage === i" class="fas fa-circle-notch fa-spin"></i>
              </span>
              <span class="l-txt"><b>{{ l.title }}</b><small>{{ typeof l.sub === 'string' ? l.sub : l.sub.value }}</small></span>
            </li>
          </ul>
        </section>
      </transition>

      <!-- Step dots (hidden on final screen) -->
      <div v-if="showChrome" class="dots" aria-hidden="true">
        <span v-for="(s, i) in steps" :key="s" class="dot" :class="{ done: i < stepPos - 1, now: i === stepPos - 1 }"></span>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useChatStore } from '../stores/chat'

const router = useRouter()
const auth = useAuthStore()
const chatStore = useChatStore()

const step = ref(1)
const customPrompt = ref('')

/* ── Form state (same payload contract as before) ── */
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
const needsWorkspace = computed(() => ['team', 'organization'].includes(form.usageType))
const canContinueStep1 = computed(() =>
  form.firstName.trim() &&
  form.usageType &&
  (!needsWorkspace.value || form.workspaceName.trim())
)

/* Flow — the invite step only exists for team / organization usage */
const steps = computed(() => {
  const s = [1, 2, 3]
  if (needsWorkspace.value) s.push(4)
  s.push(5, 6)
  return s
})
const stepPos = computed(() => steps.value.indexOf(step.value) + 1)
const totalSteps = computed(() => steps.value.length)
const showChrome = computed(() => step.value !== 6)
const wsInput = ref(null)
watch(needsWorkspace, async (v) => {
  if (v && step.value === 1) await nextTick(() => wsInput.value?.focus())
})
function goNext() { const i = steps.value.indexOf(step.value); if (i < steps.value.length - 1) step.value = steps.value[i + 1] }
function goBack() { const i = steps.value.indexOf(step.value); if (i > 0) step.value = steps.value[i - 1] }
function exitOnboarding() {
  auth.logout()
  router.replace('/login')
}

/* ── Option data ── */
const usageTypes = [
  { id: 'personal',     icon: 'fas fa-user',         label: 'Personal',      hint: 'Just me',        tint: '#818cf8' },
  { id: 'team',         icon: 'fas fa-people-group', label: 'Team',          hint: 'Small group',    tint: '#22d3ee' },
  { id: 'organization', icon: 'fas fa-building',     label: 'Organization',  hint: 'Company-wide',   tint: '#f59e0b' },
  { id: 'other',        icon: 'fas fa-ellipsis',     label: 'Other',         hint: 'Something else', tint: '#34d399' },
]
const useCaseOptions = ['Coding & debugging', 'Writing & editing', 'Research', 'Learning a topic', 'Customer support', 'Content creation', 'Data analysis', 'Personal productivity', 'Just exploring']
const useCaseIcons = {
  'Coding & debugging': 'fa-code', 'Writing & editing': 'fa-pen-nib', 'Research': 'fa-magnifying-glass',
  'Learning a topic': 'fa-graduation-cap', 'Customer support': 'fa-headset', 'Content creation': 'fa-lightbulb',
  'Data analysis': 'fa-chart-simple', 'Personal productivity': 'fa-bolt', 'Just exploring': 'fa-wand-magic-sparkles',
}
function toggleUseCase(uc) {
  const i = form.useCases.indexOf(uc)
  if (i === -1) form.useCases.push(uc)
  else form.useCases.splice(i, 1)
}

const referralSources = [
  { id: 'google',    icon: 'fab fa-google',    label: 'Google',      color: '#ea4335' },
  { id: 'instagram', icon: 'fab fa-instagram', label: 'Instagram',   color: '#e1306c' },
  { id: 'twitter',   icon: 'fab fa-x-twitter', label: 'Twitter / X', color: '#e3e3e3' },
  { id: 'tiktok',    icon: 'fab fa-tiktok',    label: 'TikTok',      color: '#69c9d0' },
  { id: 'youtube',   icon: 'fab fa-youtube',   label: 'YouTube',     color: '#ff4d4d' },
  { id: 'linkedin',  icon: 'fab fa-linkedin',  label: 'LinkedIn',    color: '#0a66c2' },
  { id: 'friend',    icon: 'fas fa-user-group', label: 'Friend',     color: '#34d399' },
  { id: 'other',     icon: 'fas fa-star',      label: 'Other',       color: '#fbbf24' },
]

const professions = [
  { id: 'student',      icon: 'fas fa-graduation-cap', label: 'Student',      tint: '#34d399' },
  { id: 'developer',    icon: 'fas fa-code',           label: 'Developer',    tint: '#818cf8' },
  { id: 'designer',     icon: 'fas fa-pen-ruler',      label: 'Designer',     tint: '#f472b6' },
  { id: 'marketer',     icon: 'fas fa-bullhorn',       label: 'Marketer',     tint: '#fbbf24' },
  { id: 'researcher',   icon: 'fas fa-flask',          label: 'Researcher',   tint: '#22d3ee' },
  { id: 'entrepreneur', icon: 'fas fa-lightbulb',      label: 'Entrepreneur', tint: '#f59e0b' },
  { id: 'teacher',      icon: 'fas fa-chalkboard-user', label: 'Teacher',     tint: '#a78bfa' },
  { id: 'manager',      icon: 'fas fa-chart-line',     label: 'Manager',      tint: '#60a5fa' },
  { id: 'writer',       icon: 'fas fa-pen-nib',        label: 'Writer',       tint: '#4ade80' },
  { id: 'other',        icon: 'fas fa-user-astronaut', label: 'Other',        tint: '#94a3b8' },
]

const starters = [
  { id: 'code',  icon: 'fas fa-code',      title: 'Generate code',  sub: 'Build something with AI', color: '#818cf8', prompt: 'Write me a complete, responsive HTML/CSS landing page with a modern dark theme and smooth animations.' },
  { id: 'learn', icon: 'fas fa-book-open', title: 'Learn a topic',  sub: 'Get structured lessons',  color: '#22d3ee', prompt: 'Create a beginner-friendly learning plan for machine learning with topics, resources, and weekly goals.' },
  { id: 'write', icon: 'fas fa-pen-nib',   title: 'Write content',  sub: 'Draft any document',      color: '#4ade80', prompt: 'Help me write a compelling cover letter for a software engineering position at a tech startup.' },
  { id: 'analyze', icon: 'fas fa-chart-bar', title: 'Analyze data', sub: 'Make sense of numbers',   color: '#fbbf24', prompt: 'Explain the key metrics I should track to measure the success of a SaaS product launch.' },
  { id: 'image', icon: 'fas fa-image',     title: 'Generate image', sub: 'Create visuals with AI',  color: '#f472b6', prompt: '/image a futuristic African city at night with neon lights and flying cars, cinematic style, 4K' },
  { id: 'kinyarwanda', icon: 'fas fa-globe-africa', title: 'Discussion en Français', sub: 'Parlez votre langue', color: '#a78bfa', prompt: 'Bonjour ! Je veux savoir comment KinyaBot peut aider dans les tâches quotidiennes, y compris la création de code et la rédaction de documents.' },
]
function pickStarter(s) {
  form.firstPrompt = s.prompt
  customPrompt.value = ''
}

/* ── Invites ── */
const inviteEmail = ref('')
const inviting = ref(false)
const inviteError = ref('')
const invited = ref([])
const AVATAR_PALETTE = ['#f472b6', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa']
function avatarColor(s) { return AVATAR_PALETTE[(s?.charCodeAt(0) || 0) % AVATAR_PALETTE.length] }
function initials(name) {
  const src = String(name || '').trim()
  if (src.includes('@')) return src.slice(0, 2).toUpperCase()
  return src.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
}
async function sendInvite() {
  const email = inviteEmail.value.trim()
  if (!email || inviting.value) return
  inviting.value = true
  inviteError.value = ''
  try {
    const data = await auth.inviteTeammate(email)
    if (data?.success === false) inviteError.value = data.message || 'Could not send the invitation.'
    else { invited.value.push(email); inviteEmail.value = '' }
  } catch (err) {
    inviteError.value = err.response?.data?.error || 'Could not send the invitation.'
  } finally { inviting.value = false }
}

/* ── Step 6: run the real save while the checklist animates ── */
const loadLines = [
  { key: 'pref', title: 'Understanding preferences', sub: computed(() => `${fullName.value || 'You'} · ${professions.find(p => p.id === form.profession)?.label || 'Personal use'}`) },
  { key: 'int',  title: 'Analyzing interests',       sub: computed(() => form.useCases.slice(0, 3).join(', ') || 'General use') },
  { key: 'pers', title: 'Personalizing experience',  sub: 'Tuning tone, depth, and topics' },
  { key: 'ready', title: 'Ready',                    sub: 'Your AI is tuned to you' },
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
    // No eager chat creation — the first message creates the conversation
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
watch(step, v => { if (v === 6) runFinish() })
</script>

<style scoped>
/* ═══ KINYABOT ONBOARDING — rebuilt from scratch (V2)
      Modern, fluid, fully responsive: 320px phones → wide desktops.
      Uses the app's global design tokens (light + dark).        */

.onb {
  position: relative;
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--background);
  color: var(--text-primary);
  padding: 0 clamp(14px, 4vw, 40px) clamp(18px, 4vh, 36px);
  padding-left: max(clamp(14px, 4vw, 40px), env(safe-area-inset-left));
  padding-right: max(clamp(14px, 4vw, 40px), env(safe-area-inset-right));
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

/* ── Ambient background ─────────────────────────────────── */
.onb-bg { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 0; }
.orb { position: absolute; border-radius: 50%; filter: blur(110px); opacity: .16; }
.orb-a { width: clamp(380px, 60vw, 720px); height: clamp(380px, 60vw, 720px); top: -220px; left: 50%; transform: translateX(-60%); background: var(--brand); animation: drift 16s ease-in-out infinite alternate; }
.orb-b { width: clamp(260px, 40vw, 520px); height: clamp(260px, 40vw, 520px); bottom: -200px; right: -120px; background: var(--accent-violet); opacity: .12; animation: drift 20s ease-in-out infinite alternate-reverse; }
.orb-c { width: clamp(180px, 26vw, 340px); height: clamp(180px, 26vw, 340px); top: 30%; left: -140px; background: var(--accent-cyan); opacity: .08; animation: drift 24s ease-in-out infinite alternate; }
@keyframes drift { from { transform: translate3d(0,0,0); } to { transform: translate3d(4vw, 3vh, 0) scale(1.08); } }

/* ── Header ─────────────────────────────────────────────── */
.onb-top {
  position: relative; z-index: 2;
  width: 100%; max-width: 680px;
  display: flex; align-items: center; gap: 14px;
  padding: clamp(14px, 2.5vh, 22px) 0;
}
.brand { display: flex; align-items: center; gap: 9px; font-weight: 800; font-size: 15px; letter-spacing: -.01em; color: var(--text-primary); }
.brand-logo { width: 30px; height: 30px; border-radius: 8px; object-fit: contain; }
.progress { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; }
.progress-count { font-size: 11.5px; font-weight: 700; color: var(--text-muted); white-space: nowrap; font-variant-numeric: tabular-nums; }
.progress-track { flex: 1; height: 6px; border-radius: 99px; background: var(--surface-secondary); border: 1px solid var(--border-subtle); overflow: hidden; }
.progress-fill { display: block; height: 100%; border-radius: 99px; background: var(--gradient-brand); transition: width .45s var(--ease, ease); }
.exit {
  display: inline-flex; align-items: center; gap: 7px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text-muted); font-size: 12.5px; font-weight: 600;
  padding: 8px 13px; border-radius: 10px; cursor: pointer; transition: color .15s, border-color .15s;
}
.exit:hover { color: var(--error); border-color: rgba(239,68,68,.4); }
.exit-ghost { width: 86px; flex: none; }
@media (max-width: 420px) {
  .exit .exit-txt { display: none; }
  .exit { padding: 8px 10px; }
  .exit-ghost { width: 40px; }
}

/* ── Main column ────────────────────────────────────────── */
.onb-main {
  position: relative; z-index: 2;
  width: 100%; max-width: 680px;
  display: flex; flex-direction: column; align-items: stretch;
  flex: 1;
}

/* ── Card ───────────────────────────────────────────────── */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: clamp(18px, 3vw, 26px);
  padding: clamp(20px, 4.5vw, 34px);
  box-shadow: 0 24px 60px rgba(0,0,0,.28);
}
@media (min-width: 700px) { .card { padding: clamp(26px, 4vw, 38px); } }

.card-head { display: flex; gap: 16px; margin-bottom: clamp(18px, 3.5vw, 26px); align-items: flex-start; }
.head-icon {
  width: 48px; height: 48px; flex: none;
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  font-size: 19px; color: var(--brand-text);
  background: var(--brand-soft);
  border: 1px solid var(--brand-ring, rgba(99,102,241,.3));
}
.head-icon.warm { color: var(--warning); background: rgba(245,158,11,.13); border-color: rgba(245,158,11,.35); }
.title { margin: 2px 0 6px; font-size: clamp(20px, 4.5vw, 26px); font-weight: 800; letter-spacing: -.02em; line-height: 1.2; color: var(--text-primary); }
.title.center { text-align: center; }
.sub { margin: 0; font-size: clamp(13px, 2.8vw, 14.5px); color: var(--text-secondary); line-height: 1.55; }
.sub.center { text-align: center; }
.sub b { color: var(--text-primary); }
.grad { background: var(--gradient-brand); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }

/* ── Fields ─────────────────────────────────────────────── */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 420px) { .grid-2 { grid-template-columns: 1fr; } }
.field { display: flex; flex-direction: column; gap: 7px; min-width: 0; }
.field > span { font-size: 12.5px; font-weight: 700; color: var(--text-secondary); }
.field > span em { font-style: normal; font-weight: 500; font-size: 10.5px; color: var(--text-muted); margin-left: 5px; }
.field input {
  width: 100%; min-height: 48px;
  background: var(--surface-secondary);
  border: 1px solid var(--border);
  border-radius: 13px;
  color: var(--text-primary); font-size: 15px;
  padding: 12px 15px; outline: none;
  transition: border-color .16s, box-shadow .16s, background .16s;
  font-family: inherit;
}
.field input::placeholder { color: var(--text-muted); }
.field input:focus { border-color: var(--brand); box-shadow: var(--focus-glow); background: var(--surface-elevated); }

.group-label { margin: clamp(18px, 3.5vw, 24px) 0 11px; font-size: 13.5px; font-weight: 800; color: var(--text-primary); letter-spacing: -.01em; }
.group-label .opt { font-style: normal; font-weight: 600; font-size: 11px; color: var(--text-muted); margin-left: 7px; }

/* ── Tiles (usage / referral / role) ────────────────────── */
.tile-grid { display: grid; gap: 10px; }
.tile-grid.usage { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.tile-grid.sources, .tile-grid.roles { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
@media (max-width: 380px) { .tile-grid.sources, .tile-grid.roles { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

.tile {
  position: relative;
  display: flex; align-items: center; gap: 12px;
  text-align: left;
  padding: 14px;
  min-height: 62px;
  background: var(--surface-secondary);
  border: 1.5px solid var(--border);
  border-radius: 15px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: border-color .16s, background .16s, transform .16s, box-shadow .16s;
}
.tile:hover { border-color: var(--border-strong); transform: translateY(-1px); }
.tile:active { transform: scale(.985); }
.tile.on {
  border-color: var(--brand);
  background: var(--brand-soft);
  box-shadow: 0 0 0 1px var(--brand);
}
.tile.compact { flex-direction: column; align-items: flex-start; gap: 9px; padding: 13px; min-height: 88px; }
.tile-ic {
  width: 38px; height: 38px; flex: none;
  border-radius: 11px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px;
  background: color-mix(in srgb, currentColor 12%, transparent);
  transition: transform .16s;
}
.tile.on .tile-ic { transform: scale(1.06); }
.tile.compact .tile-ic { width: 34px; height: 34px; font-size: 14px; }
.tile-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tile-body b { font-size: 13.5px; font-weight: 700; color: var(--text-primary); }
.tile-body small { font-size: 11px; color: var(--text-muted); }
.tick {
  position: absolute; top: 9px; right: 9px;
  width: 19px; height: 19px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; color: #fff;
  background: var(--brand);
  opacity: 0; transform: scale(.4);
  transition: opacity .18s, transform .18s;
}
.tile.on .tick { opacity: 1; transform: scale(1); }

/* ── Workspace reveal ───────────────────────────────────── */
.workspace { margin-top: 16px; }

/* ── Use-case chips ─────────────────────────────────────── */
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 14px; min-height: 38px;
  background: var(--surface-secondary);
  border: 1.5px solid var(--border);
  border-radius: 999px;
  color: var(--text-secondary);
  font-size: 12.5px; font-weight: 600;
  cursor: pointer;
  transition: all .15s;
  font-family: inherit;
}
.chip i { font-size: 11px; color: var(--text-muted); transition: color .15s; }
.chip:hover { border-color: var(--border-strong); color: var(--text-primary); }
.chip.on { background: var(--brand-soft); border-color: var(--brand); color: var(--brand-text); }
.chip.on i { color: var(--brand-text); }

/* ── Nav footer ─────────────────────────────────────────── */
.nav { display: flex; align-items: center; justify-content: flex-end; gap: 12px; margin-top: clamp(20px, 4vw, 28px); }
.nav.split { justify-content: space-between; }
.nav-hint { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--text-muted); margin-right: auto; }
.nav-hint i { color: var(--success); }

.cta {
  display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  min-height: 50px; padding: 13px 26px;
  border: 0; border-radius: 14px;
  background: var(--gradient-brand);
  color: #fff; font-size: 14.5px; font-weight: 700;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(99,102,241,.35);
  transition: transform .16s, box-shadow .16s, filter .16s;
  font-family: inherit;
}
.cta:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 14px 30px rgba(99,102,241,.45); filter: brightness(1.06); }
.cta:active:not(:disabled) { transform: scale(.98); }
.cta:disabled { opacity: .45; cursor: not-allowed; box-shadow: none; }
.ghost-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  min-height: 50px; padding: 13px 20px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 14px;
  color: var(--text-secondary); font-size: 14px; font-weight: 600;
  cursor: pointer;
  transition: border-color .16s, color .16s, background .16s;
  font-family: inherit;
}
.ghost-btn:hover { border-color: var(--border-strong); color: var(--text-primary); background: var(--surface-secondary); }
@media (max-width: 360px) { .cta { padding: 13px 18px; font-size: 13.5px; } }

/* ── Invites ────────────────────────────────────────────── */
.invite-row { display: flex; gap: 10px; }
.invite-input {
  flex: 1; min-width: 0; min-height: 48px;
  background: var(--surface-secondary);
  border: 1px solid var(--border);
  border-radius: 13px;
  color: var(--text-primary); font-size: 14.5px;
  padding: 12px 15px; outline: none;
  transition: border-color .16s, box-shadow .16s;
  font-family: inherit;
}
.invite-input:focus { border-color: var(--brand); box-shadow: var(--focus-glow); }
.add-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  flex: none; min-height: 48px; padding: 0 18px;
  border: 1px solid var(--brand-ring, rgba(99,102,241,.3));
  border-radius: 13px;
  background: var(--brand-soft);
  color: var(--brand-text); font-size: 13.5px; font-weight: 700;
  cursor: pointer; transition: background .16s, color .16s;
  font-family: inherit;
}
.add-btn:hover:not(:disabled) { background: var(--brand); color: #fff; }
.add-btn:disabled { opacity: .5; cursor: not-allowed; }
@media (max-width: 400px) { .add-btn span { display: none; } .add-btn { padding: 0 14px; } }
.invite-err { display: flex; align-items: center; gap: 8px; margin: 10px 2px 0; font-size: 12.5px; color: var(--error); }
.members { list-style: none; margin: 16px 0 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.member {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 14px;
  background: var(--surface-secondary);
  border: 1px solid var(--border);
  border-radius: 13px;
}
.m-av {
  width: 34px; height: 34px; flex: none;
  border-radius: 50%;
  background: var(--gradient-brand);
  color: #fff; font-size: 11.5px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
}
.m-av.alt { background: var(--brand); }
.m-name { font-size: 13.5px; font-weight: 650; color: var(--text-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.m-name em { font-style: normal; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: var(--brand-text); background: var(--brand-soft); padding: 2px 7px; border-radius: 6px; margin-left: 8px; }
.m-mail { margin-left: auto; font-size: 12px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.member .sent { margin-left: auto; color: var(--success); font-size: 14px; }
@media (max-width: 480px) { .m-mail { display: none; } }

/* ── Starters ───────────────────────────────────────────── */
.starters { display: flex; flex-direction: column; gap: 9px; }
.starter {
  position: relative;
  display: flex; align-items: center; gap: 13px;
  width: 100%; text-align: left;
  padding: 12px 14px;
  background: var(--surface-secondary);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  cursor: pointer;
  transition: border-color .16s, background .16s, transform .16s;
  font-family: inherit;
}
.starter:hover { border-color: var(--border-strong); transform: translateX(2px); }
.starter.on { border-color: var(--brand); background: var(--brand-soft); }
.s-ic { width: 40px; height: 40px; flex: none; border-radius: 11px; display: flex; align-items: center; justify-content: center; font-size: 15px; }
.s-body { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.s-body b { font-size: 13.5px; font-weight: 700; color: var(--text-primary); }
.s-body small { font-size: 11.5px; color: var(--text-muted); }
.starter .tick { top: 50%; transform: translateY(-50%) scale(.4); }
.starter.on .tick { transform: translateY(-50%) scale(1); }

.or-divider { display: flex; align-items: center; gap: 12px; margin: 16px 0; color: var(--text-muted); font-size: 10.5px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; }
.or-divider::before, .or-divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }

.custom-ask {
  display: flex; align-items: center; gap: 11px;
  padding: 6px 15px; min-height: 52px;
  background: var(--surface-secondary);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  transition: border-color .16s, box-shadow .16s;
}
.custom-ask i { color: var(--text-muted); font-size: 14px; }
.custom-ask input { flex: 1; min-width: 0; background: transparent; border: 0; outline: none; color: var(--text-primary); font-size: 14.5px; font-family: inherit; }
.custom-ask.on { border-color: var(--brand); box-shadow: var(--focus-glow); }

/* ── Step 6: personalizing ──────────────────────────────── */
.done-card { display: flex; flex-direction: column; align-items: center; padding-top: clamp(34px, 7vw, 56px); }
.done-ring {
  width: 76px; height: 76px; border-radius: 24px;
  display: flex; align-items: center; justify-content: center;
  background: var(--gradient-brand);
  box-shadow: 0 14px 34px rgba(99,102,241,.4);
  margin-bottom: 20px;
  animation: pulse 2.2s ease-in-out infinite;
}
.done-ring img { width: 42px; height: 42px; object-fit: contain; }
@keyframes pulse { 0%, 100% { transform: scale(1); box-shadow: 0 14px 34px rgba(99,102,241,.4); } 50% { transform: scale(1.06); box-shadow: 0 18px 44px rgba(99,102,241,.55); } }
.load-list { list-style: none; margin: clamp(20px, 4vw, 30px) 0 10px; padding: 0; width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 2px; }
.load-list li { display: flex; align-items: center; gap: 14px; padding: 12px 4px; opacity: .38; transition: opacity .3s; }
.load-list li.done, .load-list li.active { opacity: 1; }
.l-ic {
  width: 28px; height: 28px; flex: none;
  border-radius: 50%;
  border: 2px solid var(--brand-ring, rgba(99,102,241,.35));
  display: flex; align-items: center; justify-content: center;
  font-size: 10.5px; color: var(--brand-text);
  transition: background .25s, border-color .25s, color .25s;
}
.load-list li.done .l-ic { background: var(--brand); border-color: var(--brand); color: #fff; }
.l-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.l-txt b { font-size: 13.5px; font-weight: 700; color: var(--text-primary); }
.l-txt small { font-size: 11.5px; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }

/* ── Step dots ──────────────────────────────────────────── */
.dots { display: flex; justify-content: center; gap: 7px; margin-top: clamp(18px, 3.5vh, 26px); }
.dot { width: 7px; height: 7px; border-radius: 99px; background: var(--border-strong); transition: all .3s; }
.dot.done { background: var(--brand); opacity: .55; }
.dot.now { width: 22px; background: var(--gradient-brand); opacity: 1; }

/* ── Transitions ────────────────────────────────────────── */
.step-enter-active, .step-leave-active { transition: opacity .3s var(--ease, ease), transform .3s var(--ease, ease); }
.step-enter-from { opacity: 0; transform: translateX(26px) scale(.99); }
.step-leave-to { opacity: 0; transform: translateX(-26px) scale(.99); }
.reveal-enter-active, .reveal-leave-active { transition: opacity .22s, transform .22s; }
.reveal-enter-from, .reveal-leave-to { opacity: 0; transform: translateY(-6px); }
.poplist-enter-active, .poplist-leave-active { transition: all .25s; }
.poplist-enter-from, .poplist-leave-to { opacity: 0; transform: translateY(-6px) scale(.97); }
.poplist-leave-active { position: absolute; width: 100%; }

/* ── Reduced motion ─────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .orb, .done-ring { animation: none !important; }
  .step-enter-active, .step-leave-active, .reveal-enter-active, .reveal-leave-active,
  .poplist-enter-active, .poplist-leave-active { transition: none; }
  .tile, .cta, .starter { transition: none; }
}
</style>

