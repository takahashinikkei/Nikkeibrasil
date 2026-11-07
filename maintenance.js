'use strict';

// This page intentionally has no application login, API client, or data storage.
// Keep the worker at the legacy URL so installed copies can receive the update.
if ('serviceWorker' in navigator) {
  const workerURL = new URL('./sw.js', window.location.href);
  const scopeURL = new URL('./', window.location.href);
  navigator.serviceWorker.register(workerURL.href, {
    scope: scopeURL.href,
    updateViaCache: 'none',
  }).then(registration => registration.update()).catch(() => {
    document.getElementById('update-status').textContent =
      'Não foi possível atualizar a cópia instalada. Conecte-se à internet e abra esta página novamente antes de usar o aplicativo.';
  });
}
