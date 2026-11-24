// ============================================================
//  MICROCICLO: vista de la semana con días referidos al partido.
// ============================================================
import * as db from '../../core/db.js';
import { CONFIG } from '../../../config.js';
import { nuevaSemana, nuevaSesion, lunesDe, isoDia, sumarDias, mdAuto, MD_OPCIONES, duracionTarea } from '../../core/model.js';
import { h, vaciar, menu, pedirTexto, vacio } from '../../core/ui.js';
import { plantelActivo } from '../../core/estado.js';

export async function obtenerSemana(plantelId, lunes) {
  const ss = await db.porIndice('semanas', 'plantelId', plantelId);
  return ss.find(s => s.inicio === lunes) || nuevaSemana(plantelId, lunes);
}

export async function obtenerOCrearSesion(plantelId, fecha) {
  const ss = await db.porIndice('sesiones', 'plantelId', plantelId);
  let s = ss.find(x => x.fecha === fecha);
  if (s) return s;
  const sem = await obtenerSemana(plantelId, lunesDe(fecha));
  await db.guardar('semanas', sem);
  s = nuevaSesion(plantelId, sem.id, fecha);
  await db.guardar('sesiones', s);
  return s;
}

// El partido de referencia: el de esta semana, o si no hay, el de la semana siguiente.
export async function partidoReferencia(plantelId, lunes) {
  const ss = await db.porIndice('semanas', 'plantelId', plantelId);
  const esta = ss.find(s => s.inicio === lunes);
  if (esta?.partidoFecha) return esta.partidoFecha;
  const sig = ss.find(s => s.inicio === sumarDias(lunes, 7));
  return sig?.partidoFecha || '';
}

export function mdDelDia(sem, dia, partidoFecha) {
  const d = sem.dias?.[dia];
  if (d?.md) return d.md;
  return mdAuto(dia, partidoFecha);
}

export async function render(cont, [fechaParam]) {
  const p = plantelActivo();
  if (!p) return cont.append(vacio('No hay plantel.'));
  const hoy = isoDia(new Date());
  const lunes = lunesDe(fechaParam || hoy);
  const sem = await obtenerSemana(p.id, lunes);
  const sesiones = (await db.porIndice('sesiones', 'plantelId', p.id)).filter(s => s.fecha >= lunes && s.fecha <= sumarDias(lunes, 6));
  const ref = await partidoReferencia(p.id, lunes);

  const guardarSem = () => db.guardar('semanas', sem);
  const ir = d => { location.hash = `#/semana/${d}`; };

  const fechaPartido = h('input.campo', {
    type: 'date', value: sem.partidoFecha || '',
    onchange: async e => { sem.partidoFecha = e.target.value; await guardarSem(); ir(lunes); },
  });
  const rival = h('input.campo', {
    value: sem.partidoRival || '', placeholder: 'Rival',
    onchange: async e => { sem.partidoRival = e.target.value.trim(); await guardarSem(); },
  });

  const lista = h('div.semana');
  for (let i = 0; i < 7; i++) {
    const dia = sumarDias(lunes, i);
    const info = sem.dias?.[dia] || {};
    const md = mdDelDia(sem, dia, ref);
    const ses = sesiones.find(s => s.fecha === dia);
    const nTareas = ses ? Object.values(ses.bloques).flat().length : 0;
    const minutos = ses ? Object.values(ses.bloques).flat().reduce((a, t) => a + duracionTarea(t), 0) : 0;
    const d = new Date(dia + 'T12:00:00');
    lista.append(h(`div.dia${dia === hoy ? '.hoy' : ''}${md === 'LIBRE' ? '.libre' : ''}${md === 'MD' ? '.partido' : ''}`,
      h('div.dia-fecha',
        h('span.dia-sem', d.toLocaleDateString('es-AR', { weekday: 'short' }).replace('.', '')),
        h('span.dia-num', d.getDate())),
      h('button.md', {
        'data-md': md || '',
        onclick: async () => {
          const v = await menu('Día respecto del partido', [
            { texto: 'Automático', valor: '__auto', activo: !info.md },
            ...MD_OPCIONES.map(m => ({ texto: m, valor: m, activo: info.md === m })),
          ]);
          if (!v) return;
          sem.dias = sem.dias || {};
          sem.dias[dia] = { ...info, md: v === '__auto' ? null : v };
          await guardarSem(); ir(lunes);
        },
      }, md || '—', info.md ? h('small', ' ✎') : null),
      h('button.dia-cuerpo', {
        onclick: async () => {
          if (md === 'MD') return;
          const s = await obtenerOCrearSesion(p.id, dia);
          location.hash = `#/sesion/${s.id}`;
        },
      },
        md === 'MD' ? h('div.dia-tit', '⚽ Partido', sem.partidoRival ? ` vs ${sem.partidoRival}` : '')
          : ses && nTareas ? [h('div.dia-tit', `${nTareas} tarea${nTareas > 1 ? 's' : ''}`, minutos ? ` · ${minutos}'` : ''),
              h('div.dia-sub', Object.values(ses.bloques).flat().map(t => t.nombre).join(' · '))]
          : h('div.dia-sub.vacio-dia', md === 'LIBRE' ? 'Libre' : '+ Planificar sesión')),
      h('button.dia-tipo', {
        onclick: async () => {
          const v = await pedirTexto('Tipo de sesión', info.tipo || '', { placeholder: 'Ej: Tensión, Recuperación…' });
          if (v == null) return;
          sem.dias = sem.dias || {};
          sem.dias[dia] = { ...info, tipo: v.trim() };
          await guardarSem(); ir(lunes);
        },
      }, info.tipo || '＋ tipo')));
  }

  const lunesTxt = new Date(lunes + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  cont.append(
    h('div.vista-cab',
      h('h1', 'Semana'),
      h('div.sem-nav',
        h('button.btn-icono', { 'aria-label': 'Semana anterior', onclick: () => ir(sumarDias(lunes, -7)) }, '◀'),
        h('button.sem-txt', { onclick: () => ir(hoy) }, `Lun ${lunesTxt}`),
        h('button.btn-icono', { 'aria-label': 'Semana siguiente', onclick: () => ir(sumarDias(lunes, 7)) }, '▶'))),
    h('div.partido-sem',
      h('label.form-campo', h('span.form-etq', 'Partido'), fechaPartido),
      h('label.form-campo', h('span.form-etq', 'Rival'), rival)),
    !sem.partidoFecha && ref ? h('p.nota', `MD calculados con el partido del ${new Date(ref + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric' })}.`) : '',
    lista,
    h('div.acciones-pie', h('button.btn.btn-sec.no-print', { onclick: () => window.print() }, '🖨 Imprimir semana')));
}
