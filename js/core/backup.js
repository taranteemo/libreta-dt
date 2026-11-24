// ============================================================
//  Backup completo en JSON + recordatorio.
// ============================================================
import { STORES, SCHEMA_VERSION, migrar } from './model.js';
import * as db from './db.js';
import { CONFIG } from '../../config.js';
import { entregarArchivo, elegirArchivo, blobABase64, base64ABlob, hoyArchivo } from './archivos.js';
import { aviso, confirmar } from './ui.js';

export async function exportarBackup() {
  const stores = {};
  for (const nombre of Object.keys(STORES)) {
    const regs = await db.todos(nombre, { incluirBorrados: true });
    if (nombre === 'assets') {
      stores[nombre] = await Promise.all(regs.map(async a => ({ ...a, blob: a.blob ? await blobABase64(a.blob) : null })));
    } else stores[nombre] = regs;
  }
  const data = {
    tipo: 'backup',
    app: CONFIG.app.nombre,
    v: SCHEMA_VERSION,
    fecha: new Date().toISOString(),
    stores,
  };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const slug = CONFIG.app.nombre.toLowerCase().replace(/\W+/g, '-');
  const r = await entregarArchivo(blob, `${slug}-backup-${hoyArchivo()}.json`, { titulo: 'Backup' });
  if (r !== 'cancelado') {
    await db.ajuste('ultimoBackup', new Date().toISOString());
    aviso('Backup listo ✔');
    document.dispatchEvent(new CustomEvent('backup-hecho'));
  }
}

// Combina por id: si el registro ya existe, gana el modificado más reciente.
export async function importarBackup() {
  const file = await elegirArchivo('.json,application/json');
  if (!file) return false;
  let data;
  try { data = JSON.parse(await file.text()); } catch { aviso('El archivo no es un backup válido.'); return false; }
  if (data.tipo !== 'backup' || !data.stores) { aviso('El archivo no es un backup de la app.'); return false; }
  if ((data.v || 1) > SCHEMA_VERSION) { aviso('El backup es de una versión más nueva. Actualizá la app.'); return false; }
  const ok = await confirmar(`Importar backup del ${new Date(data.fecha).toLocaleString('es-AR')}. Se combina con lo que tenés: si un dato está en los dos, se queda el más reciente.`, { si: 'Importar' });
  if (!ok) return false;
  let n = 0;
  for (const [nombre, regs] of Object.entries(data.stores)) {
    if (!(nombre in STORES)) continue;
    for (let reg of regs) {
      reg = migrar(nombre, reg);
      const actual = await db.obtenerCrudo(nombre, reg.id);
      if (actual && actual.modificado >= reg.modificado) continue;
      if (nombre === 'assets' && typeof reg.blob === 'string') reg.blob = await base64ABlob(reg.blob);
      await db.guardar(nombre, reg, { crudo: true });
      n++;
    }
  }
  aviso(`Backup importado: ${n} registros.`);
  return true;
}

export async function diasSinBackup() {
  const u = await db.ajuste('ultimoBackup');
  if (!u) return Infinity;
  return Math.floor((Date.now() - new Date(u)) / 86400000);
}
