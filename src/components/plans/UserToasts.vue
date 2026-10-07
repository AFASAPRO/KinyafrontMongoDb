<template>
  <div class="user-toasts" aria-live="polite">
    <transition-group name="ut">
      <div v-for="t in sub.toasts" :key="t.id" class="ut" :class="`ut-${t.type || 'info'}`">
        <i class="fas ut-ico" :class="icon(t)"></i>
        <div class="ut-body">
          <b v-if="t.title">{{ t.title }}</b>
          <span>{{ t.message }}</span>
        </div>
        <button class="ut-x" @click="sub.dismissToast(t.id)" aria-label="Dismiss"><i class="fas fa-xmark"></i></button>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
/**
 * UserToasts — realtime in-app notifications for the signed-in user
 * (§22). Events arrive over the existing Socket.IO connection
 * (`user_notification`): upgrade submitted / approved / rejected,
 * usage near limit, daily limit reached.
 */
import { useSubscriptionStore } from '../../stores/subscription'

const sub = useSubscriptionStore()

function icon(n) {
  if (n.kind === 'plan_updated' || n.type === 'success') return 'fa-circle-check'
  if (n.kind === 'usage_limit_reached' || n.type === 'error') return 'fa-gauge-simple-high'
  if (n.type === 'warning') return 'fa-triangle-exclamation'
  return 'fa-circle-info'
}
</script>

<style scoped>
.user-toasts {
  position: fixed; bottom: 22px; right: 22px; z-index: 9600;
  display: flex; flex-direction: column; gap: 10px; max-width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}
.ut {
  pointer-events: auto;
  display: flex; align-items: flex-start; gap: 10px;
  background: var(--surface-elevated); border: 1px solid var(--border-strong);
  border-radius: 14px; padding: 12px 14px;
  box-shadow: 0 14px 40px rgba(0,0,0,.45);
}
.ut-ico { margin-top: 2px; font-size: 14px; color: var(--brand-text); }
.ut-success .ut-ico { color: var(--success); }
.ut-warning .ut-ico { color: var(--warning); }
.ut-error .ut-ico { color: var(--error); }
.ut-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ut-body b { font-size: 13px; color: var(--text-1); }
.ut-body span { font-size: 12.5px; color: var(--text-2); line-height: 1.5; }
.ut-x {
  background: transparent; border: 0; color: var(--text-3);
  font-size: 12px; cursor: pointer; padding: 2px 4px; margin-left: 4px;
}
.ut-x:hover { color: var(--text-1); }

.ut-enter-active { animation: utIn .32s cubic-bezier(.2,.9,.3,1.15); }
.ut-leave-active { transition: opacity .2s, transform .2s; }
.ut-enter-from, .ut-leave-to { opacity: 0; transform: translateX(24px); }
@keyframes utIn { from { opacity: 0; transform: translateX(24px); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .ut-enter-active { animation: none; }
}
</style>
