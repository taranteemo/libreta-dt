// ============================================================
//  Guía para instalar la app + pedido de almacenamiento persistente.
// ============================================================
import { h, hoja } from './ui.js';
import { CONFIG } from '../../config.js';

let eventoInstalar = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); eventoInstalar = e; });

export const estaInstalada = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

function plataforma() {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios) return /CriOS|FxiOS|EdgiOS/.test(ua) ? 'ios-otro' : 'ios-safari';
  if (/Android/.test(ua)) return 'android';
  return 'escritorio';
}

export async function pedirPersistencia() {
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch {}
}

export function mostrarGuia({ forzar = false } = {}) {
  if (estaInstalada() && !forzar) return;
  if (!forzar && sessionStorage.getItem('guia-vista')) return;
  sessionStorage.setItem('guia-vista', '1');
  const p = plataforma();
  const nombre = CONFIG.app.nombre;
  let cuerpo;
  if (p === 'ios-safari') {
    cuerpo = [
      h('p.guia-alerta', '⚠️ En iPhone/iPad, si no la instalás, Safari puede borrar tus datos.'),
      h('ol.guia-pasos',
        h('li', 'Tocá el botón ', h('b', 'Compartir'), ' ', h('span.ico-ios', '⬆︎'), ' (abajo en iPhone, arriba en iPad).'),
        h('li', 'Bajá y tocá ', h('b', 'Agregar a inicio'), '.'),
        h('li', 'Tocá ', h('b', 'Agregar'), '. Abrila siempre desde el ícono.')),
    ];
  } else if (p === 'ios-otro') {
    cuerpo = [
      h('p.guia-alerta', '⚠️ Para instalarla en iPhone/iPad abrí este link en Safari.'),
      h('p', 'Copiá la dirección, pegala en Safari y seguí los pasos que aparecen ahí.'),
    ];
  } else if (p === 'android') {
    cuerpo = eventoInstalar
      ? [h('p', 'Instalala y la vas a tener como una app más, también sin internet.')]
      : [h('ol.guia-pasos',
          h('li', 'Tocá el menú ', h('b', '⋮'), ' de Chrome (arriba a la derecha).'),
          h('li', 'Tocá ', h('b', 'Instalar app'), ' o ', h('b', 'Agregar a pantalla principal'), '.'))];
  } else {
    cuerpo = [h('p', 'Esta app está pensada para el celular o el iPad. En la compu podés instalarla desde el ícono de instalar en la barra de direcciones de Chrome o Edge.')];
  }
  const botones = [{ texto: 'Ahora no', valor: null, clase: 'btn-sec' }];
  if (eventoInstalar) botones.push({ texto: 'Instalar', clase: 'btn-prim', accion: async () => { eventoInstalar.prompt(); await eventoInstalar.userChoice; eventoInstalar = null; } });
  return hoja(`Instalá ${nombre}`, h('div.guia', cuerpo), { botones });
}
