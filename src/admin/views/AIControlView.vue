<template>
  <div class="ai">
    <ErrorState v-if="error" :message="error.message" :status-code="error.status" @retry="load" />
    <div v-if="loading && !data" class="grid-cards"><div v-for="i in 3" :key="i" class="skel-card"></div></div>

    <template v-else-if="d">
      <!-- Provider status — real health check -->
      <div class="provider-row">
        <SectionCard title="Provider" subtitle="Live connectivity check to the configured AI provider">
          <div class="prov">
            <div class="prov-main">
              <div class="prov-logo"><i class="fas fa-microchip"></i></div>
              <div>
                <div class="prov-name">{{ d.provider.name }}</div>
                <div class="prov-detail">{{ d.provider.detail }}</div>
              </div>
            </div>
            <div class="prov-side">
              <StatusDot :status="d.provider.status" />
              <span class="prov-lat" v-if="d.provider.latency_ms != null">{{ fmtMs(d.provider.latency_ms) }}</span>
            </div>
          </div>
          <p class="privacy"><i class="fas fa-lock"></i> API keys are never exposed to this console or the browser.</p>
        </SectionCard>

        <SectionCard title="Configured models" subtitle="Per capability — set via environment, swap without code changes">
          <div class="models">
            <div v-for="(m, key) in d.models_configured" :key="key" class="model-row">
              <span class="mkey">{{ key }}</span>
              <span class="mval">{{ m }}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      <!-- Runtime configuration -->
      <SectionCard title="Runtime configuration" subtitle="Applies to every user conversation immediately after saving">
        <template #actions>
          <button class="btn sm" :disabled="saving" @click="save"><i :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i> {{ saving ? 'Saving…' : 'Save changes' }}</button>
        </template>
        <div class="runtime">
          <div class="kbf full">
            <label>System prompt <span class="lbl-hint">KinyaBot's personality for all chats</span></label>
            <textarea v-model="form.system_prompt" class="inp" rows="4"></textarea>
          </div>
          <div class="kbf">
            <label>Max tokens <b class="rv">{{ form.max_tokens }}</b></label>
            <input type="range" min="256" max="8192" step="128" v-model.number="form.max_tokens" class="range" />
          </div>
          <div class="kbf">
            <label>Temperature <b class="rv">{{ form.temperature }}</b></label>
            <input type="range" min="0" max="2" step="0.1" v-model.number="form.temperature" class="range" />
          </div>
          <div class="kbf">
            <label>Context messages <b class="rv">{{ form.max_context_messages }}</b></label>
            <input type="range" min="2" max="40" step="1" v-model.number="form.max_context_messages" class="range" />
          </div>
        </div>
        <div class="flags">
          <div v-for="f in flags" :key="f.key" class="flag-row">
            <div><div class="flag-l">{{ f.label }}</div><div class="flag-d">{{ f.desc }}</div></div>
            <button class="tog" :class="{ on: form[f.key] }" @click="form[f.key] = !form[f.key]" :aria-label="f.label">
              <span class="knob"></span>
            </button>
          </div>
        </div>
      </SectionCard>

      <!-- Usage by model + recent errors -->
      <div class="two-col">
        <SectionCard title="Usage by model" subtitle="Assistant messages handled per model (all time)">
          <HBarList :items="(d.usage_by_model || []).map(m => ({ label: m.model, value: m.count }))" />
          <div v-for="m in (d.usage_by_model || []).slice(0, 4)" :key="m.model" class="model-stat">
            <span class="mono dim">{{ m.model }}</span>
            <span>{{ fmtMs(m.avg_ms) }} avg · <b :class="m.errors ? 'bad' : 'good'">{{ m.errors }} failed</b> · last used {{ timeAgo(m.last_used) }}</span>
          </div>
          <EmptyState v-if="!d.usage_by_model?.length" icon="fas fa-robot" title="No AI messages yet" compact />
        </SectionCard>
        <SectionCard title="Recent AI errors" subtitle="Failed assistant messages, newest first">
          <div class="errs">
            <div v-for="e in d.recent_errors" :key="e.id" class="err-row">
              <i class="fas fa-circle-xmark"></i>
              <div>
                <div class="err-model mono">{{ e.model || 'unknown model' }}</div>
                <div class="err-when">{{ timeAgo(e.created_at) }}<template v-if="e.chat_title"> · “{{ e.chat_title }}”</template></div>
              </div>
            </div>
            <EmptyState v-if="!d.recent_errors?.length" icon="fas fa-circle-check" title="No AI errors recorded" compact />
          </div>
        </SectionCard>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import api, { apiError } from '../api'
import SectionCard from '../components/SectionCard.vue'
import StatusDot from '../components/StatusDot.vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import HBarList from '../components/charts/HBarList.vue'
import { useToast } from '../composables/useToast'
import { fmtMs, timeAgo } from '../format'

const toast = useToast()
const d = ref(null), loading = ref(false), error = ref(null), saving = ref(false)
const form = reactive({})
const flags = computed(() => [
  { key: 'image_gen_enabled', label: 'Image understanding', desc: 'Allow users to attach images to chats' },
  { key: 'file_uploads_enabled', label: 'File uploads', desc: 'Allow users to attach documents and audio' },
  { key: 'knowledge_base_enabled', label: 'Knowledge Base (RAG)', desc: 'Ground answers in the knowledge documents' },
  { key: 'moderation_enabled', label: 'Auto moderation', desc: 'Flag harmful content automatically' },
])

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data } = await api.get('/admin/ai/overview')
    d.value = data
    Object.keys(form).forEach(k => delete form[k])
    Object.assign(form, data.runtime, data.feature_flags)
  } catch (e) { error.value = apiError(e) }
  finally { loading.value = false }
}
async function save() {
  saving.value = true
  try {
    const payload = {
      system_prompt: form.system_prompt, max_tokens: form.max_tokens,
      temperature: form.temperature, max_context_messages: form.max_context_messages,
      image_gen_enabled: !!form.image_gen_enabled, file_uploads_enabled: !!form.file_uploads_enabled,
      knowledge_base_enabled: !!form.knowledge_base_enabled, moderation_enabled: !!form.moderation_enabled,
    }
    await api.put('/admin/ai/runtime', payload)
    toast.success('AI configuration saved')
    load()
  } catch (e) { toast.error(apiError(e).message) }
  finally { saving.value = false }
}
onMounted(load)
</script>

<style scoped>
.ai { display:flex; flex-direction:column; gap:16px; }
.provider-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media (max-width:980px) { .provider-row { grid-template-columns:1fr; } }
.prov { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.prov-main { display:flex; align-items:center; gap:14px; }
.prov-logo { width:48px; height:48px; border-radius:14px; background:var(--brand-soft); color:var(--brand-text); display:flex; align-items:center; justify-content:center; font-size:19px; }
.prov-name { font-size:16px; font-weight:800; color:var(--text-1); }
.prov-detail { font-size:12px; color:var(--text-3); margin-top:2px; }
.prov-side { display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
.prov-lat { font-size:12px; color:var(--text-2); font-weight:700; font-variant-numeric:tabular-nums; }
.privacy { margin:12px 0 0; font-size:11.5px; color:var(--text-3); display:flex; gap:6px; align-items:center; }
.privacy i { color:#34d399; }
.models { display:flex; flex-direction:column; }
.model-row { display:flex; gap:12px; padding:8px 0; border-bottom:1px dashed var(--border); align-items:baseline; }
.model-row:last-child { border-bottom:0; }
.mkey { font-size:10.5px; text-transform:uppercase; letter-spacing:.1em; color:var(--text-3); font-weight:800; width:76px; flex:none; }
.mval { font-family:ui-monospace, monospace; font-size:12px; color:var(--text-1); word-break:break-all; }
.runtime { display:grid; grid-template-columns:1fr 1fr; gap:16px 22px; margin-bottom:16px; }
.kbf { display:flex; flex-direction:column; gap:7px; }
.kbf.full { grid-column:1 / -1; }
.kbf label { font-size:12px; font-weight:700; color:var(--text-2); display:flex; justify-content:space-between; align-items:center; }
.lbl-hint { font-weight:500; color:var(--text-3); font-size:11px; }
.rv { color:var(--brand-text); font-variant-numeric:tabular-nums; }
.inp { background:var(--surface); border:1px solid var(--border); color:var(--text-1); border-radius:10px; padding:10px 12px; font-size:13.5px; outline:none; width:100%; }
.inp:focus { border-color:var(--brand); }
textarea.inp { resize:vertical; }
.range { width:100%; accent-color:var(--brand); }
.flags { display:grid; grid-template-columns:1fr 1fr; gap:8px 22px; }
@media (max-width:800px) { .runtime, .flags { grid-template-columns:1fr; } }
.flag-row { display:flex; align-items:center; justify-content:space-between; gap:12px; background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:11px 14px; }
.flag-l { font-size:13px; font-weight:700; color:var(--text-1); }
.flag-d { font-size:11px; color:var(--text-3); margin-top:2px; }
.tog { width:44px; height:25px; border-radius:99px; background:var(--surface-elevated); border:1px solid var(--border); position:relative; cursor:pointer; transition:background .18s ease; flex:none; }
.tog .knob { position:absolute; top:2px; left:2px; width:19px; height:19px; border-radius:50%; background:var(--text-3); transition:all .18s ease; }
.tog.on { background:var(--brand); border-color:var(--brand); }
.tog.on .knob { left:21px; background:#fff; }
.two-col { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
@media (max-width:980px) { .two-col { grid-template-columns:1fr; } }
.model-stat { display:flex; flex-direction:column; gap:2px; font-size:11.5px; color:var(--text-3); padding:8px 0; border-bottom:1px dashed var(--border); }
.model-stat:last-child { border-bottom:0; }
.dim { color:var(--text-2); }
.good { color:#34d399; } .bad { color:#f87171; }
.errs { display:flex; flex-direction:column; }
.err-row { display:flex; gap:11px; align-items:flex-start; padding:9px 0; border-bottom:1px dashed var(--border); }
.err-row:last-child { border-bottom:0; }
.err-row i { color:#f87171; margin-top:3px; }
.err-model { font-size:12px; color:var(--text-1); }
.err-when { font-size:11px; color:var(--text-3); margin-top:2px; }
.grid-cards { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
.skel-card { height:220px; border-radius:16px; background:linear-gradient(90deg, var(--surface-secondary) 25%, var(--surface-elevated) 50%, var(--surface-secondary) 75%); background-size:200% 100%; animation:sksh 1.4s infinite; }
@keyframes sksh { 0% { background-position:200% 0 } 100% { background-position:-200% 0 } }
.btn.sm { padding:8px 14px; font-size:12.5px; }
</style>
