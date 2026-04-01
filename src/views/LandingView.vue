<template>
  <div class="landing" ref="landingRoot">

    <!-- ══ NAVBAR ════════════════════════════════════════════ -->
    <nav class="nav" :class="{ scrolled: scrollY > 40 }">
      <div class="nav-inner">
        <div class="nav-brand">
          <div class="brand-icon"><img src="/logo.png" alt="KinyaBot"/></div>
          <span class="brand-name">KinyaBot</span>
        </div>
        <div class="nav-links">
          <a @click.prevent="scrollTo('features')">Features</a>
          <a @click.prevent="scrollTo('how')">How it works</a>
          <a @click.prevent="scrollTo('pricing')">Pricing</a>
        </div>
        <div class="nav-actions">
          <router-link to="/login" class="nav-signin">Sign in</router-link>
          <router-link to="/register" class="nav-cta">Get Started</router-link>
        </div>
        <button class="nav-burger" @click="mobileMenu=!mobileMenu" aria-label="Menu">
          <i :class="mobileMenu ? 'fas fa-xmark' : 'fas fa-bars'"></i>
        </button>
      </div>
      <transition name="slide-down">
        <div v-if="mobileMenu" class="mobile-nav">
          <a @click="scrollTo('features');mobileMenu=false"><i class="fas fa-bolt"></i> Features</a>
          <a @click="scrollTo('how');mobileMenu=false"><i class="fas fa-map"></i> How it works</a>
          <a @click="scrollTo('pricing');mobileMenu=false"><i class="fas fa-tag"></i> Pricing</a>
          <router-link to="/login"    class="mob-signin" @click="mobileMenu=false">Sign in</router-link>
          <router-link to="/register" class="mob-cta"    @click="mobileMenu=false"><i class="fas fa-rocket"></i> Get Started Free</router-link>
        </div>
      </transition>
    </nav>

    <!-- ══ HERO ══════════════════════════════════════════════ -->
    <section class="hero">
      <div class="hero-bg">
        <div class="bg-grid"></div>
        <div class="bg-orb bg-orb1"></div>
        <div class="bg-orb bg-orb2"></div>
        <div class="bg-orb bg-orb3"></div>
      </div>

      <div class="hero-inner">
        <div class="hero-badge anim-up" style="animation-delay:.05s">
          <i class="fas fa-bolt"></i>
          <span>From prompt to answer, fast &nbsp;·&nbsp; POWERED BY AFASA</span>
        </div>

        <h1 class="hero-h1 anim-up" style="animation-delay:.15s">
          Chat with AI,<br class="hero-br"/>
          <span class="grad-text">Just Describe It.</span>
        </h1>

        <p class="hero-sub anim-up" style="animation-delay:.25s">
          KinyaBot turns your questions into real answers. Simply describe what you need —
          code, analysis, images, documents and more.
        </p>

        <!-- Prompt box -->
        <div class="prompt-box anim-up" style="animation-delay:.35s">
          <div class="pb-top">
            <input v-model="demoPrompt" type="text" class="pb-input"
              placeholder="A modern portfolio website with dark theme and contact form…"
              @keyup.enter="handleGenerate"/>
          </div>
          <div class="pb-bottom">
            <div class="pb-chips">
              <button class="pb-chip" @click="demoPrompt='Build a Mobile App'">
                <i class="fas fa-plus"></i>
              </button>
              <button class="pb-chip" :class="{active: demoPrompt==='Build a Mobile App'}"
                @click="demoPrompt='Build a Mobile App'">
                <i class="fas fa-mobile-screen"></i>
                <span>Mobile App</span>
              </button>
              <button class="pb-chip" :class="{active: demoPrompt==='Write a landing page'}"
                @click="demoPrompt='Write a landing page'">
                <i class="fas fa-file-code"></i>
                <span>Landing page</span>
              </button>
            </div>
            <button class="pb-gen" @click="handleGenerate">
              <i class="fas fa-arrow-right"></i>
              <span>Generate</span>
            </button>
          </div>
        </div>

        <!-- Trusted marquee -->
        <div class="trust anim-up" style="animation-delay:.5s">
          <span class="trust-label">Trusted by developers using</span>
          <div class="trust-track-wrap">
            <div class="trust-track">
              <div v-for="logo in [...trustLogos, ...trustLogos]" :key="logo.name+Math.random()" class="trust-logo">
                <i :class="logo.icon" :style="{color:logo.color}"></i>
                <span>{{ logo.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ TECH / BUILD SECTION ═══════════════════════════════ -->
    <section class="build-section" ref="buildRef">
      <div class="build-inner">
        <div class="build-content" :class="{visible: buildVisible}">
          <div class="s-badge"><i class="fas fa-bolt"></i> POWERED BY AFASA</div>
          <h2 class="s-h2">Start building with<br/><span class="grad-text">KinyaBot AI</span></h2>
          <p class="build-sub">Deploy instantly, scale automatically, and pay only for what you use. Zero configuration, zero surprises.</p>
          <div class="build-stats">
            <div class="bs-item" v-for="s in buildStats" :key="s.label">
              <div class="bs-val">{{ s.val }}</div>
              <div class="bs-lbl">{{ s.label }}</div>
            </div>
          </div>
          <router-link to="/register" class="build-btn">
            <i class="fas fa-rocket"></i> Chat for free — no card needed
          </router-link>
        </div>

        <!-- Floating tech logos grid -->
        <div class="tech-logos" :class="{visible: buildVisible}">
          <div v-for="(t,i) in techLogos" :key="t.name"
            class="tl-card"
            :style="{ transitionDelay: (i*0.04)+'s', background: t.bg }">
            <i :class="t.icon" :style="{color:t.color}"></i>
            <span>{{ t.label }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ FEATURES ══════════════════════════════════════════ -->
    <section id="features" class="section" ref="featuresRef">
      <div class="section-inner">
        <div class="s-badge"><i class="fas fa-sparkles"></i> Capabilities</div>
        <h2 class="s-h2">Everything you need to <span class="grad-text">build with AI</span></h2>
        <p class="s-sub">KinyaBot combines powerful AI with a beautiful interface for the best experience.</p>

        <div class="feat-grid">
          <div v-for="(f,i) in features" :key="f.title"
            class="feat-card"
            :class="{visible: featVisible, wide: i===0}"
            :style="{transitionDelay:(i*0.07)+'s'}">
            <div class="fc-icon" :style="{background:f.bg}">
              <i :class="f.icon" :style="{color:f.color}"></i>
            </div>
            <h3 class="fc-title">{{ f.title }}</h3>
            <p class="fc-desc">{{ f.desc }}</p>
            <div v-if="i===0" class="fc-demo">
              <div class="demo-msg user">How do I build a REST API in Node.js?</div>
              <div class="demo-msg ai">Here's a complete Node.js REST API with Express...<span class="demo-cur"></span></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ HOW IT WORKS ══════════════════════════════════════ -->
    <section id="how" class="section section-alt" ref="howRef">
      <div class="section-inner">
        <div class="s-badge"><i class="fas fa-map"></i> How it works</div>
        <h2 class="s-h2">Three steps to <span class="grad-text">start chatting</span></h2>
        <div class="steps-row">
          <div v-for="(step,i) in steps" :key="step.title"
            class="step-card"
            :class="{visible: howVisible}"
            :style="{transitionDelay:(i*0.13)+'s'}">
            <div class="step-num">{{ String(i+1).padStart(2,'0') }}</div>
            <div class="step-ico" :style="{background:step.bg}">
              <i :class="step.icon" :style="{color:step.color}"></i>
            </div>
            <h3>{{ step.title }}</h3>
            <p>{{ step.desc }}</p>
            <div v-if="i<steps.length-1" class="step-arrow"><i class="fas fa-arrow-right"></i></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ STATS ══════════════════════════════════════════════ -->
    <section class="stats-section" ref="statsRef">
      <div class="section-inner">
        <div class="stats-grid">
          <div v-for="(s,i) in stats" :key="s.label"
            class="stat-card"
            :class="{visible: statsVisible}"
            :style="{transitionDelay:(i*0.1)+'s'}">
            <div class="stat-val">{{ s.value }}</div>
            <div class="stat-lbl">{{ s.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ TESTIMONIALS ══════════════════════════════════════ -->
    <section class="section" ref="testRef">
      <div class="section-inner">
        <div class="s-badge"><i class="fas fa-star"></i> Testimonials</div>
        <h2 class="s-h2">Loved by <span class="grad-text">developers worldwide</span></h2>
        <div class="test-grid">
          <div v-for="(t,i) in testimonials" :key="t.name"
            class="test-card"
            :class="{visible: testVisible}"
            :style="{transitionDelay:(i*0.08)+'s'}">
            <div class="test-stars">
              <i v-for="n in 5" :key="n" class="fas fa-star"></i>
            </div>
            <p class="test-text">"{{ t.text }}"</p>
            <div class="test-author">
              <div class="test-av" :style="{background:t.color}">{{ t.name[0] }}</div>
              <div>
                <div class="test-name">{{ t.name }}</div>
                <div class="test-role">{{ t.role }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ PRICING ════════════════════════════════════════════ -->
    <section id="pricing" class="section section-alt" ref="pricingRef">
      <div class="section-inner">
        <div class="s-badge"><i class="fas fa-tag"></i> Pricing</div>
        <h2 class="s-h2">Simple, <span class="grad-text">transparent pricing</span></h2>
        <p class="s-sub">Start free, upgrade when you need more power. No hidden fees.</p>

        <div class="price-grid">
          <div v-for="(plan,i) in plans" :key="plan.name"
            class="price-card"
            :class="{popular: plan.popular, visible: priceVisible}"
            :style="{transitionDelay:(i*0.11)+'s'}"
            @click="handleGenerate">
            <div v-if="plan.popular" class="pop-tag">Most Popular</div>
            <div class="pc-ico" :style="{background:plan.bg}">
              <i :class="plan.icon" :style="{color:plan.color}"></i>
            </div>
            <h3 class="pc-name">{{ plan.name }}</h3>
            <div class="pc-price">
              <span class="pc-amt">{{ plan.price }}</span>
              <span class="pc-per">/month</span>
            </div>
            <p class="pc-desc">{{ plan.desc }}</p>
            <ul class="pc-feats">
              <li v-for="f in plan.features" :key="f"><i class="fas fa-check"></i>{{ f }}</li>
            </ul>
            <button class="pc-btn" :class="{primary: plan.popular}" @click.stop="handleGenerate">
              {{ plan.cta }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ FAQ ════════════════════════════════════════════════ -->
    <section class="section" ref="faqRef">
      <div class="section-inner faq-inner">
        <div class="s-badge"><i class="fas fa-circle-question"></i> FAQ</div>
        <h2 class="s-h2">Frequently asked <span class="grad-text">questions</span></h2>
        <div class="faq-list">
          <div v-for="(faq,i) in faqs" :key="faq.q"
            class="faq-item"
            :class="{open: openFaq===i, visible: faqVisible}"
            :style="{transitionDelay:(i*0.06)+'s'}"
            @click="openFaq=openFaq===i?-1:i">
            <div class="faq-q">
              <span>{{ faq.q }}</span>
              <i class="fas fa-chevron-down"></i>
            </div>
            <transition name="faq-ans">
              <div v-if="openFaq===i" class="faq-a">{{ faq.a }}</div>
            </transition>
          </div>
        </div>
      </div>
    </section>

    <!-- ══ CTA ════════════════════════════════════════════════ -->
    <section class="cta-section" ref="ctaRef">
      <div class="cta-card" :class="{visible: ctaVisible}">
        <div class="cta-glow"></div>
        <div class="s-badge"><i class="fas fa-rocket"></i> Get started · POWERED BY AFASA</div>
        <h2 class="cta-h2">Ready to build with <span class="grad-text">KinyaBot AI?</span></h2>
        <p class="cta-sub">Join thousands of users already building with KinyaBot. No credit card required.</p>
        <div class="cta-btns">
          <router-link to="/register" class="cta-primary"><i class="fas fa-rocket"></i> Start for Free</router-link>
          <router-link to="/login"    class="cta-secondary"><i class="fas fa-right-to-bracket"></i> Sign In</router-link>
        </div>
      </div>
    </section>

    <!-- ══ FOOTER ══════════════════════════════════════════════ -->
    <footer class="footer">
      <div class="footer-inner">
        <div class="footer-brand">
          <div class="brand-icon sm"><img src="/logo.png" alt=""/></div>
          <span class="brand-name">KinyaBot</span>
        </div>
        <div class="footer-links">
          <a @click.prevent="scrollTo('features')">Features</a>
          <a @click.prevent="scrollTo('pricing')">Pricing</a>
          <router-link to="/login">Sign In</router-link>
          <router-link to="/register">Register</router-link>
        </div>
        <div class="footer-copy">© 2024 KinyaBot AI · POWERED BY AFASA · All rights reserved.</div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const landingRoot = ref(null)
const demoPrompt  = ref('')
const mobileMenu  = ref(false)
const scrollY     = ref(0)
const openFaq     = ref(-1)

const buildVisible   = ref(false)
const featVisible    = ref(false)
const howVisible     = ref(false)
const statsVisible   = ref(false)
const testVisible    = ref(false)
const priceVisible   = ref(false)
const faqVisible     = ref(false)
const ctaVisible     = ref(false)

const buildRef   = ref(null); const featuresRef = ref(null)
const howRef     = ref(null); const statsRef    = ref(null)
const testRef    = ref(null); const pricingRef  = ref(null)
const faqRef     = ref(null); const ctaRef      = ref(null)

const trustLogos = [
  { name:'Node.js',   icon:'fab fa-node-js',  color:'#68a063' },
  { name:'Vue',       icon:'fab fa-vuejs',     color:'#42b883' },
  { name:'Python',    icon:'fab fa-python',    color:'#ffd43b' },
  { name:'React',     icon:'fab fa-react',     color:'#61dafb' },
  { name:'Docker',    icon:'fab fa-docker',    color:'#0db7ed' },
  { name:'GitHub',    icon:'fab fa-github',    color:'#e2e8f0' },
  { name:'AWS',       icon:'fab fa-aws',       color:'#ff9900' },
  { name:'TypeScript',icon:'fab fa-js',        color:'#3178c6' },
  { name:'MongoDB',   icon:'fas fa-leaf',      color:'#4db33d' },
  { name:'Rust',      icon:'fab fa-rust',      color:'#ce4a00' },
]

const buildStats = [
  { val:'< 1s', label:'Avg Response' },
  { val:'99.9%', label:'Uptime' },
  { val:'10K+', label:'Active Users' },
  { val:'Free', label:'To Start' },
]

const techLogos = [
  { name:'Node',      label:'Node.js',    icon:'fab fa-node-js',  color:'#68a063', bg:'rgba(104,160,99,.12)'  },
  { name:'Python',    label:'Python',     icon:'fab fa-python',   color:'#ffd43b', bg:'rgba(255,212,59,.1)'   },
  { name:'AI',        label:'AI Engine',  icon:'fas fa-robot',    color:'#cc785c', bg:'rgba(204,120,92,.12)'  },
  { name:'PHP',       label:'PHP',        icon:'fab fa-php',      color:'#8993be', bg:'rgba(137,147,190,.1)'  },
  { name:'Go',        label:'Go',         icon:'fas fa-code',     color:'#00aed8', bg:'rgba(0,174,216,.1)'    },
  { name:'Docker',    label:'Docker',     icon:'fab fa-docker',   color:'#0db7ed', bg:'rgba(13,183,237,.1)'   },
  { name:'Ruby',      label:'Ruby',       icon:'fas fa-gem',      color:'#e53935', bg:'rgba(229,57,53,.1)'    },
  { name:'Redis',     label:'Redis',      icon:'fas fa-database', color:'#ff4438', bg:'rgba(255,68,56,.1)'    },
  { name:'Rust',      label:'Rust',       icon:'fab fa-rust',     color:'#ce4a00', bg:'rgba(206,74,0,.1)'     },
  { name:'Vue',       label:'Vue',        icon:'fab fa-vuejs',    color:'#42b883', bg:'rgba(66,184,131,.1)'   },
  { name:'React',     label:'React',      icon:'fab fa-react',    color:'#61dafb', bg:'rgba(97,218,251,.1)'   },
  { name:'MySQL',     label:'MySQL',      icon:'fas fa-database', color:'#336791', bg:'rgba(51,103,145,.12)'  },
]

const features = [
  { title:'Streaming Responses',  desc:'Watch answers appear word-by-word in real time, just like ChatGPT — no waiting for the full response.',  icon:'fas fa-bolt',         color:'#6366f1', bg:'rgba(99,102,241,.15)'  },
  { title:'File & PDF Analysis',  desc:'Upload documents, code files, or images and let KinyaBot read and analyze them instantly.',               icon:'fas fa-file-lines',   color:'#06b6d4', bg:'rgba(6,182,212,.15)'   },
  { title:'Persistent Memory',    desc:'KinyaBot remembers your name, role, and preferences across all conversations automatically.',             icon:'fas fa-brain',        color:'#a855f7', bg:'rgba(168,85,247,.15)'  },
  { title:'Code Highlighting',    desc:'Beautiful syntax-highlighted code blocks with copy and download buttons for every language.',              icon:'fas fa-code',         color:'#34a853', bg:'rgba(52,168,83,.15)'   },
  { title:'Knowledge Base (RAG)', desc:'Upload your documents to build a custom AI knowledge base — get answers from your own data.',             icon:'fas fa-database',     color:'#f59e0b', bg:'rgba(245,158,11,.15)'  },
  { title:'Language Support',  desc:'Chat in  more than one languages. KinyaBot understands your language natively.',              icon:'fas fa-globe-africa', color:'#ec4899', bg:'rgba(236,72,153,.15)'  },
]

const steps = [
  { title:'Create Account', desc:'Sign up free in seconds. No credit card required.',                    icon:'fas fa-user-plus',   color:'#6366f1', bg:'rgba(99,102,241,.15)' },
  { title:'Ask Anything',   desc:'Type your question, upload a file, or start a new conversation.',     icon:'fas fa-comment-dots',color:'#06b6d4', bg:'rgba(6,182,212,.15)'  },
  { title:'Get Answers',    desc:'Watch KinyaBot respond in real-time with streaming AI answers.',       icon:'fas fa-bolt',        color:'#a855f7', bg:'rgba(168,85,247,.15)' },
]

const stats = [
  { value:'10K+',  label:'Active Users'  },
  { value:'1M+',   label:'Messages Sent' },
  { value:'99.9%', label:'Uptime'        },
  { value:'< 1s',  label:'Avg Response'  },
]

const testimonials = [
  { name:'Chretien T.', role:'Full-stack Developer',  color:'#6366f1', text:'KinyaBot is hands-down the best AI assistant I\'ve used. The streaming responses feel incredibly natural and the code highlighting is perfect.' },
  { name:'Azah K.',role:'Student, University of Rwanda', color:'#06b6d4', text:'I can ask questions in Spanish and get perfect answers. This is amazing for All students like me!' },
  { name:'Sonia K.',  role:'Startup Founder',       color:'#a855f7', text:'The knowledge base feature is incredible. I uploaded our company docs and now the AI answers questions about our product perfectly.' },
  { name:'Fania A.',   role:'Data Scientist',        color:'#34a853', text:'File analysis saved me hours of work. I uploaded a CSV and KinyaBot gave me insights I would have spent all day figuring out.' },
  { 
  name:'Afifah A.', 
  role:'Product Manager', 
  color:'#10b981', 
  text:'The platform is incredibly intuitive. I can easily track performance, manage features, and make adjustments without any technical hassle.' 
},
  { name:'Aisha K.',   role:'Product Manager',       color:'#ec4899', text:'Dead simple to use, powerful when you need it. The memory feature means it actually remembers my preferences every time.' },
]

const plans = [
  {
    name:'Free',       price:'$0',  desc:'Perfect for getting started', popular:false, cta:'Get Started Free',
    icon:'fas fa-star', color:'#9ca3af', bg:'rgba(156,163,175,.12)',
    features:['50 messages/day','File uploads','Chat history','Basic memory','Standard speed'],
  },
  {
    name:'Premium',    price:'$9',  desc:'For power users and creators', popular:true,  cta:'Start Premium',
    icon:'fas fa-crown', color:'#f59e0b', bg:'rgba(245,158,11,.15)',
    features:['500 messages/day','Priority speed','Knowledge base (RAG)','Full memory','PDF analysis','Code export'],
  },
  {
    name:'Enterprise', price:'$29', desc:'For teams and organizations',  popular:false, cta:'Contact Us',
    icon:'fas fa-gem', color:'#a855f7', bg:'rgba(168,85,247,.15)',
    features:['Unlimited messages','Custom AI model','Admin dashboard','Team management','API access','Priority support'],
  },
]

const faqs = [
  { q:'Is KinyaBot free to use?',         a:'Yes! KinyaBot offers a generous free plan with 50 messages per day. No credit card required to get started.' },
  { q:'What languages does KinyaBot support?', a:'KinyaBot supports Kinyarwanda, English, French, Swahili, German, Spanish, Chinese, Arabic, and many more languages.' },
  { q:'Can I upload files to the AI?',    a:'Yes — you can upload images, PDFs, text files, code files, and more. The AI will read and analyze them as part of your conversation.' },
  { q:'What is the Knowledge Base (RAG)?', a:'RAG lets you upload your own documents and the AI will use them to answer questions. Great for company docs, study notes, or any custom knowledge.' },
  { q:'How does streaming work?',         a:'Instead of waiting for the full response, answers appear word-by-word in real time — just like ChatGPT. It makes the experience feel much more natural.' },
  { 
  q: 'Is my data secure when using the AI assistant?', 
  a: 'Yes — we prioritize user privacy and security by implementing encryption, secure authentication, and strict access controls to protect all user data.' 
},
]

function handleGenerate() { router.push('/register') }

function scrollTo(id) {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior:'smooth', block:'start' })
}

function inView(el) {
  if (!el) return false
  return el.getBoundingClientRect().top < window.innerHeight * 0.88
}

function onScroll() {
  scrollY.value = window.scrollY
  if (inView(buildRef.value))   buildVisible.value   = true
  if (inView(featuresRef.value)) featVisible.value   = true
  if (inView(howRef.value))      howVisible.value    = true
  if (inView(statsRef.value))    statsVisible.value  = true
  if (inView(testRef.value))     testVisible.value   = true
  if (inView(pricingRef.value))  priceVisible.value  = true
  if (inView(faqRef.value))      faqVisible.value    = true
  if (inView(ctaRef.value))      ctaVisible.value    = true
}

onMounted(() => {
  document.documentElement.style.overflow = 'auto'
  document.body.style.overflow = 'auto'
  document.documentElement.style.height  = 'auto'
  document.body.style.height  = 'auto'
  const app = document.getElementById('app')
  if (app) { app.style.overflow = 'auto'; app.style.height = 'auto' }

  window.addEventListener('scroll', onScroll, { passive:true })
  setTimeout(onScroll, 500)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
  document.documentElement.style.height  = ''
  document.body.style.height  = ''
  const app = document.getElementById('app')
  if (app) { app.style.overflow = ''; app.style.height = '' }
})
</script>

<style scoped>
/* ── TOKENS / BASE ────────────────────────────────────────── */
.landing {
  background: #07080f;
  color: #e2e8f0;
  font-family: 'Google Sans','Segoe UI',system-ui,sans-serif;
  overflow-x: hidden;
  min-height: 100vh;
}
.grad-text {
  background: linear-gradient(135deg,#818cf8 0%,#c084fc 45%,#67e8f9 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.anim-up { animation: fadeUpIn .7s cubic-bezier(.34,1.56,.64,1) both; }
@keyframes fadeUpIn { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:none} }

/* ── NAV ──────────────────────────────────────────────────── */
.nav {
  position: fixed; top:0; left:0; right:0; z-index:100;
  transition: background .3s, backdrop-filter .3s;
}
.nav.scrolled {
  background: rgba(7,8,15,.92);
  border-bottom: 1px solid rgba(99,102,241,.15);
  backdrop-filter: blur(20px);
}
.nav-inner {
  max-width: 1120px; margin: 0 auto;
  display: flex; align-items: center; gap: 16px;
  padding: .8rem 1.5rem;
}
.nav-brand { display:flex; align-items:center; gap:9px; text-decoration:none; }
.brand-icon { width:30px; height:30px; border-radius:8px; overflow:hidden; background:rgba(99,102,241,.2); flex-shrink:0; }
.brand-icon img { width:100%; height:100%; object-fit:contain; }
.brand-icon.sm { width:24px; height:24px; border-radius:6px; }
.brand-name { font-size:1rem; font-weight:800; color:#fff; letter-spacing:-.3px; white-space:nowrap; }
.nav-links { display:flex; align-items:center; gap:2px; margin:0 auto; }
.nav-links a { padding:7px 14px; border-radius:8px; color:#9ca3af; font-size:13.5px; font-weight:500; text-decoration:none; transition:all .2s; cursor:pointer; }
.nav-links a:hover { color:#fff; background:rgba(255,255,255,.06); }
.nav-actions { display:flex; align-items:center; gap:8px; flex-shrink:0; }
.nav-signin { padding:7px 16px; border-radius:9px; color:#9ca3af; font-size:13.5px; font-weight:500; text-decoration:none; transition:color .2s; }
.nav-signin:hover { color:#fff; }
.nav-cta { padding:7px 18px; border-radius:9px; background:linear-gradient(135deg,#4f46e5,#7c3aed); color:#fff; font-size:13.5px; font-weight:600; text-decoration:none; transition:all .2s; box-shadow:0 2px 12px rgba(79,70,229,.35); }
.nav-cta:hover { transform:translateY(-1px); box-shadow:0 4px 18px rgba(79,70,229,.5); }
.nav-burger { display:none; background:none; border:none; color:#9ca3af; font-size:18px; cursor:pointer; margin-left:auto; padding:4px; }
.mobile-nav {
  background: rgba(7,8,15,.98); border-top:1px solid rgba(99,102,241,.12);
  padding: .75rem 1.25rem; display:flex; flex-direction:column; gap:4px;
}
.mobile-nav a { display:flex; align-items:center; gap:10px; padding:11px 14px; border-radius:9px; color:#9ca3af; text-decoration:none; font-size:14px; transition:all .2s; cursor:pointer; }
.mobile-nav a:hover { background:rgba(255,255,255,.06); color:#fff; }
.mob-signin { border:1px solid rgba(99,102,241,.2) !important; color:#a5b4fc !important; margin-top:4px; }
.mob-cta { background:linear-gradient(135deg,#4f46e5,#7c3aed) !important; color:#fff !important; margin-top:4px; justify-content:center; box-shadow:0 4px 14px rgba(79,70,229,.4); }
.slide-down-enter-active,.slide-down-leave-active { transition:all .25s ease; }
.slide-down-enter-from,.slide-down-leave-to { opacity:0; transform:translateY(-10px); }
@media(max-width:720px) { .nav-links,.nav-actions { display:none !important; } .nav-burger { display:block; } }

/* ── HERO ─────────────────────────────────────────────────── */
.hero {
  position: relative; min-height: 100vh;
  display: flex; align-items: center;
  padding: 100px 1.5rem 80px; overflow: hidden;
}
.hero-bg { position:absolute; inset:0; pointer-events:none; }
.bg-grid {
  position:absolute; inset:0;
  background-image: linear-gradient(rgba(99,102,241,.055) 1px,transparent 1px), linear-gradient(90deg,rgba(99,102,241,.055) 1px,transparent 1px);
  background-size: 54px 54px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 40%, black 40%, transparent 100%);
}
.bg-orb { position:absolute; border-radius:50%; filter:blur(110px); }
.bg-orb1 { width:700px; height:700px; background:radial-gradient(circle,rgba(79,70,229,.2),transparent 70%); top:-120px; left:50%; transform:translateX(-50%); }
.bg-orb2 { width:350px; height:350px; background:radial-gradient(circle,rgba(168,85,247,.14),transparent 70%); bottom:0; right:8%; }
.bg-orb3 { width:280px; height:280px; background:radial-gradient(circle,rgba(6,182,212,.1),transparent 70%); bottom:20%; left:5%; }

.hero-inner {
  position:relative; z-index:1;
  max-width:740px; margin:0 auto; text-align:center;
  display:flex; flex-direction:column; align-items:center; gap:1.1rem;
  width: 100%;
}
.hero-badge { display:inline-flex; align-items:center; gap:7px; padding:6px 16px; border-radius:99px; background:rgba(99,102,241,.1); border:1px solid rgba(99,102,241,.25); color:#a5b4fc; font-size:12px; font-weight:500; }
.hero-h1 { font-size:clamp(2rem,6vw,3.9rem); font-weight:900; line-height:1.1; color:#fff; letter-spacing:-.04em; width:100%; }
.hero-sub { max-width:520px; font-size:clamp(13.5px,2.2vw,15.5px); color:#9ca3af; line-height:1.7; }

/* Prompt box */
.prompt-box {
  width:100%; max-width:580px;
  background:rgba(255,255,255,.04); border:1px solid rgba(99,102,241,.22);
  border-radius:16px; overflow:hidden; backdrop-filter:blur(14px);
  box-shadow:0 0 0 1px rgba(99,102,241,.08),0 20px 44px rgba(0,0,0,.35);
}
.pb-top { padding:13px 15px 7px; }
.pb-input { width:100%; background:none; border:none; outline:none; color:#e2e8f0; font-size:14px; font-family:inherit; line-height:1.55; }
.pb-input::placeholder { color:#6b7280; }
.pb-bottom { display:flex; align-items:center; justify-content:space-between; padding:7px 10px 11px; gap:8px; flex-wrap:wrap; }
.pb-chips { display:flex; gap:5px; flex-wrap:wrap; }
.pb-chip { display:flex; align-items:center; gap:5px; padding:5px 10px; border-radius:7px; background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.09); color:#9ca3af; font-size:12px; cursor:pointer; transition:all .2s; font-family:inherit; }
.pb-chip:hover,.pb-chip.active { background:rgba(99,102,241,.12); border-color:rgba(99,102,241,.3); color:#a5b4fc; }
.pb-gen { display:flex; align-items:center; gap:7px; padding:8px 18px; border-radius:9px; background:linear-gradient(135deg,#4f46e5,#7c3aed); border:none; color:#fff; font-size:13px; font-weight:600; cursor:pointer; transition:all .2s; font-family:inherit; box-shadow:0 2px 12px rgba(79,70,229,.4); flex-shrink:0; }
.pb-gen:hover { transform:translateY(-1px); box-shadow:0 4px 18px rgba(79,70,229,.55); }

/* Trust marquee */
.trust { display:flex; flex-direction:column; align-items:center; gap:9px; width:100%; }
.trust-label { font-size:12px; color:#4b5563; }
.trust-track-wrap { width:100%; max-width:580px; overflow:hidden; mask-image:linear-gradient(90deg,transparent,black 10%,black 90%,transparent); }
.trust-track { display:flex; gap:20px; animation:marquee 22s linear infinite; width:max-content; }
.trust-track:hover { animation-play-state:paused; }
@keyframes marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
.trust-logo { display:flex; align-items:center; gap:6px; color:#374151; font-size:12.5px; font-weight:600; white-space:nowrap; padding:4px 8px; border-radius:6px; transition:all .2s; }
.trust-logo:hover { color:#9ca3af; background:rgba(255,255,255,.04); }
.trust-logo i { font-size:14px; }

/* ── SECTIONS ─────────────────────────────────────────────── */
.section { padding:88px 1.5rem; }
.section-alt { background:rgba(99,102,241,.025); }
.section-inner { max-width:1100px; margin:0 auto; }
.s-badge { display:inline-flex; align-items:center; gap:7px; padding:5px 14px; border-radius:99px; background:rgba(99,102,241,.1); border:1px solid rgba(99,102,241,.2); color:#a5b4fc; font-size:12px; font-weight:500; margin-bottom:1.2rem; }
.s-h2 { font-size:clamp(1.7rem,4vw,2.8rem); font-weight:800; color:#fff; line-height:1.2; letter-spacing:-.03em; margin-bottom:.7rem; }
.s-sub { font-size:15px; color:#9ca3af; line-height:1.7; max-width:520px; margin-bottom:2.75rem; }

/* ── BUILD SECTION ────────────────────────────────────────── */
.build-section {
  background: #0c0c14;
  border-top:1px solid rgba(255,255,255,.04); border-bottom:1px solid rgba(255,255,255,.04);
  padding: 88px 1.5rem; overflow:hidden;
}
.build-inner { max-width:1100px; margin:0 auto; display:grid; grid-template-columns:1fr 1fr; gap:60px; align-items:center; }
.build-content { opacity:0; transform:translateX(-28px); transition:opacity .6s ease,transform .6s ease; }
.build-content.visible { opacity:1; transform:none; }
.build-sub { font-size:15px; color:#9ca3af; line-height:1.7; margin:.75rem 0 1.5rem; max-width:420px; }
.build-stats { display:flex; gap:0; margin-bottom:2rem; border:1px solid rgba(255,255,255,.08); border-radius:12px; overflow:hidden; }
.bs-item { flex:1; padding:1.1rem .75rem; text-align:center; border-right:1px solid rgba(255,255,255,.06); }
.bs-item:last-child { border-right:none; }
.bs-val { font-size:1.2rem; font-weight:800; color:#fff; }
.bs-lbl { font-size:11px; color:#6b7280; margin-top:2px; }
.build-btn { display:inline-flex; align-items:center; gap:8px; padding:12px 24px; border-radius:10px; background:linear-gradient(135deg,#4f46e5,#7c3aed); color:#fff; font-size:14px; font-weight:600; text-decoration:none; transition:all .2s; box-shadow:0 4px 16px rgba(79,70,229,.4); }
.build-btn:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(79,70,229,.55); }
.tech-logos { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; opacity:0; transform:translateX(28px); transition:opacity .6s ease .15s,transform .6s ease .15s; }
.tech-logos.visible { opacity:1; transform:none; }
.tl-card { border:1px solid rgba(255,255,255,.07); border-radius:12px; padding:1rem .75rem; display:flex; flex-direction:column; align-items:center; gap:6px; transition:all .25s; cursor:default; }
.tl-card:hover { transform:translateY(-3px); border-color:rgba(255,255,255,.14); box-shadow:0 8px 20px rgba(0,0,0,.3); }
.tl-card i { font-size:1.5rem; }
.tl-card span { font-size:10px; font-weight:700; color:rgba(255,255,255,.5); }

/* ── FEATURES ─────────────────────────────────────────────── */
.feat-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(270px,1fr)); gap:14px; }
.feat-card { background:rgba(255,255,255,.025); border:1px solid rgba(99,102,241,.1); border-radius:16px; padding:1.5rem; opacity:0; transform:translateY(24px); transition:opacity .55s ease,transform .55s ease,border-color .2s; }
.feat-card.visible { opacity:1; transform:none; }
.feat-card.wide { grid-column:span 2; }
.feat-card:hover { border-color:rgba(99,102,241,.28); }
@media(max-width:680px) { .feat-card.wide { grid-column:span 1; } }
.fc-icon { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.1rem; margin-bottom:.9rem; }
.fc-title { font-size:1rem; font-weight:700; color:#fff; margin-bottom:.4rem; }
.fc-desc { font-size:13.5px; color:#9ca3af; line-height:1.65; }
.fc-demo { margin-top:1.25rem; display:flex; flex-direction:column; gap:8px; }
.demo-msg { padding:9px 13px; border-radius:10px; font-size:12.5px; line-height:1.55; max-width:85%; }
.demo-msg.user { background:rgba(99,102,241,.15); border:1px solid rgba(99,102,241,.25); color:#c4b5fd; align-self:flex-end; }
.demo-msg.ai { background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); color:#d1d5db; align-self:flex-start; }
.demo-cur { display:inline-block; width:2px; height:14px; background:#818cf8; margin-left:2px; vertical-align:middle; animation:blink .8s infinite; }
@keyframes blink { 0%,100%{opacity:1}50%{opacity:0} }

/* ── STEPS ────────────────────────────────────────────────── */
.steps-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(230px,1fr)); gap:14px; }
.step-card { background:rgba(255,255,255,.025); border:1px solid rgba(99,102,241,.1); border-radius:16px; padding:1.5rem; position:relative; opacity:0; transform:translateX(-20px); transition:opacity .5s ease,transform .5s ease; }
.step-card.visible { opacity:1; transform:none; }
.step-num { font-size:1.8rem; font-weight:900; color:rgba(99,102,241,.15); margin-bottom:.75rem; font-family:monospace; }
.step-ico { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.1rem; margin-bottom:.9rem; }
.step-card h3 { font-size:1rem; font-weight:700; color:#fff; margin-bottom:.4rem; }
.step-card p { font-size:13.5px; color:#9ca3af; line-height:1.65; }
.step-arrow { position:absolute; top:50%; right:-20px; transform:translateY(-50%); color:rgba(99,102,241,.3); font-size:1.1rem; z-index:2; }
@media(max-width:680px) { .step-arrow { display:none; } }

/* ── STATS ────────────────────────────────────────────────── */
.stats-section { padding:72px 1.5rem; background:rgba(99,102,241,.03); }
.stats-grid { max-width:1100px; margin:0 auto; display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:14px; }
.stat-card { text-align:center; padding:2rem 1rem; background:rgba(255,255,255,.025); border:1px solid rgba(99,102,241,.1); border-radius:16px; opacity:0; transform:scale(.95); transition:opacity .5s ease,transform .5s ease; }
.stat-card.visible { opacity:1; transform:none; }
.stat-val { font-size:2.2rem; font-weight:900; background:linear-gradient(135deg,#818cf8,#c084fc); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
.stat-lbl { font-size:13px; color:#6b7280; margin-top:6px; }

/* ── TESTIMONIALS ─────────────────────────────────────────── */
.test-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:14px; }
.test-card { background:rgba(255,255,255,.025); border:1px solid rgba(99,102,241,.1); border-radius:16px; padding:1.4rem; opacity:0; transform:translateY(20px); transition:opacity .5s ease,transform .5s ease; }
.test-card.visible { opacity:1; transform:none; }
.test-card:hover { border-color:rgba(99,102,241,.25); }
.test-stars { display:flex; gap:3px; color:#f59e0b; font-size:13px; margin-bottom:.75rem; }
.test-text { font-size:13.5px; color:#9ca3af; line-height:1.7; margin-bottom:1rem; font-style:italic; }
.test-author { display:flex; align-items:center; gap:10px; }
.test-av { width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; color:#fff; flex-shrink:0; }
.test-name { font-size:13px; font-weight:600; color:#e2e8f0; }
.test-role { font-size:11.5px; color:#6b7280; }

/* ── PRICING ──────────────────────────────────────────────── */
.price-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:16px; }
.price-card {
  background:rgba(255,255,255,.025); border:1px solid rgba(99,102,241,.12);
  border-radius:20px; padding:1.75rem; position:relative;
  opacity:0; transform:translateY(24px);
  transition:opacity .55s ease,transform .55s ease,border-color .2s,box-shadow .2s;
  cursor:pointer;
}
.price-card.visible { opacity:1; transform:none; }
.price-card:hover { border-color:rgba(99,102,241,.35); transform:translateY(-4px); box-shadow:0 16px 40px rgba(0,0,0,.25); }
.price-card.popular { border-color:rgba(99,102,241,.45); background:rgba(99,102,241,.07); box-shadow:0 0 40px rgba(99,102,241,.14); }
.price-card.popular:hover { box-shadow:0 16px 48px rgba(99,102,241,.3); }
.pop-tag { position:absolute; top:-1px; left:50%; transform:translateX(-50%); background:linear-gradient(135deg,#4f46e5,#7c3aed); color:#fff; font-size:11px; font-weight:700; padding:4px 14px; border-radius:0 0 10px 10px; white-space:nowrap; }
.pc-ico { width:44px; height:44px; border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.1rem; margin-bottom:.9rem; }
.pc-name { font-size:1.1rem; font-weight:700; color:#fff; margin-bottom:.4rem; }
.pc-price { display:flex; align-items:baseline; gap:4px; margin-bottom:.5rem; }
.pc-amt { font-size:2.2rem; font-weight:900; color:#fff; }
.pc-per { font-size:13px; color:#6b7280; }
.pc-desc { font-size:13px; color:#6b7280; margin-bottom:1.25rem; }
.pc-feats { list-style:none; padding:0; display:flex; flex-direction:column; gap:8px; margin-bottom:1.5rem; }
.pc-feats li { display:flex; align-items:center; gap:8px; font-size:13.5px; color:#9ca3af; }
.pc-feats li i { color:#4ade80; font-size:12px; flex-shrink:0; }
.pc-btn { width:100%; padding:11px; border-radius:10px; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); color:#e2e8f0; font-size:13.5px; font-weight:500; cursor:pointer; transition:all .2s; font-family:inherit; }
.pc-btn:hover { background:rgba(255,255,255,.12); }
.pc-btn.primary { background:linear-gradient(135deg,#4f46e5,#7c3aed); border-color:transparent; box-shadow:0 4px 16px rgba(79,70,229,.4); color:#fff; }
.pc-btn.primary:hover { box-shadow:0 6px 22px rgba(79,70,229,.55); }

/* ── FAQ ──────────────────────────────────────────────────── */
.faq-inner { max-width:700px; margin:0 auto; }
.faq-list { display:flex; flex-direction:column; gap:8px; margin-top:2rem; }
.faq-item { background:rgba(255,255,255,.025); border:1px solid rgba(99,102,241,.1); border-radius:12px; overflow:hidden; cursor:pointer; opacity:0; transform:translateY(16px); transition:opacity .45s ease,transform .45s ease,border-color .2s; }
.faq-item.visible { opacity:1; transform:none; }
.faq-item.open { border-color:rgba(99,102,241,.3); }
.faq-q { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:1rem 1.1rem; font-size:14px; font-weight:600; color:#e2e8f0; }
.faq-q i { color:#6b7280; font-size:13px; transition:transform .25s; flex-shrink:0; }
.faq-item.open .faq-q i { transform:rotate(180deg); color:#a5b4fc; }
.faq-a { padding:0 1.1rem 1rem; font-size:13.5px; color:#9ca3af; line-height:1.7; }
.faq-ans-enter-active,.faq-ans-leave-active { transition:all .25s ease; overflow:hidden; }
.faq-ans-enter-from,.faq-ans-leave-to { opacity:0; max-height:0; padding-bottom:0; }
.faq-ans-enter-to,.faq-ans-leave-from { opacity:1; max-height:200px; }

/* ── CTA ──────────────────────────────────────────────────── */
.cta-section { padding:88px 1.5rem; }
.cta-card { max-width:680px; margin:0 auto; text-align:center; position:relative; padding:4rem 2.5rem; background:rgba(99,102,241,.05); border:1px solid rgba(99,102,241,.18); border-radius:28px; opacity:0; transform:translateY(24px); transition:opacity .6s ease,transform .6s ease; }
.cta-card.visible { opacity:1; transform:none; }
.cta-glow { position:absolute; inset:0; border-radius:28px; background:radial-gradient(ellipse at center,rgba(79,70,229,.14),transparent 70%); pointer-events:none; }
.cta-h2 { font-size:clamp(1.8rem,4vw,2.6rem); font-weight:800; color:#fff; margin:1rem 0 .75rem; }
.cta-sub { font-size:15px; color:#9ca3af; line-height:1.7; margin-bottom:2rem; }
.cta-btns { display:flex; gap:12px; justify-content:center; flex-wrap:wrap; }
.cta-primary { display:flex; align-items:center; gap:8px; padding:13px 28px; border-radius:10px; background:linear-gradient(135deg,#4f46e5,#7c3aed); color:#fff; font-size:14px; font-weight:600; text-decoration:none; transition:all .2s; box-shadow:0 4px 16px rgba(79,70,229,.4); }
.cta-primary:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(79,70,229,.55); }
.cta-secondary { display:flex; align-items:center; gap:8px; padding:13px 24px; border-radius:10px; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); color:#e2e8f0; font-size:14px; font-weight:500; text-decoration:none; transition:all .2s; }
.cta-secondary:hover { background:rgba(255,255,255,.12); }

/* ── FOOTER ───────────────────────────────────────────────── */
.footer { border-top:1px solid rgba(99,102,241,.1); padding:2rem 1.5rem; }
.footer-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px; }
.footer-brand { display:flex; align-items:center; gap:8px; }
.powered-pill { font-size:10px; font-weight:700; color:#6366f1; background:rgba(99,102,241,.12); padding:2px 8px; border-radius:99px; letter-spacing:.05em; }
.footer-links { display:flex; gap:18px; flex-wrap:wrap; }
.footer-links a { color:#6b7280; font-size:13px; text-decoration:none; transition:color .2s; cursor:pointer; }
.footer-links a:hover { color:#e2e8f0; }
.footer-copy { font-size:12px; color:#374151; }

/* ── RESPONSIVE ───────────────────────────────────────────── */
@media(max-width:960px) {
  .build-inner { grid-template-columns:1fr; gap:40px; }
  .tech-logos { grid-template-columns:repeat(4,1fr); }
  .build-content { transform:translateY(-16px); }
  .build-content.visible { transform:none; }
}
@media(max-width:640px) {
  .hero { padding:80px 1rem 60px; min-height:auto; }
  .hero-h1 { font-size:clamp(1.8rem,7.5vw,2.5rem); line-height:1.15; }
  .hero-sub { font-size:13.5px; }
  .hero-br { display:none; }
  .section { padding:60px 1rem; }
  .build-section { padding:60px 1rem; }
  .stats-section { padding:56px 1rem; }
  .pb-bottom { flex-direction:column; align-items:stretch; }
  .pb-gen { align-self:flex-end; }
  .pb-chip span { display:none; }
  .pb-chip { padding:5px 8px; }
  .tech-logos { grid-template-columns:repeat(3,1fr); }
  .cta-card { padding:2.5rem 1.25rem; }
  .cta-h2 { font-size:1.5rem; }
  .footer-inner { flex-direction:column; align-items:flex-start; gap:12px; }
  .build-stats { display:grid; grid-template-columns:1fr 1fr; }
  .bs-item:nth-child(2) { border-right:none; }
}
@media(max-width:420px) {
  .hero-badge { font-size:10.5px; padding:5px 12px; text-align:center; }
  .tech-logos { grid-template-columns:repeat(2,1fr); }
  .price-grid { grid-template-columns:1fr; }
  .cta-btns { flex-direction:column; }
  .cta-primary,.cta-secondary { justify-content:center; }
  .feat-grid,.steps-row,.test-grid,.stats-grid { grid-template-columns:1fr; }
}
</style>
