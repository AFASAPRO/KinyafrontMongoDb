<template>
  <div class="agp ag-ui">
    <!-- ── Browser chrome (reference preview panel look) ──────── -->
    <div class="pv-chrome">
      <div class="pv-dots" aria-hidden="true">
        <span class="d r"></span><span class="d y"></span><span class="d g"></span>
      </div>
      <div class="pv-url" :title="urlTitle">
        <i class="fas fa-lock" aria-hidden="true" v-if="agent.preview.url"></i>
        <i class="fas fa-globe" aria-hidden="true" v-else></i>
        <span class="pv-url-text">{{ urlLabel }}</span>
      </div>
      <div class="pv-actions">
        <span v-if="agent.preview.port" class="pv-port">:{{ agent.preview.port }}</span>
        <button class="ag-icon-btn" title="Open in new tab" :disabled="!agent.preview.url" @click="openExternal">
          <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </button>
        <button class="ag-icon-btn" title="Reload preview" :disabled="!agent.preview.url" @click="reload">
          <i class="fas fa-rotate" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <!-- ── Honest states (§32) ────────────────────────────────── -->
    <div v-if="!agent.preview.url" class="pv-empty">
      <template v-if="starting">
        <span class="ag-ring" style="--ring-size:26px" aria-hidden="true"></span>
        <p>Starting the preview server…</p>
        <p class="dim">The Agent starts it as soon as a dev server is ready.</p>
      </template>
      <template v-else>
        <AgentGlobe :size="44" />
        <p>No preview server is running.</p>
        <p class="dim">When the Agent runs a dev server (for example a static site or Vite app), the live result appears here.</p>
      </template>
    </div>

    <!-- ── The REAL preview (signed-token iframe, §24) ─────────── -->
    <div v-else class="pv-frame-wrap">
      <iframe
        :key="frameKey"
        :src="iframeSrc"
        class="pv-frame"
        title="Agent live preview"
        sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
        referrerpolicy="no-referrer"
      ></iframe>
    </div>
  </div>
</template>

<script setup>
/**
 * KinyaBot Agent V1.1 — Preview Tab (§24)
 * Same REAL preview pipeline as V1 (signed-token proxy iframe, honest
 * offline/loading states) inside a reference-styled browser chrome.
 * "Reload" re-requests a fresh token; "Open" pops a real new tab.
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useAgentStore } from '../../stores/agent'
import AgentGlobe from './AgentGlobe.vue'
import '../../assets/agent.css'

const agent = useAgentStore()
const frameKey = ref(0)
const starting = computed(() => agent.preview.status === 'starting')

const baseURL = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '')

const iframeSrc = computed(() => {
  if (!agent.preview.url) return ''
  return baseURL + agent.preview.url
})

const urlLabel = computed(() => {
  if (agent.preview.url) return `localhost:${agent.preview.port} (proxied)`
  return 'no preview'
})
const urlTitle = computed(() => agent.preview.url ? 'Live preview served through the authenticated proxy' : 'No preview server running')

function reload() {
  agent.fetchPreviewToken().finally(() => { frameKey.value++ })
}
function openExternal() {
  if (agent.preview.url) window.open(baseURL + agent.preview.url, '_blank', 'noopener')
}

// When a preview becomes ready while this tab is mounted, ensure a token.
onMounted(() => { if (agent.previewLive && !agent.preview.url) agent.fetchPreviewToken() })
watch(() => agent.previewLive, live => { if (live && !agent.preview.url) agent.fetchPreviewToken() })
</script>

<style scoped>
.agp { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

/* browser chrome */
.pv-chrome {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--ag-border);
  background: var(--ag-card);
}
.pv-dots { display: flex; gap: 5px; flex-shrink: 0; }
.pv-dots .d { width: 9px; height: 9px; border-radius: 50%; }
.pv-dots .r { background: #3a3a3d; }
.pv-dots .y { background: #3a3a3d; }
.pv-dots .g { background: var(--ag-accent); }
.pv-url {
  flex: 1; min-width: 0;
  display: flex; align-items: center; gap: 7px;
  background: var(--ag-code-bg);
  border: 1px solid var(--ag-border);
  border-radius: 999px;
  padding: 5px 12px;
  font-family: var(--ag-mono); font-size: 11px; color: var(--ag-text-3);
  overflow: hidden;
}
.pv-url i { font-size: 9px; flex-shrink: 0; color: var(--ag-text-3); }
.pv-url-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pv-actions { display: flex; gap: 3px; align-items: center; flex-shrink: 0; }
.pv-port {
  font-size: 10.5px; padding: 2px 8px; border-radius: 999px;
  background: rgba(16,185,129,.12); color: var(--ag-accent-2);
  font-family: var(--ag-mono);
}

.pv-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 9px; color: var(--ag-text-3); font-size: 13px; text-align: center; padding: 24px; }
.pv-empty .dim { font-size: 12px; max-width: 280px; line-height: 1.5; }

.pv-frame-wrap {
  flex: 1; background: #FFF; position: relative;
  border-radius: 0 0 var(--ag-r-sm) var(--ag-r-sm);
  overflow: hidden;
}
.pv-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: none; background: #FFF; }
</style>
