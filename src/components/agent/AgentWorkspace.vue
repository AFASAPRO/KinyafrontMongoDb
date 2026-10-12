<template>
  <!-- ═══ DESKTOP: resizable right column (§5) ═══ -->
  <aside
    v-if="!isMobile"
    class="agent-ws"
    :class="{ open: agent.panelOpen }"
    :style="{ width: agent.panelOpen ? agent.panelWidth + 'px' : '0px' }"
    aria-label="Agent workspace"
  >
    <!-- Drag-resize handle -->
    <div
      v-if="agent.panelOpen"
      class="ws-resize"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize workspace"
      @pointerdown="startResize"
    ></div>

    <div v-if="agent.panelOpen" class="ws-inner">
      <slot />
    </div>
  </aside>

  <!-- ═══ MOBILE: full-screen drawer (§5 responsive) ═══ -->
  <teleport to="body">
    <transition name="aw-fade">
      <div v-if="isMobile && agent.panelOpen" class="aw-mob-overlay" @click="agent.closePanel()"></div>
    </transition>
    <transition name="aw-slide-up">
      <div v-if="isMobile && agent.panelOpen" class="aw-mob-sheet" role="dialog" aria-label="Agent workspace">
        <div class="aw-mob-grip" @pointerdown="startSheetDrag"></div>
        <div class="ws-inner">
          <slot />
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
/**
 * KinyaBot Agent V1 — Workspace Shell (§5, §27)
 * ─────────────────────────────────────────────
 * The third column of the Agent layout:
 *   desktop → resizable right panel (360–720px, drag handle)
 *   mobile  → near-full-screen drawer with grip + backdrop
 *
 * Pure layout: the CONTENT (header/plan/tabs) is slotted in by
 * AgentWorkspacePanel.vue so the shell stays reusable.
 */
import { useAgentStore } from '../../stores/agent'
import { useIsMobile } from '../../composables/useIsMobile'

const agent = useAgentStore()
const isMobile = useIsMobile()

/* ── Desktop resize (pointer events, §5) ────────────────────── */
let resizing = false
function startResize(e) {
  resizing = true
  e.target.setPointerCapture?.(e.pointerId)
  const onMove = (ev) => {
    if (!resizing) return
    // width grows when the pointer moves LEFT of the right edge
    agent.setWidth(window.innerWidth - ev.clientX)
  }
  const onUp = () => {
    resizing = false
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

/* ── Mobile sheet: grip drag to dismiss ─────────────────────── */
let sheetY0 = null
function startSheetDrag(e) {
  sheetY0 = e.clientY
  const onMove = (ev) => {
    if (sheetY0 == null) return
    if (ev.clientY - sheetY0 > 90) { sheetY0 = null; agent.closePanel() }
  }
  const onUp = () => { sheetY0 = null; window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp) }
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}
</script>

<style scoped>
/* ── Desktop panel ─────────────────────────────────────────── */
.agent-ws {
  position: relative;
  flex-shrink: 0;
  height: 100vh; height: 100dvh;
  background: var(--surface-sidebar);
  border-left: 1px solid var(--border);
  overflow: hidden;
  transition: width .18s ease;
}
.agent-ws:not(.open) { border-left: none; }

.ws-resize {
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 7px; cursor: col-resize; z-index: 5;
  touch-action: none;
}
.ws-resize::after {
  content: ''; position: absolute; left: 3px; top: 50%;
  transform: translateY(-50%);
  width: 2px; height: 42px; border-radius: 2px;
  background: var(--border-strong);
  opacity: 0; transition: opacity .15s;
}
.agent-ws:hover .ws-resize::after { opacity: .8; }
.ws-resize:hover::after { background: var(--brand); opacity: 1; }

.ws-inner {
  height: 100%;
  display: flex; flex-direction: column;
  min-width: 340px; /* content never reflows mid-drag */
}

/* ── Mobile drawer ─────────────────────────────────────────── */
.aw-mob-overlay {
  position: fixed; inset: 0; z-index: 210;
  background: rgba(2,4,10,.55);
  backdrop-filter: blur(2px);
}
.aw-mob-sheet {
  position: fixed; left: 0; right: 0; bottom: 0; top: 44px;
  z-index: 211;
  background: var(--surface);
  border-top: 1px solid var(--border);
  border-radius: 16px 16px 0 0;
  box-shadow: var(--shadow-md);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.aw-mob-grip {
  position: absolute; top: 7px; left: 50%;
  transform: translateX(-50%);
  width: 44px; height: 5px; border-radius: 3px;
  background: var(--border-strong);
  cursor: grab; z-index: 6;
}

/* transitions */
.aw-fade-enter-active, .aw-fade-leave-active { transition: opacity .18s ease; }
.aw-fade-enter-from, .aw-fade-leave-to { opacity: 0; }
.aw-slide-up-enter-active, .aw-slide-up-leave-active { transition: transform .22s cubic-bezier(.32,.72,.28,1); }
.aw-slide-up-enter-from, .aw-slide-up-leave-to { transform: translateY(100%); }
</style>
