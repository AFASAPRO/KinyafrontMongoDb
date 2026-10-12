<template>
  <div class="ag-files">
    <!-- ── Toolbar ─────────────────────────────────────────────── -->
    <div class="f-tools">
      <div class="f-crumb">
        <i class="fas fa-folder-tree" aria-hidden="true"></i>
        <span>{{ selected ? selected.path : 'workspace' }}</span>
        <span class="dim">{{ agent.files.count }} item{{ agent.files.count === 1 ? '' : 's' }}</span>
      </div>
      <div class="f-actions">
        <button class="f-btn" title="Refresh" aria-label="Refresh file tree" @click="agent.fetchFiles()">
          <i class="fas fa-rotate" aria-hidden="true"></i>
        </button>
        <button class="f-btn" title="New file" aria-label="Create a file" @click="startCreate()">
          <i class="fas fa-file-circle-plus" aria-hidden="true"></i>
        </button>
        <button v-if="selected" class="f-btn" title="Back to tree" aria-label="Back to file tree" @click="selected = null">
          <i class="fas fa-arrow-left" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <!-- ── Create form ─────────────────────────────────────────── -->
    <form v-if="creating" class="f-create" @submit.prevent="submitCreate">
      <i class="fas fa-file" aria-hidden="true"></i>
      <input v-model="createPath" placeholder="path/to/new-file.ext" spellcheck="false" autocomplete="off" />
      <button type="submit" class="f-btn go" :disabled="!createPath.trim() || busy"><i class="fas fa-check" aria-hidden="true"></i></button>
      <button type="button" class="f-btn" @click="creating = false"><i class="fas fa-xmark" aria-hidden="true"></i></button>
    </form>

    <!-- ── File tree (§6) ─────────────────────────────────────── -->
    <div v-if="!selected" class="f-tree" role="tree" aria-label="Workspace files">
      <div v-if="!agent.files.entries?.length" class="f-empty">
        <i class="fas fa-folder-open" aria-hidden="true"></i>
        <p>The workspace is empty.</p>
        <p class="dim">Files the Agent creates appear here in real time.</p>
      </div>
      <button
        v-for="e in agent.files.entries"
        :key="e.path"
        class="f-row"
        role="treeitem"
        :aria-expanded="e.type === 'dir' ? 'false' : undefined"
        @click="e.type === 'file' ? openFile(e) : (openDirs.has(e.path) ? openDirs.delete(e.path) : openDirs.add(e.path))"
      >
        <i :class="fileIcon(e)" aria-hidden="true"></i>
        <span class="f-name">{{ e.name }}</span>
        <span class="f-path dim">{{ e.path }}</span>
        <span class="f-size dim">{{ fmtSize(e.size) }}</span>
      </button>
    </div>

    <!-- ── File viewer / editor ────────────────────────────────── -->
    <div v-else class="f-view">
      <div class="f-view-head">
        <span class="f-view-name"><i class="fas fa-file-code" aria-hidden="true"></i> {{ selected.name }}</span>
        <div class="f-actions">
          <button v-if="!editing" class="f-btn" title="Edit file" @click="beginEdit()"><i class="fas fa-pen" aria-hidden="true"></i></button>
          <button v-if="!editing" class="f-btn danger" title="Delete file" @click="removeFile()"><i class="fas fa-trash" aria-hidden="true"></i></button>
          <button v-if="editing" class="f-btn go" title="Save" :disabled="busy" @click="saveEdit()"><i class="fas fa-check" aria-hidden="true"></i></button>
          <button v-if="editing" class="f-btn" title="Cancel edit" @click="cancelEdit()"><i class="fas fa-xmark" aria-hidden="true"></i></button>
        </div>
      </div>
      <textarea
        v-if="editing"
        v-model="editBuffer"
        class="f-editor"
        spellcheck="false"
        aria-label="File editor"
      ></textarea>
      <pre v-else class="f-content">{{ fileContent }}</pre>
      <div v-if="fileError" class="f-error"><i class="fas fa-triangle-exclamation" aria-hidden="true"></i> {{ fileError }}</div>
      <div v-if="saveNote" class="f-note"><i class="fas fa-circle-check" aria-hidden="true"></i> {{ saveNote }}</div>
    </div>
  </div>
</template>

<script setup>
/**
 * KinyaBot Agent V1 — Files Tab (§5, §6, §9)
 * Real workspace files via the Agent API: browse the tree, read any
 * file, create files, edit files (§9: edits are targeted, existing
 * content preserved), delete files. Nothing is simulated — every
 * operation hits the workspace on the server.
 */
import { ref, reactive } from 'vue'
import { useAgentStore } from '../../stores/agent'

const agent = useAgentStore()
const selected = ref(null)       // tree entry currently open
const fileContent = ref('')
const fileError = ref('')
const saveNote = ref('')
const editing = ref(false)
const editBuffer = ref('')
const busy = ref(false)
const creating = ref(false)
const createPath = ref('')
const openDirs = reactive(new Set())

function fileIcon(e) {
  if (e.type === 'dir') return openDirs.has(e.path) ? 'fas fa-folder-open dir-ic' : 'fas fa-folder dir-ic'
  const ext = (e.name.split('.').pop() || '').toLowerCase()
  if (['html', 'htm'].includes(ext)) return 'fas fa-file-code html-ic'
  if (['js', 'mjs', 'cjs', 'ts', 'jsx', 'tsx'].includes(ext)) return 'fas fa-file-code js-ic'
  if (['css', 'scss'].includes(ext)) return 'fas fa-file-code css-ic'
  if (['json'].includes(ext)) return 'fas fa-file-code json-ic'
  if (['md', 'txt'].includes(ext)) return 'fas fa-file-lines txt-ic'
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'fas fa-file-image img-ic'
  return 'fas fa-file'
}

async function openFile(entry) {
  selected.value = entry
  fileError.value = ''
  saveNote.value = ''
  editing.value = false
  try {
    const data = await agent.readFile(entry.path)
    fileContent.value = data.content ?? ''
  } catch (err) {
    fileContent.value = ''
    fileError.value = err?.response?.data?.error || 'The file could not be read.'
  }
}

function beginEdit() {
  editBuffer.value = fileContent.value
  editing.value = true
}
function cancelEdit() { editing.value = false }

async function saveEdit() {
  if (!selected.value || busy.value) return
  busy.value = true
  fileError.value = ''
  try {
    await agent.editFile(selected.value.path, editBuffer.value)
    fileContent.value = editBuffer.value
    editing.value = false
    saveNote.value = 'Saved to the workspace.'
    setTimeout(() => { saveNote.value = '' }, 2500)
  } catch (err) {
    fileError.value = err?.response?.data?.error || 'The file could not be saved.'
  } finally { busy.value = false }
}

async function removeFile() {
  if (!selected.value || busy.value) return
  if (!window.confirm(`Delete ${selected.value.path}? This cannot be undone.`)) return
  busy.value = true
  try {
    await agent.deleteFile(selected.value.path)
    selected.value = null
    await agent.fetchFiles()
  } catch (err) {
    fileError.value = err?.response?.data?.error || 'The file could not be deleted.'
  } finally { busy.value = false }
}

function startCreate() { creating.value = true; createPath.value = '' }

async function submitCreate() {
  const p = createPath.value.trim().replace(/^\/+/, '')
  if (!p || busy.value) return
  busy.value = true
  fileError.value = ''
  try {
    await agent.writeFile(p, '')
    creating.value = false
    await agent.fetchFiles()
    const entry = agent.files.entries?.find(e => e.path === p)
    if (entry) await openFile(entry)
  } catch (err) {
    fileError.value = err?.response?.data?.error || 'The file could not be created.'
  } finally { busy.value = false }
}

function fmtSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}
</script>

<style scoped>
.ag-files { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

.f-tools, .f-view-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 8px; padding: 8px 12px;
  border-bottom: 1px solid var(--border-subtle, #172033);
  background: var(--surface-secondary, #111827);
}
:global(.light-mode) .f-tools, :global(.light-mode) .f-view-head { background: #F3F5F9; border-bottom-color: #E3E7EF; }

.f-crumb { display: flex; align-items: center; gap: 7px; min-width: 0; font-size: 12px; color: var(--text-secondary); }
.f-crumb i { color: var(--brand); }
.f-crumb span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.f-crumb .dim { flex-shrink: 0; font-size: 11px; }

.f-actions { display: flex; gap: 4px; flex-shrink: 0; }
.f-btn {
  display: grid; place-items: center;
  width: 28px; height: 28px; border-radius: var(--r-xs, 6px);
  background: transparent; border: none; color: var(--text-muted);
  cursor: pointer; font-size: 12.5px;
  transition: background .12s, color .12s;
}
.f-btn:hover { background: var(--surface-elevated, #151B2B); color: var(--text-primary); }
.f-btn.go:hover { color: var(--success, #22C55E); }
.f-btn.danger:hover { color: var(--error, #EF4444); }
.f-btn:disabled { opacity: .4; cursor: default; }

.f-create { display: flex; align-items: center; gap: 6px; padding: 7px 12px; border-bottom: 1px solid var(--border-subtle, #172033); }
.f-create i { color: var(--text-muted); font-size: 12px; }
.f-create input {
  flex: 1; min-width: 0; background: var(--bg-input, #0B1020); color: var(--text-primary);
  border: 1px solid var(--border, #1F2937); border-radius: var(--r-xs, 6px);
  padding: 5px 9px; font-size: 12px; font-family: var(--font-mono, monospace);
  outline: none;
}
.f-create input:focus { border-color: var(--brand); }

.f-tree { flex: 1; overflow-y: auto; padding: 6px; }
.f-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: var(--text-muted); font-size: 13px; text-align: center; padding: 24px; }
.f-empty i { font-size: 26px; opacity: .5; }
.f-empty .dim { font-size: 12px; }

.f-row {
  display: flex; align-items: center; gap: 8px;
  width: 100%; text-align: left;
  padding: 6px 8px; border: none; border-radius: var(--r-xs, 6px);
  background: transparent; cursor: pointer;
  color: var(--text-secondary); font-size: 12.5px;
}
.f-row:hover { background: var(--surface-elevated, #151B2B); color: var(--text-primary); }
.f-row i { width: 16px; text-align: center; font-size: 12px; flex-shrink: 0; }
.dir-ic { color: var(--warning, #F59E0B); }
.html-ic { color: #E44D26; } .js-ic { color: #F7DF1E; } .css-ic { color: #38BDF8; }
.json-ic { color: #A78BFA; } .txt-ic { color: var(--text-muted); } .img-ic { color: #34D399; }
.f-name { flex-shrink: 0; max-width: 45%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.f-path { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10.5px; opacity: .6; }
.f-size { flex-shrink: 0; font-size: 10.5px; opacity: .7; }

.f-view { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.f-view-name { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text-primary); font-family: var(--font-mono, monospace); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.f-view-name i { color: var(--brand); }

.f-content, .f-editor {
  flex: 1; margin: 0; padding: 12px;
  overflow: auto;
  font-family: var(--font-mono, monospace); font-size: 12px; line-height: 1.6;
  color: var(--code-text, #E2E8F0);
  background: var(--code-bg, #0A0F1A);
  white-space: pre-wrap; word-break: break-word;
  border: none; outline: none; resize: none;
  tab-size: 2;
}
:global(.light-mode) .f-content, :global(.light-mode) .f-editor { background: #FFF; color: #2A3446; }

.f-error { display: flex; gap: 7px; align-items: center; padding: 8px 12px; color: var(--error, #EF4444); font-size: 12px; background: rgba(239,68,68,.08); }
.f-note { display: flex; gap: 7px; align-items: center; padding: 8px 12px; color: var(--success, #22C55E); font-size: 12px; background: rgba(34,197,94,.08); }
</style>
