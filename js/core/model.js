// ============================================================
//  MODELO DE DATOS — esquema, fábricas y migraciones.
//  Todo registro lleva la "base": id, creado, modificado, v,
//  dispositivo y borrado (borrado lógico, para sincronizar a futuro).
// ============================================================
import { CONFIG } from '../../config.js';

export const SCHEMA_VERSION = 1;

export const STORES = {
  planteles: ['plantelId'],
  jugadores: ['plantelId'],
  tareas: ['plantelId'],
  semanas: ['plantelId'],
  sesiones: ['plantelId', 'semanaId'],
  pizarras: [],
  partidos: ['plantelId'],
  rivales: ['plantelId'],
  assets: [],
};
// 'ajustes' es un store clave/valor aparte (no sincronizable).

let deviceId = null;
export function setDeviceId(id) { deviceId = id; }

export const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      }));

export const ahora = () => new Date().toISOString();

export function base(extra = {}) {
  const t = ahora();
  return { id: uid(), creado: t, modificado: t, v: SCHEMA_VERSION, dispositivo: deviceId, borrado: null, ...extra };
}

export function tocar(reg) {
  reg.modificado = ahora();
  reg.v = SCHEMA_VERSION;
  reg.dispositivo = deviceId;
  return reg;
}

// ---------- Fábricas ----------

export const nuevoPlantel = (d = {}) => base({
  nombre: d.nombre || 'Mi plantel',
  categoria: d.categoria || '',
  temporada: d.temporada || new Date().getFullYear(),
});

export const nuevoJugador = (plantelId, d = {}) => base({
  plantelId,
  nombre: '', apodo: '', dorsal: '',
  posicion: '', posicion2: '', pie: 'D', anio: '',
  fotoId: null, estado: 'disponible', notas: '',
  ...d,
});

export const nuevaTarea = (d = {}) => base({
  plantelId: null,
  nombre: '', objetivo: 'tactico', fase: 'general',
  espacio: { largo: '', ancho: '' },
  duracion: '', series: '', reps: '', pausa: '',
  jugadores: '',
  consignas: [], reglas: [], variantes: [],
  pizarraId: null, favorita: false, tags: [],
  ...d,
});

// Copia de una tarea dentro de una sesión (no es un registro aparte).
export function tareaEnSesion(tarea) {
  const { id, creado, modificado, v, dispositivo, borrado, plantelId, favorita, tags, ...campos } = tarea;
  return {
    idLocal: uid(),
    origenTareaId: tarea.id || null,
    ...structuredClone(campos),
    division: null, // fase 2
  };
}

export function nuevaSemana(plantelId, inicio) {
  return base({ plantelId, inicio, partidoId: null, partidoFecha: '', partidoRival: '', dias: {} });
  // dias: { 'YYYY-MM-DD': { md: 'MD-3'|null (null = automático), tipo: '' } }
}

export function nuevaSesion(plantelId, semanaId, fecha) {
  const bloques = {};
  CONFIG.partesSesion.forEach(p => { bloques[p.id] = []; });
  return base({ plantelId, semanaId, fecha, notas: '', bloques });
}

export function nuevaPizarra(duenio, espacioTipo = 'completa') {
  const med = CONFIG.cancha[espacioTipo] || CONFIG.cancha.completa;
  return base({
    duenio: duenio || { tipo: 'suelta', id: null },
    nombre: '',
    espacio: { tipo: espacioTipo, largo: med.largo, ancho: med.ancho },
    elementos: [],
    cuadros: [{ id: uid(), duracion: 1, estados: {} }],
    reproduccion: { velocidad: 1, bucle: false },
  });
}

export const nuevoAsset = (tipo, mime, blob) => base({ tipo, mime, blob });

// ---------- Migraciones ----------
// migraciones[n] lleva un registro de la versión n a la n+1.
export const migraciones = {
  // 1: (store, reg) => { ...; return reg; },
};

export function migrar(store, reg) {
  let r = reg;
  let v = r.v || 1;
  while (v < SCHEMA_VERSION) {
    const fn = migraciones[v];
    if (fn) r = fn(store, r);
    v++;
    r.v = v;
  }
  return r;
}

// ---------- Utilidades de dominio ----------

export function lunesDe(fecha) {
  const d = new Date(fecha + 'T12:00:00');
  const dia = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - dia);
  return isoDia(d);
}

export function isoDia(d) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function sumarDias(iso, n) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return isoDia(d);
}

export function difDias(a, b) {
  return Math.round((new Date(a + 'T12:00:00') - new Date(b + 'T12:00:00')) / 86400000);
}

// MD automático de un día respecto de la fecha de partido.
export function mdAuto(dia, partidoFecha) {
  if (!partidoFecha) return null;
  const d = difDias(dia, partidoFecha);
  if (d === 0) return 'MD';
  if (d < 0 && d >= -6) return `MD${d}`;
  if (d > 0 && d <= 2) return `MD+${d}`;
  return null;
}

export const MD_OPCIONES = ['MD-6', 'MD-5', 'MD-4', 'MD-3', 'MD-2', 'MD-1', 'MD', 'MD+1', 'MD+2', 'LIBRE'];

export function duracionTarea(t) {
  return Number(t.duracion) || 0;
}
