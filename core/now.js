// core/now.js
// Determina qué día del viaje corresponde a "hoy" y qué actividad toca
// ahora / a continuación, comparando la hora real del dispositivo con las
// horas del itinerario. Requiere `fechas` en trip.json: { diaKey: 'YYYY-MM-DD' }

export function resolveTodayKey(fechas) {
  if (!fechas) return null;
  const todayISO = new Date().toISOString().slice(0, 10);
  const entries = Object.entries(fechas).sort((a, b) => a[1].localeCompare(b[1]));
  if (!entries.length) return null;

  const exact = entries.find(([, date]) => date === todayISO);
  if (exact) return exact[0];

  if (todayISO < entries[0][1]) return entries[0][0]; // antes del viaje → primer día
  if (todayISO > entries[entries.length - 1][1]) return null; // viaje ya terminado
  return null; // entre días del viaje pero sin fecha exacta (no debería pasar con fechas consecutivas)
}

function parseTimeRange(line) {
  const m = line.match(/^(\d{2}):(\d{2})(?:-(\d{2}):(\d{2}))?/);
  if (!m) return null;
  const start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const end = m[3] ? parseInt(m[3], 10) * 60 + parseInt(m[4], 10) : start + 60;
  return { start, end, label: line };
}

// Devuelve { estado: 'ahora'|'siguiente'|'fuera', texto, linea }
export function findCurrentActivity(planLines, now = new Date()) {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const parsed = planLines.map(parseTimeRange).filter(Boolean);
  if (!parsed.length) return { estado: 'fuera' };

  const current = parsed.find((p) => nowMin >= p.start && nowMin < p.end);
  if (current) return { estado: 'ahora', linea: current.label };

  const next = parsed.find((p) => p.start > nowMin);
  if (next) return { estado: 'siguiente', linea: next.label };

  return { estado: 'fuera' };
}
