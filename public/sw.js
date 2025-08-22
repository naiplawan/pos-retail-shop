// Service Worker for POS Retail Shop
// Optimized for Thai retail environments with limited connectivity

const CACHE_VERSION = 'pos-v2.0.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;

// Files to cache immediately (critical for offline functionality)
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/_next/static/css/app.css',
  // Add critical JS bundles here after build
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/prices',
  '/api/summary/all',
  '/api/checklist'
];

// Cache strategies
const CACHE_STRATEGIES = {
  static: 'cache-first',
  api: 'network-first-with-cache-fallback',
  images: 'cache-first-with-network-fallback'
};

// Install event - cache critical resources
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE).then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => !cacheName.includes(CACHE_VERSION))
            .map(cacheName => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - handle all network requests
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP(S) requests
  if (!url.protocol.startsWith('http')) return;
  
  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
  } else if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else {
    event.respondWith(handleNavigationRequest(request));
  }
});

// Handle API requests with intelligent caching
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cacheKey = getCacheKey(request);
  
  try {
    // For read operations, try network first, fallback to cache
    if (request.method === 'GET') {
      // Try network first
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        // Cache successful responses
        const cache = await caches.open(API_CACHE);
        cache.put(cacheKey, networkResponse.clone());
        
        console.log('[SW] API response cached:', url.pathname);
        return networkResponse;
      }
      
      throw new Error(`Network response not ok: ${networkResponse.status}`);
    }
    
    // For write operations (POST, PUT, DELETE), always try network
    else {
      const response = await fetch(request);
      
      if (response.ok) {
        // Invalidate related cache entries on successful writes
        await invalidateRelatedCache(url.pathname);
      }
      
      return response;
    }
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error.message);
    
    // For GET requests, try to serve from cache
    if (request.method === 'GET') {
      const cachedResponse = await caches.match(cacheKey);
      
      if (cachedResponse) {
        console.log('[SW] Serving API from cache:', url.pathname);
        return cachedResponse;
      }
      
      // Return offline response for critical endpoints
      if (isCriticalEndpoint(url.pathname)) {
        return createOfflineApiResponse(url.pathname);
      }
    }
    
    // For write operations while offline, store in IndexedDB
    else {
      await storeOfflineOperation(request);
      return new Response(
        JSON.stringify({ success: true, offline: true }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    throw error;
  }
}

// Handle static assets (CSS, JS, etc.)
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Critical static assets should be cached during install
    console.error('[SW] Failed to load static asset:', request.url);
    throw error;
  }
}

// Handle image requests with compression
async function handleImageRequest(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache images with size limit
      const contentLength = networkResponse.headers.get('content-length');
      if (!contentLength || parseInt(contentLength) < 5 * 1024 * 1024) { // 5MB limit
        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
    }
    
    return networkResponse;
  } catch (error) {
    // Return placeholder for failed images
    return createPlaceholderImage();
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      return networkResponse;
    }
    
    throw new Error(`Navigation response not ok: ${networkResponse.status}`);
  } catch (error) {
    console.log('[SW] Navigation failed, serving offline page');
    
    // Serve offline page
    const offlineResponse = await caches.match('/offline.html');
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

// Utility functions
function getCacheKey(request) {
  const url = new URL(request.url);
  // Remove cache-busting parameters for consistent caching
  url.searchParams.delete('_t');
  url.searchParams.delete('v');
  return url.toString();
}

function isStaticAsset(pathname) {
  return pathname.startsWith('/_next/') || 
         pathname.endsWith('.js') || 
         pathname.endsWith('.css') || 
         pathname.endsWith('.woff2') ||
         pathname.endsWith('.woff');
}

function isImageRequest(request) {
  return request.destination === 'image' ||
         /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(request.url);
}

function isCriticalEndpoint(pathname) {
  const criticalPaths = ['/api/prices', '/api/summary'];
  return criticalPaths.some(path => pathname.startsWith(path));
}

async function invalidateRelatedCache(pathname) {
  const cache = await caches.open(API_CACHE);
  const keys = await cache.keys();
  
  // Invalidate related cache entries
  const toDelete = keys.filter(request => {
    const url = new URL(request.url);
    return url.pathname.startsWith('/api/') && 
           (pathname.includes('prices') ? url.pathname.includes('prices') : false);
  });
  
  await Promise.all(toDelete.map(request => cache.delete(request)));
  console.log('[SW] Invalidated', toDelete.length, 'cache entries');
}

function createOfflineApiResponse(pathname) {
  let offlineData = { data: [], offline: true };
  
  // Provide sensible defaults for different endpoints
  if (pathname.includes('prices')) {
    offlineData.data = [];
  } else if (pathname.includes('summary')) {
    offlineData.data = { totalItems: 0, averagePrice: 0 };
  }
  
  return new Response(JSON.stringify(offlineData), {
    headers: { 'Content-Type': 'application/json' }
  });
}

function createPlaceholderImage() {
  // Create a simple 1x1 transparent PNG
  const imageData = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  const buffer = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
  
  return new Response(buffer, {
    headers: { 'Content-Type': 'image/png' }
  });
}

// Store offline operations in IndexedDB for later sync
async function storeOfflineOperation(request) {
  try {
    const operation = {
      id: Date.now() + '-' + Math.random(),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.text(),
      timestamp: Date.now()
    };
    
    // Open IndexedDB
    const db = await openDB();
    const tx = db.transaction(['offline_operations'], 'readwrite');
    await tx.objectStore('offline_operations').add(operation);
    
    console.log('[SW] Stored offline operation:', operation.id);
  } catch (error) {
    console.error('[SW] Failed to store offline operation:', error);
  }
}

// IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pos-offline-store', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = event => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('offline_operations')) {
        const store = db.createObjectStore('offline_operations', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Background sync for offline operations
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(syncOfflineOperations());
  }
});

async function syncOfflineOperations() {
  try {
    const db = await openDB();
    const tx = db.transaction(['offline_operations'], 'readonly');
    const operations = await tx.objectStore('offline_operations').getAll();
    
    console.log('[SW] Syncing', operations.length, 'offline operations');
    
    for (const operation of operations) {
      try {
        await fetch(operation.url, {
          method: operation.method,
          headers: operation.headers,
          body: operation.body
        });
        
        // Remove successful operation
        const deleteTx = db.transaction(['offline_operations'], 'readwrite');
        await deleteTx.objectStore('offline_operations').delete(operation.id);
        
        console.log('[SW] Synced operation:', operation.id);
      } catch (error) {
        console.error('[SW] Failed to sync operation:', operation.id, error);
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Push notifications for real-time updates
self.addEventListener('push', event => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'มีข้อมูลใหม่ในระบบ',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'pos-update',
    data: data.data,
    actions: [
      {
        action: 'view',
        title: 'ดูข้อมูล'
      },
      {
        action: 'dismiss',
        title: 'ปิด'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'POS Update', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('[SW] Service worker loaded and ready');