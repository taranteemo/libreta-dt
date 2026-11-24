// ============================================================
//  Service worker: funciona sin internet.
//  IMPORTANTE: cada vez que subas cambios, aumentá VERSION.
//  Así los celulares detectan la versión nueva y muestran
//  el aviso "Hay una versión nueva · Actualizar".
// ============================================================
const VERSION = '1.0.0';
const CACHE = `libreta-dt-${VERSION}`;

const ARCHIVOS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './config.js',
  './assets/brand/escudo.svg',
  './assets/fonts/bangers.woff2',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/maskable-512.png',
  './assets/icons/apple-touch-icon.png',
  './css/base.css',
  './css/layout.css',
  './css/componentes.css',
  './css/pizarra.css',
  './css/print.css',
  './js/app.js',
  './js/core/actualizar.js',
  './js/core/archivos.js',
  './js/core/arrastrar.js',
  './js/core/backup.js',
  './js/core/db.js',
  './js/core/estado.js',
  './js/core/instalar.js',
  './js/core/model.js',
  './js/core/ui.js',
  './js/modulos/ajustes.js',
  './js/modulos/microciclo/biblioteca.js',
  './js/modulos/microciclo/imprimir.js',
  './js/modulos/microciclo/semana.js',
  './js/modulos/microciclo/sesion.js',
  './js/modulos/microciclo/tarea-form.js',
  './js/modulos/plantel/jugador-form.js',
  './js/modulos/plantel/plantel.js',
  './js/pizarra/editor.js',
  './js/pizarra/elementos.js',
  './js/pizarra/exportar.js',
  './js/pizarra/gestos.js',
  './js/pizarra/herramientas.js',
  './js/pizarra/historial.js',
  './js/pizarra/render.js',
];

self.addEventListener('install', e => {
  // cache: 'reload' evita que el navegador sirva archivos viejos de su propia caché
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS.map(u => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.filter(k => k.startsWith('libreta-dt-') && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (e.data?.tipo === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    if (hit) return hit;
    try {
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    } catch {
      if (req.mode === 'navigate') return (await c.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
