// core/categoryColors.js
// Asigna --cat-a, --cat-b... a cada categoría según orden de aparición,
// para no tener que hardcodear nombres de categoría en el CSS por proyecto.

export function buildCategoryColorMap(items) {
  const seen = [];
  items.forEach((item) => {
    if (!seen.includes(item.categoria)) seen.push(item.categoria);
  });
  const letters = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const map = {};
  seen.forEach((cat, i) => {
    map[cat] = `var(--cat-${letters[i % letters.length]})`;
  });
  return map;
}

export function catVar(categoryColorMap, categoria) {
  return categoryColorMap[categoria] || 'var(--accent)';
}
