const CACHE = 'hao-shell-v10-mobile';
const SHELL = ['./', './index.html', './styles.css', './app.js?v=20260917', './auth-session.js', './voice.js?v=20260917', './role-voice.js', './audio-capture.js', './audio-worklet.js', './conversation.js?v=20260917', './model-default.js?v=20260917', './privacy.js', './config.js', './assets/app-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/api/')) return;
  const allowed = SHELL.map(s => new URL(s, self.registration.scope).href);
  if (!allowed.includes(u.href)) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request)));
});
