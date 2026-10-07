<template>
  <div class="plan-compare">
    <div class="pc-scroll">
      <table>
        <thead>
          <tr>
            <th class="feat-col">Compare plans</th>
            <th v-for="p in plans" :key="p.plan_id" :class="{ featured: p.plan_id === 'pro' }">
              <div class="th-plan">
                <PlanBadge :plan="p.plan_id" size="sm" />
                <span class="th-limit">{{ p.dailyChatLimit }} chats/day</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.label">
            <td class="feat-col">
              <span class="feat-label">{{ row.label }}</span>
              <span v-if="row.hint" class="feat-hint">{{ row.hint }}</span>
            </td>
            <td v-for="p in plans" :key="p.plan_id" :class="{ featured: p.plan_id === 'pro' }">
              <template v-if="cellFor(row, p).check">
                <i class="fas fa-check cell-check" aria-label="Included"></i>
              </template>
              <template v-else-if="cellFor(row, p).off">
                <i class="fas fa-minus cell-off" aria-label="Not included"></i>
              </template>
              <span v-else class="cell-text" :class="{ muted: cellFor(row, p).muted }">{{ cellFor(row, p).text }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import PlanBadge from './PlanBadge.vue'

/**
 * Full plan comparison table (§8) — checkmarks, unavailable states and
 * concise per-plan values, all sourced from the live plan config
 * (GET /api/plans → PlanConfig collection).
 */
const props = defineProps({
  plans: { type: Array, default: () => [] },
})

const rows = [
  { label: 'Daily chats', value: p => ({ text: `${p.dailyChatLimit} / day` }) },
  { label: 'Response priority', value: p => p.features?.priorityProcessing
      ? { text: p.plan_id === 'pro' ? 'Highest available' : 'Elevated' }
      : { text: 'Standard' } },
  { label: 'Context capacity', value: p => ({ text: `${p.contextMessages} messages` }) },
  { label: 'Document analysis', hint: 'PDF, DOCX, TXT, CSV & code files', value: p => (p.features?.documentAnalysis !== false ? { check: true } : { off: true }) },
  { label: 'Document size allowance', value: p => ({ text: p.plan_id === 'free' ? '15 MB' : `${Math.round(15 * (p.docSizeMultiplier || 1))} MB` }) },
  { label: 'Voice input & output', value: p => (p.features?.voiceAccess !== false ? { check: true } : { off: true }) },
  { label: 'Image generation', hint: 'Create Image', value: p => (p.features?.imageGeneration !== false ? { check: true } : { off: true }) },
  { label: 'Advanced tools', hint: 'Canvas & Guided Learning', value: p => (p.features?.advancedTools !== false ? { check: true } : { off: true }) },
  { label: 'Agent access', value: p => (p.features?.agentAccess === true ? { check: true } : { text: 'Not yet available', muted: true }) },
  { label: 'Priority server processing', value: p => (p.features?.priorityProcessing === true ? { check: true } : { off: true }) },
  { label: 'PWA support', value: () => ({ check: true }) },
]

function cellFor(row, plan) {
  try { return row.value(plan) || {} } catch { return {} }
}
</script>

<style scoped>
.plan-compare { width: 100%; }
.pc-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
table { width: 100%; border-collapse: collapse; min-width: 540px; }

th, td {
  padding: 11px 14px; text-align: center;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 12.5px;
}
th { padding-top: 4px; }
tbody tr:last-child td { border-bottom: 0; }
.feat-col { text-align: left; width: 34%; }
.feat-label { display: block; color: var(--text-1); font-weight: 600; }
.feat-hint { display: block; font-size: 11px; color: var(--text-3); margin-top: 1px; }

th.featured, td.featured { background: rgba(99,102,241,.05); }
th.featured { border-radius: 10px 10px 0 0; }

.th-plan { display: flex; flex-direction: column; align-items: center; gap: 4px; }
.th-limit { font-size: 11px; color: var(--text-3); font-weight: 600; }

.cell-check { color: var(--success); font-size: 12px; }
.cell-off { color: var(--text-disabled); font-size: 11px; }
.cell-text { color: var(--text-2); font-weight: 600; font-variant-numeric: tabular-nums; }
.cell-text.muted { color: var(--text-3); font-weight: 500; }
</style>
