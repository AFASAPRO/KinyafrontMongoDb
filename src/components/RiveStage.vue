<template>
  <div class="rive-stage-host" ref="hostRef">
    <canvas ref="canvasRef" class="rive-canvas" @pointerdown="onPointerDown"></canvas>

    <div v-if="phase !== 'ready'" class="rive-loading" :class="{ 'is-error': phase === 'error' }" role="status">
      <template v-if="phase === 'error'">
        <i class="fas fa-triangle-exclamation"></i>
        <p>{{ error || 'Could not load Kinya.' }}</p>
      </template>
      <template v-else>
        <p>Waking up Kinya…</p>
        <div class="rive-bar"><span class="indeterminate"></span></div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Rive, Layout, Fit, Alignment, StateMachineInputType } from '@rive-app/canvas'

const props = defineProps({
  controller: { type: Object, required: true },
  audioLevel: { type: Number, default: 0 },
  talking: { type: Boolean, default: false },
})
const emit = defineEmits(['ready', 'poke'])

const RIVE_SRC = `${import.meta.env.BASE_URL}rive/kinya-character.riv`
const STATE_MACHINE = 'State Machine 1'
// Confirmed directly from a working export of this exact file (not a
// guess): the artboard is "SOBO-Marketplace", and its bound ViewModel
// exposes two number properties — `numState` (which body loop is active)
// and `mouthOpen` (0..1 mouth aperture, for lip-sync).
const ARTBOARD = 'SOBO-Marketplace'

// We only know for certain that 0 is the resting/idle value (that's what
// the reference export initializes it to). Listen/Talk are our best,
// easily-adjustable guess at the remaining states — tune here if Kinya's
// actual Idle/Listen/Talk order differs once you see it live.
const MODE_TO_NUM = { idle: 0, listen: 1, think: 1, talk: 2 }

const phase = ref('loading') // 'loading' | 'ready' | 'error'
const error = ref('')

const hostRef = ref(null)
const canvasRef = ref(null)

let rive = null
let ro = null
let mouthRaf = 0
let mouthLevel = 0
let unsubMode, unsubAction
let vmi = null
let numStateProp = null
let mouthProp = null
let genericTrigger = null

const safe = (fn) => { try { return fn() } catch { return null } }

function bindViewModel() {
  vmi = safe(() => rive.viewModelInstance) || null
  numStateProp = safe(() => vmi?.number('numState')) || null
  mouthProp = safe(() => vmi?.number('mouthOpen')) || null

  // Best-effort bonus: if the file also exposes a trigger (for the
  // bump/shine/sparkle tap reaction), use it for one-shot moves. Not
  // required — Rive's own built-in pointer Listeners on this artboard
  // already play that reaction on tap/click with zero JS needed.
  genericTrigger = safe(() => vmi?.trigger('trigState')) || null
  if (!genericTrigger) {
    try {
      const smInputs = rive.stateMachineInputs(STATE_MACHINE) || []
      genericTrigger = smInputs.find((i) => i.type === StateMachineInputType.Trigger) || null
    } catch { /* no classic inputs on this artboard */ }
  }

  // eslint-disable-next-line no-console
  console.info('[Kinya/Rive] bound →', {
    viewModel: !!vmi, numState: !!numStateProp, mouthOpen: !!mouthProp, trigger: !!genericTrigger,
  })

  if (numStateProp) numStateProp.value = MODE_TO_NUM[props.controller.mode] ?? 0
  if (mouthProp) mouthProp.value = 0
}

function setMode(mode) {
  if (!numStateProp) return
  try { numStateProp.value = MODE_TO_NUM[mode] ?? 0 } catch { /* ignore */ }
}

/** One-shot reaction for a chat "move" (wave/jump/cheer/…). The file has
 *  no dedicated animation per move, so we give it a confident, visible
 *  nudge: briefly pulse into the liveliest state plus fire the trigger if
 *  one exists, then settle back to whatever mode we were in. */
let reactionTimer = null
function playReaction() {
  if (genericTrigger) { try { genericTrigger.trigger ? genericTrigger.trigger() : genericTrigger.fire?.() } catch { /* ignore */ } }
  if (!numStateProp) return
  const restore = MODE_TO_NUM[props.controller.mode] ?? 0
  try { numStateProp.value = MODE_TO_NUM.talk } catch { /* ignore */ }
  clearTimeout(reactionTimer)
  reactionTimer = setTimeout(() => { try { numStateProp.value = restore } catch { /* ignore */ } }, 900)
}

function setMouth(v) {
  if (!mouthProp) return
  try { mouthProp.value = v } catch { /* ignore */ }
}

function startMouthLoop() {
  const tick = () => {
    const target = props.talking ? Math.min(1, props.audioLevel) : 0
    mouthLevel += (target - mouthLevel) * 0.35
    setMouth(mouthLevel < 0.02 ? 0 : mouthLevel)
    mouthRaf = requestAnimationFrame(tick)
  }
  mouthRaf = requestAnimationFrame(tick)
}

function onPointerDown() {
  emit('poke')
}

function wireController() {
  unsubMode = props.controller.onMode((mode) => setMode(mode))
  unsubAction = props.controller.onAction((move) => { if (move) playReaction() })
}

function loadRive() {
  const canvas = canvasRef.value
  rive = new Rive({
    src: RIVE_SRC,
    canvas,
    artboard: ARTBOARD,
    stateMachines: STATE_MACHINE,
    autoplay: true,
    autoBind: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoad: () => {
      try { rive.resizeDrawingSurfaceToCanvas() } catch { /* ignore */ }
      bindViewModel()
      phase.value = 'ready'
      emit('ready')
    },
    onLoadError: (e) => {
      // eslint-disable-next-line no-console
      console.error('[Kinya/Rive] failed to load artboard', ARTBOARD, e)
      phase.value = 'error'
      error.value = 'Could not load Kinya. Please check your connection and try again.'
    },
  })
}

onMounted(() => {
  loadRive()
  wireController()
  startMouthLoop()
  ro = new ResizeObserver(() => { try { rive?.resizeDrawingSurfaceToCanvas() } catch { /* ignore */ } })
  if (hostRef.value) ro.observe(hostRef.value)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(mouthRaf)
  clearTimeout(reactionTimer)
  ro?.disconnect()
  unsubMode?.(); unsubAction?.()
  try { rive?.cleanup() } catch { /* ignore */ }
})
</script>

<style scoped>
.rive-stage-host { position: relative; width: 100%; height: 100%; touch-action: none; }
.rive-canvas { width: 100%; height: 100%; display: block; cursor: pointer; }

.rive-loading {
  position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; color: rgba(255,255,255,.85); text-align: center; padding: 24px;
}
.rive-loading.is-error i { font-size: 26px; color: #fca5a5; margin-bottom: 4px; }
.rive-bar { width: 180px; height: 6px; border-radius: 99px; background: rgba(255,255,255,.14); overflow: hidden; }
.rive-bar .indeterminate {
  display: block; height: 100%; width: 40%; border-radius: 99px;
  background: var(--vm-accent, #f5a524);
  animation: rive-indeterminate 1.1s ease-in-out infinite;
}
@keyframes rive-indeterminate {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(350%); }
}
</style>
