// ============================================================
//  Service worker: registro y aviso de versión nueva.
// ============================================================
import { aviso } from './ui.js';

export function registrarSW() {
  if (!('serviceWorker' in navigator)) return;
  let recargando = false;
  // En la primera visita no hay controlador: no recargar cuando el SW toma el control.
  const habiaControlador = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (recargando || !habiaControlador) return;
    recargando = true;
    location.reload();
  });

  navigator.serviceWorker.register('./sw.js').then(reg => {
    const ofrecer = (sw) => aviso('Hay una versión nueva.', {
      accion: 'Actualizar', duracion: 0,
      alTocar: () => sw.postMessage({ tipo: 'SKIP_WAITING' }),
    });
    if (reg.waiting && navigator.serviceWorker.controller) ofrecer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nuevo = reg.installing;
      nuevo?.addEventListener('statechange', () => {
        if (nuevo.state === 'installed' && navigator.serviceWorker.controller) ofrecer(nuevo);
      });
    });
    // Buscar versión nueva al volver a la app.
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(e => console.warn('SW no registrado', e));
}
