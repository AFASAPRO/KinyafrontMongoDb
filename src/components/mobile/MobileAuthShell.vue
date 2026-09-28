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
/* Curved brand header (layout of the reference login, KinyaBot colours) */
.mas-hd {
  position: relative; flex-shrink: 0;
  padding: max(28px, calc(env(safe-area-inset-top) + 16px)) 26px 54px;
  background: var(--accent); color: #fff;
  border-bottom-left-radius: 62% 64px;
  border-bottom-right-radius: 8% 18px;
  animation: masDrop .5s cubic-bezier(.22,1,.36,1) both;
}
.mas-hd::before {
  content: ''; position: absolute; right: -40px; top: -50px;
  width: 190px; height: 190px; border-radius: 50%;
  background: rgba(255,255,255,.10); pointer-events: none;
}
.mas-brand { display: flex; align-items: center; gap: 10px; margin-top: 14px; position: relative; }
.mas-brand img { width: 38px; height: 38px; border-radius: 11px; object-fit: contain; background: rgba(255,255,255,.16); padding: 3px; }
.mas-brand span { font-size: 26px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
.mas-sub { margin-top: 8px; font-size: 13px; opacity: .82; position: relative; }
.mas-theme {
  position: absolute; top: max(14px, env(safe-area-inset-top)); right: 16px; z-index: 2;
  width: 38px; height: 38px; border-radius: 50%;
  background: rgba(255,255,255,.18); color: #fff; font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: transform .15s, background .2s;
}
.mas-theme:active { transform: scale(.9); }

.mas-body { flex: 1; padding: 22px 26px calc(28px + env(safe-area-inset-bottom)); animation: fadeUp .5s .1s ease both; }
.mas-title { font-size: 26px; font-weight: 700; margin-bottom: 18px; color: var(--text-1); }

@keyframes masDrop { from { opacity: 0; transform: translateY(-16px); } to { opacity: 1; transform: none; } }
</style>
