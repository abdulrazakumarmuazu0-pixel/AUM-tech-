// ===== AUM ADMIN OPERATIONS — admin.js =====
document.addEventListener('DOMContentLoaded', () => {
  const auth = firebase.auth();
  const db = firebase.firestore();
  window.AUM_db = db;
  const isLogin = location.pathname.endsWith('login.html');

  /* ---------- AUTH & ROLE GUARD ---------- */
  auth.onAuthStateChanged(async user => {
    if (!user && !isLogin) { location.href = 'login.html'; return; }
    if (user && isLogin) { location.href = 'operations.html'; return; }
    if (user && !isLogin) {
      let role = null, profile = {};
      try {
        const snap = await db.collection('users').doc(user.uid).get();
        if (snap.exists) { profile = snap.data(); role = profile.role; }
      } catch (e) { console.warn(e); }
      if (!role) {
        // FIRST-RUN SETUP: very first user becomes superadmin (never block UI)
        try {
          await db.collection('users').doc(user.uid).set({
            name: user.email.split('@')[0], email: user.email, role: 'superadmin',
            status: 'active', createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        } catch (e) { console.warn('first-run setup failed (deploy rules):', e); }
        role = 'superadmin'; profile.role = 'superadmin';
      }
      if (!['admin','superadmin','staff'].includes(role)) {
        alert('⚠ This area is for staff only. Your account is a client account.');
        await auth.signOut(); location.href = 'login.html'; return;
      }
      loadAdmin(user, profile);
    }
  });

  /* ---------- FRIENDLY FIRESTORE ERROR BANNER ---------- */
  let _errBanner = null;
  function snapErr(module) {
    return err => {
      console.warn(`[${module}]`, err.code, err.message);
      if (_errBanner || !document.body) return;
      _errBanner = document.createElement('div');
      _errBanner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:rgba(255,95,87,.97);color:#fff;padding:13px 18px;font-size:.83rem;font-weight:600;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.4);line-height:1.5';
      _errBanner.textContent = err.code === 'permission-denied'
        ? '⚠ Firestore permission-denied: Rules ba a deploy ba / suna blocking. Console → Firestore → Rules → Publish (ga LAUNCH_CHECKLIST.md).'
        : '⚠ Firestore ' + err.code + ' — duba internet connection ɗinka.';
      const x = document.createElement('button');
      x.textContent = '✕';
      x.style.cssText = 'position:absolute;right:12px;top:10px;background:none;border:none;color:#fff;font-size:1.1rem;cursor:pointer';
      x.onclick = () => { _errBanner.remove(); _errBanner = null; };
      _errBanner.appendChild(x);
      document.body.appendChild(_errBanner);
    };
  }

  /* ---------- LOGIN FORM ---------- */
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = document.getElementById('formMsg');
    const d = Object.fromEntries(new FormData(loginForm).entries());
    try {
      await auth.signInWithEmailAndPassword(d.email, d.password);
      msg.className = 'form-msg success'; msg.textContent = '✓ Welcome! Redirecting...';
    } catch { msg.className = 'form-msg error'; msg.textContent = '✗ Invalid email or password.'; }
  });

  /* ---------- LOAD ADMIN ---------- */
  async function loadAdmin(user, profile) {
    document.getElementById('adminName').textContent = profile.name || user.email.split('@')[0];
    document.getElementById('adminRole').textContent = profile.role || 'admin';
    document.getElementById('adminAv').textContent = (profile.name || user.email)[0].toUpperCase();



    /* Real-time listeners */
    db.collection('leads').orderBy('createdAt', 'desc').onSnapshot(s => {
      setText('statLeads', s.size);
      renderKanban(s.docs);
      const newCount = s.docs.filter(d => d.data().status === 'New').length;
      setText('leadBadge', newCount || '');
    }, snapErr('leads'));
    db.collection('clients').onSnapshot(s => { setText('statClients', s.size); renderClients(s.docs); }, snapErr('clients'));
    db.collection('projects').onSnapshot(s => {
      setText('statProjects', s.size);
      const active = s.docs.filter(d => ['In Progress','Review','Pending'].includes(d.data().status)).length;
      setText('statActive', active);
      renderProjects(s.docs);
    }, snapErr('projects'));
    db.collection('users').where('role', 'in', ['admin','superadmin','staff','client']).onSnapshot(s => {
      renderTeam(s.docs);
    }, snapErr('users'));
    db.collection('tasks').orderBy('createdAt', 'desc').onSnapshot(renderTasks, snapErr('tasks'));
    db.collection('payments').onSnapshot(renderPayments, snapErr('payments'));
    db.collection('expenses').onSnapshot(renderExpenses, snapErr('expenses'));

    /* Message Inbox — real-time threads from clients */
    db.collection('messages').orderBy('createdAt', 'desc').limit(200).onSnapshot(s => {
      renderInbox(s.docs);
    }, snapErr('messages'));

    db.collection('invoices').orderBy('createdAt', 'desc').onSnapshot(s => {
      renderAdminInvoices(s.docs);
    }, snapErr('invoices'));
    db.collection('blog').orderBy('createdAt', 'desc').onSnapshot(s => {
      renderBlogAdmin(s.docs);
    }, snapErr('blog'));
    db.collection('proposals').orderBy('createdAt', 'desc').onSnapshot(s => {
      renderAdminProposals(s.docs);
    }, snapErr('proposals'));
    db.collection('contracts').orderBy('createdAt', 'desc').onSnapshot(s => {
      renderAdminContracts(s.docs);
    }, snapErr('contracts'));

    /* Add lead form */
    const lf = document.getElementById('addLeadForm');
    if (lf) lf.addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(lf).entries());
      await db.collection('leads').add({ ...d, status: 'New', source: d.source || 'Manual',
        createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      lf.reset();
    });

    /* Add task */
    const tf = document.getElementById('addTaskForm');
    if (tf) tf.addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(tf).entries());
      await db.collection('tasks').add({ ...d, status: 'To Do', createdBy: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      tf.reset();
    });

    /* Add expense */
    const ef = document.getElementById('addExpenseForm');
    if (ef) ef.addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(ef).entries());
      await db.collection('expenses').add({ ...d, amount: +d.amount, createdBy: user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      ef.reset();
    });

    /* Inbox reply */
    const inboxForm = document.getElementById('inboxForm');
    if (inboxForm) inboxForm.addEventListener('submit', async e => {
      e.preventDefault();
      const inp = document.getElementById('inboxInput');
      if (!inp.value.trim()) return;
      await db.collection('messages').add({
        projectId: activeThread, senderId: user.uid,
        senderName: profile.name || 'Support Team',
        text: inp.value.trim(), read: true,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      inp.value = '';
    });

    /* Create invoice */
    const invForm = document.getElementById('addInvoiceForm');
    if (invForm) invForm.addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(invForm).entries());
      const num = 'INV-' + Date.now().toString().slice(-6);
      await db.collection('invoices').add({
        clientId: d.clientId, number: num, description: d.description,
        amount: +d.amount, dueDate: d.dueDate || '', status: 'Unpaid',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await db.collection('notifications').doc().set({
        userId: d.clientId,
        title: '🧾 New Invoice: ' + num,
        body: d.description + ' — ₦' + (+d.amount).toLocaleString(),
        icon: '🧾', read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      invForm.reset();
      alert('✓ Invoice ' + num + ' created! Client will see it in their portal with a Pay Now button.');
    });

    /* Blog CMS */
    const blogForm = document.getElementById('blogForm');
    if (blogForm) {
      const titleInp = document.getElementById('blogTitle');
      titleInp.addEventListener('input', () => {
        const slugEl = document.getElementById('blogSlug');
        if (!blogForm.elements['id'].value) slugEl.value = titleInp.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      });
      blogForm.addEventListener('submit', async e => {
        e.preventDefault();
        const d = Object.fromEntries(new FormData(blogForm).entries());
        const pid = d.id; delete d.id;
        d.published = blogForm.published.checked;
        if (pid) {
          await db.collection('blog').doc(pid).update(d);
        } else {
          d.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          await db.collection('blog').add(d);
        }
        blogForm.reset(); blogForm.elements['published'].checked = true;
        document.getElementById('blogFormTitle').textContent = '➕ New Blog Post';
        document.getElementById('blogCancelEdit').style.display = 'none';
      });
      document.getElementById('blogCancelEdit')?.addEventListener('click', () => {
        blogForm.reset(); blogForm.elements['published'].checked = true;
        document.getElementById('blogFormTitle').textContent = '➕ New Blog Post';
        document.getElementById('blogCancelEdit').style.display = 'none';
      });
    }

    /* Proposals & Contracts */
    const propForm = document.getElementById('addProposalForm');
    if (propForm) propForm.addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(propForm).entries());
      await db.collection('proposals').add({
        clientId: d.clientId, title: d.title, scope: d.scope || '',
        amount: +d.amount, validUntil: d.validUntil || '', status: 'Pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await db.collection('notifications').doc().set({
        userId: d.clientId, title: '📄 New Proposal: ' + d.title,
        body: '₦' + (+d.amount).toLocaleString() + ' — open your portal to review & accept.',
        icon: '📄', read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      propForm.reset();
      alert('✓ Proposal sent! Client can now accept it in their portal.');
    });
    const ctrForm = document.getElementById('addContractForm');
    if (ctrForm) ctrForm.addEventListener('submit', async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(ctrForm).entries());
      await db.collection('contracts').add({
        clientId: d.clientId, title: d.title, description: d.description || '', status: 'Awaiting Signature',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await db.collection('notifications').doc().set({
        userId: d.clientId, title: '🤝 Contract Ready: ' + d.title,
        body: 'Please review and sign in your portal.',
        icon: '🤝', read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      ctrForm.reset();
      alert('✓ Contract sent for signature!');
    });

    /* CSV exports */
    document.querySelectorAll('[data-export]').forEach(btn => btn.addEventListener('click', () =>
      exportCSV(btn.dataset.export)));
  }

  /* ---------- KANBAN ---------- */
  const STATUSES = ['New', 'Contacted', 'Qualified', 'Converted'];
  function renderKanban(docs) {
    STATUSES.forEach(st => {
      const col = document.getElementById('kb-' + st.toLowerCase());
      if (!col) return;
      const cards = docs.filter(d => (d.data().status || 'New') === st);
      col.querySelector('.kb-count').textContent = cards.length;
      col.querySelector('.kb-cards').innerHTML = cards.map(d => {
        const x = d.data();
        return `<div class="kb-card" draggable="true" data-id="${d.id}">
          <h5>${esc(x.name || x.clientName || 'Lead')}</h5>
          <small>${esc(x.email || '')}</small>
          <small>${esc(x.service || x.type || '')} · ${x.budget ? esc(x.budget) : '—'}</small>
          <div class="src"><span class="status st-pending">${esc(x.source || 'website')}</span></div>
        </div>`;
      }).join('');
    });
    // Drag & drop
    document.querySelectorAll('.kb-card').forEach(card => {
      card.addEventListener('dragstart', e => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', card.dataset.id);
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
    });
    document.querySelectorAll('.kb-col').forEach(col => {
      col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('dragover'); });
      col.addEventListener('dragleave', () => col.classList.remove('dragover'));
      col.addEventListener('drop', async e => {
        e.preventDefault(); col.classList.remove('dragover');
        const id = e.dataTransfer.getData('text/plain');
        await db.collection('leads').doc(id).update({ status: col.dataset.status });
      });
    });
    // Recent leads table
    const tb = document.getElementById('recentLeads');
    if (tb) tb.innerHTML = docs.slice(0, 6).map(d => { const x = d.data(); return `<tr>
      <td><strong>${esc(x.name || x.clientName || '—')}</strong></td><td>${esc(x.email || '')}</td>
      <td>${esc(x.service || x.type || '—')}</td><td>${x.budget || '—'}</td>
      <td><span class="status st-${x.status === 'New' ? 'pending' : x.status === 'Converted' ? 'done' : 'active'}">${x.status || 'New'}</span></td></tr>`; }).join('')
      || `<tr><td colspan="5"><div class="empty"><div class="big">📥</div>No leads yet — website form submissions will appear here.</div></td></tr>`;
  }

  /* ---------- CLIENTS ---------- */
  function renderClients(docs) {
    const tb = document.getElementById('clientsBody');
    document.querySelectorAll('.dealClientSelect').forEach(sel2 => {
      sel2.innerHTML = '<option value="">Select client…</option>' + docs.map(d => {
        const x = d.data();
        return `<option value="${d.id}">${esc(x.name || 'Client')}${x.company ? ' (' + esc(x.company) + ')' : ''}</option>`;
      }).join('');
    });
    const sel = document.getElementById('invClientSelect');
    if (sel) sel.innerHTML = '<option value="">Select client…</option>' + docs.map(d => {
      const x = d.data();
      return `<option value="${d.id}">${esc(x.name || 'Client')}${x.company ? ' (' + esc(x.company) + ')' : ''}</option>`;
    }).join('');
    if (!tb) return;
    tb.innerHTML = docs.map(d => { const x = d.data(); return `<tr>
      <td><div style="display:flex;align-items:center;gap:12px"><span class="avatar-sm">${esc((x.name||'?')[0].toUpperCase())}</span><strong>${esc(x.name || '—')}</strong></div></td>
      <td>${esc(x.company || '—')}</td><td>${esc(x.email || '')}</td><td>${esc(x.phone || '—')}</td>
      <td><strong>₦${(x.lifetimeValue || 0).toLocaleString()}</strong></td></tr>`; }).join('')
      || `<tr><td colspan="5"><div class="empty"><div class="big">👥</div>No clients yet — they appear when they register on the portal.</div></td></tr>`;
  }

  /* ---------- PROJECTS ---------- */
  function renderProjects(docs) {
    const tb = document.getElementById('adminProjectsBody');
    if (!tb) return;
    tb.innerHTML = docs.map(d => { const x = d.data(); return `<tr>
      <td><strong>${esc(x.title)}</strong></td>
      <td>${esc(x.type || '—')}</td>
      <td><select onchange="aumUpdateStatus('${d.id}', this.value)" style="background:var(--bg2);border:1px solid var(--border);border-radius:9px;padding:7px 10px;color:var(--text);font-family:inherit;font-size:.85rem">
        ${['Pending','In Progress','Review','Delivered','Completed'].map(s => `<option ${s === x.status ? 'selected' : ''}>${s}</option>`).join('')}
      </select></td>
      <td style="min-width:130px"><div class="progress-track"><div class="progress-fill" style="width:${x.progress || 0}%"></div></div><small style="color:var(--muted)">${x.progress || 0}%</small></td>
      <td>${x.budget || '—'}</td></tr>`; }).join('')
      || `<tr><td colspan="5"><div class="empty"><div class="big">📁</div>No projects yet.</div></td></tr>`;
  }
  window.aumUpdateStatus = async (id, status) => {
    const progress = { 'Pending': 5, 'In Progress': 40, 'Review': 80, 'Delivered': 95, 'Completed': 100 }[status] || 0;
    await db.collection('projects').doc(id).update({ status, progress });
    await db.collection('auditLogs').add({ action: 'project_status', entityId: id, newValue: status,
      userId: auth.currentUser.uid, timestamp: new Date() });
  };

  /* ---------- TASKS ---------- */
  function renderTasks(snap) {
    const wrap = document.getElementById('taskBoard');
    if (!wrap) return;
    const cols = { 'To Do': [], 'Doing': [], 'Done': [] };
    snap.forEach(d => cols[d.data().status] ? cols[d.data().status].push({ id: d.id, ...d.data() }) : null);
    wrap.innerHTML = Object.entries(cols).map(([st, items]) => `
      <div class="kb-col"><div class="kb-head">${st}<span class="kb-count">${items.length}</span></div>
      ${items.map(t => `<div class="kb-card" style="cursor:default">
        <h5>${esc(t.title)}</h5>
        <small>👤 ${esc(t.assignee || 'Unassigned')} · 🎯 ${esc(t.project || 'General')}</small>
        <div class="src">${st !== 'Done'
          ? `<button class="btn btn-ghost" style="padding:5px 14px;font-size:.75rem" onclick="aumTaskNext('${t.id}','${st}')">→ ${st === 'To Do' ? 'Start' : 'Complete'}</button>`
          : `<span class="status st-done">✓ Done</span>`}</div>
      </div>`).join('') || '<small style="color:var(--muted)">No tasks</small>'}</div>`).join('');
  }
  window.aumTaskNext = (id, cur) => {
    const next = cur === 'To Do' ? 'Doing' : 'Done';
    db.collection('tasks').doc(id).update({ status: next });
  };

  /* ---------- TEAM ---------- */
  function renderTeam(docs) {
    const tb = document.getElementById('teamBody');
    if (!tb) return;
    tb.innerHTML = docs.map(d => { const x = d.data(); return `<tr>
      <td><div style="display:flex;align-items:center;gap:12px"><span class="avatar-sm">${esc((x.name||'?')[0].toUpperCase())}</span><div><strong>${esc(x.name || '—')}</strong><br><small style="color:var(--muted)">${esc(x.email || '')}</small></div></div></td>
      <td><select onchange="AUM_db.collection('users').doc('${d.id}').update({role:this.value})" style="background:var(--bg2);border:1px solid var(--border);border-radius:9px;padding:7px 10px;color:var(--text);font-family:inherit;font-size:.85rem">
        ${['client','staff','admin','superadmin'].map(r => `<option ${r === x.role ? 'selected' : ''}>${r}</option>`).join('')}</select></td>
      <td><span class="status ${x.status === 'active' ? 'st-done' : 'st-hold'}">${x.status || 'active'}</span></td></tr>`; }).join('')
      || `<tr><td colspan="3"><div class="empty"><div class="big">👥</div>No team members yet.</div></td></tr>`;
  }

  /* ---------- FINANCE ---------- */
  let allPayments = [], allExpenses = [];
  function renderPayments(snap) {
    allPayments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const income = allPayments.reduce((s, p) => s + (p.amount || 0), 0);
    setText('totalIncome', '₦' + income.toLocaleString()); setText('totalIncome2', '₦' + income.toLocaleString());
    drawChart();
    const tb = document.getElementById('paymentsBody');
    if (tb) tb.innerHTML = allPayments.slice(0, 10).map(p => `<tr>
      <td>${p.invoiceId || '—'}</td><td><strong>₦${(p.amount || 0).toLocaleString()}</strong></td>
      <td>${esc(p.method || 'Paystack')}</td><td>${p.createdAt ? new Date(p.createdAt.toDate ? p.createdAt.toDate() : p.createdAt).toLocaleDateString() : '—'}</td></tr>`).join('')
      || `<tr><td colspan="4"><div class="empty"><div class="big">💳</div>No payments yet — client payments via the portal will appear here.</div></td></tr>`;
  }
  function renderExpenses(snap) {
    allExpenses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const exp = allExpenses.reduce((s, x) => s + (x.amount || 0), 0);
    setText('totalExpenses', '₦' + exp.toLocaleString());
    const income = allPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const profit = income - exp;
    const el = document.getElementById('netProfit');
    el.textContent = (profit < 0 ? '-' : '') + '₦' + Math.abs(profit).toLocaleString();
    el.style.color = profit >= 0 ? 'var(--accent)' : '#ff6b64';
    const tb = document.getElementById('expensesBody');
    if (tb) tb.innerHTML = allExpenses.slice(0, 10).map(x => `<tr>
      <td><strong>${esc(x.description || '—')}</strong></td><td>${esc(x.category || 'General')}</td>
      <td><strong style="color:#ff8f6b">−₦${(x.amount || 0).toLocaleString()}</strong></td>
      <td>${x.createdAt ? new Date(x.createdAt.toDate ? x.createdAt.toDate() : x.createdAt).toLocaleDateString() : '—'}</td></tr>`).join('')
      || `<tr><td colspan="4"><div class="empty"><div class="big">💸</div>No expenses recorded.</div></td></tr>`;
  }
  function drawChart() {
    const chart = document.getElementById('revenueChart');
    if (!chart) return;
    const months = {};
    allPayments.forEach(p => {
      const d = p.createdAt ? new Date(p.createdAt.toDate ? p.createdAt.toDate() : p.createdAt) : new Date();
      const key = d.toLocaleString('en', { month: 'short' });
      months[key] = (months[key] || 0) + (p.amount || 0);
    });
    const keys = Object.keys(months);
    if (!keys.length) { chart.innerHTML = '<div class="empty" style="width:100%"><div class="big">📊</div>Revenue chart appears when payments come in.</div>'; return; }
    const max = Math.max(...Object.values(months));
    chart.innerHTML = keys.map(k => `<div class="bar-col">
      <div class="bar" style="height:${Math.max((months[k] / max) * 100, 3)}%"><span class="tip">₦${months[k].toLocaleString()}</span></div>
      <span class="bar-lbl">${k}</span></div>`).join('');
  }

  /* ---------- ADMIN INVOICES ---------- */
  function renderAdminInvoices(docs) {
    const tb = document.getElementById('adminInvoicesBody');
    if (!tb) return;
    tb.innerHTML = docs.map(d => { const x = d.data(); return `<tr>
      <td><strong>${esc(x.number || 'INV-' + d.id.slice(0, 6).toUpperCase())}</strong></td>
      <td><small style="color:var(--muted)">${esc((x.clientId || '').slice(0, 8))}…</small></td>
      <td>${esc(x.description || '—')}</td>
      <td><strong>₦${(x.amount || 0).toLocaleString()}</strong></td>
      <td>${esc(x.dueDate || '—')}</td>
      <td><span class="status st-${x.status === 'Paid' ? 'done' : x.status === 'Overdue' ? 'hold' : 'pending'}">${x.status || 'Unpaid'}</span></td>
      <td>${x.status !== 'Paid' ? `<button class="btn btn-ghost" style="padding:5px 14px;font-size:.75rem;color:var(--accent)" onclick="AUM_db.collection('invoices').doc('${d.id}').update({status:'Paid'})">✓ Mark Paid</button>` : ''}</td></tr>`; }).join('')
      || `<tr><td colspan="7"><div class="empty"><div class="big">🧾</div>No invoices yet — create one above.</div></td></tr>`;
  }

  /* ---------- BLOG CMS ---------- */
  function renderBlogAdmin(docs) {
    const tb = document.getElementById('blogBody');
    if (!tb) return;
    tb.innerHTML = docs.map(d => { const x = d.data(); return `<tr>
      <td><strong>${x.emoji || '📝'} ${esc(x.title)}</strong><br><small style="color:var(--muted)">/${esc(x.slug || '')}</small></td>
      <td>${esc(x.category || '—')}</td>
      <td><button class="status st-${x.published ? 'done' : 'pending'}" style="border:none;cursor:pointer" onclick="AUM_db.collection('blog').doc('${d.id}').update({published:${x.published ? 'false' : 'true'}})">${x.published ? '✓ Live' : '⏸ Draft'}</button></td>
      <td><small>${x.createdAt ? new Date(x.createdAt.toDate()).toLocaleDateString() : '—'}</small></td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost" style="padding:5px 12px;font-size:.75rem" onclick="aumEditPost('${d.id}')">✏️</button>
        <button class="btn btn-ghost" style="padding:5px 12px;font-size:.75rem;color:#ff6b64" onclick="if(confirm('Delete this post?')) AUM_db.collection('blog').doc('${d.id}').delete()">🗑</button>
      </td></tr>`; }).join('')
      || `<tr><td colspan="5"><div class="empty"><div class="big">📝</div>No posts yet — write your first article above!</div></td></tr>`;
  }
  window.aumEditPost = async id => {
    const snap = await AUM_db.collection('blog').doc(id).get();
    if (!snap.exists) return;
    const x = snap.data();
    const f = document.getElementById('blogForm');
    f.elements['id'].value = id;
    f.elements['title'].value = x.title || ''; f.elements['slug'].value = x.slug || '';
    f.elements['category'].value = x.category || 'Web Dev'; f.elements['emoji'].value = x.emoji || '';
    f.elements['excerpt'].value = x.excerpt || ''; f.elements['content'].value = x.content || '';
    f.elements['published'].checked = !!x.published;
    document.getElementById('blogFormTitle').textContent = '✏️ Edit Post';
    document.getElementById('blogCancelEdit').style.display = 'inline-flex';
  };

  /* ---------- ADMIN PROPOSALS & CONTRACTS ---------- */
  function renderAdminProposals(docs) {
    const tb = document.getElementById('adminProposalsBody');
    if (!tb) return;
    tb.innerHTML = docs.map(d => { const x = d.data(); return `<tr>
      <td><strong>${esc(x.title)}</strong><br><small style="color:var(--muted)">${esc((x.clientId || '').slice(0, 8))}…</small></td>
      <td><strong>₦${(x.amount || 0).toLocaleString()}</strong></td>
      <td><span class="status st-${x.status === 'Accepted' ? 'done' : x.status === 'Declined' ? 'hold' : 'pending'}">${x.status || 'Pending'}</span></td></tr>`; }).join('')
      || `<tr><td colspan="3"><div class="empty"><div class="big">📄</div>No proposals sent yet.</div></td></tr>`;
  }
  function renderAdminContracts(docs) {
    const tb = document.getElementById('adminContractsBody');
    if (!tb) return;
    tb.innerHTML = docs.map(d => { const x = d.data(); return `<tr>
      <td><strong>${esc(x.title)}</strong><br><small style="color:var(--muted)">${esc((x.clientId || '').slice(0, 8))}…</small></td>
      <td><span class="status st-${x.status === 'Signed' ? 'done' : 'pending'}">${x.status || 'Awaiting'}</span></td></tr>`; }).join('')
      || `<tr><td colspan="2"><div class="empty"><div class="big">🤝</div>No contracts sent yet.</div></td></tr>`;
  }

  /* ---------- MESSAGE INBOX ---------- */
  let activeThread = 'general';
  function renderInbox(docs) {
    const tb = document.getElementById('threadList');
    const box = document.getElementById('inboxChat');
    if (!tb || !box) return;
    const uid = auth.currentUser ? auth.currentUser.uid : '';
    const threads = {};
    docs.forEach(d => {
      const x = d.data();
      const t = x.projectId || 'general';
      (threads[t] = threads[t] || []).push({ id: d.id, ...x });
    });
    const entries = Object.entries(threads);
    const totalUnread = entries.reduce((s, [, m]) =>
      s + m.filter(x => !x.read && x.senderId !== uid).length, 0);
    setText('inboxBadge', totalUnread || '');

    /* Thread list (newest first) */
    tb.innerHTML = entries.map(([tid, msgs]) => {
      const last = msgs[0];
      const unread = msgs.filter(x => !x.read && x.senderId !== uid).length;
      const title = tid === 'general' ? '💬 General Support' : '📁 ' + esc(tid);
      const t = last.createdAt ? new Date(last.createdAt.toDate()) : null;
      return `<button type="button" class="thread-item ${tid === activeThread ? 'active' : ''}" data-tid="${esc(tid)}">
        <div class="ti-head"><strong>${title}</strong>${unread ? `<span class="side-badge">${unread}</span>` : ''}</div>
        <small>${esc(last.senderName || 'User')}: ${esc(String(last.text || '').slice(0, 42))}${String(last.text || '').length > 42 ? '…' : ''}</small>
        <small class="ti-time">${t ? t.toLocaleDateString() + ' ' + t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</small>
      </button>`;
    }).join('') || '<div class="empty"><div class="big">📥</div>No messages yet — client portal messages appear here.</div>';

    tb.querySelectorAll('.thread-item').forEach(b => b.addEventListener('click', () => {
      activeThread = b.dataset.tid;
      renderInbox(docs);
    }));

    /* Active thread messages (oldest first) */
    const msgs = (threads[activeThread] || []).slice().reverse();
    box.innerHTML = msgs.map(m => {
      const me = m.senderId === uid;
      return `<div class="msg ${me ? 'me' : 'them'}">${esc(m.text)}<span class="tm">${esc(m.senderName || '')} · ${m.createdAt ? new Date(m.createdAt.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} ${m.read ? '✓✓' : '✓'}</span></div>`;
    }).join('') || '<div class="empty"><div class="big">💬</div>No messages in this conversation yet.</div>';
    box.scrollTop = box.scrollHeight;

    /* Mark incoming messages as read */
    const batch = db.batch();
    let n = 0;
    msgs.forEach(m => {
      if (!m.read && m.senderId !== uid && n < 400) {
        batch.update(db.collection('messages').doc(m.id), { read: true });
        n++;
      }
    });
    if (n) batch.commit().catch(() => {});
  }

  /* ---------- EXPORT CSV ---------- */
  async function exportCSV(type) {
    const snap = await db.collection(type).get();
    if (!snap.size) return alert('No data to export.');
    const rows = snap.docs.map(d => d.data());
    const headers = [...new Set(rows.flatMap(r => Object.keys(r)))].filter(h => !['createdAt'].includes(h));
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `aum-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
  function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
});
