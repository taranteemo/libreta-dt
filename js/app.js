// ============================================================
//  Arranque de la app, marca, navegación y avisos.
// ============================================================
import { CONFIG } from '../config.js';
import * as db from './core/db.js';
import { setDeviceId, uid, nuevoPlantel } from './core/model.js';
import { h, $, vaciar, hoja, campo, select, aviso } from './core/ui.js';
import { cargarPlantel, plantelActivo, setPlantel, alCambiarPlantel } from './core/estado.js';
import { registrarSW } from './core/actualizar.js';
import { mostrarGuia, pedirPersistencia, estaInstalada } from './core/instalar.js';
import { diasSinBackup, exportarBackup } from './core/backup.js';

import * as plantel from './modulos/plantel/plantel.js';
import * as semana from './modulos/microciclo/semana.js';
import * as sesion from './modulos/microciclo/sesion.js';
import * as biblioteca from './modulos/microciclo/biblioteca.js';
import * as imprimir from './modulos/microciclo/imprimir.js';
import * as ajustes from './modulos/ajustes.js';

const RUTAS = {
  plantel: { mod: plantel, nav: 'plantel' },
  semana: { mod: semana, nav: 'semana' },
  sesion: { mod: sesion, nav: 'semana' },
  biblioteca: { mod: biblioteca, nav: 'biblioteca' },
  imprimir: { mod: imprimir, nav: 'semana' },
  ajustes: { mod: ajustes, nav: 'ajustes' },
};

const NAV = [
  { id: 'plantel', texto: 'Plantel', ico: '👥' },
  { id: 'semana', texto: 'Semana', ico: '📅' },
  { id: 'biblioteca', texto: 'Tareas', ico: '⭐' },
  { id: 'ajustes', texto: 'Más', ico: '⚙︎' },
];

// ---------- Marca ----------
function aplicarMarca() {
  const r = document.documentElement.style;
  const c = CONFIG.colores;
  r.setProperty('--c-prim', c.primario);
  r.setProperty('--c-osc', c.oscuro);
  r.setProperty('--c-acento', c.acento);
  r.setProperty('--c-dest', c.destaque);
  r.setProperty('--c-blanco', c.blanco);
  r.setProperty('--c-rival', c.rival);
  r.setProperty('--f-tit', CONFIG.tipografia.titulos);
  r.setProperty('--f-txt', CONFIG.tipografia.texto);
  document.title = CONFIG.app.nombre;
  document.querySelector('meta[name="apple-mobile-web-app-title"]')?.setAttribute('content', CONFIG.app.nombreCorto);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', c.oscuro);
  const t = CONFIG.tipografia;
  if (t.archivoTitulos && 'FontFace' in window) {
    const f = new FontFace(t.nombreTitulos, `url(${t.archivoTitulos})`, { display: 'swap' });
    f.load().then(ff => document.fonts.add(ff)).catch(() => {});
  }
}

// ---------- Estructura ----------
function construir() {
  const app = $('#app');
  vaciar(app);
  app.append(
    h('header.cab',
      h('img.cab-escudo', { src: CONFIG.club.escudo, alt: '' }),
      h('div.cab-txt', h('div.cab-app', CONFIG.app.nombre), h('button.cab-plantel#cab-plantel', { onclick: elegirPlantel }))),
    h('div#banner'),
    h('main#vista'),
    h('nav.nav', NAV.map(n => h('a.nav-item', { href: `#/${n.id}`, 'data-nav': n.id },
      h('span.nav-ico', n.ico), h('span.nav-txt', n.texto)))),
  );
  pintarPlantel();
  alCambiarPlantel(() => { pintarPlantel(); navegar(); });
}

function pintarPlantel() {
  const p = plantelActivo();
  $('#cab-plantel').textContent = p ? `${p.nombre} ▾` : 'Sin plantel';
}

async function elegirPlantel() {
  const lista = await db.todos('planteles');
  if (lista.length < 2) { location.hash = '#/ajustes'; return; }
  const { menu } = await import('./core/ui.js');
  const id = await menu('Plantel', lista.map(p => ({ texto: p.nombre, valor: p.id, activo: p.id === plantelActivo()?.id })));
  if (id) setPlantel(lista.find(p => p.id === id));
}

// ---------- Router ----------
let renderActual = 0;
async function navegar() {
  const [ruta = 'plantel', ...params] = location.hash.replace(/^#\/?/, '').split('/');
  const r = RUTAS[ruta] || RUTAS.plantel;
  document.querySelectorAll('.nav-item').forEach(a => a.classList.toggle('activo', a.dataset.nav === r.nav));
  document.body.dataset.ruta = ruta;
  const cont = $('#vista');
  const yo = ++renderActual;
  const nuevo = h('div.vista-int');
  try {
    await r.mod.render(nuevo, params.map(decodeURIComponent));
  } catch (e) {
    console.error(e);
    nuevo.append(h('div.vacio', h('p', 'Ups, algo falló al abrir esta pantalla.'), h('pre.error', String(e?.message || e))));
  }
  if (yo !== renderActual) return;
  vaciar(cont).append(nuevo);
  cont.scrollTop = 0;
}

// ---------- Primer uso ----------
async function primerPlantel() {
  const nombre = h('input.campo', { placeholder: 'Ej: 5ta 2026' });
  const cat = select([['', '—'], ...CONFIG.categorias.map(c => [c, c])], '');
  const temp = h('input.campo', { type: 'number', inputmode: 'numeric', value: new Date().getFullYear() });
  cat.onchange = () => { if (!nombre.value) nombre.value = `${cat.value} ${temp.value}`; };
  while (true) {
    const ok = await hoja(`¡Bienvenido a ${CONFIG.app.nombre}!`, h('div.form-grilla',
      h('p', 'Arrancá creando tu plantel. Después podés tener más de uno.'),
      campo('Categoría', cat),
      campo('Nombre del plantel', nombre),
      campo('Temporada', temp)), {
      botones: [{ texto: 'Crear plantel', clase: 'btn-prim', accion: () => !!(nombre.value.trim() || cat.value) }],
    });
    if (ok) break;
  }
  const p = nuevoPlantel({ nombre: nombre.value.trim() || `${cat.value} ${temp.value}`, categoria: cat.value, temporada: Number(temp.value) });
  await db.guardar('planteles', p);
  await setPlantel(p);
}

// ---------- Recordatorio de backup ----------
async function revisarBackup() {
  const ban = $('#banner');
  vaciar(ban);
  const hayDatos = (await db.contar('jugadores')) + (await db.contar('tareas')) > 0;
  if (!hayDatos) return;
  const d = await diasSinBackup();
  if (d < CONFIG.backupDias) return;
  ban.append(h('div.banner',
    h('span', d === Infinity ? '💾 Todavía no hiciste ningún backup.' : `💾 Hace ${d} días que no hacés backup.`),
    h('button.btn.btn-chico.btn-destaque', { onclick: exportarBackup }, 'Hacer backup')));
}

// ---------- Inicio ----------
async function iniciar() {
  aplicarMarca();
  let dev = await db.ajuste('dispositivo');
  if (!dev) { dev = uid(); await db.ajuste('dispositivo', dev); }
  setDeviceId(dev);
  construir();
  if (!(await cargarPlantel())) await primerPlantel();
  pintarPlantel();
  window.addEventListener('hashchange', navegar);
  await navegar();
  revisarBackup();
  document.addEventListener('backup-hecho', revisarBackup);
  registrarSW();
  pedirPersistencia();
  if (!estaInstalada()) setTimeout(() => mostrarGuia(), 800);
}

iniciar().catch(e => {
  console.error(e);
  document.body.append(h('div.vacio', h('p', 'No se pudo iniciar la app.'), h('pre.error', String(e?.message || e))));
});
