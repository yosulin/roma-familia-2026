// core/update.js
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateToast(newWorker);
        }
      });
    });
  }).catch(() => {});

  // si otra pestaña activó una versión nueva, recarga esta también
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

function showUpdateToast(newWorker) {
  const toast = document.getElementById('updateToast');
  const btn = document.getElementById('updateBtn');
  if (!toast) return;
  toast.classList.add('is-visible');
  btn.addEventListener('click', () => {
    newWorker.postMessage('SKIP_WAITING');
  }, { once: true });
}
