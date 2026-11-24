// ============================================================
//  Herramientas de la barra y creación de elementos.
// ============================================================
import { uid } from '../core/model.js';
import { estiloInicial } from './elementos.js';
import { CONFIG } from '../../config.js';

const C = CONFIG.colores;
const svg = (cuerpo) => `<svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">${cuerpo}</svg>`;

export const ICONOS = {
  sel: svg('<path d="M8 4l16 12-7 1.5 4 8-3.4 1.6-4-8L8 24z" fill="#fff" stroke="#003C6E" stroke-width="1.5" stroke-linejoin="round"/>'),
  propio: svg(`<circle cx="16" cy="16" r="11" fill="${C.primario}" stroke="${C.destaque}" stroke-width="3"/><text x="16" y="20.5" font-size="12" font-weight="700" text-anchor="middle" fill="#fff" font-family="system-ui">8</text>`),
  rival: svg(`<circle cx="16" cy="16" r="11" fill="${C.rival}" stroke="#fff" stroke-width="3"/><text x="16" y="20.5" font-size="12" font-weight="700" text-anchor="middle" fill="#fff" font-family="system-ui">5</text>`),
  pelota: svg('<circle cx="16" cy="16" r="9" fill="#fff" stroke="#111" stroke-width="2.4"/><circle cx="16" cy="16" r="3.4" fill="#111"/>'),
  cono: svg('<path d="M16 5l9 20H7z" fill="#F07A1A" stroke="#7a3500" stroke-width="1.2" stroke-linejoin="round"/>'),
  aro: svg('<circle cx="16" cy="16" r="9.5" fill="none" stroke="#F9D91E" stroke-width="3.4"/>'),
  valla: svg('<rect x="4" y="13" width="24" height="6" fill="#fff" stroke="#333"/><rect x="4" y="13" width="6" height="6" fill="#D62839"/><rect x="22" y="13" width="6" height="6" fill="#D62839"/>'),
  miniarco: svg('<path d="M5 25V9h22v16" fill="none" stroke="#fff" stroke-width="3" stroke-linejoin="round"/><path d="M10 9v16M16 9v16M22 9v16" stroke="#fff" stroke-opacity=".4"/>'),
  pase: svg('<path d="M5 25L24 8" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><path d="M27 5l-9 2 7 7z" fill="#fff"/>'),
  conduccion: svg('<path d="M4 26c3-1 2-5 5-6s3 3 6 2 2-5 5-6 2 2 3 1" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M28 7l-8 2 6 6z" fill="#fff"/>'),
  desmarque: svg('<path d="M5 25L23 9" stroke="#fff" stroke-width="2.6" stroke-dasharray="4 3.5" stroke-linecap="round"/><path d="M27 5l-9 2 7 7z" fill="#fff"/>'),
  zona_rect: svg('<rect x="5" y="8" width="22" height="16" fill="#F9D91E" fill-opacity=".35" stroke="#F9D91E" stroke-width="2" stroke-dasharray="4 3"/>'),
  zona_elipse: svg('<ellipse cx="16" cy="16" rx="11" ry="8" fill="#F9D91E" fill-opacity=".35" stroke="#F9D91E" stroke-width="2" stroke-dasharray="4 3"/>'),
  texto: svg('<path d="M7 8h18M16 8v18" stroke="#fff" stroke-width="3.4" stroke-linecap="round"/>'),
  deshacer: svg('<path d="M11 9L5 15l6 6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 15h13a7 7 0 010 14h-4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>'),
  rehacer: svg('<path d="M21 9l6 6-6 6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M27 15H14a7 7 0 000 14h4" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>'),
  borrar: svg('<path d="M7 9h18M13 9V6h6v3M9 9l1.5 18h11L23 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>'),
  encuadrar: svg('<path d="M5 11V5h6M21 5h6v6M27 21v6h-6M11 27H5v-6" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>'),
  espacio: svg('<rect x="4" y="7" width="24" height="18" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M16 7v18" stroke="#fff" stroke-width="2"/><circle cx="16" cy="16" r="4" fill="none" stroke="#fff" stroke-width="2"/>'),
  png: svg('<rect x="4" y="7" width="24" height="18" rx="2" fill="none" stroke="#fff" stroke-width="2.4"/><circle cx="11" cy="13" r="2.4" fill="#fff"/><path d="M6 23l7-6 5 4 4-3 6 5" fill="none" stroke="#fff" stroke-width="2"/>'),
  listo: svg('<path d="M6 16l7 7L26 9" fill="none" stroke="#003C6E" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>'),
};

// Barra izquierda. Los grupos tienen sub-herramientas.
export const BARRA = [
  { id: 'sel', nombre: 'Seleccionar' },
  { id: 'propio', nombre: 'Jugador propio' },
  { id: 'rival', nombre: 'Rival' },
  { id: 'pelota', nombre: 'Pelota' },
  { id: 'material', nombre: 'Material', subs: [['cono', 'Cono'], ['aro', 'Aro'], ['valla', 'Valla'], ['miniarco', 'Mini arco']] },
  { id: 'flecha', nombre: 'Flecha', subs: [['pase', 'Pase'], ['conduccion', 'Conducción'], ['desmarque', 'Desmarque']] },
  { id: 'zona', nombre: 'Zona', subs: [['zona_rect', 'Rectángulo'], ['zona_elipse', 'Círculo']] },
  { id: 'texto', nombre: 'Texto' },
];

// Siguiente dorsal libre para propios o rivales.
export function siguienteDorsal(elementos, tipo) {
  const usados = new Set(elementos.filter(e => e.tipo === tipo).map(e => Number(e.etiqueta)).filter(Boolean));
  let n = 1; while (usados.has(n)) n++;
  return String(n);
}

// Crea {el, st} en el punto (x,y) en metros.
export function crear(tipo, x, y, { elementos = [], claseFlecha = 'pase' } = {}) {
  const el = { id: uid(), tipo, estilo: estiloInicial(tipo), etiqueta: '', jugadorId: null, nombre: '' };
  const st = { x: r2(x), y: r2(y), rot: 0, visible: true };
  if (tipo === 'propio' || tipo === 'rival') el.etiqueta = siguienteDorsal(elementos, tipo);
  if (tipo === 'zona_rect' || tipo === 'zona_elipse') { st.w = 10; st.h = 8; }
  if (tipo === 'flecha') { el.flecha = { clase: claseFlecha }; st.x2 = st.x; st.y2 = st.y; st.cx = null; st.cy = null; }
  if (tipo === 'texto') el.etiqueta = 'Texto';
  return { el, st };
}

export const r2 = n => Math.round(n * 100) / 100;
