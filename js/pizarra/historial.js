// ============================================================
//  Deshacer / rehacer por instantáneas.
// ============================================================
const MAX = 60;

export function crearHistorial(obtener, aplicar) {
  const atras = [], adelante = [];
  let pendiente = null;
  return {
    // Llamar antes de empezar a modificar.
    abrir() { pendiente = JSON.stringify(obtener()); },
    // Llamar al terminar: si cambió, queda registrado.
    cerrar() {
      if (pendiente == null) return false;
      const ahora = JSON.stringify(obtener());
      const cambio = ahora !== pendiente;
      if (cambio) { atras.push(pendiente); if (atras.length > MAX) atras.shift(); adelante.length = 0; }
      pendiente = null;
      return cambio;
    },
    // Volver al estado del abrir() sin registrar (gesto cancelado).
    revertir() { if (pendiente != null) aplicar(JSON.parse(pendiente)); pendiente = null; },
    deshacer() {
      if (!atras.length) return false;
      adelante.push(JSON.stringify(obtener()));
      aplicar(JSON.parse(atras.pop()));
      return true;
    },
    rehacer() {
      if (!adelante.length) return false;
      atras.push(JSON.stringify(obtener()));
      aplicar(JSON.parse(adelante.pop()));
      return true;
    },
    puedeDeshacer: () => atras.length > 0,
    puedeRehacer: () => adelante.length > 0,
  };
}
