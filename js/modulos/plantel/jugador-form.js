// ============================================================
//  Alta / edición de jugador.
// ============================================================
import * as db from '../../core/db.js';
import { CONFIG } from '../../../config.js';
import { nuevoJugador, nuevoAsset } from '../../core/model.js';
import { h, hoja, campo, select, confirmar, aviso } from '../../core/ui.js';
import { plantelActivo } from '../../core/estado.js';
import { achicarImagen, elegirArchivo } from '../../core/archivos.js';

const cacheUrls = new Map();
export async function urlFoto(id) {
  if (!id) return null;
  if (cacheUrls.has(id)) return cacheUrls.get(id);
  const a = await db.obtener('assets', id);
  if (!a?.blob) return null;
  const u = URL.createObjectURL(a.blob);
  cacheUrls.set(id, u);
  return u;
}

export async function editarJugador(jug) {
  const esNuevo = !jug;
  const j = jug ? structuredClone(jug) : nuevoJugador(plantelActivo().id);
  const posOpc = [['', '—'], ...CONFIG.posiciones.map(p => [p.id, `${p.id} · ${p.nombre}`])];

  const f = {
    nombre: h('input.campo', { value: j.nombre, placeholder: 'Nombre y apellido', autocomplete: 'off' }),
    apodo: h('input.campo', { value: j.apodo, placeholder: 'Cómo le dicen', autocomplete: 'off' }),
    dorsal: h('input.campo', { type: 'number', inputmode: 'numeric', min: 1, max: 99, value: j.dorsal }),
    anio: h('input.campo', { type: 'number', inputmode: 'numeric', min: 1990, max: 2030, value: j.anio, placeholder: 'Ej: 2009' }),
    posicion: select(posOpc, j.posicion),
    posicion2: select(posOpc, j.posicion2),
    pie: select([['D', 'Derecho'], ['I', 'Izquierdo'], ['A', 'Ambidiestro']], j.pie),
    estado: select(CONFIG.estados, j.estado),
    notas: h('textarea.campo', { rows: 3, placeholder: 'Notas' }, j.notas),
  };

  let fotoNueva = null, quitarFoto = false;
  const prev = h('div.foto-prev');
  const pintarFoto = async () => {
    prev.innerHTML = '';
    const u = fotoNueva ? URL.createObjectURL(fotoNueva) : (!quitarFoto && await urlFoto(j.fotoId));
    if (u) prev.append(h('img', { src: u, alt: '' }));
    else prev.append(h('span', '📷'));
  };
  await pintarFoto();
  const fotoBtns = h('div.foto-btns',
    h('button.btn.btn-sec.btn-chico', { type: 'button', onclick: async () => {
      const file = await elegirArchivo('image/*');
      if (!file) return;
      try { fotoNueva = await achicarImagen(file); quitarFoto = false; pintarFoto(); } catch { aviso('No se pudo leer la imagen.'); }
    } }, 'Elegir foto'),
    h('button.btn.btn-sec.btn-chico', { type: 'button', onclick: () => { fotoNueva = null; quitarFoto = true; pintarFoto(); } }, 'Quitar'));

  const botones = [];
  if (!esNuevo) botones.push({ texto: 'Borrar', clase: 'btn-peligro-txt', accion: async () => {
    if (!(await confirmar(`¿Borrar a ${j.apodo || j.nombre}?`, { si: 'Borrar', peligro: true }))) return false;
    await db.borrar('jugadores', j.id);
    return 'borrado';
  } });
  botones.push({ texto: 'Guardar', clase: 'btn-prim', accion: async () => {
    if (!f.nombre.value.trim() && !f.apodo.value.trim()) { aviso('Poné al menos el nombre o el apodo.'); return false; }
    for (const k of Object.keys(f)) j[k] = f[k].value.trim?.() ?? f[k].value;
    if (fotoNueva) {
      const a = nuevoAsset('foto', 'image/jpeg', fotoNueva);
      await db.guardar('assets', a);
      j.fotoId = a.id;
    } else if (quitarFoto) { j.fotoId = null; }
    await db.guardar('jugadores', j);
    return 'guardado';
  } });

  const r = await hoja(esNuevo ? 'Nuevo jugador' : 'Editar jugador', h('div.form-grilla',
    h('div.foto-fila', prev, fotoBtns),
    campo('Nombre', f.nombre),
    h('div.form-fila', campo('Apodo', f.apodo), campo('Dorsal', f.dorsal)),
    h('div.form-fila', campo('Posición', f.posicion), campo('Secundaria', f.posicion2)),
    h('div.form-fila', campo('Pie hábil', f.pie), campo('Año', f.anio)),
    campo('Estado', f.estado),
    campo('Notas', f.notas)), { botones });
  return r === 'guardado' || r === 'borrado';
}
