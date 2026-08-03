// ---------- ESTADO ----------
let DATA = null;
let activeDay = null;
let activeMapFilter = 'todas';
let activeLugaresFilter = 'todas';
let leafletMap = null;
let mapMarkers = [];

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

// ---------- CARGA DE DATOS ----------
async function loadData() {
  const res = await fetch('data/lugares.json');
  DATA = await res.json();
  buildDayTabs();
  buildFilters('mapFilters', (cat) => { activeMapFilter = cat; renderMap(); });
  buildFilters('lugaresFilters', (cat) => { activeLugaresFilter = cat; renderLugares(); });
  renderItinerario();
  renderLugares();
}

function findLugar(id) {
  return DATA.lugares.find((l) => l.id === id);
}

// slugify a place name to try to match it against itinerario plan strings
function matchLugarFromPlanLine(line) {
  const lower = line.toLowerCase();
  let best = null;
  for (const l of DATA.lugares) {
    if (lower.includes(l.nombre.toLowerCase().split(' y ')[0].split(' (')[0].toLowerCase())) {
      if (!best || l.nombre.length > best.nombre.length) best = l;
    }
  }
  return best;
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
      card.innerHTML = `<h3>${lugar.nombre}</h3><p>${rest}</p>`;
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
      .getPropertyValue(`--cat-${l.categoria}`).trim() || '#8c2f1b';
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:16px;height:16px;border-radius:3px;background:${color};border:2px solid #2b211a;"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    const marker = L.marker([l.coordenadas.lat, l.coordenadas.lng], { icon }).addTo(leafletMap);
    marker.bindPopup(`<h3>${l.nombre}</h3><p>${l.descripcion_breve}</p>`);
    marker.on('click', () => openSheet(l));
    mapMarkers.push(marker);
  });
}

// ---------- TODOS LOS LUGARES ----------
function renderLugares() {
  const grid = document.getElementById('lugaresGrid');
  grid.innerHTML = '';
  const lugares = DATA.lugares.filter(
    (l) => activeLugaresFilter === 'todas' || l.categoria === activeLugaresFilter
  );
  lugares.forEach((l) => {
    const card = document.createElement('div');
    card.className = 'place-card';
    card.style.setProperty('--cat-color', `var(--cat-${l.categoria})`);
    card.innerHTML = `
      <div class="cat-label">${CAT_LABELS[l.categoria] || l.categoria}</div>
      <h3>${l.nombre}</h3>
      <p>${l.descripcion_breve}</p>
    `;
    card.addEventListener('click', () => openSheet(l));
    grid.appendChild(card);
  });
}

// ---------- BOTTOM SHEET (detalle de lugar) ----------
function openSheet(lugar) {
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
    <div class="cat-label" style="--cat-color: var(--cat-${lugar.categoria})">${CAT_LABELS[lugar.categoria] || lugar.categoria}</div>
    <h2>${lugar.nombre}</h2>
    <p>${lugar.descripcion_breve}</p>

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

  document.getElementById('sheet').classList.add('is-open');
  document.getElementById('sheetBackdrop').classList.add('is-open');
}

function closeSheet() {
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

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  setupViewSwitch();
  document.getElementById('sheetBackdrop').addEventListener('click', closeSheet);
  loadData();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
