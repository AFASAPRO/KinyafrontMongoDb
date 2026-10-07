<template>
  <div class="upg-page">
    <header class="upg-top">
      <button class="upg-back" @click="goBack" aria-label="Back">
        <AnimatedIcon icon="fas fa-arrow-left" animation="subtle-hover" />
      </button>
      <div class="upg-title">
        <h1>Upgrade request</h1>
        <span>Reviewed by the KinyaBot team</span>
      </div>
    </header>

    <div class="upg-body">
      <!-- Plan summary -->
      <div class="upg-plan-row">
        <div class="upg-plan-box">
          <span class="lbl">Current plan</span>
          <PlanBadge :plan="sub.plan" />
          <span class="lim">{{ sub.usage.limit }} chats/day</span>
        </div>
        <i class="fas fa-arrow-right-long upg-arr"></i>
        <div class="upg-plan-box target">
          <span class="lbl">Requested plan</span>
          <PlanBadge :plan="requestedPlan" />
          <span class="lim">{{ targetLimit }} chats/day</span>
        </div>
      </div>

      <div v-if="sub.pendingRequest" class="upg-dup">
        <i class="fas fa-hourglass-half"></i>
        <div>
          <b>You already have a pending {{ sub.pendingRequest.requested_plan?.toUpperCase() }} upgrade request.</b>
          <span>Submitted {{ fmtDate(sub.pendingRequest.created_at) }}. You can view its status on your Plans &amp; Usage page.</span>
        </div>
        <button class="upg-ghost" @click="router.push('/plans')">View status</button>
      </div>

      <form v-else class="upg-form" @submit.prevent="submit" novalidate>
        <!-- Full name -->
        <div class="field" :class="{ invalid: !!errors.fullName }">
          <label for="f-name">Full name <em>*</em></label>
          <input id="f-name" v-model.trim="form.fullName" type="text" placeholder="e.g. Amina Uwase" autocomplete="name" :disabled="sending" />
          <span class="err" v-if="errors.fullName">{{ errors.fullName }}</span>
        </div>

        <!-- Email -->
        <div class="field" :class="{ invalid: !!errors.email }">
          <label for="f-email">Email <em>*</em></label>
          <input id="f-email" v-model.trim="form.email" type="email" placeholder="you@example.com" autocomplete="email" :disabled="sending" />
          <span class="err" v-if="errors.email">{{ errors.email }}</span>
        </div>

        <!-- Country (searchable) -->
        <div class="field country-field" :class="{ invalid: !!errors.country, open: countryOpen }">
          <label for="f-country">Country <em>*</em></label>
          <div class="csel" ref="cselRef">
            <button type="button" id="f-country" class="csel-btn" :aria-expanded="countryOpen" @click="toggleCountry">
              <span v-if="selectedCountry" class="csel-picked">
                <b>{{ selectedCountry.name }}</b>
                <small>{{ selectedCountry.dial }}</small>
              </span>
              <span v-else class="csel-ph">Search your country…</span>
              <i class="fas fa-chevron-down"></i>
            </button>
            <transition name="pop">
              <div v-if="countryOpen" class="csel-menu">
                <div class="csel-search">
                  <i class="fas fa-magnifying-glass"></i>
                  <input ref="cselSearchRef" v-model="countryQuery" type="text" placeholder="Type to search…" @keydown.esc.prevent="countryOpen = false" />
                </div>
                <div class="csel-list">
                  <button
                    v-for="c in filteredCountries" :key="c.code"
                    type="button" class="csel-item" :class="{ on: selectedCountry?.code === c.code }"
                    @click="pickCountry(c)"
                  >
                    <b>{{ c.name }}</b>
                    <small>{{ c.dial }}</small>
                  </button>
                  <p v-if="!filteredCountries.length" class="csel-none">No country matches “{{ countryQuery }}”.</p>
                </div>
              </div>
            </transition>
          </div>
          <span class="err" v-if="errors.country">{{ errors.country }}</span>
        </div>

        <!-- Phone (dial code auto-applied from country) -->
        <div class="field" :class="{ invalid: !!errors.phone }">
          <label for="f-phone">Phone number <em>*</em></label>
          <div class="phone-row">
            <span class="dial" v-if="selectedCountry">{{ selectedCountry.dial }}</span>
            <span class="dial dial-empty" v-else><i class="fas fa-globe"></i></span>
            <input
              id="f-phone" v-model="phoneLocal" type="tel" inputmode="tel"
              placeholder="720 000 000" autocomplete="tel-national" :disabled="sending"
            />
          </div>
          <span class="hint" v-if="selectedCountry">Format: {{ selectedCountry.dial }} followed by your number</span>
          <span class="err" v-if="errors.phone">{{ errors.phone }}</span>
        </div>

        <!-- Message (optional) -->
        <div class="field" :class="{ invalid: !!errors.message }">
          <label for="f-msg">Message <small>(optional)</small></label>
          <textarea id="f-msg" v-model="form.message" rows="3" maxlength="1000" placeholder="Anything we should know? (optional)" :disabled="sending"></textarea>
          <span class="err" v-if="errors.message">{{ errors.message }}</span>
        </div>

        <!-- Requested plan selector (limited to valid upgrade paths) -->
        <div class="field" v-if="(sub.upgradePaths || []).length > 1">
          <label>Requested plan</label>
          <div class="plan-toggle">
            <button
              v-for="p in (sub.upgradePaths || [])" :key="p" type="button"
              class="pt-opt" :class="{ on: requestedPlan === p }" @click="requestedPlan = p"
            >
              {{ p.toUpperCase() }}
            </button>
          </div>
        </div>

        <p class="upg-note">
          <i class="fas fa-shield-halved"></i>
          Your current plan stays active until the team reviews this request. You'll get a notification as soon as it's decided.
        </p>

        <button class="upg-submit" type="submit" :disabled="sending">
          <i v-if="sending" class="fas fa-circle-notch fa-spin"></i>
          <i v-else class="fas fa-paper-plane"></i>
          {{ sending ? 'Submitting…' : `Request ${requestedPlan?.toUpperCase()} upgrade` }}
        </button>
        <p v-if="submitError" class="upg-error" role="alert"><i class="fas fa-circle-exclamation"></i> {{ submitError }}</p>
      </form>
    </div>

    <!-- Success confirmation -->
    <transition name="pop">
      <div v-if="success" class="upg-success-overlay" @click.self="router.push('/plans')">
        <div class="upg-success">
          <div class="us-ico"><i class="fas fa-check"></i></div>
          <h2>Request submitted</h2>
          <p>Your <b>{{ requestedPlan?.toUpperCase() }}</b> upgrade request is in review.<br/>We'll notify you as soon as it's decided.</p>
          <button class="upg-submit" @click="router.push('/plans')"><i class="fas fa-comments"></i> Back to KinyaBot</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useSubscriptionStore } from '../stores/subscription'
import { COUNTRIES, findCountry } from '../utils/countries'
import PlanBadge from '../components/plans/PlanBadge.vue'
import AnimatedIcon from '../components/AnimatedIcon.vue'

/**
 * Upgrade request form (§9, §10, §11).
 *  • currentPlan comes from the subscription store (backend truth) — never editable
 *  • requestedPlan is restricted to valid upgrade paths from the user's current plan
 *  • country selector is searchable; the phone dial code follows the chosen country
 *  • the backend re-validates everything and blocks duplicate pending requests
 */
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const sub = useSubscriptionStore()

const form = ref({ fullName: '', email: '', message: '' })
const phoneLocal = ref('')
const selectedCountry = ref(null)
const countryQuery = ref('')
const countryOpen = ref(false)
const errors = ref({})
const submitError = ref('')
const sending = ref(false)
const success = ref(false)
const cselRef = ref(null)
const cselSearchRef = ref(null)

const requestedPlan = ref('plus')

const targetLimit = computed(() => {
  const p = sub.plansCatalog.find(x => x.plan_id === requestedPlan.value)
  return p?.dailyChatLimit ?? '—'
})

const filteredCountries = computed(() => {
  const q = countryQuery.value.trim().toLowerCase()
  if (!q) return COUNTRIES
  return COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.dial.includes(q) || c.code.toLowerCase() === q)
})

// Prefill from the authenticated account (§10) + selected plan from ?plan=
onMounted(async () => {
  await Promise.all([sub.fetch(), sub.fetchPlans()])
  const u = auth.user || {}
  form.value.fullName = u.username ? u.username.charAt(0).toUpperCase() + u.username.slice(1) : ''
  form.value.email = u.email || ''
  const qp = String(route.query.plan || '').toLowerCase()
  const valid = sub.upgradePaths || []
  requestedPlan.value = valid.includes(qp) ? qp : (valid[0] || 'plus')
})

function toggleCountry() {
  countryOpen.value = !countryOpen.value
  if (countryOpen.value) setTimeout(() => cselSearchRef.value?.focus(), 60)
}
function pickCountry(c) {
  selectedCountry.value = c
  countryQuery.value = ''
  countryOpen.value = false
  errors.value.country = ''
}

function closeOnOutside(e) {
  if (countryOpen.value && cselRef.value && !cselRef.value.contains(e.target)) countryOpen.value = false
}
onMounted(() => document.addEventListener('click', closeOnOutside))
onBeforeUnmount(() => document.removeEventListener('click', closeOnOutside))

watch(phoneLocal, (v) => {
  // Auto-strip a manually typed dial code (the selector adds it)
  if (selectedCountry.value && v.startsWith(selectedCountry.value.dial)) {
    phoneLocal.value = v.slice(selectedCountry.value.dial.length).trim()
  }
})

function validate() {
  const e = {}
  if (form.value.fullName.length < 2 || form.value.fullName.length > 120) e.fullName = 'Please enter your full name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email)) e.email = 'Please enter a valid email address.'
  if (!selectedCountry.value) e.country = 'Please select your country.'
  const digits = phoneLocal.value.replace(/[^\d]/g, '')
  if (digits.length < 7 || digits.length > 15) e.phone = 'Please enter a valid phone number.'
  errors.value = e
  return !Object.keys(e).length
}

async function submit() {
  submitError.value = ''
  if (!validate()) return
  sending.value = true
  try {
    await sub.submitRequest({
      fullName: form.value.fullName,
      email: form.value.email,
      country: selectedCountry.value.name,
      countryCode: selectedCountry.value.code,
      phone: `${selectedCountry.value.dial} ${phoneLocal.value.replace(/[^\d\s]/g, '')}`.trim(),
      requestedPlan: requestedPlan.value,
      message: form.value.message || '',
    })
    success.value = true
    setTimeout(() => { success.value = false; router.push('/plans') }, 2600)
  } catch (err) {
    const d = err?.response?.data
    if (d?.fields) errors.value = { ...d.fields }
    if (d?.code === 'DUPLICATE_REQUEST') {
      await sub.fetch(true)
      submitError.value = d.error || 'You already have a pending request.'
    } else {
      submitError.value = d?.error || 'Could not submit your request. Please try again.'
    }
  } finally { sending.value = false }
}

function goBack() { router.push('/plans') }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }) : '—' }
</script>

<style scoped>
.upg-page { min-height: 100vh; height: 100vh; height: 100dvh; overflow-y: auto; background: var(--bg-base); color: var(--text-1); }
.upg-top {
  position: sticky; top: 0; z-index: 20; display: flex; align-items: center; gap: 12px;
  padding: 12px 18px; background: color-mix(in srgb, var(--bg-base) 88%, transparent);
  backdrop-filter: blur(10px); border-bottom: 1px solid var(--border-subtle);
}
.upg-back {
  width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  background: var(--surface-secondary); border: 1px solid var(--border);
  color: var(--text-2); font-size: 14px; display: flex; align-items: center; justify-content: center;
}
.upg-back:hover { color: var(--text-1); }
.upg-title h1 { margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -.01em; }
.upg-title span { font-size: 12px; color: var(--text-3); }

.upg-body { max-width: 620px; margin: 0 auto; padding: 24px 18px 80px; display: flex; flex-direction: column; gap: 20px; }

.upg-plan-row { display: flex; align-items: center; justify-content: center; gap: 14px; }
.upg-plan-box {
  flex: 1; max-width: 220px; display: flex; flex-direction: column; align-items: center; gap: 7px;
  background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 16px 12px;
}
.upg-plan-box.target { border-color: rgba(139,92,246,.4); background: linear-gradient(180deg, rgba(99,102,241,.07), transparent 60%), var(--surface); }
.upg-plan-box .lbl { font-size: 9.5px; font-weight: 800; letter-spacing: .14em; color: var(--text-3); }
.upg-plan-box .lim { font-size: 12px; color: var(--text-2); font-weight: 600; }
.upg-arr { color: var(--text-3); font-size: 17px; }

.upg-dup {
  display: flex; align-items: flex-start; gap: 12px;
  background: rgba(245,158,11,.08); border: 1px solid rgba(245,158,11,.3);
  border-radius: var(--r-lg); padding: 16px;
}
.upg-dup > i { color: var(--warning); margin-top: 3px; }
.upg-dup b { display: block; font-size: 13.5px; color: var(--text-1); margin-bottom: 2px; }
.upg-dup span { font-size: 12.5px; color: var(--text-2); }
.upg-dup div { flex: 1; }
.upg-ghost {
  background: transparent; border: 1px solid var(--border-strong); color: var(--text-2);
  font-size: 12px; font-weight: 600; padding: 7px 12px; border-radius: 9px; cursor: pointer; white-space: nowrap;
}
.upg-ghost:hover { color: var(--text-1); background: var(--surface-secondary); }

/* Form */
.upg-form {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: var(--r-xl); padding: 22px; display: flex; flex-direction: column; gap: 16px;
}
.field { display: flex; flex-direction: column; gap: 6px; }
.field label { font-size: 12px; font-weight: 700; color: var(--text-2); }
.field label em { color: var(--error); font-style: normal; }
.field label small { color: var(--text-3); font-weight: 500; }
.field input, .field textarea {
  width: 100%; background: var(--bg-input, var(--surface-secondary));
  border: 1px solid var(--border); border-radius: 12px;
  color: var(--text-1); font-size: 14px; padding: 11px 14px;
  transition: border-color .15s, box-shadow .15s;
  resize: vertical;
}
.field input:focus, .field textarea:focus { border-color: var(--brand); box-shadow: var(--focus-glow); }
.field.invalid input, .field.invalid textarea { border-color: var(--error); }
.err { font-size: 11.5px; color: var(--error); }
.hint { font-size: 11.5px; color: var(--text-3); }

/* Country selector */
.csel { position: relative; }
.csel-btn {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;
  background: var(--bg-input, var(--surface-secondary)); border: 1px solid var(--border);
  border-radius: 12px; color: var(--text-1); font-size: 14px; padding: 11px 14px; cursor: pointer;
}
.csel-btn:hover { border-color: var(--border-strong); }
.csel-ph { color: var(--text-3); }
.csel-picked { display: flex; align-items: center; gap: 10px; }
.csel-picked b { font-weight: 600; }
.csel-picked small, .csel-item small { color: var(--text-3); font-size: 12px; margin-left: auto; }
.csel-btn > i { font-size: 11px; color: var(--text-3); transition: transform .15s; }
.csel.open .csel-btn > i { transform: rotate(180deg); }
.field.invalid .csel-btn { border-color: var(--error); }

.csel-menu {
  position: absolute; bottom: calc(100% + 6px); left: 0; right: 0; z-index: 30;
  background: var(--surface-elevated); border: 1px solid var(--border-strong);
  border-radius: 14px; box-shadow: var(--shadow-md); overflow: hidden;
}
.csel-search { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-bottom: 1px solid var(--border); }
.csel-search i { color: var(--text-3); font-size: 12px; }
.csel-search input { flex: 1; background: transparent; border: 0; color: var(--text-1); font-size: 13.5px; }
.csel-list { max-height: 220px; overflow-y: auto; }
.csel-item {
  width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 10px;
  background: transparent; border: 0; color: var(--text-1); font-size: 13.5px;
  padding: 9px 14px; cursor: pointer; text-align: left;
}
.csel-item:hover { background: var(--surface-secondary); }
.csel-item.on { background: var(--brand-soft); color: var(--brand-text); }
.csel-none { padding: 14px; font-size: 12.5px; color: var(--text-3); text-align: center; margin: 0; }

/* Phone */
.phone-row { display: flex; align-items: stretch; gap: 8px; }
.dial {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  min-width: 74px; padding: 0 12px; border-radius: 12px;
  background: var(--surface-elevated); border: 1px solid var(--border-strong);
  color: var(--text-2); font-size: 13.5px; font-weight: 700; font-variant-numeric: tabular-nums;
}
.dial-empty { color: var(--text-3); }

/* Plan toggle */
.plan-toggle { display: flex; gap: 8px; }
.pt-opt {
  flex: 1; padding: 10px; border-radius: 11px; border: 1px solid var(--border);
  background: var(--surface-secondary); color: var(--text-2);
  font-size: 13px; font-weight: 800; letter-spacing: .06em; cursor: pointer;
  transition: all .15s;
}
.pt-opt.on { background: var(--brand-soft); border-color: var(--brand); color: var(--brand-text); }

.upg-note {
  display: flex; align-items: flex-start; gap: 9px; margin: 0;
  font-size: 12px; color: var(--text-3); line-height: 1.6;
  background: var(--surface-secondary); border: 1px solid var(--border-subtle);
  border-radius: 11px; padding: 10px 12px;
}
.upg-note i { color: var(--brand-text); margin-top: 2px; }

.upg-submit {
  display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  width: 100%; padding: 13px; border-radius: 13px; border: 0;
  background: var(--gradient-brand); color: #fff;
  font-size: 14px; font-weight: 700; cursor: pointer;
  box-shadow: 0 8px 22px rgba(99,102,241,.35);
  transition: transform .15s, filter .15s;
}
.upg-submit:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.08); }
.upg-submit:disabled { opacity: .65; cursor: wait; }
.upg-error {
  display: flex; align-items: center; gap: 8px; margin: 0;
  color: var(--error); font-size: 12.5px; font-weight: 600;
}

/* Success */
.upg-success-overlay {
  position: fixed; inset: 0; z-index: 9999; background: rgba(3,6,14,.8); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 18px;
}
.upg-success {
  width: min(400px, 100%); text-align: center;
  background: var(--surface); border: 1px solid rgba(34,197,94,.4);
  border-radius: 22px; padding: 32px 26px 24px;
}
.us-ico {
  width: 60px; height: 60px; margin: 0 auto 16px; border-radius: 50%;
  background: rgba(34,197,94,.15); border: 2px solid rgba(34,197,94,.5);
  color: var(--success); font-size: 22px; display: flex; align-items: center; justify-content: center;
}
.upg-success h2 { margin: 0 0 8px; font-size: 19px; font-weight: 800; }
.upg-success p { margin: 0 0 18px; font-size: 13.5px; color: var(--text-2); line-height: 1.65; }

.pop-enter-active { transition: opacity .2s; }
.pop-enter-active .csel-menu, .pop-enter-active .upg-success { animation: popIn .24s var(--ease); }
.pop-leave-active { transition: opacity .16s; }
.pop-enter-from, .pop-leave-to { opacity: 0; }
@keyframes popIn { from { opacity: 0; transform: translateY(8px) scale(.98); } to { opacity: 1; transform: none; } }

@media (max-width: 560px) {
  .upg-body { padding: 18px 12px 80px; }
  .upg-form { padding: 16px; }
  .upg-plan-row { gap: 8px; }
  .upg-arr { font-size: 13px; }
  .upg-dup { flex-direction: column; }
}
</style>
