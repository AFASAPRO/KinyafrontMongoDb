<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { sendEnterpriseRequest } from '../support/enterprise'

/**
 * Enterprise plan popup — collects the visitor's details and contact so the
 * Kinyabot superadmin can follow up from the Superadmin console.
 */
const open = ref(false)
const sending = ref(false)
const done = ref(false)
const delivered = ref(true)
const offline = ref(false)
const submitError = ref('')
const errors = ref({})

const blank = () => ({ name: '', company: '', email: '', phone: '', teamSize: '', message: '' })
const form = ref(blank())

const teamSizes = ['1 – 9 people', '10 – 49 people', '50 – 199 people', '200 – 999 people', '1,000+ people']
const firstField = ref(null)

const preview = computed(() => ({
  name: form.value.name, company: form.value.company, email: form.value.email,
  phone: form.value.phone, team_size: form.value.teamSize, message: form.value.message,
}))

function show() {
  form.value = blank()
  errors.value = {}
  submitError.value = ''
  done.value = false
  open.value = true
  document.documentElement.style.overflow = 'hidden'
  nextTick(() => firstField.value?.focus())
}
function close() {
  if (sending.value) return
  open.value = false
  document.documentElement.style.overflow = ''
}
function onKey(e) { if (e.key === 'Escape' && open.value) close() }
onMounted(() => document.addEventListener('keydown', onKey))
onBeforeUnmount(() => { document.removeEventListener('keydown', onKey); document.documentElement.style.overflow = '' })

function validate() {
  const e = {}
  if (form.value.name.trim().length < 2) e.name = 'Please enter your full name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim())) e.email = 'Please enter a valid work email.'
  const digits = form.value.phone.replace(/[^\d]/g, '')
  if (digits.length < 7 || digits.length > 15) e.phone = 'Please enter a valid phone number.'
  if (!form.value.teamSize) e.teamSize = 'Please select your team size.'
  errors.value = e
  return !Object.keys(e).length
}

async function submit() {
  submitError.value = ''
  if (!validate()) return
  sending.value = true
  try {
    const r = await sendEnterpriseRequest({ ...preview.value, source: 'landing_pricing' })
    if (r.fields) { errors.value = r.fields; submitError.value = r.error || 'Please check the highlighted fields.'; return }
    if (r.error) { submitError.value = r.error; return }
    delivered.value = r.delivered
    offline.value = !!r.offline
    done.value = true
  } finally {
    sending.value = false
  }
}

defineExpose({ show })
</script>

<template>
  <teleport to="body">
    <transition name="em-fade">
      <div v-if="open" class="em-overlay" @click.self="close">
        <div class="em-modal" role="dialog" aria-modal="true" aria-label="Enterprise plan request">
          <button class="em-x" aria-label="Close" @click="close"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button>

          <!-- Success state -->
          <div v-if="done" class="em-success">
            <div class="em-check"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>
            <h3>Request received</h3>
            <p>Thanks {{ form.name.split(' ')[0] }} — our team will reach out to <b>{{ form.email }}</b> within one business day to design the right Kinyabot plan for {{ form.company || 'your team' }}.</p>
            <p v-if="offline" class="em-offline">You're offline preview mode — the request was saved in this browser and will be available once the backend is connected.</p>
            <button class="em-submit" @click="close">Done</button>
          </div>

          <!-- Form state -->
          <template v-else>
            <div class="em-head">
              <span class="em-kicker">ENTERPRISE PLAN</span>
              <h3>Let's build your custom Kinyabot</h3>
              <p>Tell us a little about your team and we'll get back to you with pricing, custom AI skills and onboarding details.</p>
            </div>

            <form class="em-form" @submit.prevent="submit" novalidate>
              <div class="em-row">
                <label class="em-field" :class="{ invalid: !!errors.name }">
                  <span>Full name <em>*</em></span>
                  <input ref="firstField" v-model.trim="form.name" type="text" placeholder="e.g. Amina Uwase" autocomplete="name" :disabled="sending" />
                  <small v-if="errors.name">{{ errors.name }}</small>
                </label>
                <label class="em-field" :class="{ invalid: !!errors.company }">
                  <span>Company <em>*</em></span>
                  <input v-model.trim="form.company" type="text" placeholder="Company or organization" autocomplete="organization" :disabled="sending" />
                  <small v-if="errors.company">{{ errors.company }}</small>
                </label>
              </div>

              <div class="em-row">
                <label class="em-field" :class="{ invalid: !!errors.email }">
                  <span>Work email <em>*</em></span>
                  <input v-model.trim="form.email" type="email" placeholder="you@company.com" autocomplete="email" :disabled="sending" />
                  <small v-if="errors.email">{{ errors.email }}</small>
                </label>
                <label class="em-field" :class="{ invalid: !!errors.phone }">
                  <span>Phone <em>*</em></span>
                  <input v-model.trim="form.phone" type="tel" inputmode="tel" placeholder="+250 7XX XXX XXX" autocomplete="tel" :disabled="sending" />
                  <small v-if="errors.phone">{{ errors.phone }}</small>
                </label>
              </div>

              <label class="em-field" :class="{ invalid: !!errors.teamSize }">
                <span>Team size <em>*</em></span>
                <select v-model="form.teamSize" :disabled="sending">
                  <option value="" disabled>Select team size…</option>
                  <option v-for="t in teamSizes" :key="t" :value="t">{{ t }}</option>
                </select>
                <small v-if="errors.teamSize">{{ errors.teamSize }}</small>
              </label>

              <label class="em-field">
                <span>What do you need? <small>(optional)</small></span>
                <textarea v-model="form.message" rows="3" maxlength="1000" placeholder="Custom AI skills, team workspaces, SSO, usage limits…" :disabled="sending"></textarea>
              </label>

              <p class="em-privacy"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></svg> Your details are only shared with the Kinyabot team and never sold.</p>

              <p v-if="submitError" class="em-error" role="alert">{{ submitError }}</p>

              <button class="em-submit" type="submit" :disabled="sending">
                <svg v-if="sending" class="em-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.56"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                {{ sending ? 'Sending…' : 'Request a callback' }}
              </button>
            </form>
          </template>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<style scoped>
.em-overlay{position:fixed;inset:0;z-index:100;background:rgba(9,10,14,.62);backdrop-filter:blur(6px);display:grid;place-items:center;padding:16px;overflow-y:auto}
.em-modal{position:relative;width:min(560px,100%);background:var(--bg2);border:1px solid var(--line);border-radius:22px;padding:30px 30px 26px;box-shadow:0 30px 80px rgba(0,0,0,.45);max-height:calc(100dvh - 32px);overflow-y:auto}
.em-x{position:absolute;top:14px;right:14px;width:34px;height:34px;border-radius:10px;border:1px solid var(--line);background:transparent;color:var(--muted);display:grid;place-items:center;cursor:pointer;transition:.2s}
.em-x:hover{color:var(--fg);border-color:var(--muted)}

.em-head h3{margin:10px 0 8px;font-size:24px;font-weight:700;letter-spacing:-.03em;color:var(--fg)}
.em-head p{margin:0;font-size:14px;line-height:1.6;color:var(--muted)}
.em-kicker{display:inline-block;padding:4px 10px;border-radius:999px;background:rgba(29,92,255,.1);color:#1d5cff;font-size:10.5px;font-weight:800;letter-spacing:.14em}

.em-form{display:flex;flex-direction:column;gap:14px;margin-top:22px}
.em-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media(max-width:520px){.em-row{grid-template-columns:1fr}.em-modal{padding:24px 20px 20px}}
.em-field{display:flex;flex-direction:column;gap:6px}
.em-field > span{font-size:12px;font-weight:700;color:var(--fg)}
.em-field > span em{color:#ef4444;font-style:normal}
.em-field > span small{color:var(--muted);font-weight:500}
.em-field input,.em-field select,.em-field textarea{width:100%;background:var(--bg);border:1px solid var(--line);border-radius:12px;color:var(--fg);font-size:14px;padding:11px 13px;outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit;resize:vertical}
.em-field input:focus,.em-field select:focus,.em-field textarea:focus{border-color:#1d5cff;box-shadow:0 0 0 3px rgba(29,92,255,.16)}
.em-field.invalid input,.em-field.invalid select{border-color:#ef4444}
.em-field small{font-size:11.5px;color:#ef4444}
.em-field select{appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2.4' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center}

.em-privacy{display:flex;align-items:center;gap:7px;margin:0;font-size:11.5px;color:var(--muted)}
.em-error{margin:0;font-size:12.5px;font-weight:600;color:#ef4444}

.em-submit{display:inline-flex;align-items:center;justify-content:center;gap:9px;width:100%;padding:13px;border:0;border-radius:999px;background:#1d5cff;color:#fff;font-size:14px;font-weight:600;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 8px 22px rgba(29,92,255,.32);transition:.2s;font-family:inherit}
.em-submit:hover:not(:disabled){background:#1649d6;transform:translateY(-1px)}
.em-submit:disabled{opacity:.65;cursor:wait}
.em-spin{animation:emrot 1s linear infinite}
@keyframes emrot{to{transform:rotate(360deg)}}

.em-success{text-align:center;padding:18px 4px 6px}
.em-check{width:62px;height:62px;margin:0 auto 16px;border-radius:50%;display:grid;place-items:center;background:rgba(34,197,94,.14);border:2px solid rgba(34,197,94,.5);color:#22c55e}
.em-success h3{margin:0 0 8px;font-size:21px;font-weight:700;color:var(--fg)}
.em-success p{margin:0 0 14px;font-size:13.5px;line-height:1.65;color:var(--muted)}
.em-success p b{color:var(--fg)}
.em-offline{font-size:11.5px !important;color:var(--muted) !important;border:1px dashed var(--line);border-radius:10px;padding:8px 10px}

.em-fade-enter-active,.em-fade-leave-active{transition:opacity .22s ease}
.em-fade-enter-active .em-modal,.em-fade-leave-active .em-modal{transition:transform .26s cubic-bezier(.2,.7,.2,1),opacity .22s}
.em-fade-enter-from,.em-fade-leave-to{opacity:0}
.em-fade-enter-from .em-modal,.em-fade-leave-to .em-modal{transform:translateY(14px) scale(.98);opacity:0}
</style>
