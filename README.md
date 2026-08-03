# Mis Viajes

PWA multi-viaje: mapa, itinerario día a día, gastronomía, spots fotográficos
y audioguía por lugar — para todos nuestros viajes en familia, no solo Roma.

Construida sobre [yosulin/pwa-template](https://github.com/yosulin/pwa-template)
(a su vez con carcasa basada en [jsundram/pwa-starter](https://github.com/jsundram/pwa-starter)).

## Desarrollo local

```
python3 -m http.server 8000
```

## Estructura

Ver [pwa-template](https://github.com/yosulin/pwa-template) para la
documentación de `core/` y `data/SCHEMA.md`.

```
data/
  trips.json              índice de viajes (nombre, destino, fechas, portada)
  trips/
    roma-2026/
      lugares.json          19 lugares con audioguía, prioridad y gastronomía
      trip.json              vuelos, contactos de emergencia, centro del mapa
```

## Añadir un viaje nuevo

1. Crea `data/trips/<id-del-viaje>/lugares.json` y `trip.json` siguiendo
   `data/SCHEMA.md` (pídeselo a Claude, es como se ha hecho hasta ahora).
2. Añade una entrada en `data/trips.json` con ese `id` y su `carpeta`.
3. Nada más — la app lo detecta solo, sin tocar `app.js` ni `core/`.

## Fotos automáticas (Unsplash)

Cada viaje puede resolver sus fotos vía GitHub Actions sin exponer ninguna
key en el código — ver la sección "Fotos reales" en `data/SCHEMA.md` del
template. El workflow acepta la ruta del JSON como parámetro, así que sirve
igual para cualquier viaje: `data/trips/<id>/lugares.json`.

## Actualizar datos

Si cambias algún archivo cacheado (`app.js`, `core/*.js`, `styles.css`...),
sube `VERSION` en `sw.js` — hay un pre-commit hook que avisa si se te olvida
(`git config core.hooksPath .githooks`). Los archivos de datos por viaje
(`data/trips/*/*.json`) se cachean solos al visitarlos, no hace falta
tocar la versión por añadir o editar un viaje.

## Actualizar datos

Edita `data/lugares.json` siguiendo el esquema de `pwa-template/data/SCHEMA.md`.
Si cambias algún archivo cacheado (`app.js`, `core/*.js`, `styles.css`,
`data/lugares.json`...), sube `VERSION` en `sw.js` — hay un pre-commit hook
que te avisa si se te olvida (`git config core.hooksPath .githooks`).
