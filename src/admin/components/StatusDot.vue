<template>
  <span class="sd" :class="status" role="status" :aria-label="label">
    <span class="sd-dot"></span>
    <span class="sd-txt">{{ label }}</span>
  </span>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({
  status: { type: String, default: 'unknown' }, // operational | degraded | down | unknown | live | connecting
  text: { type: String, default: '' },
})
const LABELS = {
  operational: 'Operational', degraded: 'Degraded', down: 'Down', unknown: 'Unknown',
  live: 'Live', connecting: 'Connecting…', reconnecting: 'Reconnecting…', offline: 'Offline',
}
const label = computed(() => props.text || LABELS[props.status] || props.status)
</script>
<style scoped>
.sd { display:inline-flex; align-items:center; gap:6px; font-size:12px; font-weight:600; padding:4px 10px; border-radius:99px; background:var(--surface-secondary); border:1px solid var(--border); }
.sd-dot { width:8px; height:8px; border-radius:50%; background:var(--t3, #6b7280); flex:none; }
.sd-txt { color:var(--text-1); }
.sd.operational .sd-dot, .sd.live .sd-dot { background:#22c55e; box-shadow:0 0 8px rgba(34,197,94,.7); }
.sd.live .sd-dot { animation:pulse 2s ease-in-out infinite; }
.sd.degraded .sd-dot, .sd.connecting .sd-dot { background:#f59e0b; }
.sd.degraded .sd-dot, .sd.reconnecting .sd-dot { background:#f59e0b; animation:pulse 1.2s ease-in-out infinite; }
.sd.down .sd-dot { background:#ef4444; }
.sd.unknown .sd-dot, .sd.offline .sd-dot { background:#6b7280; }
@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.35 } }
</style>
