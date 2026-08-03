// core/info.js
// Renderiza data/trip.json (vuelos, alojamiento, contactos de emergencia)
// en la vista "Info". Todas las secciones son opcionales.

export function renderTripInfo(containerId, trip) {
  const el = document.getElementById(containerId);
  if (!el || !trip) return;

  const vuelos = (trip.vuelos || []).map((v) => `
    <div class="info-card">
      <div class="info-card-title">${v.ruta}</div>
      <div class="info-card-row"><span>${v.fecha}</span><strong>${v.salida} → ${v.llegada}</strong></div>
      <div class="info-card-sub">${v.aerolinea || ''} ${v.numero_vuelo || ''} · ${v.duracion || ''}</div>
      ${v.numero_vuelo ? `<a class="info-card-track" href="https://www.flightradar24.com/data/flights/${v.numero_vuelo.toLowerCase().replace(/\s+/g, '')}" target="_blank" rel="noopener">🛫 Ver estado del vuelo en vivo</a>` : ''}
    </div>
  `).join('');

  const alojamiento = trip.alojamiento ? `
    <div class="info-card">
      <div class="info-card-title">${trip.alojamiento.nombre || 'Alojamiento'}</div>
      ${trip.alojamiento.direccion ? `<div class="info-card-row">${trip.alojamiento.direccion}</div>` : ''}
      ${trip.alojamiento.checkin ? `<div class="info-card-sub">Check-in: ${trip.alojamiento.checkin} · Check-out: ${trip.alojamiento.checkout || ''}</div>` : ''}
      ${trip.alojamiento.telefono ? `<div class="info-card-sub">📞 ${trip.alojamiento.telefono}</div>` : ''}
      ${trip.alojamiento.notas ? `<div class="info-card-sub">${trip.alojamiento.notas}</div>` : ''}
    </div>
  ` : '';

  const contactos = (trip.contactos_emergencia || []).map((c) => `
    <div class="info-card">
      <div class="info-card-title">${c.nombre}</div>
      ${c.telefono ? `<div class="info-card-row">📞 <a href="tel:${c.telefono.replace(/\s/g, '')}">${c.telefono}</a></div>` : ''}
      ${c.direccion ? `<div class="info-card-sub">${c.direccion}</div>` : ''}
      ${c.nota ? `<div class="info-card-sub">${c.nota}</div>` : ''}
    </div>
  `).join('');

  el.innerHTML = `
    ${vuelos ? `<div class="sheet-section info-section"><h4>Vuelos</h4>${vuelos}</div>` : ''}
    ${alojamiento ? `<div class="sheet-section info-section"><h4>Alojamiento</h4>${alojamiento}</div>` : ''}
    ${contactos ? `<div class="sheet-section info-section"><h4>Contactos de emergencia</h4>${contactos}</div>` : ''}
  `;
}
