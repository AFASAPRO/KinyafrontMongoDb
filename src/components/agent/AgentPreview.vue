<template>
  <div class="ag-preview">
    <!-- ── Toolbar (§24) ──────────────────────────────────────── -->
    <div class="pv-tools">
      <span class="pv-title"><i class="fas fa-eye" aria-hidden="true"></i> Live preview</span>
      <div class="pv-actions">
        <span v-if="agent.preview.port" class="pv-port">port {{ agent.preview.port }}</span>
        <button class="pv-btn" title="Open in new tab" :disabled="!agent.preview.url" @click="openExternal">
          <i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i>
        </button>
        <button class="pv-btn" title="Reload preview" :disabled="!agent.preview.url" @click="reload">
          <i class="fas fa-rotate" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <!-- ── Honest states (§32) ────────────────────────────────── -->
    <div v-if="!agent.preview.url" class="pv-empty">
      <template v-if="starting">
        <i class="fas fa-spinner fa-spin" aria-hidden="true"></i>
        <p>Starting the preview server…</p>
        <p class="dim">The Agent starts it as soon as a dev server is ready.</p>
      </template>
      <template v-else>
        <i class="fas fa-eye-slash" aria-hidden="true"></i>
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
 * KinyaBot Agent V1 — Preview Tab (§24)
 * Shows the REAL dev-server output through the server's signed-token
 * proxy. The iframe URL is issued by the backend ONLY after it probes
 * the port live — if nothing listens, the honest empty state shows.
 * "Reload" re-requests a fresh token; "Open" pops a new tab.
 */
import { ref, computed, watch, onMounted } from 'vue'
import { useAgentStore } from '../../stores/agent'

const agent = useAgentStore()
const frameKey = ref(0)
const starting = computed(() => agent.preview.status === 'starting')

const baseURL = (import.meta.env.VITE_API_URL || '/api').replace(/\/api\/?$/, '')

const iframeSrc = computed(() => {
  if (!agent.preview.url) return ''
  return baseURL + agent.preview.url
})

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
.ag-preview { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.pv-tools {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-bottom: 1px solid var(--border-subtle, #172033);
  background: var(--surface-secondary, #111827);
}
:global(.light-mode) .pv-tools { background: #F3F5F9; border-bottom-color: #E3E7EF; }
.pv-title { display: flex; gap: 7px; align-items: center; font-size: 12px; color: var(--text-secondary); }
.pv-title i { color: var(--brand); }
.pv-actions { display: flex; gap: 4px; align-items: center; }
.pv-port {
  font-size: 10.5px; padding: 2px 8px; border-radius: 999px;
  background: rgba(34,211,238,.12); color: var(--accent-cyan, #22D3EE);
  font-family: var(--font-mono, monospace);
}
.pv-btn {
  width: 28px; height: 28px; display: grid; place-items: center;
  border: none; border-radius: var(--r-xs, 6px);
  background: transparent; color: var(--text-muted); cursor: pointer; font-size: 12.5px;
}
.pv-btn:hover:not(:disabled) { background: var(--surface-elevated, #151B2B); color: var(--text-primary); }
.pv-btn:disabled { opacity: .35; cursor: default; }

.pv-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: var(--text-muted); font-size: 13px; text-align: center; padding: 24px; }
.pv-empty i { font-size: 26px; opacity: .6; }
.pv-empty .dim { font-size: 12px; max-width: 260px; line-height: 1.5; }

.pv-frame-wrap { flex: 1; background: #FFF; position: relative; }
.pv-frame { position: absolute; inset: 0; width: 100%; height: 100%; border: none; background: #FFF; }
</style>
