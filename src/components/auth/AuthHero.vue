<template>
  <section class="hero" aria-label="About KinyaBot">
    <span class="hero-glow hero-glow-a" aria-hidden="true"></span>
    <span class="hero-glow hero-glow-b" aria-hidden="true"></span>

    <div class="hero-top">
      <div class="hero-copy">
        <span class="hero-badge"><i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i>Your AI Companion</span>
        <h2 class="hero-title">Your AI,<br /><span class="hero-title-accent">Always Ready.</span></h2>
        <p class="hero-desc">
          Powered by advanced AI to answer anything, generate code, images, and more — in English and beyond.
        </p>

        <ul class="hero-stats">
          <li v-for="s in stats" :key="s.label">
            <span class="hero-stat-icon" aria-hidden="true"><i :class="s.icon"></i></span>
            <span class="hero-stat-text">
              <strong>{{ s.value }}</strong>
              <span>{{ s.label }}</span>
            </span>
          </li>
        </ul>
      </div>

      <div class="hero-visual">
        <picture>
          <source srcset="/kinyabot-hero.webp" type="image/webp" />
          <img
            src="/kinyabot-hero.png"
            width="1200" height="737"
            alt="KinyaBot, the friendly AI robot, waving hello"
            decoding="async"
            fetchpriority="high"
          />
        </picture>
      </div>
    </div>

    <ul class="hero-cards">
      <li v-for="c in cards" :key="c.title" class="hero-card">
        <span class="hero-card-icon" :style="{ background: c.color }" aria-hidden="true"><i :class="c.icon"></i></span>
        <h3>{{ c.title }}</h3>
        <p>{{ c.text }}</p>
        <span class="hero-card-go" aria-hidden="true"><i class="fas fa-chevron-right"></i></span>
      </li>
    </ul>

    <div class="hero-banner">
      <i class="fas fa-bolt hero-banner-icon" aria-hidden="true"></i>
      <p class="hero-banner-text">Unlock your creativity, productivity and learning — all in one place.</p>
      <p class="hero-banner-note" aria-hidden="true">
        <span>Let's build something amazing!</span>
        <svg viewBox="0 0 220 12" preserveAspectRatio="none"><path d="M2 8 C 40 2, 90 11, 140 5 S 200 4, 218 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" /></svg>
      </p>
      <i class="fas fa-arrow-right hero-banner-arrow" aria-hidden="true"></i>
    </div>
  </section>
</template>

<script setup>
/* Marketing copy lives here so it is trivial to edit.
   NOTE: the three stat values are static display text — update them
   to your real numbers (or feed them from an API) before launch. */
const stats = [
  { icon: 'fas fa-users',   value: '10K+',  label: 'Users' },
  { icon: 'fas fa-message', value: '1M+',   label: 'Messages' },
  { icon: 'fas fa-bolt',    value: '99.9%', label: 'Uptime' },
]

const cards = [
  { icon: 'fas fa-comment-dots', color: '#6366F1', title: 'Chat & Ask',          text: 'Get instant answers, explain concepts, and explore ideas.' },
  { icon: 'fas fa-image',        color: '#4F46E5', title: 'Generate Images',     text: 'Create stunning images from your ideas.' },
  { icon: 'fas fa-code',         color: '#0891B2', title: 'Write & Debug Code',  text: 'Build, fix and learn with AI assistance.' },
  { icon: 'fas fa-microphone',   color: '#8B5CF6', title: 'Voice & Translate',   text: 'Talk to AI, get speech-to-text, translate and more.' },
]
</script>

<style scoped>
.hero {
  position: relative;
  min-height: 100%;
  display: flex; flex-direction: column; justify-content: center;
  gap: clamp(1rem, 2.4vh, 1.75rem);
  max-width: 1320px; margin: 0 auto;
  padding: clamp(1.5rem, 3.2vw, 3.25rem);
  padding-top: clamp(3.5rem, 6vh, 4.5rem); /* room for the settings button */
}

/* soft coloured glows (solid colour + blur — no gradients) */
.hero-glow { position: absolute; border-radius: 50%; filter: blur(110px); pointer-events: none; z-index: 0; }
.hero-glow-a { width: 520px; height: 520px; right: -60px; top: 0; background: rgba(99, 102, 241, .16); }
.hero-glow-b { width: 380px; height: 380px; left: 8%; bottom: 8%; background: rgba(34, 211, 238, .07); }
:global(.au-root.light) .hero-glow-a { background: rgba(99, 102, 241, .12); }

.hero > * { position: relative; z-index: 1; }
.hero > .hero-glow { position: absolute; }

/* ── Top: copy + robot ─────────────────────────────── */
.hero-top { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.08fr); align-items: center; gap: 1.5rem; }

.hero-badge {
  display: inline-flex; align-items: center; gap: .5rem;
  padding: .38rem .85rem; border-radius: 99px;
  font-size: .8rem; font-weight: 600;
  color: var(--au-text);
  background: var(--au-tint);
  border: 1px solid color-mix(in srgb, var(--au-accent) 40%, transparent);
}
.hero-badge i { color: var(--au-accent); font-size: .75rem; }

.hero-title {
  margin: 1.25rem 0 1rem;
  font-size: clamp(2.2rem, 3.6vw, 4.1rem);
  line-height: 1.04; font-weight: 800; letter-spacing: -.025em;
  color: var(--au-text);
}
.hero-title-accent {
  display: inline-block; padding-bottom: .08em; white-space: nowrap;
  background-image: linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
}
.hero-desc { max-width: 30rem; margin: 0 0 1.75rem; font-size: 1.02rem; line-height: 1.65; color: var(--au-muted); }

.hero-stats { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: nowrap; }
.hero-stats li { display: flex; align-items: center; gap: .6rem; padding-right: clamp(.6rem, 1.5vw, 1.5rem); }
.hero-stats li + li { padding-left: clamp(.6rem, 1.5vw, 1.5rem); border-left: 1px solid var(--au-divider); }
.hero-stat-icon { color: var(--au-accent); font-size: 1.25rem; width: 24px; text-align: center; flex-shrink: 0; }
.hero-stat-text { display: flex; flex-direction: column; line-height: 1.2; white-space: nowrap; }
.hero-stat-text strong { font-size: clamp(1.05rem, 1.6vw, 1.3rem); font-weight: 800; color: var(--au-text); }
.hero-stat-text span { font-size: .82rem; color: var(--au-muted); }

.hero-visual { display: flex; justify-content: center; }
.hero-visual img {
  display: block; width: 100%; max-width: 660px; height: auto;
  filter: drop-shadow(0 24px 44px rgba(99, 102, 241, .25));
  animation: hero-float 7s ease-in-out infinite;
}
@keyframes hero-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }

/* ── Feature cards ─────────────────────────────────── */
.hero-cards { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1rem; }
.hero-card {
  position: relative; min-height: 158px;
  padding: 1.15rem 1.15rem 1.25rem;
  background: var(--au-card); border: 1px solid var(--au-card-border); border-radius: 16px;
  transition: transform .2s ease, border-color .2s ease;
}
.hero-card:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--au-accent) 55%, var(--au-card-border)); }
.hero-card-icon { width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center; color: #fff; font-size: 1.1rem; }
.hero-card h3 { margin: .95rem 0 .35rem; font-size: 1.02rem; font-weight: 700; color: var(--au-text); }
.hero-card p { margin: 0; max-width: 88%; font-size: .82rem; line-height: 1.5; color: var(--au-muted); }
.hero-card-go {
  position: absolute; right: .95rem; bottom: .95rem;
  width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center;
  font-size: .68rem; color: var(--au-text); background: var(--au-chip);
}

/* ── Banner ────────────────────────────────────────── */
.hero-banner {
  display: flex; align-items: center; gap: 1rem;
  padding: 1.05rem 1.5rem; border-radius: 16px;
  background: var(--au-banner); border: 1px solid var(--au-card-border);
}
.hero-banner-icon { color: var(--au-accent); font-size: 1.25rem; }
.hero-banner-text { flex: 1; margin: 0; font-size: .95rem; color: var(--au-text); }
.hero-banner-note {
  position: relative; margin: 0; padding-bottom: 6px;
  font-family: 'Caveat', 'Segoe Script', 'Bradley Hand', cursive;
  font-size: 1.3rem; color: var(--au-text); transform: rotate(-2.5deg); white-space: nowrap;
}
.hero-banner-note svg { position: absolute; left: 8%; right: 0; bottom: 0; width: 84%; height: 8px; color: var(--au-accent); }
.hero-banner-arrow { color: var(--au-accent); }

/* ── Responsive (based on the panel's own width) ───── */
@container au-right (max-width: 1080px) {
  .hero-cards { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hero-card { min-height: 140px; }
  .hero-banner-note { display: none; }
}
@container au-right (max-width: 760px) {
  .hero-top { grid-template-columns: minmax(0, 1fr); }
  .hero-visual { order: -1; }
  .hero-visual img { max-width: 440px; }
}

@media (max-height: 760px) {
  .hero-desc { margin-bottom: 1.1rem; }
  .hero-card { min-height: 130px; }
}
@media (prefers-reduced-motion: reduce) {
  .hero-visual img { animation: none; }
  .hero-card { transition: none; }
}
</style>
