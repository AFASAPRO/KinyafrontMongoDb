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
// Best guess at the artboard meant for an embedded avatar (a head/bust
// "portrait" framing rather than the file's marketplace/demo artboards).
// If it isn't present under this exact name, we silently fall back to
// whatever artboard the file marks as default (see loadRive() below).
const PREFERRED_ARTBOARD = 'SOBO-Portrait'

// Kinya's .riv file has no distinct baked animation for every gesture in
// our move vocabulary (wave/jump/dance/etc.) — it has Idle, Listen, Talk,
// a blink loop, and a tap/"bump" reaction. So every upbeat move plays the
// same celebratory reaction trigger; quieter moves just leave mode as-is.
// This mapping is a deliberate simplification, not a bug.
const MODE_TO_NUM = { idle: 0, listen: 1, think: 1, talk: 2 }
const REACTION_MOVES = new Set(['wave', 'jump', 'dance', 'clap', 'cheer', 'spin', 'bow', 'laugh', 'wow', 'nod'])

const phase = ref('loading') // 'loading' | 'ready' | 'error'
const error = ref('')

const hostRef = ref(null)
const canvasRef = ref(null)

let rive = null
let ro = null
let mouthRaf = 0
let mouthLevel = 0
let unsubMode, unsubAction, unsubSpeak
let numStateInput = null
let mouthInput = null
let reactionInput = null

const safe = (fn) => { try { return fn() } catch { return null } }

/** Look through BOTH the data-bound ViewModel and the classic state-machine
 *  inputs for something that looks like what we need, by name. We can't
 *  run the real Rive editor here to confirm exact names, so this matches
 *  loosely (case-insensitive "contains") and logs what it finds so it's
 *  easy to verify/adjust against the console if a name guess is off. */
function resolveInputs() {
  const vmi = safe(() => rive.viewModelInstance) || null
  let smInputs = []
  try { smInputs = rive.stateMachineInputs(STATE_MACHINE) || [] } catch { /* no classic inputs */ }

  const vmNumber = (needle) => safe(() => vmi?.number(needle)) || null
  const vmTrigger = (needle) => safe(() => vmi?.trigger(needle)) || null
  const smFind = (type, re) => smInputs.find((i) => i.type === type && re.test(i.name)) || null

  numStateInput = vmNumber('numState') || smFind(StateMachineInputType.Number, /state|mode/i)
  mouthInput = vmNumber('mouthOpen') || smFind(StateMachineInputType.Number, /mouth/i)
  reactionInput =
    vmTrigger('trigState') ||
    smFind(StateMachineInputType.Trigger, /trig|react|tap|bump/i) ||
    smInputs.find((i) => i.type === StateMachineInputType.Trigger) ||
    null

  // eslint-disable-next-line no-console
  console.info(
    '[Kinya/Rive] inputs — state machine:', smInputs.map((i) => `${i.name} (${i.type})`),
    '| view model bound:', !!vmi,
    '| resolved → numState:', !!numStateInput, 'mouthOpen:', !!mouthInput, 'trigger:', !!reactionInput,
  )
}

function setNumState(mode) {
  if (!numStateInput) return
  const v = MODE_TO_NUM[mode] ?? 0
  try { numStateInput.value = v } catch { /* ignore */ }
}

function fireReaction() {
  if (!reactionInput) return
  try { reactionInput.trigger ? reactionInput.trigger() : reactionInput.fire?.() } catch { /* ignore */ }
}

function setMouth(v) {
  if (!mouthInput) return
  try { mouthInput.value = v } catch { /* ignore */ }
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
  unsubMode = props.controller.onMode((mode) => setNumState(mode))
  unsubAction = props.controller.onAction((move) => { if (move && REACTION_MOVES.has(move)) fireReaction() })
  unsubSpeak = props.controller.onSpeaking(() => {})
}

function loadRive(withArtboard) {
  const canvas = canvasRef.value
  rive = new Rive({
    src: RIVE_SRC,
    canvas,
    artboard: withArtboard ? PREFERRED_ARTBOARD : undefined,
    stateMachines: STATE_MACHINE,
    autoplay: true,
    autoBind: true,
    layout: new Layout({ fit: Fit.Contain, alignment: Alignment.Center }),
    onLoad: () => {
      try { rive.resizeDrawingSurfaceToCanvas() } catch { /* ignore */ }
      resolveInputs()
      setNumState(props.controller.mode)
      phase.value = 'ready'
      emit('ready')
    },
    onLoadError: () => {
      if (withArtboard) {
        // the guessed artboard name may not match exactly — retry with the
        // file's own default artboard before giving up.
        try { rive?.cleanup() } catch { /* ignore */ }
        loadRive(false)
        return
      }
      phase.value = 'error'
      error.value = 'Could not load Kinya. Please check your connection and try again.'
    },
  })
}

onMounted(() => {
  loadRive(true)
  wireController()
  startMouthLoop()
  ro = new ResizeObserver(() => { try { rive?.resizeDrawingSurfaceToCanvas() } catch { /* ignore */ } })
  if (hostRef.value) ro.observe(hostRef.value)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(mouthRaf)
  ro?.disconnect()
  unsubMode?.(); unsubAction?.(); unsubSpeak?.()
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
