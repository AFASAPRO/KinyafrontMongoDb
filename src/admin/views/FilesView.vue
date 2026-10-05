<template>
  <div class="fv">
    <div class="top-stats">
      <StatCard label="Storage used" :display="fmtSize(d?.total_size)" icon="fas fa-database" :loading="loading" />
      <StatCard label="Files" :value="d?.total" icon="fas fa-folder-open" :loading="loading" />
      <StatCard label="Images" :value="countKind('image')" icon="fas fa-image" :loading="loading" />
      <StatCard label="Documents" :value="countKind('document')" icon="fas fa-file-lines" :loading="loading" />
      <StatCard label="Audio / video" :value="countKind('audio')" icon="fas fa-music" :loading="loading" />
    </div>

    <div class="toolbar">
      <div class="search"><i class="fas fa-search"></i>
        <input v-model="q" placeholder="Search file name…" @input="debouncedSearch" />
      </div>
      <select v-model="kind" class="sel" @change="page = 1; load()">
        <option value="">All types</option>
        <option value="image">Images</option>
        <option value="document">Documents</option>
        <option value="audio">Audio / video</option>
        <option value="other">Other</option>
      </select>
    </div>

    <ErrorState v-if="error" :message="error.message" :status-code="error.status" @retry="load" />
    <div v-if="loading && !data" class="grid"><div v-for="i in 8" :key="i" class="fcard skel"></div></div>

    <div v-else-if="data" class="grid" :class="{ empty: isEmpty }">
      <div v-for="f in files" :key="f.name" class="fcard">
        <div class="thumb">
          <img v-if="f.kind === 'image' && blobs[f.name]" :src="blobs[f.name]" alt="" loading="lazy" />
          <i v-else class="fas" :class="f.kind === 'image' ? 'fa-image' : f.kind === 'audio' ? 'fa-music' : f.kind === 'document' ? 'fa-file-lines' : 'fa-file'"></i>
        </div>
        <div class="finfo">
          <div class="fname" :title="f.name">{{ f.name }}</div>
          <div class="fmeta">{{ fmtSize(f.size) }} · {{ timeAgo(f.created) }}</div>
        </div>
        <div class="facts">
          <button class="tb" title="View" @click="view(f)"><i class="fas fa-eye"></i></button>
          <button class="tb danger" title="Delete" @click="askDelete(f)"><i class="fas fa-trash"></i></button>
        </div>
      </div>
      <EmptyState v-if="isEmpty" icon="fas fa-folder-open" title="No files found"
        :hint="q || kind ? 'Try clearing the filters.' : 'Files users attach in chat are stored and shown here.'" />
    </div>

    <Pagination :page="page" :pages="pages" @change="p => { page = p; load() }" />
    <ConfirmModal :open="!!confirm" v-bind="confirmProps" @cancel="confirm = null" @confirm="runDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import api, { apiError, fileUrl } from '../api'
import StatCard from '../components/StatCard.vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import Pagination from '../components/Pagination.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useToast } from '../composables/useToast'
import { useDebounced } from '../composables/useResource'
import { fmtSize, timeAgo } from '../format'

const toast = useToast()
const q = ref(''), kind = ref('')
const page = ref(1), pages = ref(1)
const data = ref(null), loading = ref(false), error = ref(null)
const files = computed(() => data.value?.files || [])
const isEmpty = computed(() => data.value && !files.value.length)
function countKind(k) {
  if (!data.value) return null
  // totals come from the server for the current filter; kind counts are
  // computed from the current page — honest about what is loaded.
  return files.value.filter(f => f.kind === k).length + (k === kind.value ? 0 : 0)
}

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data: d } = await api.get('/admin/files', { params: { page: page.value, search: q.value, type: kind.value } })
    data.value = d; pages.value = d.pages
    d.files?.filter(f => f.kind === 'image').slice(0, 12).forEach(loadBlob)
  } catch (e) { error.value = apiError(e) }
  finally { loading.value = false }
}
const debouncedSearch = useDebounced(() => { page.value = 1; load() }, 300)

const blobs = reactive({})
async function loadBlob(f) {
  if (blobs[f.name]) return
  try {
    const res = await api.get(`/files/${encodeURIComponent(f.name)}`, { responseType: 'blob' })
    blobs[f.name] = URL.createObjectURL(res.data)
  } catch {}
}
function view(f) {
  const existing = blobs[f.name]
  if (existing) return window.open(existing, '_blank')
  loadBlob(f).then(() => { if (blobs[f.name]) window.open(blobs[f.name], '_blank') })
}

const confirm = ref(null)
const confirmProps = computed(() => confirm.value || {})
function askDelete(f) {
  confirm.value = {
    title: 'Delete file?', tone: 'danger', confirmLabel: 'Delete',
    message: `Delete “${f.name}” (${fmtSize(f.size)}) from storage? Chat messages referencing it will lose the attachment.`,
    meta: { name: f.name },
  }
}
async function runDelete() {
  const c = confirm.value
  confirm.value = null
  if (!c) return
  try {
    await api.delete(`/admin/files/${encodeURIComponent(c.meta.name)}`)
    toast.success('File deleted')
    load()
  } catch (e) { toast.error(apiError(e).message) }
}
onMounted(load)
</script>

<style scoped>
.fv { display:flex; flex-direction:column; gap:14px; }
.top-stats { display:grid; grid-template-columns:repeat(5, 1fr); gap:12px; }
@media (max-width:1000px) { .top-stats { grid-template-columns:repeat(2, 1fr); } }
.toolbar { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.search { flex:1; min-width:200px; display:flex; align-items:center; gap:9px; background:var(--surface-secondary); border:1px solid var(--border); border-radius:11px; padding:9px 13px; color:var(--text-3); }
.search input { flex:1; background:transparent; border:0; outline:0; color:var(--text-1); font-size:13.5px; }
.sel { background:var(--surface-secondary); border:1px solid var(--border); color:var(--text-1); border-radius:11px; padding:9px 12px; font-size:13px; outline:none; }
.grid { display:grid; grid-template-columns:repeat(4, 1fr); gap:12px; }
@media (max-width:1000px) { .grid { grid-template-columns:repeat(3, 1fr); } }
@media (max-width:640px) { .grid { grid-template-columns:repeat(2, 1fr); } }
.fcard { background:var(--surface-secondary); border:1px solid var(--border); border-radius:14px; overflow:hidden; display:flex; flex-direction:column; min-width:0; }
.fcard.skel { height:180px; background:linear-gradient(90deg, var(--surface-secondary) 25%, var(--surface-elevated) 50%, var(--surface-secondary) 75%); background-size:200% 100%; animation:sksh 1.4s infinite; }
.thumb { height:110px; background:var(--surface); display:flex; align-items:center; justify-content:center; color:var(--text-3); font-size:26px; overflow:hidden; }
.thumb img { width:100%; height:100%; object-fit:cover; }
.finfo { padding:10px 12px 6px; min-width:0; flex:1; }
.fname { font-size:12px; font-weight:700; color:var(--text-1); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.fmeta { font-size:10.5px; color:var(--text-3); margin-top:3px; }
.facts { display:flex; gap:6px; padding:8px 10px 10px; }
@keyframes sksh { 0% { background-position:200% 0 } 100% { background-position:-200% 0 } }
</style>
