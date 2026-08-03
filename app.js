// app.js — Orquestador de la app.

import { buildCategoryColorMap, catVar } from './core/categoryColors.js';
import { openSheet, setupSheetDismiss } from './core/sheet.js';
import { initMap, renderMarkers, invalidateMapSize } from './core/map.js';
import { buildChips } from './core/filters.js';
import { setupInstallPrompt } from './core/install.js';
import { registerServiceWorker } from './core/update.js';
import { resolveTodayKey, findCurrentActivity } from './core/now.js';
import { isVisited, toggleVisited, visitedCount } from './core/visited.js';
import { filterByQuery, setupSearchInput } from './core/search.js';
import { renderTripInfo } from './core/info.js';
import { categoryIcon } from './core/categoryIcons.js';
import { toggleAudioguide } from './core/audioguide.js';
import { resolvePlacePhoto } from './core/unsplash.js';

// ---------- CONFIG DEL PROYECTO ----------
const CONFIG = {
  dataFile: 'data/lugares.json',
  tripFile: 'data/trip.json',
  mapCenter: [41.8969, 12.4784],
  mapZoom: 14,
  appName: 'Roma en Familia',
  catLabels: {
    monumento: 'Monumento',
    museo: 'Museo',
    plaza: 'Plaza',
    barrio: 'Barrio',
    mercado: 'Mercado',
    mirador: 'Mirador',
    parque: 'Parque',
    freetour: 'Free Tour'
  },
  unsplashAccessKey: '', // rellena con tu Access Key de https://unsplash.com/developers
  unsplashQuerySuffix: 'Rome'
};

// ---------- ESTADO ----------
let DATA = null;
let TRIP = null;
let categoryColorMap = {};
let activeDay = null;
let activeMapFilter = 'todas';
let activeCatFilter = 'todas';
let activePrioFilter = 'todas';
let searchQuery = '';

const DAY_LABELS = {
  viernes: 'Vie 9',
  sábado: 'Sáb 10',
  domingo: 'Dom 11',
  lunes: 'Lun 12'
};

async function loadData() {
  const res = await fetch(CONFIG.dataFile);
  DATA = await res.json();
  categoryColorMap = buildCategoryColorMap(DATA.lugares);

  try {
    const tripRes = await fetch(CONFIG.tripFile);
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
  if (todayKey && DATA.itinerario_familiar_recomendado[todayKey]) {
    selectDay(todayKey);
  }
  updateNowBanner();
  setInterval(updateNowBanner, 60000);
}

function updateNowBanner() {
  const banner = document.getElementById('nowBanner');
  if (!banner || !TRIP || !TRIP.fechas) return;

  const todayKey = resolveTodayKey(TRIP.fechas);
  const dayData = todayKey && DATA.itinerario_familiar_recomendado[todayKey];
  if (!dayData) {
    banner.classList.remove('is-visible');
    return;
  }

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
    btn.textContent = DAY_LABELS[day] || day;
    btn.dataset.day = day;
    btn.addEventListener('click', () => selectDay(day));
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
      card.className = 'milestone-card' + (isVisited(lugar.id) ? ' is-visited' : '');
      card.style.setProperty('--cat-color', catVar(categoryColorMap, lugar.categoria));
      card.innerHTML = `<h3>${starIf(lugar)}${lugar.nombre}</h3><p>${rest}</p>`;
      card.addEventListener('click', () => openLugarSheet(lugar));
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
    { onSelect: (v) => { activeCatFilter = v; renderLugares(); }, colorFn: (v) => v !== 'todas' ? catVar(categoryColorMap, v) : null }
  );

  const hasPriority = DATA.lugares.some((l) => l.prioridad);
  if (hasPriority) {
    buildChips('prioridadFilters', [
      { value: 'todas', label: 'Todos los niveles' },
      { value: 'imprescindible', label: '★ Imprescindibles' },
      { value: 'recomendado', label: 'Recomendado' },
      { value: 'opcional', label: 'Opcional' }
    ], { onSelect: (v) => { activePrioFilter = v; renderLugares(); } });
  }

  setupSearchInput('searchInput', (value) => { searchQuery = value; renderLugares(); });
}

// ---------- MAPA ----------
function renderMap() {
  if (!document.querySelector('#map .leaflet-container')) initMap(CONFIG.mapCenter, CONFIG.mapZoom);
  const lugares = DATA.lugares.filter((l) => activeMapFilter === 'todas' || l.categoria === activeMapFilter);
  renderMarkers(lugares, { categoryColorMap, onClick: (l) => openLugarSheet(l) });
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
    card.className = 'place-card' + (isVisited(l.id) ? ' is-visited' : '');
    card.style.setProperty('--cat-color', catVar(categoryColorMap, l.categoria));

    const hasPhotos = (l.spots_fotografia || []).length > 0;
    const hasFood = (l.sitios_para_comer || []).length > 0;
    const visited = isVisited(l.id);

    card.innerHTML = `
      <div class="place-card-header" data-action="info" ${l.imagen ? `style="background-image:url('${l.imagen}')"` : ''}>
        ${l.imagen ? '<span class="place-card-header-scrim"></span>' : ''}
        ${l.prioridad === 'imprescindible' ? '<span class="place-card-priority">★ Imprescindible</span>' : ''}
        ${visited ? '<span class="place-card-visited-flag">✓</span>' : ''}
        ${l.imagen ? '' : `<span class="place-card-watermark">${categoryIcon(l.categoria)}</span>`}
      </div>
      <div class="place-card-body" data-action="info">
        <div class="cat-label"><span class="cat-dot"></span>${CONFIG.catLabels[l.categoria] || l.categoria}</div>
        <h3>${l.nombre}</h3>
        <p>${l.descripcion_breve || ''}</p>
      </div>
      <div class="place-card-actions">
        <button class="action-audio" data-action="audio" title="Audioguía">🔊</button>
        <button data-action="photos" title="Fotos" ${hasPhotos ? '' : 'disabled style="opacity:.3"'}>📷</button>
        <button data-action="food" title="Comida" ${hasFood ? '' : 'disabled style="opacity:.3"'}>🍴</button>
        <button data-action="price" title="Precio">€</button>
        <button data-action="info" title="Info">ℹ️</button>
        <button class="action-visited${visited ? ' is-visited' : ''}" data-action="visited" title="Visitado">✓</button>
      </div>
    `;

    card.querySelectorAll('[data-action]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = el.dataset.action;
        if (action === 'audio') {
          toggleAudioguide(l.audioguia || l.descripcion_breve, el);
        } else if (action === 'photos') {
          openLugarSheet(l, 'sheetPhotos');
        } else if (action === 'food') {
          openLugarSheet(l, 'sheetEats');
        } else if (action === 'price') {
          openLugarSheet(l, 'sheetFacts');
        } else if (action === 'info') {
          openLugarSheet(l);
        } else if (action === 'visited') {
          const nowVisited = toggleVisited(l.id);
          el.classList.toggle('is-visited', nowVisited);
          card.classList.toggle('is-visited', nowVisited);
          updateProgressBadge();
        }
      });
    });

    grid.appendChild(card);

    if (!l.imagen && CONFIG.unsplashAccessKey) {
      const header = card.querySelector('.place-card-header');
      const query = `${l.nombre} ${CONFIG.unsplashQuerySuffix}`.trim();
      resolvePlacePhoto(query, CONFIG.unsplashAccessKey).then((photo) => {
        if (!photo || !header.isConnected) return;
        header.style.backgroundImage = `url('${photo.url}')`;
        header.querySelector('.place-card-watermark')?.remove();
        if (!header.querySelector('.place-card-header-scrim')) {
          const scrim = document.createElement('span');
          scrim.className = 'place-card-header-scrim';
          header.prepend(scrim);
        }
        const credit = document.createElement('a');
        credit.className = 'place-card-credit';
        credit.href = photo.photoUrl;
        credit.target = '_blank';
        credit.rel = 'noopener';
        credit.textContent = `📷 ${photo.author}`;
        credit.addEventListener('click', (e) => e.stopPropagation());
        header.appendChild(credit);
      });
    }
  });
  if (!lugares.length) {
    grid.innerHTML = '<p style="padding:12px;color:var(--ink-soft)">No hay lugares con estos filtros.</p>';
  }
  updateProgressBadge();
}

function updateProgressBadge() {
  const badge = document.getElementById('progressBadge');
  if (!badge) return;
  const { done, total } = visitedCount(DATA.lugares.map((l) => l.id));
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
    onVisitedChange: () => {
      renderLugares();
      renderItinerario();
      if (document.getElementById('view-mapa').classList.contains('is-active')) renderMap();
    }
  });
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
  if (window.PullToRefresh) {
    new PullToRefresh({ onRefresh: () => window.location.reload() }).init();
  }
  registerServiceWorker();
  loadData();
});
