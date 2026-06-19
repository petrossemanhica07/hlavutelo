const CACHE_NAME = 'nhlavutelo-v2.0.0';
const RUNTIME_CACHE = 'nhlavutelo-runtime-v2.0.0';
const AUDIO_CACHE = 'nhlavutelo-audio-v2.0.0';

// Assets críticos que devem estar sempre em cache
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/sw.js'
];

// Bibliotecas externas
const EXTERNAL_LIBS = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css',
  'https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.css',
  'https://cdn.jsdelivr.net/npm/swiper@10/swiper-bundle.min.js',
  'https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.css',
  'https://cdn.jsdelivr.net/npm/aos@2.3.4/dist/aos.js',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Inter:wght@300;400;500;600;700&display=swap'
];

// Install: cache de assets críticos
self.addEventListener('install', (event) => {
  console.log('[SW] Installing v2.0.0...');
  
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        await cache.addAll([...CRITICAL_ASSETS, ...EXTERNAL_LIBS]);
        self.skipWaiting();
        console.log('[SW] Cache installed successfully');
      } catch (err) {
        console.error('[SW] Install error:', err);
      }
    })()
  );
});

// Activate: limpar caches antigos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const toDelete = keys.filter(k => 
        !k.includes(CACHE_NAME) && 
        !k.includes(RUNTIME_CACHE) && 
        !k.includes(AUDIO_CACHE) &&
        k.includes('nhlavutelo')
      );
      
      await Promise.all(toDelete.map(k => caches.delete(k)));
      self.clients.claim();
      console.log('[SW] Cleaned up old caches:', toDelete);
    })()
  );
});

// Fetch: estratégia híbrida inteligente
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requisições de extensões ou chrome
  if (url.protocol === 'chrome-extension:' || url.protocol === 'edge:') {
    return;
  }

  // Estratégia 1: HTML - Network First (atualização dinâmica)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Estratégia 2: Áudios - Cache First (reutilizar se disponível)
  if (request.destination === 'audio' || url.pathname.includes('.mp3') || url.pathname.includes('musica')) {
    event.respondWith(cacheFirstAudio(request));
    return;
  }

  // Estratégia 3: CSS, JS, imagens, fontes - Cache First
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'image' ||
    request.destination === 'font' ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('bootstrapcdn.com') ||
    url.hostname.includes('jsdelivr.net')
  ) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Estratégia 4: Padrão - Network First com fallback
  event.respondWith(networkFirstStrategy(request));
});

// ==================== ESTRATÉGIAS ====================

/**
 * Cache First: Tenta cache primeiro, depois network
 * Ideal para: assets estáticos, bibliotecas externas
 */
async function cacheFirstStrategy(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
      // Atualizar em background (não esperar)
      updateCache(request, cache);
      return cached;
    }

    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.warn('[SW] Cache first failed:', error);
    
    // Fallback para cache se disponível
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // Fallback para offline page
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Cache First para Áudios: Prioriza cache, persiste novos
 */
async function cacheFirstAudio(request) {
  try {
    const cache = await caches.open(AUDIO_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
      console.log('[SW] Serving audio from cache:', request.url);
      return cached;
    }

    console.log('[SW] Downloading audio:', request.url);
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.error('[SW] Audio fetch failed:', error);
    const cached = await caches.match(request);
    return cached || new Response('Audio not available', { status: 404 });
  }
}

/**
 * Network First: Tenta network primeiro, fallback para cache
 * Ideal para: HTML, conteúdo dinâmico
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    console.warn('[SW] Network failed, using cache:', error);
    
    const cache = await caches.open(RUNTIME_CACHE);
    const cached = await cache.match(request);
    
    if (cached) return cached;
    
    // Se nada em cache, tenta cache geral
    const mainCache = await caches.open(CACHE_NAME);
    const mainCached = await mainCache.match(request);
    if (mainCached) return mainCached;
    
    // Fallback final
    return new Response(
      '<!DOCTYPE html><html><head><title>Offline</title></head><body><h1>Você está offline</h1><p>Verifique sua conexão</p></body></html>',
      { 
        status: 503, 
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

/**
 * Atualizar cache em background
 */
async function updateCache(request, cache) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
  } catch (error) {
    // Falha silenciosa
  }
}

// ==================== MENSAGENS DO CLIENTE ====================

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_AUDIO') {
    // Cliente pode solicitar cache de um áudio específico
    const { url } = event.data;
    cacheAudioPreload(url);
  }
});

/**
 * Pré-carregar áudio em cache
 */
async function cacheAudioPreload(url) {
  try {
    const cache = await caches.open(AUDIO_CACHE);
    const response = await fetch(url);
    if (response.ok) {
      cache.put(url, response);
      console.log('[SW] Audio preloaded:', url);
    }
  } catch (error) {
    console.warn('[SW] Preload failed:', url, error);
  }
}

// ==================== NOTIFICAÇÃO OFFLINE ====================

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-comments') {
    event.waitUntil(syncComments());
  }
});

async function syncComments() {
  // Sincronizar comentários quando voltar online
  console.log('[SW] Syncing comments...');
  // Implementar lógica de sync aqui
}

console.log('[SW] Service Worker v2.0.0 loaded');