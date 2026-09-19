/* ============================================================
   AUM TECHNOLOGY — Service Worker
   • HTML pages: network-first (always fresh, offline fallback)
   • CSS/JS/images: stale-while-revalidate (instant load)
   • Firebase/API calls: NEVER cached (real-time data stays live)
   ⚠️ When you update files: bump AUM_CACHE version below!
   ============================================================ */
const AUM_CACHE = 'aum-cache-v1';
const PRECACHE = ['./'];

const API_HOSTS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'fcmregistrations.googleapis.com',
  'firebasedatabase.app',
  '.firebaseapp.com/__'          // auth iframes etc — never cache
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(AUM_CACHE)
      .then(c => Promise.allSettled(PRECACHE.map(u => c.add(u)))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== AUM_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // Never intercept Firebase Auth/Firestore/API traffic
  if (API_HOSTS.some(h => url.hostname.includes(h))) return;

  /* HTML navigations → network-first, cache fallback (works offline) */
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(AUM_CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./')))
    );
    return;
  }

  /* Static assets → stale-while-revalidate (instant + updates in background) */
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(AUM_CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
