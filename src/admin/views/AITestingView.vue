<template>
  <div class="at">
    <div class="test-grid">
      <SectionCard title="Run a test" subtitle="Calls the real configured AI provider — no mock responses">
        <div class="kbf two">
          <div>
            <label>Model</label>
            <select v-model="form.model" class="inp">
              <option v-for="m in modelOptions" :key="m" :value="m">{{ m }}</option>
              <option value="">Provider default</option>
            </select>
          </div>
          <div>
            <label>Max tokens</label>
            <input type="number" class="inp" min="64" max="8192" v-model.number="form.max_tokens" />
          </div>
        </div>
        <div class="kbf">
          <label>System prompt <span class="hint-inline" v-if="!form.system_prompt">(empty → uses the runtime default)</span></label>
          <textarea v-model="form.system_prompt" class="inp" rows="2" placeholder="Override the system prompt for this test only…"></textarea>
        </div>
        <div class="kbf">
          <label>User prompt</label>
          <textarea v-model="form.prompt" class="inp" rows="5" placeholder="Type a test message and press Ctrl+Enter…" @keydown.ctrl.enter="run"></textarea>
        </div>
        <div class="run-row">
          <button class="btn" :disabled="running || !form.prompt.trim()" @click="run">
            <i v-if="running" class="fas fa-spinner fa-spin"></i><i v-else class="fas fa-play"></i>
            {{ running ? 'Running…' : 'Run test' }}
          </button>
          <div class="knobs">
            <label class="knob-label">Temp {{ form.temperature.toFixed(1) }}</label>
            <input type="range" min="0" max="2" step="0.1" v-model.number="form.temperature" class="range slim" />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Result">
        <div v-if="running" class="result-loading">
          <div class="skel-line"></div><div class="skel-line"></div><div class="skel-line short"></div>
        </div>
        <div v-else-if="result" class="result">
          <div class="res-stats">
            <span class="badge green">success</span>
            <span class="rs">{{ result.response_ms }}ms</span>
            <span class="rs" v-if="result.tokens != null">{{ fmtNum(result.tokens) }} tokens</span>
            <span class="rs mono">{{ result.model }}</span>
          </div>
          <div class="res-text">{{ result.response }}</div>
        </div>
        <div v-else-if="testError" class="result error">
          <div class="res-stats"><span class="badge red">{{ testError.code || 'failed' }}</span><span class="rs">{{ testError.response_ms }}ms</span></div>
          <div class="res-text err">{{ testError.error }}</div>
          <p class="err-hint" v-if="testError.code === 'AI_RATE_LIMIT'">The provider is rate limiting. Wait a moment and retry.</p>
          <p class="err-hint" v-else-if="testError.code === 'AI_MODEL_UNAVAILABLE'">That model does not exist on the provider. Pick a configured model.</p>
          <p class="err-hint" v-else-if="testError.code === 'TIMEOUT' || testError.code === 'AI_TIMEOUT'">The provider took too long to respond. Retry or lower max tokens.</p>
        </div>
        <EmptyState v-else icon="fas fa-flask" title="No test run yet"
          hint="Results show the real response, latency and token usage from the provider." />
      </SectionCard>
    </div>

    <SectionCard title="Session history" subtitle="Tests run in this browser session">
      <div class="hist" v-if="history.length">
        <div v-for="h in history" :key="h.id" class="hist-row" @click="result = h; testError = null">
          <span class="badge" :class="h.ok ? 'green' : 'red'">{{ h.ok ? 'ok' : 'fail' }}</span>
          <span class="hist-prompt">{{ h.prompt }}</span>
          <span class="hist-ms">{{ h.response_ms }}ms</span>
          <span class="hist-when">{{ timeAgo(h.at) }}</span>
        </div>
      </div>
      <EmptyState v-else icon="fas fa-clock-rotate-left" title="No tests yet" compact />
    </SectionCard>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api, { apiError } from '../api'
import SectionCard from '../components/SectionCard.vue'
import EmptyState from '../components/EmptyState.vue'
import { useToast } from '../composables/useToast'
import { fmtNum, timeAgo } from '../format'

const toast = useToast()
const form = reactive({ model: '', system_prompt: '', prompt: '', max_tokens: 1024, temperature: 0.7 })
const running = ref(false)
const result = ref(null)
const testError = ref(null)
const history = ref([])
const configured = ref({ chat: '' })

const modelOptions = computed(() => {
  const c = configured.value || {}
  return [...new Set([c.chat, c.vision, c.document].filter(Boolean))]
})

onMounted(async () => {
  try {
    const { data } = await api.get('/admin/ai/overview')
    configured.value = data.models_configured || {}
  } catch {}
})

async function run() {
  running.value = true
  result.value = null
  testError.value = null
  const startedAt = Date.now()
  try {
    const { data } = await api.post('/admin/ai/test', {
      prompt: form.prompt,
      model: form.model || undefined,
      system_prompt: form.system_prompt || undefined,
      max_tokens: form.max_tokens,
      temperature: form.temperature,
    })
    result.value = data
    history.value.unshift({ id: startedAt, ok: true, prompt: form.prompt.slice(0, 80), response_ms: data.response_ms, at: new Date(), ...data })
  } catch (e) {
    const err = apiError(e)
    testError.value = { ...err, code: err.code || e?.response?.data?.code, response_ms: Date.now() - startedAt, error: e?.response?.data?.error || err.message }
    history.value.unshift({ id: startedAt, ok: false, prompt: form.prompt.slice(0, 80), response_ms: Date.now() - startedAt, at: new Date() })
    if (err.status === 0) toast.error(err.message)
  } finally {
    running.value = false
  }
}
</script>

<style scoped>
.at { display:flex; flex-direction:column; gap:16px; }
.test-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media (max-width:980px) { .test-grid { grid-template-columns:1fr; } }
.kbf { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
.kbf.two { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.kbf label { font-size:12px; font-weight:700; color:var(--text-2); }
.hint-inline { font-weight:500; color:var(--text-3); font-size:11px; }
.inp { background:var(--surface); border:1px solid var(--border); color:var(--text-1); border-radius:10px; padding:10px 12px; font-size:13.5px; outline:none; width:100%; }
.inp:focus { border-color:var(--brand); }
textarea.inp { resize:vertical; font-family:inherit; }
.run-row { display:flex; align-items:center; gap:18px; flex-wrap:wrap; }
.knobs { display:flex; align-items:center; gap:10px; flex:1; }
.knob-label { font-size:12px; font-weight:700; color:var(--text-2); white-space:nowrap; }
.range { accent-color:var(--brand); }
.range.slim { flex:1; }
.result-loading { display:flex; flex-direction:column; gap:10px; padding:8px 0; }
.skel-line { height:14px; border-radius:7px; background:linear-gradient(90deg, var(--surface-secondary) 25%, var(--surface-elevated) 50%, var(--surface-secondary) 75%); background-size:200% 100%; animation:sksh 1.4s infinite; }
.skel-line.short { width:60%; }
@keyframes sksh { 0% { background-position:200% 0 } 100% { background-position:-200% 0 } }
.res-stats { display:flex; gap:9px; align-items:center; margin-bottom:11px; flex-wrap:wrap; }
.rs { font-size:12px; color:var(--text-2); font-weight:700; font-variant-numeric:tabular-nums; }
.res-text { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:14px; font-size:13.5px; color:var(--text-1); white-space:pre-wrap; word-break:break-word; max-height:340px; overflow-y:auto; line-height:1.6; }
.res-text.err { border-color:rgba(239,68,68,.4); color:#f87171; }
.err-hint { font-size:12px; color:var(--text-3); margin:9px 0 0; }
.hist { display:flex; flex-direction:column; }
.hist-row { display:flex; align-items:center; gap:11px; padding:9px 4px; border-bottom:1px dashed var(--border); cursor:pointer; font-size:12.5px; }
.hist-row:hover { color:var(--brand-text); }
.hist-row:last-child { border-bottom:0; }
.hist-prompt { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-2); }
.hist-ms { font-variant-numeric:tabular-nums; color:var(--text-2); font-weight:700; }
.hist-when { color:var(--text-3); font-size:11px; width:80px; text-align:right; }
</style>
