const CACHE_NAME = 'nhlavutelo-cache-v1';
const CORE_ASSETS = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'hero.jpg',
  'cross1.png',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.css',
  'https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.js',
  'https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css',
  'https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js',
  'https://cdn.jsdelivr.net/npm/animate.css@4.1.1/animate.min.css',
  'https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js',
];

// Pré-cache de áudios (adicione os que tiver)
const AUDIO_ASSETS = Array.from({ length: 22 }, (_, i) => `musica${i + 1}.mp3`);

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll([...CORE_ASSETS, ...AUDIO_ASSETS]);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Estratégia: cache-first para estáticos e áudios; network-first para HTML
  if (req.destination === 'audio' || req.destination === 'style' || req.destination === 'script' || req.destination === 'image' || req.url.includes('bootstrap') || req.url.includes('swiper') || req.url.includes('aos') || req.url.includes('animate.css')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return cached || new Response('', { status: 504 });
      }
    })());
    return;
  }

  // HTML: network-first
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match(req);
        return cached || caches.match('index.html');
      }
    })());
  }
});