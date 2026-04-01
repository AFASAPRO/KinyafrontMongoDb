<template>
  <div class="kb-admin" :class="{collapsed: sidebar.collapsed}">

    <!-- ════════════════════════════════════════════════════════
         SIDEBAR  (Outrunix-style left nav)
    ════════════════════════════════════════════════════════ -->
    <aside class="kba-sidebar">
      <div class="kbs-brand">
        <div class="kbs-logo"><img src="/logo.png" alt=""/></div>
        <span class="kbs-name">KinyaBot</span>
        <button class="kbs-toggle" @click="sidebar.collapsed=!sidebar.collapsed">
          <i :class="sidebar.collapsed ? 'fas fa-bars' : 'fas fa-bars-staggered'"></i>
        </button>
      </div>

      <nav class="kbs-nav">
        <template v-for="g in navGroups" :key="g.id">
          <div class="kbs-group-label" v-show="!sidebar.collapsed">{{ g.label }}</div>
          <button v-for="item in g.items" :key="item.id"
            class="kbs-item" :class="{active: tab===item.id}"
            @click="tab=item.id" :title="sidebar.collapsed ? item.label : ''">
            <div class="kbs-icon"><i :class="item.icon"></i></div>
            <span class="kbs-label">{{ item.label }}</span>
            <div v-if="item.count" class="kbs-count">{{ item.count }}</div>
            <div v-if="tab===item.id" class="kbs-pill"></div>
          </button>
        </template>
      </nav>

      <div class="kbs-foot">
        <div class="kbs-help" @click="tab='settings'">
          <div class="kbs-icon"><i class="fas fa-circle-question"></i></div>
          <span class="kbs-label">Help &amp; Support</span>
        </div>
        <div class="kbs-logout-row" @click="doLogout">
          <div class="kbs-icon logout-icon"><i class="fas fa-right-from-bracket"></i></div>
          <span class="kbs-label logout-txt">Log Out</span>
        </div>
      </div>
    </aside>

    <!-- ════════════════════════════════════════════════════════
         MAIN AREA
    ════════════════════════════════════════════════════════ -->
    <div class="kba-main">

      <!-- ── TOP BAR ── -->
      <header class="kba-topbar">
        <div class="kbt-left">
          <div>
            <h1 class="kbt-greeting">Hi, {{ me?.username }}!</h1>
            <p class="kbt-sub">Here's what's happening with your AI today.</p>
          </div>
        </div>
        <div class="kbt-center">
          <div class="kbt-search">
            <i class="fas fa-magnifying-glass"></i>
            <input v-model="gSearch" placeholder="Search anything…" @keyup.enter="runSearch"/>
            <kbd>⌘K</kbd>
          </div>
        </div>
        <div class="kbt-right">
          <button class="kbt-icon-btn" @click="refresh" :class="{spin:loading}" title="Refresh data">
            <i class="fas fa-rotate-right"></i>
          </button>
          <button class="kbt-icon-btn" @click="tab='settings'" title="Settings">
            <i class="fas fa-gear"></i>
          </button>
          <div class="kbt-notif" @click="tab='notifications'">
            <i class="fas fa-bell"></i>
            <span v-if="unread" class="kbt-badge">{{ unread }}</span>
          </div>
          <div class="kbt-profile">
            <div class="kbt-avatar">{{ me?.username?.[0]?.toUpperCase() }}</div>
            <div class="kbt-pinfo">
              <span>{{ me?.username }}</span>
              <small>{{ me?.role?.replace('_',' ') }}</small>
            </div>
          </div>
        </div>
      </header>

      <!-- ── PAGES ── -->
      <div class="kba-body">
       

          <!-- ══════ DASHBOARD ══════ -->
          <section v-if="tab==='dashboard'" key="dashboard" class="kb-page">

            <!-- Circular stats row (Outrunix style) -->
            <div class="circ-row">
              <div v-for="s in circStats" :key="s.label" class="circ-card">
                <div class="cc-ring-wrap">
                  <svg class="cc-ring" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="7"/>
                    <circle cx="40" cy="40" r="34" fill="none"
                      :stroke="s.color" stroke-width="7"
                      stroke-linecap="round"
                      :stroke-dasharray="`${s.pct * 2.136} 213.6`"
                      stroke-dashoffset="53.4"
                      class="ring-anim"/>
                  </svg>
                  <div class="cc-center">
                    <span class="cc-pct">{{ s.pct }}%</span>
                  </div>
                </div>
                <div class="cc-info">
                  <div class="cc-value">{{ fmtNum(s.value) }}</div>
                  <div class="cc-label">{{ s.label }}</div>
                  <div class="cc-delta" :class="s.up ? 'up':'down'">
                    <i :class="s.up?'fas fa-arrow-trend-up':'fas fa-arrow-trend-down'"></i>
                    {{ s.delta }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Revenue chart + Live Activity (2-col) -->
            <div class="dash-mid">
              <!-- Bar chart panel -->
              <div class="chart-box big">
                <div class="cbx-head">
                  <div>
                    <h3>Usage Overview</h3>
                    <p class="cbx-sub">Monthly messages &amp; user growth</p>
                  </div>
                  <div class="cbx-legend">
                    <span><span class="leg-dot" style="background:#6366f1"></span>Messages</span>
                    <span><span class="leg-dot" style="background:#a855f7"></span>Users</span>
                  </div>
                  <select v-model="chartRange" class="cbx-sel">
                    <option>Weekly</option><option>Monthly</option><option>Yearly</option>
                  </select>
                </div>
                <!-- Y-axis labels + bars -->
                <div class="bar-scene">
                  <div class="bar-yaxis">
                    <span v-for="y in yLabels" :key="y">{{ y }}</span>
                  </div>
                  <div class="bar-area">
                    <div class="bar-grid">
                      <div v-for="i in 5" :key="i" class="bar-gridline"></div>
                    </div>
                    <div v-for="(b,i) in chartBars" :key="i" class="bar-col">
                      <div class="bar-pair">
                        <div class="bar-item msg"
                          :style="{height: b.msgH+'%'}"
                          :title="`${b.label}: ${b.msgs} messages`"></div>
                        <div class="bar-item usr"
                          :style="{height: b.usrH+'%'}"
                          :title="`${b.label}: ${b.users} users`"></div>
                      </div>
                      <span class="bar-lbl">{{ b.label }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Live Activity feed -->
              <div class="chart-box activity-box">
                <div class="cbx-head">
                  <h3>Live Activity</h3>
                  <span class="live-badge"><span class="live-pulse"></span>Real-time updates</span>
                </div>
                <div class="act-feed">
                  <transition-group name="af-item">
                    <div v-for="a in liveActivity" :key="a.id" class="af-row">
                      <div class="af-av" :style="{background:hColor(a.name)}">{{ a.name?.[0]?.toUpperCase() }}</div>
                      <div class="af-body">
                        <div class="af-name">{{ a.name }}</div>
                        <div class="af-act">{{ a.action }}</div>
                        <div class="af-ago">{{ a.ago }}</div>
                      </div>
                      <span class="af-tag" :class="a.cls">{{ a.tag }}</span>
                    </div>
                  </transition-group>
                  <div v-if="!liveActivity.length" class="af-empty">
                    <i class="fas fa-satellite-dish"></i><span>Waiting for activity…</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Traffic Sources + Recent Registrations -->
            <div class="dash-bot">
              <!-- Donut + legend -->
              <div class="chart-box donut-box">
                <div class="cbx-head">
                  <div>
                    <h3>Traffic Sources</h3>
                    <p class="cbx-sub">Referral breakdown</p>
                  </div>
                  <select class="cbx-sel"><option>All Time</option></select>
                </div>
                <div class="donut-flex">
                  <div class="donut-wrap">
                    <svg viewBox="0 0 120 120" class="donut-svg">
                      <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(255,255,255,.05)" stroke-width="16"/>
                      <circle v-for="(seg,i) in donutSegs" :key="i"
                        cx="60" cy="60" r="46" fill="none"
                        :stroke="seg.color" stroke-width="16"
                        stroke-linecap="round"
                        :stroke-dasharray="`${seg.dash} ${289-seg.dash}`"
                        :stroke-dashoffset="seg.off"
                        class="ring-anim"/>
                    </svg>
                    <div class="donut-mid">
                      <div class="dm-v">{{ fmtNum(dash.total_users||0) }}</div>
                      <div class="dm-l">Total Users</div>
                    </div>
                  </div>
                  <div class="donut-leg">
                    <div v-for="(seg,i) in donutSegs.slice(0,5)" :key="i" class="dl-row">
                      <span class="dl-color" :style="{background:seg.color}"></span>
                      <span class="dl-name">{{ seg.label }}</span>
                      <span class="dl-pct">{{ seg.pct }}%</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Recent users table -->
              <div class="chart-box table-box">
                <div class="cbx-head">
                  <h3>Recent Registrations</h3>
                  <button class="cbx-link" @click="tab='users'">View All</button>
                </div>
                <div class="mini-tbl">
                  <div class="mt-head">
                    <span>Invoice/User</span><span>Source</span><span>Status</span><span>Joined</span><span>Action</span>
                  </div>
                  <div v-for="u in (usersD.users||[]).slice(0,5)" :key="u.id" class="mt-row">
                    <div class="mtr-user">
                      <div class="mtr-av" :style="{background:hColor(u.username)}">{{ u.username?.[0]?.toUpperCase() }}</div>
                      <div>
                        <div class="mtr-name">{{ u.username }}</div>
                        <div class="mtr-sub">{{ u.email }}</div>
                      </div>
                    </div>
                    <span class="mtr-src">{{ u.referral_source||'—' }}</span>
                    <span class="mtr-badge" :class="u.is_banned?'red':'green'">{{ u.is_banned?'Banned':'Active' }}</span>
                    <span class="mtr-date">{{ shortDate(u.created_at) }}</span>
                    <div class="mtr-acts">
                      <button @click="toggleBan(u)" title="Ban/Unban"><i :class="u.is_banned?'fas fa-unlock':'fas fa-ban'"></i></button>
                      <button @click="delUser(u)" class="danger" title="Delete"><i class="fas fa-trash"></i></button>
                    </div>
                  </div>
                  <div v-if="!usersD.users?.length" class="mt-empty">No users yet</div>
                </div>
              </div>
            </div>
          </section>

          <!-- ══════ ANALYTICS ══════ -->
          <section v-if="tab==='analytics'" key="analytics" class="kb-page">
            <div class="pg-head"><h2>Analytics &amp; Reports</h2>
              <div class="pg-acts">
                <button class="btn-outline" @click="exportAnalytics"><i class="fas fa-download"></i> Export PDF</button>
              </div>
            </div>
            <div class="circ-row">
              <div v-for="s in analyticsCards" :key="s.label" class="stat-flat">
                <div class="sf-icon" :style="{background:s.bg}"><i :class="s.icon" :style="{color:s.color}"></i></div>
                <div><div class="sf-v">{{ fmtNum(s.value) }}</div><div class="sf-l">{{ s.label }}</div></div>
              </div>
            </div>
            <!-- Monthly line chart -->
            <div class="chart-box" style="width:100%">
              <div class="cbx-head"><div><h3>12-Month Growth</h3><p class="cbx-sub">Messages &amp; new users</p></div>
                <div class="cbx-legend">
                  <span><span class="leg-dot" style="background:#6366f1"></span>Messages</span>
                  <span><span class="leg-dot" style="background:#a855f7;border-style:dashed"></span>Users</span>
                </div>
              </div>
              <div style="position:relative;overflow:hidden">
                <svg :viewBox="`0 0 880 160`" class="lc-svg" preserveAspectRatio="none" style="width:100%;height:160px">
                  <defs>
                    <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#6366f1" stop-opacity=".35"/>
                      <stop offset="100%" stop-color="#6366f1" stop-opacity="0"/>
                    </linearGradient>
                  </defs>
                  <path :d="areaPath" fill="url(#grad1)"/>
                  <path :d="msgPath"  fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                  <path :d="usrPath"  fill="none" stroke="#a855f7" stroke-width="2"   stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 4"/>
                </svg>
                <div class="lc-xlabels">
                  <span v-for="m in monthLabels" :key="m">{{ m }}</span>
                </div>
              </div>
            </div>
            <!-- Top users + hourly heatmap -->
            <div class="dash-mid">
              <div class="chart-box big">
                <div class="cbx-head"><h3>Most Active Users</h3><p class="cbx-sub">By message count</p></div>
                <div class="top-users">
                  <div v-for="(u,i) in (analyticsD.top_users||[]).slice(0,8)" :key="u.username" class="tu-row">
                    <span class="tu-rank">#{{ i+1 }}</span>
                    <div class="tu-av" :style="{background:hColor(u.username)}">{{ u.username?.[0]?.toUpperCase() }}</div>
                    <div class="tu-info"><div class="tu-name">{{ u.username }}</div><div class="tu-email">{{ u.email }}</div></div>
                    <div class="tu-bar-wrap"><div class="tu-bar" :style="{width: tuW(u.msg_count)+'%'}"></div></div>
                    <span class="tu-count">{{ fmtNum(u.msg_count) }}</span>
                  </div>
                  <div v-if="!analyticsD.top_users?.length" class="mt-empty">No data yet</div>
                </div>
              </div>
              <div class="chart-box">
                <div class="cbx-head"><h3>Peak Hours</h3><p class="cbx-sub">Activity per hour (7-day)</p></div>
                <div class="heat-chart">
                  <div v-for="h in 24" :key="h" class="hc-col">
                    <div class="hc-bar" :style="{height: hcH(h-1)+'%', opacity: hcA(h-1)}"></div>
                    <span class="hc-lbl" v-if="(h-1)%6===0">{{ h-1 }}h</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ══════ USERS ══════ -->
          <section v-if="tab==='users'" key="users" class="kb-page">
            <div class="pg-head">
              <h2>User Management</h2>
              <div class="pg-acts">
                <div class="srch-box"><i class="fas fa-search"></i><input v-model="userQ" placeholder="Search users…" @input="debounceFn('users')"/></div>
                <select v-model="userStatus" class="kb-sel" @change="loadUsers"><option value="">All</option><option value="active">Active</option><option value="banned">Banned</option></select>
              </div>
            </div>
            <div class="kb-table">
              <table>
                <thead><tr><th>User</th><th>Email</th><th>Profession</th><th>Chats</th><th>Messages</th><th>Last IP</th><th>Last Login</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  <tr v-for="u in usersD.users" :key="u.id" :class="{banned:u.is_banned}" class="trow">
                    <td><div class="tc-user"><div class="tc-av" :style="{background:hColor(u.username)}">{{ u.username?.[0]?.toUpperCase() }}</div><div><b>{{ u.username }}</b><div class="tc-id">#{{ u.id }}</div></div></div></td>
                    <td class="muted">{{ u.email }}</td>
                    <td>{{ u.profession||'—' }}</td>
                    <td><span class="chip">{{ u._chats||0 }}</span></td>
                    <td><span class="chip">{{ u._msgs||0 }}</span></td>
                    <td class="muted mono">{{ u._ip||'—' }}</td>
                    <td class="muted">{{ shortDate(u.last_login) }}</td>
                    <td><span class="badge" :class="u.is_banned?'red':'green'">{{ u.is_banned?'Banned':'Active' }}</span></td>
                    <td>
                      <div class="tc-btns">
                        <button class="tb" :title="u.is_banned?'Unban':'Ban'" @click="toggleBan(u)"><i :class="u.is_banned?'fas fa-unlock':'fas fa-ban'"></i></button>
                        <button class="tb" title="View chats" @click="viewUserChats(u)"><i class="fas fa-comments"></i></button>
                        <button class="tb danger" title="Delete" @click="openConfirm('user',u)"><i class="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!usersD.users?.length"><td colspan="9" class="mt-empty">No users found</td></tr>
                </tbody>
              </table>
            </div>
            <div class="kba-pager">
              <button :disabled="usersPage<=1" @click="usersPage--;loadUsers()"><i class="fas fa-chevron-left"></i></button>
              <span>{{ usersPage }} / {{ usersD.pages||1 }}</span>
              <button :disabled="usersPage>=(usersD.pages||1)" @click="usersPage++;loadUsers()"><i class="fas fa-chevron-right"></i></button>
            </div>
          </section>

          <!-- ══════ CHATS ══════ -->
          <section v-if="tab==='chats'" key="chats" class="kb-page">
            <div class="pg-head">
              <h2>Chat Management</h2>
              <div class="pg-acts">
                <div class="srch-box"><i class="fas fa-search"></i><input v-model="chatQ" placeholder="Search chats…" @input="debounceFn('chats')"/></div>
                <button class="btn-outline" @click="exportData('chats')"><i class="fas fa-download"></i> Export</button>
              </div>
            </div>
            <div class="kb-table">
              <table>
                <thead><tr><th>Title</th><th>User</th><th>Messages</th><th>Updated</th><th>Actions</th></tr></thead>
                <tbody>
                  <tr v-for="c in chatsD.chats" :key="c.id" class="trow">
                    <td class="tc-title">{{ c.title }}</td>
                    <td><div class="tc-user sm"><div class="tc-av sm" :style="{background:hColor(c.username)}">{{ c.username?.[0]?.toUpperCase() }}</div><span>{{ c.username }}</span></div></td>
                    <td><span class="chip">{{ c.msg_count }}</span></td>
                    <td class="muted">{{ shortDate(c.updated_at) }}</td>
                    <td>
                      <div class="tc-btns">
                        <button class="tb" title="View" @click="openChat(c)"><i class="fas fa-eye"></i></button>
                        <button class="tb danger" title="Delete" @click="openConfirm('chat',c)"><i class="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!chatsD.chats?.length"><td colspan="5" class="mt-empty">No chats found</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- ══════ NOTIFICATIONS ══════ -->
          <section v-if="tab==='notifications'" key="notifications" class="kb-page">
            <div class="pg-head"><h2>Notification System</h2></div>
            <div class="notif-grid">
              <div class="kb-card">
                <div class="kbc-head"><i class="fas fa-broadcast-tower"></i><h3>Broadcast Message</h3></div>
                <div class="kbf"><label>Title</label><input v-model="nf.title" class="kb-input" placeholder="Alert title…"/></div>
                <div class="kbf"><label>Message</label><textarea v-model="nf.message" class="kb-input" rows="4" placeholder="Message to all users…"></textarea></div>
                <div class="kbf">
                  <label>Type</label>
                  <div class="ntype-row">
                    <button v-for="t in nTypes" :key="t.id" class="ntype-btn" :class="{active:nf.type===t.id}"
                      :style="nf.type===t.id?{background:t.bg,borderColor:t.color,color:t.color}:{}"
                      @click="nf.type=t.id"><i :class="t.icon"></i> {{ t.label }}</button>
                  </div>
                </div>
                <div class="kbf"><label>Expires (optional)</label><input v-model="nf.expires_at" type="datetime-local" class="kb-input"/></div>
                <button class="btn-primary full" :disabled="!nf.title||!nf.message||sending" @click="broadcast">
                  <i v-if="sending" class="fas fa-spinner fa-spin"></i>
                  <i v-else class="fas fa-paper-plane"></i>
                  {{ sending ? 'Broadcasting…' : 'Broadcast to All Users' }}
                </button>
              </div>
              <div class="kb-card">
                <div class="kbc-head"><i class="fas fa-list-check"></i><h3>Active Notifications ({{ notifs.filter(n=>n.is_active).length }})</h3></div>
                <div class="notif-scroll">
                  <div v-for="n in notifs" :key="n.id" class="ni-card" :class="n.type">
                    <div class="ni-icon"><i :class="nIcon(n.type)"></i></div>
                    <div class="ni-body">
                      <div class="ni-title">{{ n.title }}</div>
                      <div class="ni-msg">{{ n.message }}</div>
                      <div class="ni-meta">{{ shortDate(n.created_at) }}<span v-if="n.expires_at"> · Exp {{ shortDate(n.expires_at) }}</span></div>
                    </div>
                    <div class="ni-ctrl">
                      <button class="ni-tog" :class="n.is_active?'on':''" @click="toggleNotif(n)">{{ n.is_active?'Live':'Off' }}</button>
                      <button class="ni-del" @click="deleteNotif(n)"><i class="fas fa-trash"></i></button>
                    </div>
                  </div>
                  <div v-if="!notifs.length" class="mt-empty"><i class="fas fa-bell-slash"></i><br>No notifications yet</div>
                </div>
              </div>
            </div>
          </section>

          <!-- ══════ AI CONTROL ══════ -->
          <section v-if="tab==='ai'" key="ai" class="kb-page">
            <div class="pg-head"><h2>AI Control Panel</h2><button class="btn-primary" @click="saveAI"><i class="fas fa-save"></i> Save All</button></div>
            <div class="ai-grid">
              <div class="kb-card">
                <div class="kbc-head"><i class="fas fa-robot"></i><h3>Model &amp; API</h3></div>
                <div class="kbf"><label>LLM API URL</label><input v-model="cfg.llm_api_url" class="kb-input" placeholder="https://…"/></div>
                <div class="kbf"><label>Image API URL</label><input v-model="cfg.image_api_url" class="kb-input" placeholder="https://…"/></div>
                <div class="kbf"><label>Max Tokens <strong class="range-v">{{ cfg.max_tokens }}</strong></label><input type="range" v-model.number="cfg.max_tokens" min="256" max="8192" step="256" class="kb-range"/></div>
                <div class="kbf"><label>Temperature <strong class="range-v">{{ cfg.temperature }}</strong></label><input type="range" v-model.number="cfg.temperature" min="0" max="2" step="0.1" class="kb-range"/></div>
                <div class="kbf"><label>Context Messages <strong class="range-v">{{ cfg.max_context_messages }}</strong></label><input type="range" v-model.number="cfg.max_context_messages" min="1" max="50" class="kb-range"/></div>
              </div>
              <div class="kb-card">
                <div class="kbc-head"><i class="fas fa-sliders"></i><h3>Feature Flags</h3></div>
                <div v-for="f in featureFlags" :key="f.key" class="flag-row">
                  <div class="flag-info"><div class="flag-lbl">{{ f.label }}</div><div class="flag-desc">{{ f.desc }}</div></div>
                  <button class="kb-tog" :class="{on:cfg[f.key]}" @click="cfg[f.key]=!cfg[f.key]"><span class="tog-knob"></span></button>
                </div>
              </div>
              <div class="kb-card full">
                <div class="kbc-head"><i class="fas fa-brain"></i><h3>System Prompt</h3></div>
                <textarea v-model="cfg.system_prompt" class="kb-input" rows="5" placeholder="You are KinyaBot, a helpful AI assistant…"></textarea>
                <p class="hint-txt"><i class="fas fa-circle-info"></i> This is prepended to every conversation as the AI's personality.</p>
              </div>
            </div>
          </section>

          <!-- ══════ LOGS ══════ -->
          <section v-if="tab==='logs'" key="logs" class="kb-page">
            <div class="pg-head">
              <h2>Activity Logs</h2>
              <div class="pg-acts">
                <div class="log-level-row">
                  <button v-for="l in ['all','info','warn','error','debug']" :key="l"
                    class="ll-btn" :class="{active:logLvl===l}" @click="logLvl=l;loadLogs()">{{ l }}</button>
                </div>
                <button class="btn-outline" @click="exportData('logs')"><i class="fas fa-download"></i> Export</button>
              </div>
            </div>
            <div class="log-viewer">
              <div v-for="l in logs" :key="l.id" class="log-line" :class="l.level">
                <span class="ll-ts">{{ shortDate(l.created_at) }}</span>
                <span class="ll-lv" :class="l.level">{{ l.level }}</span>
                <span class="ll-src">{{ l.source }}</span>
                <span class="ll-msg">{{ l.message }}</span>
              </div>
              <div v-if="!logs.length" class="mt-empty" style="padding:3rem;text-align:center"><i class="fas fa-scroll" style="font-size:2rem;display:block;margin-bottom:.5rem"></i>No logs yet</div>
            </div>
          </section>

          <!-- ══════ SECURITY ══════ -->
          <section v-if="tab==='security'" key="security" class="kb-page">
            <div class="pg-head"><h2>Security Panel</h2></div>
            <div class="sec-grid">
              <div class="kb-card">
                <div class="kbc-head"><i class="fas fa-ban" style="color:#f87171"></i><h3>Blocked IPs</h3></div>
                <div class="kbf ip-input-row">
                  <input v-model="newIp" class="kb-input" placeholder="e.g. 192.168.1.1" @keyup.enter="blockIp"/>
                  <button class="btn-danger" @click="blockIp"><i class="fas fa-plus"></i> Block</button>
                </div>
                <div v-for="ip in secData.blocked_ips" :key="ip" class="ip-row">
                  <i class="fas fa-shield" style="color:#f87171"></i>
                  <span class="mono">{{ ip }}</span>
                  <button class="ip-del" @click="unblockIp(ip)"><i class="fas fa-xmark"></i></button>
                </div>
                <div v-if="!secData.blocked_ips?.length" class="mt-empty">No blocked IPs</div>
              </div>
              <div class="kb-card">
                <div class="kbc-head"><i class="fas fa-triangle-exclamation" style="color:#fcd34d"></i><h3>Suspicious Activity</h3></div>
                <div class="mini-tbl">
                  <div class="mt-head"><span>IP Address</span><span>Hits</span><span>Last Seen</span><span>Action</span></div>
                  <div v-for="s in secData.suspicious" :key="s.ip_address" class="mt-row">
                    <span class="mono">{{ s.ip_address }}</span>
                    <span class="chip">{{ s.hits }}</span>
                    <span class="muted">{{ shortDate(s.last_seen) }}</span>
                    <button class="tb danger" @click="newIp=s.ip_address;blockIp()"><i class="fas fa-ban"></i></button>
                  </div>
                  <div v-if="!secData.suspicious?.length" class="mt-empty">No data</div>
                </div>
              </div>
            </div>
          </section>

          <!-- ══════ FILES ══════ -->
          <section v-if="tab==='files'" key="files" class="kb-page">
            <div class="pg-head"><h2>File Management</h2></div>
            <div class="file-stats-row">
              <div class="fsr-card"><i class="fas fa-database" style="color:#6366f1"></i><div><b>{{ fmtSize(filesD.total_size) }}</b><span>Storage Used</span></div></div>
              <div class="fsr-card"><i class="fas fa-files" style="color:#06b6d4"></i><div><b>{{ filesD.files?.length||0 }}</b><span>Total Files</span></div></div>
              <div class="fsr-card"><i class="fas fa-image" style="color:#a855f7"></i><div><b>{{ filesD.files?.filter(f=>f.type==='image').length||0 }}</b><span>Images</span></div></div>
              <div class="fsr-card"><i class="fas fa-file-lines" style="color:#f59e0b"></i><div><b>{{ filesD.files?.filter(f=>f.type!=='image').length||0 }}</b><span>Documents</span></div></div>
            </div>
            <div class="file-grid">
              <div v-for="f in filesD.files" :key="f.name" class="fg-card">
                <div class="fg-thumb">
                  <img v-if="f.type==='image'" :src="resolveUrl(f.url)" @error="e=>e.target.parentElement.innerHTML='<i class=\'fas fa-image\'></i>'"/>
                  <i v-else class="fas fa-file-lines"></i>
                </div>
                <div class="fg-info">
                  <div class="fg-name">{{ f.name.slice(0,18) }}{{ f.name.length>18?'…':'' }}</div>
                  <div class="fg-size">{{ fmtSize(f.size) }}</div>
                </div>
                <div class="fg-acts">
                  <a :href="resolveUrl(f.url)" target="_blank" class="fg-btn"><i class="fas fa-eye"></i></a>
                  <button class="fg-btn red" @click="deleteFile(f)"><i class="fas fa-trash"></i></button>
                </div>
              </div>
              <div v-if="!filesD.files?.length" class="fg-empty"><i class="fas fa-folder-open"></i><span>No files yet</span></div>
            </div>
          </section>

          <!-- ══════ SETTINGS ══════ -->
          <section v-if="tab==='settings'" key="settings" class="kb-page">
            <div class="pg-head"><h2>System Settings</h2><button class="btn-primary" @click="saveAI"><i class="fas fa-save"></i> Save</button></div>
            <div class="ai-grid">
              <div class="kb-card">
                <div class="kbc-head"><i class="fas fa-gear"></i><h3>Application</h3></div>
                <div class="kbf"><label>App Name</label><input v-model="cfg.app_name" class="kb-input"/></div>
                <div class="flag-row" style="margin-top:1rem">
                  <div class="flag-info"><div class="flag-lbl">Maintenance Mode</div><div class="flag-desc">Block all regular user access</div></div>
                  <button class="kb-tog" :class="{on:cfg.maintenance_mode}" @click="cfg.maintenance_mode=!cfg.maintenance_mode"><span class="tog-knob"></span></button>
                </div>
              </div>
              <div class="kb-card">
                <div class="kbc-head"><i class="fas fa-user-shield"></i><h3>Admin Accounts</h3></div>
                <div class="mini-tbl">
                  <div class="mt-head"><span>Admin</span><span>Role</span><span>Last Login</span><span>Action</span></div>
                  <div v-for="a in admins" :key="a.id" class="mt-row">
                    <div class="mtr-user"><div class="mtr-av" :style="{background:hColor(a.username)}">{{ a.username?.[0]?.toUpperCase() }}</div><div><div class="mtr-name">{{ a.username }}</div><div class="mtr-sub">{{ a.email }}</div></div></div>
                    <span class="badge green" style="font-size:10px">{{ a.role?.replace('_',' ') }}</span>
                    <span class="muted">{{ shortDate(a.last_login) }}</span>
                    <button v-if="a.id!==me?.id" class="tb danger" @click="delAdmin(a)"><i class="fas fa-trash"></i></button>
                    <span v-else class="muted" style="font-size:11px">You</span>
                  </div>
                </div>
                <button class="btn-outline" style="margin-top:.75rem;width:100%" @click="$router.push('/admin')">
                  <i class="fas fa-user-plus"></i> Add New Admin
                </button>
              </div>
              <div class="kb-card full">
                <div class="kbc-head"><i class="fas fa-info-circle"></i><h3>System Info</h3></div>
                <div class="sysinfo-grid">
                  <div class="si"><span class="si-l">Version</span><span class="si-v">KinyaBot v5.3</span></div>
                  <div class="si"><span class="si-l">Total Users</span><span class="si-v">{{ fmtNum(dash.total_users||0) }}</span></div>
                  <div class="si"><span class="si-l">Total Chats</span><span class="si-v">{{ fmtNum(dash.total_chats||0) }}</span></div>
                  <div class="si"><span class="si-l">Total Messages</span><span class="si-v">{{ fmtNum(dash.total_messages||0) }}</span></div>
                  <div class="si"><span class="si-l">Backend</span><span class="si-v">Node.js + Express</span></div>
                  <div class="si"><span class="si-l">Database</span><span class="si-v">MySQL 8</span></div>
                  <div class="si"><span class="si-l">Server Status</span><span class="si-v online">Online ✓</span></div>
                  <div class="si"><span class="si-l">Uptime</span><span class="si-v">{{ serverUptime }}</span></div>
                </div>
              </div>
            </div>
          </section>

          <!-- ══════ VISITORS ══════ -->
          <section v-if="tab==='visitors'" key="visitors" class="kb-page">
            <div class="pg-head"><h2>Visitor Analytics</h2></div>
            <div class="circ-row">
              <div class="stat-flat"><div class="sf-icon" style="background:rgba(99,102,241,.15)"><i class="fas fa-users" style="color:#6366f1"></i></div><div><div class="sf-v">{{ fmtNum(visitorsD.total||0) }}</div><div class="sf-l">Total Visitors</div></div></div>
              <div class="stat-flat"><div class="sf-icon" style="background:rgba(6,182,212,.15)"><i class="fas fa-eye" style="color:#06b6d4"></i></div><div><div class="sf-v">{{ fmtNum(visitorsD.today||0) }}</div><div class="sf-l">Today</div></div></div>
            </div>
            <div class="dash-mid">
              <div class="chart-box big">
                <div class="cbx-head"><h3>Hourly Traffic</h3><p class="cbx-sub">Last 24 hours</p></div>
                <div class="heat-chart tall">
                  <div v-for="h in hourlyVis" :key="h.hour" class="hc-col" :title="`${h.hour}:00 — ${h.views} views`">
                    <div class="hc-bar vis" :style="{height: barH(h.views, hourlyVis, 'views')+'%'}"></div>
                    <span class="hc-lbl" v-if="h.hour%4===0">{{ h.hour }}</span>
                  </div>
                </div>
              </div>
              <div class="chart-box">
                <div class="cbx-head"><h3>Top Pages</h3></div>
                <div class="top-pages">
                  <div v-for="p in (visitorsD.by_page||[]).slice(0,8)" :key="p.page" class="tp-row">
                    <span class="tp-pg">{{ p.page||'/' }}</span>
                    <div class="tp-bar-wrap"><div class="tp-bar" :style="{width: barH(p.views, visitorsD.by_page,'views')+'%'}"></div></div>
                    <span class="tp-n">{{ p.views }}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ══════ USAGE & BILLING ══════ -->
          <section v-if="tab==='usage'" key="usage" class="kb-page">
            <div class="pg-head">
              <h2>Usage &amp; Billing</h2>
              <div class="pg-acts">
                <button class="btn-outline" @click="exportUsers"><i class="fas fa-download"></i> Export Users CSV</button>
                <button class="btn-outline" @click="exportChatsCSV"><i class="fas fa-download"></i> Export Chats CSV</button>
              </div>
            </div>
            <div class="circ-row">
              <div class="stat-flat"><div class="sf-icon" style="background:rgba(99,102,241,.15)"><i class="fas fa-bolt" style="color:#6366f1"></i></div><div><div class="sf-v">{{ fmtNum(usageD.total_tokens||0) }}</div><div class="sf-l">Total Tokens</div></div></div>
              <div class="stat-flat"><div class="sf-icon" style="background:rgba(52,168,83,.15)"><i class="fas fa-dollar-sign" style="color:#34a853"></i></div><div><div class="sf-v">${{ usageD.total_cost||'0.00' }}</div><div class="sf-l">Est. Total Cost</div></div></div>
              <div class="stat-flat"><div class="sf-icon" style="background:rgba(6,182,212,.15)"><i class="fas fa-check-circle" style="color:#06b6d4"></i></div><div><div class="sf-v">{{ usageD.total_requests||0 }}</div><div class="sf-l">Total Requests</div></div></div>
              <div class="stat-flat"><div class="sf-icon" style="background:rgba(245,158,11,.15)"><i class="fas fa-percent" style="color:#f59e0b"></i></div><div><div class="sf-v">{{ usageD.total_requests ? Math.round((usageD.success_requests/usageD.total_requests)*100) : 100 }}%</div><div class="sf-l">Success Rate</div></div></div>
            </div>
            <div class="dash-mid">
              <div class="chart-box big">
                <div class="cbx-head"><h3>Daily Token Usage</h3><p class="cbx-sub">Last 30 days</p></div>
                <div class="heat-chart tall">
                  <div v-for="(d,i) in (usageD.by_day||[]).slice(-24)" :key="i" class="hc-col">
                    <div class="hc-bar" style="background:linear-gradient(180deg,#f59e0b,rgba(245,158,11,.3))" :style="{height: barH(d.tokens, usageD.by_day,'tokens')+'%'}"></div>
                    <span class="hc-lbl" v-if="i%4===0">{{ d.date?.slice(5) }}</span>
                  </div>
                </div>
              </div>
              <div class="chart-box">
                <div class="cbx-head"><h3>Top Users by Tokens</h3></div>
                <div class="top-users">
                  <div v-for="(u,i) in (usageD.by_user||[]).slice(0,8)" :key="u.username" class="tu-row">
                    <span class="tu-rank">#{{ i+1 }}</span>
                    <div class="tu-av" :style="{background:hColor(u.username)}">{{ u.username?.[0]?.toUpperCase() }}</div>
                    <div class="tu-info"><div class="tu-name">{{ u.username }}</div></div>
                    <div class="tu-bar-wrap"><div class="tu-bar" style="background:linear-gradient(90deg,#f59e0b,#f97316)" :style="{width: tuW(u.tokens, usageD.by_user,'tokens')+'%'}"></div></div>
                    <span class="tu-count" style="color:#f59e0b">{{ fmtNum(u.tokens) }}</span>
                  </div>
                  <div v-if="!usageD.by_user?.length" class="mt-empty">No usage data yet</div>
                </div>
              </div>
            </div>
            <!-- Plans breakdown -->
            <div class="chart-box" style="width:100%">
              <div class="cbx-head"><h3>User Plans</h3><p class="cbx-sub">Distribution across subscription tiers</p></div>
              <div class="plans-row">
                <div v-for="p in (usageD.plans||[])" :key="p.plan" class="plan-card" :class="p.plan">
                  <div class="pc-icon"><i :class="p.plan==='free'?'fas fa-star':p.plan==='premium'?'fas fa-crown':'fas fa-gem'"></i></div>
                  <div class="pc-label">{{ p.plan }}</div>
                  <div class="pc-count">{{ p.count }} users</div>
                </div>
                <div v-if="!usageD.plans?.length" class="mt-empty">All users on default free plan</div>
              </div>
            </div>
          </section>

          <!-- ══════ MODERATION ══════ -->
          <section v-if="tab==='moderation'" key="moderation" class="kb-page">
            <div class="pg-head">
              <h2>Moderation</h2>
              <div class="pg-acts">
                <span class="mod-count-badge"><i class="fas fa-flag"></i> {{ moderationD.length }} pending reviews</span>
              </div>
            </div>
            <div class="kb-table">
              <table>
                <thead><tr><th>User</th><th>Content</th><th>Reason</th><th>Time</th><th>Actions</th></tr></thead>
                <tbody>
                  <tr v-for="f in moderationD" :key="f.id" class="trow">
                    <td><div class="tc-user"><div class="tc-av" :style="{background:hColor(f.username)}">{{ f.username?.[0]?.toUpperCase() }}</div><span>{{ f.username||'Unknown' }}</span></div></td>
                    <td class="mod-content">{{ f.content?.slice(0,120) }}{{ f.content?.length>120?'…':'' }}</td>
                    <td><span class="badge red" style="font-size:11px">{{ f.reason }}</span></td>
                    <td class="muted">{{ shortDate(f.created_at) }}</td>
                    <td>
                      <div class="tc-btns">
                        <button class="tb" title="Mark reviewed (allow)" @click="reviewFlag(f)"><i class="fas fa-check"></i></button>
                        <button class="tb danger" title="Delete chat" @click="deleteFlag(f)"><i class="fas fa-trash"></i></button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="!moderationD.length"><td colspan="5" class="mt-empty" style="padding:3rem;text-align:center"><i class="fas fa-shield-check" style="font-size:2rem;display:block;margin-bottom:.5rem;color:#34d399"></i>All clear — no flagged content!</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <!-- ══════ KNOWLEDGE BASE ══════ -->
          <section v-if="tab==='knowledge'" key="knowledge" class="kb-page">
            <div class="pg-head"><h2>Knowledge Base (RAG)</h2></div>
            <div class="notif-grid">
              <div class="kb-card">
                <div class="kbc-head"><i class="fas fa-plus-circle"></i><h3>Add Document</h3></div>
                <div class="kbf"><label>Title</label><input v-model="kbForm.title" class="kb-input" placeholder="Document title…"/></div>
                <div class="kbf"><label>Content (text)</label><textarea v-model="kbForm.content" class="kb-input" rows="5" placeholder="Paste document text, FAQ, or any knowledge…"></textarea></div>
                <div class="kbf">
                  <label>Or Upload File (.txt, .md, .pdf, .csv)</label>
                  <input type="file" class="kb-input" accept=".txt,.md,.csv,.json" @change="e=>kbFile=e.target.files[0]" style="padding:6px"/>
                </div>
                <button class="btn-primary full" :disabled="!kbForm.title||kbUploading" @click="uploadKb">
                  <i v-if="kbUploading" class="fas fa-spinner fa-spin"></i>
                  <i v-else class="fas fa-upload"></i>
                  {{ kbUploading ? 'Uploading…' : 'Add to Knowledge Base' }}
                </button>
              </div>
              <div class="kb-card">
                <div class="kbc-head"><i class="fas fa-database"></i><h3>Stored Documents ({{ knowledgeD.length }})</h3></div>
                <div class="notif-scroll">
                  <div v-for="doc in knowledgeD" :key="doc.id" class="ni-card" style="border-left-color:#6366f1">
                    <div class="ni-icon"><i class="fas fa-file-text" style="color:#6366f1"></i></div>
                    <div class="ni-body">
                      <div class="ni-title">{{ doc.title }}</div>
                      <div class="ni-meta">{{ doc.file_type||'text' }} · {{ shortDate(doc.created_at) }}</div>
                    </div>
                    <div class="ni-ctrl">
                      <button class="ni-del" @click="deleteKb(doc)"><i class="fas fa-trash"></i></button>
                    </div>
                  </div>
                  <div v-if="!knowledgeD.length" class="mt-empty" style="text-align:center;padding:2rem">
                    <i class="fas fa-book-open" style="font-size:2rem;display:block;margin-bottom:.5rem"></i>
                    No documents yet. Add some to enable AI knowledge base.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- ══════ PERFORMANCE ══════ -->
          <section v-if="tab==='performance'" key="performance" class="kb-page">
            <div class="pg-head"><h2>Performance Monitoring</h2></div>
            <div class="circ-row">
              <div class="stat-flat"><div class="sf-icon" style="background:rgba(52,168,83,.15)"><i class="fas fa-clock" style="color:#34a853"></i></div><div><div class="sf-v">{{ performD.avg_response_ms||0 }}ms</div><div class="sf-l">Avg Response Time</div></div></div>
              <div class="stat-flat"><div class="sf-icon" style="background:rgba(239,68,68,.15)"><i class="fas fa-triangle-exclamation" style="color:#f87171"></i></div><div><div class="sf-v">{{ performD.error_rate?.errors||0 }}</div><div class="sf-l">Errors (24h)</div></div></div>
              <div class="stat-flat"><div class="sf-icon" style="background:rgba(99,102,241,.15)"><i class="fas fa-server" style="color:#6366f1"></i></div><div><div class="sf-v">{{ serverUptime }}</div><div class="sf-l">Server Uptime</div></div></div>
              <div class="stat-flat"><div class="sf-icon" style="background:rgba(6,182,212,.15)"><i class="fas fa-memory" style="color:#06b6d4"></i></div><div><div class="sf-v">{{ performD.memory ? fmtSize(performD.memory.rss) : '—' }}</div><div class="sf-l">Memory (RSS)</div></div></div>
            </div>
            <div class="chart-box" style="width:100%">
              <div class="cbx-head"><h3>Response Time by Hour</h3><p class="cbx-sub">Average ms per hour (24h)</p></div>
              <div class="heat-chart tall">
                <div v-for="(h,i) in (performD.by_hour||[])" :key="i" class="hc-col">
                  <div class="hc-bar" style="background:linear-gradient(180deg,#34a853,rgba(52,168,83,.3))"
                    :style="{height: barH(h.avg_ms||0, performD.by_hour||[],'avg_ms')+'%'}"
                    :title="`${h.hour}:00 — ${Math.round(h.avg_ms||0)}ms avg`"></div>
                  <span class="hc-lbl" v-if="i%4===0">{{ h.hour }}h</span>
                </div>
                <div v-if="!performD.by_hour?.length" class="mt-empty" style="width:100%;text-align:center">No performance data yet</div>
              </div>
            </div>
          </section>

          <!-- ══════ AI TEST PANEL ══════ -->
          <section v-if="tab==='ai-test'" key="ai-test" class="kb-page">
            <div class="pg-head"><h2>AI Test &amp; Debug Panel</h2></div>
            <div class="ai-grid">
              <div class="kb-card full">
                <div class="kbc-head"><i class="fas fa-flask"></i><h3>Test AI Prompt</h3></div>
                <div class="kbf"><label>Prompt</label><textarea v-model="aiTest.prompt" class="kb-input" rows="4" placeholder="Enter a test prompt to send to the AI…" @keydown.ctrl.enter="runAiTest"></textarea></div>
                <div style="display:flex;gap:8px;align-items:center;margin-bottom:1rem">
                  <button class="btn-primary" :disabled="!aiTest.prompt.trim()||aiTest.loading" @click="runAiTest">
                    <i v-if="aiTest.loading" class="fas fa-spinner fa-spin"></i>
                    <i v-else class="fas fa-paper-plane"></i>
                    {{ aiTest.loading ? 'Testing…' : 'Send Test Prompt' }}
                  </button>
                  <span v-if="aiTest.response_ms" class="test-ms">{{ aiTest.response_ms }}ms</span>
                </div>
                <div v-if="aiTest.error" class="test-error"><i class="fas fa-triangle-exclamation"></i> {{ aiTest.error }}</div>
                <div v-if="aiTest.response" class="test-response">
                  <div class="tr-head"><i class="fas fa-robot"></i> AI Response</div>
                  <div class="tr-content">{{ aiTest.response }}</div>
                </div>
              </div>
              <div class="kb-card">
                <div class="kbc-head"><i class="fas fa-circle-info"></i><h3>Current Config</h3></div>
                <div class="sysinfo-grid">
                  <div class="si"><span class="si-l">LLM URL</span><span class="si-v" style="font-size:10px;word-break:break-all">{{ cfg.llm_api_url?.slice(0,40)||'Not set' }}…</span></div>
                  <div class="si"><span class="si-l">Max Tokens</span><span class="si-v">{{ cfg.max_tokens }}</span></div>
                  <div class="si"><span class="si-l">Temperature</span><span class="si-v">{{ cfg.temperature }}</span></div>
                  <div class="si"><span class="si-l">Context Msgs</span><span class="si-v">{{ cfg.max_context_messages }}</span></div>
                  <div class="si"><span class="si-l">Image Gen</span><span class="si-v" :class="cfg.image_gen_enabled?'online':''" >{{ cfg.image_gen_enabled?'Enabled':'Disabled' }}</span></div>
                  <div class="si"><span class="si-l">Knowledge Base</span><span class="si-v" :class="cfg.knowledge_base_enabled?'online':''">{{ cfg.knowledge_base_enabled?'On':'Off' }}</span></div>
                </div>
              </div>
            </div>
          </section>

     
      </div><!-- .kba-body -->
    </div><!-- .kba-main -->

    <!-- ════════ CHAT VIEWER MODAL ════════ -->
    <transition name="modal">
      <div v-if="chatModal" class="kb-overlay" @click.self="chatModal=null">
        <div class="kb-modal large">
          <div class="km-head">
            <h3>{{ chatModal.chat?.title }}</h3>
            <button @click="chatModal=null"><i class="fas fa-xmark"></i></button>
          </div>
          <div class="km-meta">
            <span><i class="fas fa-user"></i>{{ chatModal.user?.username }}</span>
            <span><i class="fas fa-envelope"></i>{{ chatModal.user?.email }}</span>
            <span><i class="fas fa-comment"></i>{{ chatModal.messages?.length }} messages</span>
          </div>
          <div class="km-transcript">
            <div v-for="m in chatModal.messages" :key="m.id" class="kmt-msg" :class="m.role">
              <div class="kmt-role">{{ m.role }}</div>
              <div class="kmt-txt">{{ m.content?.slice(0,600) }}{{ m.content?.length>600?'…':'' }}</div>
              <div class="kmt-ts">{{ shortDate(m.created_at) }}</div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- ════════ CONFIRM MODAL ════════ -->
    <transition name="modal">
      <div v-if="confirmM" class="kb-overlay" @click.self="confirmM=null">
        <div class="kb-modal">
          <div class="km-head">
            <h3><i class="fas fa-triangle-exclamation" style="color:#f28b82;margin-right:8px"></i>Confirm Delete</h3>
            <button @click="confirmM=null"><i class="fas fa-xmark"></i></button>
          </div>
          <p class="km-txt">Are you sure you want to delete <strong>"{{ confirmM.item?.title||confirmM.item?.username }}"</strong>? This cannot be undone.</p>
          <div class="km-foot">
            <button class="btn-outline" @click="confirmM=null">Cancel</button>
            <button class="btn-danger" @click="execDelete"><i class="fas fa-trash"></i> Delete</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- ════════ TOAST ════════ -->
    <transition name="toast">
      <div v-if="toast" class="kb-toast" :class="toast.cls">
        <i :class="toast.icon"></i><span>{{ toast.msg }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router  = useRouter()
const API     = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const BASE    = API.replace('/api','')
const tok     = ref(localStorage.getItem('kb_admin_token')||'')
const me      = ref(JSON.parse(localStorage.getItem('kb_admin')||'null'))
const hdrs    = computed(()=>({ Authorization:`Bearer ${tok.value}` }))
async function api(method,url,data){ return axios({method,url:API+url,data,headers:hdrs.value}) }

/* ── state ─────────────────────────────────────────────────── */
const sidebar  = reactive({ collapsed: false })
const tab      = ref('dashboard')
const loading  = ref(false)
const gSearch  = ref('')
const unread   = ref(0)
const serverUptime = ref('—')

/* data */
const dash       = ref({})
const analyticsD = ref({ top_users:[], hourly_activity:[], monthly_users:[], monthly_messages:[], role_dist:[] })
const usersD     = ref({ users:[], total:0, pages:1 })
const chatsD     = ref({ chats:[] })
const visitorsD  = ref({ total:0, today:0, by_page:[], by_hour:[] })
const notifs     = ref([])
const logs       = ref([])
const filesD     = ref({ files:[], total_size:0 })
const secData    = ref({ blocked_ips:[], suspicious:[] })
const admins     = ref([])
const usageD     = ref({ total_tokens:0, total_requests:0, success_requests:0, total_cost:'0', by_user:[], by_day:[], plans:[] })
const moderationD = ref([])
const knowledgeD = ref([])
const performD   = ref({ avg_response_ms:0, error_rate:{total:0,errors:0}, by_hour:[] })

// AI test panel state
const aiTest = reactive({ prompt:'', response:'', response_ms:0, loading:false, error:'' })

// Knowledge base form
const kbForm = reactive({ title:'', content:'' })
const kbFile = ref(null)
const kbUploading = ref(false)

const cfg = reactive({ llm_api_url:'', image_api_url:'', max_tokens:2048, temperature:0.7,
  system_prompt:'You are KinyaBot, a helpful AI assistant.', image_gen_enabled:true,
  file_uploads_enabled:true, maintenance_mode:false, app_name:'KinyaBot AI', max_context_messages:10,
  blocked_ips:[], cost_per_1k_tokens:0.002, free_daily_limit:50, moderation_enabled:true })

/* ui state */
const userQ    = ref(''); const userStatus = ref(''); const usersPage = ref(1)
const chatQ    = ref(''); const logLvl = ref('all'); const chartRange = ref('Monthly')
const newIp    = ref('')
const liveActivity = ref([])
const chatModal = ref(null); const confirmM = ref(null); const toast = ref(null)
const sending  = ref(false)

/* forms */
const nf = reactive({ title:'', message:'', type:'info', expires_at:'' })
const nTypes = [
  { id:'info',label:'Info',icon:'fas fa-circle-info',color:'#67e8f9',bg:'rgba(6,182,212,.12)' },
  { id:'success',label:'Success',icon:'fas fa-circle-check',color:'#34d399',bg:'rgba(52,168,83,.12)' },
  { id:'warning',label:'Warning',icon:'fas fa-triangle-exclamation',color:'#fcd34d',bg:'rgba(245,158,11,.12)' },
  { id:'error',label:'Alert',icon:'fas fa-circle-exclamation',color:'#f87171',bg:'rgba(239,68,68,.12)' },
]
const featureFlags = [
  { key:'image_gen_enabled',   label:'Image Generation', desc:'Allow /image prompts' },
  { key:'file_uploads_enabled',label:'File Uploads',     desc:'Allow file attachments' },
  { key:'maintenance_mode',    label:'Maintenance Mode', desc:'Lock app for regular users' },
  { key:'moderation_enabled',  label:'Auto Moderation',  desc:'Flag harmful content automatically' },
  { key:'knowledge_base_enabled', label:'Knowledge Base (RAG)', desc:'AI uses uploaded documents' },
]

/* ── NAV GROUPS ─────────────────────────────────────────────── */
const navGroups = computed(()=>[
  { id:'main', label:'MAIN', items:[
    { id:'dashboard',     icon:'fas fa-chart-pie',       label:'Dashboard' },
    { id:'analytics',     icon:'fas fa-chart-line',      label:'Analytics' },
    { id:'usage',         icon:'fas fa-coins',            label:'Usage & Billing' },
    { id:'performance',   icon:'fas fa-gauge-high',       label:'Performance' },
  ]},
  { id:'manage', label:'MANAGE', items:[
    { id:'users',         icon:'fas fa-users',            label:'Users',         count: dash.value.new_today||null },
    { id:'chats',         icon:'fas fa-comments',         label:'Chats' },
    { id:'moderation',    icon:'fas fa-flag',             label:'Moderation',    count: dash.value.flagged_count||null },
    { id:'notifications', icon:'fas fa-bell',             label:'Notifications', count: unread.value||null },
    { id:'knowledge',     icon:'fas fa-book',             label:'Knowledge Base' },
    { id:'files',         icon:'fas fa-folder-open',      label:'Files' },
  ]},
  { id:'system', label:'SYSTEM', items:[
    { id:'ai',            icon:'fas fa-robot',            label:'AI Control' },
    { id:'ai-test',       icon:'fas fa-flask',            label:'AI Test Panel' },
    { id:'logs',          icon:'fas fa-scroll',           label:'Logs' },
    { id:'security',      icon:'fas fa-shield-halved',    label:'Security' },
    { id:'visitors',      icon:'fas fa-eye',              label:'Visitors' },
    { id:'settings',      icon:'fas fa-gear',             label:'Settings' },
  ]},
])

/* ── CIRCULAR STAT CARDS ────────────────────────────────────── */
const circStats = computed(()=>[
  { label:'Total Users',    value:dash.value.total_users||0,    pct:78, color:'#6366f1', delta:'+10.5%', up:true },
  { label:'Active Users',   value:dash.value.active_today||0,   pct:65, color:'#06b6d4', delta:'+6.2%',  up:true },
  { label:'Conversion',     value:dash.value.msgs_today||0,     pct:85, color:'#34a853', delta:'-4.5%',  up:false },
  { label:'Avg Msgs/User',  value: dash.value.total_users ? Math.round((dash.value.total_messages||0)/dash.value.total_users) : 0, pct:52, color:'#f59e0b', delta:'+4.1%', up:true },
])

/* ── DONUT SEGMENTS ─────────────────────────────────────────── */
const COLORS = ['#6366f1','#a855f7','#06b6d4','#34a853','#f59e0b','#ec4899','#f28b82','#34d399']
const donutSegs = computed(()=>{
  const refs = dash.value.referrals||[]
  const tot  = refs.reduce((s,r)=>s+r.count,0)||1
  let off = 0
  return refs.slice(0,6).map((r,i)=>{
    const pct  = Math.round(r.count/tot*100)
    const dash2 = r.count/tot*289
    const seg  = { label:r.referral_source||'Other', count:r.count, pct, color:COLORS[i%COLORS.length], dash:dash2, off: 289-off }
    off += dash2; return seg
  })
})

/* ── BAR CHART ──────────────────────────────────────────────── */
const chartBars = computed(()=>{
  const msgs  = dash.value.daily_messages||[]
  const users = dash.value.daily_users||[]
  const maxM  = Math.max(...msgs.map(m=>m.count),1)
  const maxU  = Math.max(...users.map(u=>u.count),1)
  const days  = Array.from({length:7},(_,i)=>{
    const d=new Date(); d.setDate(d.getDate()-(6-i))
    return d.toLocaleDateString('en',{weekday:'short'})
  })
  return days.map((label,i)=>({
    label,
    msgs:  msgs[i]?.count||0,  msgH:  Math.max(((msgs[i]?.count||0)/maxM)*88,4),
    users: users[i]?.count||0, usrH:  Math.max(((users[i]?.count||0)/maxU)*88,4),
  }))
})
const yLabels = computed(()=>{
  const maxM = Math.max(...(dash.value.daily_messages||[]).map(m=>m.count),10)
  return [maxM, Math.round(maxM*.75), Math.round(maxM*.5), Math.round(maxM*.25), 0].map(v=>v>999?`${Math.round(v/1000)}K`:String(v))
})

/* ── LINE CHART ─────────────────────────────────────────────── */
const monthLabels = computed(()=>(analyticsD.value.monthly_messages||[]).map(x=>x.month?.slice(5)||''))
function svgPath(data, key, W=880, H=140){
  if(!data?.length) return ''
  const max = Math.max(...data.map(d=>d[key]||d.count||0),1)
  const pts = data.map((d,i)=>[i/(data.length-1||1)*W, H-(d[key]||d.count||0)/max*(H-14)])
  if(!pts.length) return ''
  let path = `M ${pts[0][0]} ${pts[0][1]}`
  for(let i=1;i<pts.length;i++){
    const c1x = pts[i-1][0]+(pts[i][0]-pts[i-1][0])/3
    const c2x = pts[i][0]-(pts[i][0]-pts[i-1][0])/3
    path += ` C ${c1x} ${pts[i-1][1]}, ${c2x} ${pts[i][1]}, ${pts[i][0]} ${pts[i][1]}`
  }
  return path
}
const msgPath  = computed(()=>svgPath(analyticsD.value.monthly_messages||[],'count'))
const usrPath  = computed(()=>svgPath(analyticsD.value.monthly_users||[],'count'))
const areaPath = computed(()=>{ const l=msgPath.value; return l ? l+` L 880 145 L 0 145 Z` : '' })

/* ── HOURLY HEATMAP ─────────────────────────────────────────── */
const hourMap = computed(()=>{ const m={}; (analyticsD.value.hourly_activity||[]).forEach(h=>{ m[h.hour]=h.count }); return m })
function hcH(h){ const max=Math.max(...Object.values(hourMap.value),1); return Math.max((hourMap.value[h]||0)/max*85,4) }
function hcA(h){ const max=Math.max(...Object.values(hourMap.value),1); return 0.15+(hourMap.value[h]||0)/max*0.85 }

/* ── HOURLY VISITORS ────────────────────────────────────────── */
const hourlyVis = computed(()=>{ const m={}; (visitorsD.value.by_hour||[]).forEach(h=>{ m[h.hour]=h.views }); return Array.from({length:24},(_,i)=>({ hour:i, views:m[i]||0 })) })

/* ── TOP USERS ──────────────────────────────────────────────── */

/* ── ANALYTICS CARDS ────────────────────────────────────────── */
const analyticsCards = computed(()=>[
  { label:'Total Messages', value:dash.value.total_messages||0, icon:'fas fa-message', color:'#6366f1', bg:'rgba(99,102,241,.15)' },
  { label:'Total Chats',    value:dash.value.total_chats||0,    icon:'fas fa-comments',color:'#06b6d4', bg:'rgba(6,182,212,.15)' },
  { label:'Onboarded',      value:(analyticsD.value.role_dist||[]).find(r=>r.onboarded===1)?.count||0, icon:'fas fa-graduation-cap',color:'#34a853',bg:'rgba(52,168,83,.15)' },
  { label:'Avg Msgs/Chat',  value:dash.value.total_chats ? Math.round((dash.value.total_messages||0)/dash.value.total_chats):0, icon:'fas fa-chart-bar',color:'#f59e0b',bg:'rgba(245,158,11,.15)' },
])

/* ── API CALLS ──────────────────────────────────────────────── */
async function refresh(){
  loading.value=true
  try {
    const [d,an,v,n,l,f,s,adm,st,us,mod,kb,perf] = await Promise.all([
      api('get','/admin/dashboard'),
      api('get','/admin/analytics'),
      api('get','/admin/visitors'),
      api('get','/admin/notifications'),
      api('get','/admin/logs'),
      api('get','/admin/files'),
      api('get','/admin/security'),
      api('get','/admin/admins'),
      api('get','/health'),
      api('get','/admin/usage'),
      api('get','/admin/moderation'),
      api('get','/admin/knowledge'),
      api('get','/admin/performance'),
    ])
    dash.value        = d.data
    analyticsD.value  = an.data
    visitorsD.value   = v.data
    notifs.value      = n.data
    logs.value        = l.data.logs||[]
    filesD.value      = f.data
    secData.value     = s.data
    admins.value      = adm.data
    usageD.value      = us.data
    moderationD.value = mod.data
    knowledgeD.value  = kb.data
    performD.value    = perf.data
    unread.value      = n.data.filter(x=>x.is_active).length
    if(st.data.uptime) serverUptime.value = fmtUptime(st.data.uptime)
    Object.assign(cfg, await api('get','/admin/settings').then(r=>r.data))
    await loadUsers()
    injectLiveActivity()
  } catch(e){
    if(e.response?.status===403) doLogout()
  } finally { loading.value=false }
}

async function loadUsers(){
  const { data } = await api('get',`/admin/users?page=${usersPage.value}&search=${encodeURIComponent(userQ.value)}`)
  usersD.value = data
  data.users?.forEach(async u => {
    try {
      const s = await api('get',`/admin/users/${u.id}/stats`)
      u._chats = s.data.total_chats; u._msgs = s.data.total_messages; u._ip = s.data.last_ip
    } catch {}
  })
}
async function loadLogs(){ const q=logLvl.value!=='all'?`?level=${logLvl.value}`:''; const {data}=await api('get',`/admin/logs${q}`); logs.value=data.logs||[] }
async function loadChats(){ const {data}=await api('get',`/admin/chats${chatQ.value?`?search=${encodeURIComponent(chatQ.value)}`:''}`); chatsD.value=data }

let debouncers={}
function debounceFn(type){ clearTimeout(debouncers[type]); debouncers[type]=setTimeout(()=>{ if(type==='users'){usersPage.value=1;loadUsers()} else loadChats() },300) }

/* ── MODERATION ACTIONS ─────────────────────────────────────── */
async function reviewFlag(f){ await api('put',`/admin/moderation/${f.id}/review`); moderationD.value=moderationD.value.filter(x=>x.id!==f.id); showToast('success','Marked as reviewed') }
async function deleteFlag(f){ await api('delete',`/admin/chats/${f.chat_id}`).catch(()=>{}); await reviewFlag(f) }

/* ── KNOWLEDGE BASE ACTIONS ─────────────────────────────────── */
async function uploadKb(){
  if(!kbForm.title) return showToast('error','Title required')
  kbUploading.value=true
  try {
    const fd=new FormData()
    fd.append('title',kbForm.title)
    if(kbForm.content) fd.append('content',kbForm.content)
    if(kbFile.value) fd.append('file',kbFile.value)
    await axios({ method:'post', url:`${API}/admin/knowledge`, data:fd, headers:{...hdrs.value,'Content-Type':'multipart/form-data'} })
    const {data}=await api('get','/admin/knowledge'); knowledgeD.value=data
    kbForm.title=''; kbForm.content=''; kbFile.value=null
    showToast('success','Document added to knowledge base!')
  } catch(e){ showToast('error',e.response?.data?.error||'Failed') }
  finally{ kbUploading.value=false }
}
async function deleteKb(item){ await api('delete',`/admin/knowledge/${item.id}`); knowledgeD.value=knowledgeD.value.filter(x=>x.id!==item.id); showToast('success','Removed') }

/* ── AI TEST ─────────────────────────────────────────────────── */
async function runAiTest(){
  if(!aiTest.prompt.trim()) return
  aiTest.loading=true; aiTest.response=''; aiTest.error=''
  try {
    const {data}=await api('post','/admin/ai/test',{prompt:aiTest.prompt})
    aiTest.response=data.response; aiTest.response_ms=data.response_ms
  } catch(e){ aiTest.error=e.response?.data?.error||'Test failed' }
  finally{ aiTest.loading=false }
}

/* ── EXPORT ─────────────────────────────────────────────────── */
async function exportUsers(){
  const a=document.createElement('a')
  a.href=API+'/admin/export/users'; a.setAttribute('Authorization',`Bearer ${tok.value}`)
  window.open(API+'/admin/export/users', '_blank')
}
async function exportChatsCSV(){ window.open(API+'/admin/export/chats', '_blank') }

/* ── ACTIONS ────────────────────────────────────────────────── */
async function toggleBan(u){
  await api('put',`/admin/users/${u.id}/ban`,{banned:!u.is_banned})
  u.is_banned=!u.is_banned
  showToast('success',`User ${u.is_banned?'banned':'unbanned'}`)
  pushActivity({name:u.username,action:u.is_banned?'was banned':'was unbanned',ago:'just now',cls:u.is_banned?'warn':'ok',tag:u.is_banned?'🚫 Banned':'✅ Active'})
}
function delUser(u){ openConfirm('user',u) }
function openConfirm(type,item){ confirmM.value={type,item} }
async function execDelete(){
  const {type,item}=confirmM.value
  if(type==='user'){ await api('delete',`/admin/users/${item.id}`); await loadUsers() }
  else if(type==='chat'){ await api('delete',`/admin/chats/${item.id}`); await loadChats() }
  confirmM.value=null; showToast('success','Deleted successfully')
}
async function openChat(c){ const {data}=await api('get',`/admin/chats/${c.id}/messages`); chatModal.value=data }
function viewUserChats(u){ tab.value='chats'; chatQ.value=u.username; loadChats() }
async function broadcast(){
  sending.value=true
  try {
    const {data}=await api('post','/admin/notifications',nf)
    notifs.value.unshift(data); unread.value=notifs.value.filter(x=>x.is_active).length
    nf.title=''; nf.message=''; nf.type='info'; nf.expires_at=''
    showToast('success','Notification broadcast to all users!')
    pushActivity({name:me.value?.username,action:'broadcast a notification',ago:'just now',cls:'ok',tag:'📢 Broadcast'})
  } catch(e){ showToast('error',e.response?.data?.error||'Failed') }
  finally{ sending.value=false }
}
async function toggleNotif(n){ await api('put',`/admin/notifications/${n.id}`,{is_active:!n.is_active}); n.is_active=!n.is_active; unread.value=notifs.value.filter(x=>x.is_active).length }
async function deleteNotif(n){ await api('delete',`/admin/notifications/${n.id}`); notifs.value=notifs.value.filter(x=>x.id!==n.id) }
async function saveAI(){ try{ await api('put','/admin/settings',{...cfg}); showToast('success','Settings saved!') } catch{ showToast('error','Failed to save') } }
async function deleteFile(f){ if(!confirm(`Delete "${f.name}"?`)) return; await api('delete',`/admin/files/${encodeURIComponent(f.name)}`); filesD.value.files=filesD.value.files.filter(x=>x.name!==f.name); showToast('success','File deleted') }
async function blockIp(){ if(!newIp.value.trim()) return; await api('post','/admin/security/block-ip',{ip:newIp.value.trim()}); if(!secData.value.blocked_ips) secData.value.blocked_ips=[]; secData.value.blocked_ips.push(newIp.value.trim()); newIp.value=''; showToast('success','IP blocked') }
async function unblockIp(ip){ await api('delete',`/admin/security/block-ip/${ip}`); secData.value.blocked_ips=secData.value.blocked_ips.filter(i=>i!==ip) }
async function delAdmin(a){ if(!confirm(`Delete admin "${a.username}"?`)) return; await api('delete',`/admin/admins/${a.id}`); admins.value=admins.value.filter(x=>x.id!==a.id) }

function exportAnalytics(){
  const txt=`KinyaBot Analytics Export\n${new Date().toLocaleString()}\n\nTotal Users: ${dash.value.total_users||0}\nTotal Messages: ${dash.value.total_messages||0}\nTotal Chats: ${dash.value.total_chats||0}`
  download(txt,'kinyabot-analytics.txt')
}
function exportData(type){
  let txt
  if(type==='logs') txt=logs.value.map(l=>`[${l.created_at}] [${l.level}] [${l.source}] ${l.message}`).join('\n')
  else txt=chatsD.value.chats?.map(c=>`"${c.title}","${c.username}",${c.msg_count},"${c.updated_at}"`).join('\n')
  download(txt,`kinyabot-${type}.csv`)
}
function download(txt,name){ const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([txt],{type:'text/plain'})); a.download=name; a.click() }

function runSearch(){
  const q=gSearch.value.toLowerCase()
  if(!q) return
  if(['user','people'].some(k=>q.includes(k))){ tab.value='users'; userQ.value=gSearch.value; loadUsers() }
  else if(['chat','message'].some(k=>q.includes(k))){ tab.value='chats'; chatQ.value=gSearch.value; loadChats() }
  else if(['log','error'].some(k=>q.includes(k))) tab.value='logs'
  else if(['notif','broadcast'].some(k=>q.includes(k))) tab.value='notifications'
}

/* ── HELPERS ────────────────────────────────────────────────── */
function hColor(s){ return COLORS[(s?.charCodeAt(0)||0)%COLORS.length] }
function fmtNum(n){ if(!n) return '0'; if(n>=1000000) return (n/1000000).toFixed(1)+'M'; if(n>=1000) return (n/1000).toFixed(1)+'K'; return String(n) }
function tuW(v, arr, key='msg_count'){ const a=arr||analyticsD.value.top_users||[]; const max=Math.max(...a.map(u=>u[key]||0),1); return Math.max(v/max*100,2) }
function barH(v,arr,key='count'){ const max=Math.max(...(arr||[]).map(x=>x[key]||0),1); return Math.max(v/max*82,4) }
function fmtSize(b){ if(!b) return '0 B'; if(b<1024) return b+' B'; if(b<1048576) return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(1)+' MB' }
function fmtUptime(s){ const h=Math.floor(s/3600),m=Math.floor(s%3600/60); return `${h}h ${m}m` }
function shortDate(d){ if(!d) return '—'; return new Date(d).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) }
function resolveUrl(u){ return u?.startsWith('http')?u:BASE+u }
function nIcon(t){ return {info:'fas fa-circle-info',success:'fas fa-circle-check',warning:'fas fa-triangle-exclamation',error:'fas fa-circle-exclamation'}[t]||'fas fa-bell' }

function pushActivity(a){ liveActivity.value.unshift({id:Date.now(),...a}); if(liveActivity.value.length>8) liveActivity.value.pop() }
function injectLiveActivity(){
  const users = usersD.value.users||[]; if(!users.length) return
  const actions=['signed in','sent a message','started a new chat','completed onboarding','updated profile']
  const tags=['Active','Sent','New Chat','Onboarded','Updated']
  users.slice(0,6).forEach((u,i)=>setTimeout(()=>pushActivity({ name:u.username, action:actions[i%5], ago:`${i*2+1}m ago`, cls:'ok', tag:'+'+tags[i%5] }),i*400))
}

function showToast(cls,msg){ toast.value={cls,msg,icon:cls==='success'?'fas fa-circle-check':'fas fa-circle-exclamation'}; setTimeout(()=>toast.value=null,3500) }
function doLogout(){ localStorage.removeItem('kb_admin_token'); localStorage.removeItem('kb_admin'); router.push('/admin') }

/* ── LIFECYCLE ──────────────────────────────────────────────── */
let tInt, rInt
onMounted(async()=>{
  if(!tok.value){ router.push('/admin'); return }
  refresh()
  tInt = setInterval(()=>{},1000)
  rInt = setInterval(refresh, 30000)
})
onBeforeUnmount(()=>{ clearInterval(tInt); clearInterval(rInt) })
</script>

<style scoped>
/* ════════════════════════════════════
   TOKENS
════════════════════════════════════ */
:root { --s1:#0a0b12; --s2:#0d0e1b; --s3:#111220; --border:rgba(99,102,241,.12); --border2:rgba(99,102,241,.22); --t1:#e2e8f0; --t2:#9ca3af; --t3:#4b5563; --t4:#374151; --acc:#6366f1; --acc2:#a855f7; }

/* ════════════════════════════════════
   SHELL
════════════════════════════════════ */
.kb-admin { display:flex; height:100vh; width:100vw; background:var(--s1); font-family:'Google Sans','Segoe UI',system-ui,sans-serif; color:var(--t1); overflow:hidden; }

/* ════════════════════════════════════
   SIDEBAR
════════════════════════════════════ */
.kba-sidebar { width:212px; min-width:212px; background:var(--s2); border-right:1px solid var(--border); display:flex; flex-direction:column; transition:width .3s cubic-bezier(.34,1.56,.64,1), min-width .3s; overflow:hidden; flex-shrink:0; }
.kb-admin.collapsed .kba-sidebar { width:60px; min-width:60px; }

.kbs-brand { display:flex; align-items:center; gap:9px; padding:1rem .8rem; border-bottom:1px solid var(--border); }
.kbs-logo { width:32px; height:32px; border-radius:9px; overflow:hidden; flex-shrink:0; }
.kbs-logo img { width:100%; height:100%; object-fit:contain; }
.kbs-name { font-size:14px; font-weight:800; color:#fff; letter-spacing:-.3px; white-space:nowrap; flex:1; }
.kbs-toggle { width:24px; height:24px; border-radius:6px; background:rgba(99,102,241,.1); border:1px solid var(--border2); color:#818cf8; font-size:11px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; flex-shrink:0; }
.kbs-toggle:hover { background:rgba(99,102,241,.22); }

.kbs-nav { flex:1; overflow-y:auto; padding:.5rem .4rem; display:flex; flex-direction:column; gap:1px; }
.kbs-nav::-webkit-scrollbar { width:0; }
.kbs-group-label { font-size:9.5px; font-weight:700; letter-spacing:.1em; color:var(--t3); padding:8px 8px 2px; text-transform:uppercase; white-space:nowrap; overflow:hidden; }
.kbs-item { display:flex; align-items:center; gap:9px; padding:9px 8px; border-radius:10px; background:none; border:none; color:var(--t3); font-size:12.5px; font-weight:500; cursor:pointer; transition:all .2s; position:relative; width:100%; text-align:left; }
.kbs-item:hover { background:rgba(99,102,241,.08); color:#a5b4fc; }
.kbs-item.active { background:linear-gradient(135deg,rgba(99,102,241,.2),rgba(168,85,247,.12)); color:#c4b5fd; font-weight:600; }
.kbs-icon { width:18px; height:18px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.kbs-icon i { font-size:13.5px; }
.kbs-label { white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; }
.kbs-count { background:var(--acc); color:#fff; font-size:10px; font-weight:700; padding:1px 6px; border-radius:99px; margin-left:auto; flex-shrink:0; }
.kbs-pill { position:absolute; right:0; top:50%; transform:translateY(-50%); width:3px; height:20px; background:linear-gradient(180deg,#6366f1,#a855f7); border-radius:99px 0 0 99px; }

.kbs-foot { border-top:1px solid var(--border); padding:.6rem .4rem; display:flex; flex-direction:column; gap:2px; }
.kbs-help, .kbs-logout-row { display:flex; align-items:center; gap:9px; padding:8px 8px; border-radius:9px; cursor:pointer; transition:all .2s; }
.kbs-help:hover { background:rgba(99,102,241,.08); }
.kbs-help .kbs-icon i { color:var(--t3); font-size:13px; }
.kbs-help .kbs-label { color:var(--t3); font-size:12.5px; }
.kbs-logout-row { background:rgba(239,68,68,.06); border:1px solid rgba(239,68,68,.1); }
.kbs-logout-row:hover { background:rgba(239,68,68,.14); }
.logout-icon i { color:#f87171; font-size:13px; }
.logout-txt { color:#f87171; font-size:12.5px; }

/* ════════════════════════════════════
   MAIN
════════════════════════════════════ */
.kba-main { flex:1; min-width:0; display:flex; flex-direction:column; overflow:hidden; }

/* TOP BAR */
.kba-topbar { display:flex; align-items:center; gap:10px; padding:.8rem 1.4rem; background:var(--s2); border-bottom:1px solid var(--border); flex-shrink:0; }
.kbt-left { flex-shrink:0; }
.kbt-greeting { font-size:1.05rem; font-weight:800; color:#fff; }
.kbt-sub { font-size:11.5px; color:var(--t3); }
.kbt-center { flex:1; max-width:320px; margin:0 auto; }
.kbt-search { display:flex; align-items:center; gap:8px; background:rgba(255,255,255,.03); border:1px solid var(--border); border-radius:9px; padding:7px 11px; transition:border-color .2s; }
.kbt-search:focus-within { border-color:var(--border2); }
.kbt-search i { color:var(--t3); font-size:12px; }
.kbt-search input { flex:1; background:none; border:none; outline:none; color:var(--t1); font-size:12.5px; font-family:inherit; }
.kbt-search input::placeholder { color:var(--t4); }
.kbt-search kbd { background:rgba(99,102,241,.1); border:1px solid rgba(99,102,241,.2); color:#818cf8; padding:1px 5px; border-radius:4px; font-size:9.5px; }
.kbt-right { display:flex; align-items:center; gap:8px; flex-shrink:0; }
.kbt-icon-btn { width:33px; height:33px; border-radius:8px; background:rgba(255,255,255,.04); border:1px solid var(--border); color:var(--t3); font-size:13px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; }
.kbt-icon-btn:hover { background:rgba(99,102,241,.12); color:#a5b4fc; }
.kbt-icon-btn.spin i { animation:spin .7s linear infinite; }
.kbt-notif { position:relative; width:33px; height:33px; border-radius:8px; background:rgba(255,255,255,.04); border:1px solid var(--border); color:var(--t3); display:flex; align-items:center; justify-content:center; cursor:pointer; font-size:14px; transition:all .2s; }
.kbt-notif:hover { background:rgba(99,102,241,.12); color:#a5b4fc; }
.kbt-badge { position:absolute; top:4px; right:4px; width:14px; height:14px; border-radius:50%; background:var(--acc); color:#fff; font-size:8px; font-weight:700; display:flex; align-items:center; justify-content:center; }
.kbt-profile { display:flex; align-items:center; gap:8px; padding:5px 10px; background:rgba(255,255,255,.03); border:1px solid var(--border); border-radius:99px; cursor:pointer; }
.kbt-avatar { width:26px; height:26px; border-radius:50%; background:linear-gradient(135deg,#4f46e5,#a855f7); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#fff; }
.kbt-pinfo span { display:block; font-size:12px; font-weight:600; color:var(--t1); }
.kbt-pinfo small { display:block; font-size:10px; color:var(--t3); text-transform:capitalize; }

/* PAGE BODY */
.kba-body { flex:1; overflow-y:auto; padding:1.1rem 1.4rem 2rem; }
.kba-body::-webkit-scrollbar { width:5px; }
.kba-body::-webkit-scrollbar-thumb { background:rgba(99,102,241,.18); border-radius:99px; }
.kb-page { display:flex; flex-direction:column; gap:1rem; animation:fadeUp .3s ease; }
.pg-head { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; }
.pg-head h2 { font-size:1.05rem; font-weight:700; color:#fff; }
.pg-acts { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

/* ════════════════════════════════════
   CIRCULAR STATS (Outrunix style)
════════════════════════════════════ */
.circ-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(185px,1fr)); gap:10px; }
.circ-card { background:var(--s3); border:1px solid var(--border); border-radius:16px; padding:1rem 1.1rem; display:flex; align-items:center; gap:14px; transition:all .25s; cursor:default; }
.circ-card:hover { border-color:var(--border2); transform:translateY(-2px); box-shadow:0 8px 24px rgba(0,0,0,.2); }
.cc-ring-wrap { position:relative; width:64px; height:64px; flex-shrink:0; }
.cc-ring { width:64px; height:64px; transform:rotate(-90deg); }
.ring-anim { transition:stroke-dasharray .8s cubic-bezier(.34,1.56,.64,1); }
.cc-center { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; }
.cc-pct { font-size:12px; font-weight:700; color:#fff; }
.cc-info { flex:1; min-width:0; }
.cc-value { font-size:1.35rem; font-weight:800; color:#fff; }
.cc-label { font-size:11.5px; color:var(--t3); margin-top:1px; }
.cc-delta { display:flex; align-items:center; gap:4px; font-size:11px; font-weight:600; margin-top:4px; }
.cc-delta.up { color:#34d399; } .cc-delta.down { color:#f87171; }

/* ════════════════════════════════════
   CHART BOXES
════════════════════════════════════ */
.dash-mid, .dash-bot { display:flex; gap:10px; }
.chart-box { background:var(--s3); border:1px solid var(--border); border-radius:16px; padding:1.1rem; flex:1; min-width:0; }
.chart-box.big { flex:2; }
.activity-box { width:260px; min-width:240px; flex:none; }
.donut-box { width:230px; min-width:200px; flex:none; }
.table-box { flex:1; }
.cbx-head { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:.85rem; flex-wrap:wrap; }
.cbx-head h3 { font-size:13px; font-weight:700; color:#fff; }
.cbx-sub { font-size:11.5px; color:var(--t3); margin-top:1px; }
.cbx-legend { display:flex; gap:12px; font-size:11.5px; color:var(--t2); }
.cbx-legend span { display:flex; align-items:center; gap:5px; }
.leg-dot { width:8px; height:8px; border-radius:50%; display:inline-block; }
.cbx-sel { padding:4px 8px; background:rgba(255,255,255,.04); border:1px solid var(--border); border-radius:7px; color:var(--t2); font-size:11.5px; outline:none; cursor:pointer; font-family:inherit; }
.cbx-sel option { background:#1e1e2e; }
.cbx-link { background:none; border:1px solid var(--border2); color:#818cf8; font-size:11.5px; padding:4px 10px; border-radius:6px; cursor:pointer; transition:all .2s; }
.cbx-link:hover { background:rgba(99,102,241,.1); }

/* BAR CHART */
.bar-scene { display:flex; gap:8px; height:140px; }
.bar-yaxis { display:flex; flex-direction:column; justify-content:space-between; align-items:flex-end; padding-bottom:18px; gap:0; }
.bar-yaxis span { font-size:10px; color:var(--t4); white-space:nowrap; }
.bar-area { flex:1; position:relative; display:flex; flex-direction:column; }
.bar-grid { position:absolute; inset:0 0 18px 0; display:flex; flex-direction:column; justify-content:space-between; pointer-events:none; }
.bar-gridline { border-bottom:1px solid rgba(255,255,255,.04); width:100%; }
.bar-area > .bar-col { position:relative; z-index:1; } /* ensure cols above grid */
.bar-area { display:flex; flex-direction:row; align-items:flex-end; gap:0; padding-bottom:0; }
.bar-area .bar-grid { display:none; } /* re-layout: inline bars */
.bar-scene { position:relative; height:148px; overflow:hidden; }
.bar-scene .bar-yaxis { position:absolute; left:0; top:0; bottom:18px; z-index:2; }
.bar-area { position:absolute; left:36px; right:0; top:0; bottom:0; display:flex; align-items:flex-end; gap:3px; padding-bottom:18px; }
.bar-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; }
.bar-pair { display:flex; gap:2px; align-items:flex-end; height:110px; width:100%; justify-content:center; }
.bar-item { flex:1; border-radius:3px 3px 0 0; min-height:4px; transition:height .7s cubic-bezier(.34,1.56,.64,1); }
.bar-item.msg { background:linear-gradient(180deg,#6366f1 0%,rgba(99,102,241,.25) 100%); }
.bar-item.usr { background:linear-gradient(180deg,#a855f7 0%,rgba(168,85,247,.25) 100%); }
.bar-lbl { font-size:9.5px; color:var(--t4); }

/* LINE CHART */
.lc-svg { display:block; }
.lc-xlabels { display:flex; justify-content:space-between; padding:4px 0 0; }
.lc-xlabels span { font-size:10px; color:var(--t4); }

/* ACTIVITY FEED */
.live-badge { display:flex; align-items:center; gap:5px; font-size:11.5px; color:var(--t3); background:rgba(52,168,83,.08); border:1px solid rgba(52,168,83,.15); padding:3px 8px; border-radius:99px; }
.live-pulse { width:6px; height:6px; border-radius:50%; background:#34d399; box-shadow:0 0 5px #34d399; animation:pulse 2s infinite; }
.act-feed { display:flex; flex-direction:column; gap:6px; max-height:260px; overflow-y:auto; }
.act-feed::-webkit-scrollbar { width:0; }
.af-row { display:flex; align-items:flex-start; gap:8px; padding:7px 8px; background:rgba(255,255,255,.02); border-radius:9px; }
.af-av { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#fff; flex-shrink:0; }
.af-body { flex:1; min-width:0; }
.af-name { font-size:11.5px; font-weight:600; color:var(--t1); }
.af-act { font-size:11px; color:var(--t3); }
.af-ago { font-size:10px; color:var(--t4); }
.af-tag { font-size:10px; font-weight:600; padding:2px 7px; border-radius:99px; background:rgba(99,102,241,.14); color:#a5b4fc; white-space:nowrap; flex-shrink:0; }
.af-tag.ok   { background:rgba(52,168,83,.14); color:#34d399; }
.af-tag.warn { background:rgba(239,68,68,.14); color:#f87171; }
.af-empty { text-align:center; padding:1.5rem 0; color:var(--t4); font-size:12px; }
.af-empty i { display:block; font-size:1.5rem; margin-bottom:.4rem; }

/* DONUT */
.donut-flex { display:flex; flex-direction:column; align-items:center; gap:10px; }
.donut-wrap { position:relative; width:110px; height:110px; }
.donut-svg { width:110px; height:110px; transform:rotate(-90deg); }
.donut-mid { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; }
.dm-v { font-size:1.2rem; font-weight:800; color:#fff; }
.dm-l { font-size:10px; color:var(--t3); }
.donut-leg { display:flex; flex-direction:column; gap:5px; width:100%; }
.dl-row { display:flex; align-items:center; gap:6px; font-size:11.5px; }
.dl-color { width:8px; height:8px; border-radius:50%; flex-shrink:0; }
.dl-name { flex:1; color:var(--t2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.dl-pct { font-weight:600; color:var(--t1); }

/* MINI TABLE */
.mini-tbl { overflow-x:auto; }
.mt-head { display:grid; grid-template-columns:2fr 1fr auto auto auto; padding:6px 8px; border-bottom:1px solid var(--border); font-size:10.5px; font-weight:600; color:var(--t3); text-transform:uppercase; letter-spacing:.05em; gap:6px; align-items:center; }
.mt-row { display:grid; grid-template-columns:2fr 1fr auto auto auto; gap:6px; padding:8px 8px; border-bottom:1px solid rgba(99,102,241,.04); align-items:center; transition:background .15s; }
.mt-row:hover { background:rgba(99,102,241,.04); }
.mt-row:last-child { border-bottom:none; }
.mtr-user { display:flex; align-items:center; gap:7px; }
.mtr-av { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#fff; flex-shrink:0; }
.mtr-name { font-size:12px; font-weight:600; color:var(--t1); }
.mtr-sub { font-size:10.5px; color:var(--t3); }
.mtr-src { font-size:11px; color:var(--t3); }
.mtr-date { font-size:11px; color:var(--t3); }
.mtr-badge { padding:2px 7px; border-radius:99px; font-size:10.5px; font-weight:600; }
.mtr-badge.green { background:rgba(52,168,83,.14); color:#34d399; }
.mtr-badge.red { background:rgba(239,68,68,.14); color:#f87171; }
.mtr-acts { display:flex; gap:4px; }
.mtr-acts button { width:24px; height:24px; border-radius:5px; background:rgba(99,102,241,.08); border:none; color:#818cf8; font-size:11px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; }
.mtr-acts button:hover { background:rgba(99,102,241,.18); }
.mtr-acts button.danger { background:rgba(239,68,68,.08); color:#f87171; }
.mtr-acts button.danger:hover { background:rgba(239,68,68,.2); }
.mt-empty { padding:1.5rem; text-align:center; color:var(--t3); font-size:12.5px; grid-column:1/-1; }

/* ════════════════════════════════════
   ANALYTICS
════════════════════════════════════ */
.stat-flat { background:var(--s3); border:1px solid var(--border); border-radius:12px; padding:.9rem 1rem; display:flex; align-items:center; gap:12px; }
.sf-icon { width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
.sf-v { font-size:1.3rem; font-weight:800; color:#fff; }
.sf-l { font-size:11.5px; color:var(--t3); }
.top-users { display:flex; flex-direction:column; gap:8px; }
.tu-row { display:flex; align-items:center; gap:10px; }
.tu-rank { font-size:11.5px; font-weight:700; color:var(--t3); width:22px; text-align:center; flex-shrink:0; }
.tu-av { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:700; color:#fff; flex-shrink:0; }
.tu-info { min-width:100px; }
.tu-name { font-size:12px; font-weight:600; color:var(--t1); }
.tu-email { font-size:10.5px; color:var(--t3); }
.tu-bar-wrap { flex:1; height:6px; background:rgba(255,255,255,.05); border-radius:99px; overflow:hidden; }
.tu-bar { height:100%; background:linear-gradient(90deg,#6366f1,#a855f7); border-radius:99px; transition:width .6s ease; }
.tu-count { font-size:12px; font-weight:600; color:#a5b4fc; min-width:30px; text-align:right; }
.heat-chart { display:flex; align-items:flex-end; gap:3px; height:80px; }
.heat-chart.tall { height:110px; }
.hc-col { display:flex; flex-direction:column; align-items:center; flex:1; gap:3px; }
.hc-bar { width:100%; background:var(--acc); border-radius:2px 2px 0 0; min-height:3px; transition:height .5s ease; }
.hc-bar.vis { background:linear-gradient(180deg,#06b6d4,#6366f1); }
.hc-lbl { font-size:8.5px; color:var(--t4); }

/* ════════════════════════════════════
   DATA TABLES
════════════════════════════════════ */
.kb-table { background:var(--s3); border:1px solid var(--border); border-radius:14px; overflow:hidden; overflow-x:auto; }
.kb-table table { width:100%; border-collapse:collapse; font-size:12.5px; }
.kb-table thead tr { background:rgba(99,102,241,.06); border-bottom:1px solid var(--border); }
.kb-table th { padding:9px 13px; text-align:left; color:var(--t3); font-weight:600; font-size:10.5px; text-transform:uppercase; letter-spacing:.05em; white-space:nowrap; }
.kb-table td { padding:9px 13px; border-bottom:1px solid rgba(99,102,241,.04); color:var(--t2); vertical-align:middle; }
.kb-table tr:last-child td { border-bottom:none; }
.kb-table tr.banned td { opacity:.55; }
.kb-table tr:hover td { background:rgba(99,102,241,.03); }
.trow { animation:fadeUp .2s ease; }
.tc-user { display:flex; align-items:center; gap:8px; }
.tc-av { width:28px; height:28px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#fff; flex-shrink:0; }
.tc-av.sm { width:24px; height:24px; }
.tc-id { font-size:10px; color:var(--t4); }
.tc-user b { font-size:12.5px; color:var(--t1); }
.tc-user.sm span { font-size:12px; color:var(--t1); }
.tc-title { max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.muted { color:var(--t3) !important; }
.mono { font-family:'JetBrains Mono','Fira Code',monospace; font-size:11px; }
.chip { background:rgba(99,102,241,.14); color:#a5b4fc; padding:2px 8px; border-radius:99px; font-size:11px; font-weight:600; }
.badge { padding:2px 8px; border-radius:99px; font-size:11px; font-weight:600; }
.badge.green { background:rgba(52,168,83,.14); color:#34d399; }
.badge.red   { background:rgba(239,68,68,.14);  color:#f87171; }
.tc-btns { display:flex; gap:4px; }
.tb { width:26px; height:26px; border-radius:6px; background:rgba(99,102,241,.08); border:none; color:#818cf8; font-size:11px; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .2s; }
.tb:hover { background:rgba(99,102,241,.2); }
.tb.danger { background:rgba(239,68,68,.08); color:#f87171; }
.tb.danger:hover { background:rgba(239,68,68,.2); }
.kba-pager { display:flex; align-items:center; justify-content:center; gap:10px; padding:.6rem; }
.kba-pager button { width:28px; height:28px; border-radius:7px; background:rgba(99,102,241,.08); border:1px solid var(--border); color:#818cf8; cursor:pointer; transition:all .2s; display:flex; align-items:center; justify-content:center; }
.kba-pager button:disabled { opacity:.3; cursor:not-allowed; }
.kba-pager span { font-size:12px; color:var(--t3); }

/* ════════════════════════════════════
   NOTIFICATIONS
════════════════════════════════════ */
.notif-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.kb-card { background:var(--s3); border:1px solid var(--border); border-radius:14px; padding:1.15rem; }
.kbc-head { display:flex; align-items:center; gap:9px; margin-bottom:1rem; }
.kbc-head i { font-size:15px; color:var(--acc); }
.kbc-head h3 { font-size:13px; font-weight:700; color:#fff; }
.kbf { margin-bottom:.8rem; }
.kbf label { display:block; font-size:11px; font-weight:600; color:var(--t3); text-transform:uppercase; letter-spacing:.05em; margin-bottom:5px; }
.ntype-row { display:flex; gap:5px; flex-wrap:wrap; }
.ntype-btn { padding:5px 10px; border:1px solid var(--border); border-radius:99px; background:none; color:var(--t3); font-size:11.5px; cursor:pointer; transition:all .2s; display:flex; align-items:center; gap:4px; font-family:inherit; }
.notif-scroll { max-height:320px; overflow-y:auto; display:flex; flex-direction:column; gap:7px; }
.notif-scroll::-webkit-scrollbar { width:0; }
.ni-card { display:flex; align-items:flex-start; gap:10px; padding:10px; background:rgba(255,255,255,.02); border-radius:10px; border-left:3px solid var(--acc); }
.ni-card.success { border-left-color:#34d399; } .ni-card.warning { border-left-color:#fcd34d; } .ni-card.error { border-left-color:#f87171; }
.ni-icon { font-size:14px; color:var(--acc); flex-shrink:0; padding-top:1px; }
.ni-card.success .ni-icon { color:#34d399; } .ni-card.warning .ni-icon { color:#fcd34d; } .ni-card.error .ni-icon { color:#f87171; }
.ni-body { flex:1; min-width:0; }
.ni-title { font-size:12.5px; font-weight:600; color:var(--t1); }
.ni-msg { font-size:11.5px; color:var(--t2); margin-top:1px; }
.ni-meta { font-size:10.5px; color:var(--t4); margin-top:3px; }
.ni-ctrl { display:flex; flex-direction:column; gap:4px; align-items:flex-end; flex-shrink:0; }
.ni-tog { padding:2px 8px; border-radius:99px; font-size:10px; font-weight:600; border:none; cursor:pointer; transition:all .2s; background:rgba(107,114,128,.12); color:var(--t3); }
.ni-tog.on { background:rgba(52,168,83,.14); color:#34d399; }
.ni-del { background:none; border:none; color:var(--t4); font-size:11px; cursor:pointer; transition:color .2s; }
.ni-del:hover { color:#f87171; }

/* ════════════════════════════════════
   AI CONTROL & SETTINGS
════════════════════════════════════ */
.ai-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:12px; }
.kb-card.full { grid-column:1/-1; }
.flag-row { display:flex; align-items:center; justify-content:space-between; padding:.7rem 0; border-bottom:1px solid rgba(99,102,241,.06); gap:10px; }
.flag-row:last-child { border-bottom:none; }
.flag-info { flex:1; }
.flag-lbl { font-size:13px; font-weight:500; color:var(--t1); }
.flag-desc { font-size:11.5px; color:var(--t3); margin-top:1px; }
.kb-tog { width:38px; height:20px; border-radius:99px; background:rgba(255,255,255,.07); border:1px solid var(--border); position:relative; cursor:pointer; transition:all .25s; flex-shrink:0; }
.kb-tog.on { background:linear-gradient(135deg,#4f46e5,#7c3aed); border-color:transparent; }
.tog-knob { position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:50%; background:#fff; transition:transform .25s; box-shadow:0 1px 3px rgba(0,0,0,.3); }
.kb-tog.on .tog-knob { transform:translateX(18px); }
.hint-txt { font-size:12px; color:var(--t3); margin-top:6px; display:flex; align-items:center; gap:6px; }
.hint-txt i { color:var(--acc); }
.sysinfo-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(170px,1fr)); gap:8px; }
.si { background:rgba(99,102,241,.05); border:1px solid var(--border); border-radius:9px; padding:9px 12px; display:flex; flex-direction:column; gap:3px; }
.si-l { font-size:10.5px; color:var(--t3); text-transform:uppercase; letter-spacing:.05em; }
.si-v { font-size:13px; font-weight:600; color:var(--t1); }
.si-v.online { color:#34d399; }
.range-v { color:#c4b5fd; margin-left:6px; }

/* ════════════════════════════════════
   LOGS
════════════════════════════════════ */
.log-level-row { display:flex; gap:4px; }
.ll-btn { padding:5px 11px; border:1px solid var(--border); border-radius:7px; background:none; color:var(--t3); font-size:11.5px; cursor:pointer; transition:all .2s; text-transform:capitalize; font-family:inherit; }
.ll-btn.active,.ll-btn:hover { background:rgba(99,102,241,.12); color:#a5b4fc; border-color:var(--border2); }
.log-viewer { background:#080910; border:1px solid var(--border); border-radius:12px; overflow:hidden; max-height:500px; overflow-y:auto; font-family:'JetBrains Mono','Fira Code',monospace; }
.log-line { display:grid; grid-template-columns:150px 58px 90px 1fr; gap:10px; padding:7px 14px; border-bottom:1px solid rgba(99,102,241,.04); font-size:11.5px; align-items:center; }
.log-line.error { background:rgba(239,68,68,.04); } .log-line.warn { background:rgba(245,158,11,.03); }
.ll-ts { color:var(--t4); }
.ll-lv { padding:1px 5px; border-radius:4px; font-size:10px; font-weight:700; text-transform:uppercase; text-align:center; }
.log-line.info .ll-lv  { background:rgba(6,182,212,.14); color:#67e8f9; }
.log-line.warn .ll-lv  { background:rgba(245,158,11,.14); color:#fcd34d; }
.log-line.error .ll-lv { background:rgba(239,68,68,.14);  color:#f87171; }
.log-line.debug .ll-lv { background:rgba(107,114,128,.1);  color:#9ca3af; }
.ll-src { color:var(--t3); }
.ll-msg { color:var(--t2); }

/* ════════════════════════════════════
   SECURITY
════════════════════════════════════ */
.sec-grid { display:grid; grid-template-columns:1fr 1.4fr; gap:12px; }
.ip-input-row { display:flex; gap:8px; margin-bottom:.5rem; }
.ip-row { display:flex; align-items:center; gap:8px; padding:7px 8px; background:rgba(239,68,68,.05); border:1px solid rgba(239,68,68,.1); border-radius:8px; margin-bottom:4px; }
.ip-row .mono { flex:1; font-size:12px; color:#f87171; }
.ip-del { background:none; border:none; color:rgba(239,68,68,.5); font-size:12px; cursor:pointer; transition:color .2s; }
.ip-del:hover { color:#f87171; }

/* ════════════════════════════════════
   FILES
════════════════════════════════════ */
.file-stats-row { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:10px; }
.fsr-card { background:var(--s3); border:1px solid var(--border); border-radius:12px; padding:.9rem 1rem; display:flex; align-items:center; gap:10px; }
.fsr-card i { font-size:1.35rem; }
.fsr-card b { display:block; font-size:1.1rem; font-weight:800; color:#fff; }
.fsr-card span { font-size:11.5px; color:var(--t3); }
.file-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:10px; }
.fg-card { background:var(--s3); border:1px solid var(--border); border-radius:12px; overflow:hidden; transition:all .2s; }
.fg-card:hover { border-color:var(--border2); transform:translateY(-2px); }
.fg-thumb { height:85px; background:rgba(99,102,241,.05); display:flex; align-items:center; justify-content:center; overflow:hidden; }
.fg-thumb img { width:100%; height:100%; object-fit:cover; }
.fg-thumb i { font-size:2rem; color:#6366f1; }
.fg-info { padding:7px 9px; }
.fg-name { font-size:11.5px; color:var(--t1); font-weight:500; }
.fg-size { font-size:10.5px; color:var(--t3); }
.fg-acts { display:flex; gap:5px; padding:5px 9px; border-top:1px solid var(--border); }
.fg-btn { flex:1; padding:5px; border-radius:6px; background:rgba(99,102,241,.08); border:none; color:#818cf8; font-size:11px; display:flex; align-items:center; justify-content:center; cursor:pointer; text-decoration:none; transition:all .2s; }
.fg-btn:hover { background:rgba(99,102,241,.2); }
.fg-btn.red { background:rgba(239,68,68,.08); color:#f87171; }
.fg-btn.red:hover { background:rgba(239,68,68,.2); }
.fg-empty { grid-column:1/-1; display:flex; flex-direction:column; align-items:center; gap:8px; padding:3rem; color:var(--t4); }
.fg-empty i { font-size:2.5rem; }

/* ════════════════════════════════════
   VISITORS
════════════════════════════════════ */
.top-pages { display:flex; flex-direction:column; gap:7px; }
.tp-row { display:flex; align-items:center; gap:8px; }
.tp-pg { font-size:12px; color:var(--t2); min-width:70px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.tp-bar-wrap { flex:1; height:5px; background:rgba(255,255,255,.05); border-radius:99px; overflow:hidden; }
.tp-bar { height:100%; background:linear-gradient(90deg,#06b6d4,#6366f1); border-radius:99px; transition:width .6s ease; }
.tp-n { font-size:12px; color:var(--t3); min-width:24px; text-align:right; }

/* ════════════════════════════════════
   INPUTS / BUTTONS
════════════════════════════════════ */
.srch-box { display:flex; align-items:center; gap:7px; background:rgba(255,255,255,.03); border:1px solid var(--border); border-radius:8px; padding:7px 11px; }
.srch-box i { color:var(--t4); font-size:12px; }
.srch-box input { background:none; border:none; outline:none; color:var(--t1); font-size:12.5px; font-family:inherit; min-width:150px; }
.srch-box input::placeholder { color:var(--t4); }
.kb-input { width:100%; padding:9px 11px; background:rgba(255,255,255,.04); border:1px solid var(--border); border-radius:9px; color:var(--t1); font-size:13px; outline:none; transition:border-color .2s, box-shadow .2s; font-family:inherit; resize:vertical; }
.kb-input:focus { border-color:rgba(99,102,241,.45); box-shadow:0 0 0 3px rgba(99,102,241,.1); }
.kb-input::placeholder { color:var(--t4); }
.kb-sel { padding:7px 10px; background:rgba(255,255,255,.04); border:1px solid var(--border); border-radius:8px; color:var(--t2); font-size:12.5px; outline:none; cursor:pointer; font-family:inherit; }
.kb-sel option { background:#1e1e2e; }
.kb-range { width:100%; accent-color:#6366f1; }
.btn-primary { display:inline-flex; align-items:center; gap:7px; padding:8px 16px; background:linear-gradient(135deg,#4f46e5,#7c3aed); border:none; border-radius:9px; color:#fff; font-size:13px; font-weight:500; cursor:pointer; transition:all .2s; font-family:inherit; }
.btn-primary.full { width:100%; justify-content:center; }
.btn-primary:hover:not(:disabled) { transform:translateY(-1px); box-shadow:0 4px 14px rgba(79,70,229,.4); }
.btn-primary:disabled { opacity:.45; cursor:not-allowed; transform:none; }
.btn-outline { display:inline-flex; align-items:center; gap:7px; padding:7px 14px; background:none; border:1px solid var(--border2); border-radius:9px; color:#818cf8; font-size:13px; cursor:pointer; transition:all .2s; font-family:inherit; }
.btn-outline:hover { background:rgba(99,102,241,.1); }
.btn-danger { display:inline-flex; align-items:center; gap:7px; padding:8px 16px; background:rgba(239,68,68,.14); border:1px solid rgba(239,68,68,.3); border-radius:9px; color:#f87171; font-size:13px; cursor:pointer; transition:all .2s; font-family:inherit; }
.btn-danger:hover { background:rgba(239,68,68,.25); }
.ip-input-row .btn-danger { padding:7px 12px; white-space:nowrap; }

/* ════════════════════════════════════
   MODALS
════════════════════════════════════ */
.kb-overlay { position:fixed; inset:0; background:rgba(0,0,0,.72); display:flex; align-items:center; justify-content:center; z-index:1000; backdrop-filter:blur(8px); }
.kb-modal { background:#0f0f1a; border:1px solid rgba(99,102,241,.22); border-radius:18px; width:min(500px,94vw); box-shadow:0 24px 60px rgba(0,0,0,.5); animation:fadeUp .25s ease; overflow:hidden; max-height:90vh; display:flex; flex-direction:column; }
.kb-modal.large { width:min(720px,96vw); }
.km-head { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; border-bottom:1px solid rgba(99,102,241,.1); flex-shrink:0; }
.km-head h3 { font-size:14px; font-weight:700; color:#fff; display:flex; align-items:center; gap:7px; }
.km-head button { background:none; border:none; color:var(--t3); font-size:15px; cursor:pointer; padding:4px; border-radius:6px; transition:all .2s; }
.km-head button:hover { background:rgba(255,255,255,.06); color:var(--t1); }
.km-meta { display:flex; gap:14px; padding:.7rem 1.25rem; border-bottom:1px solid rgba(99,102,241,.07); font-size:12px; color:var(--t3); flex-wrap:wrap; }
.km-meta span { display:flex; align-items:center; gap:6px; }
.km-txt { padding:1.25rem; font-size:13.5px; color:var(--t2); line-height:1.6; }
.km-foot { display:flex; gap:8px; justify-content:flex-end; padding:.75rem 1.25rem; border-top:1px solid rgba(99,102,241,.07); }
.km-transcript { padding:1rem 1.25rem; overflow-y:auto; display:flex; flex-direction:column; gap:8px; flex:1; }
.kmt-msg { padding:10px 12px; border-radius:10px; }
.kmt-msg.user      { background:rgba(99,102,241,.1); border-left:3px solid #6366f1; }
.kmt-msg.assistant { background:rgba(168,85,247,.08); border-left:3px solid #a855f7; }
.kmt-role { font-size:10px; font-weight:700; text-transform:uppercase; color:var(--t3); margin-bottom:3px; }
.kmt-txt { font-size:13px; color:var(--t2); line-height:1.55; }
.kmt-ts { font-size:10.5px; color:var(--t4); margin-top:4px; }

/* ════════════════════════════════════
   TOAST
════════════════════════════════════ */
.kb-toast { position:fixed; bottom:24px; right:24px; background:#0f0f1a; border:1px solid rgba(99,102,241,.22); border-radius:10px; padding:12px 18px; font-size:13px; display:flex; align-items:center; gap:9px; box-shadow:0 8px 24px rgba(0,0,0,.4); z-index:2000; }
.kb-toast.success { border-color:rgba(52,168,83,.3); color:#34d399; }
.kb-toast.error   { border-color:rgba(239,68,68,.3); color:#f87171; }
.toast-enter-active,.toast-leave-active { transition:all .3s ease; }
.toast-enter-from,.toast-leave-to { opacity:0; transform:translateX(20px); }

/* ════════════════════════════════════
   TRANSITIONS + ANIMATIONS
════════════════════════════════════ */
.pg-enter-active,.pg-leave-active { transition:all .22s ease; }
.pg-enter-from { opacity:0; transform:translateY(8px); }
.pg-leave-to   { opacity:0; transform:translateY(-5px); }
.modal-enter-active,.modal-leave-active { transition:all .25s ease; }
.modal-enter-from,.modal-leave-to { opacity:0; transform:scale(.96); }
.af-item-enter-active { animation:fadeUp .28s ease; }
.af-item-leave-active { transition:all .25s; }
.af-item-leave-to { opacity:0; transform:translateX(-16px); }

/* ════════════════════════════════════
   USAGE & BILLING
════════════════════════════════════ */
.plans-row { display:flex; gap:12px; flex-wrap:wrap; margin-top:.5rem; }
.plan-card { flex:1; min-width:120px; background:rgba(99,102,241,.06); border:1px solid rgba(99,102,241,.15); border-radius:12px; padding:1.1rem; text-align:center; }
.plan-card.free    { border-color:rgba(107,114,128,.2);  }
.plan-card.premium { border-color:rgba(245,158,11,.25);  }
.plan-card.enterprise { border-color:rgba(168,85,247,.3); }
.pc-icon { font-size:1.5rem; margin-bottom:.5rem; }
.plan-card.free .pc-icon { color:#6b7280; }
.plan-card.premium .pc-icon { color:#f59e0b; }
.plan-card.enterprise .pc-icon { color:#a855f7; }
.pc-label { font-size:12px; font-weight:700; color:var(--t2); text-transform:capitalize; margin-bottom:4px; }
.pc-count { font-size:1.2rem; font-weight:800; color:#fff; }

/* ════════════════════════════════════
   MODERATION
════════════════════════════════════ */
.mod-count-badge { display:flex; align-items:center; gap:6px; padding:6px 12px; background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.2); border-radius:99px; color:#f87171; font-size:12.5px; font-weight:600; }
.mod-content { max-width:300px; color:var(--t2); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }

/* ════════════════════════════════════
   AI TEST PANEL
════════════════════════════════════ */
.test-ms { font-size:12.5px; color:#34d399; background:rgba(52,168,83,.1); padding:4px 10px; border-radius:99px; }
.test-error { display:flex; align-items:center; gap:8px; color:#f87171; background:rgba(239,68,68,.08); border:1px solid rgba(239,68,68,.2); border-radius:9px; padding:10px 14px; font-size:13px; margin-bottom:1rem; }
.test-response { background:rgba(99,102,241,.06); border:1px solid rgba(99,102,241,.15); border-radius:10px; overflow:hidden; }
.tr-head { display:flex; align-items:center; gap:8px; padding:8px 14px; border-bottom:1px solid rgba(99,102,241,.12); font-size:12px; font-weight:600; color:#a5b4fc; }
.tr-content { padding:12px 14px; font-size:13.5px; color:var(--t2); line-height:1.65; white-space:pre-wrap; max-height:300px; overflow-y:auto; }

@media(max-width:1100px){ .dash-mid,.dash-bot { flex-direction:column; } .activity-box,.donut-box { width:100%; } .notif-grid,.sec-grid { grid-template-columns:1fr; } }
@media(max-width:768px){ .kba-topbar { flex-wrap:wrap; } .kbt-center { order:3; width:100%; max-width:100%; } .circ-row { grid-template-columns:repeat(2,1fr); } }
</style>
