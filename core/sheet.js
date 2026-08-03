// core/sheet.js
// Bottom sheet de detalle. Espera un objeto "lugar" con el esquema
// documentado en data/SCHEMA.md. Todos los campos son opcionales salvo
// nombre/categoria/coordenadas.

import { catVar } from './categoryColors.js';
import { mapsUrl, directionsUrl } from './maps.js';
import { toggleAudioguide } from './audioguide.js';
import { isVisited, toggleVisited } from './visited.js';

const PRIO_LABELS = {
  imprescindible: 'Imprescindible',
  recomendado: 'Recomendado',
  opcional: 'Opcional'
};

export function openSheet(lugar, { categoryColorMap, catLabels = {}, onAfterOpen, onVisitedChange } = {}) {
  if (window.speechSynthesis && speechSynthesis.speaking) speechSynthesis.cancel();

  const content = document.getElementById('sheetContent');
  const catColor = catVar(categoryColorMap, lugar.categoria);

  const eats = (lugar.sitios_para_comer || []).map((r) => `
    <div class="eat-item">
      <strong>${r.nombre}</strong>
      <span>${r.especialidad || r.tipo || ''} · ${r.precio_aprox_persona || ''} · ${r.puntuacion || ''}</span>
      <span>${r.distancia_aprox || ''}${r.necesita_reserva !== undefined ? ' · reserva: ' + r.necesita_reserva : ''}</span>
    </div>
  `).join('') || '';

  const photos = (lugar.spots_fotografia || []).map((p) => `
    <div class="photo-item">
      <strong>${p.nombre}</strong>
      <span>${p.mejor_hora || ''} · ${p.duracion_recomendada || ''}</span>
      <span>${p.por_que || ''}</span>
    </div>
  `).join('');

  const priorityTag = lugar.prioridad
    ? `<span class="priority-tag priority-${lugar.prioridad}">${lugar.prioridad === 'imprescindible' ? '★ ' : ''}${PRIO_LABELS[lugar.prioridad] || lugar.prioridad}</span>`
    : '';

  const audioBtn = lugar.audioguia || lugar.descripcion_breve
    ? `<div class="action-row"><button class="action-btn primary" id="sheetAudioBtn">🔊 Escuchar audioguía</button></div>`
    : '';

  const visited = isVisited(lugar.id);
  const visitedBtn = `<div class="action-row">
    <button class="action-btn ${visited ? 'is-visited' : ''}" id="sheetVisitedBtn">
      ${visited ? '✅ Visitado' : '☐ Marcar como visitado'}
    </button>
  </div>`;

  const mapsRow = lugar.coordenadas
    ? `<div class="action-row">
         <a class="action-btn" href="${mapsUrl(lugar)}" target="_blank" rel="noopener">📍 Ver en Maps</a>
         <a class="action-btn" href="${directionsUrl(lugar)}" target="_blank" rel="noopener">🧭 Cómo llegar</a>
       </div>`
    : '';

  content.innerHTML = `
    <div class="cat-label" style="--cat-color:${catColor}">
      <span class="cat-dot" style="width:8px;height:8px;border-radius:50%;background:${catColor};display:inline-block"></span>
      ${catLabels[lugar.categoria] || lugar.categoria}
    </div>
    <h2>${lugar.nombre}</h2>
    ${priorityTag}
    <p>${lugar.descripcion_breve || ''}</p>

    ${audioBtn}
    ${visitedBtn}
    ${mapsRow}

    <dl class="fact-grid">
      <div><dt>Horario</dt><dd>${lugar.horario || '—'}</dd></div>
      <div><dt>Precio adulto</dt><dd>${lugar.precio_adulto || '—'}</dd></div>
      <div><dt>Precio niño</dt><dd>${lugar.precio_niño || '—'}</dd></div>
      <div><dt>Reserva</dt><dd>${lugar.necesita_reserva === true ? 'Sí' : (lugar.necesita_reserva === false ? 'No' : (lugar.necesita_reserva || '—'))}</dd></div>
      <div><dt>Duración</dt><dd>${lugar.tiempo_visita_recomendado || '—'}</dd></div>
      <div><dt>Mejor hora</dt><dd>${lugar.hora_visita_recomendada || lugar.mejor_momento_dia || '—'}</dd></div>
    </dl>

    ${lugar.dato_curioso_niños ? `<div class="sheet-section"><h4>Dato curioso</h4><p>${lugar.dato_curioso_niños}</p></div>` : ''}
    ${lugar.consejo_practico ? `<div class="sheet-section"><h4>Consejo práctico</h4><p>${lugar.consejo_practico}</p></div>` : ''}
    ${photos ? `<div class="sheet-section"><h4>Spots fotográficos</h4>${photos}</div>` : ''}
    ${eats ? `<div class="sheet-section"><h4>Dónde comer cerca</h4>${eats}</div>` : ''}
  `;

  const audioBtnEl = document.getElementById('sheetAudioBtn');
  if (audioBtnEl) {
    audioBtnEl.addEventListener('click', (e) => {
      toggleAudioguide(lugar.audioguia || lugar.descripcion_breve, e.currentTarget);
    });
  }

  const visitedBtnEl = document.getElementById('sheetVisitedBtn');
  visitedBtnEl.addEventListener('click', () => {
    const nowVisited = toggleVisited(lugar.id);
    visitedBtnEl.textContent = nowVisited ? '✅ Visitado' : '☐ Marcar como visitado';
    visitedBtnEl.classList.toggle('is-visited', nowVisited);
    if (onVisitedChange) onVisitedChange(lugar.id, nowVisited);
  });

  document.getElementById('sheet').classList.add('is-open');
  document.getElementById('sheetBackdrop').classList.add('is-open');
  if (onAfterOpen) onAfterOpen(lugar);
}

export function closeSheet() {
  if (window.speechSynthesis && speechSynthesis.speaking) speechSynthesis.cancel();
  document.getElementById('sheet').classList.remove('is-open');
  document.getElementById('sheetBackdrop').classList.remove('is-open');
}

export function setupSheetDismiss() {
  document.getElementById('sheetBackdrop').addEventListener('click', closeSheet);
}
