// ============================================================
//  Render de la cancha y de la escena (Canvas 2D).
// ============================================================
import { dibujar, dibujarSeleccion } from './elementos.js';

export const MARGEN = 3; // metros de pasto alrededor del espacio

// Vista que encuadra todo el espacio dentro de (w,h) px.
export function encuadrar(espacio, w, h, pad = 6) {
  const L = espacio.largo + MARGEN * 2, A = espacio.ancho + MARGEN * 2;
  const s = Math.min((w - pad * 2) / L, (h - pad * 2) / A);
  return { s, ox: (w - espacio.largo * s) / 2, oy: (h - espacio.ancho * s) / 2 };
}

export function dibujarEscena(ctx, piz, cuadroIdx, v, { w, h, seleccion = null, temporal = null } = {}) {
  ctx.clearRect(0, 0, w, h);
  dibujarCancha(ctx, piz.espacio, v, w, h);
  const estados = piz.cuadros[cuadroIdx]?.estados || {};
  // Orden: zonas abajo, después materiales, flechas, jugadores, pelota y texto arriba.
  const capa = t => ({ zona_rect: 0, zona_elipse: 0, cono: 1, aro: 1, valla: 1, miniarco: 1, flecha: 2, rival: 3, propio: 3, pelota: 4, texto: 5 }[t] ?? 3);
  const lista = [...piz.elementos].sort((a, b) => capa(a.tipo) - capa(b.tipo));
  for (const el of lista) dibujar(ctx, el, estados[el.id], v);
  if (temporal) dibujar(ctx, temporal.el, temporal.st, v);
  if (seleccion) {
    const el = piz.elementos.find(e => e.id === seleccion);
    if (el && estados[el.id]) dibujarSeleccion(ctx, el, estados[el.id], v);
  }
}

export function ordenToque(elementos) {
  // para tocar: lo que está arriba primero
  const capa = t => ({ zona_rect: 0, zona_elipse: 0, cono: 1, aro: 1, valla: 1, miniarco: 1, flecha: 2, rival: 3, propio: 3, pelota: 4, texto: 5 }[t] ?? 3);
  return [...elementos].sort((a, b) => capa(b.tipo) - capa(a.tipo));
}

function dibujarCancha(ctx, esp, v, w, h) {
  const { s, ox, oy } = v;
  const L = esp.largo, A = esp.ancho;
  // pasto con franjas
  ctx.fillStyle = '#2E7D3A';
  ctx.fillRect(0, 0, w, h);
  const franja = esp.tipo === 'reducido' ? 5 : 5.25;
  ctx.fillStyle = '#358A42';
  for (let x = -Math.ceil(ox / s / franja) * franja - franja; x * s + ox < w; x += franja * 2) {
    ctx.fillRect(x * s + ox, 0, franja * s, h);
  }
  const X = m => m * s + ox, Y = m => m * s + oy;
  ctx.strokeStyle = 'rgba(255,255,255,.92)';
  ctx.lineWidth = Math.max(0.12 * s, 1.5);
  ctx.lineJoin = 'miter';
  ctx.strokeRect(X(0), Y(0), L * s, A * s);

  if (esp.tipo === 'reducido') return;

  const circulo = 9.15;
  if (esp.tipo === 'completa') {
    ctx.beginPath(); ctx.moveTo(X(L / 2), Y(0)); ctx.lineTo(X(L / 2), Y(A)); ctx.stroke();
    ctx.beginPath(); ctx.arc(X(L / 2), Y(A / 2), circulo * s, 0, Math.PI * 2); ctx.stroke();
    punto(ctx, X(L / 2), Y(A / 2), s);
    extremo(ctx, 0, 1, esp, X, Y, s);
    extremo(ctx, L, -1, esp, X, Y, s);
  } else {
    // media cancha: mitad a la izquierda (x=0), arco a la derecha
    ctx.beginPath(); ctx.arc(X(0), Y(A / 2), circulo * s, -Math.PI / 2, Math.PI / 2); ctx.stroke();
    punto(ctx, X(0), Y(A / 2), s);
    extremo(ctx, L, -1, esp, X, Y, s);
  }
}

function punto(ctx, x, y, s) {
  ctx.beginPath(); ctx.arc(x, y, Math.max(0.3 * s, 2), 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fill();
}

// Área, área chica, punto penal, medialuna y arco de un extremo.
function extremo(ctx, x0, dir, esp, X, Y, s) {
  const A = esp.ancho;
  const aG = Math.min(40.32, A - 2), pG = Math.min(16.5, esp.largo * 0.3);
  const aC = Math.min(18.32, A - 6), pC = Math.min(5.5, pG * 0.35);
  const rect = (prof, ancho) => {
    const xa = X(x0), xb = X(x0 + dir * prof);
    ctx.strokeRect(Math.min(xa, xb), Y(A / 2 - ancho / 2), Math.abs(xb - xa), ancho * s);
  };
  rect(pG, aG);
  rect(pC, aC);
  const penal = Math.min(11, pG * 0.67);
  punto(ctx, X(x0 + dir * penal), Y(A / 2), s);
  // medialuna (la parte fuera del área)
  const r = 9.15, dx = pG - penal;
  if (dx < r) {
    const ang = Math.acos(dx / r);
    ctx.beginPath();
    if (dir === 1) ctx.arc(X(x0 + penal), Y(A / 2), r * s, -ang, ang);
    else ctx.arc(X(x0 - penal), Y(A / 2), r * s, Math.PI - ang, Math.PI + ang);
    ctx.stroke();
  }
  // arco
  const ancho = 7.32, prof = 1.6;
  const xa = X(x0), xb = X(x0 - dir * prof);
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  ctx.fillRect(Math.min(xa, xb), Y(A / 2 - ancho / 2), Math.abs(xb - xa), ancho * s);
  ctx.strokeRect(Math.min(xa, xb), Y(A / 2 - ancho / 2), Math.abs(xb - xa), ancho * s);
  ctx.restore();
}

// Dibuja una miniatura en un canvas cualquiera.
export function miniatura(canvas, piz, cuadroIdx = 0) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const v = { ...encuadrar(piz.espacio, w, h, 0), k: 0.35 };
  dibujarEscena(ctx, piz, cuadroIdx, v, { w, h });
}
