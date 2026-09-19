// ===== AUM CLIENT PORTAL — portal.js =====
document.addEventListener('DOMContentLoaded', () => {
  const auth = firebase.auth();
  const db = firebase.firestore();

  /* ---------- AUTH GUARD ---------- */
  const publicPages = ['login.html', 'register.html'];
  const isPublic = publicPages.some(p => location.pathname.endsWith(p));

  auth.onAuthStateChanged(async user => {
    if (!user && !isPublic) { location.href = 'login.html'; return; }
    if (user && isPublic) { location.href = 'dashboard.html'; return; }
    if (user && !isPublic) {
      // Role guard: only clients/admins access portal (never block UI on rules errors)
      let profile = { role: 'client' };
      try {
        const snap = await db.collection('users').doc(user.uid).get();
        if (snap.exists) profile = snap.data();
      } catch (e) { console.warn('users doc fetch failed:', e); }
      const role = profile.role || 'client';
      if (!['client','admin','superadmin'].includes(role)) { await auth.signOut(); location.href = 'login.html'; return; }
      loadPortal(user, profile);
    }
  });

  /* ---------- MOBILE MENU (binds instantly, no auth/db needed) ---------- */
  const sideMenu = document.getElementById('sideMenu');
  const burger = document.getElementById('mobBurger');
  const overlay = document.getElementById('sideOverlay');
  const closeMenu = () => {
    sideMenu && sideMenu.classList.remove('open');
    overlay && overlay.classList.remove('show');
    document.body.style.overflow = '';
  };
  if (burger && sideMenu) {
    burger.addEventListener('click', e => {
      e.stopPropagation();
      sideMenu.classList.toggle('open');
      if (overlay) overlay.classList.toggle('show');
      document.body.style.overflow = sideMenu.classList.contains('open') ? 'hidden' : '';
    });
    sideMenu.querySelectorAll('a, button').forEach(el =>
      el.addEventListener('click', () => { if (el.id !== 'logoutBtn') closeMenu(); }));
  }
  if (overlay) overlay.addEventListener('click', closeMenu);

  /* ---------- REGISTER ---------- */
  const regForm = document.getElementById('registerForm');
  if (regForm) regForm.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = document.getElementById('formMsg');
    const d = Object.fromEntries(new FormData(regForm).entries());
    if (d.password.length < 6) return showMsg(msg, 'error', 'Password must be at least 6 characters.');
    if (d.password !== d.confirm) return showMsg(msg, 'error', 'Passwords do not match.');
    try {
      const cred = await auth.createUserWithEmailAndPassword(d.email, d.password);
      await db.collection('users').doc(cred.user.uid).set({
        name: d.name, email: d.email, phone: d.phone || '',
        company: d.company || '', role: 'client',
        status: 'active', createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      await db.collection('clients').doc(cred.user.uid).set({
        userId: cred.user.uid, name: d.name, email: d.email,
        company: d.company || '', phone: d.phone || '', lifetimeValue: 0
      });
      msg.className = 'form-msg success'; msg.textContent = '✓ Account created! Redirecting...';
    } catch (err) {
      const friendly = err.code === 'permission-denied' ? '✗ Permissions: deploy Firestore rules first (Firebase Console → Rules → Publish).'
        : err.code === 'network-request-failed' ? '✗ Network error — duba internet ɗinka sannan ka sake gwadawa.'
        : '✗ ' + err.message.replace('Firebase: ', '');
      showMsg(msg, 'error', friendly);
    }
  });

  /* ---------- LOGIN ---------- */
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const msg = document.getElementById('formMsg');
    const d = Object.fromEntries(new FormData(loginForm).entries());
    try {
      await auth.signInWithEmailAndPassword(d.email, d.password);
      msg.className = 'form-msg success'; msg.textContent = '✓ Welcome back! Redirecting...';
    } catch (err) { showMsg(msg, 'error', '✗ Invalid email or password.'); }
  });

  /* ---------- PASSWORD METER ---------- */
  const pw = document.getElementById('password');
  if (pw) pw.addEventListener('input', () => {
    const v = pw.value, meter = document.querySelector('.pw-meter div');
    let s = 0;
    if (v.length > 5) s++; if (/[A-Z]/.test(v)) s++; if (/\d/.test(v)) s++; if (/[^A-Za-z0-9]/.test(v)) s++;
    meter.style.width = (s * 25) + '%';
    meter.style.background = ['#ff5f57','#febc2e','#00d4ff','#22e07a'][Math.max(s-1,0)] || '#ff5f57';
  });

  /* ---------- PORTAL LOADER ---------- */
  /* ---------- NOTIFICATIONS BELL ---------- */
  const bellBtn = document.getElementById('bellBtn');
  const bellPanel = document.getElementById('bellPanel');
  if (bellBtn && bellPanel) {
    bellBtn.addEventListener('click', e => {
      e.stopPropagation();
      bellPanel.classList.toggle('show');
    });
    document.addEventListener('click', e => {
      if (!bellPanel.contains(e.target) && e.target !== bellBtn)
        bellPanel.classList.remove('show');
    });
    document.getElementById('bellClear')?.addEventListener('click', async () => {
      const u = firebase.auth().currentUser; if (!u) return;
      try {
        const snap = await db.collection('notifications').where('userId', '==', u.uid).where('read', '==', false).get();
        const b = db.batch();
        snap.forEach(d => b.update(d.ref, { read: true }));
        await b.commit();
      } catch (e) { console.warn(e); }
    });
  }

  /* Maintenance mode notice (controlled from Super Admin → Configuration) */
  db.collection('settings').doc('config').onSnapshot(snap => {
    let banner = document.getElementById('maintNotice');
    if (snap.exists && snap.data().maintenanceMode) {
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'maintNotice';
        banner.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:9999;background:rgba(255,95,87,.95);color:#fff;padding:13px 26px;border-radius:50px;font-size:.88rem;font-weight:600;box-shadow:0 10px 30px rgba(0,0,0,.4)';
        banner.textContent = '🔧 System under maintenance — some features may be unavailable.';
        document.body.appendChild(banner);
      }
    } else if (banner) banner.remove();
  }, snapErr('settings'));

  
  /* ---------- FIRESTORE ERROR BANNER (friendly hints, no raw errors) ---------- */
  let _errBanner = null;
  function snapErr(module) {
    return err => {
      console.warn(`[${module}]`, err.code, err.message);
      if (_errBanner || !document.body) return;
      _errBanner = document.createElement('div');
      _errBanner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:rgba(255,95,87,.96);color:#fff;padding:13px 18px;font-size:.85rem;font-weight:600;text-align:center;box-shadow:0 6px 20px rgba(0,0,0,.4);line-height:1.5';
      _errBanner.innerHTML = (err.code === 'permission-denied'
        ? '⚠ Firestore Permissions: Rules ba a deploy ba ko suna blocking. Je Firebase Console → Firestore → Rules → Publish (ga LAUNCH_CHECKLIST.md).'
        : '⚠ Network/Firestore: ' + err.code + ' — duba internet connection ɗinka.');
      const btn = document.createElement('button');
      btn.textContent = '✕';
      btn.style.cssText = 'position:absolute;right:12px;top:10px;background:none;border:none;color:#fff;font-size:1.1rem;cursor:pointer';
      btn.onclick = () => { _errBanner.remove(); _errBanner = null; };
      _errBanner.appendChild(btn);
      document.body.appendChild(_errBanner);
    };
  }

  async function loadPortal(user, profile) {
    document.getElementById('userName').textContent = profile.name || user.email.split('@')[0];
    document.getElementById('userRole').textContent = profile.role || 'client';
    document.getElementById('userAv').textContent = (profile.name || user.email)[0].toUpperCase();

    // Real-time dashboard stats
    db.collection('projects').where('clientId', '==', user.uid).onSnapshot(snap => {
      setText('statProjects', snap.size);
      const active = snap.docs.filter(d => ['In Progress','Review'].includes(d.data().status)).length;
      setText('statActive', active);
      renderProjects(snap.docs);
    }, snapErr('projects'));
    db.collection('invoices').where('clientId', '==', user.uid).onSnapshot(snap => {
      const unpaid = snap.docs.filter(d => d.data().status !== 'Paid');
      setText('statInvoices', unpaid.length);
      let total = 0; unpaid.forEach(d => total += d.data().amount || 0);
      setText('statAmount', '₦' + total.toLocaleString());
      renderInvoices(snap.docs);
    }, snapErr('invoices'));
    db.collection('tickets').where('clientId', '==', user.uid).onSnapshot(snap => {
      setText('statTickets', snap.docs.filter(d => d.data().status !== 'Resolved').length);
      renderTickets(snap.docs);
    }, snapErr('tickets'));
    loadMessages(user.uid);
    loadActivity(user.uid);
    db.collection('notifications').where('userId', '==', user.uid).orderBy('createdAt', 'desc').limit(20)
      .onSnapshot(s => renderBellDocs(s.docs, user.uid), snapErr('bell'));
    db.collection('proposals').where('clientId', '==', user.uid).onSnapshot(s => renderProposals(s.docs), snapErr('proposals'));
    db.collection('contracts').where('clientId', '==', user.uid).onSnapshot(s => renderContracts(s.docs), snapErr('contracts'));
    db.collection('files').where('clientId', '==', user.uid).orderBy('createdAt', 'desc').onSnapshot(s => renderFiles(s.docs), snapErr('files'));

    /* Tabs */
    document.querySelectorAll('.side-link[data-tab]').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('.side-link').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.ptab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
      document.getElementById('pageTitle').textContent = btn.dataset.title;
      document.getElementById('sideMenu').classList.remove('open');
    }));

    /* Logout */
    document.getElementById('logoutBtn').addEventListener('click', () => auth.signOut());

    /* Chat send */
    const chatForm = document.getElementById('chatForm');
    if (chatForm) chatForm.addEventListener('submit', async e => {
      e.preventDefault();
      const input = document.getElementById('chatInput');
      if (!input.value.trim()) return;
      await db.collection('messages').add({
        projectId: 'general', senderId: user.uid, senderName: profile.name || 'Client',
        text: input.value.trim(), read: false, createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      input.value = '';
    });

    /* File upload (base64 → Firestore, max 700KB) */
    const fileForm = document.getElementById('fileForm');
    if (fileForm) fileForm.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = document.getElementById('fileMsg');
      const inp = document.getElementById('fileInput');
      const f = inp.files[0];
      if (!f) return;
      if (f.size > 700 * 1024) return showMsg(msg, 'error', '✗ File too large — max 700KB. Large files: send via WhatsApp.');
      showMsg(msg, 'success', '⏳ Uploading ' + f.name + '…');
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await db.collection('files').add({
            clientId: user.uid, name: f.name, size: f.size, type: f.type,
            data: reader.result, uploadedBy: user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          showMsg(msg, 'success', '✓ ' + f.name + ' uploaded!');
          inp.value = '';
        } catch (err) { showMsg(msg, 'error', '✗ Upload failed: ' + err.code); }
      };
      reader.readAsDataURL(f);
    });

    /* Request project wizard */
    setupWizard(user, profile);

    /* Open tab from URL hash (e.g. dashboard.html#tab-invoices) */
    const hashTab = location.hash.replace('#tab-', '');
    if (hashTab && document.getElementById('tab-' + hashTab)) {
      document.querySelector(`.side-link[data-tab="${hashTab}"]`)?.click();
    }
  }

  /* ---------- WIZARD ---------- */
  function setupWizard(user, profile) {
    const wiz = document.getElementById('wizardForm');
    if (!wiz) return;
    let step = 0;
    const panels = wiz.querySelectorAll('.wpanel');
    const steps = wiz.querySelectorAll('.wstep');
    const show = i => {
      panels.forEach(p => p.classList.remove('active'));
      steps.forEach((s, j) => { s.classList.toggle('active', j === i); s.classList.toggle('done', j < i); });
      panels[i].classList.add('active');
    };
    wiz.querySelectorAll('[data-next]').forEach(b => b.addEventListener('click', () => { if (step < panels.length - 1) show(++step); }));
    wiz.querySelectorAll('[data-prev]').forEach(b => b.addEventListener('click', () => { if (step > 0) show(--step); }));
    wiz.querySelectorAll('.upload-zone').forEach(z => z.addEventListener('click', () => z.querySelector('input').click()));
    wiz.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = document.getElementById('formMsg');
      const d = Object.fromEntries(new FormData(wiz).entries());
      try {
        const ref = await db.collection('leads').add({
          ...d, uid: user.uid, clientName: profile.name, email: user.email,
          source: 'client-portal', status: 'New',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        await db.collection('projects').add({
          clientId: user.uid, title: d.title || 'New Project Request', type: d.type,
          status: 'Pending', progress: 0, budget: d.budget || '',
          deadline: d.deadline || '', leadId: ref.id,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        msg.className = 'form-msg success';
        msg.textContent = '✓ Project request submitted! Our team will review it and send you a proposal within 48 hours.';
        wiz.reset(); step = 0; show(0);
      } catch (err) { showMsg(msg, 'error', '✗ ' + err.message); }
    });
    show(0);
  }

  /* ---------- RENDERERS ---------- */
  function renderProjects(docs) {
    const tb = document.getElementById('projectsBody');
    const list = document.getElementById('projectList');
    const rows = docs.map(d => { const x = d.data(); return `<tr>
      <td><strong>${esc(x.title)}</strong></td><td>${esc(x.type||'—')}</td>
      <td><span class="status st-${(x.status||'pending').toLowerCase().replace(' ','-')}">${x.status||'Pending'}</span></td>
      <td style="min-width:130px"><div class="progress-track"><div class="progress-fill" style="width:${x.progress||0}%"></div></div><small style="color:var(--muted)">${x.progress||0}%</small></td>
      <td>${x.deadline||'—'}</td></tr>`; }).join('');
    tb.innerHTML = rows || `<tr><td colspan="5"><div class="empty"><div class="big">📁</div>No projects yet. <a href="request-project.html" style="color:var(--primary)">Request one now →</a></div></td></tr>`;
    if (list) list.innerHTML = docs.slice(0,3).map(d => { const x = d.data(); return `
      <div class="card" style="margin-bottom:14px"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div><strong>${esc(x.title)}</strong><br><small style="color:var(--muted)">${esc(x.type||'')}</small></div>
        <span class="status st-${(x.status||'pending').toLowerCase().replace(' ','-')}">${x.status||'Pending'}</span></div>
        <div class="progress-track" style="margin-top:12px"><div class="progress-fill" style="width:${x.progress||0}%"></div></div>
      </div>`; }).join('') || '<div class="empty"><div class="big">🚀</div>Request your first project to get started!</div>';
  }
  function renderInvoices(docs) {
    const tb = document.getElementById('invoicesBody');
    if (!tb) return;
    tb.innerHTML = docs.map(d => { const x = d.data(); return `<tr>
      <td>${x.number||'INV-'+d.id.slice(0,6).toUpperCase()}</td>
      <td><strong>₦${(x.amount||0).toLocaleString()}</strong></td>
      <td>${x.dueDate||'—'}</td>
      <td><span class="status st-${x.status==='Paid'?'done':x.status==='Overdue'?'hold':'pending'}">${x.status||'Unpaid'}</span></td>
      <td>${x.status==='Paid'?'—':`<button class="btn btn-primary" style="padding:7px 18px;font-size:.8rem" onclick="payInvoice('${d.id}',${x.amount||0})">Pay Now</button>`}</td></tr>`; }).join('')
      || `<tr><td colspan="5"><div class="empty"><div class="big">🧾</div>No invoices yet.</div></td></tr>`;
  }
  function renderTickets(docs) {
    const tb = document.getElementById('ticketsBody');
    if (!tb) return;
    tb.innerHTML = docs.map(d => { const x = d.data(); return `<tr>
      <td><strong>${esc(x.subject)}</strong></td><td>${x.category||'General'}</td>
      <td><span class="status st-${x.status==='Resolved'?'done':x.status==='Open'?'active':'pending'}">${x.status||'Open'}</span></td>
      <td>${x.createdAt?new Date(x.createdAt.toDate()).toLocaleDateString():'—'}</td></tr>`; }).join('')
      || `<tr><td colspan="4"><div class="empty"><div class="big">🎫</div>No support tickets. We're here if you need us!</div></td></tr>`;
    const form = document.getElementById('ticketForm');
    if (form && !form.dataset.bound) {
      form.dataset.bound = 1;
      form.addEventListener('submit', async e => {
        e.preventDefault();
        const uid = firebase.auth().currentUser.uid;
        const d = Object.fromEntries(new FormData(form).entries());
        await db.collection('tickets').add({ ...d, clientId: uid, status: 'Open', replies: [],
          createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        form.reset();
      });
    }
  }
  function loadMessages(uid) {
    const box = document.getElementById('chatBox');
    if (!box) return;
    db.collection('messages').where('projectId','==','general').orderBy('createdAt','asc').limit(50)
      .onSnapshot(snap => {
        box.innerHTML = snap.docs.map(d => { const x = d.data(); const me = x.senderId === uid;
          return `<div class="msg ${me?'me':'them'}">${esc(x.text)}<span class="tm">${x.senderName||''} · ${x.createdAt?new Date(x.createdAt.toDate()).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):''}</span></div>`;
        }).join('') || '<div class="empty"><div class="big">💬</div>Send a message — our team usually replies within minutes.</div>';
        box.scrollTop = box.scrollHeight;
      }, snapErr('messages'));
  }
  function loadActivity(uid) {
    const el = document.getElementById('activityFeed');
    if (!el) return;
    db.collection('notifications').where('userId','==',uid).orderBy('createdAt','desc').limit(8)
      .onSnapshot(snap => {
        el.innerHTML = snap.docs.map(d => { const x = d.data(); return `
          <div style="display:flex;gap:14px;padding:13px 0;border-bottom:1px solid var(--border)">
            <span style="font-size:1.2rem">${x.icon||'🔔'}</span>
            <div><strong style="font-size:.9rem">${esc(x.title||'')}</strong>
            <p style="color:var(--muted);font-size:.82rem;margin:2px 0 0">${esc(x.body||'')}</p></div></div>`; }).join('')
        || '<div class="empty"><div class="big">🔔</div>No activity yet.</div>';
      }, snapErr('notifications'));
  }

  /* ---------- HELPERS ---------- */
  /* ---------- PROPOSALS ---------- */
  function renderProposals(docs) {
    const tb = document.getElementById('proposalsBody');
    if (!tb) return;
    tb.innerHTML = docs.map(d => { const x = d.data(); return `<tr>
      <td><strong>${esc(x.title || 'Proposal')}</strong>${x.scope ? `<br><small style="color:var(--muted)">${esc(String(x.scope).slice(0, 60))}…</small>` : ''}</td>
      <td><strong>${x.amount ? '₦' + Number(x.amount).toLocaleString() : '—'}</strong></td>
      <td>${esc(x.validUntil || '—')}</td>
      <td><span class="status st-${x.status === 'Accepted' ? 'done' : x.status === 'Declined' ? 'hold' : 'pending'}">${x.status || 'Pending'}</span></td>
      <td>${x.status === 'Pending' ? `<button class="btn btn-primary" style="padding:7px 18px;font-size:.8rem" onclick="aumAcceptProposal('${d.id}')">Accept ✓</button>` : ''}</td></tr>`; }).join('')
      || `<tr><td colspan="5"><div class="empty"><div class="big">📄</div>No proposals yet — they appear here when we prepare one for you.</div></td></tr>`;
  }
  window.aumAcceptProposal = async id => {
    if (!confirm('Accept this proposal? Our team will be notified to start work.')) return;
    await db.collection('proposals').doc(id).update({ status: 'Accepted', acceptedAt: new Date() });
  };

  /* ---------- CONTRACTS ---------- */
  function renderContracts(docs) {
    const el = document.getElementById('contractsList');
    if (!el) return;
    el.innerHTML = docs.map(d => { const x = d.data(); return `
      <div class="card" style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
          <div><strong>🤝 ${esc(x.title || 'Contract')}</strong><br><small style="color:var(--muted)">${x.description || ''}</small></div>
          <span class="status st-${x.status === 'Signed' ? 'done' : 'pending'}">${x.status || 'Awaiting Signature'}</span>
        </div>
        ${x.status !== 'Signed'
          ? `<button class="btn btn-primary" style="margin-top:14px;padding:10px 26px" onclick="if(confirm('Sign this contract? This confirms your agreement.')) AUM_db.collection('contracts').doc('${d.id}').update({status:'Signed',signedAt:new Date()})">✍️ Sign Contract</button>`
          : `<small style="color:var(--accent);display:block;margin-top:12px">✓ Signed ${x.signedAt ? new Date(x.signedAt.toDate ? x.signedAt.toDate() : x.signedAt).toLocaleDateString() : ''}</small>`}
      </div>`; }).join('')
      || '<div class="empty"><div class="big">🤝</div>No contracts yet.</div>';
  };

  /* ---------- FILES ---------- */
  function renderFiles(docs) {
    const el = document.getElementById('filesList');
    if (!el) return;
    el.innerHTML = docs.map(d => { const x = d.data(); return `
      <div style="display:flex;align-items:center;gap:14px;padding:14px 4px;border-bottom:1px solid var(--border);flex-wrap:wrap">
        <span style="font-size:1.5rem">${x.type && x.type.includes('image') ? '🖼' : x.type && x.type.includes('pdf') ? '📕' : '📎'}</span>
        <div style="flex:1;min-width:150px"><strong style="font-size:.92rem">${esc(x.name)}</strong><br>
        <small style="color:var(--muted)">${(x.size / 1024).toFixed(1)} KB · ${x.createdAt ? new Date(x.createdAt.toDate()).toLocaleDateString() : ''}</small></div>
        <a class="btn btn-ghost" style="padding:8px 18px;font-size:.8rem" href="${x.data}" download="${esc(x.name)}">⬇ Download</a>
      </div>`; }).join('')
      || '<div class="empty"><div class="big">📎</div>No files yet — upload briefs & designs above.</div>';
  }

  function renderBellDocs(docs, uid) {
    const badge = document.getElementById('bellBadge');
    const list = document.getElementById('bellList');
    if (!badge || !list) return;
    const unread = docs.filter(d => !d.data().read).length;
    badge.style.display = unread ? 'inline-block' : 'none';
    badge.textContent = unread > 9 ? '9+' : unread;
    list.innerHTML = docs.map(d => {
      const x = d.data();
      const t = x.createdAt ? new Date(x.createdAt.toDate()).toLocaleString() : '';
      return `<div class="bell-item ${x.read ? '' : 'unread'}" data-id="${d.id}">
        <strong>${x.icon || '🔔'} ${esc(x.title || 'Notification')}</strong>
        <p>${esc(x.body || '')}</p>
        <small>${t}</small>
      </div>`;
    }).join('') || '<div class="empty" style="padding:30px"><div class="big">🔔</div>No notifications yet.</div>';
    list.querySelectorAll('.bell-item').forEach(el => el.addEventListener('click', async () => {
      try { await db.collection('notifications').doc(el.dataset.id).update({ read: true }); } catch (e) {}
    }));
  }

  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }
  function showMsg(el, type, text) { el.className = 'form-msg ' + type; el.textContent = text; }
  function esc(s) { return String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  /* Paystack key loaded live from settings/general (set in Super Admin) */
  window.AUM_PAYSTACK_KEY = 'pk_test_YOUR_KEY';
  db.collection('settings').doc('general').get().then(s => {
    if (s.exists && s.data().paystackPublicKey) window.AUM_PAYSTACK_KEY = s.data().paystackPublicKey;
  }).catch(() => {});

  window.payInvoice = (id, amount) => {
    if (window.PaystackPop) {
      const handler = PaystackPop.setup({
        key: window.AUM_PAYSTACK_KEY, email: firebase.auth().currentUser.email,
        amount: amount * 100, currency: 'NGN',
        callback: async () => {
          await db.collection('invoices').doc(id).update({ status: 'Paid', paidAt: new Date() });
          await db.collection('payments').add({ invoiceId: id, amount, method: 'Paystack', createdAt: new Date() });
          alert('✓ Payment successful! Receipt sent to your email.');
        }
      });
      handler.openIframe();
    } else alert('Configure your Paystack public key in portal.js to enable payments.');
  };
});
