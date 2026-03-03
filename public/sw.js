const CACHE_NAME = 'eff-cache-v2'
const BASE_PATH = new URL(self.registration.scope).pathname
const APP_SHELL = [BASE_PATH, `${BASE_PATH}index.html`, `${BASE_PATH}manifest.webmanifest`]

self.addEventListener('install', event => {
	event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)))
})

self.addEventListener('activate', event => {
	event.waitUntil(
		caches
			.keys()
			.then(keys =>
				Promise.all(
					keys.map(key => (key !== CACHE_NAME ? caches.delete(key) : Promise.resolve()))
				)
			)
			.then(() => self.clients.claim())
	)
})

self.addEventListener('fetch', event => {
	const request = event.request
	if (request.method !== 'GET') return

	const url = new URL(request.url)
	if (url.origin !== self.location.origin) return

	event.respondWith(
		caches.match(request).then(cached => {
			if (cached) return cached
			return fetch(request)
				.then(response => {
					if (!response || response.status !== 200 || response.type !== 'basic') return response
					const copy = response.clone()
					caches.open(CACHE_NAME).then(cache => cache.put(request, copy))
					return response
				})
				.catch(() => caches.match(`${BASE_PATH}index.html`))
		})
	)
})

self.addEventListener('message', event => {
	if (event.data?.type === 'SKIP_WAITING') {
		void self.skipWaiting()
	}
})
