// ============================================================
//  Vista de la sesión lista para imprimir o guardar en PDF.
// ============================================================
import * as db from '../../core/db.js';
import { CONFIG } from '../../../config.js';
import { lunesDe, duracionTarea } from '../../core/model.js';
import { h, vacio, fechaLarga } from '../../core/ui.js';
import { aDataURL } from '../../pizarra/exportar.js';
import { obtenerSemana, mdDelDia, partidoReferencia } from './semana.js';
import { nombreObjetivo, nombreFase } from './tarea-form.js';

export async function render(cont, [id]) {
  const s = await db.obtener('sesiones', id);
  if (!s) return cont.append(vacio('No se encontró la sesión.'));
  const plantel = await db.obtener('planteles', s.plantelId);
  const lunes = lunesDe(s.fecha);
  const sem = await obtenerSemana(s.plantelId, lunes);
  const md = mdDelDia(sem, s.fecha, await partidoReferencia(s.plantelId, lunes));
  const tipo = sem.dias?.[s.fecha]?.tipo;
  const todas = Object.values(s.bloques).flat();
  const total = todas.reduce((a, t) => a + duracionTarea(t), 0);
  const esIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  const hoja = h('div.impresion',
    h('header.imp-cab',
      h('img.imp-escudo', { src: CONFIG.club.escudo, alt: '' }),
      h('div',
        h('div.imp-club', [CONFIG.club.nombre, plantel?.nombre].filter(Boolean).join(' · ')),
        h('h1', fechaLarga(s.fecha)),
        h('div.imp-meta', [md, tipo, `${todas.length} tarea${todas.length === 1 ? '' : 's'}`, total ? `${total} min` : ''].filter(Boolean).join(' · ')))));

  for (const p of CONFIG.partesSesion) {
    const arr = s.bloques[p.id] || [];
    if (!arr.length) continue;
    hoja.append(h('h2.imp-parte', p.nombre, h('span', ` ${arr.reduce((a, t) => a + duracionTarea(t), 0)}'`)));
    for (const t of arr) {
      const piz = t.pizarraId ? await db.obtener('pizarras', t.pizarraId) : null;
      const img = piz && piz.elementos.length ? h('img.imp-diag', { src: aDataURL(piz, 0, 1100), alt: '' }) : null;
      const dato = (k, v) => v ? h('div.imp-dato', h('b', k), ' ', v) : null;
      const listado = (titulo, arr2) => arr2?.length ? h('div.imp-lista', h('b', titulo), h('ul', arr2.map(x => h('li', x)))) : null;
      hoja.append(h('article.imp-tarea',
        h('h3', t.nombre),
        h('div.imp-tags', nombreObjetivo(t.objetivo), ' · ', nombreFase(t.fase)),
        h('div.imp-cuerpo',
          img,
          h('div.imp-datos',
            dato('Duración', t.duracion && `${t.duracion}'`),
            dato('Series × reps', (t.series || t.reps) && `${t.series || 1} × ${t.reps || '–'}`),
            dato('Pausa', t.pausa),
            dato('Espacio', t.espacio?.largo && t.espacio?.ancho && `${t.espacio.largo} × ${t.espacio.ancho} m`),
            dato('Jugadores', t.jugadores),
            listado('Consignas', t.consignas),
            listado('Reglas', t.reglas),
            listado('Variantes', t.variantes)))));
    }
  }
  if (s.notas) hoja.append(h('div.imp-notas', h('b', 'Notas: '), s.notas));
  if (!todas.length) hoja.append(h('p', 'La sesión no tiene tareas.'));

  cont.append(
    h('div.imp-barra.no-print',
      h('a.volver', { href: `#/sesion/${s.id}` }, '‹ Sesión'),
      h('button.btn.btn-prim', { onclick: () => window.print() }, '🖨 Imprimir / Guardar PDF')),
    esIOS ? h('p.nota.no-print', 'En iPhone/iPad: en la vista previa de impresión, tocá Compartir → Guardar en Archivos para tener el PDF. Si el botón no abre nada, abrí la app en Safari y probá desde ahí.') : '',
    hoja);
}
