<template>
  <div class="gs-root">
    <button class="gs-theme" type="button" @click="toggleThemeMode"
      :aria-label="isLightMode ? 'Switch to dark mode' : 'Switch to light mode'">
      <i :class="isLightMode ? 'fas fa-moon' : 'fas fa-sun'"></i>
    </button>

    <div class="gs-art">
      <span class="gs-ring g1"></span>
      <span class="gs-ring g2"></span>
      <div class="gs-mark"><i class="fas fa-sparkles"></i></div>
    </div>

    <div class="gs-copy">
      <h1 class="gs-title">Chat smarter <em>with AI.</em></h1>
      <p class="gs-sub">Write, learn, brainstorm and<br />get things done — all in one chat.</p>
    </div>

    <button class="gs-btn" type="button" @click="begin">
      Get Started <i class="fas fa-arrow-right"></i>
    </button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { isLightMode, toggleThemeMode } from '../theme'
import { markIntroSeen } from '../composables/useIsMobile'

const router = useRouter()

function begin() {
  markIntroSeen()
  router.push('/login')
}
</script>
