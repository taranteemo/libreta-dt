// ============================================================
//  PLANTEL: lista, filtros y cambio rápido de estado.
// ============================================================
import * as db from '../../core/db.js';
import { CONFIG } from '../../../config.js';
import { h, vaciar, chips, menu, vacio } from '../../core/ui.js';
import { plantelActivo } from '../../core/estado.js';
import { editarJugador, urlFoto } from './jugador-form.js';

const filtros = { pos: [], est: [] };

export async function render(cont) {
  const p = plantelActivo();
  if (!p) return cont.append(vacio('No hay plantel.'));
  const lista = h('div.lista-jug');
  const contador = h('span.contador');

  const pintar = async () => {
    const todos = await db.porIndice('jugadores', 'plantelId', p.id);
    const orden = CONFIG.posiciones.map(x => x.id);
    const jugs = todos
      .filter(j => !filtros.pos.length || filtros.pos.includes(j.posicion) || filtros.pos.includes(j.posicion2))
      .filter(j => !filtros.est.length || filtros.est.includes(j.estado))
      .sort((a, b) => (orden.indexOf(a.posicion) + 1 || 99) - (orden.indexOf(b.posicion) + 1 || 99) || (Number(a.dorsal) || 99) - (Number(b.dorsal) || 99));
    const disp = todos.filter(j => j.estado === 'disponible').length;
    contador.textContent = `${disp} disponibles de ${todos.length}`;
    vaciar(lista);
    if (!todos.length) return lista.append(vacio('Todavía no cargaste jugadores.', h('button.btn.btn-prim', { onclick: nuevo }, '+ Agregar jugador')));
    if (!jugs.length) return lista.append(vacio('Ningún jugador con esos filtros.'));
    for (const j of jugs) lista.append(await tarjeta(j));
  };

  const tarjeta = async (j) => {
    const est = CONFIG.estados.find(e => e.id === j.estado) || CONFIG.estados[0];
    const foto = await urlFoto(j.fotoId);
    return h('div.jug', { 'data-estado': j.estado },
      h('button.jug-cuerpo', { onclick: async () => { if (await editarJugador(j)) pintar(); } },
        foto ? h('img.jug-foto', { src: foto, alt: '' }) : h('div.jug-dorsal', j.dorsal || '–'),
        h('div.jug-info',
          h('div.jug-nombre', foto && j.dorsal ? h('b', j.dorsal + ' ') : null, j.apodo || j.nombre || 'Sin nombre'),
          h('div.jug-sub', [j.posicion, j.posicion2].filter(Boolean).join(' / ') || 'Sin posición',
            j.apodo && j.nombre ? ` · ${j.nombre}` : '', j.pie ? ` · ${({ D: 'Der', I: 'Izq', A: 'Ambi' })[j.pie]}` : ''))),
      h('button.estado', {
        style: { '--c': est.color },
        onclick: async () => {
          const v = await menu(j.apodo || j.nombre, CONFIG.estados.map(e => ({ texto: e.nombre, valor: e.id, color: e.color, activo: e.id === j.estado })));
          if (v && v !== j.estado) { j.estado = v; await db.guardar('jugadores', j); pintar(); }
        },
      }, est.nombre));
  };

  const nuevo = async () => { if (await editarJugador(null)) pintar(); };

  cont.append(
    h('div.vista-cab', h('h1', 'Plantel'), contador),
    h('div.filtros',
      chips(CONFIG.posiciones.map(x => ({ id: x.id, nombre: x.id })), filtros.pos, v => { filtros.pos = v; pintar(); }),
      chips(CONFIG.estados, filtros.est, v => { filtros.est = v; pintar(); })),
    lista,
    h('button.fab', { 'aria-label': 'Agregar jugador', onclick: nuevo }, '+'));
  await pintar();
}
