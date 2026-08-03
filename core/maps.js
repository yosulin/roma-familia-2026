// core/maps.js
export function mapsUrl(lugar) {
  const q = `${lugar.coordenadas.lat},${lugar.coordenadas.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function directionsUrl(lugar) {
  const q = `${lugar.coordenadas.lat},${lugar.coordenadas.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}
