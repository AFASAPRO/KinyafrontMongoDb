<template>
  <div class="sub-page">
    <!-- ── Top bar (matches app chrome) ── -->
    <header class="sp-top">
      <button class="sp-back" @click="goBack" aria-label="Back to chat">
        <AnimatedIcon icon="fas fa-arrow-left" animation="subtle-hover" />
      </button>
      <div class="sp-title">
        <h1>Plans &amp; Usage</h1>
        <span>Your KinyaBot subscription</span>
      </div>
      <span class="sp-top-badge"><PlanBadge :plan="sub.plan" /></span>
    </header>

    <div class="sp-body">
      <!-- ── Current plan + usage ── -->
      <section class="sp-hero" v-if="sub.loaded">
        <div class="sp-hero-main">
          <div class="sp-hero-plan">
            <span class="sp-hero-label">YOUR PLAN</span>
            <PlanBadge :plan="sub.plan" size="lg" />
          </div>
          <UsageIndicator
            class="sp-usage"
            :used="sub.usage.used"
            :limit="sub.usage.limit"
            :plan-name="sub.planName"
          />
          <div class="sp-remaining" :class="sub.usageState">
            <template v-if="sub.usageState === 'limit'">Daily limit reached — your chats reset tomorrow</template>
            <template v-else><b>{{ sub.usage.remaining }}</b> chats remaining today</template>
          </div>
          <div class="sp-feature-chips">
            <span class="chip"><i class="fas fa-comment-dots"></i> {{ sub.usage.limit }} chats/day</span>
            <span class="chip" v-if="planCfg?.features?.priorityProcessing"><i class="fas fa-forward"></i> Priority processing</span>
            <span class="chip" v-if="planCfg?.features?.voiceAccess"><i class="fas fa-microphone-lines"></i> Voice</span>
            <span class="chip" v-if="planCfg?.features?.imageGeneration"><i class="fas fa-image"></i> Create Image</span>
            <span class="chip" v-if="planCfg?.features?.documentAnalysis"><i class="fas fa-file-lines"></i> Document analysis</span>
            <span class="chip"><i class="fas fa-mobile-screen"></i> PWA</span>
          </div>
        </div>

        <!-- Pending request banner (§17) -->
        <div v-if="sub.pendingRequest" class="sp-pending">
          <div class="sp-pending-row">
            <span class="spin-badge"><i class="fas fa-hourglass-half"></i> PENDING</span>
            <b>{{ sub.pendingRequest.requested_plan?.toUpperCase() }} upgrade request pending</b>
          </div>
          <p>Submitted {{ fmtDate(sub.pendingRequest.created_at) }}. We'll notify you once it's reviewed — no need to submit another request.</p>
          <button class="sp-ghost-btn" @click="showHistory = true"><i class="fas fa-list-check"></i> View status</button>
        </div>
      </section>

      <div v-else class="sp-skel">
        <div class="sk"></div>
      </div>

      <!-- ── Upgrade options ── -->
      <section class="sp-section" v-if="!sub.isPro">
        <div class="sp-sec-head">
          <h2>Upgrade options</h2>
          <p>Requests are reviewed by our team — your plan changes automatically once approved.</p>
        </div>
        <PlanCards
          :plans="catalog"
          :current-plan="sub.plan"
          :selectable="sub.upgradePaths"
          @select="goRequest"
        />
      </section>

      <!-- ── Full comparison (§8) ── -->
      <section class="sp-section">
        <div class="sp-sec-head">
          <h2>Compare everything</h2>
          <p>Every capability KinyaBot supports today, side by side.</p>
        </div>
        <div class="sp-card">
          <PlanComparison v-if="catalog.length" :plans="catalog" />
          <div v-else class="sp-mini-skel"><div class="sk"></div></div>
        </div>
      </section>

      <!-- ── Request history ── -->
      <section class="sp-section" v-if="sub.requests.length">
        <div class="sp-sec-head">
          <h2>Request history</h2>
          <button class="sp-ghost-btn" @click="showHistory = true">Open full view</button>
        </div>
        <div class="sp-card sp-list">
          <div v-for="r in sub.requests" :key="r.id" class="sp-req-row">
            <span class="sp-req-plan"><PlanBadge :plan="r.requested_plan" size="sm" /></span>
            <span class="sp-req-name">{{ r.requested_plan?.toUpperCase() }} upgrade</span>
            <span class="sp-req-date">{{ fmtDate(r.created_at) }}</span>
            <span class="sp-status" :class="r.status">{{ r.status }}</span>
          </div>
        </div>
      </section>

      <!-- Empty history -->
      <section class="sp-section" v-else-if="sub.loaded && !sub.pendingRequest">
        <div class="sp-empty">
          <i class="fas fa-inbox"></i>
          <span>No subscription activity yet.</span>
        </div>
      </section>
    </div>

    <!-- ── Full request history drawer ── -->
    <transition name="drawer">
      <div v-if="showHistory" class="drawer-overlay" @click.self="showHistory = false">
        <aside class="drawer">
          <div class="drawer-head">
            <h3><i class="fas fa-list-check"></i> Your requests</h3>
            <button class="tb" @click="showHistory = false"><i class="fas fa-xmark"></i></button>
          </div>
          <div class="drawer-body">
            <p v-if="!sub.requests.length" class="sp-empty-inline">No requests yet.</p>
            <div v-for="r in sub.requests" :key="r.id" class="hist-card">
              <div class="hc-top">
                <b>{{ r.requested_plan?.toUpperCase() }} upgrade</b>
                <span class="sp-status" :class="r.status">{{ r.status }}</span>
              </div>
              <div class="hc-row"><span>Requested</span><b>{{ fmtDate(r.created_at) }}</b></div>
              <div class="hc-row" v-if="r.reviewed_at"><span>Reviewed</span><b>{{ fmtDate(r.reviewed_at) }}</b></div>
              <div class="hc-row" v-if="r.reviewed_by"><span>Reviewer</span><b>{{ r.reviewed_by }}</b></div>
              <div class="hc-note" v-if="r.status === 'rejected' && r.rejection_reason">Reason: {{ r.rejection_reason }}</div>
              <div class="hc-note" v-if="r.status === 'approved'">Your plan was updated automatically.</div>
            </div>
          </div>
        </aside>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useSubscriptionStore } from '../stores/subscription'
import PlanBadge from '../components/plans/PlanBadge.vue'
import UsageIndicator from '../components/plans/UsageIndicator.vue'
import PlanCards from '../components/plans/PlanCards.vue'
import PlanComparison from '../components/plans/PlanComparison.vue'
import AnimatedIcon from '../components/AnimatedIcon.vue'

/**
 * Plans & Usage page (§17) — current plan, live usage, plan features,
 * upgrade options, pending request status and request history.
 * All values come from /api/subscription + /api/plans (backend truth).
 */
const router = useRouter()
const sub = useSubscriptionStore()
const showHistory = ref(false)

const catalog = computed(() => sub.plansCatalog)
const planCfg = computed(() => catalog.value.find(p => p.plan_id === sub.plan) || null)

function goBack() { router.push('/') }
function goRequest(planId) {
  router.push({ path: '/plans/request', query: planId && planId !== 'free' ? { plan: planId } : {} })
}
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString([], { month: 'long', day: 'numeric', year: 'numeric' })
}

onMounted(async () => {
  await Promise.all([sub.fetch(true), sub.fetchPlans(true)])
  sub.fetchRequests()
})
watch(() => sub.plan, () => { if (sub.loaded) sub.fetchRequests() })
</script>

<style scoped>
.sub-page { min-height: 100vh; height: 100vh; height: 100dvh; overflow-y: auto; background: var(--bg-base); color: var(--text-1); }
.sp-top {
  position: sticky; top: 0; z-index: 20;
  display: flex; align-items: center; gap: 12px;
  padding: 12px 18px; background: color-mix(in srgb, var(--bg-base) 88%, transparent);
  backdrop-filter: blur(10px); border-bottom: 1px solid var(--border-subtle);
}
.sp-back {
  width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  background: var(--surface-secondary); border: 1px solid var(--border);
  color: var(--text-2); font-size: 14px; display: flex; align-items: center; justify-content: center;
}
.sp-back:hover { color: var(--text-1); background: var(--surface-elevated); }
.sp-title h1 { margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -.01em; }
.sp-title span { font-size: 12px; color: var(--text-3); }
.sp-top-badge { margin-left: auto; }

.sp-body { max-width: 980px; margin: 0 auto; padding: 22px 18px 80px; display: flex; flex-direction: column; gap: 30px; }

/* Hero */
.sp-hero {
  display: grid; grid-template-columns: 1.2fr .9fr; gap: 16px; align-items: stretch;
}
.sp-hero-main {
  background: linear-gradient(160deg, rgba(99,102,241,.09), transparent 55%), var(--surface);
  border: 1px solid var(--border); border-radius: var(--r-xl); padding: 24px;
  display: flex; flex-direction: column; gap: 16px;
}
.sp-hero-plan { display: flex; align-items: center; gap: 14px; }
.sp-hero-label { font-size: 10.5px; font-weight: 800; letter-spacing: .16em; color: var(--text-3); }
.sp-usage { max-width: 420px; }
.sp-remaining { font-size: 13px; color: var(--text-2); }
.sp-remaining b { color: var(--text-1); }
.sp-remaining.warning { color: var(--warning); }
.sp-remaining.limit { color: var(--error); font-weight: 600; }
.sp-feature-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.chip {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 600; color: var(--text-2);
  background: var(--surface-secondary); border: 1px solid var(--border);
  padding: 5px 11px; border-radius: 99px;
}
.chip i { font-size: 9.5px; color: var(--brand-text); }

.sp-pending {
  background: rgba(245,158,11,.07); border: 1px solid rgba(245,158,11,.3);
  border-radius: var(--r-xl); padding: 20px;
  display: flex; flex-direction: column; gap: 10px; align-self: start;
}
.sp-pending-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.sp-pending-row b { font-size: 14px; color: var(--text-1); }
.sp-pending p { margin: 0; font-size: 12.5px; color: var(--text-2); line-height: 1.6; }
.spin-badge {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: .1em;
  background: rgba(245,158,11,.14); color: var(--warning);
  border: 1px solid rgba(245,158,11,.35); padding: 3px 9px; border-radius: 99px;
}

.sp-ghost-btn {
  align-self: start; display: inline-flex; align-items: center; gap: 8px;
  background: transparent; border: 1px solid var(--border-strong);
  color: var(--text-2); font-size: 12px; font-weight: 600;
  padding: 7px 13px; border-radius: 10px; cursor: pointer;
}
.sp-ghost-btn:hover { color: var(--text-1); background: var(--surface-secondary); }

/* Sections */
.sp-sec-head { margin-bottom: 14px; }
.sp-sec-head h2 { margin: 0 0 3px; font-size: 16px; font-weight: 800; letter-spacing: -.01em; }
.sp-sec-head p { margin: 0; font-size: 12.5px; color: var(--text-3); }
.sp-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-lg); padding: 18px; }

.sp-list { display: flex; flex-direction: column; gap: 0; padding: 6px 14px; }
.sp-req-row { display: flex; align-items: center; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--border-subtle); }
.sp-req-row:last-child { border-bottom: 0; }
.sp-req-name { font-size: 13px; font-weight: 700; color: var(--text-1); flex: 1; }
.sp-req-date { font-size: 12px; color: var(--text-3); }
.sp-status {
  font-size: 9.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 99px;
}
.sp-status.pending { background: rgba(245,158,11,.13); color: var(--warning); }
.sp-status.approved { background: rgba(34,197,94,.13); color: var(--success); }
.sp-status.rejected { background: rgba(239,68,68,.13); color: var(--error); }

.sp-empty {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 26px; color: var(--text-3); font-size: 13px;
  background: var(--surface); border: 1px dashed var(--border); border-radius: var(--r-lg);
}
.sp-empty-inline { color: var(--text-3); font-size: 13px; text-align: center; padding: 20px 0; margin: 0; }

/* Skeletons */
.sp-skel .sk, .sp-mini-skel .sk {
  height: 150px; border-radius: var(--r-xl);
  background: linear-gradient(100deg, var(--surface-secondary) 40%, var(--surface-elevated) 50%, var(--surface-secondary) 60%);
  background-size: 200% 100%; animation: skShimmer 1.4s infinite;
}
@keyframes skShimmer { to { background-position: -200% 0; } }

/* Drawer */
.drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.55); z-index: 90; backdrop-filter: blur(3px); }
.drawer {
  position: fixed; top: 0; right: 0; bottom: 0; width: min(420px, 92vw);
  background: var(--surface); border-left: 1px solid var(--border);
  display: flex; flex-direction: column; z-index: 95;
}
.drawer-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid var(--border); }
.drawer-head h3 { margin: 0; font-size: 15px; font-weight: 700; display: flex; gap: 9px; align-items: center; color: var(--text-1); }
.drawer-head .tb { background: transparent; border: 0; color: var(--text-2); font-size: 15px; cursor: pointer; }
.drawer-body { flex: 1; overflow-y: auto; padding: 14px 18px; display: flex; flex-direction: column; gap: 12px; }
.hist-card { background: var(--surface-secondary); border: 1px solid var(--border); border-radius: 14px; padding: 14px; }
.hc-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.hc-top b { font-size: 13.5px; color: var(--text-1); }
.hc-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-3); padding: 3px 0; }
.hc-row b { color: var(--text-2); font-weight: 600; }
.hc-note { margin-top: 8px; font-size: 12px; color: var(--text-2); background: var(--surface); border: 1px solid var(--border-subtle); border-radius: 9px; padding: 8px 10px; }

.drawer-enter-active, .drawer-leave-active { transition: opacity .2s; }
.drawer-enter-active .drawer { animation: drIn .26s var(--ease); }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
@keyframes drIn { from { transform: translateX(30px); opacity: 0; } to { transform: none; opacity: 1; } }

/* Responsive */
@media (max-width: 860px) {
  .sp-hero { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .sp-body { padding: 16px 12px 90px; gap: 24px; }
  .sp-hero-main { padding: 18px; }
  .sp-title h1 { font-size: 15px; }
}
</style>
