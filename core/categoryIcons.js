// core/categoryIcons.js
const DEFAULT_ICONS = {
  monumento: '🏛️',
  museo: '🖼️',
  plaza: '🌳',
  barrio: '🏘️',
  mercado: '🛒',
  mirador: '🔭',
  parque: '🌲',
  freetour: '🚶'
};

export function categoryIcon(categoria, overrides = {}) {
  return overrides[categoria] || DEFAULT_ICONS[categoria] || '📍';
}
