// ============================================================
//  Estado global mínimo: plantel activo.
// ============================================================
import * as db from './db.js';

let plantel = null;
const oyentes = new Set();

export const plantelActivo = () => plantel;

export async function cargarPlantel() {
  const lista = await db.todos('planteles');
  const id = await db.ajuste('plantelActivo');
  plantel = lista.find(p => p.id === id) || lista[0] || null;
  return plantel;
}

export async function setPlantel(p) {
  plantel = p;
  await db.ajuste('plantelActivo', p?.id || null);
  oyentes.forEach(f => f(p));
}

export const alCambiarPlantel = f => { oyentes.add(f); return () => oyentes.delete(f); };

export async function jugadoresActivos() {
  if (!plantel) return [];
  return db.porIndice('jugadores', 'plantelId', plantel.id);
}
