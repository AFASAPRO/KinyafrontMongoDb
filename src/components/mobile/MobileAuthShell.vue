<template>
  <div class="mas">
    <header class="mas-hd">
      <button class="mas-theme" type="button" @click="toggleThemeMode"
        :aria-label="isLightMode ? 'Switch to dark mode' : 'Switch to light mode'">
        <i :class="isLightMode ? 'fas fa-moon' : 'fas fa-sun'"></i>
      </button>
      <div class="mas-brand">
        <img src="/logo.png" alt="KinyaBot" />
        <span>KinyaBot</span>
      </div>
      <p class="mas-sub">{{ subtitle }}</p>
    </header>

    <main class="mas-body">
      <h1 class="mas-title">{{ title }}</h1>
      <slot />
    </main>
  </div>
</template>

<script setup>
import { isLightMode, toggleThemeMode } from '../../theme'
defineProps({ title: String, subtitle: String })
</script>

<style scoped>
.mas {
  min-height: 100vh; min-height: 100dvh; width: 100%;
  display: flex; flex-direction: column;
  background: var(--bg-base); color: var(--text-1);
  overflow-y: auto; -webkit-overflow-scrolling: touch;
}
/* Flat brand header — solid accent, no gradient wash, gently curved */
.mas-hd {
  position: relative; flex-shrink: 0;
  padding: max(20px, calc(env(safe-area-inset-top) + 12px)) 22px 38px;
  background: var(--accent-solid); color: #fff;
  border-bottom-left-radius: 50% 34px;
  border-bottom-right-radius: 6% 12px;
  animation: masDrop .45s cubic-bezier(.22,1,.36,1) both;
}
.mas-brand { display: flex; align-items: center; gap: 9px; margin-top: 10px; position: relative; }
.mas-brand img { width: 32px; height: 32px; border-radius: 9px; object-fit: contain; background: rgba(255,255,255,.14); padding: 3px; }
.mas-brand span { font-size: 21px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
.mas-sub { margin-top: 6px; font-size: 12.5px; opacity: .82; position: relative; }
.mas-theme {
  position: absolute; top: max(10px, env(safe-area-inset-top)); right: 14px; z-index: 2;
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(255,255,255,.16); color: #fff; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  transition: transform .15s, background .2s;
}
.mas-theme:active { transform: scale(.9); }

.mas-body { flex: 1; padding: 20px 22px calc(24px + env(safe-area-inset-bottom)); }
.mas-title { font-size: 22px; font-weight: 700; margin-bottom: 16px; color: var(--text-1); animation: fadeUp .4s ease both; }

/* Staggered fade/slide-in for every direct field — modern app entrance */
.mas-body :deep(> form > *),
.mas-body :deep(> .m-or),
.mas-body :deep(> .m-social),
.mas-body :deep(> .m-switch),
.mas-body :deep(> .m-center) {
  animation: fieldIn .4s cubic-bezier(.22,1,.36,1) both;
}
.mas-body :deep(> form > *:nth-child(1)) { animation-delay: .04s; }
.mas-body :deep(> form > *:nth-child(2)) { animation-delay: .09s; }
.mas-body :deep(> form > *:nth-child(3)) { animation-delay: .14s; }
.mas-body :deep(> form > *:nth-child(4)) { animation-delay: .19s; }
.mas-body :deep(> form > *:nth-child(5)) { animation-delay: .24s; }
.mas-body :deep(> .m-or)     { animation-delay: .26s; }
.mas-body :deep(> .m-social) { animation-delay: .3s; }
.mas-body :deep(> .m-switch) { animation-delay: .34s; }

@keyframes masDrop { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: none; } }
@keyframes fieldIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .mas-hd, .mas-title, .mas-body :deep(*) { animation: none !important; }
}
</style>
