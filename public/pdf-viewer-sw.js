const PDF_CACHE = 'eth-study-open-pdfs-v1';

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith('/pdf-view/')) return;

  event.respondWith((async () => {
    const cache = await caches.open(PDF_CACHE);
    const response = await cache.match(event.request.url);
    return response || new Response('This PDF is no longer open. Return to the app and open it again.', {
      status: 404,
      headers: {'Content-Type': 'text/plain; charset=utf-8'},
    });
  })());
});
