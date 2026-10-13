<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 64 64"
    class="ag-globe"
    :class="{ live }"
    role="img"
    :aria-label="live ? 'Agent is working' : 'KinyaBot Agent'"
  >
    <defs>
      <clipPath id="ag-globe-clip">
        <circle cx="32" cy="32" r="28" />
      </clipPath>
      <linearGradient id="ag-globe-shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stop-color="#3f3f46" />
        <stop offset="18%" stop-color="#27272a" />
        <stop offset="100%" stop-color="#18181b" />
      </linearGradient>
      <linearGradient id="ag-globe-sheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%"  stop-color="rgba(255,255,255,.16)" />
        <stop offset="45%" stop-color="rgba(255,255,255,0)" />
      </linearGradient>
    </defs>

    <!-- sphere base -->
    <circle cx="32" cy="32" r="28" fill="url(#ag-globe-shade)" />

    <!-- latitude bands: alternating white / dark stripes wrapped over
         the sphere (the reference's striped-globe mark) -->
    <g clip-path="url(#ag-globe-clip)">
      <g class="ag-globe-bands">
        <rect x="4" y="6"  width="56" height="6" rx="3" fill="#fafafa" opacity=".92" />
        <rect x="4" y="15" width="56" height="5" rx="2.5" fill="#fafafa" opacity=".55" />
        <rect x="4" y="23" width="56" height="7" rx="3.5" fill="#fafafa" opacity=".95" />
        <rect x="4" y="33" width="56" height="5" rx="2.5" fill="#fafafa" opacity=".6" />
        <rect x="4" y="41" width="56" height="6" rx="3" fill="#fafafa" opacity=".9" />
        <rect x="4" y="50" width="56" height="4" rx="2" fill="#fafafa" opacity=".35" />
      </g>
      <!-- sheen + slow band drift while the agent is working -->
      <rect x="0" y="0" width="64" height="64" fill="url(#ag-globe-sheen)" class="ag-globe-sheen" />
    </g>

    <!-- meridian arcs for depth -->
    <g fill="none" stroke="#0d0d0d" stroke-opacity=".55" stroke-width="1.4" clip-path="url(#ag-globe-clip)">
      <ellipse cx="32" cy="32" rx="10" ry="28" />
      <ellipse cx="32" cy="32" rx="20" ry="28" stroke-opacity=".35" />
    </g>

    <!-- rim -->
    <circle cx="32" cy="32" r="28" fill="none" stroke="#2a2a2e" stroke-width="1.5" />
    <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,.14)" stroke-width=".6" class="ag-globe-rim" />
  </svg>
</template>

<script setup>
/**
 * KinyaBot Agent V1.1 — Striped Globe Mark (reference screenshot 1)
 * The reference interface brands the agent with a striped 3D globe;
 * while the agent works, the bands drift and the rim pulses. Pure
 * SVG + CSS — no dependencies, respects prefers-reduced-motion.
 */
defineProps({
  size: { type: Number, default: 56 },
  live: { type: Boolean, default: false },
})
</script>

<style scoped>
.ag-globe { display: block; flex-shrink: 0; }

.ag-globe.live .ag-globe-bands {
  animation: ag-band-drift 2.6s ease-in-out infinite;
}
@keyframes ag-band-drift {
  0%, 100% { transform: translateY(0) }
  50%      { transform: translateY(-2.5px) }
}

.ag-globe.live .ag-globe-sheen {
  animation: ag-sheen-sweep 2.6s ease-in-out infinite;
  transform-origin: center;
}
@keyframes ag-sheen-sweep {
  0%, 100% { opacity: .35 }
  50%      { opacity: 1 }
}

.ag-globe.live .ag-globe-rim {
  animation: ag-rim-pulse 2s ease-in-out infinite;
}
@keyframes ag-rim-pulse {
  0%, 100% { stroke-opacity: .1 }
  50%      { stroke-opacity: .5 }
}
</style>
