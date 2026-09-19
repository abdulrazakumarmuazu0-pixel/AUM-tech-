// ===== AUM DEVELOPER WORKSPACE — dev.js =====
document.addEventListener('DOMContentLoaded', () => {
  const auth = firebase.auth();
  const db = firebase.firestore();
  window.AUM_db = db;

  /* ---------- AUTH GUARD (staff only) ---------- */
  auth.onAuthStateChanged(async user => {
    if (!user) { location.href = 'login.html'; return; }
    let role = 'staff';
    try {
      const snap = await db.collection('users').doc(user.uid).get();
      if (snap.exists && snap.data().role) role = snap.data().role;
    } catch (e) { console.warn(e); }
    if (!['admin','superadmin','staff'].includes(role)) {
      alert('⚠ Developer workspace is for staff only.');
      await auth.signOut(); location.href = 'login.html'; return;
    }
    loadDev(user);
  });

  document.getElementById('logoutBtn')?.addEventListener('click', () => auth.signOut());

  /* ---------- LOADERS ---------- */
  let allLogs = [];
  function loadDev(user) {
    db.collection('repos').orderBy('createdAt','desc').onSnapshot(s => {
      setText('statRepos', s.size); renderRepos(s.docs);
    });
    db.collection('environments').onSnapshot(s => {
      setText('statEnvs', s.size); renderEnvs(s.docs);
    });
    db.collection('deployments').orderBy('createdAt','desc').limit(30).onSnapshot(s => {
      setText('statDeploys', s.size); renderDeploys(s.docs);
    });
    db.collection('apiKeys').onSnapshot(s => {
      setText('statKeys', s.size); renderKeys(s.docs);
    });
    db.collection('devLogs').orderBy('createdAt','desc').limit(100).onSnapshot(s => {
      allLogs = s.docs; setText('statLogs', s.size); renderLogs(s.docs);
    });
    db.collection('monitors').onSnapshot(s => {
      setText('statMonitors', s.size); renderMonitors(s.docs);
    });

    bindForm('addRepoForm', 'repos', () => ({}));
    bindForm('addEnvForm', 'environments', () => ({}));
    bindForm('addKeyForm', 'apiKeys', () => ({}));
    bindForm('addMonitorForm', 'monitors', () => ({ status: 'unknown', checks: 0, ups: 0 }));

    const depForm = document.getElementById('addDeployForm');
    if (depForm) depForm.addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(depForm).entries());
      await db.collection('deployments').add({
        ...d, status: 'Success', deployedBy: user.email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await db.collection('devLogs').add({ level: 'info', source: 'deploy',
        message: `Deployed ${d.project} v${d.version} to ${d.environment}`,
        createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      depForm.reset();
    });

    const logForm = document.getElementById('addLogForm');
    if (logForm) logForm.addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(logForm).entries());
      await db.collection('devLogs').add({ ...d,
        createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      logForm.reset();
    });

    // Log filters
    document.querySelectorAll('.filter-btn[data-level]').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-level]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const f = btn.dataset.level;
      renderLogs(allLogs.filter(d => f === 'all' || (d.data().level || 'info') === f));
    }));
    const search = document.getElementById('logSearch');
    if (search) search.addEventListener('input', () => {
      const q = search.value.toLowerCase();
      renderLogs(allLogs.filter(d => JSON.stringify(d.data()).toLowerCase().includes(q)));
    });
  }

  function bindForm(formId, col, extra) {
    const f = document.getElementById(formId);
    if (!f) return;
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f).entries());
      await db.collection(col).add({ ...d, ...extra(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      f.reset();
    });
  }

  /* ---------- RENDERERS ---------- */
  function renderRepos(docs) {
    const el = document.getElementById('repoList');
    if (!el) return;
    el.innerHTML = docs.map(d => { const x = d.data(); return `
      <div class="kb-card" style="cursor:default">
        <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <h5>📦 ${esc(x.name)}</h5>
          <span class="status ${x.visibility === 'Private' ? 'st-pending' : 'st-active'}">${esc(x.visibility || 'Public')}</span>
        </div>
        <small>${esc(x.description || '')}</small>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
          ${(x.tech || '').split(',').filter(Boolean).map(t => `<span class="status st-active" style="background:rgba(124,58,237,.15)">${esc(t.trim())}</span>`).join('')}
        </div>
        <div style="margin-top:12px">
          <a class="svc-link" style="font-size:.82rem" href="${esc(x.url)}" target="_blank" rel="noopener">🔗 Open Repository →</a>
          <button class="btn btn-ghost" style="padding:4px 12px;font-size:.72rem;float:right" onclick="AUM_db.collection('repos').doc('${d.id}').delete()">🗑</button>
        </div>
      </div>`; }).join('') || '<div class="empty"><div class="big">📦</div>No repositories yet.</div>';
  }

  function renderEnvs(docs) {
    const el = document.getElementById('envList');
    if (!el) return;
    const stages = ['Development','Staging','Production'];
    el.innerHTML = docs.map(d => { const x = d.data(); return `
      <div class="kb-card" style="cursor:default">
        <div style="display:flex;justify-content:space-between;gap:10px">
          <h5>🖥 ${esc(x.project)}</h5>
          <button class="btn btn-ghost" style="padding:4px 12px;font-size:.72rem" onclick="AUM_db.collection('environments').doc('${d.id}').delete()">🗑</button>
        </div>
        ${stages.map(s => { const u = x[s.toLowerCase()]; return u ? `
          <div style="display:flex;align-items:center;gap:10px;margin-top:10px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:10px 14px">
            <span class="status ${s === 'Production' ? 'st-done' : s === 'Staging' ? 'st-pending' : 'st-active'}">${s}</span>
            <a href="https://${esc(u.replace(/^https?:\/\//,''))}" target="_blank" rel="noopener" style="font-size:.84rem;color:var(--primary);word-break:break-all">${esc(u)}</a>
          </div>` : ''; }).join('')}
        ${x.notes ? `<small style="margin-top:10px">📝 ${esc(x.notes)}</small>` : ''}
      </div>`; }).join('') || '<div class="empty"><div class="big">🖥</div>No environments configured.</div>';
  }

  function renderDeploys(docs) {
    const tb = document.getElementById('deployBody');
    if (!tb) return;
    tb.innerHTML = docs.map(d => { const x = d.data(); return `<tr>
      <td><strong>${esc(x.project)}</strong></td><td>v${esc(x.version)}</td>
      <td><span class="status ${x.environment === 'production' ? 'st-done' : 'st-active'}">${esc(x.environment)}</span></td>
      <td><span class="status st-done">✓ ${esc(x.status || 'Success')}</span></td>
      <td>${esc(x.deployedBy || '—')}</td>
      <td>${x.createdAt ? new Date(x.createdAt.toDate()).toLocaleString() : '—'}</td>
      <td>${x.status !== 'Rolled back' ? `<button class="btn btn-ghost" style="padding:5px 14px;font-size:.75rem;color:#ff8f6b" onclick="AUM_db.collection('deployments').doc('${d.id}').update({status:'Rolled back'})">↩ Rollback</button>` : '<span class="status st-hold">Rolled back</span>'}</td></tr>`; }).join('')
      || `<tr><td colspan="7"><div class="empty"><div class="big">🚀</div>No deployments yet.</div></td></tr>`;
    const t2 = document.getElementById('deployBody2');
    if (t2) t2.innerHTML = tb.innerHTML;
  }

  function renderKeys(docs) {
    const el = document.getElementById('keyList');
    if (!el) return;
    el.innerHTML = docs.map(d => { const x = d.data(); const masked = x.key ? '••••••••' + x.key.slice(-4) : '—'; return `
      <div class="kb-card" style="cursor:default">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
          <h5>🔑 ${esc(x.name)}</h5>
          <span class="status st-active">${esc(x.service || 'API')}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:12px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:11px 14px">
          <code style="font-size:.85rem;letter-spacing:1px">${masked}</code>
          <button class="btn btn-ghost" style="padding:5px 13px;font-size:.75rem;margin-left:auto" onclick="navigator.clipboard.writeText('${esc(x.key||'')}').then(()=>alert('Key copied!'))">📋 Copy</button>
        </div>
        ${x.notes ? `<small style="margin-top:10px">📝 ${esc(x.notes)}</small>` : ''}
        <button class="btn btn-ghost" style="padding:4px 12px;font-size:.72rem;margin-top:10px;color:#ff8f6b" onclick="AUM_db.collection('apiKeys').doc('${d.id}').delete()">🗑 Delete</button>
      </div>`; }).join('') || '<div class="empty"><div class="big">🔑</div>No API keys stored yet.</div>';
  }

  function renderLogs(docs) {
    const el = document.getElementById('logList');
    if (!el) return;
    const color = { error: '#ff6b64', warn: '#febc2e', info: '#00d4ff' };
    el.innerHTML = docs.map(d => { const x = d.data(); return `
      <div style="display:flex;gap:14px;padding:13px 4px;border-bottom:1px solid var(--border);align-items:flex-start">
        <span style="color:${color[x.level] || color.info};font-weight:800;font-size:.75rem;min-width:52px;text-transform:uppercase;padding-top:2px">${esc(x.level || 'info')}</span>
        <div style="min-width:0">
          <p style="font-size:.9rem;margin:0">${esc(x.message)}</p>
          <small style="color:var(--muted)">${esc(x.source || 'system')} · ${x.createdAt ? new Date(x.createdAt.toDate()).toLocaleString() : '—'}</small>
        </div>
      </div>`; }).join('') || '<div class="empty"><div class="big">📜</div>No logs.</div>';
  }

  function renderMonitors(docs) {
    const el = document.getElementById('monitorList');
    if (!el) return;
    el.innerHTML = docs.map(d => { const x = d.data();
      const pct = x.checks ? Math.round((x.ups / x.checks) * 100) : 0;
      return `
      <div class="kb-card" style="cursor:default">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center">
          <h5>🌐 ${esc(x.name)}</h5>
          <span class="status ${x.status === 'up' ? 'st-done' : x.status === 'down' ? 'st-hold' : 'st-pending'}">${x.status === 'up' ? '✓ Up' : x.status === 'down' ? '✗ Down' : '… Unknown'}</span>
        </div>
        <small>${esc(x.url)}</small>
        <div class="progress-track" style="margin-top:12px"><div class="progress-fill" style="width:${pct}%"></div></div>
        <small style="margin-top:6px;display:block">Uptime: ${pct}% (${x.ups || 0}/${x.checks || 0} checks)</small>
        <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
          <button class="btn btn-primary" style="padding:7px 18px;font-size:.78rem" onclick="aumCheck('${d.id}','${esc(x.url)}')">🔍 Check Now</button>
          <button class="btn btn-ghost" style="padding:7px 14px;font-size:.78rem;color:#ff8f6b" onclick="AUM_db.collection('monitors').doc('${d.id}').delete()">🗑</button>
        </div>
      </div>`; }).join('') || '<div class="empty"><div class="big">🌐</div>No monitors yet — add a URL to start tracking uptime.</div>';
  }

  /* Uptime check (client-side, CORS-safe) */
  window.aumCheck = async (id, url) => {
    const btn = event.target; btn.textContent = '⏳ Checking…'; btn.disabled = true;
    let up = false;
    try {
      await fetch(url, { mode: 'no-cors', cache: 'no-store' });
      up = true; // opaque response = server reachable
    } catch { up = false; }
    await AUM_db.collection('monitors').doc(id).update({
      status: up ? 'up' : 'down',
      checks: firebase.firestore.FieldValue.increment(1),
      ups: firebase.firestore.FieldValue.increment(up ? 1 : 0),
      lastCheck: new Date()
    });
    await AUM_db.collection('devLogs').add({ level: up ? 'info' : 'error', source: 'monitor',
      message: `${url} is ${up ? 'UP' : 'DOWN'}`,
      createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  };

  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
});
