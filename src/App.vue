<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>

  <!-- ── Offline Popup ── -->
  <transition name="offline-pop">
    <div v-if="isOffline" class="offline-popup">
      <div class="op-card">
        <div class="op-icon">
          <i class="fas fa-wifi" style="position:relative">
            <span class="wifi-slash"></span>
          </i>
        </div>
        <div class="op-content">
          <div class="op-title">No Internet Connection</div>
          <div class="op-sub">KinyaBot needs an internet connection to work. Please check your network and try again.</div>
        </div>
        <div class="op-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  </transition>

  <!-- ── Reconnected toast ── -->
  <transition name="toast-slide">
    <div v-if="showReconnected" class="reconnected-toast">
      <i class="fas fa-circle-check"></i>
      <span>Back online! Connection restored.</span>
    </div>
  </transition>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { connectSocket, disconnectSocket } from './socket'
import api from './api'

const auth = useAuthStore()
const route = useRoute()
const isOffline = ref(!navigator.onLine)
const showReconnected = ref(false)
let wasOffline = false

function applyThemeMode(mode) {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = mode === 'dark' || (mode === 'system' && prefersDark)
  document.documentElement.classList.toggle('light-mode', !isDark)
}

function handleOffline() {
  isOffline.value = true
  wasOffline = true
}

function handleOnline() {
  isOffline.value = false
  if (wasOffline) {
    wasOffline = false
    showReconnected.value = true
    setTimeout(() => { showReconnected.value = false }, 3500)
  }
}

// Page tracking
let sessionId = sessionStorage.getItem('kb_session')
if (!sessionId) {
  sessionId = Math.random().toString(36).slice(2) + Date.now().toString(36)
  sessionStorage.setItem('kb_session', sessionId)
}
async function trackPage(page) {
  try { await api.post('/track', { session_id: sessionId, page }) } catch {}
}

onMounted(async () => {
  window.addEventListener('offline', handleOffline)
  window.addEventListener('online', handleOnline)

  if (auth.isLoggedIn) {
    try { await auth.fetchProfile() } catch {}
    connectSocket(auth.token)
  }

  const accent = localStorage.getItem('kb_accent') || 'indigo'
  const accentMap = { indigo:'#6366f1', purple:'#a855f7', blue:'#3b82f6', cyan:'#06b6d4', green:'#22c55e' }
  if (accentMap[accent]) document.documentElement.style.setProperty('--accent-solid', accentMap[accent])

  const fs = localStorage.getItem('kb_fs')
  if (fs) document.body.style.fontSize = fs

  const mode = localStorage.getItem('kb_mode') || 'dark'
  applyThemeMode(mode)

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if ((localStorage.getItem('kb_mode') || 'dark') === 'system') applyThemeMode('system')
  })

  trackPage(window.location.pathname)
})

watch(() => route.path, (p) => trackPage(p))
watch(() => auth.isLoggedIn, (loggedIn) => {
  if (loggedIn) connectSocket(auth.token)
  else disconnectSocket()
})

onBeforeUnmount(() => {
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('online', handleOnline)
})
</script>

<style>
/* ── Offline Popup ── */
.offline-popup {
  position: fixed; inset: 0; background: rgba(0,0,0,.75);
  display: flex; align-items: center; justify-content: center;
  z-index: 99999; backdrop-filter: blur(10px);
}
.op-card {
  background: #0f0f1a; border: 1px solid rgba(239,68,68,.3);
  border-radius: 20px; padding: 2rem 2.5rem;
  max-width: 400px; width: 90%;
  display: flex; flex-direction: column; align-items: center; gap: 1rem;
  box-shadow: 0 0 60px rgba(239,68,68,.2), 0 24px 60px rgba(0,0,0,.5);
  animation: offlinePulse 2s ease-in-out infinite;
}
@keyframes offlinePulse {
  0%, 100% { box-shadow: 0 0 40px rgba(239,68,68,.15), 0 24px 60px rgba(0,0,0,.5); }
  50%       { box-shadow: 0 0 60px rgba(239,68,68,.3), 0 24px 60px rgba(0,0,0,.5); }
}
.op-icon {
  width: 72px; height: 72px;
  border-radius: 50%; background: rgba(239,68,68,.12);
  border: 2px solid rgba(239,68,68,.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 1.8rem; color: #f87171; position: relative;
}
.wifi-slash {
  position: absolute; top: 50%; left: 50%;
  transform: translate(-50%,-50%) rotate(-45deg);
  width: 2px; height: 140%; background: #f87171; border-radius: 99px;
}
.op-content { text-align: center; }
.op-title { font-size: 1.1rem; font-weight: 700; color: #fff; margin-bottom: .5rem; }
.op-sub { font-size: 13.5px; color: #9ca3af; line-height: 1.6; }
.op-dots { display: flex; gap: 6px; }
.op-dots span {
  width: 8px; height: 8px; border-radius: 50%; background: rgba(239,68,68,.4);
  animation: dotPulse 1.4s ease-in-out infinite;
}
.op-dots span:nth-child(2) { animation-delay: .2s; }
.op-dots span:nth-child(3) { animation-delay: .4s; }
@keyframes dotPulse { 0%,80%,100%{opacity:.2;transform:scale(.7)} 40%{opacity:1;transform:scale(1)} }

/* ── Reconnected toast ── */
.reconnected-toast {
  position: fixed; bottom: 24px; right: 24px;
  background: #0f1a12; border: 1px solid rgba(52,168,83,.35);
  border-radius: 10px; padding: 12px 18px;
  display: flex; align-items: center; gap: 9px;
  color: #34d399; font-size: 13.5px; font-weight: 500;
  box-shadow: 0 8px 24px rgba(0,0,0,.4);
  z-index: 9999;
}
.toast-slide-enter-active, .toast-slide-leave-active { transition: all .3s ease; }
.toast-slide-enter-from, .toast-slide-leave-to { opacity: 0; transform: translateX(20px); }

.offline-pop-enter-active { animation: fadeUp .4s cubic-bezier(.34,1.56,.64,1); }
.offline-pop-leave-active { transition: all .3s ease; }
.offline-pop-leave-to { opacity: 0; transform: scale(.95); }
</style>
