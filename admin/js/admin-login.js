document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const msg = document.getElementById('formMsg');
  if (!form || typeof firebase === 'undefined') {
    if (msg) { msg.className = 'form-msg error'; msg.textContent = 'Firebase failed to load. Refresh the page.'; }
    return;
  }

  const auth = firebase.auth();
  const db = firebase.firestore();
  let redirecting = false;

  const showError = text => {
    if (msg) { msg.className = 'form-msg error'; msg.textContent = text; }
  };

  auth.onAuthStateChanged(async user => {
    if (!user || redirecting) return;
    try {
      const snap = await db.collection('users').doc(user.uid).get();
      if (!snap.exists) {
        await auth.signOut();
        showError('Ba a samu profile ɗinka a Firestore ba. A tabbatar da users/' + user.uid + ' yana nan.');
        return;
      }
      const profile = snap.data();
      if (profile.status === 'suspended') {
        await auth.signOut();
        showError('An dakatar da wannan account. Tuntuɓi Super Admin.');
        return;
      }
      if (!['staff', 'admin', 'superadmin'].includes(profile.role)) {
        await auth.signOut();
        showError('Wannan account ba na staff/admin ba ne.');
        return;
      }
      redirecting = true;
      if (msg) { msg.className = 'form-msg success'; msg.textContent = '✓ Login ya yi nasara. Ana buɗe dashboard…'; }
      window.location.replace(profile.role === 'superadmin' ? 'super.html' : 'operations.html');
    } catch (error) {
      console.error('Admin role check failed:', error);
      await auth.signOut().catch(() => {});
      showError(error.code === 'permission-denied'
        ? 'Firestore permission-denied. A publish firestore.rules sannan a sake gwadawa.'
        : 'An kasa karanta role ɗin account. Duba Firestore da internet connection.');
    }
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    if (msg) { msg.className = 'form-msg'; msg.textContent = 'Ana tabbatar da login…'; }
    const button = form.querySelector('button[type="submit"]');
    if (button) button.disabled = true;
    try {
      await auth.signInWithEmailAndPassword(data.email.trim(), data.password);
    } catch (error) {
      console.error('Admin login failed:', error);
      const text = {
        'auth/invalid-credential': 'Email ko password ba daidai ba ne.',
        'auth/user-not-found': 'Ba a samu wannan email ba.',
        'auth/wrong-password': 'Password ba daidai ba ne.',
        'auth/too-many-requests': 'An yi login da yawa. Jira kaɗan sannan ka sake gwadawa.',
        'auth/unauthorized-domain': 'A ƙara GitHub Pages domain a Firebase Authorized Domains.'
      }[error.code] || 'Login ya kasa. Duba email, password da Firebase settings.';
      showError(text);
      if (button) button.disabled = false;
    }
  });
});
