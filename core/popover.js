// core/popover.js
// Popover pequeño y flotante (estilo cristal) anclado a un botón, para
// mostrar datos rápidos sin abrir la ficha completa. Se cierra al tocar
// fuera, al pulsar Escape, o programáticamente con closePopover().

let current = null;

export function showPopover(anchorEl, html, { onClose } = {}) {
  closePopover();

  const pop = document.createElement('div');
  pop.className = 'glass-popover';
  pop.innerHTML = `<button class="glass-popover-close" aria-label="Cerrar">✕</button><div class="glass-popover-body">${html}</div>`;
  document.body.appendChild(pop);

  positionPopover(pop, anchorEl);

  requestAnimationFrame(() => pop.classList.add('is-open'));

  const onDocClick = (e) => {
    if (!pop.contains(e.target) && e.target !== anchorEl) close();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  const onScroll = () => close();

  function close() {
    pop.classList.remove('is-open');
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('scroll', onScroll, true);
    setTimeout(() => pop.remove(), 150);
    current = null;
    if (onClose) onClose();
  }

  pop.querySelector('.glass-popover-close').addEventListener('click', close);
  setTimeout(() => {
    document.addEventListener('click', onDocClick, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
  }, 0);

  current = { close };
}

export function closePopover() {
  if (current) current.close();
}

function positionPopover(pop, anchorEl) {
  const rect = anchorEl.getBoundingClientRect();
  const popWidth = 260;
  pop.style.width = `${popWidth}px`;

  let left = rect.left + rect.width / 2 - popWidth / 2;
  left = Math.max(10, Math.min(left, window.innerWidth - popWidth - 10));

  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp = spaceBelow < 220;
  if (openUp) {
    pop.style.bottom = `${window.innerHeight - rect.top + 8}px`;
    pop.style.top = 'auto';
  } else {
    pop.style.top = `${rect.bottom + 8}px`;
    pop.style.bottom = 'auto';
  }
  pop.style.left = `${left}px`;
}
