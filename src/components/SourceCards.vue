<template>
  <div v-if="sources.length" class="src-section" role="complementary" aria-label="Web sources">
    <button class="src-toggle" type="button" :aria-expanded="expanded" @click="expanded = !expanded">
      <i class="fas fa-link" aria-hidden="true"></i>
      <span>Sources · {{ sources.length }}</span>
      <i class="fas fa-chevron-down src-caret" :class="{ open: expanded }" aria-hidden="true"></i>
    </button>

    <transition name="src-expand">
      <div v-if="expanded" class="src-grid" :class="{ 'compact': compact }">
        <a
          v-for="(s, i) in sources"
          :key="s.url || i"
          class="src-card"
          :href="safeHref(s.url)"
          target="_blank"
          rel="noopener noreferrer nofollow"
          :aria-label="`Open source: ${s.title || s.domain} (opens in a new tab)`"
        >
          <span class="src-favicon" aria-hidden="true">
            <!-- §16/§17: NO fabricated images. A provider-returned icon is
                 shown when present; otherwise a clean domain fallback. -->
            <img v-if="s.icon && safeHref(s.icon)" :src="s.icon" alt="" loading="lazy" @error="hideBrokenIcon" />
            <template v-else><i class="fas fa-globe"></i></template>
          </span>
          <span class="src-body">
            <span class="src-title">{{ s.title || s.domain }}</span>
            <span v-if="s.snippet" class="src-snippet">{{ s.snippet }}</span>
            <span class="src-meta">
              <span class="src-domain">{{ s.domain || hostOf(s.url) }}</span>
              <span v-if="fmtDate(s.published_date)" class="src-date">{{ fmtDate(s.published_date) }}</span>
            </span>
          </span>
          <span class="src-ext" aria-hidden="true"><i class="fas fa-arrow-up-right-from-square"></i></span>
        </a>
      </div>
    </transition>
  </div>
</template>

<script setup>
/**
 * SourceCards (§16/§24) — responsive, honest source cards.
 * Every URL comes from the real search provider response; nothing is
 * ever invented. Links open in a new tab with noopener (§33).
 */
import { ref } from 'vue'

const props = defineProps({
  sources: { type: Array, default: () => [] },
  startExpanded: { type: Boolean, default: false },
  compact: { type: Boolean, default: false }, // tighter grid (mobile)
})

const expanded = ref(props.startExpanded)

function safeHref(url) {
  try {
    const u = new URL(String(url))
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.toString() : null
  } catch { return null }
}
function hostOf(url) {
  try { return new URL(String(url)).hostname.replace(/^www\./, '') } catch { return '' }
}
function fmtDate(d) {
  if (!d) return ''
  const t = Date.parse(d)
  if (!Number.isFinite(t)) return ''
  return new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
function hideBrokenIcon(e) { e.target.style.display = 'none' }
</script>

<style scoped>
.src-section { margin-top: 10px; }
.src-toggle {
  display: inline-flex; align-items: center; gap: 8px;
  background: var(--surface-secondary); border: 1px solid var(--border);
  color: var(--text-secondary); border-radius: 999px;
  padding: 6px 12px; font-size: 12px; font-weight: 700; cursor: pointer;
  transition: border-color .15s ease, color .15s ease;
}
.src-toggle:hover { border-color: var(--brand); color: var(--text-primary); }
.src-toggle .fa-link { color: var(--brand-text); font-size: 10.5px; }
.src-caret { font-size: 9px; opacity: .6; transition: transform .18s ease; }
.src-caret.open { transform: rotate(180deg); }
.src-grid {
  margin-top: 10px;
  display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px;
}
.src-grid.compact { grid-template-columns: 1fr; }
.src-card {
  display: flex; gap: 10px; align-items: flex-start;
  background: var(--surface-secondary); border: 1px solid var(--border);
  border-radius: 12px; padding: 10px 12px; text-decoration: none;
  transition: border-color .15s ease, transform .15s ease, box-shadow .15s ease;
  position: relative;
}
.src-card:hover { border-color: var(--brand); transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,.12); }
.src-card:focus-visible { outline: 2px solid var(--brand-ring); outline-offset: 2px; }
.src-favicon {
  width: 28px; height: 28px; border-radius: 8px; flex: none;
  background: var(--brand-soft); color: var(--brand-text);
  display: flex; align-items: center; justify-content: center; font-size: 12px;
  overflow: hidden;
}
.src-favicon img { width: 16px; height: 16px; object-fit: contain; border-radius: 4px; }
.src-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.src-title {
  font-size: 12.5px; font-weight: 700; color: var(--text-primary);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  padding-right: 16px;
}
.src-snippet {
  font-size: 11.5px; color: var(--text-muted); line-height: 1.45;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.src-meta { display: flex; gap: 8px; align-items: baseline; flex-wrap: wrap; margin-top: 2px; }
.src-domain { font-size: 10.5px; font-weight: 700; color: var(--brand-text); }
.src-date { font-size: 10.5px; color: var(--text-muted); }
.src-ext {
  position: absolute; top: 9px; right: 9px;
  color: var(--text-muted); font-size: 10px; opacity: .7;
}
.src-card:hover .src-ext { opacity: 1; color: var(--brand-text); }
.src-expand-enter-active, .src-expand-leave-active { transition: all .18s ease; }
.src-expand-enter-from, .src-expand-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
