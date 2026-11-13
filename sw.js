/* ============================================================
   Пятница.Пульт — service worker (для установки приложения / офлайна)
   Положите этот файл рядом с index.html в репозитории GitHub Pages.
   Кэш обновляется автоматически: страница всегда тянется по сети,
   офлайн работает из кэша, база Firebase — всегда напрямую по сети.
   ============================================================ */
const CACHE = 'pyatnitsa-pult-v28';
const SHELL = ['./', './index.html'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // База данных Firebase — только сеть, никогда не из кэша
  if (url.hostname.includes('firebaseio') || url.hostname.includes('firebasedatabase')) return;

  // Сама страница: сеть первая (чтобы обновления с GitHub доходили), офлайн — из кэша
  const isNav = req.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname === '/';
  if (isNav) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const cp = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', cp)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Остальное (иконки и т.п.): кэш первый
  e.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        const cp = res.clone();
        caches.open(CACHE).then((c) => c.put(req, cp)).catch(() => {});
        return res;
      })
    )
  );
});
