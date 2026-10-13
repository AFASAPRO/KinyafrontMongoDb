<template>
  <div class="agc ag-ui" :class="{ centered }">
    <!-- workspace context chip row -->
    <div v-if="taskChip" class="agc-chips" role="group" aria-label="Task context">
      <button class="agc-chip" :class="{ live: agent.isActive }" @click="agent.openPanel()" title="Open workspace" aria-label="Open the task workspace">
        <i class="fas fa-folder" aria-hidden="true"></i>
        <span class="agc-chip-name">{{ taskChip.name }}</span>
        <span v-if="taskChip.progress" class="agc-chip-badge">{{ taskChip.progress }}</span>
        <i class="fas fa-xmark agc-chip-x" aria-hidden="true" @click.stop="agent.closePanel()" title="Hide workspace"></i>
      </button>
    </div>

    <!-- V1.2 §8/§9: attachment previews (thumbnails + removable) -->
    <div v-if="agent.referenceImages.length || agent.projectZip" class="agc-atts" role="group" aria-label="Attached files">
      <div v-for="img in agent.referenceImages" :key="img.id" class="agc-att" :title="img.name">
        <img v-if="img.thumb" :src="img.thumb" :alt="`Reference image ${img.name}`" class="agc-att-thumb" />
        <span v-else class="agc-att-thumb placeholder"><i class="fas fa-image" aria-hidden="true"></i></span>
        <button class="agc-att-x" :aria-label="`Remove ${img.name}`" title="Remove image" @click="agent.removeReferenceImage(img.id)">
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
      <div v-if="agent.projectZip" class="agc-att zip" :title="agent.projectZip.name">
        <span class="agc-att-thumb placeholder"><i class="fas fa-file-zipper" aria-hidden="true"></i></span>
        <span class="agc-att-name">{{ clip(agent.projectZip.name, 22) }}</span>
        <button class="agc-att-x" aria-label="Remove project archive" title="Remove archive" @click="agent.removeProjectZip()">
          <i class="fas fa-xmark" aria-hidden="true"></i>
        </button>
      </div>
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

    <!-- action bar (reference ss4/ss5): + menu · attachments · shield · model chip · send/stop -->
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

        <!-- V1.2 §6: attachment controls (reference image + project zip) -->
        <div class="agc-attach-group" role="group" aria-label="Attach files">
          <button
            class="agc-icon-tool"
            :disabled="!canAttach || agent.uploadState === 'uploading'"
            title="Attach reference images (PNG, JPEG, WebP, GIF)"
            aria-label="Attach reference images"
            @click="pickImages"
          ><i class="fas" :class="visionCapable ? 'fa-image' : 'fa-image'" aria-hidden="true"></i></button>
          <button
            class="agc-icon-tool"
            :disabled="!canAttach || agent.uploadState === 'uploading'"
            title="Upload an existing project (.zip) for the agent to modify"
            aria-label="Upload an existing project archive"
            @click="pickZip"
          ><i class="fas fa-file-arrow-up" aria-hidden="true"></i></button>
          <span v-if="agent.uploadState === 'uploading'" class="agc-up-spin" role="status">
            <i class="fas fa-spinner fa-spin" aria-hidden="true"></i> uploading…
          </span>
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
        <!-- V1.2 §6: STOP replaces send while a task executes -->
        <button v-if="agent.isActive" class="agc-send stop" :aria-label="'Stop the running task'" :title="'Stop the task'" @click="stopRunning">
          <i class="fas fa-stop" aria-hidden="true"></i>
        </button>
        <button
          v-else
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

    <!-- upload / attachment errors (honest, dismissible) -->
    <div v-if="agent.uploadError" class="agc-err" role="alert">
      <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
      <span>{{ agent.uploadError }}</span>
      <button class="ag-icon-btn" aria-label="Dismiss upload error" @click="agent.uploadError = null"><i class="fas fa-xmark" aria-hidden="true"></i></button>
    </div>

    <!-- honest live-task hint -->
    <div v-if="agent.isActive" class="agc-hint" role="status">
      <span class="ag-dot warn" aria-hidden="true"></span>
      A task is running — follow its progress above, or stop it to start another.
    </div>

    <!-- V1.2 §7: task shortcut chips -->
    <div v-if="!agent.isActive" class="agc-presets" role="group" aria-label="Task shortcuts">
      <button
        v-for="p in PRESETS" :key="p.id"
        class="agc-preset"
        :class="{ active: activePreset === p.id }"
        :title="p.title"
        @click="applyPreset(p)"
      >
        <i class="fas" :class="p.icon" aria-hidden="true"></i>
        <span>{{ p.label }}</span>
      </button>
    </div>
    <div v-if="activePreset" class="agc-preset-note" role="status">
      <i class="fas fa-pen" aria-hidden="true"></i>
      Starter instruction inserted — edit it freely, then press Run. Nothing executes until you send.
      <button class="ag-icon-btn" aria-label="Clear preset" @click="clearPreset"><i class="fas fa-xmark" aria-hidden="true"></i></button>
    </div>
  </div>

  <!-- hidden pickers (real file inputs, click-triggered) -->
  <input ref="imgInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple class="agc-hidden-input" aria-hidden="true" tabindex="-1" @change="onImagesPicked" />
  <input ref="zipInput" type="file" accept=".zip,application/zip,application/x-zip-compressed" class="agc-hidden-input" aria-hidden="true" tabindex="-1" @change="onZipPicked" />
</template>

<script setup>
/**
 * KinyaBot Agent V1.2 — Composer Card
 * ─────────────────────────────────────
 * Keeps the V1.1 reference design (white card, + menu, shield, model
 * chip) and adds the V1.2 capabilities — every control is REAL:
 *  • reference-image uploads (§8) — validated + stored server-side,
 *    fed to the vision model with the task
 *  • existing-project ZIP uploads (§9) — extracted into the task
 *    workspace and MODIFIED, not rebuilt
 *  • Stop while a task is executing (§6)
 *  • task shortcut chips (§7) that insert editable starter prompts —
 *    selecting a preset NEVER auto-starts a costly task
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
const imgInput = ref(null)
const zipInput = ref(null)
const activePreset = ref(null)

/* ── §7 presets: compact chips, editable starter instructions ── */
const PRESETS = [
  { id: 'web', icon: 'fa-globe', label: 'Web Development', title: 'Build a responsive, polished website',
    prompt: 'Build a responsive, polished website based on my requirements. Create the required files (HTML, CSS, JS), verify the result, and make it available in the preview.' },
  { id: 'game', icon: 'fa-gamepad', label: 'Game Development', title: 'Build a playable browser game',
    prompt: 'Build a playable browser game with clean controls, a visible score/state, and a small win/lose condition. Use plain HTML/CSS/JavaScript unless I ask for a framework.' },
  { id: 'bug', icon: 'fa-bug', label: 'Bug Fixing', title: 'Fix a bug in existing code',
    prompt: 'Fix this bug: (describe the broken behavior, the file or the error output). Find the root cause, apply the smallest safe fix, and verify it actually resolves the issue.' },
  { id: 'refimg', icon: 'fa-clone', label: 'Build from Reference Image', title: 'Reproduce a design from a reference image',
    prompt: 'Reproduce the attached reference image as a functional web page: match the layout, spacing, colors, typography and components, but write real HTML/CSS/JavaScript (do not just embed the image).',
    needsImage: true },
  { id: 'improve', icon: 'fa-wand-magic-sparkles', label: 'Improve Existing Project', title: 'Upload a project and improve it',
    prompt: 'Improve the attached project: (describe the changes — redesign, responsiveness, performance, code quality). Edit the existing files rather than rebuilding, and verify nothing breaks.',
    needsZip: true },
  { id: 'uiux', icon: 'fa-palette', label: 'UI/UX Design', title: 'Design or restyle an interface',
    prompt: 'Design a modern, accessible UI for this concept: (describe the product). Produce the page(s) with a coherent design system (spacing, type scale, color tokens, states) and explain the key decisions.' },
  { id: 'api', icon: 'fa-server', label: 'API & Backend', title: 'Build an API or backend service',
    prompt: 'Build a small backend service with clean endpoints, input validation, and error handling. Include a way to run and test it, and verify each endpoint actually responds.' },
  { id: 'analyze', icon: 'fa-magnifying-glass-chart', label: 'Project Analysis', title: 'Analyze code or a project',
    prompt: 'Analyze the attached project and report its structure, frameworks, entry points, code quality issues, and concrete improvement recommendations. Do not change any files — read only.',
    needsZip: true },
  { id: 'research', icon: 'fa-book-open', label: 'Research and Build', title: 'Research online, then build',
    prompt: 'Research this topic online first (current documentation, best practices), then build the result using what you learned, citing which sources you used: (describe the task).' },
]

/* Real provider/model info from GET /agent/config. */
onMounted(() => { if (!agent.agentConfig) agent.fetchConfig() })
const modelLabel = computed(() => {
  const cfg = agent.agentConfig
  if (!cfg?.model) return 'Groq'
  const short = String(cfg.model).replace(/^(openai\/|groq\/)/, '')
  return short.length > 22 ? short.slice(0, 21) + '…' : short
})
const modelTitle = computed(() => `Provider: ${agent.agentConfig?.provider || 'groq'} · Model: ${agent.agentConfig?.model || '(configured server-side)'}`)
const visionCapable = computed(() => agent.agentConfig?.vision?.capable === true)

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
  agent.isActive ? 'The agent is working — stop it to start another…' : 'Describe the task — the agent will plan, build and verify it…')

const canAttach = computed(() => agent.agentConfig?.uploads?.enabled !== false && !props.disabled)
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

function clip(s, n) { return String(s || '').length > n ? String(s).slice(0, n - 1) + '…' : String(s || '') }

function send() {
  const content = model.text.trim()
  if (!content || !canSend.value) return
  const payload = {
    content, mode: 'agent',
    referenceImageIds: agent.referenceImages.map(r => r.id),
    projectZipId: agent.projectZip?.id || null,
  }
  emit('send', payload)
  model.text = ''
  activePreset.value = null
  requestAnimationFrame(autoGrow)
}

/* V1.2 §6: stop the running task (real endpoint, honest settling). */
async function stopRunning() {
  try { await agent.stopTask('Task stopped by the user from the composer') } catch {}
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
    model.text = 'Create a modern single-page website for a Rwandan coffee brand — hero, product cards, and a contact section. Verify the result and leave it available in the preview.'
    requestAnimationFrame(autoGrow)
    ta.value?.focus()
  }
}

/* ── §7: preset selection inserts an EDITABLE starter prompt ── */
function applyPreset(p) {
  activePreset.value = p.id
  model.text = p.prompt
  requestAnimationFrame(autoGrow)
  ta.value?.focus()
  // Guidance when the preset expects an attachment that isn't there yet
  if (p.needsImage && !agent.referenceImages.length && canAttach.value) {
    agent.uploadError = 'Tip: attach one or more reference images with the image button — they guide the design.'
    setTimeout(() => { if (agent.uploadError?.startsWith('Tip:')) agent.uploadError = null }, 6000)
  }
  if (p.needsZip && !agent.projectZip && canAttach.value) {
    agent.uploadError = 'Tip: upload your existing project (.zip) with the archive button so the agent improves it.'
    setTimeout(() => { if (agent.uploadError?.startsWith('Tip:')) agent.uploadError = null }, 6000)
  }
}
function clearPreset() {
  activePreset.value = null
  model.text = ''
  requestAnimationFrame(autoGrow)
}

/* ── §8/§9: real file pickers + uploads ── */
function pickImages() { imgInput.value?.click() }
function pickZip() { zipInput.value?.click() }

async function onImagesPicked(e) {
  const files = [...(e.target.files || [])]
  e.target.value = ''
  for (const f of files) {
    try { await agent.uploadReferenceImage(f) } catch (err) { break }
  }
}
async function onZipPicked(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (f) { try { await agent.uploadProjectZip(f) } catch {} }
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
/* ═══ THE WHITE COMPOSER CARD (reference ss4/ss5, V1.2) ════════ */
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

/* task context chips row */
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

/* V1.2: attachment previews */
.agc-atts { display: flex; gap: 8px; flex-wrap: wrap; padding: 2px 2px 0; }
.agc-att {
  position: relative;
  display: inline-flex; align-items: center; gap: 8px;
  background: #f4f4f5; border: 1.5px solid #e4e4e7; border-radius: 12px;
  padding: 5px 8px 5px 5px;
}
.agc-att-thumb {
  width: 42px; height: 42px; border-radius: 8px; object-fit: cover; display: block;
  background: #e4e4e7;
}
.agc-att-thumb.placeholder {
  display: grid; place-items: center; color: #71717a; font-size: 15px;
}
.agc-att.zip { padding: 6px 8px 6px 6px; }
.agc-att-name {
  font-size: 11.5px; color: #3f3f46; max-width: 150px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.agc-att-x {
  width: 18px; height: 18px; border-radius: 50%;
  border: none; background: #d4d4d8; color: #3f3f46;
  display: grid; place-items: center; font-size: 9px; cursor: pointer;
  flex-shrink: 0; transition: background .12s;
}
.agc-att-x:hover { background: #a1a1aa; color: #fff; }

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

/* V1.2: attachment tool buttons */
.agc-attach-group { display: inline-flex; align-items: center; gap: 6px; }
.agc-icon-tool {
  width: 34px; height: 34px; border-radius: 10px;
  background: none; border: 1.5px solid #e4e4e7; color: #52525b;
  display: grid; place-items: center; font-size: 13.5px; cursor: pointer;
  transition: border-color .12s, color .12s, background .12s;
}
.agc-icon-tool:hover:not(:disabled) { border-color: #a1a1aa; color: #18181b; background: #f4f4f5; }
.agc-icon-tool:disabled { opacity: .45; cursor: default; }
.agc-up-spin { font-size: 11.5px; color: #71717a; white-space: nowrap; }

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

/* shield toggle */
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

/* model chip */
.agc-model {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; color: #71717a;
  font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 220px;
  cursor: default;
}
.agc-model i { font-size: 10px; color: #a1a1aa; }

/* send / stop */
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
.agc-send.stop { background: #dc2626; }
.agc-send.stop:hover { background: #b91c1c; }

/* upload error row */
.agc-err {
  display: flex; align-items: flex-start; gap: 8px;
  background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
  border-radius: 10px; padding: 8px 10px; font-size: 12.5px; line-height: 1.45;
}
.agc-err i { margin-top: 2px; flex-shrink: 0; }
.agc-err button { margin-left: auto; }

/* live-task hint */
.agc-hint {
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px; color: #71717a;
  padding: 2px 4px 0;
}

/* V1.2 §7: task shortcut chips */
.agc-presets {
  display: flex; flex-wrap: wrap; gap: 7px;
  padding: 2px 2px 0;
}
.agc-preset {
  display: inline-flex; align-items: center; gap: 7px;
  background: #fafafa;
  border: 1.5px solid #e4e4e7;
  border-radius: 999px;
  padding: 7px 12px;
  font-family: var(--ag-font); font-size: 12.5px; font-weight: 500; color: #3f3f46;
  cursor: pointer;
  transition: border-color .12s, background .12s, color .12s;
}
.agc-preset i { font-size: 11.5px; color: #71717a; }
.agc-preset:hover { border-color: #a1a1aa; background: #f4f4f5; }
.agc-preset.active { border-color: #18181b; color: #18181b; background: #f4f4f5; }
.agc-preset.active i { color: #18181b; }

.agc-preset-note {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #71717a;
  padding: 2px 4px 0;
}
.agc-preset-note i { flex-shrink: 0; font-size: 11px; }
.agc-preset-note button { margin-left: auto; flex-shrink: 0; }

.agc-hidden-input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }

/* focus visibility (accessibility) */
.agc :focus-visible { outline: 2px solid #18181b; outline-offset: 2px; }

@media (max-width: 560px) {
  .agc { border-radius: 18px; padding: 12px 12px 10px; }
  .agc-greet { font-size: 18px; }
  .agc-input { font-size: 15.5px; }
  .agc-model { max-width: 110px; }
  .agc-bypass span { display: none; }
  .agc-bypass { padding: 8px; border-radius: 50%; }
  .agc-attach-group { gap: 4px; }
  .agc-icon-tool { width: 32px; height: 32px; }
  .agc-preset { font-size: 11.5px; padding: 6px 10px; }
}
</style>
