// ============================================================
//  Capa de IndexedDB, sin librerías.
// ============================================================
import { STORES, migrar, tocar } from './model.js';

const DB_NAME = 'libreta-dt';
const DB_VERSION = 1;
let dbp = null;

function req(r) {
  return new Promise((ok, mal) => { r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); });
}

export function abrir() {
  if (dbp) return dbp;
  dbp = new Promise((ok, mal) => {
    const r = indexedDB.open(DB_NAME, DB_VERSION);
    r.onupgradeneeded = () => {
      const db = r.result;
      for (const [nombre, indices] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(nombre)) {
          const s = db.createObjectStore(nombre, { keyPath: 'id' });
          indices.forEach(i => s.createIndex(i, i));
        }
      }
      if (!db.objectStoreNames.contains('ajustes')) db.createObjectStore('ajustes');
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
    r.onblocked = () => mal(new Error('Base bloqueada: cerrá otras pestañas de la app.'));
  });
  return dbp;
}

async function tx(store, modo = 'readonly') {
  const db = await abrir();
  return db.transaction(store, modo).objectStore(store);
}

export async function obtener(store, id) {
  if (!id) return null;
  const r = await req((await tx(store)).get(id));
  return r && !r.borrado ? migrar(store, r) : null;
}

export async function obtenerCrudo(store, id) {
  return req((await tx(store)).get(id));
}

export async function todos(store, { incluirBorrados = false } = {}) {
  const r = await req((await tx(store)).getAll());
  return r.filter(x => incluirBorrados || !x.borrado).map(x => migrar(store, x));
}

export async function porIndice(store, indice, valor) {
  const s = await tx(store);
  const r = await req(s.index(indice).getAll(valor));
  return r.filter(x => !x.borrado).map(x => migrar(store, x));
}

// guardar actualiza fecha de modificación; usar crudo=true para importar sin tocar.
export async function guardar(store, reg, { crudo = false } = {}) {
  if (!crudo) tocar(reg);
  await req((await tx(store, 'readwrite')).put(reg));
  return reg;
}

export async function borrar(store, id) {
  const s = await tx(store, 'readwrite');
  const r = await req(s.get(id));
  if (!r) return;
  r.borrado = new Date().toISOString();
  tocar(r);
  await req(s.put(r));
}

export async function ajuste(clave, valor) {
  if (valor === undefined) return req((await tx('ajustes')).get(clave));
  return req((await tx('ajustes', 'readwrite')).put(valor, clave));
}

export async function contar(store) {
  return (await todos(store)).length;
}
