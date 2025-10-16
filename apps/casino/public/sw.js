// Service Worker for MyPokies - Offline Caching and Performance
const CACHE_NAME = 'mypokies-v1';
const OFFLINE_PAGE = '/offline.html';

// Assets to cache immediately on install
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/favicon.png',
  '/logo.webp',
  '/fonts/OpenRunde-Regular.woff2',
  '/fonts/OpenRunde-Medium.woff2',
  '/fonts/OpenRunde-Semibold.woff2',
  '/fonts/OpenRunde-Bold.woff2',
  '/fonts/LuckiestGuy.ttf',
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Network first, fallback to cache
  networkFirst: [
    '/api/',
    '/_next/data/',
  ],
  // Cache first, fallback to network
  cacheFirst: [
    '/fonts/',
    '/_next/static/',
    '/images/',
    '.png',
    '.jpg',
    '.jpeg',
    '.webp',
    '.svg',
    '.woff',
    '.woff2',
    '.ttf',
  ],
  // Network only (never cache)
  networkOnly: [
    '/auth/',
    '/supabase/',
    '/protected/',
  ],
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Install failed:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Determine cache strategy
  const strategy = getCacheStrategy(url.pathname);

  if (strategy === 'networkOnly') {
    event.respondWith(fetch(request));
  } else if (strategy === 'cacheFirst') {
    event.respondWith(cacheFirst(request));
  } else if (strategy === 'networkFirst') {
    event.respondWith(networkFirst(request));
  } else {
    // Default to network first
    event.respondWith(networkFirst(request));
  }
});

// Determine cache strategy for a URL
function getCacheStrategy(pathname) {
  // Check network only patterns
  for (const pattern of CACHE_STRATEGIES.networkOnly) {
    if (pathname.includes(pattern)) {
      return 'networkOnly';
    }
  }

  // Check cache first patterns
  for (const pattern of CACHE_STRATEGIES.cacheFirst) {
    if (pathname.includes(pattern)) {
      return 'cacheFirst';
    }
  }

  // Check network first patterns
  for (const pattern of CACHE_STRATEGIES.networkFirst) {
    if (pathname.includes(pattern)) {
      return 'networkFirst';
    }
  }

  return 'networkFirst';
}

// Cache first strategy
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);

    // Try to return cached version even if expired
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match(OFFLINE_PAGE);
      if (offlinePage) {
        return offlinePage;
      }
    }

    throw error;
  }
}

// Network first strategy
async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('[SW] Network first failed, trying cache:', error);

    // Fallback to cache
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match(OFFLINE_PAGE);
      if (offlinePage) {
        return offlinePage;
      }
    }

    throw error;
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-user-data') {
    event.waitUntil(syncUserData());
  }
});

async function syncUserData() {
  // Implement background sync logic here
  console.log('[SW] Syncing user data...');
}

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New notification from MyPokies',
    icon: '/favicon.png',
    badge: '/favicon.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'MyPokies Casino', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click:', event.notification.tag);
  event.notification.close();

  event.waitUntil(
    clients.openWindow('/')
  );
});