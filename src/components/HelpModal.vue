<template>
  <teleport to="body">
    <div class="modal-bg" @click.self="$emit('close')">
      <div class="help-modal">
        <div class="hm-header">
          <div class="hm-logo">
            <img src="/logo.png" alt="KinyaBot" />
            <div>
              <div class="hm-title">Help &amp; Support</div>
              <div class="hm-sub">How can we help you today?</div>
            </div>
          </div>
          <button class="hm-close" @click="$emit('close')"><i class="fas fa-xmark"></i></button>
        </div>

        <!-- Search -->
        <div class="hm-search">
          <div class="hs-box">
            <i class="fas fa-magnifying-glass"></i>
            <input v-model="searchQ" type="text" placeholder="Search for help topics…" />
          </div>
        </div>

        <!-- Quick links -->
        <div class="quick-links">
          <a v-for="l in quickLinks" :key="l.label" class="ql-item" href="#" @click.prevent="activeSection=l.section">
            <div class="ql-icon"><i :class="l.icon"></i></div>
            <span>{{ l.label }}</span>
          </a>
        </div>

        <!-- Nav tabs -->
        <div class="hm-tabs">
          <button v-for="t in tabs" :key="t.id" class="hm-tab" :class="{active:activeTab===t.id}" @click="activeTab=t.id">
            <i :class="t.icon"></i> {{ t.label }}
          </button>
        </div>

        <!-- Content -->
        <div class="hm-body">
          <!-- FAQ -->
          <div v-if="activeTab==='faq'">
            <div v-for="(faq,i) in filteredFaqs" :key="i" class="faq-item">
              <button class="faq-q" @click="openFaq=openFaq===i?null:i">
                <span>{{ faq.q }}</span>
                <i class="fas" :class="openFaq===i?'fa-chevron-up':'fa-chevron-down'"></i>
              </button>
              <transition name="fade">
                <div v-if="openFaq===i" class="faq-a">{{ faq.a }}</div>
              </transition>
            </div>
          </div>

          <!-- Getting Started -->
          <div v-if="activeTab==='start'" class="guide-list">
            <div v-for="g in guides" :key="g.title" class="guide-card">
              <div class="guide-icon"><i :class="g.icon"></i></div>
              <div>
                <div class="guide-title">{{ g.title }}</div>
                <div class="guide-desc">{{ g.desc }}</div>
              </div>
            </div>
          </div>

          <!-- Contact -->
          <div v-if="activeTab==='contact'" class="contact-section">
            <div class="contact-options">
              <div class="contact-card">
                <i class="fas fa-envelope"></i>
                <div class="cc-info">
                  <div class="cc-title">Email Support</div>
                  <div class="cc-desc">Get help via email within 24 hours</div>
                  <a href="mailto:support@kinyabot.ai" class="cc-link">support@kinyabot.ai</a>
                </div>
              </div>
              <div class="contact-card">
                <i class="fab fa-discord"></i>
                <div class="cc-info">
                  <div class="cc-title">Discord Community</div>
                  <div class="cc-desc">Join our community for real-time help</div>
                  <a href="#" class="cc-link">discord.gg/kinyabot</a>
                </div>
              </div>
              <div class="contact-card">
                <i class="fab fa-twitter"></i>
                <div class="cc-info">
                  <div class="cc-title">Twitter / X</div>
                  <div class="cc-desc">Follow us for updates and tips</div>
                  <a href="#" class="cc-link">@KinyaBotAI</a>
                </div>
              </div>
            </div>

            <div class="contact-form">
              <h3>Send a message</h3>
              <textarea v-model="contactMsg" placeholder="Describe your issue or question…" rows="4"></textarea>
              <button class="send-msg-btn" :disabled="!contactMsg.trim()">
                <i class="fas fa-paper-plane"></i> Send Message
              </button>
            </div>
          </div>

          <!-- What's New -->
          <div v-if="activeTab==='whatsnew'" class="changelog">
            <div v-for="c in changelog" :key="c.version" class="cl-entry">
              <div class="cl-version">
                <span class="cl-v">v{{ c.version }}</span>
                <span class="cl-date">{{ c.date }}</span>
              </div>
              <ul class="cl-notes">
                <li v-for="note in c.notes" :key="note">{{ note }}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup>
import { ref, computed } from 'vue'

defineEmits(['close'])

const searchQ = ref('')
const activeTab = ref('faq')
const openFaq = ref(null)
const contactMsg = ref('')
const contactSent = ref(false)
function sendContactMsg() {
  if (!contactMsg.value.trim()) return
  // In production: POST to /api/support. For demo: simulate success.
  contactSent.value = true
  setTimeout(() => { contactSent.value = false; contactMsg.value = '' }, 4000)
}
const activeSection = ref(null)

const tabs = [
  { id:'faq', icon:'fas fa-circle-question', label:'FAQ' },
  { id:'start', icon:'fas fa-rocket', label:'Getting Started' },
  { id:'contact', icon:'fas fa-headset', label:'Contact' },
  { id:'whatsnew', icon:'fas fa-sparkles', label:"What's New" },
]

const quickLinks = [
  { icon:'fas fa-play-circle', label:'Get Started', section:'start' },
  { icon:'fas fa-comment-dots', label:'Chat Tips', section:'faq' },
  { icon:'fas fa-file-code', label:'API Docs', section:'faq' },
  { icon:'fas fa-bug', label:'Report Bug', section:'contact' },
]

const faqs = [
  { q:'How do I start a new conversation?', a:'Click the "New Chat" button in the left sidebar or use the keyboard shortcut Ctrl+K (Cmd+K on Mac).' },
  { q:'Can KinyaBot remember previous conversations?', a:'Yes! KinyaBot saves your chat history and uses the last 10 messages as context for every response. You can view all past chats in the sidebar.' },
  { q:'How do I attach files or images?', a:'Click the Attach button (paperclip icon) in the input area or drag and drop files directly into the chat.' },
  { q:'What is Deep Think mode?', a:'Deep Think enables extended reasoning for complex, multi-step problems. Toggle it on in the input area for detailed, structured responses.' },
  { q:'How do I use image generation?', a:'Start your message with "/image" followed by a description. For example: "/image a futuristic city at night".' },
  { q:'Can I use voice input?', a:'Yes! Click the microphone icon in the input area. Voice input works in Chrome, Edge, and other browsers supporting the Web Speech API.' },
  { q:'How do I pin a chat?', a:'Hover over any chat in the sidebar, click the "..." menu, and select "Pin". Pinned chats appear at the top of the sidebar.' },
  { q:'Is my data secure?', a:'All data is stored locally on your server with JWT authentication and bcrypt password hashing. We do not share your conversations.' },
  { q:'How do I delete all my chats?', a:'Go to Settings → Privacy & Data → Delete All Chats. Note that this action cannot be undone.' },
  { q:'What keyboard shortcuts are available?', a:'Common shortcuts: Ctrl+K (new chat), Enter (send), Shift+Enter (new line), Esc (close modals). See full list in Settings → Shortcuts.' },
]

const filteredFaqs = computed(() => {
  if (!searchQ.value) return faqs
  const q = searchQ.value.toLowerCase()
  return faqs.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q))
})

const guides = [
  { icon:'fas fa-user-plus', title:'Create your account', desc:'Register with your email and password to get started with KinyaBot AI.' },
  { icon:'fas fa-comment-plus', title:'Start a new chat', desc:'Click "New Chat" in the sidebar or press Ctrl+K. Type your message and press Enter.' },
  { icon:'fas fa-thumbtack', title:'Pin important chats', desc:'Hover a chat in the sidebar, click "..." and pin it so it stays at the top.' },
  { icon:'fas fa-paperclip', title:'Attach files', desc:'Click the paperclip icon to upload images, documents, or other files.' },
  { icon:'fas fa-brain', title:'Use Deep Think', desc:'Enable Deep Think mode for detailed, step-by-step reasoning on complex questions.' },
  { icon:'fas fa-magnifying-glass', title:'Search your history', desc:'Use the search box in the sidebar to find any message across all your conversations.' },
  { icon:'fas fa-gear', title:'Customize settings', desc:'Visit Settings to change themes, font size, AI model preferences, and more.' },
]

const changelog = [
  { version:'1.2.0', date:'March 2026', notes:['Added Deep Think mode', 'File attachment support', 'Voice input via Web Speech API', 'Pinned chats & search'] },
  { version:'1.1.0', date:'February 2026', notes:['Right panel with saved chats', 'Full settings modal', 'Image generation (/image command)', 'Context-aware responses'] },
  { version:'1.0.0', date:'January 2026', notes:['Initial release of KinyaBot AI', 'JWT authentication', 'MySQL chat persistence', 'Markdown rendering with syntax highlighting'] },
]
</script>

<style scoped>
.modal-bg { position:fixed;inset:0;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;z-index:999;backdrop-filter:blur(6px);animation:fadeIn .2s ease }
.help-modal { width:min(700px,96vw);max-height:90vh;background:var(--bg-card);border:1px solid var(--border-md);border-radius:var(--r-xl);overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 60px rgba(0,0,0,.5);animation:fadeUp .25s ease }

.hm-header { display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--border);flex-shrink:0 }
.hm-logo { display:flex;align-items:center;gap:12px }
.hm-logo img { width:38px;height:38px;border-radius:10px;object-fit:contain }
.hm-title { font-size:15px;font-weight:700;color:var(--text-1) }
.hm-sub { font-size:12px;color:var(--text-2) }
.hm-close { width:30px;height:30px;border-radius:8px;background:none;border:none;color:var(--text-2);font-size:14px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s }
.hm-close:hover { background:var(--bg-hover);color:var(--text-1) }

.hm-search { padding:12px 20px;flex-shrink:0 }
.hs-box { display:flex;align-items:center;gap:8px;background:var(--bg-input);border:1px solid var(--border-md);border-radius:99px;padding:9px 14px }
.hs-box i { color:var(--text-3);font-size:13px }
.hs-box input { flex:1;background:none;border:none;color:var(--text-1);font-size:13.5px }
.hs-box input::placeholder { color:var(--text-3) }

.quick-links { display:flex;gap:8px;padding:0 20px 12px;flex-shrink:0 }
.ql-item { display:flex;align-items:center;gap:7px;padding:7px 13px;background:var(--bg-panel);border:1px solid var(--border);border-radius:99px;color:var(--text-2);font-size:12.5px;cursor:pointer;transition:all .2s }
.ql-item:hover { background:var(--bg-hover);color:var(--text-1);border-color:var(--border-md) }
.ql-icon { font-size:12px }

.hm-tabs { display:flex;gap:2px;padding:0 20px;border-bottom:1px solid var(--border);flex-shrink:0 }
.hm-tab { padding:8px 14px;background:none;border:none;border-bottom:2px solid transparent;color:var(--text-2);font-size:13px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:6px;margin-bottom:-1px }
.hm-tab:hover { color:var(--text-1) }
.hm-tab.active { color:#c4b5fd;border-bottom-color:#6d28d9 }

.hm-body { flex:1;overflow-y:auto;padding:16px 20px }

/* FAQ */
.faq-item { border-bottom:1px solid var(--border);margin-bottom:0 }
.faq-q { width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 4px;background:none;border:none;color:var(--text-1);font-size:13.5px;font-weight:500;text-align:left;cursor:pointer;transition:color .2s }
.faq-q:hover { color:#c4b5fd }
.faq-q i { color:var(--text-3);font-size:12px;flex-shrink:0 }
.faq-a { padding:0 4px 13px;font-size:13px;color:var(--text-2);line-height:1.65 }

/* Guide */
.guide-list { display:flex;flex-direction:column;gap:10px }
.guide-card { display:flex;align-items:flex-start;gap:14px;padding:14px;background:var(--bg-panel);border:1px solid var(--border);border-radius:var(--r-sm);transition:border-color .2s }
.guide-card:hover { border-color:var(--border-md) }
.guide-icon { width:36px;height:36px;border-radius:10px;background:rgba(109,40,217,.18);border:1px solid rgba(109,40,217,.3);display:flex;align-items:center;justify-content:center;color:#c4b5fd;font-size:15px;flex-shrink:0 }
.guide-title { font-size:13.5px;font-weight:600;color:var(--text-1);margin-bottom:3px }
.guide-desc { font-size:12.5px;color:var(--text-2);line-height:1.6 }

/* Contact */
.contact-section { display:flex;flex-direction:column;gap:16px }
.contact-options { display:flex;flex-direction:column;gap:10px }
.contact-card { display:flex;align-items:flex-start;gap:14px;padding:14px;background:var(--bg-panel);border:1px solid var(--border);border-radius:var(--r-sm) }
.contact-card > i { font-size:1.4rem;color:#c4b5fd;width:24px;text-align:center;margin-top:2px }
.cc-title { font-size:13.5px;font-weight:600;color:var(--text-1);margin-bottom:3px }
.cc-desc { font-size:12px;color:var(--text-2);margin-bottom:5px }
.cc-link { font-size:12.5px;color:var(--blue) }
.cc-link:hover { text-decoration:underline }
.contact-form { background:var(--bg-panel);border:1px solid var(--border);border-radius:var(--r-sm);padding:16px }
.contact-form h3 { font-size:14px;font-weight:600;margin-bottom:10px }
.contact-form textarea { width:100%;background:var(--bg-input);border:1px solid var(--border-md);border-radius:var(--r-sm);color:var(--text-1);font-size:13.5px;padding:10px 12px;resize:none;line-height:1.55;font-family:var(--font) }
.contact-form textarea:focus { border-color:#6d28d9;outline:none }
.contact-form textarea::placeholder { color:var(--text-3) }
.send-msg-btn { margin-top:10px;display:flex;align-items:center;gap:7px;padding:9px 18px;background:#6d28d9;border:none;border-radius:var(--r-sm);color:#fff;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s }
.send-msg-btn:hover:not(:disabled) { background:#7c3aed }
.send-msg-btn:disabled { opacity:.4;cursor:not-allowed }
.contact-success { background:rgba(52,168,83,.12);border:1px solid rgba(52,168,83,.3);color:#34a853;padding:9px 14px;border-radius:var(--r-sm);font-size:12.5px;display:flex;align-items:center;gap:7px;margin-top:8px }

/* Changelog */
.changelog { display:flex;flex-direction:column;gap:16px }
.cl-entry { padding:14px;background:var(--bg-panel);border:1px solid var(--border);border-radius:var(--r-sm) }
.cl-version { display:flex;align-items:center;gap:10px;margin-bottom:10px }
.cl-v { font-size:14px;font-weight:700;color:#c4b5fd;background:rgba(109,40,217,.2);padding:3px 10px;border-radius:99px }
.cl-date { font-size:12px;color:var(--text-3) }
.cl-notes { padding-left:18px;display:flex;flex-direction:column;gap:5px }
.cl-notes li { font-size:13px;color:var(--text-2) }

@media (max-width:600px) { .quick-links { flex-wrap:wrap } .hm-tab span { display:none } }
</style>
