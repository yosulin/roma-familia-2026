// app.js — Orquestador de la app multi-viaje.
// "Mis Viajes" es la landing (core/trips.js); al elegir uno se cargan
// data/trips/<id>/lugares.json y trip.json y se muestran las vistas
// Todos/Itinerario/Mapa/Info ya conocidas, ahora con tripId como
// namespace para el estado de "visitado".

import { buildCategoryColorMap, catVar } from './core/categoryColors.js';
import { openSheet, setupSheetDismiss } from './core/sheet.js';
import { initMap, renderMarkers, invalidateMapSize, resetMap } from './core/map.js';
import { buildChips } from './core/filters.js';
import { setupInstallPrompt } from './core/install.js';
import { registerServiceWorker } from './core/update.js';
import { resolveTodayKey, findCurrentActivity } from './core/now.js';
import { isVisited, toggleVisited, visitedCount } from './core/visited.js';
import { filterByQuery, setupSearchInput } from './core/search.js';
import { renderTripInfo } from './core/info.js';
import { categoryIcon } from './core/categoryIcons.js';
import { toggleAudioguide } from './core/audioguide.js';
import { directionsUrl } from './core/maps.js';
import { loadTripsIndex, renderTripsList, tripStatus } from './core/trips.js';
import { vibrate, HAPTIC } from './core/haptics.js';

// ---------- CONFIG DEL PROYECTO (compartida entre todos los viajes) ----------
const CONFIG = {
  tripsIndexFile: 'data/trips.json',
  appName: 'Mis Viajes',
  catLabels: {
    monumento: 'Monumento',
    museo: 'Museo',
    plaza: 'Plaza',
    barrio: 'Barrio',
    mercado: 'Mercado',
    mirador: 'Mirador',
    parque: 'Parque',
    freetour: 'Free Tour'
  }
};

// ---------- ESTADO ----------
let ALL_TRIPS = [];
let CURRENT_TRIP = null; // objeto del índice: {id, nombre, destino, fecha_inicio, fecha_fin, carpeta, ...}
let DATA = null;
let TRIP = null; // contenido de data/trips/<id>/trip.json
let categoryColorMap = {};
let activeDay = null;
let activeMapFilter = 'todas';
let activeCatFilter = 'todas';
let activePrioFilter = 'todas';
let searchQuery = '';

function dayLabel(dayKey) {
  const iso = TRIP && TRIP.fechas && TRIP.fechas[dayKey];
  if (!iso) return dayKey;
  const d = new Date(iso + 'T00:00:00');
  const label = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1).replace('.', '');
}

// ---------- MIS VIAJES (landing) ----------
async function loadTripsScreen() {
  ALL_TRIPS = await loadTripsIndex(CONFIG.tripsIndexFile);
  renderTripsList('tripsGrid', ALL_TRIPS, {
    onSelect: (trip) => selectTrip(trip),
    onCreateHint: () => {
      alert('Esta app es estática (GitHub Pages, sin servidor): no puede crear viajes por sí sola.\n\nPide el viaje nuevo en el chat con Claude — se añade a data/trips.json y aparecerá aquí.');
    }
  });

  const params = new URLSearchParams(location.search);
  const tripId = params.get('trip');
  if (tripId) {
    const trip = ALL_TRIPS.find((t) => t.id === tripId);
    if (trip) selectTrip(trip, { pushState: false });
  }
}

async function selectTrip(trip, { pushState = true } = {}) {
  CURRENT_TRIP = trip;
  resetTripState();
  resetMap();

  document.getElementById('view-trips').classList.remove('is-active');
  document.getElementById('tripDetail').hidden = false;
  document.getElementById('backToTrips').hidden = false;

  document.getElementById('headerEyebrow').textContent = trip.destino || 'Viaje';
  document.getElementById('headerTitle').textContent = trip.nombre.toUpperCase();
  document.getElementById('headerSubtitle').textContent = formatTripDates(trip);

  if (pushState) {
    const url = new URL(location.href);
    url.searchParams.set('trip', trip.id);
    history.pushState({ tripId: trip.id }, '', url);
  }

  await loadTripData(trip);
}

function backToTrips() {
  vibrate(HAPTIC.dismiss);
  if (window.speechSynthesis) speechSynthesis.cancel();
  CURRENT_TRIP = null;
  document.getElementById('tripDetail').hidden = true;
  document.getElementById('backToTrips').hidden = true;
  document.getElementById('view-trips').classList.add('is-active');

  const url = new URL(location.href);
  url.searchParams.delete('trip');
  history.pushState({}, '', url);

  // refresca las tarjetas por si cambió algo (cuenta atrás, visitados...)
  renderTripsList('tripsGrid', ALL_TRIPS, {
    onSelect: (trip) => selectTrip(trip),
    onCreateHint: () => alert('Pide el viaje nuevo en el chat con Claude.')
  });
}

function resetTripState() {
  DATA = null;
  TRIP = null;
  categoryColorMap = {};
  activeDay = null;
  activeMapFilter = 'todas';
  activeCatFilter = 'todas';
  activePrioFilter = 'todas';
  searchQuery = '';
  const search = document.getElementById('searchInput');
  if (search) search.value = '';
  const accordion = document.getElementById('filterAccordion');
  if (accordion) accordion.classList.remove('is-open');
  const filterToggle = document.getElementById('filterToggle');
  if (filterToggle) filterToggle.setAttribute('aria-expanded', 'false');
  document.querySelectorAll('.view-btn').forEach((b, i) => b.classList.toggle('is-active', i === 0));
  document.querySelectorAll('.view').forEach((v) => v.classList.remove('is-active'));
  document.getElementById('view-lugares').classList.add('is-active');
  document.getElementById('nowBanner').classList.remove('is-visible');
}

function formatTripDates(trip) {
  if (!trip.fecha_inicio) return '';
  const opts = { day: 'numeric', month: 'short', year: 'numeric' };
  const s = new Date(trip.fecha_inicio + 'T00:00:00').toLocaleDateString('es-ES', opts);
  if (!trip.fecha_fin || trip.fecha_fin === trip.fecha_inicio) return s.toUpperCase();
  const e = new Date(trip.fecha_fin + 'T00:00:00').toLocaleDateString('es-ES', opts);
  return `${s} — ${e}`.toUpperCase();
}

// ---------- CARGA DE DATOS DEL VIAJE SELECCIONADO ----------
async function loadTripData(trip) {
  const carpeta = trip.carpeta || `data/trips/${trip.id}`;
  const res = await fetch(`${carpeta}/lugares.json`);
  DATA = await res.json();
  categoryColorMap = buildCategoryColorMap(DATA.lugares);

  try {
    const tripRes = await fetch(`${carpeta}/trip.json`);
    if (tripRes.ok) TRIP = await tripRes.json();
  } catch { /* trip.json es opcional */ }

  if (DATA.itinerario_familiar_recomendado) buildDayTabs();
  buildFilterRows();
  renderItinerario();
  renderLugares();
  renderInfo();
  setupNowBanner();
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

function starIf(lugar) {
  return lugar.prioridad === 'imprescindible' ? '<span class="star-badge">★</span> ' : '';
}

// ---------- MODO "AHORA" ----------
function setupNowBanner() {
  if (!TRIP || !TRIP.fechas || !DATA.itinerario_familiar_recomendado) return;
  const todayKey = resolveTodayKey(TRIP.fechas);
  if (todayKey && DATA.itinerario_familiar_recomendado[todayKey]) selectDay(todayKey);
  updateNowBanner();
  setInterval(() => { if (CURRENT_TRIP) updateNowBanner(); }, 60000);
}

function updateNowBanner() {
  const banner = document.getElementById('nowBanner');
  if (!banner || !TRIP || !TRIP.fechas) return;
  const todayKey = resolveTodayKey(TRIP.fechas);
  const dayData = todayKey && DATA.itinerario_familiar_recomendado[todayKey];
  if (!dayData) { banner.classList.remove('is-visible'); return; }

  const result = findCurrentActivity(dayData.plan);
  banner.classList.remove('state-ahora', 'state-siguiente');
  if (result.estado === 'ahora') {
    banner.classList.add('is-visible', 'state-ahora');
    banner.innerHTML = `<span class="now-tag">Ahora</span><strong>${result.linea}</strong>`;
  } else if (result.estado === 'siguiente') {
    banner.classList.add('is-visible', 'state-siguiente');
    banner.innerHTML = `<span class="now-tag">Siguiente</span><strong>${result.linea}</strong>`;
  } else {
    banner.classList.remove('is-visible');
  }
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
    btn.textContent = dayLabel(day);
    btn.dataset.day = day;
    btn.addEventListener('click', () => { vibrate(HAPTIC.tap); selectDay(day); });
    el.appendChild(btn);
  });
}

function selectDay(day) {
  activeDay = day;
  document.querySelectorAll('.day-tab').forEach((c) => c.classList.toggle('is-active', c.dataset.day === day));
  renderItinerario();
}

function renderItinerario() {
  const wrap = document.getElementById('itinerarioContent');
  if (!wrap || !DATA.itinerario_familiar_recomendado) return;
  const dayData = DATA.itinerario_familiar_recomendado[activeDay];
  wrap.innerHTML = '';
  if (!dayData) return;

  const title = document.createElement('p');
  title.className = 'milestone-day-title';
  title.textContent = dayData.tema || '';
  wrap.appendChild(title);

  const list = document.createElement('ul');
  list.className = 'milestone-list';

  (dayData.plan || []).forEach((line) => {
    const li = document.createElement('li');
    li.className = 'milestone-item';

    const timeMatch = line.match(/^(\d{2}:\d{2}(-\d{2}:\d{2})?)\s*/);
    const time = timeMatch ? timeMatch[1] : '';
    const rest = timeMatch ? line.slice(timeMatch[0].length) : line;
    const lugar = matchLugarFromPlanLine(rest);

    const marker = document.createElement('div');
    marker.className = 'milestone-marker';
    if (lugar) marker.style.setProperty('--cat-color', catVar(categoryColorMap, lugar.categoria));
    li.appendChild(marker);

    const timeEl = document.createElement('div');
    timeEl.className = 'milestone-time';
    timeEl.textContent = time;
    li.appendChild(timeEl);

    if (lugar) {
      const card = document.createElement('div');
      card.className = 'milestone-card' + (isVisited(lugar.id, CURRENT_TRIP?.id) ? ' is-visited' : '');
      card.style.setProperty('--cat-color', catVar(categoryColorMap, lugar.categoria));
      card.innerHTML = `<h3>${starIf(lugar)}${lugar.nombre}</h3><p>${rest}</p>`;
      card.addEventListener('click', () => { vibrate(HAPTIC.tap); openLugarSheet(lugar); });
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
function buildFilterRows() {
  const categorias = [...new Set(DATA.lugares.map((l) => l.categoria))];

  buildChips('mapFilters',
    [{ value: 'todas', label: 'Todas' }, ...categorias.map((c) => ({ value: c, label: CONFIG.catLabels[c] || c }))],
    { onSelect: (v) => { activeMapFilter = v; renderMap(); }, colorFn: (v) => v !== 'todas' ? catVar(categoryColorMap, v) : null }
  );

  buildChips('lugaresFilters',
    [{ value: 'todas', label: 'Todas' }, ...categorias.map((c) => ({ value: c, label: CONFIG.catLabels[c] || c }))],
    { onSelect: (v) => { activeCatFilter = v; renderLugares(); updateFilterBadge(); }, colorFn: (v) => v !== 'todas' ? catVar(categoryColorMap, v) : null }
  );

  const hasPriority = DATA.lugares.some((l) => l.prioridad);
  const priorityRow = document.getElementById('priorityFilterRow');
  const starBtn = document.getElementById('starToggle');
  if (hasPriority) {
    priorityRow.hidden = false;
    starBtn.classList.remove('is-active');
    starBtn.onclick = () => {
      vibrate(HAPTIC.select);
      activePrioFilter = activePrioFilter === 'imprescindible' ? 'todas' : 'imprescindible';
      starBtn.classList.toggle('is-active', activePrioFilter === 'imprescindible');
      renderLugares();
      updateFilterBadge();
    };
  } else {
    priorityRow.hidden = true;
  }

  setupFilterAccordion();
  updateFilterBadge();
  setupSearchInput('searchInput', (value) => { searchQuery = value; renderLugares(); });
}

function setupFilterAccordion() {
  const toggle = document.getElementById('filterToggle');
  const accordion = document.getElementById('filterAccordion');
  toggle.onclick = () => {
    vibrate(HAPTIC.tap);
    const isOpen = accordion.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  };
}

function updateFilterBadge() {
  const badge = document.getElementById('filterBadge');
  if (!badge) return;
  const count = (activeCatFilter !== 'todas' ? 1 : 0) + (activePrioFilter === 'imprescindible' ? 1 : 0);
  badge.hidden = count === 0;
  badge.textContent = String(count);
}

// ---------- MAPA ----------
function renderMap() {
  if (!document.querySelector('#map .leaflet-container')) {
    const center = (TRIP && TRIP.mapa && TRIP.mapa.center) || [20, 0];
    const zoom = (TRIP && TRIP.mapa && TRIP.mapa.zoom) || (TRIP && TRIP.mapa ? 13 : 2);
    initMap(center, zoom);
  }
  const lugares = DATA.lugares.filter((l) => activeMapFilter === 'todas' || l.categoria === activeMapFilter);
  renderMarkers(lugares, { categoryColorMap, onClick: (l) => openLugarSheet(l) });
}

function shortClause(text, maxLen = 30) {
  if (!text) return '';
  const firstClause = text.split(/[;,.]|(?:\s+más\s+)/i)[0].trim();
  if (firstClause.length <= maxLen) return firstClause;
  return firstClause.slice(0, maxLen).trim() + '…';
}

// ---------- GRID "TODOS" ----------
function renderLugares() {
  const grid = document.getElementById('lugaresGrid');
  if (!grid) return;
  grid.innerHTML = '';

  let lugares = DATA.lugares.filter((l) => {
    const catOk = activeCatFilter === 'todas' || l.categoria === activeCatFilter;
    const prioOk = activePrioFilter === 'todas' || l.prioridad === activePrioFilter;
    return catOk && prioOk;
  });
  lugares = filterByQuery(lugares, searchQuery);

  lugares.forEach((l) => {
    const card = document.createElement('div');
    const visited = isVisited(l.id, CURRENT_TRIP?.id);
    card.className = 'place-card' + (visited ? ' is-visited' : '');
    card.style.setProperty('--cat-color', catVar(categoryColorMap, l.categoria));

    const meta = [CONFIG.catLabels[l.categoria] || l.categoria, shortClause(l.precio_adulto), shortClause(l.tiempo_visita_recomendado, 20)]
      .filter(Boolean).join(' · ');

    card.innerHTML = `
      <div class="place-card-row" data-action="info">
        <div class="place-thumb" ${l.imagen ? `style="background-image:url('${l.imagen}')"` : ''}>
          ${l.imagen ? '' : `<span class="place-thumb-icon">${categoryIcon(l.categoria)}</span>`}
          ${visited ? '<span class="place-thumb-check">✓</span>' : ''}
        </div>
        <div class="place-card-main">
          <div class="place-card-toprow">
            <h3>${l.nombre}</h3>
            ${l.prioridad === 'imprescindible' ? '<span class="star-badge">★</span>' : ''}
          </div>
          <p class="place-card-meta">${meta}</p>
          <p class="place-card-desc">${l.descripcion_breve || ''}</p>
        </div>
      </div>
      <div class="place-card-pillrow">
        <button class="pill-btn action-audio" data-action="audio">🔊 Audio</button>
        <button class="pill-btn" data-action="directions">🧭 Llegar</button>
        <button class="pill-btn action-visited${visited ? ' is-visited' : ''}" data-action="visited">${visited ? '✓ Visitado' : '☐ Visitado'}</button>
      </div>
    `;

    card.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = el.dataset.action;
        if (action === 'audio') {
          vibrate(HAPTIC.tap);
          toggleAudioguide(l.audioguia || l.descripcion_breve, el);
        } else if (action === 'directions') {
          vibrate(HAPTIC.tap);
          if (l.coordenadas) window.open(directionsUrl(l), '_blank', 'noopener');
        } else if (action === 'visited') {
          const nowVisited = toggleVisited(l.id, CURRENT_TRIP?.id);
          vibrate(nowVisited ? HAPTIC.toggleOn : HAPTIC.toggleOff);
          el.classList.toggle('is-visited', nowVisited);
          el.textContent = nowVisited ? '✓ Visitado' : '☐ Visitado';
          card.classList.toggle('is-visited', nowVisited);
          updateProgressBadge();
        } else if (action === 'info') {
          vibrate(HAPTIC.tap);
          openLugarSheet(l);
        }
      });
    });

    grid.appendChild(card);
  });
  if (!lugares.length) {
    grid.innerHTML = '<p style="padding:12px;color:var(--ink-soft)">No hay lugares con estos filtros.</p>';
  }
  updateProgressBadge();
}

function updateProgressBadge() {
  const badge = document.getElementById('progressBadge');
  if (!badge) return;
  const { done, total } = visitedCount(DATA.lugares.map((l) => l.id), CURRENT_TRIP?.id);
  badge.textContent = total ? `${done}/${total} visitados` : '';
}

// ---------- INFO ----------
function renderInfo() {
  renderTripInfo('infoContent', TRIP);
}

// ---------- SHEET ----------
function openLugarSheet(lugar, scrollToId) {
  openSheet(lugar, {
    categoryColorMap,
    catLabels: CONFIG.catLabels,
    scrollToId,
    tripId: CURRENT_TRIP?.id,
    onVisitedChange: () => {
      renderLugares();
      renderItinerario();
      if (document.getElementById('view-mapa').classList.contains('is-active')) renderMap();
    }
  });
}

// ---------- NAVEGACIÓN DE VISTAS (dentro de un viaje) ----------
function setupViewSwitch() {
  const buttons = document.querySelectorAll('.view-btn');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      vibrate(HAPTIC.tap);
      buttons.forEach((b) => b.classList.toggle('is-active', b === btn));
      document.querySelectorAll('.view').forEach((v) => v.classList.remove('is-active'));
      document.getElementById(`view-${btn.dataset.view}`).classList.add('is-active');
      if (btn.dataset.view === 'mapa') {
        renderMap();
        invalidateMapSize();
      }
    });
  });
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', () => {
  setupViewSwitch();
  setupSheetDismiss();
  setupInstallPrompt(CONFIG.appName);
  document.getElementById('backToTrips').addEventListener('click', backToTrips);
  window.addEventListener('popstate', () => {
    const params = new URLSearchParams(location.search);
    const tripId = params.get('trip');
    if (!tripId && CURRENT_TRIP) backToTrips();
  });

  if (window.PullToRefresh) {
    new PullToRefresh({ onRefresh: () => window.location.reload() }).init();
  }
  registerServiceWorker();
  loadTripsScreen();
});
