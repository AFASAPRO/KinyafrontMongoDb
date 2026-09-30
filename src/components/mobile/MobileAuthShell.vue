<template>
  <div class="mas">
    <header class="mas-hd">
      <button class="mas-theme" type="button" @click="toggleThemeMode"
        :aria-label="isLightMode ? 'Switch to dark mode' : 'Switch to light mode'">
        <i :class="isLightMode ? 'fas fa-moon' : 'fas fa-sun'"></i>
      </button>
      <div class="mas-deco d1"></div>
      <div class="mas-deco d2"></div>
      <div class="mas-brand">
        <img src="/logo.png" alt="KinyaBot" />
        <span>Kinya<b>Bot</b></span>
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

/* Attractive curved brand header — one smooth wave (two matching
   elliptical corners meeting at centre), flat solid accent, no gradient */
.mas-hd {
  position: relative; flex-shrink: 0; overflow: hidden;
  padding: max(22px, calc(env(safe-area-inset-top) + 14px)) 24px 46px;
  background: var(--accent-solid); color: #fff;
  border-bottom-left-radius: 50% 40px;
  border-bottom-right-radius: 50% 40px;
  box-shadow: 0 18px 34px -22px rgba(0,0,0,.5);
  animation: masDrop .45s cubic-bezier(.22,1,.36,1) both;
}
.mas-deco { position: absolute; border-radius: 50%; background: rgba(255,255,255,.1); pointer-events: none; }
.mas-deco.d1 { width: 130px; height: 130px; top: -60px; right: -30px; }
.mas-deco.d2 { width: 70px; height: 70px; bottom: -10px; left: -20px; background: rgba(255,255,255,.07); }

.mas-brand { display: flex; align-items: center; gap: 10px; margin-top: 8px; position: relative; }
.mas-brand img { width: 38px; height: 38px; object-fit: contain; filter: drop-shadow(0 3px 6px rgba(0,0,0,.25)); }
.mas-brand span { font-size: 19px; font-weight: 500; letter-spacing: .02em; }
.mas-brand span b { font-weight: 800; }
.mas-sub { margin-top: 7px; font-size: 12.5px; opacity: .85; position: relative; max-width: 30ch; line-height: 1.4; }
.mas-theme {
  position: absolute; top: max(12px, env(safe-area-inset-top)); right: 16px; z-index: 2;
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(255,255,255,.16); color: #fff; font-size: 13px;
  display: flex; align-items: center; justify-content: center;
  transition: transform .15s, background .2s;
}
.mas-theme:active { transform: scale(.9); background: rgba(255,255,255,.26); }

.mas-body { flex: 1; padding: 22px 22px calc(24px + env(safe-area-inset-bottom)); }
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
