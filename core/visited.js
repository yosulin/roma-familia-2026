// core/visited.js
// Guarda qué lugares se han marcado como visitados. La clave se
// namespacea por ruta (location.pathname) para que varias PWAs bajo el
// mismo usuario.github.io no compartan el mismo localStorage.

const STORAGE_KEY = 'visited::' + (location.pathname.split('/')[1] || 'app');

function readSet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function writeSet(set) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage no disponible (modo privado, etc.) — se degrada sin persistencia
  }
}

export function isVisited(id) {
  return readSet().has(id);
}

export function toggleVisited(id) {
  const set = readSet();
  if (set.has(id)) set.delete(id); else set.add(id);
  writeSet(set);
  return set.has(id);
}

export function visitedCount(totalIds) {
  const set = readSet();
  const total = totalIds.length;
  const done = totalIds.filter((id) => set.has(id)).length;
  return { done, total };
}
