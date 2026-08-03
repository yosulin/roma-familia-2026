// core/unsplash.js
// Resuelve una foto de un lugar buscando en Unsplash, cachea el resultado
// en localStorage (para no repetir la petición en cada carga) y devuelve
// también los datos de atribución que exige la licencia de la API de Unsplash.
//
// Necesitas una Access Key gratuita: https://unsplash.com/developers
// (crea una app, tipo "Demo" vale — 50 peticiones/hora es de sobra para
// resolver ~20 fotos de lugares). La clave es de tipo "Client-ID" pensada
// para usarse en el propio cliente (navegador), así que es normal que
// quede visible en el código fuente de una PWA estática; no es un secreto
// de servidor. El límite de peticiones protege frente a abuso.

const CACHE_PREFIX = 'unsplash-photo::' + (location.pathname.split('/')[1] || 'app') + '::';
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 90; // 90 días

function readCache(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.savedAt > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function writeCache(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, savedAt: Date.now() }));
  } catch {
    // localStorage lleno o no disponible: no pasa nada, se repetirá la petición
  }
}

/**
 * @param {string} query - término de búsqueda, p.ej. "Colosseum Rome"
 * @param {string} accessKey - Access Key de Unsplash (Client-ID)
 * @returns {Promise<{url:string, thumbUrl:string, author:string, authorUrl:string, photoUrl:string}|null>}
 */
export async function resolvePlacePhoto(query, accessKey) {
  const cached = readCache(query);
  if (cached) return cached;
  if (!accessKey) return null;

  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&content_filter=high`,
      { headers: { Authorization: `Client-ID ${accessKey}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const photo = data.results && data.results[0];
    if (!photo) return null;

    const result = {
      url: photo.urls.regular,
      thumbUrl: photo.urls.small,
      author: photo.user.name,
      authorUrl: `${photo.user.links.html}?utm_source=pwa-template&utm_medium=referral`,
      photoUrl: `${photo.links.html}?utm_source=pwa-template&utm_medium=referral`
    };
    writeCache(query, result);
    return result;
  } catch {
    return null;
  }
}
