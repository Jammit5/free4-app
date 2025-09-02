// Service Worker for Free4 App
const CACHE_NAME = 'free4-app-v1.0.0'
const STATIC_CACHE = 'free4-static-v1.0.0'
const DYNAMIC_CACHE = 'free4-dynamic-v1.0.0'

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/_next/static/css/app/layout.css',
  // Add other critical static files
]

// API routes that should work offline with cached data
const API_CACHE_ROUTES = [
  '/api/matches'
]

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...')
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static files')
        return cache.addAll(STATIC_FILES)
      })
      .then(() => {
        console.log('Service Worker: Installation complete')
        return self.skipWaiting()
      })
      .catch(err => console.log('Service Worker: Installation failed', err))
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...')
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker: Activation complete')
        return self.clients.claim()
      })
  )
})

// Fetch event - intercept network requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests and external requests
  if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) {
    return
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request))
    return
  }

  // Handle static files and pages
  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse
        }

        // Fetch from network and cache
        return fetch(request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            // Clone response for caching
            const responseToCache = response.clone()
            
            caches.open(DYNAMIC_CACHE)
              .then(cache => {
                cache.put(request, responseToCache)
              })

            return response
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (request.mode === 'navigate') {
              return caches.match('/')
            }
          })
      })
  )
})

// Handle API requests with cache-first strategy for matches
async function handleApiRequest(request) {
  const url = new URL(request.url)
  
  try {
    // Try network first for fresh data
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache successful API responses
      if (url.pathname === '/api/matches') {
        const cache = await caches.open(DYNAMIC_CACHE)
        cache.put(request, networkResponse.clone())
      }
      return networkResponse
    }
    
    throw new Error('Network request failed')
  } catch (error) {
    console.log('Service Worker: Network request failed, trying cache...', error)
    
    // Fallback to cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }
    
    // Return a custom offline response for API
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'Du bist offline. Bitte überprüfe deine Internetverbindung.' 
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag)
  
  if (event.tag === 'background-matches-sync') {
    event.waitUntil(syncMatches())
  }
})

// Background sync for matches
async function syncMatches() {
  try {
    console.log('Service Worker: Syncing matches in background...')
    
    // Get user data from IndexedDB or cache
    const userDataResponse = await caches.match('/api/user')
    if (!userDataResponse) return
    
    const userData = await userDataResponse.json()
    
    // Trigger matches refresh
    const response = await fetch(`/api/matches?userId=${userData.id}`)
    if (response.ok) {
      console.log('Service Worker: Background matches sync successful')
    }
  } catch (error) {
    console.log('Service Worker: Background sync failed:', error)
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received')
  
  const options = {
    body: 'Du hast neue Matches! Schau nach wer Zeit hat.',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'new-matches',
    data: {
      url: '/'
    },
    actions: [
      {
        action: 'view',
        title: 'Matches anzeigen',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Schließen'
      }
    ]
  }

  if (event.data) {
    const data = event.data.json()
    options.body = data.message || options.body
    options.data = { ...options.data, ...data }
  }

  event.waitUntil(
    self.registration.showNotification('Free4 - Neue Matches!', options)
  )
})

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked')
  
  event.notification.close()
  
  const action = event.action
  const data = event.notification.data
  
  if (action === 'close') {
    return
  }
  
  // Open the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        // Focus existing window if available
        for (const client of clients) {
          if (client.url.includes(self.location.origin)) {
            return client.focus()
          }
        }
        
        // Open new window
        return self.clients.openWindow(data.url || '/')
      })
  )
})