<template>
  <transition name="wsm-fade">
    <div v-if="open" class="wsm-backdrop" @click.self="close" @keydown.esc="close">
      <div class="wsm-modal" role="dialog" aria-modal="true" aria-labelledby="wsm-title">
        <button class="wsm-x" aria-label="Close" @click="close"><i class="fas fa-xmark"></i></button>

        <div class="wsm-hero">
          <div class="wsm-badge"><i class="fas fa-globe"></i></div>
          <h2 id="wsm-title" class="serif-display">Unlock Web Search</h2>
          <p class="wsm-sub">Web Search is available with <b>KinyaBot Pro</b>. Upgrade to ground answers in live, current information from across the web.</p>
        </div>

        <ul class="wsm-benefits">
          <li v-for="b in benefits" :key="b.t">
            <span class="wb-ic"><i :class="b.icon"></i></span>
            <span><b>{{ b.t }}</b><small>{{ b.d }}</small></span>
          </li>
        </ul>

        <div class="wsm-preview">
          <div class="wp-row"><i class="fas fa-magnifying-glass"></i><span>“What happened in AI today?”</span></div>
          <div class="wp-row"><i class="fas fa-book"></i><span>“Find the latest React documentation”</span></div>
          <div class="wp-row"><i class="fas fa-scale-balanced"></i><span>“Compare the newest models from OpenAI and Google”</span></div>
        </div>

        <div class="wsm-actions">
          <button class="wsm-upgrade" type="button" @click="goUpgrade">
            <i class="fas fa-bolt"></i> Upgrade to Pro
          </button>
          <button class="wsm-later" type="button" @click="close">Maybe later</button>
        </div>
        <p class="wsm-note"><i class="fas fa-lock"></i> Requests are verified server-side — this feature is part of the Pro plan.</p>
      </div>
    </div>
  </transition>
</template>

<script setup>
/**
 * Web Search upgrade modal (§28) — what Free users see when they try
 * the Web Search mode: Pro benefits, capability preview, upgrade CTA.
 * The request NEVER reaches the search backend for unentitled users.
 */
import { watch } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps({
  open: { type: Boolean, default: false },
})
const emit = defineEmits(['close'])
const router = useRouter()

const benefits = [
  { icon: 'fas fa-magnifying-glass', t: 'Search current information', d: 'Live answers for news, prices and releases' },
  { icon: 'fas fa-layer-group', t: 'Research across multiple sources', d: 'Multi-query research with source diversity' },
  { icon: 'fas fa-quote-right', t: 'Get citations', d: 'Every web-grounded answer shows its sources' },
  { icon: 'fas fa-book-open', t: 'Access current documentation', d: 'Fresh official docs for technical questions' },
]

function close() { emit('close') }
function goUpgrade() {
  close()
  router.push('/plans/request?plan=pro')
}

watch(() => props.open, (v) => {
  document.documentElement.style.overflow = v ? 'hidden' : ''
})
</script>

<style scoped>
.wsm-backdrop {
  position: fixed; inset: 0; z-index: 1200;
  background: rgba(2, 6, 23, .66); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 18px;
}
.wsm-modal {
  position: relative; width: min(460px, 100%); max-height: min(92vh, 640px); overflow: auto;
  background: var(--surface-elevated); border: 1px solid var(--border-strong);
  border-radius: 22px; padding: 26px 24px 20px; text-align: center;
  box-shadow: 0 24px 70px rgba(0,0,0,.45);
}
.wsm-x {
  position: absolute; top: 14px; right: 14px; width: 32px; height: 32px;
  border-radius: 10px; border: 1px solid var(--border); background: transparent;
  color: var(--text-muted); cursor: pointer; font-size: 13px;
}
.wsm-x:hover { color: var(--text-primary); border-color: var(--border-strong); }
.wsm-badge {
  width: 58px; height: 58px; margin: 0 auto 14px; border-radius: 18px;
  background: linear-gradient(135deg, var(--brand), var(--accent-violet));
  color: #fff; font-size: 22px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 10px 26px rgba(99,102,241,.35);
}
.wsm-modal h2 { margin: 0 0 8px; font-size: 24px; color: var(--text-primary); }
.wsm-sub { margin: 0 auto 18px; font-size: 13.5px; line-height: 1.55; color: var(--text-secondary); max-width: 350px; }
.wsm-sub b { color: var(--brand-text); }
.wsm-benefits { list-style: none; margin: 0 0 16px; padding: 0; text-align: left; display: flex; flex-direction: column; gap: 9px; }
.wsm-benefits li { display: flex; gap: 11px; align-items: flex-start; }
.wb-ic {
  width: 30px; height: 30px; border-radius: 9px; flex: none;
  background: var(--brand-soft); color: var(--brand-text); font-size: 12px;
  display: flex; align-items: center; justify-content: center; margin-top: 1px;
}
.wsm-benefits b { display: block; font-size: 13px; color: var(--text-primary); }
.wsm-benefits small { display: block; font-size: 11.5px; color: var(--text-muted); margin-top: 1px; }
.wsm-preview {
  border: 1px dashed var(--border-strong); border-radius: 14px;
  padding: 11px 13px; margin-bottom: 18px;
  display: flex; flex-direction: column; gap: 7px;
}
.wp-row { display: flex; gap: 9px; align-items: center; font-size: 12px; color: var(--text-secondary); text-align: left; }
.wp-row i { color: var(--accent-cyan); font-size: 11px; width: 14px; }
.wsm-actions { display: flex; flex-direction: column; gap: 8px; }
.wsm-upgrade {
  border: 0; cursor: pointer; border-radius: 12px; padding: 13px 16px;
  font-size: 14px; font-weight: 800; color: #fff;
  background: linear-gradient(135deg, var(--brand-strong), var(--accent-violet));
  transition: filter .15s ease, transform .15s ease;
}
.wsm-upgrade:hover { filter: brightness(1.08); transform: translateY(-1px); }
.wsm-later {
  border: 1px solid var(--border); background: transparent; color: var(--text-muted);
  border-radius: 12px; padding: 10px 16px; font-size: 13px; cursor: pointer;
}
.wsm-later:hover { color: var(--text-primary); }
.wsm-note { margin: 14px 0 0; font-size: 11px; color: var(--text-muted); display: flex; gap: 6px; align-items: center; justify-content: center; }
.wsm-note i { font-size: 9.5px; }
.wsm-fade-enter-active, .wsm-fade-leave-active { transition: opacity .18s ease; }
.wsm-fade-enter-from, .wsm-fade-leave-to { opacity: 0; }
</style>
