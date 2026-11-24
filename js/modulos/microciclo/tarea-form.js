// ============================================================
//  Formulario de TAREA (biblioteca o copia dentro de una sesión).
// ============================================================
import * as db from '../../core/db.js';
import { CONFIG } from '../../../config.js';
import { nuevaPizarra, uid } from '../../core/model.js';
import { h, hoja, campo, select, aviso, lineas } from '../../core/ui.js';
import { abrirPizarra } from '../../pizarra/editor.js';
import { miniatura } from '../../pizarra/render.js';
import { jugadoresActivos } from '../../core/estado.js';

// Copia una pizarra (para que la sesión tenga la suya propia).
export async function clonarPizarra(id, duenio) {
  const p = id ? await db.obtener('pizarras', id) : null;
  if (!p) return null;
  const c = structuredClone(p);
  const t = new Date().toISOString();
  Object.assign(c, { id: uid(), creado: t, modificado: t, duenio });
  await db.guardar('pizarras', c);
  return c.id;
}

export async function miniaturaDe(pizarraId, clase = 'mini') {
  const cv = h(`canvas.${clase}`);
  if (!pizarraId) { cv.classList.add('sin-diagrama'); return cv; }
  const p = await db.obtener('pizarras', pizarraId);
  if (!p || !p.elementos.length) { cv.classList.add('sin-diagrama'); }
  if (p) { cv._piz = p; observador.observe(cv); }
  return cv;
}

// Dibuja cada miniatura cuando ya tiene tamaño en pantalla.
const observador = new ResizeObserver(entradas => {
  for (const e of entradas) {
    if (e.contentRect.width > 0 && e.target._piz) miniatura(e.target, e.target._piz);
  }
});

// Devuelve la tarea editada (objeto) o null si se canceló.
// duenio: { tipo: 'tarea'|'sesion', id }
export async function editarTarea(tarea, { titulo = 'Tarea', duenio } = {}) {
  const t = structuredClone(tarea);
  let pizarraCreada = null;

  const f = {
    nombre: h('input.campo', { value: t.nombre, placeholder: 'Ej: Rondo 4v2 + 2 comodines', autocomplete: 'off' }),
    objetivo: select(CONFIG.objetivos, t.objetivo),
    fase: select(CONFIG.fases, t.fase),
    largo: h('input.campo', { type: 'number', inputmode: 'decimal', value: t.espacio?.largo ?? '', placeholder: 'm' }),
    ancho: h('input.campo', { type: 'number', inputmode: 'decimal', value: t.espacio?.ancho ?? '', placeholder: 'm' }),
    duracion: h('input.campo', { type: 'number', inputmode: 'numeric', value: t.duracion, placeholder: 'min' }),
    series: h('input.campo', { type: 'number', inputmode: 'numeric', value: t.series }),
    reps: h('input.campo', { type: 'text', value: t.reps, placeholder: 'Ej: 4 o 3\'' }),
    pausa: h('input.campo', { type: 'text', value: t.pausa, placeholder: 'Ej: 1\'30"' }),
    jugadores: h('input.campo', { type: 'text', value: t.jugadores, placeholder: 'Ej: 4v4+2' }),
    consignas: h('textarea.campo', { rows: 3, placeholder: 'Una por renglón' }, (t.consignas || []).join('\n')),
    reglas: h('textarea.campo', { rows: 3, placeholder: 'Una por renglón' }, (t.reglas || []).join('\n')),
    variantes: h('textarea.campo', { rows: 3, placeholder: 'Una por renglón' }, (t.variantes || []).join('\n')),
  };

  const diag = h('div.diag-prev');
  const pintarDiag = async () => {
    diag.innerHTML = '';
    diag.append(await miniaturaDe(t.pizarraId, 'mini-grande'));
    diag.append(h('button.btn.btn-acento', { type: 'button', onclick: abrirDiag }, t.pizarraId ? '✎ Editar diagrama' : '+ Dibujar diagrama'));
  };
  const abrirDiag = async () => {
    if (!t.pizarraId) {
      const L = parseFloat(f.largo.value), A = parseFloat(f.ancho.value);
      const p = nuevaPizarra(duenio, L && A ? 'reducido' : 'completa');
      if (L && A) p.espacio = { tipo: 'reducido', largo: L, ancho: A };
      await db.guardar('pizarras', p);
      t.pizarraId = pizarraCreada = p.id;
    }
    const jugadores = await jugadoresActivos();
    await abrirPizarra(t.pizarraId, { titulo: f.nombre.value.trim() || 'Tarea', jugadores });
    pintarDiag();
  };
  await pintarDiag();

  const r = await hoja(titulo, h('div.form-grilla',
    campo('Nombre', f.nombre),
    h('div.form-fila', campo('Objetivo', f.objetivo), campo('Fase del juego', f.fase)),
    h('div.diag-campo', h('span.form-etq', 'Diagrama'), diag),
    h('div.form-fila', campo('Largo', f.largo), campo('Ancho', f.ancho), campo('Jugadores', f.jugadores)),
    h('div.form-fila', campo('Duración (min)', f.duracion), campo('Series', f.series), campo('Reps / tiempo', f.reps), campo('Pausa', f.pausa)),
    campo('Consignas', f.consignas),
    campo('Reglas', f.reglas),
    campo('Variantes', f.variantes)), {
    ancho: true,
    botones: [
      { texto: 'Cancelar', valor: null, clase: 'btn-sec' },
      { texto: 'Guardar', clase: 'btn-prim', accion: () => {
        if (!f.nombre.value.trim()) { aviso('Poné un nombre a la tarea.'); return false; }
        return 'ok';
      } },
    ],
  });

  if (r !== 'ok') {
    if (pizarraCreada) await db.borrar('pizarras', pizarraCreada);
    return null;
  }
  Object.assign(t, {
    nombre: f.nombre.value.trim(),
    objetivo: f.objetivo.value, fase: f.fase.value,
    espacio: { largo: f.largo.value, ancho: f.ancho.value },
    duracion: f.duracion.value, series: f.series.value, reps: f.reps.value.trim(), pausa: f.pausa.value.trim(),
    jugadores: f.jugadores.value.trim(),
    consignas: lineas(f.consignas.value), reglas: lineas(f.reglas.value), variantes: lineas(f.variantes.value),
  });
  // nombre de la pizarra = nombre de la tarea
  if (t.pizarraId) { const p = await db.obtener('pizarras', t.pizarraId); if (p && p.nombre !== t.nombre) { p.nombre = t.nombre; await db.guardar('pizarras', p); } }
  return t;
}

export const nombreObjetivo = id => CONFIG.objetivos.find(o => o.id === id)?.nombre || '';
export const nombreFase = id => CONFIG.fases.find(o => o.id === id)?.nombre || '';

export function resumenCarga(t) {
  const p = [];
  if (t.duracion) p.push(`${t.duracion}'`);
  if (t.series || t.reps) p.push(`${t.series || 1}×${t.reps || '–'}`);
  if (t.pausa) p.push(`p ${t.pausa}`);
  if (t.espacio?.largo && t.espacio?.ancho) p.push(`${t.espacio.largo}×${t.espacio.ancho} m`);
  if (t.jugadores) p.push(t.jugadores);
  return p.join(' · ');
}
