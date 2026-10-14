<template>
  <div class="agc ag-ui" :class="{ centered }">
    <header v-if="centered" class="agc-hero-heading">
      <h1 aria-label="What can I build for you?">
        <Transition name="agc-cycle" mode="out-in">
          <span :key="activeHeadline" aria-hidden="true">{{ activeHeadline }}</span>
        </Transition>
      </h1>
      <p>Build a complete product with KinyaBot — not just a mockup.</p>
    </header>

    <section class="agc-card" aria-label="Agent prompt">
      <!-- workspace context chip row -->
      <div v-if="taskChip" class="agc-chips" role="group" aria-label="Task context">
        <button class="agc-chip" :class="{ live: agent.isActive }" @click="agent.openPanel()" title="Open workspace" aria-label="Open the task workspace">
          <i class="fas fa-folder" aria-hidden="true"></i>
          <span class="agc-chip-name">{{ taskChip.name }}</span>
          <span v-if="taskChip.progress" class="agc-chip-badge">{{ taskChip.progress }}</span>
          <i class="fas fa-xmark agc-chip-x" aria-hidden="true" @click.stop="agent.closePanel()" title="Hide workspace"></i>
        </button>
      </div>

      <!-- V1.2 §8/§9: attachment previews (thumbnails + removable) -->
      <div v-if="agent.referenceImages.length || agent.projectZip" class="agc-atts" role="group" aria-label="Attached files">
        <div v-for="img in agent.referenceImages" :key="img.id" class="agc-att" :title="img.name">
          <img v-if="img.thumb" :src="img.thumb" :alt="`Reference image ${img.name}`" class="agc-att-thumb" />
          <span v-else class="agc-att-thumb placeholder"><i class="fas fa-image" aria-hidden="true"></i></span>
          <button class="agc-att-x" :aria-label="`Remove ${img.name}`" title="Remove image" @click="agent.removeReferenceImage(img.id)">
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
        <div v-if="agent.projectZip" class="agc-att zip" :title="agent.projectZip.name">
          <span class="agc-att-thumb placeholder"><i class="fas fa-file-zipper" aria-hidden="true"></i></span>
          <span class="agc-att-name">{{ clip(agent.projectZip.name, 22) }}</span>
          <button class="agc-att-x" aria-label="Remove project archive" title="Remove archive" @click="agent.removeProjectZip()">
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <textarea
        ref="ta"
        v-model="model.text"
        class="agc-input"
        :placeholder="placeholder"
        :disabled="disabled"
        rows="1"
        aria-label="Describe the task for the agent"
        @keydown="onKeydown"
        @input="autoGrow"
      ></textarea>

      <!-- action bar: attachments · safety controls · model · send/stop -->
      <div class="agc-bar">
      <div class="agc-bar-left">
        <div class="agc-plus-wrap">
          <button
            class="agc-plus"
            :aria-expanded="menuOpen ? 'true' : 'false'"
            aria-haspopup="menu"
            aria-label="More actions"
            title="More actions"
            @click="menuOpen = !menuOpen"
          ><i class="fas fa-plus" aria-hidden="true"></i></button>
          <div v-if="menuOpen" class="agc-menu" role="menu" aria-label="Composer actions">
            <button v-if="agent.activeTask" role="menuitem" class="ag-menu-item" @click="menuAction('download')">
              <i class="fas fa-file-zipper" aria-hidden="true"></i>
              <span>Download project (.zip)</span>
            </button>
            <button role="menuitem" class="ag-menu-item" @click="menuAction('workspace')">
              <i class="fas fa-table-columns" aria-hidden="true"></i>
              <span>Open workspace</span>
            </button>
            <button role="menuitem" class="ag-menu-item" @click="menuAction('example')">
              <i class="fas fa-wand-magic-sparkles" aria-hidden="true"></i>
              <span>Insert an example task</span>
            </button>
            <div class="ag-menu-sep" role="separator"></div>
            <button role="menuitem" class="ag-menu-item" @click="menuAction('chat')">
              <i class="fas fa-comment" aria-hidden="true"></i>
              <span>Back to Chat mode</span>
            </button>
          </div>
        </div>

        <!-- V1.2 §6: attachment controls (reference image + project zip) -->
        <div class="agc-attach-group" role="group" aria-label="Attach files">
          <button
            class="agc-icon-tool"
            :disabled="!canAttach || agent.uploadState === 'uploading'"
            title="Attach reference images (PNG, JPEG, WebP, GIF)"
            aria-label="Attach reference images"
            @click="pickImages"
          ><i class="fas" :class="visionCapable ? 'fa-image' : 'fa-image'" aria-hidden="true"></i></button>
          <button
            class="agc-icon-tool"
            :disabled="!canAttach || agent.uploadState === 'uploading'"
            title="Upload an existing project (.zip) for the agent to modify"
            aria-label="Upload an existing project archive"
            @click="pickZip"
          ><i class="fas fa-file-arrow-up" aria-hidden="true"></i></button>
          <span v-if="agent.uploadState === 'uploading'" class="agc-up-spin" role="status">
            <i class="fas fa-spinner fa-spin" aria-hidden="true"></i> uploading…
          </span>
        </div>

        <button
          class="agc-bypass"
          :class="{ on: agent.autoApprove }"
          :aria-pressed="agent.autoApprove ? 'true' : 'false'"
          title="Auto-approve the agent's high-risk command prompts for this task"
          @click="toggleAutoApprove"
        >
          <i class="fas fa-shield-halved" aria-hidden="true"></i>
          <span>{{ agent.autoApprove ? 'Auto-approve on' : 'Auto-approve' }}</span>
        </button> 
      </div>

      <div class="agc-bar-right">
        <!-- V1.2 §6: STOP replaces send while a task executes -->
        <button v-if="agent.isActive" class="agc-send stop" :aria-label="'Stop the running task'" :title="'Stop the task'" @click="stopRunning">
          <i class="fas fa-stop" aria-hidden="true"></i>
        </button>
        <button
          v-else
          class="agc-send"
          :disabled="!canSend"
          :aria-label="sendLabel"
          :title="sendLabel"
          @click="send"
        >
          <i class="fas fa-arrow-up" aria-hidden="true"></i>
        </button>
      </div>
      </div>

      <!-- upload / attachment errors (honest, dismissible) -->
      <div v-if="agent.uploadError" class="agc-err" role="alert">
        <i class="fas fa-triangle-exclamation" aria-hidden="true"></i>
        <span>{{ agent.uploadError }}</span>
        <button class="ag-icon-btn" aria-label="Dismiss upload error" @click="agent.uploadError = null"><i class="fas fa-xmark" aria-hidden="true"></i></button>
      </div>

      <!-- honest live-task hint -->
      <div v-if="agent.isActive" class="agc-hint" role="status">
        <span class="ag-dot warn" aria-hidden="true"></span>
        A task is running — follow its progress above, or stop it to start another.
      </div>
    </section>

    <template v-if="centered && !agent.isActive">
      <nav class="agc-categories" role="tablist" aria-label="Project categories">
        <button
          v-for="category in CATEGORIES"
          :key="category"
          class="agc-category"
          :class="{ active: selectedCategory === category }"
          role="tab"
          :aria-selected="selectedCategory === category"
          @click="selectCategory(category)"
        >{{ category }}</button>
      </nav>

      <div class="agc-projects" role="tabpanel" :aria-label="`${selectedCategory} project ideas`">
        <button
          v-for="project in visibleProjects"
          :key="project.id"
          class="agc-project"
          type="button"
          :aria-label="`Use the ${project.name} product starter`"
          @click="selectProject(project)"
        >
          <div class="agc-project-art" :class="project.theme">
            <div class="agc-art-nav">
              <span class="agc-art-mark"></span>
              <span>{{ project.brand }}</span>
              <span class="agc-art-nav-links">{{ project.nav }}</span>
            </div>
            <div class="agc-art-copy">
              <span class="agc-art-kicker">{{ project.kicker }}</span>
              <strong>{{ project.headline }}</strong>
              <span class="agc-art-description">{{ project.description }}</span>
              <span class="agc-art-cta">{{ project.cta }} <i class="fas fa-arrow-right" aria-hidden="true"></i></span>
            </div>
            <span class="agc-art-orbit" aria-hidden="true"></span>
            <div class="agc-art-features">
              <span v-for="feature in project.features" :key="feature"><i class="fas fa-check" aria-hidden="true"></i>{{ feature }}</span>
            </div>
            <div class="agc-art-foot"><span>{{ project.footer }}</span><span>KINYABOT</span></div>
          </div>
          <span class="agc-project-caption"><span>{{ project.name }}</span><i class="fas fa-arrow-up-right-from-square" aria-hidden="true"></i></span>
        </button>
      </div>
      <p v-if="selectedProjectName" class="agc-project-status" role="status" aria-live="polite">
        {{ selectedProjectName }} starter added to your prompt. Review it above and customize it before you build.
      </p>
    </template>

    <!-- V1.2 §7: task shortcut chips -->
    <div v-if="!centered && !agent.isActive" class="agc-presets" role="group" aria-label="Task shortcuts">
      <button
        v-for="p in PRESETS" :key="p.id"
        class="agc-preset"
        :class="{ active: activePreset === p.id }"
        :title="p.title"
        @click="applyPreset(p)"
      >
        <i class="fas" :class="p.icon" aria-hidden="true"></i>
        <span>{{ p.label }}</span>
      </button>
    </div>
    <div v-if="activePreset" class="agc-preset-note" role="status">
      <i class="fas fa-pen" aria-hidden="true"></i>
      Starter instruction inserted — edit it freely, then press Run. Nothing executes until you send.
      <button class="ag-icon-btn" aria-label="Clear preset" @click="clearPreset"><i class="fas fa-xmark" aria-hidden="true"></i></button>
    </div>
  </div>

  <!-- hidden pickers (real file inputs, click-triggered) -->
  <input ref="imgInput" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple class="agc-hidden-input" aria-hidden="true" tabindex="-1" @change="onImagesPicked" />
  <input ref="zipInput" type="file" accept=".zip,application/zip,application/x-zip-compressed" class="agc-hidden-input" aria-hidden="true" tabindex="-1" @change="onZipPicked" />
</template>

<script setup>
/**
 * KinyaBot Agent V1.2 — Composer Card
 * ─────────────────────────────────────
 * Keeps the reference's dark composer surface and adds the V1.2
 * capabilities — every control is REAL:
 *  • reference-image uploads (§8) — validated + stored server-side,
 *    fed to the vision model with the task
 *  • existing-project ZIP uploads (§9) — extracted into the task
 *    workspace and MODIFIED, not rebuilt
 *  • Stop while a task is executing (§6)
 *  • task shortcut chips (§7) that insert editable starter prompts —
 *    selecting a preset NEVER auto-starts a costly task
 */
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAgentStore } from '../../stores/agent'
import '../../assets/agent.css'

const props = defineProps({
  centered: { type: Boolean, default: false },   // empty-state hero variant
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['send', 'switch-chat'])

const agent = useAgentStore()
const ta = ref(null)
const menuOpen = ref(false)
const model = reactive({ text: '' })
const imgInput = ref(null)
const zipInput = ref(null)
const activePreset = ref(null)

/* ── §7 presets: compact chips, editable starter instructions ── */
const PRESETS = [
  { id: 'web', icon: 'fa-globe', label: 'Web Development', title: 'Build a responsive, polished website',
    prompt: 'Build a responsive, polished website based on my requirements. Create the required files (HTML, CSS, JS), verify the result, and make it available in the preview.' },
  { id: 'game', icon: 'fa-gamepad', label: 'Game Development', title: 'Build a playable browser game',
    prompt: 'Build a playable browser game with clean controls, a visible score/state, and a small win/lose condition. Use plain HTML/CSS/JavaScript unless I ask for a framework.' },
  { id: 'bug', icon: 'fa-bug', label: 'Bug Fixing', title: 'Fix a bug in existing code',
    prompt: 'Fix this bug: (describe the broken behavior, the file or the error output). Find the root cause, apply the smallest safe fix, and verify it actually resolves the issue.' },
  { id: 'refimg', icon: 'fa-clone', label: 'Build from Reference Image', title: 'Reproduce a design from a reference image',
    prompt: 'Reproduce the attached reference image as a functional web page: match the layout, spacing, colors, typography and components, but write real HTML/CSS/JavaScript (do not just embed the image).',
    needsImage: true },
  { id: 'improve', icon: 'fa-wand-magic-sparkles', label: 'Improve Existing Project', title: 'Upload a project and improve it',
    prompt: 'Improve the attached project: (describe the changes — redesign, responsiveness, performance, code quality). Edit the existing files rather than rebuilding, and verify nothing breaks.',
    needsZip: true },
  { id: 'uiux', icon: 'fa-palette', label: 'UI/UX Design', title: 'Design or restyle an interface',
    prompt: 'Design a modern, accessible UI for this concept: (describe the product). Produce the page(s) with a coherent design system (spacing, type scale, color tokens, states) and explain the key decisions.' },
  { id: 'api', icon: 'fa-server', label: 'API & Backend', title: 'Build an API or backend service',
    prompt: 'Build a small backend service with clean endpoints, input validation, and error handling. Include a way to run and test it, and verify each endpoint actually responds.' },
  { id: 'analyze', icon: 'fa-magnifying-glass-chart', label: 'Project Analysis', title: 'Analyze code or a project',
    prompt: 'Analyze the attached project and report its structure, frameworks, entry points, code quality issues, and concrete improvement recommendations. Do not change any files — read only.',
    needsZip: true },
  { id: 'research', icon: 'fa-book-open', label: 'Research and Build', title: 'Research online, then build',
    prompt: 'Research this topic online first (current documentation, best practices), then build the result using what you learned, citing which sources you used: (describe the task).' },
]

const CATEGORIES = [
  'Landing Page',
  'Knowledge/Teaching Material',
  '3D Modeling',
  'Mini Game',
  'Personal Blog',
]
const HEADLINES = [
  'What can I build for you?',
  'A product people can use?',
  'A smarter KinyaBot experience?',
  'Your next big idea?',
]
const PROJECTS = [
  { id: 'kinya-workspace', category: CATEGORIES[0], name: 'KinyaBot Workspace', brand: 'KINYABOT / WORKSPACE', nav: 'CHAT  PROJECTS  TEAM', kicker: 'YOUR WORK, IN FLOW', headline: 'Make space to build.', description: 'A team AI workspace with shared projects and live previews.', features: ['Shared projects', 'AI assistant', 'Live preview'], cta: 'Explore the workspace', footer: 'ONE SPACE. MORE MOMENTUM.', theme: 'iron', prompt: 'Build KinyaBot Workspace as a complete, usable product: a responsive team AI workspace with working project navigation, shared conversation views, an interactive project dashboard, and a live preview area. Use KinyaBot indigo, violet, and cyan branding. Implement real interactions and coherent empty/loading/error states; do not leave fake buttons or placeholder sections.' },
  { id: 'kinya-creator', category: CATEGORIES[0], name: 'KinyaBot for Creators', brand: 'KINYABOT / CREATE', nav: 'IDEAS  CANVAS  PUBLISH', kicker: 'FROM FIRST THOUGHT TO FINISH', headline: 'Bring it to life.', description: 'A creator studio for turning prompts into polished work.', features: ['Prompt library', 'Creation canvas', 'Export flow'], cta: 'Open the creator studio', footer: 'MADE TO MOVE IDEAS FORWARD', theme: 'retreat', prompt: 'Build KinyaBot for Creators as a complete interactive creator platform, not a static marketing mockup. Include a searchable prompt library, an editable creation canvas, working save/export actions, and a polished responsive landing experience. Use KinyaBot indigo-violet-cyan branding. Make every visible control work and verify the primary creation flow in preview.' },
  { id: 'kinya-business', category: CATEGORIES[0], name: 'KinyaBot for Business', brand: 'KINYABOT / BUSINESS', nav: 'SOLUTIONS  PRICING  SIGN IN', kicker: 'AI THAT WORKS WITH YOU', headline: 'Better work, together.', description: 'A practical AI toolkit for teams and growing businesses.', features: ['Team tools', 'Clear plans', 'Get started'], cta: 'See how it works', footer: 'BUILT FOR REAL WORKFLOWS', theme: 'atelier', prompt: 'Build KinyaBot for Business as a complete responsive product website with working feature navigation, a usable plan comparison, an interactive FAQ, and a functional sign-up/onboarding flow suitable for this project. Use KinyaBot indigo, violet, and cyan colors. Use realistic copy and working interactions; do not ship a static demo or dead-end buttons.' },
  { id: 'kinya-learn', category: CATEGORIES[1], name: 'KinyaBot Learn', brand: 'KINYABOT / LEARN', nav: 'MY LEARNING  LIBRARY  HELP', kicker: 'LEARN AT YOUR OWN PACE', headline: 'Knowledge, made clear.', description: 'Short lessons with progress you can pick up anytime.', features: ['Guided lessons', 'Saved progress', 'Quick quizzes'], cta: 'Continue learning', footer: 'SMALL STEPS. REAL PROGRESS.', theme: 'knowledge', prompt: 'Build KinyaBot Learn as a complete learning product with a lesson library, readable lesson pages, working quizzes, saved learning progress, and a helpful home dashboard. Use KinyaBot indigo-violet-cyan branding. Persist progress locally or through the available backend, make the learning flows genuinely usable, and verify them in preview.' },
  { id: 'kinya-help', category: CATEGORIES[1], name: 'KinyaBot Help Center', brand: 'KINYABOT / HELP', nav: 'GUIDES  TOPICS  CONTACT', kicker: 'ANSWERS WHEN YOU NEED THEM', headline: 'Find your next step.', description: 'A searchable, organized home for KinyaBot guidance.', features: ['Live search', 'Topic guides', 'Contact support'], cta: 'Browse help topics', footer: 'CLEAR ANSWERS. LESS FRICTION.', theme: 'lab', prompt: 'Build a complete KinyaBot Help Center with functional live article search, category filters, helpful article pages, related guides, and a working contact-support form with validation and clear feedback. Use KinyaBot brand colors and real, useful help content. Ensure the result works end-to-end in preview and is not just a visual demo.' },
  { id: 'kinya-academy', category: CATEGORIES[1], name: 'KinyaBot Academy', brand: 'KINYABOT / ACADEMY', nav: 'COURSES  PATHS  MY ACCOUNT', kicker: 'MAKE AI WORK FOR YOU', headline: 'Learn by doing.', description: 'Practical AI courses with hands-on checkpoints.', features: ['Course paths', 'Hands-on tasks', 'Completion state'], cta: 'Choose a learning path', footer: 'PRACTICE THAT BUILDS SKILL', theme: 'language', prompt: 'Build KinyaBot Academy as a usable course platform: course discovery and filters, structured lesson pages, interactive exercises, and persisted completion tracking. Include realistic beginner-friendly content and responsive layouts. Align to KinyaBot indigo, violet, and cyan. Do not use placeholder links or controls; verify the course-to-completion flow.' },
  { id: 'kinya-avatar', category: CATEGORIES[2], name: 'KinyaBot Avatar Studio', brand: 'KINYABOT / AVATAR STUDIO', nav: 'AVATARS  EDITOR  EXPORT', kicker: 'MEET YOUR DIGITAL COMPANION', headline: 'Shape your Kinya.', description: 'A hands-on 3D character studio with live controls.', features: ['Orbit controls', 'Expression picker', 'Save avatar'], cta: 'Customize the avatar', footer: 'INTERACTIVE 3D CHARACTER STUDIO', theme: 'model', prompt: 'Build KinyaBot Avatar Studio as a working interactive 3D character customization product. Provide a real orbitable 3D character (use available project assets if suitable), functional expression and appearance controls, reset, and save/load customization. Use KinyaBot brand colors and accessible controls. Avoid a static 3D image or dead buttons; run and verify the preview.' },
  { id: 'kinya-world', category: CATEGORIES[2], name: 'KinyaBot Worlds', brand: 'KINYABOT / WORLDS', nav: 'WORLDS  BUILD  SHARE', kicker: 'STEP INTO YOUR IDEAS', headline: 'Create a world.', description: 'Explore and customize a small interactive 3D scene.', features: ['Scene picker', 'Camera controls', 'Save a scene'], cta: 'Enter the 3D workspace', footer: 'A PLAYABLE SPACE TO CREATE', theme: 'orbit', prompt: 'Build KinyaBot Worlds as a complete interactive 3D scene editor with selectable scenes, working camera/orbit controls, configurable scene elements, and save/reset actions. Use the available project stack and assets where possible, add accessible non-3D controls, and ensure it runs in the preview. This must be a usable product, not a static visual concept.' },
  { id: 'kinya-showcase', category: CATEGORIES[2], name: 'KinyaBot Showcase', brand: 'KINYABOT / SHOWCASE', nav: 'COLLECTION  DETAILS  ABOUT', kicker: 'A CLOSER LOOK', headline: 'Every detail, in view.', description: 'An interactive 3D product viewer for KinyaBot devices.', features: ['Rotate model', 'Feature hotspots', 'Compare views'], cta: 'Explore the model', footer: 'BUILT FOR CURIOUS HANDS', theme: 'archive', prompt: 'Build a complete KinyaBot-branded 3D product showcase with a rotatable model or a useful procedural model if no asset exists, working feature hotspots, view controls, and a responsive details panel. Include meaningful fallbacks and keyboard-accessible controls. Do not substitute a static mockup; verify actual interactions in preview.' },
  { id: 'kinya-quest', category: CATEGORIES[3], name: 'KinyaBot Quest', brand: 'KINYABOT / QUEST', nav: 'PLAY  QUESTS  PROFILE', kicker: 'YOUR NEXT CHALLENGE AWAITS', headline: 'Think. Choose. Discover.', description: 'A complete story game with choices and saved progress.', features: ['Branching story', 'Real choices', 'Save progress'], cta: 'Start your quest', footer: 'A STORY THAT RESPONDS TO YOU', theme: 'game', prompt: 'Build KinyaBot Quest as a complete playable branching-story game. Include multiple meaningful choices and endings, working navigation, saved progress, restart/continue actions, and a clear accessible game interface. Use KinyaBot brand colors and original story content. No fake controls: verify a complete playthrough in preview.' },
  { id: 'kinya-brain', category: CATEGORIES[3], name: 'KinyaBot Brain Sprint', brand: 'KINYABOT / BRAIN SPRINT', nav: 'PLAY  DAILY  SCORES', kicker: 'A QUICK TEST OF YOUR WITS', headline: 'Beat your best.', description: 'Daily bite-sized quizzes with score history.', features: ['Timed rounds', 'Score history', 'Daily challenge'], cta: 'Play a round', footer: 'ONE MORE QUESTION?', theme: 'arcade', prompt: 'Build KinyaBot Brain Sprint as a complete quiz game with original questions, functional answer input, scoring, timer, results, replay, and persistent best scores. Include a daily challenge and mobile-friendly accessible controls. Use KinyaBot indigo-violet-cyan branding. Verify a full round works; do not leave demo-only interactions.' },
  { id: 'kinya-puzzle', category: CATEGORIES[3], name: 'KinyaBot Puzzle Lab', brand: 'KINYABOT / PUZZLE LAB', nav: 'PUZZLES  HINTS  STATS', kicker: 'A NEW PUZZLE, EVERY DAY', headline: 'Find the pattern.', description: 'A replayable logic puzzle with helpful hints.', features: ['Playable board', 'Useful hints', 'Win tracking'], cta: 'Solve today’s puzzle', footer: 'THINK IT THROUGH TOGETHER', theme: 'words', prompt: 'Build KinyaBot Puzzle Lab as a genuinely playable logic puzzle product with a working board, rules, hint system, win detection, new/replay puzzle actions, and persisted stats. Make it responsive and keyboard accessible, use KinyaBot brand colors, and test the game loop in preview. Do not deliver a static demo.' },
  { id: 'kinya-journal', category: CATEGORIES[4], name: 'KinyaBot Journal', brand: 'KINYABOT / JOURNAL', nav: 'MY JOURNAL  SAVED  SETTINGS', kicker: 'A QUIETER PLACE TO THINK', headline: 'Keep what matters.', description: 'A private-feeling journal with drafts and search.', features: ['Rich entries', 'Search notes', 'Saved drafts'], cta: 'Write a new entry', footer: 'YOUR WORDS, YOUR SPACE', theme: 'blog', prompt: 'Build KinyaBot Journal as a complete personal journaling app with create/edit/delete entries, autosaved drafts, search, tags, and a usable entry reader. Persist content in the available backend or local storage. Include empty and confirmation states, responsive accessible UI, and KinyaBot branding. Verify the full create-to-search flow; no placeholder controls.' },
  { id: 'kinya-stories', category: CATEGORIES[4], name: 'KinyaBot Stories', brand: 'KINYABOT / STORIES', nav: 'COMMUNITY  STORIES  SHARE', kicker: 'IDEAS WORTH PASSING ON', headline: 'Stories bring us closer.', description: 'A community reading space for useful human stories.', features: ['Story feed', 'Topic filters', 'Reading list'], cta: 'Explore the stories', footer: 'A COMMUNITY BUILT ON SHARING', theme: 'travel', prompt: 'Build KinyaBot Stories as a complete community story-reading product: a filterable article feed, readable story pages, functional bookmarks/reading list, and a working submit-story flow with validation and clear status. Persist bookmarks where possible, use realistic original content, and apply KinyaBot brand colors. Ensure no dead controls and verify the full reader flow.' },
  { id: 'kinya-notes', category: CATEGORIES[4], name: 'KinyaBot Field Notes', brand: 'KINYABOT / FIELD NOTES', nav: 'NOTES  COLLECTIONS  SEARCH', kicker: 'CATCH A THOUGHT BEFORE IT GOES', headline: 'Notes that find their way.', description: 'A searchable notebook for prompts and project ideas.', features: ['Quick capture', 'Collections', 'Export notes'], cta: 'Open your notebook', footer: 'FROM THOUGHT TO NEXT STEP', theme: 'food', prompt: 'Build KinyaBot Field Notes as a complete personal notes app for capturing prompts and ideas, with create/edit/delete, searchable notes, collections, and working export. Persist data locally or through the available backend, make the mobile flow excellent, use KinyaBot indigo-violet-cyan branding, and verify actual save/search/export behavior.' },
]

const headlineIndex = ref(0)
const activeHeadline = computed(() => HEADLINES[headlineIndex.value])
const selectedProjectName = ref('')
let headlineTimer
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
function syncHeadlineMotion() {
  window.clearInterval(headlineTimer)
  headlineTimer = undefined
  if (!motionQuery.matches) {
    headlineTimer = window.setInterval(() => {
      headlineIndex.value = (headlineIndex.value + 1) % HEADLINES.length
    }, 3600)
  }
}

const selectedCategory = ref(CATEGORIES[0])
const visibleProjects = computed(() => PROJECTS.filter(project => project.category === selectedCategory.value))

/* Real provider/model info from GET /agent/config. */
onMounted(() => {
  if (!agent.agentConfig) agent.fetchConfig()
  syncHeadlineMotion()
  motionQuery.addEventListener('change', syncHeadlineMotion)
})
const modelLabel = computed(() => {
  const cfg = agent.agentConfig
  if (!cfg?.model) return 'Groq'
  const short = String(cfg.model).replace(/^(openai\/|groq\/)/, '')
  return short.length > 22 ? short.slice(0, 21) + '…' : short
})
const modelTitle = computed(() => `Provider: ${agent.agentConfig?.provider || 'groq'} · Model: ${agent.agentConfig?.model || '(configured server-side)'}`)
const visionCapable = computed(() => agent.agentConfig?.vision?.capable === true)

/* Task context chip (adapts the reference's attachment chips). */
const taskChip = computed(() => {
  const t = agent.activeTask
  if (!t) return null
  const plan = t.plan || []
  let progress = null
  if (plan.length) {
    const done = plan.filter(s => s.status === 'done').length
    progress = `${Math.round((done / plan.length) * 100)}%`
  } else if (agent.isActive) progress = 'live'
  const name = String(t.title || t.prompt || 'workspace')
  return { name: name.length > 26 ? name.slice(0, 25) + '…' : name, progress }
})

const placeholder = computed(() =>
  agent.isActive ? 'The agent is working — stop it to start another…' : 'Describe the task — the agent will plan, build and verify it…')

const canAttach = computed(() => agent.agentConfig?.uploads?.enabled !== false && !props.disabled)
const canSend = computed(() => !props.disabled && !agent.isActive && model.text.trim().length > 0)
const sendLabel = computed(() => agent.isActive ? 'A task is already running' : 'Start the agent task')

/* Auto-grow textarea */
function autoGrow() {
  const el = ta.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 220) + 'px'
}

function onKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
  if (e.key === 'Escape') menuOpen.value = false
}

function clip(s, n) { return String(s || '').length > n ? String(s).slice(0, n - 1) + '…' : String(s || '') }

function send() {
  const content = model.text.trim()
  if (!content || !canSend.value) return
  const payload = {
    content, mode: 'agent',
    referenceImageIds: agent.referenceImages.map(r => r.id),
    projectZipId: agent.projectZip?.id || null,
  }
  emit('send', payload)
  model.text = ''
  activePreset.value = null
  requestAnimationFrame(autoGrow)
}

/* V1.2 §6: stop the running task (real endpoint, honest settling). */
async function stopRunning() {
  try { await agent.stopTask('Task stopped by the user from the composer') } catch {}
}

async function toggleAutoApprove() {
  agent.autoApprove = !agent.autoApprove
  if (agent.autoApprove && agent.pendingConfirmation) {
    // A prompt is already waiting — approve it right away (real API).
    await agent.resolveConfirmation(true)
  }
}

function menuAction(action) {
  menuOpen.value = false
  if (action === 'download') {
    agent.downloadTask().catch(() => {})
  } else if (action === 'workspace') {
    agent.openPanel()
  } else if (action === 'chat') {
    emit('switch-chat')
  } else if (action === 'example') {
    model.text = 'Create a modern single-page website for a Rwandan coffee brand — hero, product cards, and a contact section. Verify the result and leave it available in the preview.'
    requestAnimationFrame(autoGrow)
    ta.value?.focus()
  }
}

/* ── §7: preset selection inserts an EDITABLE starter prompt ── */
function applyPreset(p) {
  activePreset.value = p.id
  model.text = p.prompt
  requestAnimationFrame(autoGrow)
  ta.value?.focus()
  // Guidance when the preset expects an attachment that isn't there yet
  if (p.needsImage && !agent.referenceImages.length && canAttach.value) {
    agent.uploadError = 'Tip: attach one or more reference images with the image button — they guide the design.'
    setTimeout(() => { if (agent.uploadError?.startsWith('Tip:')) agent.uploadError = null }, 6000)
  }
  if (p.needsZip && !agent.projectZip && canAttach.value) {
    agent.uploadError = 'Tip: upload your existing project (.zip) with the archive button so the agent improves it.'
    setTimeout(() => { if (agent.uploadError?.startsWith('Tip:')) agent.uploadError = null }, 6000)
  }
}
function clearPreset() {
  activePreset.value = null
  model.text = ''
  requestAnimationFrame(autoGrow)
}

function selectCategory(category) {
  selectedCategory.value = category
  selectedProjectName.value = ''
}

function selectProject(project) {
  model.text = `${project.prompt}\n\nBuild this as a complete working product, not a static mockup or demo. Make every visible control functional, use realistic content, persist user data where appropriate, follow KinyaBot's indigo, violet, and cyan branding, and verify the key user flows in the preview.`
  activePreset.value = null
  selectedProjectName.value = project.name
  requestAnimationFrame(() => {
    autoGrow()
    ta.value?.focus()
  })
}

/* ── §8/§9: real file pickers + uploads ── */
function pickImages() { imgInput.value?.click() }
function pickZip() { zipInput.value?.click() }

async function onImagesPicked(e) {
  const files = [...(e.target.files || [])]
  e.target.value = ''
  for (const f of files) {
    try { await agent.uploadReferenceImage(f) } catch (err) { break }
  }
}
async function onZipPicked(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (f) { try { await agent.uploadProjectZip(f) } catch {} }
}

/* close the + menu on outside click */
function onDocClick(e) {
  if (menuOpen.value && !e.target.closest?.('.agc-plus-wrap')) menuOpen.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  window.clearInterval(headlineTimer)
  motionQuery.removeEventListener('change', syncHeadlineMotion)
})

defineExpose({ focus: () => ta.value?.focus(), setText: (t) => { model.text = t; requestAnimationFrame(autoGrow) } })
</script>

<style scoped>
/* Composer surface and controls */
.agc {
  background: #ffffff;
  color: #18181b;
  border-radius: 22px;
  padding: 14px 16px 12px;
  box-shadow: 0 12px 34px rgba(0,0,0,.45), 0 2px 8px rgba(0,0,0,.3);
  display: flex; flex-direction: column; gap: 10px;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
  position: relative;
  font-family: var(--ag-font);
}
.agc.centered { max-width: 640px; }

/* greeting (reference ss4) */
.agc-greet {
  font-size: 21px;
  color: #3f3f46;
  padding: 4px 4px 0;
}

/* task context chips row */
.agc-chips { display: flex; gap: 10px; flex-wrap: wrap; padding: 2px 2px 0; }
.agc-chip {
  display: inline-flex; align-items: center; gap: 8px;
  background: #f4f4f5;
  border: 1.5px solid #e4e4e7;
  border-radius: 12px;
  padding: 8px 10px;
  font-family: var(--ag-font); font-size: 12.5px; color: #3f3f46;
  cursor: pointer;
  transition: border-color .12s, background .12s;
  max-width: 100%;
}
.agc-chip:hover { border-color: #c9c9cf; background: #ececee; }
.agc-chip.live { border-color: #10b981; }
.agc-chip.live .agc-chip-badge { background: #d1fae5; color: #047857; }
.agc-chip i { color: #71717a; font-size: 12px; }
.agc-chip-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.agc-chip-badge {
  font-family: var(--ag-mono); font-size: 10.5px; font-weight: 700;
  background: #e4e4e7; color: #2563eb;
  padding: 2px 7px; border-radius: 999px; flex-shrink: 0;
}
.agc-chip-x { font-size: 10px; color: #a1a1aa; padding: 2px; }
.agc-chip-x:hover { color: #52525b; }

/* V1.2: attachment previews */
.agc-atts { display: flex; gap: 8px; flex-wrap: wrap; padding: 2px 2px 0; }
.agc-att {
  position: relative;
  display: inline-flex; align-items: center; gap: 8px;
  background: #f4f4f5; border: 1.5px solid #e4e4e7; border-radius: 12px;
  padding: 5px 8px 5px 5px;
}
.agc-att-thumb {
  width: 42px; height: 42px; border-radius: 8px; object-fit: cover; display: block;
  background: #e4e4e7;
}
.agc-att-thumb.placeholder {
  display: grid; place-items: center; color: #71717a; font-size: 15px;
}
.agc-att.zip { padding: 6px 8px 6px 6px; }
.agc-att-name {
  font-size: 11.5px; color: #3f3f46; max-width: 150px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.agc-att-x {
  width: 18px; height: 18px; border-radius: 50%;
  border: none; background: #d4d4d8; color: #3f3f46;
  display: grid; place-items: center; font-size: 9px; cursor: pointer;
  flex-shrink: 0; transition: background .12s;
}
.agc-att-x:hover { background: #a1a1aa; color: #fff; }

/* the input */
.agc-input {
  width: 100%;
  border: none; outline: none; resize: none;
  background: transparent;
  font-family: var(--ag-font);
  font-size: 16.5px;
  line-height: 1.5;
  color: #111827;
  padding: 4px 4px 0;
  min-height: 28px;
  max-height: 220px;
  overflow-y: auto;
}
.agc-input::placeholder { color: #a1a1aa; }
.agc-input:disabled { opacity: .6; }
.agc-input:focus-visible { outline: none; }

/* action bar */
.agc-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
}
.agc-bar-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.agc-bar-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

/* circular + button (reference) */
.agc-plus-wrap { position: relative; }
.agc-plus {
  width: 40px; height: 40px; border-radius: 50%;
  background: #e4e4e7; color: #27272a;
  display: grid; place-items: center;
  font-size: 15px; cursor: pointer; border: none;
  transition: background .12s, transform .1s;
  flex-shrink: 0;
}
.agc-plus:hover { background: #d4d4d8; }
.agc-plus:active { transform: scale(.95); }

/* V1.2: attachment tool buttons */
.agc-attach-group { display: inline-flex; align-items: center; gap: 6px; }
.agc-icon-tool {
  width: 34px; height: 34px; border-radius: 10px;
  background: none; border: 1.5px solid #e4e4e7; color: #52525b;
  display: grid; place-items: center; font-size: 13.5px; cursor: pointer;
  transition: border-color .12s, color .12s, background .12s;
}
.agc-icon-tool:hover:not(:disabled) { border-color: #a1a1aa; color: #18181b; background: #f4f4f5; }
.agc-icon-tool:disabled { opacity: .45; cursor: default; }
.agc-up-spin { font-size: 11.5px; color: #71717a; white-space: nowrap; }

.agc-menu {
  position: absolute; bottom: calc(100% + 10px); left: 0;
  min-width: 240px;
  background: #18181b; color: #e4e4e7;
  border: 1px solid #2b2b30;
  border-radius: 14px;
  padding: 6px;
  box-shadow: 0 18px 44px rgba(0,0,0,.5);
  z-index: 40;
  animation: ag-menu-in .14s ease;
}
@keyframes ag-menu-in { from { opacity: 0; transform: translateY(5px) } to { opacity: 1; transform: none } }
.ag-menu-item {
  display: flex; align-items: center; gap: 10px;
  width: 100%; text-align: left;
  background: none; border: none; color: #d4d4d8;
  font-size: 13.5px; font-family: var(--ag-font);
  padding: 9px 11px; border-radius: 9px; cursor: pointer;
}
.ag-menu-item:hover { background: #26262b; color: #fff; }
.ag-menu-item i { width: 16px; text-align: center; font-size: 12.5px; color: #a1a1aa; }
.ag-menu-sep { height: 1px; background: #2b2b30; margin: 5px 8px; }

/* shield toggle */
.agc-bypass {
  display: inline-flex; align-items: center; gap: 7px;
  background: none; border: none; cursor: pointer;
  font-family: var(--ag-font); font-size: 13.5px; font-weight: 500;
  color: #52525b;
  padding: 6px 4px;
  border-radius: 8px;
  transition: color .12s;
}
.agc-bypass:hover { color: #18181b; }
.agc-bypass i { font-size: 13px; }
.agc-bypass.on { color: #047857; }
.agc-bypass.on i { color: #059669; }

/* model chip */
.agc-model {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; color: #71717a;
  font-weight: 500;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 220px;
  cursor: default;
}
.agc-model i { font-size: 10px; color: #a1a1aa; }

/* send / stop */
.agc-send {
  width: 38px; height: 38px; border-radius: 50%;
  border: none; cursor: pointer;
  background: #18181b; color: #fff;
  display: grid; place-items: center;
  font-size: 14px;
  transition: background .12s, transform .1s, opacity .12s;
  flex-shrink: 0;
}
.agc-send:hover:not(:disabled) { background: #000; }
.agc-send:active:not(:disabled) { transform: scale(.94); }
.agc-send:disabled { background: #e4e4e7; color: #a1a1aa; cursor: default; }
.agc-send.stop { background: #dc2626; }
.agc-send.stop:hover { background: #b91c1c; }

/* upload error row */
.agc-err {
  display: flex; align-items: flex-start; gap: 8px;
  background: #fef2f2; border: 1px solid #fecaca; color: #991b1b;
  border-radius: 10px; padding: 8px 10px; font-size: 12.5px; line-height: 1.45;
}
.agc-err i { margin-top: 2px; flex-shrink: 0; }
.agc-err button { margin-left: auto; }

/* live-task hint */
.agc-hint {
  display: flex; align-items: center; gap: 8px;
  font-size: 12.5px; color: #71717a;
  padding: 2px 4px 0;
}

/* V1.2 §7: task shortcut chips */
.agc-presets {
  display: flex; flex-wrap: wrap; gap: 7px;
  padding: 2px 2px 0;
}
.agc-preset {
  display: inline-flex; align-items: center; gap: 7px;
  background: #fafafa;
  border: 1.5px solid #e4e4e7;
  border-radius: 999px;
  padding: 7px 12px;
  font-family: var(--ag-font); font-size: 12.5px; font-weight: 500; color: #3f3f46;
  cursor: pointer;
  transition: border-color .12s, background .12s, color .12s;
}
.agc-preset i { font-size: 11.5px; color: #71717a; }
.agc-preset:hover { border-color: #a1a1aa; background: #f4f4f5; }
.agc-preset.active { border-color: #18181b; color: #18181b; background: #f4f4f5; }
.agc-preset.active i { color: #18181b; }

.agc-preset-note {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: #71717a;
  padding: 2px 4px 0;
}
.agc-preset-note i { flex-shrink: 0; font-size: 11px; }
.agc-preset-note button { margin-left: auto; flex-shrink: 0; }

.agc-hidden-input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }

/* focus visibility (accessibility) */
.agc :focus-visible { outline: 2px solid #18181b; outline-offset: 2px; }

@media (max-width: 560px) {
  .agc { border-radius: 18px; padding: 12px 12px 10px; }
  .agc-greet { font-size: 18px; }
  .agc-input { font-size: 15.5px; }
  .agc-model { max-width: 110px; }
  .agc-bypass span { display: none; }
  .agc-bypass { padding: 8px; border-radius: 50%; }
  .agc-attach-group { gap: 4px; }
  .agc-icon-tool { width: 32px; height: 32px; }
  .agc-preset { font-size: 11.5px; padding: 6px 10px; }
}

/* Dark build studio and the new-chat project gallery. */
.agc {
  background: transparent;
  color: var(--text-1);
  padding: 0;
  gap: 25px;
  box-shadow: none;
  max-width: 720px;
}
.agc.centered { max-width: 1180px; }
.agc-hero-heading { text-align: center; }
.agc-hero-heading h1 {
  margin: 0;
  min-height: 1.12em;
  overflow: hidden;
  color: var(--text-1);
  font: 600 clamp(2.6rem, 5.1vw, 4.4rem)/1.12 var(--font);
  letter-spacing: -.055em;
  white-space: nowrap;
}
.agc-hero-heading h1 > span {
  display: inline-block;
  background: var(--gradient-ai);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.agc-hero-heading p {
  margin: 24px 0 0;
  color: var(--text-2);
  font-size: 17px;
  line-height: 1.5;
}
.agc-cycle-enter-active, .agc-cycle-leave-active { transition: opacity .28s ease, transform .28s ease; }
.agc-cycle-enter-from { opacity: 0; transform: translateY(65%); }
.agc-cycle-leave-to { opacity: 0; transform: translateY(-65%); }
.agc-card {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 17px 20px 14px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface-secondary);
  color: var(--text-1);
  box-shadow: var(--shadow-md);
}
.agc.centered .agc-card { max-width: 1000px; align-self: center; }
.agc-input {
  color: var(--text-1);
  font-size: 17px;
  min-height: 58px;
  padding: 2px 4px 0;
}
.agc-input::placeholder { color: var(--text-3); }
.agc-bar { min-height: 38px; }
.agc-bar-left, .agc-bar-right { gap: 10px; }
.agc-plus {
  width: 34px;
  height: 34px;
  background: transparent;
  color: var(--text-2);
  font-size: 17px;
}
.agc-plus:hover { background: var(--bg-hover); color: var(--text-1); }
.agc-icon-tool {
  width: 34px;
  height: 34px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-2);
  font-size: 15px;
}
.agc-icon-tool:hover:not(:disabled) { border-color: var(--border-md); color: var(--text-1); background: var(--bg-hover); }
.agc-bypass { color: var(--text-2); }
.agc-bypass:hover { color: var(--text-1); }
.agc-bypass.on, .agc-bypass.on i { color: var(--success); }
.agc-model { color: var(--text-2); }
.agc-model i { color: var(--brand-text); }
.agc-send {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--brand);
  color: var(--on-brand);
}
.agc-send:hover:not(:disabled) { background: var(--brand-strong); }
.agc-send:disabled { background: var(--bg-hover); color: var(--text-3); opacity: 1; }
.agc-send.stop { background: #dc2626; color: #fff; }
.agc-chips { padding: 0; }
.agc-chip, .agc-att {
  background: var(--surface);
  border-color: var(--border);
  color: var(--text-1);
}
.agc-chip:hover { background: var(--bg-hover); border-color: var(--border-md); }
.agc-chip i { color: var(--text-2); }
.agc-chip.live { border-color: var(--success); }
.agc-chip.live .agc-chip-badge { background: var(--brand-soft); color: var(--brand-text); }
.agc-chip-badge { background: var(--brand-soft); color: var(--brand-text); }
.agc-att-thumb { background: var(--surface-secondary); }
.agc-att-thumb.placeholder { color: var(--text-2); }
.agc-att-name { color: var(--text-1); }
.agc-att-x { background: var(--bg-hover); color: var(--text-1); }
.agc-att-x:hover { background: var(--border-md); }
.agc-up-spin, .agc-hint { color: var(--text-2); }
.agc-err { background: var(--surface-secondary); border-color: var(--error); color: var(--error); }
.agc :focus-visible { outline-color: var(--brand-hover); }
.agc-menu { background: var(--surface-elevated); border-color: var(--border); color: var(--text-1); }
.ag-menu-item { color: var(--text-2); }
.ag-menu-item:hover { background: var(--bg-hover); color: var(--text-1); }
.ag-menu-item i { color: var(--brand-text); }
.ag-menu-sep { background: var(--border); }

.agc-categories {
  width: 100%;
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 0 0 1px;
  scrollbar-width: none;
}
.agc-categories::-webkit-scrollbar { display: none; }
.agc-category {
  flex: 0 0 auto;
  padding: 10px 15px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: transparent;
  color: var(--text-3);
  font: 600 14px var(--ag-font);
  cursor: pointer;
  transition: color .15s, background .15s, border-color .15s;
}
.agc-category:hover { color: var(--text-1); border-color: var(--border-md); }
.agc-category.active { color: var(--brand-text); background: var(--brand-soft); border-color: var(--brand-ring); }
.agc-projects {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  width: 100%;
}
.agc-project {
  min-width: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 15px;
  background: var(--surface);
  color: var(--text-1);
  text-align: left;
  cursor: pointer;
  transition: transform .18s ease, border-color .18s ease, box-shadow .18s ease;
}
.agc-project:hover {
  transform: translateY(-3px);
  border-color: var(--brand-text);
  box-shadow: var(--shadow-md), 0 0 0 1px var(--brand-ring);
}
.agc-project-art {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 216px;
  overflow: hidden;
  padding: 13px 14px 11px;
  isolation: isolate;
  background: radial-gradient(ellipse at 70% 90%, #30353b 0, transparent 45%), #101012;
}
.agc-project-art::before {
  position: absolute;
  z-index: -1;
  content: '';
  inset: 0;
  opacity: .45;
  background: linear-gradient(135deg, var(--brand-soft), transparent 55%, rgba(34,211,238,.12));
}
.agc-art-nav, .agc-art-foot {
  display: flex;
  align-items: center;
  gap: 7px;
  color: rgba(255,255,255,.72);
  font: 600 7px/1.3 var(--ag-mono);
  letter-spacing: .08em;
}
.agc-art-mark { width: 7px; height: 7px; border-radius: 2px; background: linear-gradient(135deg, #22d3ee, #8b5cf6); }
.agc-art-nav-links { margin-left: auto; opacity: .75; text-align: right; }
.agc-art-copy { position: relative; z-index: 1; max-width: 62%; }
.agc-art-kicker {
  display: block;
  margin-bottom: 8px;
  color: var(--brand-hover);
  font: 600 7px/1.3 var(--ag-mono);
  letter-spacing: .17em;
}
.agc-art-copy strong {
  display: block;
  color: #f2efe8;
  font: 500 clamp(24px, 2.5vw, 36px)/.95 Georgia, 'Times New Roman', serif;
  letter-spacing: -.045em;
}
.agc-art-cta {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-top: 13px;
  color: #c4b5fd;
  font: 500 8px/1.4 var(--ag-font);
  letter-spacing: .03em;
}
.agc-art-cta i { font-size: 7px; }
.agc-art-description {
  display: block;
  max-width: 30ch;
  margin-top: 8px;
  color: rgba(255,255,255,.78);
  font: 400 9px/1.45 var(--ag-font);
}
.agc-art-features {
  position: absolute;
  z-index: 1;
  left: 14px;
  bottom: 34px;
  display: flex;
  gap: 4px;
  max-width: calc(100% - 28px);
  overflow: hidden;
}
.agc-art-features span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 5px;
  border: 1px solid rgba(165,180,252,.28);
  border-radius: 6px;
  background: rgba(11,16,32,.64);
  color: #e0e7ff;
  font: 500 7px/1.25 var(--ag-font);
  white-space: nowrap;
  flex: 0 1 auto;
}
.agc-art-features i { color: #67e8f9; font-size: 6px; }
.agc-art-orbit {
  position: absolute;
  z-index: 0;
  right: -48px;
  bottom: -110px;
  width: 210px;
  height: 210px;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 50%;
  box-shadow: 0 0 0 20px rgba(255,255,255,.025), 0 0 0 42px rgba(255,255,255,.02);
}
.agc-art-foot { justify-content: space-between; opacity: .7; font-size: 6px; }
.agc-project-art.iron { background: radial-gradient(ellipse at 92% 20%, #4a2011 0, transparent 33%), #111112; }
.agc-project-art.iron .agc-art-copy strong { font-family: Impact, 'Arial Narrow', sans-serif; letter-spacing: -.025em; text-transform: uppercase; }
.agc-project-art.iron .agc-art-kicker, .agc-project-art.iron .agc-art-cta { color: #f47a3d; }
.agc-project-art.retreat { background: linear-gradient(180deg, #8a8980 0%, #c3b6a0 43%, #514e43 70%, #242824 100%); }
.agc-project-art.retreat::before { opacity: .9; background: linear-gradient(180deg, transparent 32%, rgba(22,29,27,.18) 53%, #151b19 100%); }
.agc-project-art.retreat .agc-art-copy { text-align: center; align-self: center; }
.agc-project-art.retreat .agc-art-copy strong { font-size: clamp(30px, 3vw, 42px); }
.agc-project-art.retreat .agc-art-cta { justify-content: center; }
.agc-project-art.atelier { background: radial-gradient(ellipse at 50% 100%, #4b482b 0, transparent 55%), #101911; }
.agc-project-art.atelier .agc-art-copy { text-align: center; align-self: center; max-width: 100%; }
.agc-project-art.atelier .agc-art-copy strong { color: #e6dfc5; font-size: clamp(27px, 2.8vw, 39px); }
.agc-project-art.atelier .agc-art-kicker, .agc-project-art.atelier .agc-art-cta { color: #c8b84b; }
.agc-project-art.knowledge, .agc-project-art.lab, .agc-project-art.language { background: linear-gradient(145deg, #172b34, #284c52 55%, #142326); }
.agc-project-art.lab { background: radial-gradient(ellipse at 80% 25%, #deab5a 0, transparent 28%), linear-gradient(145deg, #463c2e, #9b7447); }
.agc-project-art.language { background: linear-gradient(145deg, #3d3248, #69536f 55%, #211d2e); }
.agc-project-art.model, .agc-project-art.orbit, .agc-project-art.archive { background: radial-gradient(circle at 68% 56%, #8f6e58 0, #4d3e39 17%, transparent 18%), linear-gradient(145deg, #27252a, #111114); }
.agc-project-art.orbit { background: radial-gradient(circle at 72% 54%, #d4a553 0, #8d562c 12%, transparent 13%), radial-gradient(ellipse at 70% 80%, #39336c, transparent 55%), #11121c; }
.agc-project-art.archive { background: radial-gradient(circle at 66% 57%, #c6b89b 0, #63594c 18%, transparent 19%), linear-gradient(145deg, #39352c, #191815); }
.agc-project-art.game, .agc-project-art.arcade, .agc-project-art.words { background: radial-gradient(circle at 80% 54%, #8cc86c 0, #34734c 12%, transparent 13%), linear-gradient(145deg, #142b26, #101713); }
.agc-project-art.arcade { background: radial-gradient(circle at 75% 52%, #dd6bc3 0, #6048a2 13%, transparent 14%), linear-gradient(145deg, #1d1741, #111023); }
.agc-project-art.words { background: radial-gradient(circle at 76% 53%, #e1ae48 0, #a46a38 13%, transparent 14%), linear-gradient(145deg, #46301e, #211c19); }
.agc-project-art.blog, .agc-project-art.travel, .agc-project-art.food { background: radial-gradient(ellipse at 80% 80%, #827154 0, transparent 45%), linear-gradient(145deg, #392f27, #171513); }
.agc-project-art.travel { background: radial-gradient(ellipse at 80% 65%, #7d9b91 0, transparent 42%), linear-gradient(145deg, #31433d, #151b19); }
.agc-project-art.food { background: radial-gradient(circle at 78% 58%, #c78e51 0, #77492d 13%, transparent 14%), linear-gradient(145deg, #493527, #211914); }
.agc-project-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 11px 13px;
  color: var(--text-1);
  font-size: 12px;
  font-weight: 600;
}
.agc-project-caption i { color: var(--brand-text); font-size: 10px; }
.agc-project-status {
  margin: -10px 0 0;
  color: var(--text-2);
  font-size: 12px;
  text-align: right;
}
.agc-preset { background: var(--surface-secondary); border-color: var(--border); color: var(--text-2); }
.agc-preset i { color: var(--text-2); }
.agc-preset:hover { border-color: var(--brand-text); background: var(--brand-soft); }
.agc-preset.active { background: var(--brand-soft); border-color: var(--brand-text); color: var(--text-1); }
.agc-preset.active i { color: var(--brand-text); }
.agc-preset-note { color: #b4b4b8; }
.agc-preset-note :deep(.ag-icon-btn) { color: #b4b4b8; }

@media (max-width: 760px) {
  .agc { gap: 18px; }
  .agc-hero-heading h1 { font-size: clamp(1.2rem, 6vw, 3.2rem); }
  .agc-hero-heading p { margin-top: 12px; font-size: 14px; }
  .agc-art-copy { max-width: 65%; }
  .agc-projects { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
  .agc-project-art { min-height: 180px; padding: 10px; }
  .agc-project-caption { padding: 9px 10px; font-size: 11px; }
  .agc-category { padding: 8px 11px; font-size: 12px; }
  .agc-card { padding: 14px 13px 12px; }
  .agc-input { min-height: 52px; font-size: 15.5px; }
  .agc-bar-left { gap: 2px; }
  .agc-model { max-width: 110px; font-size: 11px; }
  .agc-bypass span { display: none; }
}

@media (max-width: 420px) {
  .agc-projects { grid-template-columns: 1fr; }
  .agc-project-art { min-height: 200px; }
  .agc-hero-heading h1 { font-size: clamp(1.1rem, 5.8vw, 1.5rem); }
  .agc-art-copy { max-width: 68%; }
  .agc-hero-heading p { font-size: 13px; }
  .agc-attach-group { gap: 0; }
  .agc-icon-tool { width: 30px; }
  .agc-model { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .agc-cycle-enter-active, .agc-cycle-leave-active { transition: none; }
}
</style>
