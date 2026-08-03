# Roma en Familia

PWA para el viaje familiar a Roma (9–12 octubre 2026): mapa, itinerario día a
día, gastronomía, spots fotográficos y audioguía por lugar.

Construida sobre [yosulin/pwa-template](https://github.com/yosulin/pwa-template)
(la base común para mis proyectos de este tipo — a su vez con carcasa basada en
[jsundram/pwa-starter](https://github.com/jsundram/pwa-starter)).

## Desarrollo local

```
python3 -m http.server 8000
```

## Estructura

Ver [pwa-template](https://github.com/yosulin/pwa-template) para la
documentación de `core/` y `data/SCHEMA.md`. Lo específico de este proyecto:

- `data/lugares.json` — 19 lugares (Roma antigua, Vaticano, centro histórico,
  miradores, free tours), cada uno con audioguía, prioridad y recomendaciones
  gastronómicas
- `data/trip.json` — fechas del viaje, vuelos, alojamiento (pendiente de
  rellenar) y contactos de emergencia. Alimenta el modo "ahora" y la vista Info
- `app.js` → `CONFIG` con el centro del mapa (Roma), etiquetas de categoría en
  español, y `DAY_LABELS` (Vie 9 / Sáb 10 / Dom 11 / Lun 12)
- `assets/icon.svg` / `og.svg` — personalizados con la R y el azul del proyecto

## Funciones de "app de viaje real" (sobre el template base)

- **Modo ahora**: al abrir la app durante el viaje, salta directamente al día
  de hoy y muestra un banner con la actividad actual/siguiente según la hora
- **Mapa offline**: las teselas del mapa se cachean según las vas viendo, así
  que las zonas ya visitadas en el mapa siguen funcionando sin conexión
- **Checklist**: botón "Marcar como visitado" en cada ficha, con contador de
  progreso en la vista "Todos"
- **Info**: vuelos, alojamiento y contactos de emergencia (consulado,
  embajada, 112) en su propia pestaña
- **Buscador**: campo de búsqueda por nombre/zona en la vista "Todos"

## Actualizar datos

Edita `data/lugares.json` siguiendo el esquema de `pwa-template/data/SCHEMA.md`.
Si cambias algún archivo cacheado (`app.js`, `core/*.js`, `styles.css`,
`data/lugares.json`...), sube `VERSION` en `sw.js` — hay un pre-commit hook
que te avisa si se te olvida (`git config core.hooksPath .githooks`).
