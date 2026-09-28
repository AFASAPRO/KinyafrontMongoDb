<template>
  <div class="au-root" :class="{ light: isLightMode }">
    <!-- Settings (appearance) — top-right, as in the design -->
    <div class="au-settings" ref="settingsRef">
      <button
        ref="gearRef"
        type="button"
        class="au-gear"
        aria-haspopup="true"
        :aria-expanded="menuOpen"
        aria-controls="au-appearance-menu"
        aria-label="Appearance settings"
        @click="menuOpen = !menuOpen"
      >
        <i class="fas fa-gear" aria-hidden="true"></i>
      </button>

      <transition name="au-pop">
        <div v-if="menuOpen" id="au-appearance-menu" class="au-menu" role="group" aria-label="Appearance">
          <p class="au-menu-title">Appearance</p>
          <button
            v-for="m in modes" :key="m.id"
            type="button"
            class="au-menu-item"
            :class="{ 'is-active': themeMode === m.id }"
            role="radio"
            :aria-checked="themeMode === m.id"
            @click="pick(m.id)"
          >
            <i :class="m.icon" aria-hidden="true"></i>
            <span>{{ m.label }}</span>
            <i v-if="themeMode === m.id" class="fas fa-check au-menu-check" aria-hidden="true"></i>
          </button>
        </div>
      </transition>
    </div>

    <main class="au-left">
      <router-link to="/" class="au-brand" aria-label="KinyaBot home">
        <img src="/logo.png" alt="" />
        <span>KinyaBot</span>
      </router-link>

      <div class="au-form">
        <slot />
      </div>

      <div v-if="$slots.footer" class="au-foot"><slot name="footer" /></div>
    </main>

    <aside class="au-right">
      <AuthHero />
    </aside>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import AuthHero from './AuthHero.vue'
import { isLightMode, themeMode, setThemeMode } from '../../theme'
import '../../assets/auth.css'

const modes = [
  { id: 'dark',   icon: 'fas fa-moon',    label: 'Dark' },
  { id: 'light',  icon: 'fas fa-sun',     label: 'Light' },
  { id: 'system', icon: 'fas fa-desktop', label: 'System' },
]

const menuOpen = ref(false)
const settingsRef = ref(null)
const gearRef = ref(null)

function pick(id) {
  // Same shared store the rest of the app uses — the choice follows the
  // user into register, onboarding and chat.
  setThemeMode(id)
  menuOpen.value = false
  gearRef.value?.focus()
}

function onPointerDown(e) {
  if (menuOpen.value && settingsRef.value && !settingsRef.value.contains(e.target)) menuOpen.value = false
}
function onKey(e) {
  if (e.key === 'Escape' && menuOpen.value) { menuOpen.value = false; gearRef.value?.focus() }
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown)
  document.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.au-settings { position: fixed; top: max(16px, env(safe-area-inset-top)); right: 16px; z-index: 50; }
.au-gear {
  width: 42px; height: 42px; border-radius: 50%;
  display: grid; place-items: center;
  font-size: 1rem; color: var(--au-text); cursor: pointer;
  background: var(--au-card); border: 1px solid var(--au-card-border);
  transition: background .18s, transform .18s, border-color .18s;
}
.au-gear:hover { border-color: var(--au-accent); }
.au-gear[aria-expanded='true'] { border-color: var(--au-accent); }
.au-gear[aria-expanded='true'] i { transform: rotate(60deg); }
.au-gear i { transition: transform .25s ease; }

.au-menu {
  position: absolute; top: calc(100% + 8px); right: 0; width: 200px; padding: .4rem;
  background: var(--au-card); border: 1px solid var(--au-card-border); border-radius: 14px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, .35);
  transform-origin: top right;
}
.au-menu-title { margin: .35rem .6rem .45rem; font-size: .68rem; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: var(--au-faint); }
.au-menu-item {
  display: flex; align-items: center; gap: .7rem; width: 100%;
  padding: .55rem .6rem; border: 0; border-radius: 9px;
  background: transparent; color: var(--au-muted);
  font: inherit; font-size: .88rem; font-weight: 600; text-align: left; cursor: pointer;
  transition: background .15s, color .15s;
}
.au-menu-item i:first-child { width: 16px; text-align: center; }
.au-menu-item:hover { background: var(--au-tint); color: var(--au-text); }
.au-menu-item.is-active { color: var(--au-text); background: var(--au-tint); }
.au-menu-check { margin-left: auto; font-size: .72rem; color: var(--au-accent); }

.au-pop-enter-active, .au-pop-leave-active { transition: opacity .15s ease, transform .15s ease; }
.au-pop-enter-from, .au-pop-leave-to { opacity: 0; transform: translateY(-6px) scale(.97); }
</style>
