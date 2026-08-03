// app.js — Orquestador de la app. La parte de "itinerario" es específica
// de proyectos tipo viaje/ruta; si tu proyecto no tiene itinerario día a día,
// puedes quitar esa vista y dejar solo Mapa + Todos.

import { buildCategoryColorMap, catVar } from './core/categoryColors.js';
import { openSheet, setupSheetDismiss } from './core/sheet.js';
import { initMap, renderMarkers, invalidateMapSize } from './core/map.js';
import { buildChips } from './core/filters.js';
import { setupInstallPrompt } from './core/install.js';
import { registerServiceWorker } from './core/update.js';

// ---------- CONFIG DEL PROYECTO ----------
// Ajusta esto (o cárgalo desde config.json) para cada proyecto nuevo.
const CONFIG = {
  dataFile: 'data/lugares.json',
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
  }
};

// ---------- ESTADO ----------
let DATA = null;
let categoryColorMap = {};
let activeDay = null;
let activeMapFilter = 'todas';
let activeCatFilter = 'todas';
let activePrioFilter = 'todas';

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

  if (DATA.itinerario_familiar_recomendado) buildDayTabs();
  buildFilterRows();
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

function starIf(lugar) {
  return lugar.prioridad === 'imprescindible' ? '<span class="star-badge">★</span> ' : '';
}

// ---------- ITINERARIO ----------
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
      card.className = 'milestone-card';
      card.style.setProperty('--cat-color', catVar(categoryColorMap, lugar.categoria));
      card.innerHTML = `<h3>${starIf(lugar)}${lugar.nombre}</h3><p>${rest}</p>`;
      card.addEventListener('click', () => openSheet(lugar, { categoryColorMap, catLabels: CONFIG.catLabels }));
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
}

// ---------- MAPA ----------
function renderMap() {
  if (!getMapInstance()) initMap(CONFIG.mapCenter, CONFIG.mapZoom);
  const lugares = DATA.lugares.filter((l) => activeMapFilter === 'todas' || l.categoria === activeMapFilter);
  renderMarkers(lugares, {
    categoryColorMap,
    onClick: (l) => openSheet(l, { categoryColorMap, catLabels: CONFIG.catLabels })
  });
}
function getMapInstance() {
  return document.querySelector('#map .leaflet-container') ? true : false;
}

// ---------- GRID "TODOS" ----------
function renderLugares() {
  const grid = document.getElementById('lugaresGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const lugares = DATA.lugares.filter((l) => {
    const catOk = activeCatFilter === 'todas' || l.categoria === activeCatFilter;
    const prioOk = activePrioFilter === 'todas' || l.prioridad === activePrioFilter;
    return catOk && prioOk;
  });
  lugares.forEach((l) => {
    const card = document.createElement('div');
    card.className = 'place-card';
    card.style.setProperty('--cat-color', catVar(categoryColorMap, l.categoria));
    card.innerHTML = `
      <div class="cat-label"><span class="cat-dot"></span>${CONFIG.catLabels[l.categoria] || l.categoria}</div>
      <h3>${starIf(l)}${l.nombre}</h3>
      <p>${l.descripcion_breve || ''}</p>
    `;
    card.addEventListener('click', () => openSheet(l, { categoryColorMap, catLabels: CONFIG.catLabels }));
    grid.appendChild(card);
  });
  if (!lugares.length) {
    grid.innerHTML = '<p style="padding:12px;color:var(--ink-soft)">No hay lugares con estos filtros.</p>';
  }
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
