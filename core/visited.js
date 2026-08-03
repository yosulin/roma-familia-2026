// core/visited.js
// Guarda qué lugares se han marcado como visitados. La clave se
// namespacea por ruta (location.pathname) y, si se indica, por viaje
// (tripId) — para que varios viajes dentro de la misma app no compartan
// el mismo estado de "visitado".

const BASE_PREFIX = 'visited::' + (location.pathname.split('/')[1] || 'app');

function storageKey(tripId) {
  return tripId ? `${BASE_PREFIX}::${tripId}` : BASE_PREFIX;
}

function readSet(tripId) {
  try {
    const raw = localStorage.getItem(storageKey(tripId));
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function writeSet(set, tripId) {
  try {
    localStorage.setItem(storageKey(tripId), JSON.stringify([...set]));
  } catch {
    // localStorage no disponible (modo privado, etc.) — se degrada sin persistencia
  }
}

export function isVisited(id, tripId) {
  return readSet(tripId).has(id);
}

export function toggleVisited(id, tripId) {
  const set = readSet(tripId);
  if (set.has(id)) set.delete(id); else set.add(id);
  writeSet(set, tripId);
  return set.has(id);
}

export function visitedCount(totalIds, tripId) {
  const set = readSet(tripId);
  const total = totalIds.length;
  const done = totalIds.filter((id) => set.has(id)).length;
  return { done, total };
}
