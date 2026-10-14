<template>
  <div class="auth-video-panel">
    <video
      v-if="!mediaFailed"
      ref="videoRef"
      class="auth-video"
      :src="videoUrl"
      autoplay
      muted
      loop
      playsinline
      preload="auto"
      aria-label="KinyaBot mascot animation"
      @canplay="playVideo"
      @playing="playbackBlocked = false"
      @error="showFallback"
    ></video>

    <div v-else class="auth-video-fallback" role="img" aria-label="KinyaBot, your AI companion">
      <span class="fallback-orbit orbit-one" aria-hidden="true"></span>
      <span class="fallback-orbit orbit-two" aria-hidden="true"></span>
      <img src="/logo.png" alt="" />
      <span class="fallback-caption">Your AI companion, always ready.</span>
    </div>

    <button v-if="playbackBlocked && !mediaFailed" class="auth-video-play" type="button" @click="playVideo">
      <i class="fas fa-play" aria-hidden="true"></i>
      Play animation
    </button>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'

const videoUrl = '/media/kinya-mascot-auth.mp4'
const videoRef = ref(null)
const mediaFailed = ref(false)
const playbackBlocked = ref(false)

async function playVideo() {
  const video = videoRef.value
  if (!video || mediaFailed.value) return
  video.muted = true
  try {
    await video.play()
    playbackBlocked.value = false
  } catch {
    playbackBlocked.value = true
  }
}

function showFallback() {
  mediaFailed.value = true
  playbackBlocked.value = false
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    showFallback()
    return
  }
  playVideo()
})
</script>

<style scoped>
.auth-video-panel {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #efe4d1;
}
.auth-video {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center;
}
.auth-video-fallback {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 20px;
  overflow: hidden;
  background: radial-gradient(ellipse at 50% 42%, #fffaf1 0, #efe4d1 62%, #e7d7bd 100%);
  color: #312e2a;
}
.auth-video-fallback img {
  z-index: 1;
  width: clamp(112px, 18vw, 220px);
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 18px 28px rgba(70, 49, 22, .2));
  animation: mascot-float 4s ease-in-out infinite;
}
.fallback-orbit {
  position: absolute;
  width: min(58vw, 540px);
  aspect-ratio: 1;
  border: 1px solid rgba(99, 102, 241, .15);
  border-radius: 50%;
  animation: orbit-breathe 7s ease-in-out infinite;
}
.orbit-two {
  width: min(42vw, 390px);
  border-color: rgba(139, 92, 246, .18);
  animation-delay: -3.5s;
}
.fallback-caption {
  z-index: 1;
  max-width: 80%;
  font-size: clamp(14px, 1.4vw, 19px);
  font-weight: 700;
  text-align: center;
  letter-spacing: .01em;
}
.auth-video-play {
  position: absolute;
  left: 50%;
  bottom: 28px;
  transform: translateX(-50%);
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid rgba(255, 255, 255, .28);
  border-radius: 99px;
  background: rgba(15, 23, 42, .8);
  color: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.auth-video-play:hover { background: #111827; }
@keyframes mascot-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }
@keyframes orbit-breathe { 0%,100% { transform: scale(.96); opacity: .55; } 50% { transform: scale(1.04); opacity: 1; } }
@media(prefers-reduced-motion:reduce) {
  .auth-video-fallback img,.fallback-orbit { animation:none; }
}
</style>
