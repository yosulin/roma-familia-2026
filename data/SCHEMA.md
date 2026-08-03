# Esquema de datos

## Estructura multi-viaje

```
data/
  trips.json                    índice de viajes (nombre, destino, fechas, portada)
  trips/
    roma-2026/
      lugares.json               lugares de ESE viaje (esquema de abajo)
      trip.json                  metadatos de ESE viaje (vuelos, alojamiento...)
    japon-2027/
      lugares.json
      trip.json
```

`data/trips.json`:
```jsonc
{
  "viajes": [
    {
      "id": "roma-2026",                 // debe coincidir con el nombre de carpeta
      "nombre": "Roma en Familia",
      "destino": "Roma, Italia",
      "fecha_inicio": "2026-10-09",       // YYYY-MM-DD
      "fecha_fin": "2026-10-12",
      "portada": "https://.../foto.jpg",  // opcional, imagen de fondo de la tarjeta
      "carpeta": "data/trips/roma-2026"   // opcional si coincide con "data/trips/<id>"
    }
  ]
}
```

Añadir un viaje nuevo = añadir una entrada aquí + crear su carpeta. No hace
falta tocar `app.js` ni ningún módulo de `core/` — todos leen la ruta activa
dinámicamente. `trip.json` puede además incluir `"mapa": {"center":[lat,lng],"zoom":13}`
para que el mapa de ese viaje abra centrado en su destino en vez del mundo entero.

## `lugares.json` (por viaje)

Formato usado por `core/sheet.js`, `core/map.js` y `app.js`. Todos los campos
son opcionales salvo `id`, `nombre`, `categoria` y `coordenadas` (necesarios
para que el lugar aparezca en el mapa y sea clicable).

```jsonc
{
  "lugares": [
    {
      "id": "identificador-unico",          // requerido, usado como key
      "nombre": "Nombre del lugar",          // requerido
      "categoria": "monumento",              // requerido — cualquier string;
                                              // se les asigna color automáticamente
                                              // por orden de aparición (ver core/categoryColors.js)
      "prioridad": "imprescindible",         // opcional: imprescindible | recomendado | opcional
      "descripcion_breve": "...",
      "historia": "...",
      "dato_curioso_niños": "...",
      "audioguia": "...",                    // texto narrado; si no existe, se usa descripcion_breve
      "horario": "...",
      "precio_adulto": "...",
      "precio_niño": "...",
      "necesita_reserva": true,
      "tiempo_visita_recomendado": "...",
      "hora_visita_recomendada": "...",
      "mejor_momento_dia": "...",
      "consejo_practico": "...",
      "coordenadas": { "lat": 0.0, "lng": 0.0 },  // requerido para mapa
      "imagen": "https://.../foto.jpg",           // opcional; si falta, la tarjeta usa color + icono de categoría
      "imagen_credito": { "autor": "...", "autor_url": "...", "foto_url": "..." }, // opcional, lo rellena el workflow de Unsplash
      "zona": "...",
      "cercania_metro": "...",
      "spots_fotografia": [
        { "nombre": "...", "coordenadas": {"lat":0,"lng":0}, "mejor_hora": "...", "por_que": "...", "duracion_recomendada": "..." }
      ],
      "sitios_para_comer": [
        { "nombre": "...", "tipo": "...", "especialidad": "...", "precio_aprox_persona": "...", "puntuacion": "...", "distancia_aprox": "...", "necesita_reserva": "..." }
      ]
    }
  ],

  // Opcional — si existe, se muestra la vista "Itinerario" con tabs por día.
  // Si tu proyecto no tiene itinerario (p.ej. una guía de rutas sin fechas),
  // omite esta clave y quita la vista "Itinerario" del index.html.
  "itinerario_familiar_recomendado": {
    "clave_del_dia": {
      "tema": "Título del día",
      "plan": [
        "08:00 Texto libre — si el texto contiene el nombre de un lugar de `lugares`, se enlaza automáticamente"
      ]
    }
  }
}
```

## Notas
- `categoria` no está limitada a una lista fija: usa las que tenga sentido para
  tu proyecto (rutas de senderismo podría usar `facil`/`media`/`dificil`, por
  ejemplo). Los colores se asignan automáticamente, hasta 8 categorías
  distintas (`--cat-a` … `--cat-h` en `styles.css`).
- El emparejamiento de `plan` con `lugares` es por coincidencia de texto
  (ver `matchLugarFromPlanLine` en `app.js`) — no es infalible, revísalo tras
  generar el itinerario.

# Esquema de datos — `data/trip.json` (opcional)

Metadatos del viaje, separados de `lugares.json` porque cambian con menos
frecuencia y no son "lugares visitables". Ver `data/trip.example.json`.

- `fechas`: mapea cada clave de día usada en `itinerario_familiar_recomendado`
  a una fecha ISO (`YYYY-MM-DD`). Con esto, `core/now.js` puede detectar
  automáticamente qué día del itinerario corresponde a "hoy" y abrir esa
  pestaña al cargar la app.
- `vuelos`: lista de trayectos con horarios — **no incluyas aquí nombres
  completos de pasajeros ni fechas de nacimiento**; la app es pública en
  GitHub Pages. Si necesitas esos datos a mano, guárdalos fuera de este repo.
- `alojamiento`: un único objeto con los datos del hotel/apartamento.
- `contactos_emergencia`: lista de `{ nombre, telefono, direccion?, nota? }`
  (número europeo de emergencias, embajada/consulado, seguro de viaje...).

Si `data/trip.json` no existe, la vista "Info" y el modo "ahora" simplemente
no se activan — el resto de la app funciona igual.

## Fotos reales (`imagen` / Unsplash en build time)

Hay dos formas de tener fotos reales en las tarjetas:

**1. Manual** — pon una URL directa en el campo `imagen` de cualquier lugar
(clic derecho sobre una foto en Unsplash/Pexels/Pixabay → "Copiar dirección
de imagen"). Tiene prioridad sobre la opción automática.

**2. Automática, resuelta en GitHub Actions (recomendada)** — las guías de
Unsplash exigen que la Access Key se mantenga confidencial, y esta app es
100% estática (sin servidor que pueda ocultarla). La solución correcta es
resolver las fotos **antes** de publicar, no desde el navegador del
visitante:

1. Crea una cuenta gratuita en **unsplash.com/oauth/applications** → "New
   Application" (tipo "Demo" vale — 50 peticiones/hora).
2. Copia la **Access Key** (no la Secret Key).
3. En tu repo de GitHub: Settings → Secrets and variables → Actions → "New
   repository secret" → nombre `UNSPLASH_ACCESS_KEY`, valor la Access Key.
4. Ve a la pestaña **Actions** del repo → "Resolver fotos (Unsplash)" → "Run
   workflow". Opcionalmente indica un sufijo de búsqueda (p.ej. `Rome`) para
   acotar los resultados al destino.
5. El workflow (`scripts/resolve-unsplash-photos.mjs` +
   `.github/workflows/resolve-photos.yml`) busca una foto por cada lugar sin
   `imagen`, y hace commit de las URLs + crédito al fotógrafo directamente
   en `data/lugares.json`. La Access Key nunca sale de GitHub Actions ni
   llega al navegador del visitante.

Los lugares ya resueltos no se vuelven a tocar en futuras ejecuciones
(el script solo busca foto para los que aún no tienen `imagen`), así que
puedes volver a lanzarlo sin miedo tras añadir lugares nuevos al JSON.

El service worker cachea cada `imagen` para que funcione offline, y la
tarjeta muestra el crédito al fotógrafo (`imagen_credito`) como exige la
licencia de Unsplash — no lo quites del `app.js` si mantienes esta fuente.

