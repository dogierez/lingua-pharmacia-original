const CACHE_NAME = 'flashcard-app-v1';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './icon-192x192.png',
    './icon-512x512.png'
];

// Install Event: Cache the application files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

// Activate Event: Clean up old caches if the version changes
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Ensure the service worker takes control of the page immediately
    self.clients.claim();
});

// Fetch Event: Serve files from cache first, then network
self.addEventListener('fetch', (event) => {
    // We don't want to cache the Google Sheets API calls, so they always get the freshest data when online
    if (event.request.url.includes('docs.google.com/spreadsheets')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return the cached file if it exists, otherwise fetch it from the internet
            return cachedResponse || fetch(event.request);
        })
    );
});
