// core/search.js
function normalize(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function filterByQuery(lugares, query) {
  const q = normalize(query).trim();
  if (!q) return lugares;
  return lugares.filter((l) =>
    normalize(l.nombre).includes(q) ||
    normalize(l.zona).includes(q) ||
    normalize(l.descripcion_breve).includes(q)
  );
}

export function setupSearchInput(inputId, onChange) {
  const el = document.getElementById(inputId);
  if (!el) return;
  el.addEventListener('input', () => onChange(el.value));
}
