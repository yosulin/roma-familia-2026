# CLAUDE.md — pwa-template (Josu)

Instrucciones para cuando Josu diga algo como *"nuevo proyecto basado en mi
pwa-template"* o *"monta la PWA de [tema] usando mi template"*.

## Nuevo proyecto

1. Pregunta lo mínimo imprescindible si no está claro por contexto: nombre de
   la app, tema/fechas (si aplica), y si tiene itinerario día a día o es solo
   mapa + lista (p.ej. una guía de rutas no tiene "días").
2. Copia la estructura completa del template.
3. Reemplaza placeholders `{{APP_NAME}}`, `{{APP_DESCRIPTION}}`,
   `{{THEME_COLOR}}`, `{{THEME_COLOR_DARK}}`, `{{ACCENT}}`, `{{EYEBROW}}`,
   `{{APP_TITLE}}`, `{{SUBTITLE}}`, `{{APP_URL}}` en `index.html`,
   `manifest.json` y `styles.css`, usando `config.example.json` como
   referencia de qué rellenar.
4. Genera `data/lugares.json` siguiendo `data/SCHEMA.md` — si el proyecto no
   tiene itinerario día a día, omite `itinerario_familiar_recomendado` y
   elimina la vista "Itinerario" de `index.html`/`app.js` (deja solo Mapa y
   Todos).
5. Ajusta `mapCenter`/`mapZoom` en la `CONFIG` de `app.js` a la ubicación del
   proyecto.
6. Genera un `assets/icon.svg` simple acorde al tema (o pide uno) y corre
   `scripts/make-icons.sh` + `scripts/make-og.sh`.
7. Sube VERSION en `sw.js` si partes de un clon con caché ya usada (poco
   probable en un proyecto nuevo, pero revísalo).
8. Antes de dar por terminado: valida el JSON, valida sintaxis JS, y confirma
   con Josu antes de crear el repo remoto o hacer push (nunca reutilices un
   token que ya haya aparecido en texto plano en la conversación sin
   recordarle que lo revoque).

## Auditar un proyecto existente (p.ej. migrar Roma a este template)

Compara el proyecto existente contra esta lista y reporta qué falta:
- [ ] `sw.js` con `VERSION` + `.githooks/pre-commit` activado
- [ ] Dark mode vía `prefers-color-scheme` (variables CSS, no clase manual)
- [ ] Tarjeta OG (`assets/og.png` + metas `og:*`)
- [ ] Banner de instalación (Android/desktop + instrucciones iOS)
- [ ] Pull-to-refresh en modo standalone
- [ ] Aviso de "nueva versión disponible"
- [ ] Categorías con color automático (`core/categoryColors.js`) en vez de
      hardcodeadas en CSS
- [ ] Accesos directos a Maps (ver / cómo llegar) en la ficha de detalle
- [ ] Audioguía (si el proyecto tiene contenido narrable)

## Cosas que NO hay que romper

- La app final no tiene build step ni dependencias en runtime — módulos ES
  cargados directamente por el navegador, Leaflet por CDN. No introduzcas
  bundlers salvo que Josu lo pida explícitamente.
- `core/pullToRefresh.js` se carga como `<script>` clásico (expone
  `window.PullToRefresh`), no como módulo ES — no lo cambies a `import` sin
  adaptar también el propio archivo.
- Cualquier campo nuevo en el esquema de `lugares.json` debe documentarse en
  `data/SCHEMA.md`.
