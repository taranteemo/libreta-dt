// ============================================================
//  SESIÓN: partes (inicial / principal / final) con sus tareas.
// ============================================================
import * as db from '../../core/db.js';
import { CONFIG } from '../../../config.js';
import { nuevaTarea, tareaEnSesion, lunesDe, duracionTarea } from '../../core/model.js';
import { h, vaciar, menu, confirmar, aviso, vacio, fechaLarga } from '../../core/ui.js';
import { editarTarea, clonarPizarra, miniaturaDe, nombreObjetivo, nombreFase, resumenCarga } from './tarea-form.js';
import { elegirTarea, copiarASesion, listaTareas } from './biblioteca.js';
import { obtenerSemana, mdDelDia, partidoReferencia } from './semana.js';
import { arrastrable } from '../../core/arrastrar.js';
import { abrirPizarra } from '../../pizarra/editor.js';
import { jugadoresActivos } from '../../core/estado.js';

export async function render(cont, [id]) {
  const s = await db.obtener('sesiones', id);
  if (!s) return cont.append(vacio('No se encontró la sesión.', h('a.btn.btn-sec', { href: '#/semana' }, 'Volver a la semana')));
  const lunes = lunesDe(s.fecha);
  const sem = await obtenerSemana(s.plantelId, lunes);
  const md = mdDelDia(sem, s.fecha, await partidoReferencia(s.plantelId, lunes));
  const tipo = sem.dias?.[s.fecha]?.tipo;

  const guardar = () => db.guardar('sesiones', s);
  const total = h('span.contador');
  const partes = h('div.partes');

  async function pintar() {
    const todas = Object.values(s.bloques).flat();
    total.textContent = `${todas.length} tarea${todas.length === 1 ? '' : 's'} · ${todas.reduce((a, t) => a + duracionTarea(t), 0)}'`;
    vaciar(partes);
    for (const p of CONFIG.partesSesion) {
      const arr = s.bloques[p.id] || (s.bloques[p.id] = []);
      const min = arr.reduce((a, t) => a + duracionTarea(t), 0);
      const zona = h('div.parte-lista', { 'data-drop': p.id });
      for (const t of arr) zona.append(await tarjeta(t, p.id));
      if (!arr.length) zona.append(h('div.parte-vacia', 'Sin tareas'));
      partes.append(h('section.parte',
        h('div.parte-cab', h('h2', p.nombre), h('span.parte-min', min ? `${min}'` : '')),
        zona,
        h('div.parte-btns',
          h('button.btn.btn-sec.btn-chico', { onclick: () => agregarDeBiblio(p.id) }, '⭐ De la biblioteca'),
          h('button.btn.btn-sec.btn-chico', { onclick: () => nueva(p.id) }, '+ Nueva'))));
    }
  }

  async function tarjeta(t, parte) {
    const manija = h('span.manija', { 'aria-label': 'Arrastrar para mover' }, '⠿');
    const card = h('div.tarea', { 'data-item': '' },
      manija,
      h('button.tarea-cuerpo', { onclick: () => editar(t) },
        await miniaturaDe(t.pizarraId),
        h('div.tarea-info',
          h('div.tarea-nombre', t.nombre),
          h('div.tarea-tags', h('span.tag', { 'data-obj': t.objetivo }, nombreObjetivo(t.objetivo)), h('span.tag.tag-fase', nombreFase(t.fase))),
          h('div.tarea-carga', resumenCarga(t)))),
      h('button.btn-icono.mas', { 'aria-label': 'Opciones', onclick: () => acciones(t, parte) }, '⋯'));
    arrastrable(manija, { tarjeta: card, datos: { idLocal: t.idLocal, parte }, alSoltar: soltar });
    return card;
  }

  // Mover dentro de la sesión, o agregar desde el panel de biblioteca.
  async function soltar({ zona, indice, datos }) {
    if (!s.bloques[zona]) return;
    if (datos.tareaId) {
      const t = await db.obtener('tareas', datos.tareaId);
      if (t) { await copiarASesion(t, s, zona, indice); await guardar(); pintar(); }
      return;
    }
    const origen = s.bloques[datos.parte];
    const i = origen.findIndex(x => x.idLocal === datos.idLocal);
    if (i < 0) return;
    const [t] = origen.splice(i, 1);
    s.bloques[zona].splice(Math.min(indice, s.bloques[zona].length), 0, t);
    await guardar(); pintar();
  }

  async function editar(t) {
    const r = await editarTarea(t, { titulo: 'Tarea de la sesión', duenio: { tipo: 'sesion', id: s.id } });
    if (!r) return;
    for (const arr of Object.values(s.bloques)) { const i = arr.findIndex(x => x.idLocal === t.idLocal); if (i >= 0) arr[i] = r; }
    await guardar(); pintar();
  }

  async function acciones(t, parte) {
    const v = await menu(t.nombre, [
      { texto: '✎ Editar', valor: 'editar' },
      { texto: '🖊 Diagrama', valor: 'diagrama' },
      { texto: '⧉ Duplicar', valor: 'duplicar' },
      { texto: '⭐ Guardar en la biblioteca', valor: 'biblio' },
      { texto: '✕ Quitar de la sesión', valor: 'quitar', peligro: true },
    ]);
    const arr = s.bloques[parte];
    const i = arr.findIndex(x => x.idLocal === t.idLocal);
    if (v === 'editar') return editar(t);
    if (v === 'diagrama') {
      if (!t.pizarraId) return editar(t);
      await abrirPizarra(t.pizarraId, { titulo: t.nombre, jugadores: await jugadoresActivos() });
      return pintar();
    }
    if (v === 'duplicar') {
      const c = structuredClone(t);
      c.idLocal = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
      c.pizarraId = await clonarPizarra(t.pizarraId, { tipo: 'sesion', id: s.id });
      arr.splice(i + 1, 0, c);
    }
    if (v === 'biblio') {
      const n = nuevaTarea();
      const { idLocal, origenTareaId, division, ...campos } = structuredClone(t);
      Object.assign(n, campos, { id: n.id });
      n.pizarraId = await clonarPizarra(t.pizarraId, { tipo: 'tarea', id: n.id });
      await db.guardar('tareas', n);
      return aviso('Guardada en la biblioteca ⭐');
    }
    if (v === 'quitar') {
      if (!(await confirmar(`¿Quitar "${t.nombre}" de esta sesión?`, { si: 'Quitar', peligro: true }))) return;
      arr.splice(i, 1);
      if (t.pizarraId) await db.borrar('pizarras', t.pizarraId);
    }
    if (v) { await guardar(); pintar(); }
  }

  async function agregarDeBiblio(parte) {
    const t = await elegirTarea();
    if (!t) return;
    await copiarASesion(t, s, parte);
    await guardar(); pintar();
  }

  async function nueva(parte) {
    const base = tareaEnSesion(nuevaTarea());
    const r = await editarTarea(base, { titulo: 'Nueva tarea', duenio: { tipo: 'sesion', id: s.id } });
    if (!r) return;
    s.bloques[parte].push(r);
    await guardar(); pintar();
  }

  const notas = h('textarea.campo', { rows: 3, placeholder: 'Notas de la sesión' , onchange: e => { s.notas = e.target.value; guardar(); } }, s.notas || '');

  // En pantallas anchas (iPad horizontal) se muestra la biblioteca al costado para arrastrar.
  const panel = h('aside.panel-biblio',
    h('h2', 'Biblioteca'),
    h('p.nota', 'Arrastrá una tarea (⠿) a la parte de la sesión.'),
    listaTareas({ modo: 'panel', alSoltar: soltar }));

  cont.append(
    h('div.vista-cab',
      h('a.volver', { href: `#/semana/${s.fecha}` }, '‹ Semana'),
      h('div.ses-tit',
        h('h1', fechaLarga(s.fecha)),
        h('div.ses-sub', md && h('span.md', { 'data-md': md }, md), tipo && h('span.tag', tipo), total))),
    h('div.sesion-layout',
      h('div.sesion-principal',
        partes,
        h('label.form-campo', h('span.form-etq', 'Notas'), notas),
        h('div.acciones-pie',
          h('a.btn.btn-prim', { href: `#/imprimir/${s.id}` }, '🖨 Imprimir / PDF'),
          h('button.btn.btn-peligro-txt', {
            onclick: async () => {
              if (!(await confirmar('¿Borrar esta sesión completa?', { si: 'Borrar', peligro: true }))) return;
              for (const t of Object.values(s.bloques).flat()) if (t.pizarraId) await db.borrar('pizarras', t.pizarraId);
              await db.borrar('sesiones', s.id);
              location.hash = `#/semana/${s.fecha}`;
            },
          }, 'Borrar sesión'))),
      panel));
  await pintar();
}
