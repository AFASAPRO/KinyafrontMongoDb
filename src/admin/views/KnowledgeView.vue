<template>
  <div class="kv-view">
    <div class="top-grid">
      <SectionCard title="Add knowledge" subtitle="Teach KinyaBot something new">
        <div class="kbf">
          <label>Title</label>
          <input v-model="form.title" class="inp" placeholder="e.g. KinyaBot FAQ" />
        </div>
        <div class="kbf">
          <label>Content (text)</label>
          <textarea v-model="form.content" class="inp" rows="4" placeholder="Paste facts, FAQ text or any knowledge the AI should use…"></textarea>
        </div>
        <div class="kbf">
          <label>Or upload a file (.txt, .md, .csv, .json, code)</label>
          <input type="file" class="inp file" accept=".txt,.md,.csv,.json,.py,.js,.ts,.html,.css" @change="e => file = e.target.files[0]" />
        </div>
        <button class="btn full" :disabled="uploading || !form.title || (!form.content && !file)" @click="upload">
          <i v-if="uploading" class="fas fa-spinner fa-spin"></i><i v-else class="fas fa-plus"></i>
          {{ uploading ? 'Adding…' : 'Add to Knowledge Base' }}
        </button>
      </SectionCard>

      <SectionCard title="Status">
        <div class="stats">
          <div class="stat"><i class="fas fa-book"></i><b>{{ fmtNum(d?.stats?.docs) }}</b><span>documents</span></div>
          <div class="stat"><i class="fas fa-align-left"></i><b>{{ fmtNum(d?.stats?.chars) }}</b><span>indexed chars</span></div>
          <div class="stat"><i class="fas fa-file"></i><b>{{ fmtNum(d?.stats?.files) }}</b><span>file sources</span></div>
          <div class="stat"><i class="fas fa-magnifying-glass"></i><b>{{ d?.stats?.rag_enabled ? 'ON' : 'OFF' }}</b><span>RAG in chat</span></div>
        </div>
        <p class="note"><i class="fas fa-circle-info"></i> Documents are searchable by the AI instantly after the text is stored. “Needs review” means a file was kept but no text could be extracted from it.</p>
        <button class="btn ghost" @click="toggleRag" :disabled="togglingRag">
          <i class="fas" :class="d?.stats?.rag_enabled ? 'fa-toggle-on' : 'fa-toggle-off'"></i>
          {{ d?.stats?.rag_enabled ? 'Disable RAG in chat' : 'Enable RAG in chat' }}
        </button>
      </SectionCard>
    </div>

    <div class="toolbar">
      <div class="search"><i class="fas fa-search"></i>
        <input v-model="q" placeholder="Search documents…" @input="debouncedSearch" />
      </div>
      <span class="count">{{ fmtNum(total) }} documents</span>
    </div>

    <ErrorState v-if="error" :message="error.message" :status-code="error.status" @retry="load" />
    <div v-if="loading && !data" class="skel-table"><div v-for="i in 4" :key="i" class="skel-row"></div></div>

    <div v-else-if="data" class="doc-grid" :class="{ empty: isEmpty }">
      <div v-for="doc in docs" :key="doc.id" class="doc">
        <div class="doc-icon"><i class="fas" :class="doc.state === 'indexed' ? 'fa-file-circle-check' : 'fa-file-circle-question'"></i></div>
        <div class="doc-body">
          <div class="doc-title">{{ doc.title }}</div>
          <div class="doc-meta">
            <span class="badge" :class="doc.state === 'indexed' ? 'green' : 'amber'">{{ doc.state === 'indexed' ? 'Indexed' : 'Needs review' }}</span>
            <span>{{ doc.file_type }}</span> · <span>{{ fmtNum(doc.size_chars) }} chars</span> · <span>{{ timeAgo(doc.created_at) }}</span>
          </div>
        </div>
        <button class="tb danger" title="Delete" @click="askDelete(doc)"><i class="fas fa-trash"></i></button>
      </div>
      <EmptyState v-if="isEmpty" icon="fas fa-book" title="No documents yet"
        :hint="q ? `Nothing matches “${q}”.` : 'Add knowledge so the AI can answer questions about your product, policies or data.'" />
    </div>

    <Pagination :page="page" :pages="pages" @change="p => { page = p; load() }" />
    <ConfirmModal :open="!!confirm" v-bind="confirmProps" @cancel="confirm = null" @confirm="runDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api, { apiError } from '../api'
import SectionCard from '../components/SectionCard.vue'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import Pagination from '../components/Pagination.vue'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useToast } from '../composables/useToast'
import { useDebounced } from '../composables/useResource'
import { fmtNum, timeAgo } from '../format'

const toast = useToast()
const q = ref(''), page = ref(1), pages = ref(1), total = ref(0)
const data = ref(null), loading = ref(false), error = ref(null)
const docs = computed(() => data.value?.items || [])
const isEmpty = computed(() => data.value && !docs.value.length)

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data: d } = await api.get('/admin/knowledge', { params: { page: page.value, search: q.value } })
    data.value = d; total.value = d.total; pages.value = d.pages
  } catch (e) { error.value = apiError(e) }
  finally { loading.value = false }
}
const debouncedSearch = useDebounced(() => { page.value = 1; load() }, 300)

const form = ref({ title: '', content: '' })
const file = ref(null)
const uploading = ref(false)
async function upload() {
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('title', form.value.title)
    if (form.value.content) fd.append('content', form.value.content)
    if (file.value) fd.append('file', file.value)
    await api.post('/admin/knowledge', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    form.value = { title: '', content: '' }; file.value = null
    toast.success('Knowledge added')
    page.value = 1; load()
  } catch (e) { toast.error(apiError(e).message) }
  finally { uploading.value = false }
}

const togglingRag = ref(false)
async function toggleRag() {
  togglingRag.value = true
  const next = !data.value?.stats?.rag_enabled
  try {
    await api.put('/admin/settings', { knowledge_base_enabled: next })
    toast.success(next ? 'RAG enabled' : 'RAG disabled')
    load()
  } catch (e) { toast.error(apiError(e).message) }
  finally { togglingRag.value = false }
}

const confirm = ref(null)
const confirmProps = computed(() => confirm.value || {})
function askDelete(doc) {
  confirm.value = {
    title: 'Remove knowledge?', tone: 'danger', confirmLabel: 'Delete',
    message: `Remove “${doc.title}” from the knowledge base? The AI will no longer use it.`,
    meta: { id: doc.id },
  }
}
async function runDelete() {
  const c = confirm.value
  confirm.value = null
  if (!c) return
  try {
    await api.delete(`/admin/knowledge/${c.meta.id}`)
    toast.success('Document removed')
    load()
  } catch (e) { toast.error(apiError(e).message) }
}
onMounted(load)
</script>

<style scoped>
.kv-view { display:flex; flex-direction:column; gap:16px; }
.top-grid { display:grid; grid-template-columns:1.2fr 1fr; gap:16px; }
@media (max-width:980px) { .top-grid { grid-template-columns:1fr; } }
.kbf { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
.kbf label { font-size:12px; font-weight:700; color:var(--text-2); }
.inp { background:var(--surface); border:1px solid var(--border); color:var(--text-1); border-radius:10px; padding:10px 12px; font-size:13.5px; outline:none; width:100%; }
.inp:focus { border-color:var(--brand); }
.inp.file { padding:8px; }
textarea.inp { resize:vertical; }
.btn.full { width:100%; justify-content:center; }
.stats { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:12px; }
.stat { background:var(--surface); border:1px solid var(--border); border-radius:12px; padding:12px 14px; display:flex; flex-direction:column; gap:2px; }
.stat i { color:var(--brand-text); font-size:13px; margin-bottom:4px; }
.stat b { font-size:18px; color:var(--text-1); }
.stat span { font-size:11px; color:var(--text-3); }
.note { font-size:12px; color:var(--text-3); margin:0 0 12px; line-height:1.55; }
.note i { color:var(--brand-text); margin-right:5px; }
.toolbar { display:flex; gap:10px; align-items:center; }
.search { flex:1; display:flex; align-items:center; gap:9px; background:var(--surface-secondary); border:1px solid var(--border); border-radius:11px; padding:9px 13px; color:var(--text-3); }
.search input { flex:1; background:transparent; border:0; outline:0; color:var(--text-1); font-size:13.5px; }
.count { font-size:12.5px; color:var(--text-3); white-space:nowrap; }
.doc-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
@media (max-width:800px) { .doc-grid { grid-template-columns:1fr; } }
.doc { display:flex; align-items:center; gap:12px; background:var(--surface-secondary); border:1px solid var(--border); border-radius:14px; padding:14px; }
.doc-icon { width:42px; height:42px; border-radius:12px; background:var(--brand-soft); color:var(--brand-text); display:flex; align-items:center; justify-content:center; font-size:17px; flex:none; }
.doc-body { flex:1; min-width:0; }
.doc-title { font-weight:700; color:var(--text-1); font-size:13.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.doc-meta { font-size:11.5px; color:var(--text-3); margin-top:4px; display:flex; gap:5px; align-items:center; flex-wrap:wrap; }
</style>
