const PDF_CACHE = 'eth-study-open-pdfs-v1';

export async function openNamedPdf(blob, name, viewer) {
  if (!('serviceWorker' in navigator) || !('caches' in window)) throw new Error('Named PDF viewing is unavailable in this browser.');
  await navigator.serviceWorker.register('/pdf-viewer-sw.js', {scope: '/'});
  await navigator.serviceWorker.ready;

  const safeName = name.replace(/[\\/]/g, '_');
  const path = `/pdf-view/${crypto.randomUUID()}/${encodeURIComponent(safeName)}`;
  const url = new URL(path, location.origin).href;
  const cache = await caches.open(PDF_CACHE);
  const asciiName = safeName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  const response = new Response(blob, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`,
    },
  });
  await cache.put(url, response);
  try {
    if (viewer.closed) {
      await cache.delete(url);
      return null;
    }
    viewer.location.replace(url);
  } catch (error) {
    await cache.delete(url);
    throw error;
  }
  return async () => { await cache.delete(url); };
}
