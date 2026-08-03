// core/install.js
let deferredPrompt = null;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function setupInstallPrompt(appName = 'esta app') {
  const banner = document.getElementById('installBanner');
  const btn = document.getElementById('installBtn');
  const dismiss = document.getElementById('installDismiss');
  const text = document.getElementById('installText');
  if (!banner) return;

  if (isStandalone() || sessionStorage.getItem('installDismissed')) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    banner.classList.add('is-visible');
  });

  if (isIOS()) {
    text.textContent = `Añade ${appName} a tu pantalla de inicio: toca Compartir y luego "Añadir a pantalla de inicio".`;
    btn.style.display = 'none';
    banner.classList.add('is-visible');
  }

  btn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    banner.classList.remove('is-visible');
  });

  dismiss.addEventListener('click', () => {
    banner.classList.remove('is-visible');
    sessionStorage.setItem('installDismissed', '1');
  });
}
