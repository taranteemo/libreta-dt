// ============================================================
//  BIBLIOTECA de tareas ("ejercicios joya").
// ============================================================
import * as db from '../../core/db.js';
import { CONFIG } from '../../../config.js';
import { nuevaTarea, uid, lunesDe, isoDia, sumarDias } from '../../core/model.js';
import { h, vaciar, chips, menu, confirmar, vacio, aviso, hoja, fechaCorta } from '../../core/ui.js';
import { plantelActivo } from '../../core/estado.js';
import { editarTarea, clonarPizarra, miniaturaDe, nombreObjetivo, nombreFase, resumenCarga } from './tarea-form.js';
import { arrastrable } from '../../core/arrastrar.js';

const filtro = { texto: '', obj: [], fase: [], fav: false };

// Lista filtrable reutilizable. modo: 'biblioteca' | 'elegir' | 'panel'
export function listaTareas({ modo = 'biblioteca', alElegir, alSoltar } = {}) {
  const raiz = h('div.biblio');
  const lista = h('div.lista-tareas');
  const buscar = h('input.campo.buscar', { type: 'search', placeholder: '🔍 Buscar tarea', value: filtro.texto, oninput: e => { filtro.texto = e.target.value; pintar(); } });
  const fav = h(`button.chip${filtro.fav ? '.activo' : ''}`, { onclick: () => { filtro.fav = !filtro.fav; fav.classList.toggle('activo', filtro.fav); pintar(); } }, '★ Favoritas');

  async function pintar() {
    const todas = await db.todos('tareas');
    const q = filtro.texto.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const ts = todas
      .filter(t => !filtro.fav || t.favorita)
      .filter(t => !filtro.obj.length || filtro.obj.includes(t.objetivo))
      .filter(t => !filtro.fase.length || filtro.fase.includes(t.fase))
      .filter(t => !q || norm(t.nombre + ' ' + t.consignas.join(' ') + ' ' + t.jugadores).includes(q))
      .sort((a, b) => (b.favorita - a.favorita) || b.modificado.localeCompare(a.modificado));
    vaciar(lista);
    if (!todas.length) return lista.append(vacio('Todavía no guardaste tareas en la biblioteca.'));
    if (!ts.length) return lista.append(vacio('Ninguna tarea con esos filtros.'));
    for (const t of ts) lista.append(await tarjeta(t));
  }

  async function tarjeta(t) {
    const estrella = h(`button.estrella${t.favorita ? '.on' : ''}`, {
      'aria-label': 'Favorita',
      onclick: async e => { e.stopPropagation(); t.favorita = !t.favorita; await db.guardar('tareas', t); estrella.classList.toggle('on', t.favorita); },
    }, '★');
    const manija = modo === 'panel' ? h('span.manija', { 'aria-label': 'Arrastrar' }, '⠿') : null;
    const card = h('div.tarea', { 'data-item': '' },
      manija,
      h('button.tarea-cuerpo', { onclick: () => (modo === 'biblioteca' ? acciones(t) : alElegir?.(t)) },
        await miniaturaDe(t.pizarraId),
        h('div.tarea-info',
          h('div.tarea-nombre', t.nombre),
          h('div.tarea-tags', h('span.tag', { 'data-obj': t.objetivo }, nombreObjetivo(t.objetivo)), h('span.tag.tag-fase', nombreFase(t.fase))),
          h('div.tarea-carga', resumenCarga(t)))),
      modo !== 'elegir' ? estrella : h('span.agregar', '+'));
    if (manija) arrastrable(manija, { tarjeta: card, datos: { tareaId: t.id }, alSoltar });
    return card;
  }

  async function acciones(t) {
    const v = await menu(t.nombre, [
      { texto: '✎ Editar', valor: 'editar' },
      { texto: '📅 Agregar a una sesión', valor: 'sesion' },
      { texto: '⧉ Duplicar', valor: 'duplicar' },
      { texto: '🗑 Borrar', valor: 'borrar', peligro: true },
    ]);
    if (v === 'editar') {
      const r = await editarTarea(t, { titulo: 'Editar tarea', duenio: { tipo: 'tarea', id: t.id } });
      if (r) { await db.guardar('tareas', r); pintar(); }
    } else if (v === 'duplicar') {
      const b = nuevaTarea();
      const c = { ...structuredClone(t), id: b.id, creado: b.creado, modificado: b.modificado, dispositivo: b.dispositivo, nombre: t.nombre + ' (copia)', favorita: false };
      c.pizarraId = await clonarPizarra(t.pizarraId, { tipo: 'tarea', id: c.id });
      await db.guardar('tareas', c);
      aviso('Tarea duplicada.');
      pintar();
    } else if (v === 'borrar') {
      if (await confirmar(`¿Borrar "${t.nombre}" de la biblioteca? Las sesiones que ya la usan no cambian.`, { si: 'Borrar', peligro: true })) {
        await db.borrar('tareas', t.id);
        if (t.pizarraId) await db.borrar('pizarras', t.pizarraId);
        pintar();
      }
    } else if (v === 'sesion') {
      await agregarASesion(t);
    }
  }

  raiz.append(
    h('div.filtros',
      buscar,
      h('div.chips-fila', fav, chips(CONFIG.objetivos, filtro.obj, v => { filtro.obj = v; pintar(); })),
      chips(CONFIG.fases, filtro.fase, v => { filtro.fase = v; pintar(); })),
    lista);
  raiz.refrescar = pintar;
  pintar();
  return raiz;
}

export async function render(cont) {
  const lista = listaTareas({ modo: 'biblioteca' });
  const nueva = async () => {
    const t = nuevaTarea();
    const r = await editarTarea(t, { titulo: 'Nueva tarea', duenio: { tipo: 'tarea', id: t.id } });
    if (r) { await db.guardar('tareas', r); lista.refrescar(); }
  };
  cont.append(
    h('div.vista-cab', h('h1', 'Biblioteca'), h('span.contador', 'Tus ejercicios joya')),
    lista,
    h('button.fab', { 'aria-label': 'Nueva tarea', onclick: nueva }, '+'));
}

// Selector en hoja (para agregar desde la sesión en el celu).
export function elegirTarea() {
  let fondo;
  const p = hoja('Agregar de la biblioteca', listaTareas({ modo: 'elegir', alElegir: t => fondo.cerrar(t) }), { ancho: true });
  fondo = [...document.querySelectorAll('.hoja-fondo')].pop();
  return p;
}

// Agrega una tarea de la biblioteca a una sesión (copia + copia del diagrama).
export async function copiarASesion(t, sesion, parte, indice = null) {
  const { tareaEnSesion } = await import('../../core/model.js');
  const copia = tareaEnSesion(t);
  copia.pizarraId = await clonarPizarra(t.pizarraId, { tipo: 'sesion', id: sesion.id });
  const arr = sesion.bloques[parte] || (sesion.bloques[parte] = []);
  if (indice == null || indice > arr.length) arr.push(copia); else arr.splice(indice, 0, copia);
  return copia;
}

async function agregarASesion(t) {
  const p = plantelActivo();
  const lunes = lunesDe(isoDia(new Date()));
  const dias = Array.from({ length: 14 }, (_, i) => sumarDias(lunes, i));
  const dia = await menu('¿Qué día?', dias.map(d => ({ texto: fechaCorta(d), valor: d, activo: d === isoDia(new Date()) })));
  if (!dia) return;
  const parte = await menu('¿En qué parte?', CONFIG.partesSesion.map(x => ({ texto: x.nombre, valor: x.id })));
  if (!parte) return;
  const { obtenerOCrearSesion } = await import('./semana.js');
  const s = await obtenerOCrearSesion(p.id, dia);
  await copiarASesion(t, s, parte);
  await db.guardar('sesiones', s);
  aviso(`Agregada a la sesión del ${fechaCorta(dia)}.`, { accion: 'Ver', alTocar: () => { location.hash = `#/sesion/${s.id}`; } });
}
