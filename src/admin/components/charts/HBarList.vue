<template>
  <div class="hb">
    <div v-if="!items.length" class="hb-empty">No data yet</div>
    <div v-for="(it, i) in items" :key="i" class="hb-row">
      <span class="hb-rank" v-if="ranked">#{{ i + 1 }}</span>
      <div class="hb-avatar" v-if="it.name" :style="{ background: avatarColor(it.name) }">{{ it.name[0]?.toUpperCase() }}</div>
      <div class="hb-info">
        <div class="hb-name">{{ it.label || it.name }}</div>
        <div class="hb-bar-wrap"><div class="hb-bar" :style="{ width: pctOf(it.value) + '%', background: color }"></div></div>
      </div>
      <span class="hb-val">{{ fmtNum(it.value) }}</span>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { fmtNum, avatarColor } from '../../format'
const props = defineProps({
  items: { type: Array, default: () => [] }, // [{ name?, label, value }]
  color: { type: String, default: 'var(--brand)' },
  ranked: Boolean,
})
const max = computed(() => Math.max(...props.items.map(i => Number(i.value) || 0), 1))
function pctOf(v) { return Math.max(((Number(v) || 0) / max.value) * 100, 2) }
</script>
<style scoped>
.hb { display:flex; flex-direction:column; gap:12px; }
.hb-row { display:flex; align-items:center; gap:10px; min-width:0; }
.hb-rank { font-size:11px; color:var(--text-3); font-weight:700; width:24px; flex:none; }
.hb-avatar { width:30px; height:30px; border-radius:9px; color:#fff; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; flex:none; }
.hb-info { flex:1; min-width:0; }
.hb-name { font-size:12.5px; color:var(--text-1); font-weight:600; margin-bottom:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.hb-bar-wrap { height:6px; border-radius:99px; background:var(--surface-elevated); overflow:hidden; }
.hb-bar { height:100%; border-radius:99px; }
.hb-val { font-size:12.5px; color:var(--text-1); font-weight:700; font-variant-numeric:tabular-nums; flex:none; }
.hb-empty { color:var(--text-3); font-size:13px; text-align:center; padding:20px 0; }
</style>
