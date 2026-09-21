<template>
  <!-- Image attachment (auth-fetched blob → object URL) -->
  <div v-if="kind === 'image'" class="att-image">
    <div v-if="loading" class="att-skeleton"><i class="fas fa-image"></i></div>
    <img v-else-if="src" :src="src" class="attach-img" alt="Attached image" @click="$emit('open', src)" />
    <div v-else class="att-unavail">
      <i class="fas fa-image"></i>
      <span>Image unavailable</span>
    </div>
  </div>

  <!-- Audio attachment -->
  <div v-else-if="kind === 'audio'" class="attach-file">
    <i class="fas fa-headphones"></i>
    <span class="af-name">{{ name }}</span>
    <button v-if="src" class="af-btn" @click="playPause" :aria-label="playing ? 'Pause audio' : 'Play audio'">
      <i :class="playing ? 'fas fa-pause' : 'fas fa-play'"></i>
    </button>
    <a v-else :href="href" download class="af-btn" aria-label="Download audio"><i class="fas fa-download"></i></a>
  </div>

  <!-- Document attachment -->
  <div v-else class="attach-file">
    <i class="fas fa-file-lines"></i>
    <span class="af-name">
      {{ name }}
      <small v-if="pages">· {{ pages }} pages</small>
    </span>
    <button class="af-btn" @click="download" aria-label="Download document" title="Download">
      <i class="fas fa-download"></i>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { loadAttachmentUrl, downloadAttachment } from '../utils/attachments'

const props = defineProps({
  attachment: { type: Object, default: null },  // new structured attachments
  legacyUrl:  { type: String, default: null }   // old file_url messages
})
defineEmits(['open'])

const item = computed(() => props.attachment || (props.legacyUrl ? { kind: guessKind(props.legacyUrl), url: props.legacyUrl, name: fileName(props.legacyUrl) } : null))

function guessKind(url) {
  if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) return 'image'
  if (/\.(mp3|wav|m4a|ogg|webm|flac|aac|mp4)$/i.test(url)) return 'audio'
  return 'document'
}
function fileName(url) { return decodeURIComponent(String(url || '').split('/').pop() || 'file') }

const kind  = computed(() => item.value?.kind || 'document')
const url   = computed(() => item.value?.url || '')
const name  = computed(() => item.value?.name || fileName(url.value))
const pages = computed(() => item.value?.pages || null)
const href  = computed(() => url.value)

const loading = ref(false)
const src = ref(null)

onMounted(async () => {
  if (kind.value === 'image' && url.value) {
    loading.value = true
    src.value = await loadAttachmentUrl(url.value)
    loading.value = false
  } else if (kind.value === 'audio' && url.value) {
    loading.value = true
    src.value = await loadAttachmentUrl(url.value)
    loading.value = false
  }
})

/* Audio playback (single global element) */
const playing = ref(false)
let audioEl = null
function playPause() {
  if (!src.value) return
  if (audioEl && !audioEl.paused) { audioEl.pause(); playing.value = false; return }
  if (!audioEl) {
    audioEl = new Audio(src.value)
    audioEl.onended = () => { playing.value = false }
  }
  audioEl.play().then(() => { playing.value = true }).catch(() => { playing.value = false })
}
onBeforeUnmount(() => { if (audioEl) { audioEl.pause(); audioEl = null } })

function download() { downloadAttachment(url.value, name.value) }
</script>

<style scoped>
.att-image { display:flex; }
.attach-img { max-width:240px; max-height:200px; border-radius:var(--r-sm); cursor:zoom-in; transition:opacity .2s; }
.attach-img:hover { opacity:.9; }
.att-skeleton {
  width:200px; height:150px; border-radius:var(--r-sm);
  background:var(--bg-card); border:1px solid var(--border);
  display:flex; align-items:center; justify-content:center; color:var(--text-3);
}
.att-unavail {
  display:inline-flex; align-items:center; gap:7px;
  padding:8px 12px; border-radius:var(--r-sm);
  background:var(--bg-card); border:1px solid var(--border);
  color:var(--text-3); font-size:12px;
}
.attach-file { display:inline-flex; align-items:center; gap:8px; background:var(--bg-card); border:1px solid var(--border-md); border-radius:var(--r-sm); padding:8px 12px; font-size:12.5px; color:var(--text-2); max-width:280px; }
.af-name { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.af-name small { color:var(--text-3); }
.af-btn { background:none; border:none; color:var(--blue); cursor:pointer; padding:3px 5px; border-radius:5px; font-size:12px; transition:all .15s; flex-shrink:0; }
.af-btn:hover { background:var(--bg-hover); color:var(--text-1); }
</style>
