// ============================================================
//  Exportar la pizarra.
//  Fase 1: cuadro actual como PNG.
//  Fase 4 (preparado): video grabando este mismo canvas con
//  canvas.captureStream() + MediaRecorder, cuadro por cuadro.
// ============================================================
import { encuadrar, dibujarEscena } from './render.js';
import { CONFIG } from '../../config.js';

export function renderImagen(piz, cuadroIdx = 0, ancho = 1800) {
  const esp = piz.espacio;
  const prop = (esp.ancho + 6) / (esp.largo + 6);
  const alto = Math.round(ancho * prop) + 70;
  const c = document.createElement('canvas');
  c.width = ancho; c.height = alto;
  const ctx = c.getContext('2d');
  const k = ancho / 900; // escala de los mínimos en píxeles
  const v = { ...encuadrar(esp, ancho, alto - 70, 0), k };
  ctx.save();
  dibujarEscena(ctx, piz, cuadroIdx, v, { w: ancho, h: alto - 70 });
  ctx.restore();
  // pie con nombre
  ctx.fillStyle = CONFIG.colores.oscuro;
  ctx.fillRect(0, alto - 70, ancho, 70);
  ctx.fillStyle = '#fff';
  ctx.font = `700 34px ${CONFIG.tipografia.texto}`;
  ctx.textBaseline = 'middle';
  ctx.fillText(piz.nombre || 'Pizarra', 24, alto - 35);
  ctx.textAlign = 'right';
  ctx.fillStyle = CONFIG.colores.destaque;
  ctx.font = `600 26px ${CONFIG.tipografia.texto}`;
  ctx.fillText([CONFIG.club.nombre, CONFIG.app.nombre].filter(Boolean).join(' · '), ancho - 24, alto - 35);
  return c;
}

export function aPNG(piz, cuadroIdx = 0, ancho = 1800) {
  const c = renderImagen(piz, cuadroIdx, ancho);
  return new Promise(ok => c.toBlob(ok, 'image/png'));
}

export function aDataURL(piz, cuadroIdx = 0, ancho = 1200) {
  return renderImagen(piz, cuadroIdx, ancho).toDataURL('image/png');
}
