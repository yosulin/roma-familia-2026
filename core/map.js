// core/map.js
import { catVar } from './categoryColors.js';

let leafletMap = null;
let markers = [];

export function initMap(center, zoom = 14) {
  leafletMap = L.map('map').setView(center, zoom);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(leafletMap);
  return leafletMap;
}

export function getMap() {
  return leafletMap;
}

export function renderMarkers(lugares, { categoryColorMap, onClick }) {
  if (!leafletMap) return;
  markers.forEach((m) => leafletMap.removeLayer(m));
  markers = [];

  lugares.forEach((l) => {
    if (!l.coordenadas) return;
    const colorVar = catVar(categoryColorMap, l.categoria);
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue(colorVar.replace('var(', '').replace(')', '')).trim() || '#2f5eff';
    const ring = l.prioridad === 'imprescindible' ? '3px solid #f4a300' : '2px solid #ffffff';
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:${ring};box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    const marker = L.marker([l.coordenadas.lat, l.coordenadas.lng], { icon }).addTo(leafletMap);
    const star = l.prioridad === 'imprescindible' ? '★ ' : '';
    marker.bindPopup(`<h3>${star}${l.nombre}</h3><p>${l.descripcion_breve || ''}</p>`);
    marker.on('click', () => onClick && onClick(l));
    markers.push(marker);
  });
}

export function invalidateMapSize() {
  if (leafletMap) setTimeout(() => leafletMap.invalidateSize(), 50);
}
