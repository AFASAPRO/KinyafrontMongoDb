<template>
  <!-- Inline install button (variant: button) -->
  <button v-if="variant === 'button'" class="ih-btn" :class="{ compact }" @click="handleInstall">
    <i class="fas fa-download"></i>
    <span>{{ label }}</span>
  </button>

  <!-- Sidebar footer item (variant: footer) — styled to match Sidebar.vue footer items -->
  <button v-else-if="variant === 'footer'" class="footer-item ih-footer" @click="handleInstall">
    <i class="fas fa-mobile-screen-button"></i><span>{{ label }}</span>
  </button>

  <!-- Floating banner (variant: banner) -->
  <transition name="ih-slide">
    <div v-if="variant === 'banner' && showBanner" class="ih-banner">
      <img src="/logo.png" alt="KinyaBot" class="ih-logo" />
      <div class="ih-text">
        <strong>Install KinyaBot</strong>
        <span>Add to your home screen for a faster, full-screen experience.</span>
      </div>
      <button class="ih-install" @click="handleInstall">Install</button>
      <button class="ih-dismiss" aria-label="Dismiss" @click="dismiss">
        <i class="fas fa-xmark"></i>
      </button>
    </div>
  </transition>

  <!-- Instructions modal (iOS / unsupported / fallback) -->
  <teleport to="body">
    <transition name="ih-fade">
      <div v-if="showModal" class="ih-overlay" @click.self="showModal = false">
        <div class="ih-modal" role="dialog" aria-modal="true" aria-label="Install app">
          <button class="ih-close" @click="showModal = false" aria-label="Close">
            <i class="fas fa-xmark"></i>
          </button>
          <img :src="icon" alt="" class="ih-modal-icon" />
          <h3>{{ title }}</h3>

          <template v-if="modalMode === 'ios'">
            <p class="ih-lead">Install {{ appName }} on your {{ isIOSDevice ? 'iPhone / iPad' : 'device' }}:</p>
            <ol class="ih-steps">
              <li><i class="fas fa-up-right-from-square"></i> Tap the <strong>Share</strong> button in Safari's toolbar</li>
              <li><i class="fas fa-square-plus"></i> Scroll and tap <strong>Add to Home Screen</strong></li>
              <li><i class="fas fa-check"></i> Tap <strong>Add</strong> — the app appears on your home screen</li>
            </ol>
          </template>

          <template v-else-if="modalMode === 'manual'">
            <p class="ih-lead">Your browser can install {{ appName }} from its menu:</p>
            <ol class="ih-steps">
              <li><i class="fas fa-ellipsis"></i> Open the browser <strong>menu</strong> (⋮ or ⋯)</li>
              <li><i class="fas fa-mobile-screen"></i> Look for <strong>“Install app”</strong> / <strong>“Add to Home screen”</strong></li>
              <li><i class="fas fa-check"></i> Confirm — the app is added to your device</li>
            </ol>
          </template>

          <template v-else>
            <p class="ih-lead">{{ appName }} is now installed on your device. Find it on your home screen or app drawer.</p>
          </template>

          <button class="ih-done" @click="showModal = false">Got it</button>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { usePwaInstall } from '../composables/usePwaInstall'

const props = defineProps({
  variant: { type: String, default: 'button' }, // button | footer | banner
  label: { type: String, default: 'Install App' },
  appName: { type: String, default: 'KinyaBot' },
  icon: { type: String, default: '/icon-192.png' },
  compact: { type: Boolean, default: false },
  hideWhenInstalled: { type: Boolean, default: true }
})

const { canInstall, installed, isIOS, promptInstall } = usePwaInstall()

const showModal = ref(false)
const modalMode = ref('manual') // ios | manual | done
const dismissed = ref(localStorage.getItem('kb_install_dismissed') === '1')
const isIOSDevice = ref(isIOS)

const title = computed(() =>
  modalMode.value === 'ios' ? `Add ${props.appName} to Home Screen`
  : modalMode.value === 'done' ? 'App Installed'
  : `Install ${props.appName}`
)

const showBanner = computed(() =>
  !installed.value && !dismissed.value && (canInstall.value || isIOS)
)

function handleInstall() {
  if (installed.value) {
    modalMode.value = 'done'
    showModal.value = true
    return
  }
  if (canInstall.value) {
    promptInstall().then((outcome) => {
      if (outcome === 'accepted') {
        modalMode.value = 'done'
        showModal.value = true
      } else if (outcome === 'error' || outcome === 'unavailable') {
        // Native prompt unusable → manual instructions
        modalMode.value = isIOS ? 'ios' : 'manual'
        showModal.value = true
      }
    })
    return
  }
  // iOS Safari & unsupported browsers → manual instructions
  modalMode.value = isIOS ? 'ios' : 'manual'
  showModal.value = true
}

function dismiss() {
  dismissed.value = true
  localStorage.setItem('kb_install_dismissed', '1')
}
</script>

<style scoped>
.ih-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 10px 18px; border-radius: 10px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  border: 1px solid rgba(99, 102, 241, .4); color: #fff;
  font-size: 13.5px; font-weight: 600; cursor: pointer; transition: all .2s;
  font-family: inherit;
}
.ih-btn.compact { padding: 7px 13px; font-size: 12.5px; }
.ih-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(79, 70, 229, .4); }

/* Footer variant — mirrors the sidebar's .footer-item look (uses theme vars) */
.ih-footer {
  display: flex; align-items: center; gap: 10px;
  width: 100%; padding: 8px 10px;
  background: none; border: none; border-radius: var(--r-sm, 8px);
  color: var(--text-2, #9aa0a6); font-size: 13px;
  cursor: pointer; transition: all .2s; text-align: left;
  font-family: inherit;
}
.ih-footer:hover { background: var(--bg-hover, #2a2b2d); color: var(--text-1, #e3e3e3); }
.ih-footer i { font-size: 14px; width: 18px; text-align: center; }

/* Banner */
.ih-banner {
  position: fixed; left: 12px; right: 12px; bottom: calc(12px + var(--kb, 0px));
  z-index: 950;
  display: flex; align-items: center; gap: 11px;
  background: rgba(24, 24, 32, .97); backdrop-filter: blur(14px);
  border: 1px solid rgba(99, 102, 241, .35); border-radius: 16px;
  padding: 12px 13px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, .55), 0 0 0 1px rgba(0,0,0,.2);
  animation: ih-pop .4s cubic-bezier(.34, 1.56, .64, 1);
}
@keyframes ih-pop { from { opacity: 0; transform: translateY(16px) scale(.97); } to { opacity: 1; transform: none; } }
.ih-logo { width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0; }
.ih-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ih-text strong { font-size: 13.5px; color: #fff; }
.ih-text span { font-size: 11.5px; color: #9ca3af; line-height: 1.4; }
.ih-install {
  flex-shrink: 0; padding: 8px 15px; border-radius: 9px; border: none;
  background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
}
.ih-dismiss {
  flex-shrink: 0; width: 28px; height: 28px; border-radius: 8px;
  background: none; border: none; color: #6b7280; font-size: 13px; cursor: pointer;
}
.ih-dismiss:hover { background: rgba(255, 255, 255, .08); color: #fff; }

/* Modal */
.ih-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0, 0, 0, .65); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.ih-modal {
  position: relative; width: min(380px, 100%);
  background: #17171c; border: 1px solid rgba(99, 102, 241, .3);
  border-radius: 20px; padding: 26px 22px 20px; text-align: center;
  box-shadow: 0 24px 70px rgba(0, 0, 0, .6);
  animation: ih-pop .3s cubic-bezier(.34, 1.56, .64, 1);
  max-height: 86vh; overflow-y: auto;
}
.ih-close {
  position: absolute; top: 12px; right: 12px; width: 32px; height: 32px;
  border-radius: 9px; background: rgba(255, 255, 255, .06); border: none;
  color: #9ca3af; font-size: 14px; cursor: pointer;
}
.ih-close:hover { background: rgba(255, 255, 255, .12); color: #fff; }
.ih-modal-icon { width: 62px; height: 62px; border-radius: 15px; margin-bottom: 10px; }
.ih-modal h3 { font-size: 16.5px; font-weight: 700; color: #fff; margin-bottom: 8px; }
.ih-lead { font-size: 13px; color: #9ca3af; line-height: 1.6; margin-bottom: 14px; }
.ih-steps { list-style: none; text-align: left; display: flex; flex-direction: column; gap: 10px; margin-bottom: 18px; counter-reset: step; }
.ih-steps li {
  display: flex; align-items: center; gap: 11px;
  background: rgba(255, 255, 255, .04); border: 1px solid rgba(255, 255, 255, .07);
  border-radius: 11px; padding: 11px 13px;
  font-size: 13px; color: #d1d5db; line-height: 1.45;
}
.ih-steps li i { color: #818cf8; font-size: 14px; width: 18px; text-align: center; flex-shrink: 0; }
.ih-done {
  width: 100%; padding: 11px; border-radius: 11px; border: none;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit;
}

/* Transitions */
.ih-slide-enter-active, .ih-slide-leave-active { transition: all .35s cubic-bezier(.34, 1.56, .64, 1); }
.ih-slide-enter-from, .ih-slide-leave-to { opacity: 0; transform: translateY(30px); }
.ih-fade-enter-active, .ih-fade-leave-active { transition: opacity .22s ease; }
.ih-fade-enter-from, .ih-fade-leave-to { opacity: 0; }

@media (max-width: 380px) {
  .ih-text span { display: none; }
}
</style>
