// core/filters.js
import { vibrate, HAPTIC } from './haptics.js';

export function buildChips(containerId, options, { onSelect, colorFn, defaultActive } = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  options.forEach((opt) => {
    const chip = document.createElement('button');
    chip.className = 'filter-chip' + (opt.value === (defaultActive ?? options[0].value) ? ' is-active' : '');
    chip.textContent = opt.label;
    if (colorFn) {
      const c = colorFn(opt.value);
      if (c) chip.style.setProperty('--cat-color', c);
    }
    chip.dataset.value = opt.value;
    chip.addEventListener('click', () => {
      vibrate(HAPTIC.tap);
      [...el.children].forEach((c) => c.classList.toggle('is-active', c === chip));
      onSelect(opt.value);
    });
    el.appendChild(chip);
  });
}
