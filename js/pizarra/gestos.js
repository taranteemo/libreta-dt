// ============================================================
//  Gestos con pointer events:
//  1 dedo → acción de la herramienta (alInicio/alMover/alFin)
//  2 dedos → zoom y paneo (cancela la acción de 1 dedo)
//  Rueda del mouse → zoom.
// ============================================================

export function crearGestos(canvas, { vista, limites, alInicio, alMover, alFin, alCancelar, alCambiarVista }) {
  const punteros = new Map();
  let modo = null;            // 'uno' | 'pinch'
  let inicio = null;          // {x,y,t}
  let movio = false;
  let pinch = null;

  const pos = e => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function down(e) {
    canvas.setPointerCapture?.(e.pointerId);
    punteros.set(e.pointerId, pos(e));
    if (punteros.size === 1) {
      modo = 'uno'; movio = false;
      inicio = { ...pos(e), t: performance.now() };
      alInicio(inicio, e);
    } else if (punteros.size === 2) {
      if (modo === 'uno') alCancelar();
      modo = 'pinch';
      const [a, b] = [...punteros.values()];
      const v = vista();
      pinch = { d0: dist(a, b), m0: medio(a, b), s0: v.s, ox0: v.ox, oy0: v.oy };
    }
    e.preventDefault();
  }

  function move(e) {
    if (!punteros.has(e.pointerId)) return;
    punteros.set(e.pointerId, pos(e));
    if (modo === 'uno') {
      const p = pos(e);
      if (!movio && Math.hypot(p.x - inicio.x, p.y - inicio.y) > 6) movio = true;
      if (movio) alMover(p, e);
    } else if (modo === 'pinch' && punteros.size >= 2) {
      const [a, b] = [...punteros.values()];
      const { min, max } = limites();
      const s = clamp(pinch.s0 * dist(a, b) / pinch.d0, min, max);
      const m = medio(a, b);
      const wx = (pinch.m0.x - pinch.ox0) / pinch.s0, wy = (pinch.m0.y - pinch.oy0) / pinch.s0;
      alCambiarVista({ s, ox: m.x - wx * s, oy: m.y - wy * s });
    }
    e.preventDefault();
  }

  function up(e) {
    if (!punteros.has(e.pointerId)) return;
    const p = pos(e);
    punteros.delete(e.pointerId);
    if (modo === 'uno') {
      alFin(p, { toque: !movio, e });
      modo = null;
    } else if (modo === 'pinch' && punteros.size === 0) {
      modo = null;
    }
  }

  function cancel(e) {
    punteros.delete(e.pointerId);
    if (modo === 'uno') alCancelar();
    if (punteros.size === 0) modo = null;
  }

  function wheel(e) {
    e.preventDefault();
    const v = vista(); const { min, max } = limites();
    const p = pos(e);
    const s = clamp(v.s * Math.exp(-e.deltaY * 0.0015), min, max);
    const wx = (p.x - v.ox) / v.s, wy = (p.y - v.oy) / v.s;
    alCambiarVista({ s, ox: p.x - wx * s, oy: p.y - wy * s });
  }

  // Evita el zoom de página de Safari mientras se usa la pizarra.
  const gesto = e => e.preventDefault();

  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('wheel', wheel, { passive: false });
  document.addEventListener('gesturestart', gesto);
  document.addEventListener('gesturechange', gesto);

  return {
    destruir() {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('wheel', wheel);
      document.removeEventListener('gesturestart', gesto);
      document.removeEventListener('gesturechange', gesto);
    },
  };
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) || 1;
const medio = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
