<template>
  <teleport to="body">
    <transition name="uc-pop">
      <div v-if="!!sub.lastChange" class="uc-overlay" @click.self="ack" role="dialog" aria-modal="true" aria-label="Upgrade approved">
        <div class="uc-modal">
          <div class="uc-glow" aria-hidden="true"></div>
          <div class="uc-badge"><i class="fas fa-check"></i></div>
          <h2>Your {{ sub.lastChange.to?.charAt(0).toUpperCase() + sub.lastChange.to?.slice(1) }} upgrade has been approved</h2>
          <p class="uc-sub">Your account now includes</p>
          <div class="uc-limit">
            <span class="uc-num">{{ newLimit || '—' }}</span>
            <span class="uc-unit">chats / day</span>
          </div>
          <div class="uc-meta" v-if="sub.lastChange.from">
            <span class="uc-from">{{ sub.lastChange.from.toUpperCase() }}</span>
            <i class="fas fa-arrow-right"></i>
            <span class="uc-to">{{ sub.lastChange.to?.toUpperCase() }}</span>
          </div>
          <button class="uc-btn" @click="ack"><i class="fas fa-comments"></i> Continue chatting</button>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
/**
 * UpgradeCelebration (§40) — shown once when the backend records an
 * un-acknowledged plan change. Realtime via `plan_updated` socket
 * event, or on first load after approval while the user was away.
 */
import { computed, watch } from 'vue'
import { useSubscriptionStore } from '../../stores/subscription'

const sub = useSubscriptionStore()

const newLimit = computed(() => {
  if (!sub.lastChange?.to) return null
  const p = sub.plansCatalog.find(x => x.plan_id === sub.lastChange.to)
  return p?.dailyChatLimit || sub.usage.limit
})

function ack() { sub.ackPlanChange() }

watch(() => sub.lastChange, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
})
</script>

<style scoped>
.uc-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(3, 6, 14, .82); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 18px;
}
.uc-modal {
  position: relative; width: min(420px, 100%); text-align: center;
  background: var(--surface); border: 1px solid rgba(139,92,246,.4);
  border-radius: 24px; padding: 36px 28px 28px; overflow: hidden;
  box-shadow: 0 30px 90px rgba(0,0,0,.6);
}
.uc-glow {
  position: absolute; inset: -40% -20% auto; height: 70%;
  background: radial-gradient(closest-side, rgba(99,102,241,.25), transparent);
  pointer-events: none;
}
.uc-badge {
  position: relative; width: 64px; height: 64px; margin: 0 auto 18px;
  border-radius: 50%; background: var(--gradient-brand);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 24px;
  box-shadow: 0 10px 30px rgba(99,102,241,.45);
}
.uc-modal h2 { position: relative; margin: 0 0 8px; font-size: 20px; font-weight: 800; letter-spacing: -.02em; color: var(--text-1); }
.uc-sub { position: relative; margin: 0; font-size: 13px; color: var(--text-3); }
.uc-limit { position: relative; display: flex; align-items: baseline; justify-content: center; gap: 8px; margin: 10px 0 4px; }
.uc-num { font-size: 44px; font-weight: 800; letter-spacing: -.03em; background: var(--gradient-brand); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.uc-unit { font-size: 13px; font-weight: 600; color: var(--text-2); }
.uc-meta {
  position: relative; display: inline-flex; align-items: center; gap: 10px;
  margin: 8px 0 20px; padding: 6px 14px; border-radius: 99px;
  background: var(--surface-secondary); border: 1px solid var(--border);
  font-size: 11px; font-weight: 800; letter-spacing: .1em; color: var(--text-3);
}
.uc-meta .uc-to { color: var(--brand-text); }
.uc-meta i { font-size: 9px; color: var(--text-3); }
.uc-btn {
  position: relative; width: 100%; padding: 12px; border-radius: 13px;
  background: var(--gradient-brand); color: #fff; border: 0;
  font-size: 14px; font-weight: 700; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 9px;
  box-shadow: 0 8px 22px rgba(99,102,241,.4);
  transition: transform .15s, filter .15s;
}
.uc-btn:hover { transform: translateY(-1px); filter: brightness(1.08); }

.uc-pop-enter-active { transition: opacity .22s; }
.uc-pop-enter-active .uc-modal { animation: ucIn .4s cubic-bezier(.2,.9,.3,1.15); }
.uc-pop-leave-active { transition: opacity .18s; }
.uc-pop-enter-from, .uc-pop-leave-to { opacity: 0; }
@keyframes ucIn { from { opacity: 0; transform: translateY(18px) scale(.96); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .uc-pop-enter-active .uc-modal { animation: none; }
}
</style>
