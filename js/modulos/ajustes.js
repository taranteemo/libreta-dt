// ============================================================
//  MÁS: planteles, backup, instalación y datos de la app.
// ============================================================
import * as db from '../core/db.js';
import { CONFIG } from '../../config.js';
import { nuevoPlantel, uid } from '../core/model.js';
import { h, hoja, campo, select, menu, confirmar, aviso, pedirTexto } from '../core/ui.js';
import { plantelActivo, setPlantel } from '../core/estado.js';
import { exportarBackup, importarBackup, diasSinBackup } from '../core/backup.js';
import { mostrarGuia, estaInstalada } from '../core/instalar.js';

export async function render(cont) {
  const planteles = await db.todos('planteles');
  const activo = plantelActivo();
  const dias = await diasSinBackup();

  const listaPl = h('div.lista-simple', planteles.map(p => h(`div.fila${p.id === activo?.id ? '.activo' : ''}`,
    h('button.fila-cuerpo', { onclick: async () => { await setPlantel(p); location.hash = '#/plantel'; } },
      h('b', p.nombre), h('small', ` ${p.categoria || ''} ${p.temporada || ''}`), p.id === activo?.id ? h('span.tag', 'Activo') : null),
    h('button.btn-icono', { 'aria-label': 'Opciones', onclick: () => opcionesPlantel(p) }, '⋯'))));

  let usado = '';
  try { const e = await navigator.storage?.estimate?.(); if (e) usado = `${(e.usage / 1048576).toFixed(1)} MB usados`; } catch {}
  let persistente = null;
  try { persistente = await navigator.storage?.persisted?.(); } catch {}

  cont.append(
    h('div.vista-cab', h('h1', 'Más')),

    h('section.bloque',
      h('h2', 'Planteles'),
      listaPl,
      h('button.btn.btn-sec', { onclick: () => crearPlantel() }, '+ Nuevo plantel')),

    h('section.bloque',
      h('h2', 'Backup'),
      h('p', dias === Infinity ? 'Todavía no hiciste ningún backup.' : dias === 0 ? 'Último backup: hoy.' : `Último backup: hace ${dias} día${dias > 1 ? 's' : ''}.`),
      h('p.nota', 'El backup es un archivo con todos tus datos. Guardalo en Drive, en Archivos o mandátelo por WhatsApp. Con ese archivo recuperás todo en otro celular.'),
      h('div.btns',
        h('button.btn.btn-prim', { onclick: async () => { await exportarBackup(); location.reload(); } }, '💾 Hacer backup'),
        h('button.btn.btn-sec', { onclick: async () => { if (await importarBackup()) location.reload(); } }, '📂 Importar backup'))),

    h('section.bloque',
      h('h2', 'App'),
      h('p', estaInstalada() ? '✔ La app está instalada.' : '⚠️ La app no está instalada.'),
      persistente === false ? h('p.nota', 'El navegador todavía no marcó los datos como permanentes. Instalando la app y haciendo backup estás cubierto.') : null,
      !estaInstalada() ? h('button.btn.btn-sec', { onclick: () => mostrarGuia({ forzar: true }) }, 'Cómo instalarla') : null,
      h('p.nota', `${CONFIG.app.nombre} · ${CONFIG.app.firma}`, usado ? ` · ${usado}` : '')));
}

async function crearPlantel(origen = null) {
  const nombre = h('input.campo', { value: origen ? `${origen.categoria || origen.nombre} ${(origen.temporada || new Date().getFullYear()) + 1}` : '', placeholder: 'Ej: 5ta 2027' });
  const cat = select([['', '—'], ...CONFIG.categorias.map(c => [c, c])], origen?.categoria || '');
  const temp = h('input.campo', { type: 'number', inputmode: 'numeric', value: origen ? (origen.temporada || new Date().getFullYear()) + 1 : new Date().getFullYear() });
  const ok = await hoja(origen ? `Duplicar ${origen.nombre}` : 'Nuevo plantel', h('div.form-grilla',
    origen ? h('p.nota', 'Se copian los jugadores. El plantel original queda como está.') : null,
    campo('Categoría', cat), campo('Nombre', nombre), campo('Temporada', temp)), {
    botones: [{ texto: 'Cancelar', valor: false, clase: 'btn-sec' }, { texto: origen ? 'Duplicar' : 'Crear', clase: 'btn-prim', accion: () => !!nombre.value.trim() || (aviso('Poné un nombre.'), false) }],
  });
  if (!ok) return;
  const p = nuevoPlantel({ nombre: nombre.value.trim(), categoria: cat.value, temporada: Number(temp.value) });
  await db.guardar('planteles', p);
  if (origen) {
    const jugs = await db.porIndice('jugadores', 'plantelId', origen.id);
    for (const j of jugs) {
      const t = new Date().toISOString();
      await db.guardar('jugadores', { ...structuredClone(j), id: uid(), plantelId: p.id, creado: t, estado: 'disponible' });
    }
    aviso(`Plantel duplicado con ${jugs.length} jugadores.`);
  }
  await setPlantel(p);
  location.hash = '#/plantel';
}

async function opcionesPlantel(p) {
  const v = await menu(p.nombre, [
    { texto: '✎ Cambiar nombre', valor: 'nombre' },
    { texto: '⧉ Duplicar (nuevo año)', valor: 'duplicar' },
    { texto: '🗑 Borrar plantel', valor: 'borrar', peligro: true },
  ]);
  if (v === 'nombre') {
    const n = await pedirTexto('Nombre del plantel', p.nombre);
    if (n?.trim()) { p.nombre = n.trim(); await db.guardar('planteles', p); if (p.id === plantelActivo()?.id) await setPlantel(p); else location.reload(); }
  } else if (v === 'duplicar') {
    await crearPlantel(p);
  } else if (v === 'borrar') {
    const todos = await db.todos('planteles');
    if (todos.length < 2) return aviso('Tiene que quedar al menos un plantel.');
    if (!(await confirmar(`¿Borrar "${p.nombre}" con sus jugadores y sesiones? Hacé un backup antes si no estás seguro.`, { si: 'Borrar', peligro: true }))) return;
    for (const st of ['jugadores', 'semanas', 'sesiones']) for (const r of await db.porIndice(st, 'plantelId', p.id)) await db.borrar(st, r.id);
    await db.borrar('planteles', p.id);
    if (p.id === plantelActivo()?.id) await setPlantel(todos.find(x => x.id !== p.id));
    else location.reload();
  }
}
