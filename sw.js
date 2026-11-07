'use strict';

// Containment worker: never read or write cached business data or legacy HTML.
const APP_SCOPE = new URL(self.registration.scope);
const MAINTENANCE_DOCUMENT = "<!doctype html>\n<html lang=\"pt-BR\">\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n  <meta name=\"theme-color\" content=\"#111827\">\n  <meta name=\"robots\" content=\"noindex, nofollow\">\n  <meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; manifest-src 'self'; worker-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-src 'none'\">\n  <title>Nikkei Brasil | Manutenção</title>\n  <link rel=\"stylesheet\" href=\"./maintenance.css\">\n  <link rel=\"manifest\" href=\"./manifest.json\">\n  <script src=\"./maintenance.js\" defer></script>\n</head>\n<body>\n  <main class=\"notice\" aria-labelledby=\"notice-title\">\n    <p class=\"brand\">NIKKEI BRASIL</p>\n    <span class=\"badge\">Aplicativo antigo</span>\n    <h1 id=\"notice-title\">Acesso temporariamente indisponível</h1>\n    <p>Este aplicativo está em manutenção de segurança. O acesso e o envio de informações estão suspensos até a conclusão da verificação.</p>\n    <p class=\"muted\">Nenhuma senha ou documento deve ser enviado por esta página.</p>\n    <p id=\"update-status\" class=\"status\" role=\"status\" aria-live=\"polite\"></p>\n  </main>\n</body>\n</html>\n";

function maintenanceResponse() {
  return new Response(MAINTENANCE_DOCUMENT, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; manifest-src 'self'; worker-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    },
  });
}

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    // CacheStorage is origin-wide. Preserve caches belonging to other apps.
    await Promise.all(keys.filter(key => key.startsWith('nikkeibrasil-')).map(key => caches.delete(key)));
    await self.clients.claim();
    // Retire already-open legacy documents as soon as this worker takes control.
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      const url = new URL(client.url);
      if (url.origin === APP_SCOPE.origin && url.pathname.startsWith(APP_SCOPE.pathname)) {
        // Do not await navigation inside activation: its fetch waits for this
        // activation to finish, which would deadlock the document load.
        client.navigate(new URL('index.html', APP_SCOPE).href).catch(() => {
          /* A closed tab needs no update. */
        });
      }
    }
  })());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const inScope = url.origin === APP_SCOPE.origin && url.pathname.startsWith(APP_SCOPE.pathname);
  if (event.request.mode === 'navigate' && inScope) {
    // Embed the safe page: never trust stale origin/CDN HTML during rollout.
    // This also protects offline clients without any response cache.
    event.respondWith(Promise.resolve(maintenanceResponse()));
    return;
  }
  // A still-open legacy document may try to contact the backend before navigation.
  // Block every non-static request from controlled clients, including external APIs.
  const allowedPaths = ['maintenance.css', 'maintenance.js', 'manifest.json', 'nikkei_branco_800x244_300-800KB.png']
    .map(path => new URL(path, APP_SCOPE).pathname);
  if (event.request.method !== 'GET' || !inScope || !allowedPaths.includes(url.pathname)) {
    event.respondWith(Promise.resolve(new Response('', { status: 403, headers: { 'Cache-Control': 'no-store' } })));
    return;
  }
  event.respondWith(fetch(event.request, { cache: 'no-store' }).catch(() =>
    new Response('', { status: 503, headers: { 'Cache-Control': 'no-store' } })));
});
