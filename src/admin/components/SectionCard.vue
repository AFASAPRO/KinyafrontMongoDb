<template>
  <div class="card">
    <div v-if="title || $slots.actions" class="card-head">
      <div class="card-titles">
        <h3>{{ title }}</h3>
        <p v-if="subtitle" class="card-sub">{{ subtitle }}</p>
      </div>
      <div class="card-actions"><slot name="actions" /></div>
    </div>
    <div class="card-body" :class="{ pad: padded }">
      <slot />
    </div>
  </div>
</template>
<script setup>
defineProps({
  title: String,
  subtitle: String,
  padded: { type: Boolean, default: true },
})
</script>
<style scoped>
.card { background:var(--surface-secondary); border:1px solid var(--border); border-radius:16px; overflow:hidden; min-width:0; }
.card-head { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:16px 18px 0; flex-wrap:wrap; }
.card-titles h3 { margin:0; font-size:15px; font-weight:700; color:var(--text-1); }
.card-sub { margin:2px 0 0; font-size:12.5px; color:var(--text-3); }
.card-actions { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.card-body.pad { padding:16px 18px 18px; }
</style>
