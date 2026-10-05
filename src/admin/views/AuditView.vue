<template>
  <div class="av">
    <div class="toolbar">
      <div class="search"><i class="fas fa-magnifying-glass"></i>
        <input v-model="actionQ" placeholder="Filter by action (e.g. user.ban)…" @input="debouncedSearch" />
      </div>
      <div class="search slim"><i class="fas fa-user"></i>
        <input v-model="actorQ" placeholder="Actor…" @input="debouncedSearch" />
      </div>
    </div>

    <div class="notice"><i class="fas fa-lock"></i> Audit records are immutable — they are created automatically for every administrative action and can never be edited or deleted through this console.</div>

    <ErrorState v-if="error" :message="error.message" :status-code="error.status" @retry="load" />
    <div v-if="loading && !data" class="skel-table"><div v-for="i in 6" :key="i" class="skel-row"></div></div>

    <div v-else-if="data" class="table-wrap" :class="{ empty: isEmpty }">
      <table>
        <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Resource</th><th>Result</th><th></th></tr></thead>
        <tbody>
          <tr v-for="a in items" :key="a.id" class="arow" @click="expanded = expanded === a.id ? null : a.id">
            <td class="muted nowrap">{{ timeAgo(a.created_at) }}</td>
            <td><b>{{ a.actor_username || 'system' }}</b></td>
            <td><code class="action">{{ a.action }}</code></td>
            <td class="muted">
              <template v-if="a.resource_label">{{ a.resource_type }} · {{ a.resource_label }}</template>
              <template v-else-if="a.resource_type">{{ a.resource_type }} {{ a.resource_id ? '· ' + shortId(a.resource_id) : '' }}</template>
              <template v-else>—</template>
            </td>
            <td><span class="badge" :class="a.result === 'success' ? 'green' : 'red'">{{ a.result }}</span></td>
            <td><i class="fas" :class="expanded === a.id ? 'fa-chevron-up' : 'fa-chevron-down'"></i></td>
          </tr>
          <tr v-if="expanded === a.id" class="meta-row" :key="a.id + '-meta'">
            <td colspan="6">
              <pre class="meta">{{ JSON.stringify({ id: a.id, actor: a.actor_id, ip: a.ip, meta: a.meta, at: a.created_at }, null, 2) }}</pre>
            </td>
          </tr>
        </tbody>
      </table>
      <EmptyState v-if="isEmpty" icon="fas fa-clipboard-list" title="No audit records yet"
        hint="Every administrative action (bans, deletions, config changes…) is recorded here automatically." />
    </div>

    <Pagination :page="page" :pages="pages" @change="p => { page = p; load() }" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api, { apiError } from '../api'
import EmptyState from '../components/EmptyState.vue'
import ErrorState from '../components/ErrorState.vue'
import Pagination from '../components/Pagination.vue'
import { useDebounced } from '../composables/useResource'
import { timeAgo } from '../format'

const actionQ = ref(''), actorQ = ref('')
const page = ref(1), pages = ref(1)
const data = ref(null), loading = ref(false), error = ref(null)
const expanded = ref(null)
const items = computed(() => data.value?.items || [])
const isEmpty = computed(() => data.value && !items.value.length)

async function load() {
  loading.value = true
  error.value = null
  try {
    const { data: d } = await api.get('/admin/audit', { params: { page: page.value, action: actionQ.value, actor: actorQ.value } })
    data.value = d; pages.value = d.pages
  } catch (e) { error.value = apiError(e) }
  finally { loading.value = false }
}
const debouncedSearch = useDebounced(() => { page.value = 1; load() }, 300)

function shortId(id) { return id ? id.slice(0, 8) + '…' : '' }
onMounted(load)
</script>

<style scoped src="./admin-tables.css"></style>
<style scoped>
.av { display:flex; flex-direction:column; gap:14px; }
.toolbar { display:flex; gap:10px; flex-wrap:wrap; }
.search { flex:1; min-width:200px; display:flex; align-items:center; gap:9px; background:var(--surface-secondary); border:1px solid var(--border); border-radius:11px; padding:9px 13px; color:var(--text-3); }
.search.slim { flex:0 0 200px; }
.search input { flex:1; background:transparent; border:0; outline:0; color:var(--text-1); font-size:13.5px; }
.notice { display:flex; align-items:center; gap:9px; font-size:12px; color:var(--text-2); background:var(--brand-soft); border:1px solid var(--brand-ring, rgba(99,102,241,.3)); border-radius:11px; padding:10px 14px; }
.notice i { color:var(--brand-text); }
.nowrap { white-space:nowrap; }
.action { font-family:ui-monospace, monospace; font-size:11.5px; background:var(--surface); border:1px solid var(--border); padding:3px 8px; border-radius:7px; color:var(--text-1); }
.meta-row td { background:var(--surface); }
.meta { margin:0; font-family:ui-monospace, monospace; font-size:11.5px; color:var(--text-2); white-space:pre-wrap; word-break:break-word; padding:4px 0; }
</style>
