#!/usr/bin/env node
// scripts/resolve-unsplash-photos.mjs
//
// Resuelve una foto por lugar (los que no tengan ya "imagen") usando la
// API de Unsplash, y escribe la URL + crédito directamente en
// data/lugares.json. Se ejecuta en CI (GitHub Actions) con la Access Key
// como secreto — nunca se expone en el código ni en el navegador del
// visitante, que es justo lo que piden las guías de Unsplash.
//
// Uso: UNSPLASH_ACCESS_KEY=xxx node scripts/resolve-unsplash-photos.mjs [ruta-al-json] [sufijo-busqueda]

import { readFileSync, writeFileSync } from 'node:fs';

const jsonPath = process.argv[2] || 'data/lugares.json';
const querySuffix = process.argv[3] || '';
const accessKey = process.env.UNSPLASH_ACCESS_KEY;

if (!accessKey) {
  console.error('Falta UNSPLASH_ACCESS_KEY en el entorno.');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchPhoto(query) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&content_filter=high`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${accessKey}` } });
  if (!res.ok) {
    console.warn(`  ! Unsplash respondió ${res.status} para "${query}"`);
    return null;
  }
  const data = await res.json();
  return (data.results && data.results[0]) || null;
}

function cleanQuery(nombre) {
  return nombre
    .replace(/\([^)]*\)/g, '')       // quita paréntesis: "Giardino (Parco Savello)" -> "Giardino"
    .split(/\s+y\s+/i)[0]            // "Foro Romano y Palatino" -> "Foro Romano"
    .replace(/^Free Tour\s*/i, '')   // "Free Tour Centro Histórico" -> "Centro Histórico"
    .trim();
}

async function main() {
  const raw = readFileSync(jsonPath, 'utf-8');
  const data = JSON.parse(raw);
  let changed = 0;

  for (const lugar of data.lugares) {
    if (lugar.imagen) continue; // ya tiene foto (manual o resuelta antes): no la tocamos

    const cleaned = cleanQuery(lugar.nombre);
    let query = `${cleaned} ${querySuffix}`.trim();
    process.stdout.write(`Resolviendo "${query}"... `);
    let photo = await searchPhoto(query);

    if (!photo && cleaned !== lugar.nombre) {
      await sleep(1100);
      query = `${lugar.nombre.replace(/[()]/g, '')} ${querySuffix}`.trim();
      process.stdout.write(`reintentando "${query}"... `);
      photo = await searchPhoto(query);
    }

    if (!photo) {
      console.log('sin resultado');
    } else {
      lugar.imagen = photo.urls.regular;
      lugar.imagen_credito = {
        autor: photo.user.name,
        autor_url: `${photo.user.links.html}?utm_source=pwa-template&utm_medium=referral`,
        foto_url: `${photo.links.html}?utm_source=pwa-template&utm_medium=referral`
      };
      changed++;
      console.log(`OK (${photo.user.name})`);
    }

    await sleep(1100); // margen cómodo bajo el límite de 50/hora del plan Demo
  }

  if (changed > 0) {
    writeFileSync(jsonPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    console.log(`\n${changed} foto(s) nueva(s) escritas en ${jsonPath}`);
  } else {
    console.log('\nNada que actualizar.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
