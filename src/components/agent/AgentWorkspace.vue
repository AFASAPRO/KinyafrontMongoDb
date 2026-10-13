<template>
  <!-- ═══ DESKTOP: rounded "computer panel" column (§5, reference) ═ -->
  <aside
    v-if="!isMobile"
    class="ag-ws ag-ui"
    :class="{ open: agent.panelOpen }"
    :style="{ width: agent.panelOpen ? agent.panelWidth + 'px' : '0px' }"
    aria-label="Agent workspace"
  >
    <!-- Drag-resize handle (kept from V1 — real resizable panel) -->
    <div
      v-if="agent.panelOpen"
      class="ag-ws-resize"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize workspace"
      @pointerdown="startResize"
    ></div>

    <div v-if="agent.panelOpen" class="ag-ws-inner">
      <slot />
    </div>
  </aside>

  <!-- ═══ MOBILE: bottom sheet with grip (§5 responsive) ═════════ -->
  <teleport to="body">
    <transition name="ag-fade">
      <div v-if="isMobile && agent.panelOpen" class="ag-mob-overlay" @click="agent.closePanel()"></div>
    </transition>
    <transition name="ag-sheet">
      <div v-if="isMobile && agent.panelOpen" class="ag-mob-sheet ag-ui" role="dialog" aria-label="Agent workspace">
        <div class="ag-mob-grip" @pointerdown="startSheetDrag"></div>
        <div class="ag-ws-inner">
          <slot />
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
/**
 * KinyaBot Agent V1.1 — Workspace Shell (reference "computer" panel)
 * ─────────────────────────────────────────────────────────────────
 * Same functional skeleton as V1 (resizable desktop column 360–760px,
 * mobile bottom sheet with grip + backdrop) restyled to the reference:
 * a rounded panel inset from the canvas edge instead of a flat column.
 * The CONTENT is slotted by AgentWorkspacePanel.vue.
 */
import { useAgentStore } from '../../stores/agent'
import { useIsMobile } from '../../composables/useIsMobile'
import '../../assets/agent.css'

const agent = useAgentStore()
const isMobile = useIsMobile()

/* ── Desktop resize (pointer events, §5) ────────────────────── */
let resizing = false
function startResize(e) {
  resizing = true
  e.target.setPointerCapture?.(e.pointerId)
  const onMove = (ev) => {
    if (!resizing) return
    agent.setWidth(window.innerWidth - ev.clientX - 10)
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
/* desktop: rounded panel floating on the canvas (reference) */
.ag-ws {
  position: relative;
  flex-shrink: 0;
  height: 100vh; height: 100dvh;
  overflow: hidden;
  transition: width .2s cubic-bezier(.2,.7,.2,1);
}
.ag-ws-inner {
  height: 100%;
  margin: 10px 10px 10px 0;      /* inset — the panel reads as floating */
  border-radius: 16px;
  background: var(--ag-panel);
  border: 1px solid var(--ag-border);
  overflow: hidden;
  display: flex; flex-direction: column;
  min-width: 340px;               /* content never reflows mid-drag */
  box-shadow: 0 18px 50px rgba(0,0,0,.4);
}

.ag-ws-resize {
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 10px; cursor: col-resize; z-index: 5;
  touch-action: none;
}
.ag-ws-resize::after {
  content: ''; position: absolute; left: 4px; top: 50%;
  transform: translateY(-50%);
  width: 2.5px; height: 46px; border-radius: 3px;
  background: var(--ag-border-2);
  opacity: 0; transition: opacity .15s;
}
.ag-ws:hover .ag-ws-resize::after { opacity: .9; }
.ag-ws-resize:hover::after { background: var(--ag-accent); opacity: 1; }

/* mobile sheet */
.ag-mob-overlay {
  position: fixed; inset: 0; z-index: 210;
  background: rgba(0,0,0,.55);
  backdrop-filter: blur(3px);
}
.ag-mob-sheet {
  position: fixed; left: 0; right: 0; bottom: 0; top: 40px;
  z-index: 211;
  background: var(--ag-panel);
  border-top: 1px solid var(--ag-border);
  border-radius: 18px 18px 0 0;
  box-shadow: 0 -18px 50px rgba(0,0,0,.5);
  display: flex; flex-direction: column;
  overflow: hidden;
}
.ag-mob-grip {
  position: absolute; top: 7px; left: 50%;
  transform: translateX(-50%);
  width: 44px; height: 5px; border-radius: 3px;
  background: var(--ag-border-2);
  cursor: grab; z-index: 6;
}
.ag-mob-sheet .ag-ws-inner { margin: 0; border-radius: 0; min-width: 0; }

/* transitions */
.ag-fade-enter-active, .ag-fade-leave-active { transition: opacity .18s ease; }
.ag-fade-enter-from, .ag-fade-leave-to { opacity: 0; }
.ag-sheet-enter-active, .ag-sheet-leave-active { transition: transform .24s cubic-bezier(.32,.72,.28,1); }
.ag-sheet-enter-from, .ag-sheet-leave-to { transform: translateY(100%); }
</style>
