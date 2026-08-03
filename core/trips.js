// core/trips.js
// Índice de viajes (data/trips.json) + cálculo de cuenta atrás / estado.
// Cada viaje referencia su propia carpeta de datos: data/trips/<id>/lugares.json
// y data/trips/<id>/trip.json — el resto de módulos (map/sheet/itinerario)
// no cambian, solo apuntan a rutas distintas según el viaje activo.

export async function loadTripsIndex(path = 'data/trips.json') {
  const res = await fetch(path);
  if (!res.ok) return [];
  const data = await res.json();
  return data.viajes || [];
}

function parseDate(d) {
  return d ? new Date(d + 'T00:00:00') : null;
}

/**
 * @returns {{estado:'proximo'|'en_curso'|'pasado'|'sin_fecha', dias:number|null, texto:string}}
 */
export function tripStatus(trip) {
  const inicio = parseDate(trip.fecha_inicio);
  const fin = parseDate(trip.fecha_fin || trip.fecha_inicio);
  if (!inicio) return { estado: 'sin_fecha', dias: null, texto: 'Sin fechas' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const msDay = 1000 * 60 * 60 * 24;

  if (today < inicio) {
    const dias = Math.round((inicio - today) / msDay);
    return { estado: 'proximo', dias, texto: dias === 0 ? 'Empieza hoy' : `Empieza en ${dias} día${dias === 1 ? '' : 's'}` };
  }
  if (today >= inicio && today <= fin) {
    const diaActual = Math.round((today - inicio) / msDay) + 1;
    const totalDias = Math.round((fin - inicio) / msDay) + 1;
    return { estado: 'en_curso', dias: diaActual, texto: `En curso · día ${diaActual}/${totalDias}` };
  }
  const dias = Math.round((today - fin) / msDay);
  return { estado: 'pasado', dias, texto: `Hace ${dias} día${dias === 1 ? '' : 's'}` };
}

export function renderTripsList(containerId, trips, { onSelect, onCreateHint } = {}) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';

  trips.forEach((trip) => {
    const status = tripStatus(trip);
    const card = document.createElement('div');
    card.className = `trip-card status-${status.estado}`;
    card.style.backgroundImage = trip.portada ? `url('${trip.portada}')` : '';
    card.innerHTML = `
      <span class="trip-card-scrim"></span>
      <span class="trip-card-status">${status.texto}</span>
      <div class="trip-card-body">
        <h2>${trip.nombre}</h2>
        <p>${trip.destino || ''}</p>
        ${trip.fecha_inicio ? `<p class="trip-card-dates">${formatRange(trip.fecha_inicio, trip.fecha_fin)}</p>` : ''}
      </div>
    `;
    card.addEventListener('click', () => onSelect && onSelect(trip));
    el.appendChild(card);
  });

  const createTile = document.createElement('div');
  createTile.className = 'trip-card trip-card-create';
  createTile.innerHTML = `
    <span class="trip-card-create-icon">+</span>
    <span>Nuevo viaje</span>
    <small>Pídemelo en el chat — esta app es estática, no puede crear viajes por sí sola</small>
  `;
  createTile.addEventListener('click', () => onCreateHint && onCreateHint());
  el.appendChild(createTile);
}

function formatRange(start, end) {
  const opts = { day: 'numeric', month: 'short' };
  const s = parseDate(start).toLocaleDateString('es-ES', opts);
  if (!end || end === start) return s;
  const e = parseDate(end).toLocaleDateString('es-ES', opts);
  return `${s} — ${e}`;
}
