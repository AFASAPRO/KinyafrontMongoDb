<template>
  <teleport to="body">
    <div class="gate-overlay" @click.self="$emit('close')">
      <div class="gate-card" role="dialog" aria-modal="true" aria-label="Sign in to continue">
        <button class="gate-x" @click="$emit('close')" aria-label="Close">
          <i class="fas fa-xmark"></i>
        </button>

        <div class="gate-logo">
          <img src="/logo.png" alt="KinyaBot" />
        </div>

        <h2 class="gate-title">Sign in to continue chatting</h2>
        <p class="gate-sub">
          Create a free account to chat with KinyaBot, keep your conversation
          history and pick up right where you left off.
        </p>

        <div class="gate-actions">
          <button class="gbtn solid" @click="go('/login')">
            <i class="fas fa-right-to-bracket"></i> Sign In
          </button>
          <button class="gbtn outline" @click="go('/register')">
            <i class="fas fa-user-plus"></i> Create Account
          </button>
        </div>

        <button class="gate-later" @click="$emit('close')">Maybe later</button>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const emit = defineEmits(['close'])

const router = useRouter()

function go(path) {
  router.push(`${path}?redirect=/`)
}

function onKey(e) { if (e.key === 'Escape') emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
</script>

<style scoped>
.gate-overlay {
  position: fixed; inset: 0; z-index: 999;
  background: rgba(0,0,0,.65); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  animation: fadeIn .2s ease;
}
.gate-card {
  position: relative;
  width: min(400px, 100%);
  background: var(--bg-card);
  border: 1px solid var(--border-md);
  border-radius: 22px;
  padding: 2rem 1.75rem 1.5rem;
  text-align: center;
  box-shadow: 0 30px 80px rgba(0,0,0,.55), 0 0 60px rgba(109,40,217,.12);
  animation: fadeUp .28s cubic-bezier(.34,1.4,.64,1);
  max-height: 90dvh; overflow-y: auto;
}
.gate-x {
  position: absolute; top: 14px; right: 14px;
  width: 32px; height: 32px; border-radius: 50%;
  background: none; border: none; color: var(--text-3);
  font-size: 15px; cursor: pointer; transition: all .2s;
}
.gate-x:hover { background: var(--bg-hover); color: var(--text-1); }

.gate-logo {
  width: 58px; height: 58px; margin: 0 auto 1rem;
  border-radius: 15px; overflow: hidden;
  box-shadow: 0 0 30px rgba(109,40,217,.35);
}
.gate-logo img { width: 100%; height: 100%; object-fit: contain; }

.gate-title { font-size: 1.2rem; font-weight: 700; color: #fff; margin-bottom: .4rem; }
.gate-sub { font-size: 13px; color: var(--text-2); line-height: 1.65; margin-bottom: 1.1rem; }

.gate-actions { display: flex; flex-direction: column; gap: 9px; margin-bottom: .9rem; }
.gbtn {
  display: flex; align-items: center; justify-content: center; gap: 9px;
  width: 100%; padding: 11px; border-radius: 12px;
  font-size: 13.5px; font-weight: 600; cursor: pointer; transition: all .2s;
}
.gbtn.solid {
  background: var(--accent); border: 1px solid transparent; color: #fff;
  box-shadow: 0 4px 16px rgba(109,40,217,.35);
}
.gbtn.solid:hover { filter: brightness(1.12); transform: translateY(-1px); }
.gbtn.outline {
  background: transparent; border: 1px solid var(--border-md); color: var(--text-1);
}
.gbtn.outline:hover { background: var(--bg-hover); border-color: rgba(109,40,217,.4); }

.gate-later {
  background: none; border: none; color: var(--text-3);
  font-size: 12.5px; cursor: pointer; padding: 4px 10px;
  transition: color .2s;
}
.gate-later:hover { color: var(--text-2); text-decoration: underline; }

/* Light mode */
:global(html.light-mode) .gate-title { color: #1a1a2e; }
</style>
