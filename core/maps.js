// core/maps.js
export function mapsUrl(lugar) {
  const q = `${lugar.coordenadas.lat},${lugar.coordenadas.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function directionsUrl(lugar) {
  const q = `${lugar.coordenadas.lat},${lugar.coordenadas.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

// Para sitios sin coordenadas propias (p.ej. restaurantes): busca por nombre
// + contexto (zona del lugar padre). Menos preciso que un lat/lng exacto,
// pero Google Maps suele resolverlo bien con un nombre de negocio real.
export function searchTextUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
