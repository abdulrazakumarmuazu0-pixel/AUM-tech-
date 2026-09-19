// ===== AUM SUPER ADMIN — super.js =====
document.addEventListener('DOMContentLoaded', () => {
  const auth = firebase.auth();
  const db = firebase.firestore();
  window.AUM_db = db;
  const PERMS = ['view','create','edit','delete'];

  /* ---------- SUPERADMIN GUARD ---------- */
  auth.onAuthStateChanged(async user => {
    if (!user) { location.href = 'login.html'; return; }
    let role = null;
    try {
      const snap = await db.collection('users').doc(user.uid).get();
      if (snap.exists) role = snap.data().role;
    } catch (e) { console.warn(e); }
    if (role !== 'superadmin') {
      alert('⚠ Super Admin requires superadmin role. Current role: ' + (role || 'none (rules not deployed?)') + '\n\nYi Login a admin/login.html kaɗan — shi ne yake creating superadmin na farko. Sannan tabbatar ka deploy Firestore rules.');
      location.href = 'operations.html'; return;
    }
    document.getElementById('superAv').textContent = (user.email || 'A')[0].toUpperCase();
    document.getElementById('superEmail').textContent = user.email;
    loadSuper(user);
  });

  document.getElementById('logoutBtn')?.addEventListener('click', () => auth.signOut());

  /* ---------- FRIENDLY FIRESTORE ERROR BANNER ---------- */
  let _errBanner = null;
  function snapErr(module) {
    return err => {
      console.warn(`[${module}]`, err.code, err.message);
      if (_errBanner || !document.body) return;
      _errBanner = document.createElement('div');
      _errBanner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:rgba(255,95,87,.97);color:#fff;padding:13px 18px;font-size:.83rem;font-weight:600;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.4);line-height:1.5';
      _errBanner.textContent = err.code === 'permission-denied'
        ? '⚠ Firestore permission-denied: Rules ba a deploy ba. Console → Firestore → Rules → Publish.'
        : '⚠ Firestore ' + err.code + ' — duba internet connection ɗinka.';
      const x = document.createElement('button');
      x.textContent = '✕';
      x.style.cssText = 'position:absolute;right:12px;top:10px;background:none;border:none;color:#fff;font-size:1.1rem;cursor:pointer';
      x.onclick = () => { _errBanner.remove(); _errBanner = null; };
      _errBanner.appendChild(x);
      document.body.appendChild(_errBanner);
    };
  }

  /* ---------- LOAD ---------- */
  function loadSuper(user) {
    db.collection('users').orderBy('createdAt','desc').onSnapshot(s => {
      setText('statUsers', s.size);
      const admins = s.docs.filter(d => ['admin','superadmin'].includes(d.data().role)).length;
      setText('statAdmins', admins);
      const clients = s.docs.filter(d => d.data().role === 'client').length;
      setText('statUsersClients', clients);
      renderUsers(s.docs, user.uid);
    }, snapErr('users'));
    db.collection('auditLogs').orderBy('timestamp','desc').limit(60).onSnapshot(s => {
      setText('statAudit', s.size); renderAudit(s.docs);
    }, snapErr('auditLogs'));
    db.collection('roles').onSnapshot(s => renderRoles(s.docs));
    ['leads','clients','projects','invoices','tickets'].forEach(col =>
      db.collection(col).onSnapshot(s => setText('count-' + col, s.size)));
    db.collection('payments').onSnapshot(s => {
      const total = s.docs.reduce((a, p) => a + (p.data().amount || 0), 0);
      setText('analyticsRevenue', '₦' + total.toLocaleString());
    }, snapErr('payments'));

    loadSettings();
    bindSettingsForm('companyForm', 'company');
    bindSettingsForm('securityForm', 'security');
    bindSettingsForm('generalForm', 'general');

    /* Feature flags */
    db.collection('settings').doc('config').onSnapshot(snap => {
      const cfg = snap.exists ? snap.data() : {};
      document.querySelectorAll('[data-flag]').forEach(t => t.checked = !!cfg[t.dataset.flag]);
      const mm = document.getElementById('maintBanner');
      if (mm) mm.style.display = cfg.maintenanceMode ? 'block' : 'none';
    });
    document.querySelectorAll('[data-flag]').forEach(toggle => toggle.addEventListener('change', () => {
      db.collection('settings').doc('config').update({ [toggle.dataset.flag]: toggle.checked });
      db.collection('auditLogs').add({ action: 'config_change', entity: toggle.dataset.flag,
        newValue: String(toggle.checked), userId: user.uid, userEmail: user.email, timestamp: new Date() });
    }));

    /* Create user (admin-created accounts) */
    const cu = document.getElementById('createUserForm');
    if (cu) cu.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = document.getElementById('cuMsg');
      const d = Object.fromEntries(new FormData(cu).entries());
      try {
        const sec = firebase.app().options; // use secondary app to avoid logging out current superadmin
        const app2 = firebase.apps.length > 1 ? firebase.app('secondary')
          : firebase.initializeApp(sec, 'secondary');
        const cred = await app2.auth().createUserWithEmailAndPassword(d.email, d.password);
        await db.collection('users').doc(cred.user.uid).set({
          name: d.name, email: d.email, role: d.role, status: 'active',
          createdBy: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await app2.auth().signOut();
        msg.className = 'form-msg success'; msg.textContent = `✓ User "${d.name}" created with role ${d.role}.`;
        cu.reset();
      } catch (err) { msg.className = 'form-msg error'; msg.textContent = '✗ ' + err.message; }
    });
  }

  /* ---------- USERS ---------- */
  function renderUsers(docs, myUid) {
    const tb = document.getElementById('usersBody');
    const roleFilter = document.getElementById('userRoleFilter');
    const q = (roleFilter?.value || 'all').toLowerCase();
    const filtered = docs.filter(d => q === 'all' || (d.data().role || '') === q);
    if (roleFilter && !roleFilter.dataset.bound) {
      roleFilter.dataset.bound = 1;
      roleFilter.addEventListener('change', () => renderUsers(docs, myUid));
    }
    tb.innerHTML = filtered.map(d => { const x = d.data(); const me = d.id === myUid; return `<tr>
      <td><div style="display:flex;align-items:center;gap:12px"><span class="avatar-sm">${esc((x.name||'?')[0].toUpperCase())}</span>
        <div><strong>${esc(x.name || '—')}</strong>${me ? ' <span class="status st-active" style="font-size:.65rem">YOU</span>' : ''}<br><small style="color:var(--muted)">${esc(x.email || '')}</small></div></div></td>
      <td><select ${me ? 'disabled' : ''} onchange="aumSetRole('${d.id}', this.value)" style="background:var(--bg2);border:1px solid var(--border);border-radius:9px;padding:7px 10px;color:var(--text);font-family:inherit;font-size:.85rem">
        ${['client','staff','admin','superadmin'].map(r => `<option ${r === x.role ? 'selected' : ''}>${r}</option>`).join('')}</select></td>
      <td><small style="color:var(--muted)">${x.createdAt ? new Date(x.createdAt.toDate()).toLocaleDateString() : '—'}</small></td>
      <td><button ${me ? 'disabled' : ''} class="btn btn-ghost" style="padding:6px 14px;font-size:.78rem;${x.status==='suspended'?'color:var(--accent)':'color:#ff8f6b'}" onclick="aumToggleStatus('${d.id}','${x.status==='suspended'?'active':'suspended'}')">${x.status === 'suspended' ? '✓ Activate' : '⏸ Suspend'}</button></td>
      <td><button ${me ? 'disabled' : ''} class="btn btn-ghost" style="padding:6px 12px;font-size:.78rem;color:#ff6b64" onclick="if(confirm('Delete this user document?')) AUM_db.collection('users').doc('${d.id}').delete()">🗑</button></td></tr>`; }).join('')
      || `<tr><td colspan="5"><div class="empty"><div class="big">👥</div>No users found.</div></td></tr>`;
  }
  window.aumSetRole = async (uid, role) => {
    await AUM_db.collection('users').doc(uid).update({ role });
    await AUM_db.collection('auditLogs').add({ action: 'role_change', entityId: uid, newValue: role,
      userId: auth.currentUser.uid, userEmail: auth.currentUser.email, timestamp: new Date() });
  };
  window.aumToggleStatus = async (uid, status) => {
    await AUM_db.collection('users').doc(uid).update({ status });
    await AUM_db.collection('auditLogs').add({ action: 'user_' + status, entityId: uid,
      userId: auth.currentUser.uid, userEmail: auth.currentUser.email, timestamp: new Date() });
  };

  /* ---------- ROLES & PERMISSIONS ---------- */
  const MODULES = ['portal','crm','projects','finance','dev_workspace','super_admin'];
  function renderRoles(docs) {
    const wrap = document.getElementById('rolesMatrix');
    const roles = {};
    docs.forEach(d => roles[d.id] = d.data().perms || {});
    const allRoles = ['client','staff','admin','superadmin'];
    wrap.innerHTML = `<table class="p-table"><thead><tr><th>Module \\ Permission</th>${allRoles.map(r => `<th style="text-transform:none">${r}</th>`).join('')}</tr></thead><tbody>${
      MODULES.map(m => `<tr><td><strong>${m.replace('_',' ')}</strong></td>${allRoles.map(r => {
        const p = (roles[r] || {})[m] || [];
        return `<td><div style="display:flex;gap:8px;flex-wrap:wrap">${PERMS.map(x => `
          <label style="display:flex;align-items:center;gap:4px;font-size:.75rem;color:var(--muted);cursor:pointer">
            <input type="checkbox" ${p.includes(x) ? 'checked' : ''} onchange="aumPerm('${r}','${m}','${x}',this.checked)"> ${x}</label>`).join('')}</div></td>`;
      }).join('')}</tr>`).join('')}</tbody></table>`;
  }
  window.aumPerm = async (role, module, perm, on) => {
    const ref = AUM_db.collection('roles').doc(role);
    const snap = await ref.get();
    const perms = snap.exists ? (snap.data().perms || {}) : {};
    const cur = new Set(perms[module] || []);
    on ? cur.add(perm) : cur.delete(perm);
    perms[module] = [...cur];
    await ref.set({ perms, updatedAt: new Date() }, { merge: true });
  };

  /* ---------- SETTINGS ---------- */
  async function loadSettings() {
    ['company','security','general'].forEach(async doc => {
      const snap = await db.collection('settings').doc(doc).get();
      if (!snap.exists) return;
      Object.entries(snap.data()).forEach(([k, v]) => {
        const el = document.querySelector(`#${doc}Form [name="${k}"]`);
        if (!el) return;
        if (el.type === 'checkbox') el.checked = !!v; else el.value = v;
      });
    });
  }
  function bindSettingsForm(formId, doc) {
    const f = document.getElementById(formId);
    if (!f) return;
    f.addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f).entries());
      f.querySelectorAll('input[type=checkbox]').forEach(c => d[c.name] = c.checked);
      await db.collection('settings').doc(doc).set(d, { merge: true });
      const msg = document.getElementById(formId + 'Msg');
      if (msg) { msg.className = 'form-msg success'; msg.textContent = '✓ Settings saved.'; setTimeout(() => msg.className = 'form-msg', 2500); }
    });
  }

  /* ---------- AUDIT LOGS ---------- */
  function renderAudit(docs) {
    const el = document.getElementById('auditBody');
    el.innerHTML = docs.map(d => { const x = d.data(); return `<tr>
      <td><small>${x.timestamp ? new Date(x.timestamp.toDate ? x.timestamp.toDate() : x.timestamp).toLocaleString() : '—'}</small></td>
      <td><span class="status st-active">${esc(x.action || '—')}</span></td>
      <td>${esc(x.userEmail || x.userId || 'system')}</td>
      <td>${esc(x.entity || x.entityId || '—')}</td>
      <td>${esc(x.newValue || x.value || '—')}</td></tr>`; }).join('')
      || `<tr><td colspan="5"><div class="empty"><div class="big">📋</div>No audit entries yet — actions like role changes & config changes appear here.</div></td></tr>`;
  }

  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
});
