<template>
  <div class="ag-changes">
    <div class="ch-tools">
      <span class="ch-title"><i class="fas fa-code-compare" aria-hidden="true"></i> File changes</span>
      <button class="ch-btn" title="Refresh changes" aria-label="Refresh changes" @click="agent.fetchChanges()">
        <i class="fas fa-rotate" aria-hidden="true"></i>
      </button>
    </div>

    <div v-if="!agent.changes.length" class="ch-empty">
      <i class="fas fa-code-compare" aria-hidden="true"></i>
      <p>No file changes recorded yet.</p>
      <p class="dim">Every file the Agent creates or edits — with a real diff — appears here.</p>
    </div>

    <div v-else class="ch-list">
      <details v-for="(c, i) in agent.changes" :key="i" class="ch-card" :open="i === 0">
        <summary class="ch-head">
          <span class="ch-action" :class="c.action">{{ c.action }}</span>
          <span class="ch-path">{{ c.path }}</span>
          <span class="ch-stats dim">{{ c.change?.added || 0 }}+ {{ c.change?.removed || 0 }}−</span>
          <span class="dim ch-time">{{ fmtTime(c.at || c.created_at) }}</span>
        </summary>
        <div class="ch-diff">
          <div
            v-for="(h, hi) in (c.hunks || [])"
            :key="hi"
            class="ch-hunk"
          >
            <div v-for="(ln, li) in h.lines || []" :key="li" class="ch-line" :class="ln.type">
              <span class="ln-sign">{{ ln.type === 'add' ? '+' : ln.type === 'del' ? '−' : ' ' }}</span>
              <span class="ln-text">{{ ln.text }}</span>
            </div>
          </div>
          <p v-if="!(c.hunks || []).length" class="dim ch-nohunk">
            {{ c.change?.summary || 'Binary or empty diff.' }}
          </p>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup>
/**
 * KinyaBot Agent V1 — Changes Tab (§5, §6)
 * Real diff records persisted by the server when the Agent writes
 * files. Rendered as unified-diff hunks: additions green, deletions
 * red. Empty state is honest — no fabricated diffs.
 */
import { useAgentStore } from '../../stores/agent'

const agent = useAgentStore()

function fmtTime(iso) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
</script>

<style scoped>
.ag-changes { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.ch-tools {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-bottom: 1px solid var(--border-subtle, #172033);
  background: var(--surface-secondary, #111827);
}
:global(.light-mode) .ch-tools { background: #F3F5F9; border-bottom-color: #E3E7EF; }
.ch-title { display: flex; gap: 7px; align-items: center; font-size: 12px; color: var(--text-secondary); }
.ch-title i { color: var(--brand); }
.ch-btn {
  width: 28px; height: 28px; display: grid; place-items: center;
  border: none; border-radius: var(--r-xs, 6px);
  background: transparent; color: var(--text-muted); cursor: pointer; font-size: 12.5px;
}
.ch-btn:hover { background: var(--surface-elevated, #151B2B); color: var(--text-primary); }

.ch-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: var(--text-muted); font-size: 13px; text-align: center; padding: 24px; }
.ch-empty i { font-size: 26px; opacity: .5; }
.ch-empty .dim { font-size: 12px; }

.ch-list { flex: 1; overflow-y: auto; padding: 8px; display: flex; flex-direction: column; gap: 8px; }

.ch-card { border: 1px solid var(--border-subtle, #172033); border-radius: var(--r-sm, 8px); overflow: hidden; background: var(--code-bg, #0A0F1A); }
:global(.light-mode) .ch-card { border-color: #E3E7EF; background: #FFF; }

.ch-head {
  display: flex; align-items: center; gap: 8px;
  padding: 7px 10px; cursor: pointer; list-style: none;
  background: var(--code-header, #0D1422);
  font-size: 12px; color: var(--text-secondary);
}
:global(.light-mode) .ch-head { background: #EBEDF3; color: #243044; }
.ch-head::-webkit-details-marker { display: none; }

.ch-action {
  flex-shrink: 0; font-size: 10px; text-transform: uppercase; letter-spacing: .04em;
  padding: 2px 7px; border-radius: 999px; font-weight: 600;
}
.ch-action.created { background: rgba(34,197,94,.15); color: var(--success, #22C55E); }
.ch-action.modified { background: rgba(99,102,241,.15); color: var(--brand-text, #818CF8); }
.ch-action.deleted { background: rgba(239,68,68,.15); color: var(--error, #EF4444); }
.ch-action.renamed { background: rgba(245,158,11,.15); color: var(--warning, #F59E0B); }

.ch-path { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-mono, monospace); color: var(--text-primary); }
.ch-stats { flex-shrink: 0; font-size: 11px; font-family: var(--font-mono, monospace); }
.ch-time { flex-shrink: 0; font-size: 10.5px; }

.ch-diff { font-family: var(--font-mono, monospace); font-size: 11.5px; line-height: 1.55; max-height: 300px; overflow: auto; }
.ch-hunk { padding: 2px 0; }
.ch-line { display: flex; gap: 0; }
.ln-sign { flex-shrink: 0; width: 20px; text-align: center; user-select: none; opacity: .8; }
.ln-text { white-space: pre-wrap; word-break: break-all; flex: 1; }
.ch-line.add { background: rgba(34,197,94,.10); color: #86EFAC; }
.ch-line.add .ln-sign { color: var(--success, #22C55E); }
.ch-line.del { background: rgba(239,68,68,.10); color: #FCA5A5; }
.ch-line.del .ln-sign { color: var(--error, #EF4444); }
.ch-line.ctx { color: var(--text-muted); }
:global(.light-mode) .ch-line.add { background: rgba(34,197,94,.10); color: #15803D; }
:global(.light-mode) .ch-line.del { background: rgba(239,68,68,.10); color: #B91C1C; }
:global(.light-mode) .ch-line.ctx { color: #5B6879; }

.ch-nohunk { padding: 10px; font-size: 11.5px; }
.dim { color: var(--text-muted); }
</style>
