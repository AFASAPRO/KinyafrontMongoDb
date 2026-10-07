<template>
  <div class="plan-cards" :class="{ dense }">
    <article
      v-for="p in plans"
      :key="p.plan_id"
      class="plan-card"
      :class="[`pc-${p.plan_id}`, { current: p.plan_id === currentPlan, featured: p.plan_id === 'pro' }]"
    >
      <header class="pc-head">
        <div class="pc-top">
          <PlanBadge :plan="p.plan_id" />
          <span v-if="p.plan_id === currentPlan" class="pc-current-tag">Current</span>
          <span v-else-if="p.plan_id === 'pro'" class="pc-most">Most powerful</span>
        </div>
        <h3 class="pc-name">{{ p.name }}</h3>
        <p class="pc-tagline">{{ p.tagline }}</p>
      </header>

      <div class="pc-limit">
        <span class="pc-limit-num">{{ p.dailyChatLimit }}</span>
        <span class="pc-limit-unit">AI chats / day</span>
      </div>

      <ul class="pc-features">
        <li v-for="f in featureRows(p)" :key="f.label" :class="{ off: !f.on }">
          <i class="fas" :class="f.on ? 'fa-check' : 'fa-minus'"></i>
          <span>{{ f.label }}</span>
        </li>
      </ul>

      <div class="pc-cta">
        <button v-if="p.plan_id === currentPlan" class="pc-btn current" disabled>Current Plan</button>
        <button
          v-else-if="canSelect(p)"
          class="pc-btn"
          :class="{ primary: p.plan_id !== 'free' }"
          @click="$emit('select', p.plan_id)"
        >
          {{ p.plan_id === 'free' ? 'Choose Free' : `Upgrade to ${p.name}` }}
        </button>
        <button v-else class="pc-btn" disabled :title="`${p.name} is not available from ${currentPlanName}`">
          Not available
        </button>
      </div>
    </article>
  </div>
</template>

<script setup>
import PlanBadge from './PlanBadge.vue'

/**
 * Plan comparison cards (§1, §8, §41).
 * Copy is realistic and honest — features listed are features the
 * backend actually supports or gates via the plan flag system.
 */
const props = defineProps({
  plans: { type: Array, default: () => [] },          // normalized plan configs
  currentPlan: { type: String, default: 'free' },
  dense: { type: Boolean, default: false },           // modal layout
  // Which plans may be selected from the current plan (upgrade paths)
  selectable: { type: Array, default: null },         // null ⇒ derive: all except current
})
defineEmits(['select'])

const currentPlanName = props.plans.find(p => p.plan_id === props.currentPlan)?.name || props.currentPlan

function canSelect(p) {
  if (p.plan_id === props.currentPlan) return false
  if (Array.isArray(props.selectable)) return props.selectable.includes(p.plan_id)
  return true
}

function featureRows(plan) {
  const f = plan.features || {}
  const pro = plan.plan_id === 'pro'
  return [
    { label: `${plan.dailyChatLimit} AI chats per day`, on: true },
    { label: plan.plan_id === 'free' ? 'Standard AI response speed' : (pro ? 'Highest response priority' : 'Higher request priority'), on: true },
    { label: plan.plan_id === 'free' ? 'Standard context handling' : `${plan.contextMessages}-message context window`, on: true },
    { label: 'Document & file analysis', on: f.documentAnalysis !== false },
    { label: plan.plan_id === 'free' ? 'Base document size' : `${plan.docSizeMultiplier}× larger documents`, on: true },
    { label: 'Voice input & output', on: f.voiceAccess !== false },
    { label: 'Image generation (Create Image)', on: f.imageGeneration !== false },
    { label: 'Supported AI tools (Canvas, Learning)', on: f.advancedTools !== false },
    { label: 'Priority processing', on: f.priorityProcessing === true },
    { label: 'Agent mode', on: f.agentAccess === true },
  ]
}
</script>

<style scoped>
.plan-cards {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 14px; width: 100%;
}
.plan-cards.dense { gap: 10px; }

.plan-card {
  position: relative; display: flex; flex-direction: column; gap: 14px;
  background: var(--surface-secondary);
  border: 1px solid var(--border); border-radius: var(--r-lg);
  padding: 20px 18px 18px;
  transition: transform var(--t-base) var(--ease), border-color var(--t-base), box-shadow var(--t-base);
}
.plan-card:hover { transform: translateY(-3px); border-color: var(--border-strong); box-shadow: var(--shadow-md); }
.plan-card.current { border-color: var(--brand); box-shadow: 0 0 0 1px var(--brand-ring); }
.plan-card.featured { border-color: rgba(139,92,246,.45); background: linear-gradient(180deg, rgba(99,102,241,.07), transparent 45%), var(--surface-secondary); }

.pc-head { display: flex; flex-direction: column; gap: 6px; }
.pc-top { display: flex; align-items: center; gap: 8px; min-height: 22px; }
.pc-current-tag, .pc-most {
  font-size: 9.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
  padding: 2px 8px; border-radius: 99px;
}
.pc-current-tag { background: var(--brand-soft); color: var(--brand-text); }
.pc-most { background: rgba(139,92,246,.14); color: #c4b5fd; border: 1px solid rgba(139,92,246,.3); }
.light-mode .pc-most { color: #6d28d9; }

.pc-name { font-size: 19px; font-weight: 800; letter-spacing: -.01em; color: var(--text-1); margin: 0; }
.pc-tagline { font-size: 12.5px; color: var(--text-3); margin: 0; line-height: 1.5; min-height: 2.6em; }

.pc-limit { display: flex; align-items: baseline; gap: 7px; }
.pc-limit-num { font-size: 30px; font-weight: 800; letter-spacing: -.02em; color: var(--text-1); font-variant-numeric: tabular-nums; }
.pc-limit-unit { font-size: 12px; color: var(--text-3); font-weight: 600; }

.pc-features { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; flex: 1; }
.pc-features li { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; color: var(--text-2); line-height: 1.45; }
.pc-features li i { flex-shrink: 0; font-size: 10px; margin-top: 3.5px; color: var(--success); }
.pc-features li.off { color: var(--text-3); }
.pc-features li.off i { color: var(--text-disabled); }

.pc-cta { margin-top: 2px; }
.pc-btn {
  width: 100%; padding: 10px 14px; border-radius: 11px;
  font-size: 13px; font-weight: 700; cursor: pointer;
  background: var(--surface-elevated); color: var(--text-1);
  border: 1px solid var(--border-strong);
  transition: filter .15s, transform .15s, background .15s;
}
.pc-btn:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
.pc-btn.primary {
  background: var(--gradient-brand); color: #fff; border-color: transparent;
  box-shadow: 0 4px 14px rgba(99,102,241,.35);
}
.pc-btn.current { background: var(--brand-soft); color: var(--brand-text); border-color: transparent; cursor: default; }
.pc-btn:disabled { opacity: .55; cursor: not-allowed; }

@media (max-width: 640px) {
  .plan-cards { grid-template-columns: 1fr; }
  .plan-card { padding: 16px 14px 14px; }
  .pc-tagline { min-height: 0; }
}
</style>
