<template>
  <div class="agc ag-ui" :class="{ centered }">
    <!-- workspace context chip row (adapts the reference's attachment
         row: instead of uploads, it shows the REAL task/workspace the
         composer is attached to — clicking opens the workspace) -->
    <div v-if="taskChip" class="agc-chips" role="group" aria-label="Task context">
      <button class="agc-chip" :class="{ live: agent.isActive }" @click="agent.openPanel()" title="Open workspace" aria-label="Open the task workspace">
        <i class="fas fa-folder" aria-hidden="true"></i>
        <span class="agc-chip-name">{{ taskChip.name }}</span>
        <span v-if="taskChip.progress" class="agc-chip-badge">{{ taskChip.progress }}</span>
        <i class="fas fa-xmark agc-chip-x" aria-hidden="true" @click.stop="agent.closePanel()" title="Hide workspace"></i>
      </button>
    </div>

    <!-- greeting (reference ss4) only on the empty state -->
    <div v-if="centered && !model.text" class="agc-greet" aria-hidden="true">
      Hi, what do you need today?
    </div>

    <!-- the input area -->
    <textarea
      ref="ta"
      v-model="model.text"
      class="agc-input"
      :placeholder="placeholder"
      :disabled="disabled"
      rows="1"
      aria-label="Describe the task for the agent"
      @keydown="onKeydown"
      @input="autoGrow"
    ></textarea>

    <!-- action bar (reference ss4/ss5): + button · shield toggle · model chip -->
    <div class="agc-bar">
      <div class="agc-bar-left">
        <div class="agc-plus-wrap">
          <button
            class="agc-plus"
            :aria-expanded="menuOpen ? 'true' : 'false'"
            aria-haspopup="menu"
            aria-label="More actions"
            title="More actions"
            @click="menuOpen = !menuOpen"
          ><i class="fas fa-plus" aria-hidden="true"></i></button>
          <div v-if="menuOpen" class="agc-menu" role="menu" aria-label="Composer actions">
            <button v-if="agent.activeTask" role="menuitem" class="ag-menu-item" @click="menuAction('download')">
              <i class="fas fa-file-zipper" aria-hidden="true"></i>
              <span>Download project (.zip)</span>
            </button>
            <button role="menuitem" class="ag-menu-item" @click="menuAction('workspace')">
              <i class="fas fa-table-columns" aria-hidden="true"></i>
              <span>Open workspace</span>
            </button>
            <button role="menuitem" class="ag-menu-item" @click="menuAction('example')">
              <i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i>
              <span>Insert an example task</span>
            </button>
            <div class="ag-menu-sep" role="separator"></div>
            <button role="menuitem" class="ag-menu-item" @click="menuAction('chat')">
              <i class="fas fa-comment" aria-hidden="true"></i>
              <span>Back to Chat mode</span>
            </button>
          </div>
        </div>

        <button
          class="agc-bypass"
          :class="{ on: agent.autoApprove }"
          :aria-pressed="agent.autoApprove ? 'true' : 'false'"
          title="Auto-approve the agent's high-risk command prompts for this task"
          @click="toggleAutoApprove"
        >
          <i class="fas fa-shield-halved" aria-hidden="true"></i>
          <span>{{ agent.autoApprove ? 'Auto-approve on' : 'Auto-approve' }}</span>
        </button>
      </div>

      <div class="agc-bar-right">
        <span v-if="modelLabel" class="agc-model" :title="modelTitle">
          <i class="fas fa-bolt" aria-hidden="true"></i>{{ modelLabel }}
        </span>
        <button
          class="agc-send"
          :disabled="!canSend"
          :aria-label="sendLabel"
          :title="sendLabel"
          @click="send"
        >
          <i class="fas fa-arrow-up" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <!-- honest live-task hint -->
    <div v-if="agent.isActive" class="agc-hint" role="status">
      <span class="ag-dot warn" aria-hidden="true"></span>
      A task is running — stop it before starting another. Follow its progress above.
    </div>
  </div>
</template>

<script setup>
/**
 * KinyaBot Agent V1.1 — Composer Card (reference screenshots 4 & 5)
 * ─────────────────────────────────────────────────────────────────
 * The reference's WHITE rounded composer card: an attachments row
 * (adapted to the real task-context chip), a large input area, and
 * an action bar with a circular “+” menu, a shield “auto-approve”
 * toggle and a model selector chip on the right.
 *
 * Every control is real:
 *  • the chip opens the REAL workspace panel
 *  • “+” → Download project (.zip) / Open workspace / example task /
 *    back to Chat mode
 *  • the shield toggle pre-approves THIS task's §13 confirmation
 *    prompts through the real confirm endpoint (backend stays the
 *    authority — see the agent store)
 *  • the model chip shows the provider + model the backend reports
 *  • send creates a REAL agent task (§4 workflow)
 */
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAgentStore } from '../../stores/agent'
import '../../assets/agent.css'

const props = defineProps({
  centered: { type: Boolean, default: false },   // empty-state hero variant
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['send', 'switch-chat'])

const agent = useAgentStore()
const ta = ref(null)
const menuOpen = ref(false)
const model = reactive({ text: '' })

/* Real provider/model info from GET /agent/config. */
onMounted(() => { if (!agent.agentConfig) agent.fetchConfig() })
const modelLabel = computed(() => {
  const cfg = agent.agentConfig
  if (!cfg?.model) return 'Groq'
  const short = String(cfg.model).replace(/^(openai\/|groq\/)/, '')
  return short.length > 22 ? short.slice(0, 21) + '…' : short
})
const modelTitle = computed(() => `Provider: ${agent.agentConfig?.provider || 'groq'} · Model: ${agent.agentConfig?.model || '(configured server-side)'}`)

/* Task context chip (adapts the reference's attachment chips). */
const taskChip = computed(() => {
  const t = agent.activeTask
  if (!t) return null
  const plan = t.plan || []
  let progress = null
  if (plan.length) {
    const done = plan.filter(s => s.status === 'done').length
    progress = `${Math.round((done / plan.length) * 100)}%`
  } else if (agent.isActive) progress = 'live'
  const name = String(t.title || t.prompt || 'workspace')
  return { name: name.length > 26 ? name.slice(0, 25) + '…' : name, progress }
})

const placeholder = computed(() =>
  agent.isActive ? 'The agent is working — you can stop it from the plan card…' : 'Describe the task — the agent will plan, build and verify it…')

const canSend = computed(() => !props.disabled && !agent.isActive && model.text.trim().length > 0)
const sendLabel = computed(() => agent.isActive ? 'A task is already running' : 'Start the agent task')

/* Auto-grow textarea */
function autoGrow() {
  const el = ta.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 220) + 'px'
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
  if (e.key === 'Escape') menuOpen.value = false
}

function send() {
  const content = model.text.trim()
  if (!content || !canSend.value) return
  emit('send', { content, mode: 'agent' })
  model.text = ''
  requestAnimationFrame(autoGrow)
}

async function toggleAutoApprove() {
  agent.autoApprove = !agent.autoApprove
  if (agent.autoApprove && agent.pendingConfirmation) {
    // A prompt is already waiting — approve it right away (real API).
    await agent.resolveConfirmation(true)
  }
}

function menuAction(action) {
  menuOpen.value = false
  if (action === 'download') {
    agent.downloadTask().catch(() => {})
  } else if (action === 'workspace') {
    agent.openPanel()
  } else if (action === 'chat') {
    emit('switch-chat')
  } else if (action === 'example') {
    model.text = 'Create a modern single-page website for a Rwandan coffee brand — hero, product cards, and a contact section. Then start a dev server so I can preview it.'
    requestAnimationFrame(autoGrow)
    ta.value?.focus()
  }
}

/* close the + menu on outside click */
function onDocClick(e) {
  if (menuOpen.value && !e.target.closest?.('.agc-plus-wrap')) menuOpen.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

defineExpose({ focus: () => ta.value?.focus(), setText: (t) => { model.text = t; requestAnimationFrame(autoGrow) } })
</script>

<style scoped>
/* ═══ THE WHITE COMPOSER CARD (reference ss4/ss5) ══════════════ */
.agc {
  background: #ffffff;
  color: #18181b;
  border-radius: 22px;
  padding: 14px 16px 12px;
  box-shadow: 0 12px 34px rgba(0,0,0,.45), 0 2px 8px rgba(0,0,0,.3);
  display: flex; flex-direction: column; gap: 10px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  position: relative;
  font-family: var(--ag-font);
}
.agc.centered { max-width: 640px; }

/* greeting (reference ss4) */
.agc-greet {
  font-size: 21px;
  color: #3f3f46;
  padding: 4px 4px 0;
}

/* task context chips row (adapted attachment row) */
.agc-chips { display: flex; gap: 10px; flex-wrap: wrap; padding: 2px 2px 0; }
.agc-chip {
  display: inline-flex; align-items: center; gap: 8px;
  background: #f4f4f5;
  border: 1.5px solid #e4e4e7;
  border-radius: 12px;
  padding: 8px 10px;
  font-family: var(--ag-font); font-size: 12.5px; color: #3f3f46;
  cursor: pointer;
  transition: border-color .12s, background .12s;
  max-width: 100%;
}
.agc-chip:hover { border-color: #c9c9cf; background: #ececee; }
.agc-chip.live { border-color: #10b981; }
.agc-chip.live .agc-chip-badge { background: #d1fae5; color: #047857; }
.agc-chip i { color: #71717a; font-size: 12px; }
.agc-chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agc-chip-badge {
  font-family: var(--ag-mono); font-size: 10.5px; font-weight: 700;
  background: #e4e4e7; color: #2563eb;
  padding: 2px 7px; border-radius: 999px; flex-shrink: 0;
}
.agc-chip-x { font-size: 10px; color: #a1a1aa; padding: 2px; }
.agc-chip-x:hover { color: #52525b; }

/* the input */
.agc-input {
  width: 100%;
  border: none; outline: none; resize: none;
  background: transparent;
  font-family: var(--ag-font);
  font-size: 16.5px;
  line-height: 1.5;
  color: #111827;
  padding: 4px 4px 0;
  min-height: 28px;
  max-height: 220px;
  overflow-y: auto;
}
.agc-input::placeholder { color: #a1a1aa; }
.agc-input:disabled { opacity: .6; }
.agc-input:focus-visible { outline: none; }

/* action bar */
.agc-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
}
.agc-bar-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.agc-bar-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

/* circular + button (reference) */
.agc-plus-wrap { position: relative; }
.agc-plus {
  width: 40px; height: 40px; border-radius: 50%;
  background: #e4e4e7; color: #27272a;
  display: grid; place-items: center;
  font-size: 15px; cursor: pointer; border: none;
  transition: background .12s, transform .1s;
  flex-shrink: 0;
}
.agc-plus:hover { background: #d4d4d8; }
.agc-plus:active { transform: scale(.95); }

.agc-menu {
  position: absolute; bottom: calc(100% + 10px); left: 0;
  min-width: 240px;
  background: #18181b; color: #e4e4e7;
  border: 1px solid #2b2b30;
  border-radius: 14px;
  padding: 6px;
  box-shadow: 0 18px 44px rgba(0,0,0,.5);
  z-index: 40;
  animation: ag-menu-in .14s ease;
}
@keyframes ag-menu-in { from { opacity: 0; transform: translateY(5px) } to { opacity: 1; transform: none } }
.ag-menu-item {
  display: flex; align-items: center; gap: 10px;
  width: 100%; text-align: left;
  background: none; border: none; color: #d4d4d8;
  font-size: 13.5px; font-family: var(--ag-font);
  padding: 9px 11px; border-radius: 9px; cursor: pointer;
}
.ag-menu-item:hover { background: #26262b; color: #fff; }
.ag-menu-item i { width: 16px; text-align: center; font-size: 12.5px; color: #a1a1aa; }
.ag-menu-sep { height: 1px; background: #2b2b30; margin: 5px 8px; }

/* shield toggle (reference “Bypass all” — honest adaptation) */
.agc-bypass {
  display: inline-flex; align-items: center; gap: 7px;
  background: none; border: none; cursor: pointer;
  font-family: var(--ag-font); font-size: 13.5px; font-weight: 500;
  color: #52525b;
  padding: 6px 4px;
  border-radius: 8px;
  transition: color .12s;
}
.agc-bypass:hover { color: #18181b; }
.agc-bypass i { font-size: 13px; }
.agc-bypass.on { color: #047857; }
.agc-bypass.on i { color: #059669; }

/* model chip (reference “GPT” slot) */
.agc-model {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; color: #71717a;
  font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 220px;
  cursor: default;
}
.agc-model i { font-size: 10px; color: #a1a1aa; }

/* send button */
.agc-send {
  width: 38px; height: 38px; border-radius: 50%;
  border: none; cursor: pointer;
  background: #18181b; color: #fff;
  display: grid; place-items: center;
  font-size: 14px;
  transition: background .12s, transform .1s, opacity .12s;
  flex-shrink: 0;
}
.agc-send:hover:not(:disabled) { background: #000; }
.agc-send:active:not(:disabled) { transform: scale(.94); }
.agc-send:disabled { background: #e4e4e7; color: #a1a1aa; cursor: default; }

/* live-task hint */
.agc-hint {
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px; color: #71717a;
  padding: 2px 4px 0;
}

/* focus visibility (accessibility, §13) */
.agc :focus-visible { outline: 2px solid #18181b; outline-offset: 2px; }

@media (max-width: 560px) {
  .agc { border-radius: 18px; padding: 12px 12px 10px; }
  .agc-greet { font-size: 18px; }
  .agc-input { font-size: 15.5px; }
  .agc-model { max-width: 110px; }
  .agc-bypass span { display: none; }
  .agc-bypass { padding: 8px; border-radius: 50%; }
}
</style>
