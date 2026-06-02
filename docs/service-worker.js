const CACHE_VERSION = "v1";
const CACHE_NAME = `genius-kids-${CACHE_VERSION}`;

// Determine base path for GitHub Pages or other deployments
function getBasePath() {
	const pathname = self.location.pathname;
	if (pathname.includes("/Little-Genius-Platform/")) {
		return "/Little-Genius-Platform/";
	}
	return "/";
}

const BASE_PATH = getBasePath();

// Assets to cache on install - using correct paths for deployment
const ASSETS_TO_CACHE = [
	BASE_PATH,
	BASE_PATH + "index.html",
	BASE_PATH + "app.js",
	BASE_PATH + "styles.css",
	BASE_PATH + "manifest.json",
];

// Install event - cache essential assets
self.addEventListener("install", (event) => {
	console.log("[ServiceWorker] Installing...");
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => {
			console.log("[ServiceWorker] Caching essential assets");
			return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
				console.warn("[ServiceWorker] Some assets failed to cache:", err);
				// Don't fail the installation if some assets can't be cached
				return Promise.resolve();
			});
		}),
	);
	self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener("activate", (event) => {
	console.log("[ServiceWorker] Activating...");
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					if (cacheName !== CACHE_NAME) {
						console.log("[ServiceWorker] Deleting old cache:", cacheName);
						return caches.delete(cacheName);
					}
				}),
			);
		}),
	);
	self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
	const { request } = event;
	const url = new URL(request.url);

	// Skip non-GET requests
	if (request.method !== "GET") {
		return;
	}

	// Skip external requests (Firebase, Google Fonts, CDNs)
	if (url.origin !== self.location.origin) {
		event.respondWith(
			fetch(request)
				.then((response) => {
					// Cache successful responses from external sources
					if (response && response.status === 200) {
						const responseClone = response.clone();
						caches.open(CACHE_NAME).then((cache) => {
							cache.put(request, responseClone);
						});
					}
					return response;
				})
				.catch(() => {
					// Return a fallback response if offline
					console.log("[ServiceWorker] Offline - using cached or fallback response");
					return caches.match(request);
				}),
		);
		return;
	}

	// For local assets: cache-first strategy
	event.respondWith(
		caches.match(request).then((response) => {
			if (response) {
				console.log("[ServiceWorker] Serving from cache:", request.url);
				return response;
			}

			// Not in cache, fetch from network
			return fetch(request)
				.then((response) => {
					// Only cache successful responses
					if (!response || response.status !== 200 || response.type === "error") {
						return response;
					}

					// Clone and cache the response
					const responseClone = response.clone();
					caches.open(CACHE_NAME).then((cache) => {
						cache.put(request, responseClone);
					});

					return response;
				})
				.catch((error) => {
					console.log("[ServiceWorker] Fetch failed:", request.url, error);
					// Serve cached version if available
					return caches.match(request);
				});
		}),
	);
});

// Background sync for offline data (optional)
self.addEventListener("sync", (event) => {
	if (event.tag === "sync-data") {
		event.waitUntil(
			// Attempt to sync data when back online
			self.clients.matchAll().then((clients) => {
				clients.forEach((client) => {
					client.postMessage({ type: "BACKGROUND_SYNC" });
				});
			}),
		);
	}
});

// Message handler for client communication
self.addEventListener("message", (event) => {
	console.log("[ServiceWorker] Message received:", event.data);

	if (event.data && event.data.type === "SKIP_WAITING") {
		self.skipWaiting();
	}
});
