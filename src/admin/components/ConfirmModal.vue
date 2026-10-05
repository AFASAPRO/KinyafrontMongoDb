<template>
  <transition name="cm-fade">
    <div v-if="open" class="cm-overlay" @click.self="cancel">
      <div class="cm-box" role="dialog" aria-modal="true" :aria-label="title">
        <div class="cm-head">
          <div class="cm-icon" :class="tone"><i class="fas" :class="tone === 'danger' ? 'fa-triangle-exclamation' : 'fa-circle-question'"></i></div>
          <h3>{{ title }}</h3>
        </div>
        <p class="cm-msg"><slot>{{ message }}</slot></p>
        <template v-if="requireText">
          <p class="cm-type-hint">Type <code>{{ requireText }}</code> to confirm.</p>
          <input v-model="typed" class="cm-input" :placeholder="requireText" autocomplete="off" />
        </template>
        <div class="cm-foot">
          <button class="cm-btn ghost" @click="cancel">{{ cancelLabel }}</button>
          <button class="cm-btn" :class="tone" :disabled="requireText && typed !== requireText" @click="confirm">
            {{ confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>
<script setup>
import { ref, watch } from 'vue'
const props = defineProps({
  open: Boolean,
  title: { type: String, default: 'Are you sure?' },
  message: String,
  confirmLabel: { type: String, default: 'Confirm' },
  cancelLabel: { type: String, default: 'Cancel' },
  tone: { type: String, default: 'danger' }, // danger | primary
  requireText: String,
})
const emit = defineEmits(['confirm', 'cancel'])
const typed = ref('')
watch(() => props.open, (v) => { if (v) typed.value = '' })
function cancel() { emit('cancel') }
function confirm() { if (!props.requireText || typed.value === props.requireText) emit('confirm') }
</script>
<style scoped>
.cm-overlay { position:fixed; inset:0; z-index:80; background:rgba(2,4,10,.62); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; padding:20px; }
.cm-box { width:100%; max-width:430px; background:var(--surface); border:1px solid var(--border); border-radius:18px; padding:22px; box-shadow:0 24px 60px rgba(0,0,0,.45); }
.cm-head { display:flex; align-items:center; gap:12px; }
.cm-icon { width:40px; height:40px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:15px; flex:none; }
.cm-icon.danger { background:rgba(239,68,68,.14); color:#f87171; }
.cm-icon.primary { background:var(--brand-soft); color:var(--brand-text); }
.cm-head h3 { margin:0; font-size:16px; color:var(--text-1); }
.cm-msg { margin:12px 0 0; color:var(--text-2); font-size:13.5px; line-height:1.55; }
.cm-type-hint { font-size:12.5px; color:var(--text-3); margin:12px 0 6px; }
.cm-type-hint code { background:var(--surface-secondary); padding:2px 6px; border-radius:6px; color:var(--text-1); }
.cm-input { width:100%; background:var(--surface-secondary); border:1px solid var(--border); color:var(--text-1); border-radius:10px; padding:10px 12px; font-size:14px; outline:none; }
.cm-input:focus { border-color:var(--brand); }
.cm-foot { display:flex; justify-content:flex-end; gap:10px; margin-top:18px; }
.cm-btn { border:0; border-radius:10px; padding:9px 18px; font-weight:700; font-size:13.5px; cursor:pointer; }
.cm-btn.ghost { background:transparent; border:1px solid var(--border); color:var(--text-1); }
.cm-btn.danger { background:#ef4444; color:#fff; }
.cm-btn.primary { background:var(--brand); color:#fff; }
.cm-btn:disabled { opacity:.4; cursor:default; }
.cm-fade-enter-active, .cm-fade-leave-active { transition:opacity .18s ease; }
.cm-fade-enter-from, .cm-fade-leave-to { opacity:0; }
</style>
