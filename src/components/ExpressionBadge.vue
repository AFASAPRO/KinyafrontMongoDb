<template>
  <div class="xbadge" :class="expression" :style="style" aria-hidden="true">
    <svg viewBox="0 0 64 64" class="xbadge-svg">
      <circle cx="32" cy="32" r="30" class="xbadge-ring" />
      <circle cx="32" cy="32" r="30" class="xbadge-fill" />

      <!-- Happy: friendly curved eyes + smile -->
      <g v-if="expression === 'happy'" class="xface">
        <path d="M18 27 Q22 22 26 27" class="xstroke" />
        <path d="M38 27 Q42 22 46 27" class="xstroke" />
        <path d="M20 38 Q32 48 44 38" class="xstroke thick" />
      </g>

      <!-- Thinking: tilted gaze up-and-away + small "..." -->
      <g v-else-if="expression === 'thinking'" class="xface">
        <circle cx="21" cy="28" r="3.4" class="xfill" />
        <circle cx="41" cy="25" r="3.4" class="xfill" />
        <path d="M22 40 Q32 36 42 40" class="xstroke" />
        <circle cx="46" cy="16" r="2.1" class="xdot" />
        <circle cx="52" cy="12" r="1.6" class="xdot" />
        <circle cx="57" cy="9" r="1.1" class="xdot" />
      </g>

      <!-- Excited: sparkly wide eyes + big open smile -->
      <g v-else-if="expression === 'excited'" class="xface">
        <path d="M15 24 L21 30 M21 24 L15 30" class="xstroke" />
        <path d="M43 24 L49 30 M49 24 L43 30" class="xstroke" />
        <path d="M19 37 Q32 50 45 37 Q32 44 19 37 Z" class="xfill mouth" />
        <path d="M50 12 L52 17 L57 19 L52 21 L50 26 L48 21 L43 19 L48 17 Z" class="xspark" />
      </g>

      <!-- Winking: one closed eye, one open + wink smirk -->
      <g v-else-if="expression === 'winking'" class="xface">
        <path d="M16 27 Q21 23 26 27" class="xstroke" />
        <circle cx="42" cy="27" r="3.4" class="xfill" />
        <path d="M21 39 Q32 45 43 37" class="xstroke thick" />
      </g>

      <!-- Surprised: round wide eyes + round open mouth -->
      <g v-else-if="expression === 'surprised'" class="xface">
        <circle cx="21" cy="27" r="4.2" class="xstroke-c" />
        <circle cx="43" cy="27" r="4.2" class="xstroke-c" />
        <ellipse cx="32" cy="41" rx="6" ry="7.5" class="xfill mouth" />
      </g>

      <!-- Cool: sunglasses bar, relaxed smile -->
      <g v-else class="xface">
        <rect x="14" y="23" width="16" height="9" rx="3" class="xshade" />
        <rect x="34" y="23" width="16" height="9" rx="3" class="xshade" />
        <rect x="30" y="26" width="4" height="2.4" class="xshade" />
        <path d="M22 40 Q32 44 42 40" class="xstroke" />
      </g>
    </svg>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  expression: { type: String, default: 'cool' },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  scale: { type: Number, default: 1 },
  visible: { type: Boolean, default: false },
})

const style = computed(() => ({
  transform: `translate3d(${props.x}px, ${props.y}px, 0) translate(-50%, -50%) scale(${props.scale})`,
  opacity: props.visible ? 1 : 0,
}))
</script>

<style scoped>
.xbadge {
  position: absolute; top: 0; left: 0;
  width: 46px; height: 46px;
  pointer-events: none;
  transition: opacity .3s ease, transform .12s ease-out;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,.45));
}
.xbadge-svg { width: 100%; height: 100%; overflow: visible; }
.xbadge-ring { fill: none; stroke: #5b8cff; stroke-width: 2.5; opacity: .85; }
.xbadge-fill { fill: #12141c; stroke: rgba(255,255,255,.08); stroke-width: 1; }
.xstroke { fill: none; stroke: #eef1fb; stroke-width: 3; stroke-linecap: round; }
.xstroke.thick { stroke-width: 3.4; }
.xstroke-c { fill: #eef1fb; stroke: #eef1fb; stroke-width: 1.5; }
.xfill { fill: #eef1fb; }
.xfill.mouth { fill: #ff8fa3; }
.xdot { fill: #8fa4ff; }
.xshade { fill: #0b0d12; stroke: #5b8cff; stroke-width: 1.2; }
.xspark { fill: #f5c542; }

/* per-expression ring accent */
.xbadge.excited .xbadge-ring, .xbadge.surprised .xbadge-ring { stroke: #f5a524; }
.xbadge.thinking .xbadge-ring { stroke: #5b8cff; }
.xbadge.happy .xbadge-ring, .xbadge.winking .xbadge-ring { stroke: #62d6a0; }
.xbadge.cool .xbadge-ring { stroke: #8fa4ff; }

/* gentle idle bob so the badge never feels frozen */
.xbadge-svg { animation: xbob 2.6s ease-in-out infinite; }
@keyframes xbob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }

@media (prefers-reduced-motion: reduce) {
  .xbadge-svg { animation: none; }
}
</style>
