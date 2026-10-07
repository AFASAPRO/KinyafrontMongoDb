<template>
  <teleport to="body">
    <transition name="plm-pop">
      <div v-if="open" class="plm-overlay" @click.self="$emit('close')" role="dialog" aria-modal="true" aria-label="Daily limit reached">
        <div class="plm-modal">
          <button class="plm-close" @click="$emit('close')" aria-label="Close"><i class="fas fa-xmark"></i></button>

          <div class="plm-head">
            <div class="plm-icon"><i class="fas fa-gauge-simple-high"></i></div>
            <h2>Daily limit reached</h2>
            <p class="plm-sub">
              You've used all <b>{{ usage?.limit ?? 50 }}</b> chats available on your
              <b>{{ (usage?.planName || 'Free') }}</b> plan today.
            </p>
            <p class="plm-reset"><i class="fas fa-clock-rotate-left"></i> Your daily limit will reset tomorrow.</p>
          </div>

          <div class="plm-plans" v-if="plans.length">
            <PlanCards
              :plans="plans"
              :current-plan="usage?.plan || 'free'"
              dense
              @select="onSelect"
            />
          </div>
          <div v-else class="plm-skel">
            <div class="sk" v-for="i in 3" :key="i"></div>
          </div>

          <div class="plm-foot">
            <button class="plm-later" @click="$emit('close')">Maybe later</button>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { watch, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import PlanCards from './PlanCards.vue'

/**
 * Limit-reached upgrade modal (§7).
 * Shown when the backend answers DAILY_LIMIT_REACHED — the limit
 * response is part of the upgrade experience, not a generic error.
 */
const props = defineProps({
  open: { type: Boolean, default: false },
  usage: { type: Object, default: null },   // { used, limit, plan, planName }
  plans: { type: Array, default: () => [] },
})
const emit = defineEmits(['close'])
const router = useRouter()

function onSelect(planId) {
  emit('close')
  router.push({ path: '/plans/request', query: planId && planId !== 'free' ? { plan: planId } : {} })
}

// Lock body scroll while open
watch(() => props.open, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
})
onBeforeUnmount(() => { document.body.style.overflow = '' })
</script>

<style scoped>
.plm-overlay {
  position: fixed; inset: 0; z-index: 9998;
  background: rgba(3, 6, 14, .78); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 18px; overflow-y: auto;
}
.plm-modal {
  position: relative; width: min(860px, 100%);
  background: var(--surface); border: 1px solid var(--border-strong);
  border-radius: 22px; padding: 30px 26px 22px;
  box-shadow: 0 30px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(99,102,241,.08);
  max-height: calc(100vh - 36px); overflow-y: auto;
}
.plm-close {
  position: absolute; top: 14px; right: 14px; width: 34px; height: 34px;
  border-radius: 10px; background: var(--surface-secondary); border: 1px solid var(--border);
  color: var(--text-2); font-size: 14px; cursor: pointer; z-index: 2;
}
.plm-close:hover { color: var(--text-1); background: var(--surface-elevated); }

.plm-head { text-align: center; margin-bottom: 22px; }
.plm-icon {
  width: 54px; height: 54px; margin: 0 auto 14px; border-radius: 16px;
  background: linear-gradient(135deg, rgba(239,68,68,.15), rgba(245,158,11,.1));
  border: 1px solid rgba(245,158,11,.35);
  display: flex; align-items: center; justify-content: center;
  color: var(--warning); font-size: 22px;
}
.plm-head h2 { margin: 0 0 8px; font-size: 22px; font-weight: 800; letter-spacing: -.02em; color: var(--text-1); }
.plm-sub { margin: 0 auto; max-width: 460px; font-size: 13.5px; color: var(--text-2); line-height: 1.6; }
.plm-sub b { color: var(--text-1); }
.plm-reset { margin: 10px auto 0; font-size: 12px; color: var(--text-3); display: inline-flex; align-items: center; gap: 7px; background: var(--surface-secondary); border: 1px solid var(--border); padding: 6px 14px; border-radius: 99px; }

.plm-plans { margin-top: 6px; }

.plm-skel { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; }
.plm-skel .sk { height: 260px; border-radius: var(--r-lg); background: linear-gradient(100deg, var(--surface-secondary) 40%, var(--surface-elevated) 50%, var(--surface-secondary) 60%); background-size: 200% 100%; animation: plmShimmer 1.4s infinite; }
@keyframes plmShimmer { to { background-position: -200% 0; } }

.plm-foot { display: flex; justify-content: center; margin-top: 18px; }
.plm-later {
  background: transparent; border: 0; color: var(--text-3);
  font-size: 12.5px; font-weight: 600; cursor: pointer; padding: 8px 16px; border-radius: 10px;
}
.plm-later:hover { color: var(--text-1); background: var(--surface-secondary); }

@media (prefers-reduced-motion: reduce) {
  .plm-pop-enter-active, .plm-pop-leave-active { transition: opacity .01ms; }
}

.plm-pop-enter-active { transition: opacity .22s ease; }
.plm-pop-enter-active .plm-modal { animation: plmIn .3s cubic-bezier(.2,.9,.3,1.2); }
.plm-pop-leave-active { transition: opacity .18s ease; }
.plm-pop-enter-from, .plm-pop-leave-to { opacity: 0; }
@keyframes plmIn { from { opacity: 0; transform: translateY(14px) scale(.97); } to { opacity: 1; transform: none; } }

@media (max-width: 640px) {
  .plm-modal { padding: 24px 16px 16px; border-radius: 18px; }
  .plm-head h2 { font-size: 19px; }
}
</style>
