// Define the cache name and the files to be cached.
const CACHE_NAME = 'supersonic-music-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    'https://cdnjs.cloudflare.com/ajax/libs/jsmediatags/3.9.5/jsmediatags.min.js',
    // Add any other assets like fonts or icons here.
    // The placeholder image is a network resource and won't be cached by default.
    // The app will function offline, but new album art for uncached songs won't load.
];

// --- SERVICE WORKER INSTALLATION ---
// This event listener is triggered when the service worker is first installed.
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    // waitUntil() ensures that the service worker will not install until the code inside has successfully completed.
    event.waitUntil(
        // Open the cache with the specified name.
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Service Worker: Caching app shell');
                // Add all the specified URLs to the cache.
                return cache.addAll(urlsToCache);
            })
            .then(() => {
                console.log('Service Worker: Installation complete');
                // Force the waiting service worker to become the active service worker.
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('Service Worker: Installation failed', error);
            })
    );
});

// --- SERVICE WORKER ACTIVATION ---
// This event is triggered after installation, when the service worker becomes active.
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        // Get all the cache keys (cache names).
        caches.keys().then(cacheNames => {
            return Promise.all(
                // Filter out the caches that are not the current one and delete them.
                cacheNames.filter(cacheName => cacheName !== CACHE_NAME)
                    .map(cacheName => {
                        console.log(`Service Worker: Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    })
            );
        }).then(() => {
            console.log('Service Worker: Activation complete');
            // Take control of all pages under its scope immediately.
            return self.clients.claim();
        })
    );
});

// --- FETCH EVENT (Intercepting Network Requests) ---
// This event is triggered for every network request made by the page.
self.addEventListener('fetch', event => {
    // We only want to cache GET requests.
    if (event.request.method !== 'GET') {
        return;
    }

    // Use respondWith() to hijack the request and provide our own response.
    event.respondWith(
        // First, try to find a matching response in the cache.
        caches.match(event.request)
            .then(cachedResponse => {
                // If a cached response is found, return it.
                if (cachedResponse) {
                    // console.log('Service Worker: Serving from cache:', event.request.url);
                    return cachedResponse;
                }

                // If the request is not in the cache, fetch it from the network.
                // console.log('Service Worker: Fetching from network:', event.request.url);
                return fetch(event.request).then(
                    networkResponse => {
                        // A valid response from the network.
                        // We don't cache everything, just the app shell defined earlier.
                        // This prevents caching things like API calls or dynamic content unintentionally.
                        return networkResponse;
                    }
                ).catch(error => {
                    // This will happen if the network request fails (e.g., user is offline).
                    console.log('Service Worker: Fetch failed; user is likely offline.', event.request.url);
                    // You could return a generic fallback page or image here if you wanted.
                    // For this app, we'll just let the browser's default offline error show for non-cached resources.
                });
            })
    );
});
