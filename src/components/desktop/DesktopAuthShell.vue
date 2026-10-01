<template>
  <div class="das">
    <header class="das-nav">
      <button class="das-brand" type="button" @click="$router.push('/landing')">
        <img src="/logo.png" alt="KinyaBot" />
        <span>Kinya<b>Bot</b></span>
      </button>

      <nav class="das-links">
        <router-link :to="{ path: '/landing' }">Overview</router-link>
        <router-link :to="{ path: '/landing', hash: '#pricing' }">Pricing</router-link>
        <router-link :to="{ path: '/landing', hash: '#footer' }">Privacy and terms</router-link>
        <router-link :to="{ path: '/landing', hash: '#faq' }">FAQ</router-link>
      </nav>

      <button class="das-theme" type="button" @click="toggleThemeMode"
        :aria-label="isLightMode ? 'Switch to dark mode' : 'Switch to light mode'"
        :title="isLightMode ? 'Switch to dark mode' : 'Switch to light mode'">
        <i :class="isLightMode ? 'fas fa-moon' : 'fas fa-sun'"></i>
      </button>
    </header>

    <main class="das-body">
      <div class="das-left"><div class="das-left-inner"><slot /></div></div>
      <div class="das-right">
        <div class="das-panel">
          <img src="/auth-hero.png" alt="KinyaBot AI running on desktop" loading="eager" />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { isLightMode, toggleThemeMode } from '../../theme'
</script>

<style scoped>
.das { min-height: 100vh; min-height: 100dvh; width: 100%; background: var(--bg-base); display: flex; flex-direction: column; }

/* ── Top nav ─────────────────────────────────────────────── */
.das-nav {
  flex-shrink: 0; height: 72px; padding: 0 2.5rem;
  display: flex; align-items: center; justify-content: space-between; gap: 18px;
  border-bottom: 1px solid var(--border);
}
.das-brand { display: flex; align-items: center; gap: 9px; background: none; }
.das-brand img { width: 30px; height: 30px; object-fit: contain; }
.das-brand span { font-size: 16px; font-weight: 500; color: var(--text-1); letter-spacing: .01em; }
.das-brand span b { font-weight: 800; }

.das-links {
  display: flex; align-items: center; gap: 2px;
  background: var(--bg-card); border: 1px solid var(--border-md);
  border-radius: 99px; padding: 5px;
}
.das-links a {
  padding: 8px 16px; border-radius: 99px; font-size: 13.5px; font-weight: 500;
  color: var(--text-2); transition: background .2s, color .2s;
}
.das-links a:hover { color: var(--text-1); background: var(--bg-hover); }

.das-theme {
  width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
  background: var(--bg-card); border: 1px solid var(--border-md);
  color: var(--text-1); font-size: 14px;
  display: flex; align-items: center; justify-content: center;
  transition: transform .15s, background .2s;
}
.das-theme:hover { background: var(--bg-hover); }
.das-theme:active { transform: scale(.9); }

/* ── Body split ──────────────────────────────────────────── */
.das-body { flex: 1; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); min-height: 0; }
.das-left { overflow-y: auto; display: flex; padding: 3rem clamp(2.5rem, 6vw, 6rem); }
.das-left-inner { margin: auto; width: 100%; max-width: 420px; animation: fadeUp .45s ease both; }

.das-right { padding: 20px 20px 20px 0; display: flex; }
.das-panel {
  flex: 1; border-radius: 22px; overflow: hidden; position: relative;
  background: #0b1020; border: 1px solid var(--border);
  box-shadow: 0 24px 70px rgba(0,0,0,.18);
}
.das-panel img { width: 100%; height: 100%; object-fit: cover; object-position: left center; display: block; }

@media (max-width: 1180px) {
  .das-body { grid-template-columns: 1fr; }
  .das-right { display: none; }
  .das-left { padding: 2.5rem 2rem; }
}
@media (max-width: 640px) {
  .das-nav { padding: 0 1.25rem; }
  .das-links { display: none; }
}
</style>
