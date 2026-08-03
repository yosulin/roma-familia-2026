// ---------- ESTADO ----------
let DATA = null;
let activeDay = null;
let activeMapFilter = 'todas';
let activeLugaresCatFilter = 'todas';
let activeLugaresPrioFilter = 'todas';
let leafletMap = null;
let mapMarkers = [];
let deferredInstallPrompt = null;
let currentUtterance = null;

const DAY_LABELS = {
  viernes: 'Vie 9',
  sábado: 'Sáb 10',
  domingo: 'Dom 11',
  lunes: 'Lun 12'
};

const CAT_LABELS = {
  monumento: 'Monumento',
  museo: 'Museo',
  plaza: 'Plaza',
  barrio: 'Barrio',
  mercado: 'Mercado',
  mirador: 'Mirador',
  parque: 'Parque',
  freetour: 'Free Tour'
};

const PRIO_LABELS = {
  imprescindible: 'Imprescindible',
  recomendado: 'Recomendado',
  opcional: 'Opcional'
};

// ---------- CARGA DE DATOS ----------
async function loadData() {
  const res = await fetch('data/lugares.json');
  DATA = await res.json();
  buildDayTabs();
  buildFilters('mapFilters', (cat) => { activeMapFilter = cat; renderMap(); });
  buildCategoryFilters('lugaresFilters', (cat) => { activeLugaresCatFilter = cat; renderLugares(); });
  buildPriorityFilters('prioridadFilters', (p) => { activeLugaresPrioFilter = p; renderLugares(); });
  renderItinerario();
  renderLugares();
}

function findLugar(id) {
  return DATA.lugares.find((l) => l.id === id);
}

function matchLugarFromPlanLine(line) {
  const lower = line.toLowerCase();
  let best = null;
  for (const l of DATA.lugares) {
    const key = l.nombre.toLowerCase().split(' y ')[0].split(' (')[0];
    if (lower.includes(key)) {
      if (!best || l.nombre.length > best.nombre.length) best = l;
    }
  }
  return best;
}

function starIfImprescindible(lugar) {
  return lugar.prioridad === 'imprescindible' ? '<span class="star-badge">★</span> ' : '';
}

// ---------- DAY TABS + ITINERARIO ----------
function buildDayTabs() {
  const days = Object.keys(DATA.itinerario_familiar_recomendado);
  activeDay = days[0];
  const el = document.getElementById('dayTabs');
  el.innerHTML = '';
  days.forEach((day) => {
    const btn = document.createElement('button');
    btn.className = 'day-tab' + (day === activeDay ? ' is-active' : '');
    btn.textContent = DAY_LABELS[day] || day;
    btn.dataset.day = day;
    btn.addEventListener('click', () => {
      activeDay = day;
      [...el.children].forEach((c) => c.classList.toggle('is-active', c.dataset.day === day));
      renderItinerario();
    });
    el.appendChild(btn);
  });
}

function renderItinerario() {
  const wrap = document.getElementById('itinerarioContent');
  const dayData = DATA.itinerario_familiar_recomendado[activeDay];
  wrap.innerHTML = '';
  if (!dayData) return;

  const title = document.createElement('p');
  title.className = 'milestone-day-title';
  title.textContent = dayData.tema;
  wrap.appendChild(title);

  const list = document.createElement('ul');
  list.className = 'milestone-list';

  dayData.plan.forEach((line) => {
    const li = document.createElement('li');
    li.className = 'milestone-item';

    const timeMatch = line.match(/^(\d{2}:\d{2}(-\d{2}:\d{2})?)\s*/);
    const time = timeMatch ? timeMatch[1] : '';
    const rest = timeMatch ? line.slice(timeMatch[0].length) : line;
    const lugar = matchLugarFromPlanLine(rest);

    const marker = document.createElement('div');
    marker.className = 'milestone-marker';
    if (lugar) marker.style.setProperty('--cat-color', `var(--cat-${lugar.categoria})`);
    li.appendChild(marker);

    const timeEl = document.createElement('div');
    timeEl.className = 'milestone-time';
    timeEl.textContent = time;
    li.appendChild(timeEl);

    if (lugar) {
      const card = document.createElement('div');
      card.className = 'milestone-card';
      card.style.setProperty('--cat-color', `var(--cat-${lugar.categoria})`);
      card.innerHTML = `<h3>${starIfImprescindible(lugar)}${lugar.nombre}</h3><p>${rest}</p>`;
      card.addEventListener('click', () => openSheet(lugar));
      li.appendChild(card);
    } else {
      const p = document.createElement('p');
      p.className = 'milestone-plain';
      p.textContent = rest;
      li.appendChild(p);
    }
    list.appendChild(li);
  });

  wrap.appendChild(list);
}

// ---------- FILTROS ----------
function buildFilters(containerId, onSelect) {
  const cats = ['todas', ...new Set(DATA.lugares.map((l) => l.categoria))];
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  cats.forEach((cat) => {
    const chip = document.createElement('button');
    chip.className = 'filter-chip' + (cat === 'todas' ? ' is-active' : '');
    chip.textContent = cat === 'todas' ? 'Todas' : (CAT_LABELS[cat] || cat);
    if (cat !== 'todas') chip.style.setProperty('--cat-color', `var(--cat-${cat})`);
    chip.dataset.cat = cat;
    chip.addEventListener('click', () => {
      [...el.children].forEach((c) => c.classList.toggle('is-active', c === chip));
      onSelect(cat);
    });
    el.appendChild(chip);
  });
}

function buildCategoryFilters(containerId, onSelect) {
  buildFilters(containerId, onSelect);
}

function buildPriorityFilters(containerId, onSelect) {
  const options = ['todas', 'imprescindible', 'recomendado', 'opcional'];
  const el = document.getElementById(containerId);
  el.innerHTML = '';
  options.forEach((p) => {
    const chip = document.createElement('button');
    chip.className = 'filter-chip' + (p === 'todas' ? ' is-active' : '');
    chip.textContent = p === 'todas' ? 'Todos los niveles' : (p === 'imprescindible' ? '★ Imprescindibles' : PRIO_LABELS[p]);
    chip.dataset.p = p;
    chip.addEventListener('click', () => {
      [...el.children].forEach((c) => c.classList.toggle('is-active', c === chip));
      onSelect(p);
    });
    el.appendChild(chip);
  });
}

// ---------- MAPA ----------
function initMap() {
  leafletMap = L.map('map').setView([41.8969, 12.4784], 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  }).addTo(leafletMap);
}

function renderMap() {
  if (!leafletMap) initMap();
  mapMarkers.forEach((m) => leafletMap.removeLayer(m));
  mapMarkers = [];

  const lugares = DATA.lugares.filter(
    (l) => activeMapFilter === 'todas' || l.categoria === activeMapFilter
  );

  lugares.forEach((l) => {
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue(`--cat-${l.categoria}`).trim() || '#2f5eff';
    const ring = l.prioridad === 'imprescindible' ? '3px solid #f4a300' : '2px solid #ffffff';
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:${ring};box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    const marker = L.marker([l.coordenadas.lat, l.coordenadas.lng], { icon }).addTo(leafletMap);
    marker.bindPopup(`<h3>${starIfImprescindible(l)}${l.nombre}</h3><p>${l.descripcion_breve}</p>`);
    marker.on('click', () => openSheet(l));
    mapMarkers.push(marker);
  });
}

// ---------- TODOS LOS LUGARES ----------
function renderLugares() {
  const grid = document.getElementById('lugaresGrid');
  grid.innerHTML = '';
  const lugares = DATA.lugares.filter((l) => {
    const catOk = activeLugaresCatFilter === 'todas' || l.categoria === activeLugaresCatFilter;
    const prioOk = activeLugaresPrioFilter === 'todas' || l.prioridad === activeLugaresPrioFilter;
    return catOk && prioOk;
  });
  lugares.forEach((l) => {
    const card = document.createElement('div');
    card.className = 'place-card';
    card.style.setProperty('--cat-color', `var(--cat-${l.categoria})`);
    card.innerHTML = `
      <div class="cat-label"><span class="cat-dot"></span>${CAT_LABELS[l.categoria] || l.categoria}</div>
      <h3>${starIfImprescindible(l)}${l.nombre}</h3>
      <p>${l.descripcion_breve}</p>
    `;
    card.addEventListener('click', () => openSheet(l));
    grid.appendChild(card);
  });
  if (!lugares.length) {
    grid.innerHTML = '<p style="padding:12px;color:var(--ink-soft)">No hay lugares con estos filtros.</p>';
  }
}

// ---------- MAPAS EXTERNOS ----------
function mapsUrl(lugar) {
  const q = `${lugar.coordenadas.lat},${lugar.coordenadas.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
function directionsUrl(lugar) {
  const q = `${lugar.coordenadas.lat},${lugar.coordenadas.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}

// ---------- AUDIOGUÍA (Web Speech API) ----------
function toggleAudioguide(lugar, btn) {
  if (!('speechSynthesis' in window)) {
    btn.textContent = 'Audio no disponible en este navegador';
    return;
  }
  if (currentUtterance && speechSynthesis.speaking) {
    speechSynthesis.cancel();
    currentUtterance = null;
    btn.textContent = '🔊 Escuchar audioguía';
    btn.classList.remove('is-playing');
    return;
  }
  const utterance = new SpeechSynthesisUtterance(lugar.audioguia || lugar.descripcion_breve);
  utterance.lang = 'es-ES';
  utterance.rate = 0.98;
  utterance.onend = () => {
    btn.textContent = '🔊 Escuchar audioguía';
    btn.classList.remove('is-playing');
    currentUtterance = null;
  };
  currentUtterance = utterance;
  btn.textContent = '⏹ Detener audioguía';
  btn.classList.add('is-playing');
  speechSynthesis.speak(utterance);
}

// ---------- BOTTOM SHEET (detalle de lugar) ----------
function openSheet(lugar) {
  if (speechSynthesis.speaking) speechSynthesis.cancel();

  const content = document.getElementById('sheetContent');
  const eats = (lugar.sitios_para_comer || []).map((r) => `
    <div class="eat-item">
      <strong>${r.nombre}</strong>
      <span>${r.especialidad || r.tipo} · ${r.precio_aprox_persona || ''} · ${r.puntuacion || ''}</span>
      <span>${r.distancia_aprox || ''} · reserva: ${r.necesita_reserva}</span>
    </div>
  `).join('') || '<p>Sin recomendaciones específicas registradas.</p>';

  const photos = (lugar.spots_fotografia || []).map((p) => `
    <div class="photo-item">
      <strong>${p.nombre}</strong>
      <span>${p.mejor_hora} · ${p.duracion_recomendada}</span>
      <span>${p.por_que}</span>
    </div>
  `).join('');

  content.innerHTML = `
    <div class="cat-label" style="--cat-color: var(--cat-${lugar.categoria})"><span class="cat-dot" style="width:8px;height:8px;border-radius:50%;background:var(--cat-color);display:inline-block"></span>${CAT_LABELS[lugar.categoria] || lugar.categoria}</div>
    <h2>${lugar.nombre}</h2>
    <span class="priority-tag priority-${lugar.prioridad}">${lugar.prioridad === 'imprescindible' ? '★ ' : ''}${PRIO_LABELS[lugar.prioridad] || lugar.prioridad}</span>
    <p>${lugar.descripcion_breve}</p>

    <div class="action-row">
      <button class="action-btn primary" id="audioBtn">🔊 Escuchar audioguía</button>
    </div>
    <div class="action-row">
      <a class="action-btn" href="${mapsUrl(lugar)}" target="_blank" rel="noopener">📍 Ver en Maps</a>
      <a class="action-btn" href="${directionsUrl(lugar)}" target="_blank" rel="noopener">🧭 Cómo llegar</a>
    </div>

    <dl class="fact-grid">
      <div><dt>Horario</dt><dd>${lugar.horario || '—'}</dd></div>
      <div><dt>Precio adulto</dt><dd>${lugar.precio_adulto || '—'}</dd></div>
      <div><dt>Precio niño</dt><dd>${lugar.precio_niño || '—'}</dd></div>
      <div><dt>Reserva</dt><dd>${lugar.necesita_reserva === true ? 'Sí' : (lugar.necesita_reserva === false ? 'No' : lugar.necesita_reserva)}</dd></div>
      <div><dt>Duración</dt><dd>${lugar.tiempo_visita_recomendado || '—'}</dd></div>
      <div><dt>Mejor hora</dt><dd>${lugar.hora_visita_recomendada || lugar.mejor_momento_dia || '—'}</dd></div>
    </dl>

    <div class="sheet-section">
      <h4>Dato curioso para la niña</h4>
      <p>${lugar.dato_curioso_niños || '—'}</p>
    </div>

    <div class="sheet-section">
      <h4>Consejo práctico</h4>
      <p>${lugar.consejo_practico || '—'}</p>
    </div>

    ${photos ? `<div class="sheet-section"><h4>Spots fotográficos</h4>${photos}</div>` : ''}

    <div class="sheet-section">
      <h4>Dónde comer cerca</h4>
      ${eats}
    </div>
  `;

  document.getElementById('audioBtn').addEventListener('click', (e) => toggleAudioguide(lugar, e.currentTarget));

  document.getElementById('sheet').classList.add('is-open');
  document.getElementById('sheetBackdrop').classList.add('is-open');
}

function closeSheet() {
  if (speechSynthesis.speaking) speechSynthesis.cancel();
  document.getElementById('sheet').classList.remove('is-open');
  document.getElementById('sheetBackdrop').classList.remove('is-open');
}

// ---------- NAVEGACIÓN DE VISTAS ----------
function setupViewSwitch() {
  const buttons = document.querySelectorAll('.view-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.toggle('is-active', b === btn));
      document.querySelectorAll('.view').forEach((v) => v.classList.remove('is-active'));
      document.getElementById(`view-${btn.dataset.view}`).classList.add('is-active');
      if (btn.dataset.view === 'mapa') {
        if (!leafletMap) renderMap();
        setTimeout(() => leafletMap.invalidateSize(), 50);
      }
    });
  });
}

// ---------- INSTALAR COMO APP ----------
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function setupInstallPrompt() {
  const banner = document.getElementById('installBanner');
  const btn = document.getElementById('installBtn');
  const dismiss = document.getElementById('installDismiss');
  const text = document.getElementById('installText');

  if (isStandalone() || sessionStorage.getItem('installDismissed')) return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    banner.classList.add('is-visible');
  });

  if (isIOS()) {
    text.textContent = 'Añade esta app a tu pantalla de inicio: toca Compartir y luego "Añadir a pantalla de inicio".';
    btn.style.display = 'none';
    banner.classList.add('is-visible');
  }

  btn.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    banner.classList.remove('is-visible');
  });

  dismiss.addEventListener('click', () => {
    banner.classList.remove('is-visible');
    sessionStorage.setItem('installDismissed', '1');
  });
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  setupViewSwitch();
  setupInstallPrompt();
  document.getElementById('sheetBackdrop').addEventListener('click', closeSheet);
  loadData();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
