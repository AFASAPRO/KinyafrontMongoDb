<template>
  <div class="ws-activity" :class="{ 'is-done': isDone, 'is-live': isLive }" role="status" :aria-label="ariaLabel">
    <!-- ── Compact collapsed summary (click to expand) ─────────────── -->
    <button
      v-if="isDone && collapsed"
      class="ws-pill"
      type="button"
      :aria-expanded="false"
      :aria-label="`Web search details: searched ${sourceCount} sources. Expand`"
      @click="collapsed = false"
    >
      <i class="fas fa-globe" aria-hidden="true"></i>
      <span v-if="isSuccess">Searched {{ sourceCount }} source{{ sourceCount === 1 ? '' : 's' }}</span>
      <span v-else-if="status === 'empty'">Searched the web · no reliable sources found</span>
      <span v-else>Web Search unavailable · answered from existing knowledge</span>
      <i class="fas fa-chevron-down ws-caret" aria-hidden="true"></i>
    </button>

    <!-- ── Expanded panel ──────────────────────────────────────────── -->
    <div v-else class="ws-panel">
      <div class="ws-head" :class="{ clickable: isDone }" @click="isDone && (collapsed = true)">
        <span class="ws-globe" :class="{ spin: isLive && stage === 'searching' }" aria-hidden="true"><i class="fas fa-globe"></i></span>
        <span class="ws-title">Web Search</span>
        <span v-if="isLive" class="ws-live-tag">
          <i class="fas fa-circle" aria-hidden="true"></i> live
        </span>
        <span v-if="isDone && sourceCount" class="ws-count">{{ sourceCount }} source{{ sourceCount === 1 ? '' : 's' }}<template v-if="wasCached"> · cached</template></span>
        <button v-if="isDone" class="ws-collapse" type="button" aria-label="Collapse search details" @click.stop="collapsed = true">
          <i class="fas fa-chevron-up" aria-hidden="true"></i>
        </button>
      </div>

      <!-- The ACTUAL query searched — transparency without internal prompts (§15) -->
      <div v-if="displayQuery" class="ws-query" :title="displayQuery">“{{ displayQuery }}”</div>

      <!-- Stage checklist (live) / summary (done) -->
      <ul class="ws-steps">
        <li v-for="step in steps" :key="step.key" :class="step.state">
          <span class="ws-step-ic" aria-hidden="true">
            <i v-if="step.state === 'done'" class="fas fa-check"></i>
            <i v-else-if="step.state === 'active'" class="fas fa-spinner spin"></i>
            <i v-else class="fas fa-circle"></i>
          </span>
          <span class="ws-step-label">{{ step.label }}</span>
          <span v-if="step.key === 'searching' && sourcesFound" class="ws-step-meta">{{ sourcesFound }} found</span>
        </li>
      </ul>

      <!-- Honest degradation notices (§25) — never a raw error -->
      <div v-if="notice" class="ws-notice"><i class="fas fa-circle-info" aria-hidden="true"></i><span>{{ notice }}</span></div>

      <!-- Source domains touched (compact row) -->
      <div v-if="domains.length && isDone" class="ws-domains" aria-label="Source domains">
        <span v-for="d in domains.slice(0, 6)" :key="d" class="ws-domain">{{ d }}</span>
        <span v-if="domains.length > 6" class="ws-domain more">+{{ domains.length - 6 }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
/**
 * WebSearchActivity (§14) — reusable search-activity block.
 *
 * Two data shapes are accepted (never fabricated — §42):
 *   activity  — LIVE progress from the SSE stream while the answer
 *               is being generated (stages, current query, hits).
 *   webSearch — the PERSISTED provenance of a finished message
 *               (message.web_search from the database).
 *
 * After completion the block collapses to a one-line pill
 * ("⌕ Searched 7 sources") that expands on click.
 */
import { computed, ref, watch } from 'vue'

const props = defineProps({
  activity: { type: Object, default: null },   // live streaming activity
  webSearch: { type: Object, default: null },  // persisted message.web_search
})

const collapsed = ref(false)
watch(() => [props.activity, props.webSearch], () => { collapsed.value = false }, { deep: false })

const live = computed(() => props.activity && props.activity.active && !props.activity.done ? props.activity : null)
const persisted = computed(() => {
  const ws = props.webSearch
  if (!ws || ws.performed === false && !ws.queries?.length) {
    // Unavailable/empty attempts are still honest info worth a pill
    if (ws && ws.status && ws.status !== 'success') return ws
    return null
  }
  return ws
})

const isLive = computed(() => !!live.value)
const isDone = computed(() => !isLive.value)
const current = computed(() => live.value || persisted.value)
const status = computed(() => current.value?.status || null)
const isSuccess = computed(() => status.value === 'success')
const wasCached = computed(() => !!current.value?.cached)
const sourcesFound = computed(() => current.value?.sourcesFound ?? current.value?.result_count ?? 0)
const sourceCount = computed(() => (current.value?.sources?.length) || sourcesFound.value || 0)
const domains = computed(() => current.value?.domains || [])
const displayQuery = computed(() => {
  const q = current.value?.query || current.value?.queries?.[0]
  return q ? String(q).slice(0, 90) : ''
})
const notice = computed(() => {
  if (isLive.value) return current.value?.notice || null
  if (status.value === 'unavailable' || status.value === 'rate_limited')
    return 'Web Search was unavailable for this answer — generated from existing knowledge.'
  if (status.value === 'empty')
    return 'The search did not return reliable sources for this question.'
  return null
})

/* Stage machine (§13): understanding → searching → reading → preparing.
   Live: spinner on the active stage, checks on completed ones.
   Done: everything checked (or the honest unavailable state). */
const steps = computed(() => {
  const stage = isLive.value ? (live.value.stage || 'understanding') : 'preparing'
  const order = [
    { key: 'understanding', label: 'Understanding your question' },
    { key: 'searching', label: 'Searching relevant sources' },
    { key: 'reading', label: 'Reading useful pages' },
    { key: 'preparing', label: 'Preparing answer' },
  ]
  let activeIdx = order.findIndex(s => s.key === stage)
  if (isLive.value && live.value.done) activeIdx = order.length - 1
  if (status.value === 'unavailable' || status.value === 'rate_limited') {
    return order.slice(0, 2).map((s, i) => ({ ...s, state: i === 0 ? 'done' : 'failed' }))
      .concat([{ key: 'answer', label: 'Answering from existing knowledge', state: 'active' }])
  }
  return order.map((s, i) => ({
    ...s,
    state: isLive.value ? (i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'idle')
                        : (status.value === 'empty' && i === 1 ? 'failed' : 'done'),
  }))
})

const ariaLabel = computed(() =>
  isLive.value ? 'Searching the web' : `Web search ${isSuccess.value ? `completed with ${sourceCount.value} sources` : status.value || ''}`
)
</script>

<style scoped>
.ws-activity { margin: 0 0 10px; }
.ws-pill {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--surface-secondary); border: 1px solid var(--border);
  color: var(--text-secondary); border-radius: 999px;
  padding: 6px 12px; font-size: 12px; font-weight: 600; cursor: pointer;
  transition: border-color .15s ease, color .15s ease;
}
.ws-pill:hover { border-color: var(--brand); color: var(--text-primary); }
.ws-pill .fa-globe { color: var(--brand-text); font-size: 11px; }
.ws-caret { font-size: 9px; opacity: .6; }

.ws-panel {
  background: var(--surface-secondary);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 12px 14px;
}
.ws-head { display: flex; align-items: center; gap: 9px; }
.ws-head.clickable { cursor: pointer; }
.ws-globe {
  width: 26px; height: 26px; border-radius: 9px; flex: none;
  background: var(--brand-soft); color: var(--brand-text);
  display: flex; align-items: center; justify-content: center; font-size: 12px;
}
.ws-globe.spin i { animation: ws-spin 1.4s linear infinite; }
@keyframes ws-spin { to { transform: rotate(360deg); } }
.ws-title { font-size: 12.5px; font-weight: 800; color: var(--text-primary); letter-spacing: .01em; }
.ws-live-tag { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 700; color: var(--accent-cyan); text-transform: uppercase; letter-spacing: .08em; }
.ws-live-tag i { font-size: 5px; animation: ws-pulse 1.2s ease-in-out infinite; }
@keyframes ws-pulse { 0%,100% { opacity: 1 } 50% { opacity: .3 } }
.ws-count { margin-left: auto; font-size: 11px; color: var(--text-muted); font-weight: 600; }
.ws-collapse {
  background: transparent; border: 1px solid var(--border); color: var(--text-muted);
  width: 24px; height: 24px; border-radius: 8px; cursor: pointer; flex: none;
  display: flex; align-items: center; justify-content: center; font-size: 10px;
}
.ws-collapse:hover { color: var(--text-primary); border-color: var(--border-strong); }
.ws-query {
  margin: 9px 0 2px; font-size: 12.5px; color: var(--text-secondary);
  font-style: italic; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ws-steps { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 5px; }
.ws-steps li { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--text-muted); }
.ws-steps li.done { color: var(--text-secondary); }
.ws-steps li.done .ws-step-ic { color: #34d399; }
.ws-steps li.active { color: var(--text-primary); font-weight: 600; }
.ws-steps li.active .ws-step-ic { color: var(--accent-cyan); }
.ws-steps li.failed { color: var(--text-muted); }
.ws-steps li.failed .ws-step-ic { color: #f59e0b; }
.ws-step-ic { width: 14px; text-align: center; flex: none; font-size: 10px; }
.ws-step-ic .fa-circle { font-size: 5px; opacity: .5; }
.ws-step-meta { margin-left: auto; font-size: 11px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.spin { animation: ws-spin 1.2s linear infinite; display: inline-block; }
.ws-notice {
  margin-top: 9px; display: flex; gap: 8px; align-items: flex-start;
  font-size: 12px; color: var(--text-secondary);
  background: var(--surface-elevated); border: 1px solid var(--border);
  border-radius: 10px; padding: 8px 10px;
}
.ws-notice i { color: var(--accent-cyan); margin-top: 2px; }
.ws-domains { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
.ws-domain {
  font-size: 10.5px; font-weight: 600; color: var(--text-muted);
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 999px; padding: 3px 9px;
}
.ws-domain.more { color: var(--brand-text); }
</style>
