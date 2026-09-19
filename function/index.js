// ============================================================
// AUM TECHNOLOGY — Cloud Functions
// Deploy: cd functions && npm install && firebase deploy --only functions
// ============================================================
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
const db = admin.firestore();

/* ---------- 1. NEW LEAD → notify all staff + log ---------- */
exports.onLeadCreated = functions.firestore
  .document('leads/{leadId}')
  .onCreate(async (snap, ctx) => {
    const lead = snap.data();
    // Notify all staff users
    const staff = await db.collection('users')
      .where('role', 'in', ['staff', 'admin', 'superadmin']).get();
    const batch = db.batch();
    staff.forEach(u => {
      batch.set(db.collection('notifications').doc(), {
        userId: u.id,
        title: '📥 New Lead: ' + (lead.name || 'Unknown'),
        body: `${lead.service || lead.type || 'Project'} · ${lead.budget || 'No budget'} · ${lead.source || 'website'}`,
        icon: '📥', read: false, link: 'admin/operations.html',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    await batch.commit();
    console.log(`Notified ${staff.size} staff about lead ${ctx.params.leadId}`);
  });

/* ---------- 2. NEW CLIENT REGISTRATION → welcome + notify staff ---------- */
exports.onClientRegistered = functions.firestore
  .document('users/{uid}')
  .onCreate(async (snap, ctx) => {
    const u = snap.data();
    if (u.role !== 'client') return;
    await db.collection('notifications').doc().set({
      userId: ctx.params.uid,
      title: '👋 Welcome to AUM Tech Portal!',
      body: 'Your account is ready. Request your first project to get started.',
      icon: '👋', read: false, createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });

/* ---------- 3. SCHEDULED UPTIME MONITOR (every 5 min) ---------- */
exports.checkMonitors = functions.pubsub
  .schedule('every 5 minutes')
  .onRun(async () => {
    const monitors = await db.collection('monitors').get();
    const results = await Promise.all(monitors.docs.map(async doc => {
      const m = doc.data();
      let up = false;
      try {
        const res = await fetch(m.url, { signal: AbortSignal.timeout(8000) });
        up = res.ok || res.type === 'opaque';
      } catch { up = false; }
      const wasDown = m.status === 'down';
      await doc.ref.update({
        status: up ? 'up' : 'down',
        checks: admin.firestore.FieldValue.increment(1),
        ups: admin.firestore.FieldValue.increment(up ? 1 : 0),
        lastCheck: admin.firestore.FieldValue.serverTimestamp()
      });
      if (!up || wasDown !== !up) {  // log state changes
        await db.collection('devLogs').add({
          level: up ? 'info' : 'error',
          source: 'monitor-scheduler',
          message: `${m.name} (${m.url}) is now ${up ? 'UP' : 'DOWN'}`,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      return { name: m.name, up };
    }));
    console.log('Checked', results.length, 'monitors');
  });

/* ---------- 4. OPTIONAL: Email via nodemailer (Gmail app-password) ----------
   1. firebase functions:config:set gmail.user="you@gmail.com" gmail.pass="app_password"
   2. Uncomment below and redeploy.
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: functions.config().gmail.user, pass: functions.config().gmail.pass }
});
exports.onLeadEmail = functions.firestore.document('leads/{id}').onCreate(async snap => {
  const l = snap.data();
  await transporter.sendMail({
    from: 'AUM Tech <noreply@aumtech.com>',
    to: 'hello@aumtech.com',
    subject: `🔔 New Lead: ${l.name}`,
    text: `Name: ${l.name}\nEmail: ${l.email}\nService: ${l.service}\nBudget: ${l.budget}\n\n${l.message || ''}`
  });
});
-------------------------------------------------------------- */
