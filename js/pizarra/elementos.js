// ============================================================
//  Elementos de la pizarra: valores por defecto, dibujo y "toque".
//  Toda la geometría está en METROS. La vista (v) convierte:
//  pantalla = mundo * v.s + (v.ox, v.oy)
// ============================================================
import { CONFIG } from '../../config.js';

export const TIPOS = {
  propio: { nombre: 'Jugador propio', rota: false },
  rival: { nombre: 'Rival', rota: false },
  pelota: { nombre: 'Pelota', rota: false },
  cono: { nombre: 'Cono', rota: false },
  aro: { nombre: 'Aro', rota: false },
  valla: { nombre: 'Valla', rota: true },
  miniarco: { nombre: 'Mini arco', rota: true },
  zona_rect: { nombre: 'Zona', rota: true, zona: true },
  zona_elipse: { nombre: 'Zona circular', rota: true, zona: true },
  flecha: { nombre: 'Flecha', rota: false },
  texto: { nombre: 'Texto', rota: true },
};

export const CLASES_FLECHA = {
  pase: 'Pase',
  conduccion: 'Conducción',
  desmarque: 'Desmarque',
};

export const COLORES_ZONA = ['#F9D91E', '#FFFFFF', '#0257BA', '#D62839', '#2E9E5B', '#E0821E'];
export const COLORES_FLECHA = ['#FFFFFF', '#F9D91E', '#111111', '#D62839', '#0257BA'];

export function estiloInicial(tipo) {
  switch (tipo) {
    case 'propio': return { color: CONFIG.colores.primario };
    case 'rival': return { color: CONFIG.colores.rival };
    case 'cono': return { color: '#F07A1A' };
    case 'aro': return { color: '#F9D91E' };
    case 'valla': return { color: '#FFFFFF' };
    case 'miniarco': return { color: '#FFFFFF' };
    case 'zona_rect': case 'zona_elipse': return { color: '#F9D91E', opacidad: 0.28 };
    case 'flecha': return { color: '#FFFFFF' };
    case 'texto': return { color: '#FFFFFF' };
    default: return { color: '#FFFFFF' };
  }
}

// Tamaños en metros y mínimos en píxeles (para que se vean y se puedan tocar).
const R_JUG = 1.15, MIN_JUG = 13;
export const radioJugador = (s, k = 1) => Math.max(R_JUG * s, MIN_JUG * k);
const radioPelota = (s, k = 1) => Math.max(0.45 * s, 6 * k);
const tamCono = (s, k = 1) => Math.max(0.8 * s, 9 * k);
const radioAro = (s, k = 1) => Math.max(0.8 * s, 10 * k);
const tamTexto = (s, k = 1) => Math.max(2.2 * s, 14 * k);
const anchoFlecha = (s, k = 1) => Math.max(0.22 * s, 2.5 * k);

// ---------- Dibujo ----------
export function dibujar(ctx, el, st, v) {
  if (!st || st.visible === false) return;
  const x = st.x * v.s + v.ox, y = st.y * v.s + v.oy, s = v.s;
  const col = el.estilo?.color || '#fff';
  ctx.save();
  switch (el.tipo) {
    case 'propio':
    case 'rival': {
      const r = radioJugador(s, v.k);
      ctx.beginPath(); ctx.arc(x, y + r * 0.12, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = Math.max(2, r * 0.14); ctx.strokeStyle = el.tipo === 'propio' ? CONFIG.colores.destaque : '#fff'; ctx.stroke();
      if (el.etiqueta) {
        ctx.fillStyle = '#fff';
        ctx.font = `700 ${Math.round(r * (String(el.etiqueta).length > 2 ? 0.8 : 1.05))}px ${CONFIG.tipografia.texto}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(el.etiqueta, x, y + r * 0.05);
      }
      if (el.nombre) {
        const fs = Math.max(10 * (v.k ?? 1), r * 0.62);
        ctx.font = `600 ${fs}px ${CONFIG.tipografia.texto}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.65)';
        ctx.strokeText(el.nombre, x, y + r + 2);
        ctx.fillStyle = '#fff'; ctx.fillText(el.nombre, x, y + r + 2);
      }
      break;
    }
    case 'pelota': {
      const r = radioPelota(s, v.k);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill();
      ctx.lineWidth = Math.max(1.2, r * 0.2); ctx.strokeStyle = '#111'; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r * 0.38, 0, Math.PI * 2); ctx.fillStyle = '#111'; ctx.fill();
      break;
    }
    case 'cono': {
      const t = tamCono(s, v.k);
      ctx.beginPath();
      ctx.moveTo(x, y - t * 0.75); ctx.lineTo(x + t * 0.65, y + t * 0.5); ctx.lineTo(x - t * 0.65, y + t * 0.5); ctx.closePath();
      ctx.fillStyle = col; ctx.fill();
      ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.stroke();
      break;
    }
    case 'aro': {
      const r = radioAro(s, v.k);
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.lineWidth = Math.max(2.5, r * 0.22); ctx.strokeStyle = col; ctx.stroke();
      break;
    }
    case 'valla': {
      ctx.translate(x, y); ctx.rotate(rad(st.rot));
      const w = Math.max(1.6 * s, 18), hh = Math.max(0.28 * s, 4);
      ctx.fillStyle = col; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.lineWidth = 1;
      ctx.fillRect(-w / 2, -hh / 2, w, hh); ctx.strokeRect(-w / 2, -hh / 2, w, hh);
      ctx.fillStyle = '#D62839';
      ctx.fillRect(-w / 2, -hh / 2, hh, hh); ctx.fillRect(w / 2 - hh, -hh / 2, hh, hh);
      break;
    }
    case 'miniarco': {
      ctx.translate(x, y); ctx.rotate(rad(st.rot));
      const w = Math.max(2 * s, 20), d = Math.max(0.9 * s, 9);
      ctx.beginPath(); ctx.moveTo(-w / 2, 0); ctx.lineTo(-w / 2, -d); ctx.lineTo(w / 2, -d); ctx.lineTo(w / 2, 0);
      ctx.lineWidth = Math.max(2.5, 0.18 * s); ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.stroke();
      // red
      ctx.globalAlpha = 0.35; ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) { const xx = -w / 2 + (w * i) / 5; ctx.beginPath(); ctx.moveTo(xx, 0); ctx.lineTo(xx, -d); ctx.stroke(); }
      break;
    }
    case 'zona_rect':
    case 'zona_elipse': {
      ctx.translate(x, y); ctx.rotate(rad(st.rot));
      const w = st.w * s, hh = st.h * s;
      ctx.beginPath();
      if (el.tipo === 'zona_rect') ctx.rect(-w / 2, -hh / 2, w, hh);
      else ctx.ellipse(0, 0, Math.abs(w / 2), Math.abs(hh / 2), 0, 0, Math.PI * 2);
      ctx.globalAlpha = el.estilo?.opacidad ?? 0.28; ctx.fillStyle = col; ctx.fill();
      ctx.globalAlpha = 0.9; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5; ctx.strokeStyle = col; ctx.stroke();
      break;
    }
    case 'flecha':
      dibujarFlecha(ctx, el, st, v);
      break;
    case 'texto': {
      ctx.translate(x, y); ctx.rotate(rad(st.rot));
      const fs = tamTexto(s, v.k);
      ctx.font = `700 ${fs}px ${CONFIG.tipografia.texto}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = Math.max(3, fs * 0.18); ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineJoin = 'round';
      ctx.strokeText(el.etiqueta || 'Texto', 0, 0);
      ctx.fillStyle = col; ctx.fillText(el.etiqueta || 'Texto', 0, 0);
      break;
    }
  }
  ctx.restore();
}

function puntosFlecha(st, v) {
  const p0 = { x: st.x * v.s + v.ox, y: st.y * v.s + v.oy };
  const p2 = { x: st.x2 * v.s + v.ox, y: st.y2 * v.s + v.oy };
  const p1 = st.cx != null ? { x: st.cx * v.s + v.ox, y: st.cy * v.s + v.oy } : { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 };
  return [p0, p1, p2];
}

const bez = (p0, p1, p2, t) => ({
  x: (1 - t) ** 2 * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
  y: (1 - t) ** 2 * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y,
});

function muestrear(p0, p1, p2, n = 48) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(bez(p0, p1, p2, i / n));
  return pts;
}

function dibujarFlecha(ctx, el, st, v) {
  const [p0, p1, p2] = puntosFlecha(st, v);
  const lw = anchoFlecha(v.s, v.k);
  const cabeza = Math.max(lw * 3.6, 11);
  const pts = muestrear(p0, p1, p2, 60);
  // largo total
  let L = 0; const acum = [0];
  for (let i = 1; i < pts.length; i++) { L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y); acum.push(L); }
  if (L < 2) return;
  const col = el.estilo?.color || '#fff';
  const clase = el.flecha?.clase || 'pase';
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // sombra sutil para leer sobre el pasto
  ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 2;
  const fin = Math.max(0, L - cabeza * 0.85);
  ctx.beginPath();
  if (clase === 'conduccion') {
    const amp = Math.max(lw * 1.4, 4), per = Math.max(lw * 5, 14);
    let primero = true;
    for (let d = 0; d <= fin; d += 2) {
      const { p, n } = enDist(pts, acum, d);
      const k = Math.min(1, d / per, (fin - d) / per);
      const off = Math.sin((d / per) * Math.PI * 2) * amp * k;
      const xx = p.x + n.x * off, yy = p.y + n.y * off;
      primero ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy); primero = false;
    }
  } else {
    if (clase === 'desmarque') ctx.setLineDash([lw * 2.6, lw * 2.2]);
    let primero = true;
    for (let i = 0; i < pts.length && acum[i] <= fin; i++) { primero ? ctx.moveTo(pts[i].x, pts[i].y) : ctx.lineTo(pts[i].x, pts[i].y); primero = false; }
    const { p } = enDist(pts, acum, fin); ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  // cabeza
  const a = enDist(pts, acum, L - cabeza).p;
  const ang = Math.atan2(p2.y - a.y, p2.x - a.x);
  ctx.beginPath();
  ctx.moveTo(p2.x, p2.y);
  ctx.lineTo(p2.x - cabeza * Math.cos(ang - 0.42), p2.y - cabeza * Math.sin(ang - 0.42));
  ctx.lineTo(p2.x - cabeza * Math.cos(ang + 0.42), p2.y - cabeza * Math.sin(ang + 0.42));
  ctx.closePath(); ctx.fill();
}

function enDist(pts, acum, d) {
  let i = 1;
  while (i < acum.length - 1 && acum[i] < d) i++;
  const a = pts[i - 1], b = pts[i];
  const seg = acum[i] - acum[i - 1] || 1;
  const t = Math.max(0, Math.min(1, (d - acum[i - 1]) / seg));
  const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
  return { p: { x: a.x + dx * t, y: a.y + dy * t }, n: { x: -dy / l, y: dx / l } };
}

// ---------- Manijas del elemento seleccionado (en pantalla) ----------
export function manijas(el, st, v) {
  const x = st.x * v.s + v.ox, y = st.y * v.s + v.oy;
  const m = [];
  if (el.tipo === 'flecha') {
    const [p0, p1, p2] = puntosFlecha(st, v);
    const medio = bez(p0, p1, p2, 0.5);
    m.push({ parte: 'ini', ...p0 }, { parte: 'fin', ...p2 }, { parte: 'ctrl', ...medio });
    return m;
  }
  const t = TIPOS[el.tipo];
  const medioAlto = alturaPx(el, st, v) / 2;
  if (t.rota) {
    const d = medioAlto + 30, a = rad(st.rot);
    m.push({ parte: 'rot', x: x + Math.sin(a) * d, y: y - Math.cos(a) * d });
  }
  if (t.zona) {
    const a = rad(st.rot), w = st.w * v.s / 2, hh = st.h * v.s / 2;
    m.push({ parte: 'tam', x: x + w * Math.cos(a) - hh * Math.sin(a), y: y + w * Math.sin(a) + hh * Math.cos(a) });
  }
  return m;
}

export function alturaPx(el, st, v) {
  const s = v.s;
  switch (el.tipo) {
    case 'propio': case 'rival': return radioJugador(s, v.k) * 2;
    case 'pelota': return radioPelota(s, v.k) * 2;
    case 'cono': return tamCono(s, v.k) * 1.3;
    case 'aro': return radioAro(s, v.k) * 2;
    case 'valla': return Math.max(0.28 * s, 4);
    case 'miniarco': return Math.max(0.9 * s, 9) * 2;
    case 'zona_rect': case 'zona_elipse': return Math.abs(st.h * s);
    case 'texto': return tamTexto(s, v.k);
    default: return 20;
  }
}

function anchoPx(el, st, v, ctx) {
  const s = v.s;
  switch (el.tipo) {
    case 'valla': return Math.max(1.6 * s, 18);
    case 'miniarco': return Math.max(2 * s, 20);
    case 'zona_rect': case 'zona_elipse': return Math.abs(st.w * s);
    case 'texto': {
      ctx.save(); ctx.font = `700 ${tamTexto(s, v.k)}px ${CONFIG.tipografia.texto}`;
      const w = ctx.measureText(el.etiqueta || 'Texto').width; ctx.restore(); return w;
    }
    default: return alturaPx(el, st, v);
  }
}

// ¿El punto de pantalla (px,py) toca el elemento? tolerancia en px.
export function toca(ctx, el, st, v, px, py, tol = 10) {
  if (!st || st.visible === false) return false;
  const x = st.x * v.s + v.ox, y = st.y * v.s + v.oy;
  if (el.tipo === 'flecha') {
    const [p0, p1, p2] = puntosFlecha(st, v);
    const pts = muestrear(p0, p1, p2, 30);
    for (let i = 1; i < pts.length; i++) if (distSeg(px, py, pts[i - 1], pts[i]) < tol + 6) return true;
    return false;
  }
  // a coordenadas locales (rotadas)
  const a = -rad(st.rot || 0);
  const dx = px - x, dy = py - y;
  const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a);
  const w = anchoPx(el, st, v, ctx) / 2, hh = alturaPx(el, st, v) / 2;
  if (el.tipo === 'zona_elipse') return (lx * lx) / ((w + tol) ** 2) + (ly * ly) / ((hh + tol) ** 2) <= 1;
  if (['propio', 'rival', 'pelota', 'aro', 'cono'].includes(el.tipo)) return Math.hypot(dx, dy) <= Math.max(w, hh) + tol;
  return Math.abs(lx) <= w + tol && Math.abs(ly) <= hh + tol;
}

function distSeg(px, py, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / l2));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

export const rad = g => ((g || 0) * Math.PI) / 180;

// Marco de selección
export function dibujarSeleccion(ctx, el, st, v) {
  ctx.save();
  ctx.strokeStyle = CONFIG.colores.destaque; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
  const x = st.x * v.s + v.ox, y = st.y * v.s + v.oy;
  if (el.tipo !== 'flecha') {
    ctx.translate(x, y); ctx.rotate(rad(st.rot || 0));
    const w = anchoPx(el, st, v, ctx) / 2 + 6, hh = alturaPx(el, st, v) / 2 + 6;
    if (['propio', 'rival', 'pelota', 'aro', 'cono'].includes(el.tipo)) { ctx.beginPath(); ctx.arc(0, 0, Math.max(w, hh), 0, Math.PI * 2); ctx.stroke(); }
    else ctx.strokeRect(-w, -hh, w * 2, hh * 2);
  }
  ctx.restore();
  ctx.save();
  for (const m of manijas(el, st, v)) {
    if (m.parte === 'rot') {
      ctx.strokeStyle = CONFIG.colores.destaque; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(m.x, m.y); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.beginPath(); ctx.arc(m.x, m.y, m.parte === 'ctrl' ? 8 : 10, 0, Math.PI * 2);
    ctx.fillStyle = m.parte === 'rot' ? CONFIG.colores.destaque : '#fff';
    ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = CONFIG.colores.oscuro; ctx.stroke();
    if (m.parte === 'rot') { ctx.fillStyle = CONFIG.colores.oscuro; ctx.font = '700 12px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('⟳', m.x, m.y + 1); }
  }
  ctx.restore();
}
