# Roma en Familia

PWA estática para el viaje familiar a Roma (9–12 octubre 2026): mapa interactivo,
itinerario día a día, spots fotográficos y recomendaciones gastronómicas por lugar.

- Sin backend: todos los datos viven en `data/lugares.json`.
- Mapa con [Leaflet](https://leafletjs.com/) + OpenStreetMap.
- Instalable como app (manifest + service worker, funciona offline tras la primera carga).

## Desarrollo local

Cualquier servidor estático sirve, por ejemplo:

```
npx serve .
```

## Estructura

```
index.html       Estructura y vistas (Itinerario / Mapa / Todos)
style.css        Tema visual (miliario romano / inscripción)
app.js           Lógica: carga de datos, render, mapa, ficha de detalle
data/lugares.json  Datos de lugares, itinerario y recomendaciones
manifest.json     Manifest PWA
sw.js             Service worker (cache offline)
```

## Actualizar datos

Edita `data/lugares.json` siguiendo la misma estructura por lugar
(`spots_fotografia`, `sitios_para_comer`, `hora_visita_recomendada`, etc.)
y el itinerario en `itinerario_familiar_recomendado`.
