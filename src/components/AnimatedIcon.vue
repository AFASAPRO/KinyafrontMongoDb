<template>
  <i
    :class="[
      icon,
      'kb-animated-icon',
      animation && `kb-icon--${animation}`,
      { 'kb-icon--active': active, 'kb-icon--run': running }
    ]"
    :style="iconStyle"
    :aria-hidden="label ? undefined : 'true'"
    :aria-label="label || undefined"
    :role="label ? 'img' : undefined"
  ></i>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  icon: { type: String, required: true },
  animation: { type: String, default: '' },
  active: { type: Boolean, default: false },
  trigger: { type: [Number, String], default: 0 },
  label: { type: String, default: '' },
  size: { type: [Number, String], default: null }
})

const running = ref(false)
let runTimer = null
let runFrame = 0

function runOnce() {
  cancelAnimationFrame(runFrame)
  running.value = false
  clearTimeout(runTimer)
  runFrame = requestAnimationFrame(() => {
    runFrame = 0
    running.value = true
    runTimer = setTimeout(() => { running.value = false }, 520)
  })
}

watch(
  () => [props.trigger, props.active, props.animation],
  ([trigger, active, animation], previous = []) => {
    const [previousTrigger, previousActive] = previous
    if (trigger !== previousTrigger && trigger !== 0 && trigger !== '') {
      runOnce()
    } else if (active && !previousActive && ['bounce', 'draw-check', 'success', 'shake'].includes(animation)) {
      runOnce()
    }
  },
  { immediate: true }
)

const iconStyle = computed(() => props.size ? { fontSize: typeof props.size === 'number' ? `${props.size}px` : props.size } : undefined)

onBeforeUnmount(() => {
  cancelAnimationFrame(runFrame)
  clearTimeout(runTimer)
})
</script>

<style>
.kb-animated-icon {
  display: inline-block;
  flex: 0 0 auto;
  transform-origin: center;
}

.kb-icon--subtle-hover {
  transition: transform 180ms cubic-bezier(.2,.7,.2,1);
}
button:hover .kb-icon--subtle-hover,
button:focus-visible .kb-icon--subtle-hover,
.chat-row:hover .kb-icon--subtle-hover,
.search-row:focus-within .kb-icon--subtle-hover {
  transform: translateY(-1px) scale(1.06);
}

.kb-icon--press {
  transition: transform 140ms ease;
}
button:active .kb-icon--press {
  transform: scale(.86);
}

.kb-icon--expand-collapse {
  transition: transform 220ms cubic-bezier(.2,.7,.2,1);
}
.kb-icon--expand-collapse.kb-icon--active {
  transform: rotate(-90deg);
}
.kb-icon--expand-collapse.sidebar-toggle-icon.kb-icon--active {
  transform: rotate(180deg);
}

.kb-icon--pulse.kb-icon--active,
.kb-icon--voice-listening.kb-icon--active {
  animation: kb-icon-pulse 1.6s ease-in-out infinite;
}
.kb-icon--thinking.kb-icon--active {
  animation: kb-icon-thinking 1.35s ease-in-out infinite;
}
.kb-icon--spin.kb-icon--active,
.kb-icon--regenerate.kb-icon--active {
  animation: kb-icon-spin .9s linear infinite;
}

.kb-icon--bounce.kb-icon--run { animation: kb-icon-bounce 380ms cubic-bezier(.2,.7,.2,1); }
.kb-icon--shake.kb-icon--run { animation: kb-icon-shake 360ms ease-in-out; }
.kb-icon--send.kb-icon--run { animation: kb-icon-send 360ms cubic-bezier(.2,.7,.2,1); }
.kb-icon--draw-check.kb-icon--run,
.kb-icon--success.kb-icon--run { animation: kb-icon-success 360ms cubic-bezier(.2,.7,.2,1); }
.kb-icon--fade-in { animation: kb-icon-fade-in 260ms ease both; }
.kb-icon--slide-in { animation: kb-icon-slide-in 300ms cubic-bezier(.2,.7,.2,1) both; }

@keyframes kb-icon-pulse {
  0%,100% { transform:scale(1); }
  50% { transform:scale(1.13); }
}
@keyframes kb-icon-thinking {
  0%,100% { opacity:.62; transform:scale(.94); }
  50% { opacity:1; transform:scale(1.06); }
}
@keyframes kb-icon-spin { to { transform:rotate(360deg); } }
@keyframes kb-icon-bounce {
  0%,100% { transform:translateY(0) scale(1); }
  45% { transform:translateY(-3px) scale(1.12); }
}
@keyframes kb-icon-shake {
  0%,100% { transform:translateX(0); }
  25% { transform:translateX(-2px); }
  75% { transform:translateX(2px); }
}
@keyframes kb-icon-send {
  0%,100% { transform:translate(0,0) scale(1); }
  45% { transform:translate(2px,-2px) scale(1.08); }
}
@keyframes kb-icon-success {
  0% { opacity:.45; transform:scale(.72) rotate(-12deg); }
  70% { opacity:1; transform:scale(1.14) rotate(4deg); }
  100% { transform:scale(1) rotate(0); }
}
@keyframes kb-icon-fade-in {
  from { opacity:0; }
  to { opacity:1; }
}
@keyframes kb-icon-slide-in {
  from { opacity:0; transform:translateY(4px); }
  to { opacity:1; transform:translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .kb-animated-icon,
  .kb-animated-icon.kb-icon--active,
  .kb-animated-icon.kb-icon--run {
    animation:none !important;
    transition:none !important;
  }
}
</style>
